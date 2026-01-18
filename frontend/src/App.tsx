import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { Content } from './pages/Content';
import Integrations from './pages/Integrations';
import Advanced from './pages/Advanced';
import Auth from './pages/Auth';
import Profile from './pages/Profile';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/content" element={<Content />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/advanced" element={<Advanced />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
