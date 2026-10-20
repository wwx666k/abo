import { Navigate, Route, Routes } from 'react-router-dom';
import Home from '@/pages/Home';
import Quiz from '@/pages/Quiz';
import Result from '@/pages/Result';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';

export default function App() {
  return (
    <div className="app-bg">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/result" element={<Result />} />
        <Route path="/me" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
