import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Home from '@/pages/Home';
import ChangelogButton from '@/components/ChangelogButton';

// 非首页按需加载，减小首屏脚本体积
const Quiz = lazy(() => import('@/pages/Quiz'));
const Result = lazy(() => import('@/pages/Result'));
const Profile = lazy(() => import('@/pages/Profile'));
const Admin = lazy(() => import('@/pages/Admin'));

export default function App() {
  return (
    <div className="app-bg relative">
      <ChangelogButton />
      <Suspense fallback={<div className="min-h-dvh" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/result" element={<Result />} />
          <Route path="/me" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}