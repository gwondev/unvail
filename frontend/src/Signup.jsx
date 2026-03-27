import React from "react";
import { Container, Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";

function Signup() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="xs">
      <Box sx={{ mt: 16, mb: 10, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <Box sx={{ bgcolor: 'black', color: 'white', p: 1.5, borderRadius: 2, display: 'inline-flex', mb: 2 }}>
          <ShieldCheck size={32} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>회원가입 방식 변경</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          이제 회원가입은 로그인 페이지에서 Google 인증 + 별명 입력으로 진행됩니다.
        </Typography>
        <Button
          variant="contained"
          fullWidth
          onClick={() => navigate("/login")}
          sx={{ bgcolor: "black", py: 1.5, borderRadius: 3, fontWeight: 700, "&:hover": { bgcolor: "#333" } }}
        >
          로그인/가입으로 이동
        </Button>
      </Box>
    </Container>
  );
}

export default Signup;