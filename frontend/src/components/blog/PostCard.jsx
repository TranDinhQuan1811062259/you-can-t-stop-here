import React from 'react';
import { Link } from 'react-router-dom';
import { formatDate } from '../../utils/formatDate';

export const PostCard = ({ post }) => {
  if (!post) return null;

  const categoryName = post.category?.name || 'Tâm sự';
  const authorName = post.author || post.user?.name || 'Trần Đình Quân';
  const authorJob = post.authorJob || post.user?.jobTitle || 'System Admin & Lead Dev';
  const authorAvatar = post.user?.avatar || '/images/man.jpg';

  return (
    <article className="post-card">
      <div className="card-img-wrap">
        <Link to={`/post/${post.slug}`}>
          <img
            src={post.coverImage || '/images/sun.jpg'}
            alt={post.title}
            className="card-img"
            loading="lazy"
          />
        </Link>
        <span className="card-category-badge">{categoryName}</span>
      </div>

      <div className="card-content">
        {/* Author row */}
        <div className="card-author-row">
          <img src={authorAvatar} alt={authorName} className="card-author-avatar" />
          <div className="card-author-info">
            <h5 className="card-author-name">{authorName}</h5>
            <span className="card-author-sub">{authorJob}</span>
          </div>
        </div>

        <Link to={`/post/${post.slug}`}>
          <h3 className="card-title">{post.title}</h3>
        </Link>

        <p className="card-summary">{post.summary}</p>

        <div className="card-footer">
          <div className="card-stats">
            <span title="Lượt động viên">💪 {post.cheersCount || 0} động viên</span>
            <span title="Lượt đọc">👁️ {post.views || 1}</span>
          </div>
          <Link to={`/post/${post.slug}`} className="read-more-link">
            Đọc & Trò chuyện &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
};
