import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { HomePage } from '../pages/HomePage';
import { PostDetailPage } from '../pages/PostDetailPage';
import { CategoryPage } from '../pages/CategoryPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path="post/:slug" element={<PostDetailPage />} />
        <Route path="category/:categorySlug" element={<CategoryPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

