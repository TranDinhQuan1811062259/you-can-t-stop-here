import React from 'react';
import { PostCard } from './PostCard';

export const PostList = ({ posts = [] }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="empty-state">
        <h3>Chưa có bài viết nào trong danh mục này.</h3>
        <p>Vui lòng quay lại sau hoặc chọn danh mục khác!</p>
      </div>
    );
  }

  return (
    <div className="posts-grid">
      {posts.map((post) => (
        <PostCard key={post._id || post.slug} post={post} />
      ))}
    </div>
  );
};

