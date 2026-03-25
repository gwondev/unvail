package com.example.unvail.Controller; // 대문자 C 주의!

import com.example.unvail.entity.User;
import com.example.unvail.repository.UserRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {

    // 1. 변수명은 소문자로 시작하는 게 정석입니다!
    private final UserRepository userRepository;

    // 2. 롬복 에러를 피하기 위해 직접 생성자를 만듭니다. (이러면 빨간불 무조건 사라져요!)
    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @PostMapping("/signup")
    public String signUp(@RequestBody User user) {
        if (user == null) {
            return "데이터가 전송되지 않았습니다.";
        }
        userRepository.save(user);
        return "회원가입 성공!";
    }
}