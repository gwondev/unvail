import React, { useState } from "react";
import { 
  Box, 
  Container, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  Stack 
} from "@mui/material";
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle, 
  Zap 
} from "lucide-react";
import { API_BASE_URL } from "./config";

const Analyze = () => {
  const [previewUrls, setPreviewUrls] = useState([]);
  const [files, setFiles] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []);
    setFiles(selected);
    setPreviewUrls(selected.map((file) => URL.createObjectURL(file)));
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!files.length) {
      alert("분석할 이미지를 먼저 선택해주세요.");
      return;
    }
    const idToken = localStorage.getItem("idToken");
    if (!idToken) {
      alert("로그인 후 이용해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("idToken", idToken);
    files.forEach((file) => formData.append("files", file));

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) {
        const text = await response.text();
        let message = text;
        try {
          const parsed = JSON.parse(text);
          message = parsed.message || parsed.error || text;
        } catch {
          // keep raw text
        }
        alert(message || "분석 실패");
        return;
      }
      const data = await response.json();
      setAnalysis(data);
      localStorage.setItem("remainingCalls", String(data.remainingCalls ?? 0));
    } catch (error) {
      alert("분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      {/* 타이틀 영역 */}
      <Box sx={{ textAlign: "center", mb: 6 }}>
        <Typography variant="h3" fontWeight="800" gutterBottom sx={{ color: "#111827" }}>
          제품 안전성 분석
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
          여러 장을 올리면 Gemini + Google 검색으로 신뢰 등급을 분석합니다
        </Typography>
      </Box>

      {/* 업로드 박스 (메인 영역) */}
      <Card
        sx={{
          p: 6,
          border: "2px dashed #e5e7eb",
          borderRadius: 4,
          textAlign: "center",
          bgcolor: "white",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
          mb: 6
        }}
      >
        <input
          accept="image/*"
          style={{ display: "none" }}
          id="upload-button"
          type="file"
          multiple
          onChange={handleFileChange}
        />
        <label htmlFor="upload-button">
          <Stack spacing={3} alignItems="center" sx={{ cursor: "pointer" }}>
            {previewUrls.length > 0 ? (
              <Grid container spacing={1} justifyContent="center">
                {previewUrls.map((url) => (
                  <Grid key={url}>
                    <Box
                      component="img"
                      src={url}
                      sx={{ width: 160, height: 120, objectFit: "cover", borderRadius: 2, boxShadow: 2 }}
                    />
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ bgcolor: "#f9fafb", p: 4, borderRadius: "50%", display: 'flex' }}>
                <Upload size={48} color="#9ca3af" />
              </Box>
            )}
            
            <Box>
              <Typography variant="h5" fontWeight="700" gutterBottom>
                스크린샷을 업로드하세요
              </Typography>
              <Typography variant="body1" color="text.secondary">
                드래그 앤 드롭 또는 클릭하여 파일을 선택하세요
              </Typography>
            </Box>

            <Button
              variant="contained"
              component="span"
              startIcon={<ImageIcon size={18} />}
              sx={{ 
                bgcolor: "#111827", 
                px: 5, 
                py: 1.5, 
                borderRadius: 2,
                fontSize: "1rem",
                "&:hover": { bgcolor: "#374151" }
              }}
            >
              파일 선택
            </Button>
            <Button
              variant="outlined"
              onClick={handleAnalyze}
              disabled={loading}
              sx={{ px: 5, py: 1.5, borderRadius: 2 }}
            >
              {loading ? "분석중..." : "분석 시작"}
            </Button>
            <Typography variant="caption" color="text.secondary">
              지원 형식: JPG, PNG, WEBP (다중 업로드)
            </Typography>
          </Stack>
        </label>
      </Card>

      {analysis && (
        <Card sx={{ p: 4, borderRadius: 4, mb: 6 }}>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            분석 결과: {analysis.grade} 등급
          </Typography>
          {Array.isArray(analysis.recognizedCompanies) && analysis.recognizedCompanies.length > 0 && (
            <>
              <Typography variant="body1" sx={{ mb: 0.5 }}>
                기업정보: {analysis.recognizedCompanies.join(", ")}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                해당 기업의 공개 정보와 최근 평가 흐름을 바탕으로 분석했습니다.
              </Typography>
            </>
          )}
          <Typography variant="body1" sx={{ whiteSpace: "pre-line" }}>
            {analysis.result}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            남은 Gemini 호출 횟수: {analysis.remainingCalls}
          </Typography>
        </Card>
      )}

      {/* 하단 안내 카드 그리드 */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <ImageIcon size={20} color="#6b7280" />
              <Typography variant="subtitle1" fontWeight="700">선명한 이미지</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              제품 정보와 성분표가 잘 보이는 선명한 스크린샷을 업로드하세요
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <CheckCircle size={20} color="#10b981" />
              <Typography variant="subtitle1" fontWeight="700">인증 마크</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              KC인증, 친환경 마크 등이 포함되면 더 정확한 분석이 가능합니다
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <Zap size={20} color="#f59e0b" />
              <Typography variant="subtitle1" fontWeight="700">빠른 분석</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              AI 분석은 보통 5~10초 내에 완료됩니다
            </Typography>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analyze;