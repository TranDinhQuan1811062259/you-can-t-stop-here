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

  const { posts, pagination, loading, error } = usePosts({
    category: categorySlug,
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
      <section className="container" style={{ padding: '40px 20px' }}>
        <ErrorMessage message={error} />

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
