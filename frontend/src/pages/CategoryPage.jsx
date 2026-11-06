import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { PostList } from '../components/blog/PostList';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';

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

  return (
    <div>
      {/* Category Header Banner */}
      <section className="hero-banner" style={{ padding: '48px 0' }}>
        <div className="container">
          <span className="hero-tag-pill">Chủ đề tâm sự</span>
          <h1 className="hero-title" style={{ textTransform: 'capitalize' }}>
            {categoryDisplayName}
          </h1>
          <div style={{ marginTop: '16px' }}>
            <Link to="/" style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>
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
