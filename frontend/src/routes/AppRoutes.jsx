import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { RouteLoadingFallback } from '../components/common/RouteLoadingFallback';

// Tối ưu Code-Splitting: Tải lười (Lazy load) các trang để giảm kích thước bundle ban đầu
const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })));
const PostDetailPage = lazy(() => import('../pages/PostDetailPage').then((m) => ({ default: m.PostDetailPage })));
const CategoryPage = lazy(() => import('../pages/CategoryPage').then((m) => ({ default: m.CategoryPage })));
const UserProfilePage = lazy(() => import('../pages/UserProfilePage').then((m) => ({ default: m.UserProfilePage })));
const MusicPage = lazy(() => import('../pages/MusicPage').then((m) => ({ default: m.MusicPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const AdminSecurityConsolePage = lazy(() => import('../pages/AdminSecurityConsolePage').then((m) => ({ default: m.AdminSecurityConsolePage })));

export const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
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
