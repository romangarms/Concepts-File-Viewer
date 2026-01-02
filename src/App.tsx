import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home.js';
import { ViewerPage } from './pages/ViewerPage.js';
import { GalleryPage } from './pages/GalleryPage.js';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/gallery/*" element={<GalleryPage />} />
        <Route path="/viewer" element={<ViewerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
