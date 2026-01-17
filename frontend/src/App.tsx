import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { History } from './pages/History';
import { Content } from './pages/Content';
import Integrations from './pages/Integrations';
import Advanced from './pages/Advanced';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/history" element={<History />} />
        <Route path="/content" element={<Content />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/advanced" element={<Advanced />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
