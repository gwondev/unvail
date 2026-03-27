import React, { useCallback, useEffect, useRef, useState } from "react";
import { Container, Box, Typography, TextField, Button, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { API_BASE_URL, GOOGLE_CLIENT_ID } from "./config";

function Login() {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const [idToken, setIdToken] = useState("");
  const [needsSignup, setNeedsSignup] = useState(false);
  const [nickname, setNickname] = useState("");

  const handleGoogleCredential = useCallback(async (credential) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credential })
      });
      const data = await response.json();

      if (data.needsSignup) {
        setNeedsSignup(true);
        setIdToken(credential);
        return;
      }
      localStorage.setItem("idToken", credential);
      localStorage.setItem("nickname", data.nickname || "");
      localStorage.setItem("remainingCalls", String(data.remainingCalls ?? 0));
      localStorage.setItem("role", data.role || "USER");
      navigate("/");
    } catch (error) {
      alert("구글 로그인 처리 중 오류가 발생했습니다.");
    }
  }, [navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !window.google || !googleButtonRef.current) return;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response) => handleGoogleCredential(response.credential)
    });
    window.google.accounts.id.renderButton(googleButtonRef.current, {
      theme: "outline",
      size: "large",
      width: 320
    });
  }, [handleGoogleCredential]);

  const completeSignup = async () => {
    if (!nickname.trim()) {
      alert("별명을 입력해주세요.");
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, nickname: nickname.trim() })
      });
      if (!response.ok) {
        const text = await response.text();
        alert(text || "회원가입에 실패했습니다.");
        return;
      }
      const data = await response.json();
      localStorage.setItem("idToken", idToken);
      localStorage.setItem("nickname", data.nickname || nickname.trim());
      localStorage.setItem("remainingCalls", String(data.remainingCalls ?? 20));
      localStorage.setItem("role", data.role || "USER");
      alert("가입 완료되었습니다.");
      navigate("/");
    } catch (error) {
      alert("회원가입 처리 중 오류가 발생했습니다.");
    }
  };

  return (
    <Container maxWidth="xs">
      <Box 
        sx={{ 
          mt: 12, 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center",
          textAlign: "center"
        }}
      >
        <Box 
          sx={{ 
            bgcolor: 'black', 
            color: 'white', 
            p: 1.5, 
            borderRadius: 2, 
            display: 'inline-flex',
            mb: 2 
          }}
        >
          <ShieldCheck size={32} />
        </Box>

        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          반가워요!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 5 }}>
          Google 로그인 후 별명만 입력하면 가입이 완료됩니다.
        </Typography>

        <Stack spacing={2.5} sx={{ width: "100%", alignItems: "center" }}>
          <div ref={googleButtonRef} />
          {needsSignup && (
            <>
              <TextField
                fullWidth
                label="별명 (중복 불가)"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
              <Button
                variant="contained"
                fullWidth
                onClick={completeSignup}
                sx={{
                  bgcolor: "black",
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#333" }
                }}
              >
                별명으로 가입 완료
              </Button>
            </>
          )}
        </Stack>
      </Box>
    </Container>
  );
}

export default Login;