import React from 'react';
import { PostCard } from './PostCard';

export const PostList = ({ posts = [], maxPosts = 6 }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="empty-state">
        <h3>Chưa có bài viết nào trong danh mục này.</h3>
        <p>Vui lòng quay lại sau hoặc chọn danh mục khác!</p>
      </div>
    );
  }

  const displayPosts = maxPosts ? posts.slice(0, maxPosts) : posts;

  return (
    <div className="posts-grid">
      {displayPosts.map((post) => (
        <PostCard key={post._id || post.slug} post={post} />
      ))}
    </div>
  );
};

