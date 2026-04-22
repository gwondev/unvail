package com.example.unvail.Controller;

import com.example.unvail.entity.CommunityPost;
import com.example.unvail.entity.ShopItem;
import com.example.unvail.entity.User;
import com.example.unvail.repository.CommunityPostRepository;
import com.example.unvail.repository.ShopItemRepository;
import com.example.unvail.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    private static final Pattern GRADE_PATTERN = Pattern.compile("\\b([A-F])\\b");
    private static final Pattern NUMBERED_TITLE_PATTERN = Pattern.compile("^\\d+\\.\\s*제목\\s*[:：]?\\s*(.+)$");
    private static final Pattern TITLE_ONLY_PATTERN = Pattern.compile("^제목\\s*[:：]?\\s*(.+)$");
    private static final Pattern NUMBERED_LINE_PATTERN = Pattern.compile("^\\d+\\.\\s*(.+)$");
    private static final Pattern DESCRIPTION_PATTERN = Pattern.compile("^설명\\s*[:：]?\\s*(.+)$");
    private final UserRepository userRepository;
    private final CommunityPostRepository communityPostRepository;
    private final ShopItemRepository shopItemRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.google.client-id}")
    private String googleClientId;

    @Value("${app.gemini.api-key}")
    private String geminiApiKey;

    @Value("${app.gemini.model:gemini-2.5-flash}")
    private String geminiModel;

    @Value("${app.admin.emails:}")
    private String adminEmails;

    public UserController(
            UserRepository userRepository,
            CommunityPostRepository communityPostRepository,
            ShopItemRepository shopItemRepository
    ) {
        this.userRepository = userRepository;
        this.communityPostRepository = communityPostRepository;
        this.shopItemRepository = shopItemRepository;
    }

    @PostMapping("/auth/google/login")
    public Map<String, Object> googleLogin(@RequestBody GoogleAuthRequest request) {
        GoogleTokenInfo tokenInfo = verifyGoogleToken(request.idToken());
        Optional<User> user = userRepository.findByGoogleSub(tokenInfo.sub());

        if (user.isEmpty()) {
            return Map.of("needsSignup", true);
        }
        return buildAuthResponse(user.get(), false);
    }

    @PostMapping("/auth/google/signup")
    public Map<String, Object> googleSignup(@RequestBody GoogleSignupRequest request) {
        GoogleTokenInfo tokenInfo = verifyGoogleToken(request.idToken());
        String nickname = request.nickname() == null ? "" : request.nickname().trim();
        if (nickname.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "별명을 입력해주세요.");
        }
        if (nickname.length() > 20) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "별명은 20자 이하만 가능합니다.");
        }
        if (userRepository.existsByNickname(nickname)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "중복된 별명입니다.");
        }
        if (userRepository.findByGoogleSub(tokenInfo.sub()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 계정입니다.");
        }

        User user = User.builder()
                .googleSub(tokenInfo.sub())
                .email(tokenInfo.email())
                .nickname(nickname)
                .geminiRemainingCalls(20)
                .role(isAdminEmail(tokenInfo.email()) ? User.Role.ADMIN : User.Role.USER)
                .build();

        User savedUser = userRepository.save(user);
        return buildAuthResponse(savedUser, false);
    }

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> analyze(
            @RequestParam("idToken") String idToken,
            @RequestParam("files") MultipartFile[] files
    ) throws IOException {
        if (files == null || files.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지 파일을 업로드해주세요.");
        }

        GoogleTokenInfo tokenInfo = verifyGoogleToken(idToken);
        User user = userRepository.findByGoogleSub(tokenInfo.sub())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원가입이 필요합니다."));

        if (user.getGeminiRemainingCalls() <= 0) {
            throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Gemini 호출 횟수를 모두 사용했습니다.");
        }

        log.info("Analyze request received. files={}, user={}", files.length, user.getNickname());
        String resultText = requestGeminiWithGoogleSearch(files);
        String normalizedResultText = normalizeResultText(resultText);
        String grade = extractGrade(resultText);
        List<String> recognizedCompanies = extractRecognizedCompanies(normalizedResultText);
        String formattedResultText = formatResultText(normalizedResultText);

        user.setGeminiRemainingCalls(user.getGeminiRemainingCalls() - 1);
        userRepository.save(user);

        return Map.of(
                "grade", grade,
                "result", formattedResultText,
                "recognizedCompanies", recognizedCompanies,
                "remainingCalls", user.getGeminiRemainingCalls()
        );
    }

    @GetMapping("/community/posts")
    public List<CommunityPost> communityPosts() {
        seedCommunityPostsIfEmpty();
        return communityPostRepository.findAll();
    }

    @PostMapping("/community/posts")
    public CommunityPost createCommunityPost(
            @RequestHeader("X-Id-Token") String idToken,
            @RequestBody CommunityPostRequest request
    ) {
        User user = findUserByIdToken(idToken);
        CommunityPost post = CommunityPost.builder()
                .title(request.title())
                .content(request.content())
                .authorNickname(user.getNickname())
                .likes(0)
                .build();
        return communityPostRepository.save(post);
    }

    @GetMapping("/shop/items")
    public List<ShopItem> shopItems() {
        seedShopItemsIfEmpty();
        return shopItemRepository.findAll();
    }

    @GetMapping("/admin/users")
    public List<User> adminUsers(@RequestHeader("X-Id-Token") String idToken) {
        requireAdmin(idToken);
        return userRepository.findAll();
    }

    @PutMapping("/admin/users/{id}")
    public User adminUpdateUser(
            @RequestHeader("X-Id-Token") String idToken,
            @PathVariable Long id,
            @RequestBody AdminUserUpdateRequest request
    ) {
        requireAdmin(idToken);
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "유저를 찾을 수 없습니다."));
        if (request.nickname() != null && !request.nickname().isBlank()) {
            user.setNickname(request.nickname().trim());
        }
        if (request.geminiRemainingCalls() != null && request.geminiRemainingCalls() >= 0) {
            user.setGeminiRemainingCalls(request.geminiRemainingCalls());
        }
        if (request.role() != null && !request.role().isBlank()) {
            user.setRole(User.Role.valueOf(request.role().toUpperCase()));
        }
        return userRepository.save(user);
    }

    @GetMapping("/admin/community/posts")
    public List<CommunityPost> adminCommunityPosts(@RequestHeader("X-Id-Token") String idToken) {
        requireAdmin(idToken);
        return communityPostRepository.findAll();
    }

    @PostMapping("/admin/community/posts")
    public CommunityPost adminCreateCommunityPost(
            @RequestHeader("X-Id-Token") String idToken,
            @RequestBody AdminCommunityPostRequest request
    ) {
        User admin = requireAdmin(idToken);
        CommunityPost post = CommunityPost.builder()
                .title(request.title())
                .content(request.content())
                .authorNickname(
                        request.authorNickname() == null || request.authorNickname().isBlank()
                                ? admin.getNickname() : request.authorNickname()
                )
                .likes(request.likes() == null ? 0 : request.likes())
                .build();
        return communityPostRepository.save(post);
    }

    @PutMapping("/admin/community/posts/{id}")
    public CommunityPost adminUpdateCommunityPost(
            @RequestHeader("X-Id-Token") String idToken,
            @PathVariable Long id,
            @RequestBody AdminCommunityPostRequest request
    ) {
        requireAdmin(idToken);
        CommunityPost post = communityPostRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "게시글이 없습니다."));
        if (request.title() != null) post.setTitle(request.title());
        if (request.content() != null) post.setContent(request.content());
        if (request.authorNickname() != null) post.setAuthorNickname(request.authorNickname());
        if (request.likes() != null) post.setLikes(request.likes());
        return communityPostRepository.save(post);
    }

    @DeleteMapping("/admin/community/posts/{id}")
    public void adminDeleteCommunityPost(@RequestHeader("X-Id-Token") String idToken, @PathVariable Long id) {
        requireAdmin(idToken);
        communityPostRepository.deleteById(id);
    }

    @GetMapping("/admin/shop/items")
    public List<ShopItem> adminShopItems(@RequestHeader("X-Id-Token") String idToken) {
        requireAdmin(idToken);
        return shopItemRepository.findAll();
    }

    @PostMapping("/admin/shop/items")
    public ShopItem adminCreateShopItem(
            @RequestHeader("X-Id-Token") String idToken,
            @RequestBody AdminShopItemRequest request
    ) {
        requireAdmin(idToken);
        ShopItem item = ShopItem.builder()
                .name(request.name())
                .grade(request.grade())
                .price(request.price())
                .description(request.description())
                .build();
        return shopItemRepository.save(item);
    }

    @PutMapping("/admin/shop/items/{id}")
    public ShopItem adminUpdateShopItem(
            @RequestHeader("X-Id-Token") String idToken,
            @PathVariable Long id,
            @RequestBody AdminShopItemRequest request
    ) {
        requireAdmin(idToken);
        ShopItem item = shopItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "상품이 없습니다."));
        if (request.name() != null) item.setName(request.name());
        if (request.grade() != null) item.setGrade(request.grade());
        if (request.price() != null) item.setPrice(request.price());
        if (request.description() != null) item.setDescription(request.description());
        return shopItemRepository.save(item);
    }

    @DeleteMapping("/admin/shop/items/{id}")
    public void adminDeleteShopItem(@RequestHeader("X-Id-Token") String idToken, @PathVariable Long id) {
        requireAdmin(idToken);
        shopItemRepository.deleteById(id);
    }

    private Map<String, Object> buildAuthResponse(User user, boolean needsSignup) {
        return Map.of(
                "needsSignup", needsSignup,
                "nickname", user.getNickname(),
                "email", user.getEmail() == null ? "" : user.getEmail(),
                "remainingCalls", user.getGeminiRemainingCalls(),
                "role", user.getRole().name()
        );
    }

    private GoogleTokenInfo verifyGoogleToken(String idToken) {
        if (idToken == null || idToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google 토큰이 없습니다.");
        }

        String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
        ResponseEntity<Object> response = restTemplate.getForEntity(url, Object.class);
        Map<?, ?> body = toWildcardMap(response.getBody());
        if (!response.getStatusCode().is2xxSuccessful() || body == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "유효하지 않은 Google 토큰입니다.");
        }
        String aud = toStringOrEmpty(body.get("aud"));
        String sub = toStringOrEmpty(body.get("sub"));
        String email = toStringOrEmpty(body.get("email"));

        if (!googleClientId.equals(aud)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "클라이언트 ID가 일치하지 않습니다.");
        }
        if (sub.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google 사용자 식별값이 없습니다.");
        }
        return new GoogleTokenInfo(sub, email);
    }

    private String requestGeminiWithGoogleSearch(MultipartFile[] files) throws IOException {
        String endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + geminiModel + ":generateContent?key=" + geminiApiKey;

        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of(
                "text",
                "업로드된 이미지를 종합 분석해서 아래 형식을 반드시 지켜서 한국어로 답해줘.\n" +
                        "1) 첫 줄: 인식 성공 기업: 기업명1, 기업명2 (없으면 '없음')\n" +
                        "2) 둘째 줄: A~F 중 한 글자 등급\n" +
                        "3) 이후: 번호 목록 3개를 작성. 각 항목은 '제목: 설명' 형식으로 한 줄씩 작성\n" +
                        "4) 마크다운 강조(**)나 불릿 기호를 쓰지 말고 일반 텍스트만 사용\n" +
                        "5) 구글 검색 결과를 적극 활용해 사실 기반으로 판단"
        ));

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;
            String mimeType = file.getContentType() == null ? "image/jpeg" : file.getContentType();
            String base64 = Base64.getEncoder().encodeToString(file.getBytes());
            parts.add(Map.of(
                    "inlineData", Map.of("mimeType", mimeType, "data", base64)
            ));
        }

        Map<String, Object> payloadWithSearch = Map.of(
                "contents", List.of(Map.of("role", "user", "parts", parts)),
                "tools", List.of(Map.of("googleSearch", Map.of()))
        );
        Map<String, Object> payloadFallback = Map.of(
                "contents", List.of(Map.of("role", "user", "parts", parts))
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<?, ?> body;
        try {
            body = callGemini(endpoint, payloadWithSearch, headers);
        } catch (ResponseStatusException e) {
            body = callGemini(endpoint, payloadFallback, headers);
        }
        return extractGeminiText(body);
    }

    private Map<?, ?> callGemini(String endpoint, Map<String, Object> payload, HttpHeaders headers) {
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
        try {
            ResponseEntity<Object> response = restTemplate.exchange(
                    endpoint,
                    Objects.requireNonNull(HttpMethod.POST),
                    entity,
                    Object.class
            );
            Map<?, ?> body = toWildcardMap(response.getBody());
            if (!response.getStatusCode().is2xxSuccessful() || body == null) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini 응답이 비어 있습니다.");
            }
            return body;
        } catch (RestClientResponseException e) {
            String body = e.getResponseBodyAsString();
            String detail = body == null || body.isBlank() ? e.getMessage() : body;
            if (detail.length() > 300) {
                detail = detail.substring(0, 300);
            }
            log.error("Gemini API error status={} body={}", e.getRawStatusCode(), detail);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini API 오류: " + detail);
        } catch (Exception e) {
            log.error("Gemini call failed", e);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Gemini 호출 실패: " + e.getMessage());
        }
    }

    private String extractGeminiText(Map<?, ?> responseBody) {
        Object candidatesObj = responseBody.get("candidates");
        if (!(candidatesObj instanceof List<?> candidates) || candidates.isEmpty()) {
            return "C\n분석 결과를 생성하지 못했습니다.";
        }
        Object firstObj = candidates.get(0);
        if (!(firstObj instanceof Map<?, ?> first)) {
            return "C\n분석 결과 형식이 올바르지 않습니다.";
        }
        Object contentObj = first.get("content");
        if (!(contentObj instanceof Map<?, ?> content)) {
            return "C\n분석 내용이 없습니다.";
        }
        Object partsObj = content.get("parts");
        if (!(partsObj instanceof List<?> parts) || parts.isEmpty()) {
            return "C\n분석 내용이 비어 있습니다.";
        }
        Object textObj = ((Map<?, ?>) parts.get(0)).get("text");
        return textObj == null ? "C\n분석 내용이 비어 있습니다." : textObj.toString();
    }

    private String extractGrade(String text) {
        Matcher matcher = GRADE_PATTERN.matcher(text);
        return matcher.find() ? matcher.group(1) : "C";
    }

    private String normalizeResultText(String text) {
        if (text == null || text.isBlank()) {
            return "인식 성공 기업: 없음\nC\n1. 분석 결과를 생성하지 못했습니다.";
        }
        return text.replace("**", "").trim();
    }

    private String formatResultText(String text) {
        if (text == null || text.isBlank()) {
            return "분석 결과를 생성하지 못했습니다.";
        }

        List<String> lines = text.lines()
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .toList();

        List<String> blocks = new ArrayList<>();
        String currentTitle = null;
        StringBuilder currentBody = new StringBuilder();

        for (String line : lines) {
            if (line.startsWith("인식 성공 기업")) {
                continue;
            }
            if (line.matches("^[A-F]$")) {
                continue;
            }

            Matcher numberedTitle = NUMBERED_TITLE_PATTERN.matcher(line);
            Matcher titleOnly = TITLE_ONLY_PATTERN.matcher(line);
            Matcher numberedLine = NUMBERED_LINE_PATTERN.matcher(line);
            Matcher description = DESCRIPTION_PATTERN.matcher(line);

            if (numberedTitle.matches() || titleOnly.matches()) {
                if (currentTitle != null) {
                    blocks.add(buildSection(currentTitle, currentBody.toString()));
                }
                currentTitle = (numberedTitle.matches() ? numberedTitle.group(1) : titleOnly.group(1)).trim();
                currentBody = new StringBuilder();
                continue;
            }

            if (description.matches()) {
                if (currentBody.length() > 0) currentBody.append("\n");
                currentBody.append(description.group(1).trim());
                continue;
            }

            if (numberedLine.matches()) {
                if (currentTitle != null) {
                    blocks.add(buildSection(currentTitle, currentBody.toString()));
                }
                currentTitle = numberedLine.group(1).trim();
                currentBody = new StringBuilder();
                continue;
            }

            if (currentTitle == null) {
                currentTitle = line;
            } else {
                if (currentBody.length() > 0) currentBody.append("\n");
                currentBody.append(line);
            }
        }

        if (currentTitle != null) {
            blocks.add(buildSection(currentTitle, currentBody.toString()));
        }

        if (blocks.isEmpty()) {
            return "분석 결과를 정리하지 못했습니다.";
        }
        return String.join("\n\n", blocks);
    }

    private String buildSection(String title, String body) {
        String cleanTitle = title == null ? "" : title.trim();
        String cleanBody = body == null ? "" : body.trim();
        if (cleanBody.isBlank()) {
            cleanBody = "관련 근거를 확인 중입니다.";
        }
        return cleanTitle + "\n" + cleanBody;
    }

    private List<String> extractRecognizedCompanies(String resultText) {
        if (resultText == null || resultText.isBlank()) {
            return Collections.emptyList();
        }
        String firstLine = resultText.lines()
                .findFirst()
                .orElse("")
                .trim();
        if (!firstLine.startsWith("인식 성공 기업")) {
            return Collections.emptyList();
        }
        int idx = firstLine.indexOf(":");
        if (idx < 0 || idx + 1 >= firstLine.length()) {
            return Collections.emptyList();
        }
        String namesPart = firstLine.substring(idx + 1).trim();
        if (namesPart.isBlank() || "없음".equals(namesPart)) {
            return Collections.emptyList();
        }
        return Arrays.stream(namesPart.split(","))
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .distinct()
                .toList();
    }

    private String toStringOrEmpty(Object value) {
        return value == null ? "" : value.toString();
    }

    private Map<?, ?> toWildcardMap(Object body) {
        if (body instanceof Map<?, ?> map) {
            return map;
        }
        return null;
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(ResponseStatusException e) {
        HttpStatusCode status = e.getStatusCode();
        String message = e.getReason() == null ? "요청 처리 중 오류가 발생했습니다." : e.getReason();
        return ResponseEntity.status(status).body(Map.of(
                "status", status.value(),
                "error", status.toString(),
                "message", message
        ));
    }

    private User findUserByIdToken(String idToken) {
        GoogleTokenInfo tokenInfo = verifyGoogleToken(idToken);
        return userRepository.findByGoogleSub(tokenInfo.sub())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "회원가입이 필요합니다."));
    }

    private User requireAdmin(String idToken) {
        User user = findUserByIdToken(idToken);
        if (user.getRole() != User.Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "관리자 권한이 필요합니다.");
        }
        return user;
    }

    private boolean isAdminEmail(String email) {
        if (email == null || email.isBlank() || adminEmails == null || adminEmails.isBlank()) {
            return false;
        }
        Set<String> adminEmailSet = Arrays.stream(adminEmails.split(","))
                .map(String::trim)
                .filter(v -> !v.isBlank())
                .collect(Collectors.toSet());
        return adminEmailSet.contains(email);
    }

    private void seedCommunityPostsIfEmpty() {
        if (communityPostRepository.count() > 0) return;
        communityPostRepository.save(CommunityPost.builder()
                .title("무난한 생활용품 추천")
                .content("실사용 기준으로 자극 적은 제품 공유해요.")
                .authorNickname("cleanbuyer")
                .likes(12)
                .build());
        communityPostRepository.save(CommunityPost.builder()
                .title("이번 주 안전 등급 A 받은 제품")
                .content("성분과 후기 기준으로 A 등급 제품 모음입니다.")
                .authorNickname("eco_dad")
                .likes(21)
                .build());
    }

    private void seedShopItemsIfEmpty() {
        if (shopItemRepository.count() > 0) return;
        shopItemRepository.save(ShopItem.builder()
                .name("친환경 주방세제")
                .grade("A")
                .price(7900)
                .description("잔류 세정 성분 부담을 줄인 제품")
                .build());
        shopItemRepository.save(ShopItem.builder()
                .name("저자극 바디워시")
                .grade("B")
                .price(11900)
                .description("향료 자극을 줄인 데일리 바디워시")
                .build());
    }

    public record GoogleAuthRequest(String idToken) {}
    public record GoogleSignupRequest(String idToken, String nickname) {}
    public record GoogleTokenInfo(String sub, String email) {}
    public record CommunityPostRequest(String title, String content) {}
    public record AdminUserUpdateRequest(String nickname, Integer geminiRemainingCalls, String role) {}
    public record AdminCommunityPostRequest(String title, String content, String authorNickname, Integer likes) {}
    public record AdminShopItemRequest(String name, String grade, Integer price, String description) {}
}