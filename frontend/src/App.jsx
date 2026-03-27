import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import { 
  ThemeProvider, 
  createTheme, 
  CssBaseline, 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Button, 
  Card, 
  CardContent,
  Stack,
  Chip,
  TextField,
  Tabs,
  Tab
} from "@mui/material";
import { 
  ShieldCheck, 
  Upload, 
  Users, 
  ScanSearch, 
  Receipt 
} from "lucide-react";

import Analyze from "./Analyze";
import Login from "./Login";
import Signup from "./Signup";
import { API_BASE_URL } from "./config";

const theme = createTheme({
  typography: {
    fontFamily: '"Pretendard", "Malgun Gothic", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h4: { fontWeight: 800 },
  },
  palette: {
    background: {
      default: "#ffffff",
    },
    primary: {
      main: "#111827",
    },
    secondary: {
      main: "#10b981",
    },
  },
});

const FeatureCard = ({ title, icon: Icon, description }) => {
  return (
    <Card 
      sx={{ 
        height: "100%",
        minHeight: 245,
        borderRadius: 4, 
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'translateY(-5px)',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }
      }}
    >
      <CardContent sx={{ p: 4, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
        <Box 
          sx={{ 
            width: 50, 
            height: 50, 
            borderRadius: 3, 
            bgcolor: 'rgba(16, 185, 129, 0.1)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#10b981',
            mb: 2
          }}
        >
          <Icon size={24} />
        </Box>
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, maxWidth: 260 }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const Header = () => {
  const nickname = localStorage.getItem("nickname") || "";
  const role = localStorage.getItem("role") || "USER";

  const handleLogout = () => {
    localStorage.removeItem("idToken");
    localStorage.removeItem("nickname");
    localStorage.removeItem("role");
    localStorage.removeItem("remainingCalls");
    window.location.href = "/";
  };

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'white/80', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
      <Container maxWidth="lg" sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" alignItems="center" spacing={1} component={Link} to="/" sx={{ textDecoration: 'none', color: 'black' }}>
          <Box sx={{ bgcolor: 'black', color: 'white', p: 0.5, borderRadius: 1, display: 'flex' }}>
            <ShieldCheck size={20} />
          </Box>
          <Typography variant="h6" fontWeight="bold">Unvail</Typography>
        </Stack>
        
        <Stack direction="row" spacing={3} alignItems="center">
          <Link to="/analyze" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}>분석하기</Link>
          <Link to="/community" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}>커뮤니티</Link>
          <Link to="/shop" style={{ textDecoration: 'none', color: '#4b5563', fontWeight: 500 }}>착한기업 샵</Link>
          {role === "ADMIN" && (
            <Link to="/admin" style={{ textDecoration: "none", color: "#7c3aed", fontWeight: 700 }}>DB관리</Link>
          )}
          {nickname ? (
            <>
              <Chip size="small" label={`${nickname}${role === "ADMIN" ? " (ADMIN)" : ""}`} />
              <Button variant="text" onClick={handleLogout} sx={{ color: "black", fontWeight: 700, textTransform: "none" }}>
                로그아웃
              </Button>
            </>
          ) : (
            <Button component={Link} to="/login" variant="text" sx={{ color: 'black', fontWeight: 700, textTransform: 'none' }}>
              로그인
            </Button>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

function Home() {
  return (
    <>
      <Header />
      {/* Hero Section */}
      <Box
        sx={{
          py: { xs: 8, md: 14 },
          textAlign: "center",
          bgcolor: "background.default",
          backgroundImage: "linear-gradient(180deg, rgba(16, 185, 129, 0.05), transparent 300px)",
        }}
      >
        <Container maxWidth="md">
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, px: 2, py: 0.8, borderRadius: 10, border: 1, borderColor: 'grey.200', bgcolor: 'white', mb: 4 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#10b981' }} />
            <Typography variant="caption" fontWeight="bold" color="text.secondary">AI 기반 제품 안전성 분석</Typography>
          </Box>

          <Typography variant="h2" sx={{ mb: 2, fontWeight: 800, lineHeight: 1.2, background: "linear-gradient(90deg, #111827 0%, #374151 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontSize: { xs: '2.5rem', md: '3.5rem' } }}>
            제품 스크린샷으로<br />안전등급을 확인하세요
          </Typography>

          <Typography variant="h6" color="text.secondary" sx={{ mb: 6, fontWeight: 400, lineHeight: 1.6 }}>
            AI가 제품 정보를 분석하여 <strong>A~F 등급</strong>으로 안전성을 평가합니다.<br />신뢰할 수 있는 제품 선택을 위한 첫걸음
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mb: 8 }}>
            <Button variant="contained" size="large" component={Link} to="/analyze" sx={{ bgcolor: 'black', px: 4, py: 1.5, borderRadius: 2, fontSize: '1rem', '&:hover': { bgcolor: '#333' } }} startIcon={<Upload size={20} />}>지금 분석하기</Button>
            <Button variant="outlined" size="large" component={Link} to="/community" sx={{ borderColor: 'grey.300', color: 'black', px: 4, py: 1.5, borderRadius: 2, fontSize: '1rem', '&:hover': { borderColor: 'black', bgcolor: 'transparent' } }} startIcon={<Users size={20} />}>커뮤니티 둘러보기</Button>
          </Stack>
        </Container>

        <Container maxWidth="lg">
          <Grid container spacing={4} justifyContent="center" alignItems="stretch">
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex" }}><FeatureCard title="간편한 업로드" icon={Upload} description="SNS에서 본 과장 광고, 의심스러운 제품 정보를 캡처해서 올려주세요. OCR 기술이 텍스트를 자동 추출합니다." /></Grid>
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex" }}><FeatureCard title="AI 팩트체크" icon={ScanSearch} description="LLM AI가 성분 분석부터 리뷰 패턴까지 분석하여 신뢰도 등급(A~F)을 매겨드립니다." /></Grid>
            <Grid size={{ xs: 12, md: 4 }} sx={{ display: "flex" }}><FeatureCard title="내돈내산 인증" icon={Receipt} description="실제 구매 영수증으로 인증된 리뷰만 확인하세요. 광고 없는 클린한 커뮤니티를 보장합니다." /></Grid>
          </Grid>
        </Container>
      </Box>
    </>
  );
}

function CommunityPage() {
  const [posts, setPosts] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const idToken = localStorage.getItem("idToken");

  const fetchPosts = () => {
    fetch(`${API_BASE_URL}/community/posts`)
      .then((res) => res.json())
      .then((data) => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const createPost = async () => {
    if (!idToken) {
      alert("로그인 후 작성 가능합니다.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert("제목/내용을 입력해주세요.");
      return;
    }
    const response = await fetch(`${API_BASE_URL}/community/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Id-Token": idToken
      },
      body: JSON.stringify({ title: title.trim(), content: content.trim() })
    });
    if (!response.ok) {
      alert("게시글 저장 실패");
      return;
    }
    setTitle("");
    setContent("");
    fetchPosts();
  };

  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>커뮤니티</Typography>
        <Card sx={{ p: 2.5, mb: 2.5 }}>
          <Stack spacing={1.5}>
            <TextField label="제목" value={title} onChange={(e) => setTitle(e.target.value)} />
            <TextField label="내용" multiline minRows={3} value={content} onChange={(e) => setContent(e.target.value)} />
            <Button variant="contained" onClick={createPost}>게시글 등록</Button>
          </Stack>
        </Card>
        <Stack spacing={2}>
          {posts.map((post) => (
            <Card key={post.id} sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700}>{post.title}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>{post.content}</Typography>
              <Typography variant="body2" color="text.secondary">
                {post.authorNickname} · 좋아요 {post.likes}
              </Typography>
            </Card>
          ))}
        </Stack>
      </Container>
    </>
  );
}

function ShopPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/shop/items`)
      .then((res) => res.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]));
  }, []);

  return (
    <>
      <Header />
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 3 }}>착한기업 샵</Typography>
        <Stack spacing={2}>
          {items.map((item) => (
            <Card key={item.id} sx={{ p: 2.5 }}>
              <Typography variant="h6" fontWeight={700}>{item.name}</Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>{item.description}</Typography>
              <Typography variant="body2" color="text.secondary">
                등급 {item.grade} · {item.price.toLocaleString()}원
              </Typography>
            </Card>
          ))}
        </Stack>
      </Container>
    </>
  );
}

function AdminPage() {
  const idToken = localStorage.getItem("idToken");
  const role = localStorage.getItem("role");
  const [tab, setTab] = useState(0);
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [items, setItems] = useState([]);

  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    "X-Id-Token": idToken || ""
  }), [idToken]);

  const loadAll = async () => {
    if (!idToken || role !== "ADMIN") return;
    const [u, p, s] = await Promise.all([
      fetch(`${API_BASE_URL}/admin/users`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/admin/community/posts`, { headers }).then((r) => r.json()),
      fetch(`${API_BASE_URL}/admin/shop/items`, { headers }).then((r) => r.json())
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setPosts(Array.isArray(p) ? p : []);
    setItems(Array.isArray(s) ? s : []);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const updateUserCalls = async (userId, calls) => {
    await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ geminiRemainingCalls: Number(calls) })
    });
    loadAll();
  };

  if (!idToken || role !== "ADMIN") {
    return (
      <>
        <Header />
        <Container maxWidth="sm" sx={{ py: 6 }}>
          <Typography variant="h5">관리자만 접근 가능합니다.</Typography>
        </Container>
      </>
    );
  }

  return (
    <>
      <Header />
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 2 }}>DB 관리</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="유저" />
          <Tab label="커뮤니티" />
          <Tab label="상품" />
        </Tabs>

        {tab === 0 && (
          <Stack spacing={1.5}>
            {users.map((u) => (
              <Card key={u.id} sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography>{u.nickname} ({u.role}) · {u.email}</Typography>
                  <Stack direction="row" spacing={1}>
                    <TextField size="small" type="number" defaultValue={u.geminiRemainingCalls} sx={{ width: 110 }} id={`calls-${u.id}`} />
                    <Button variant="outlined" onClick={() => updateUserCalls(u.id, document.getElementById(`calls-${u.id}`)?.value || u.geminiRemainingCalls)}>
                      저장
                    </Button>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={1.5}>
            {posts.map((p) => (
              <Card key={p.id} sx={{ p: 2 }}>
                <Typography fontWeight={700}>{p.title}</Typography>
                <Typography variant="body2">{p.content}</Typography>
              </Card>
            ))}
          </Stack>
        )}

        {tab === 2 && (
          <Stack spacing={1.5}>
            {items.map((i) => (
              <Card key={i.id} sx={{ p: 2 }}>
                <Typography fontWeight={700}>{i.name} · {i.grade}</Typography>
                <Typography variant="body2">{i.description}</Typography>
              </Card>
            ))}
          </Stack>
        )}
      </Container>
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analyze />} /> 
          <Route path="/login" element={<Login />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;