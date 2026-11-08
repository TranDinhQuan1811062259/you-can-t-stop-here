import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { PostList } from '../components/blog/PostList';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { IdleWeatherText } from '../components/common/IdleWeatherText';

export const CategoryPage = () => {
  const { categorySlug } = useParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  const { posts, pagination, loading, error } = usePosts({
    category: categorySlug,
    sort: sortBy,
    visibility: visibilityFilter,
    page: currentPage,
    limit: 6,
  });

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const categoryDisplayName = posts[0]?.category?.name || categorySlug.replace(/-/g, ' ');
  const categoryIcon = posts[0]?.category?.icon || (() => {
    const lower = (categoryDisplayName || '').toLowerCase();
    if (lower.includes('thế giới') || lower.includes('quốc tế') || lower.includes('global')) return '🌍';
    if (lower.includes('chiến sự') || lower.includes('chiến tranh') || lower.includes('hòa bình') || lower.includes('xung đột')) return '🕊️';
    if (lower.includes('xã hội') || lower.includes('thời cuộc') || lower.includes('society')) return '🌐';
    if (lower.includes('kiệt sức') || lower.includes('burnout') || lower.includes('áp lực')) return '😫';
    if (lower.includes('khủng hoảng') || lower.includes('career')) return '🧭';
    if (lower.includes('chuyển ngành') || lower.includes('restart')) return '🌱';
    if (lower.includes('động lực') || lower.includes('small wins') || lower.includes('tia sáng')) return '✨';
    if (lower.includes('tâm sự') || lower.includes('life')) return '☕';
    return '🏷️';
  })();

  return (
    <div>
      {/* Category Header Banner chuẩn 3 tầng xuống dòng */}
      <section className="hero-banner" style={{ padding: '48px 0' }}>
        <div className="container hero-banner-container">
          <div className="hero-tag-pill-wrap">
            <span className="hero-tag-pill">{categoryIcon} Chủ đề tâm sự</span>
          </div>
          <h1 className="hero-title" style={{ textTransform: 'capitalize' }}>
            <IdleWeatherText>{categoryDisplayName}</IdleWeatherText>
          </h1>
          <div style={{ marginTop: '16px' }}>
            <Link to="/" className="hero-back-link">
              &larr; Xem tất cả các câu chuyện khác
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container" style={{ padding: '30px 20px' }}>
        {/* Thanh Công Cụ Bộ Lọc Sắp Xếp & Chế Độ Bài Viết */}
        <div className="posts-filter-toolbar">
          <div className="filter-toolbar-left">
            <span className="filter-label">Hiển thị:</span>
            <div className="filter-pill-group">
              <button
                type="button"
                className={`filter-pill ${visibilityFilter === 'all' ? 'active' : ''}`}
                onClick={() => setVisibilityFilter('all')}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`filter-pill ${visibilityFilter === 'public' ? 'active' : ''}`}
                onClick={() => setVisibilityFilter('public')}
                title="Chỉ hiển thị các bài viết công khai"
              >
                🌐 Công khai
              </button>
              <button
                type="button"
                className={`filter-pill ${visibilityFilter === 'friends' ? 'active' : ''}`}
                onClick={() => setVisibilityFilter('friends')}
                title="Chỉ hiển thị các bài viết của bạn bè"
              >
                👥 Chỉ bạn bè
              </button>
            </div>
          </div>

          <div className="filter-toolbar-right">
            <label htmlFor="category-sort-select" className="filter-label">Sắp xếp theo:</label>
            <div className="sort-select-wrapper">
              <select
                id="category-sort-select"
                className="sort-select-box"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">⏰ Mới nhất trước</option>
                <option value="oldest">⏳ Cũ nhất trước</option>
                <option value="az">🔤 Tiêu đề: A &rarr; Z</option>
                <option value="za">🔠 Tiêu đề: Z &rarr; A</option>
                <option value="most_engaged">🔥 Tương tác cao nhất</option>
                <option value="least_engaged">💬 Cần sẻ chia (Tương tác thấp)</option>
              </select>
            </div>
          </div>
        </div>

        {error && posts.length === 0 && <ErrorMessage message={error} />}

        {loading ? (
          <LoadingSpinner message="Đang tải các bài viết trong chủ đề này..." />
        ) : (
          <>
            <PostList posts={posts} />
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </>
        )}
      </section>
    </div>
  );
};
