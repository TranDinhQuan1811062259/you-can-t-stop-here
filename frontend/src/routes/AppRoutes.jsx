import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { RouteLoadingFallback } from '../components/common/RouteLoadingFallback';
import { useAuth } from '../context/AuthContext';
import { HomePage } from '../pages/HomePage';
import { CategoryPage } from '../pages/CategoryPage';
import { MusicPage } from '../pages/MusicPage';

// Tối ưu Code-Splitting cho các trang phụ, giữ HomePage, CategoryPage & MusicPage tải sẵn chống nháy Suspense
const PostDetailPage = lazy(() => import('../pages/PostDetailPage').then((m) => ({ default: m.PostDetailPage })));
const UserProfilePage = lazy(() => import('../pages/UserProfilePage').then((m) => ({ default: m.UserProfilePage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const AdminSecurityConsolePage = lazy(() => import('../pages/AdminSecurityConsolePage').then((m) => ({ default: m.AdminSecurityConsolePage })));

// Chờ hoàn tất khôi phục phiên đăng nhập trước khi kiểm tra quyền Admin để tránh đá ngược về Trang Chủ khi F5
const AdminProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return <RouteLoadingFallback />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
};

export const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminSecurityConsolePage />
            </AdminProtectedRoute>
          }
        />
        <Route path="/admin-portal" element={<AdminSecurityConsolePage />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<HomePage />} />
          <Route path="music" element={<MusicPage />} />
          <Route path="music/:themeId" element={<MusicPage />} />
          <Route path="post/:slug" element={<PostDetailPage />} />
          <Route path="category/:categorySlug" element={<CategoryPage />} />
          <Route path="profile/:userId" element={<UserProfilePage />} />
          <Route path="u/:userId" element={<UserProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
