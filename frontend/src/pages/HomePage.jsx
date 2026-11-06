import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { categoryService } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import { CategoryFilter } from '../components/blog/CategoryFilter';
import { PostList } from '../components/blog/PostList';
import { Pagination } from '../components/common/Pagination';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { CreatePostModal } from '../components/blog/CreatePostModal';

export const HomePage = () => {
  const { isAuthenticated, openLoginModal } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get('tag') || '';
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'az' | 'za' | 'most_engaged' | 'least_engaged'
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'public' | 'friends'
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  useEffect(() => {
    categoryService
      .getCategories()
      .then((res) => setCategories(res.data || []))
      .catch((err) => console.warn('Lỗi tải danh mục:', err));
  }, []);

  // Khi tag hoặc tiêu chí lọc thay đổi, reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag, sortBy, visibilityFilter, selectedCategory]);

  const { posts, pagination, loading, error } = usePosts({
    category: selectedCategory,
    tag: selectedTag,
    sort: sortBy,
    visibility: visibilityFilter,
    page: currentPage,
    limit: 6,
  });

  const handleCategorySelect = (categorySlug) => {
    setSelectedCategory(categorySlug);
    setCurrentPage(1);
  };

  const handleClearTag = () => {
    searchParams.delete('tag');
    setSearchParams(searchParams);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  return (
    <div>
      {/* Hero Banner mang tinh thần "You Can't Stop Here" */}
      <section className="hero-banner">
        <div className="container">
          <span className="hero-tag-pill">Cộng đồng sẻ chia của người đi làm</span>
          <h1 className="hero-title">
            YOU CAN'T <span>STOP HERE</span>
          </h1>
          <p className="hero-subtitle">
            Trút bỏ những áp lực deadline, kiệt sức và bất an nơi công sở.
            Bạn có thể chậm lại để nghỉ ngơi, nhưng đừng dừng lại. Chúng mình luôn ở đây cùng bạn!
          </p>

          <div className="hero-cta-group">
            {isAuthenticated ? (
              <button
                className="hero-btn-primary"
                onClick={() => setIsCreateOpen(true)}
              >
                ✍️ Viết tâm sự của bạn hôm nay
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  className="hero-btn-primary"
                  onClick={openLoginModal}
                >
                  Đăng nhập để chia sẻ & Động viên
                </button>
                <a href="#posts-section" className="hero-btn-secondary">
                  Đọc tâm sự của mọi người ↓
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="container" id="posts-section" style={{ paddingTop: '30px' }}>
        {/* Bộ lọc danh mục */}
        <CategoryFilter
          categories={categories}
          activeCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />

        {/* Banner hiển thị khi lọc theo hashtag/chủ đề */}
        {selectedTag && (
          <div className="active-tag-filter-banner">
            <div className="tag-filter-info">
              <span className="tag-filter-icon">🏷️</span>
              <span>Đang lọc tâm sự theo chủ đề: <strong>#{selectedTag}</strong></span>
            </div>
            <button
              type="button"
              className="clear-tag-btn"
              onClick={handleClearTag}
              title="Xem tất cả bài viết"
            >
              ✕ Bỏ lọc chủ đề
            </button>
          </div>
        )}

        {/* Thanh Công Cụ Bộ Lọc Sắp Xếp & Chế Độ Bài Viết (Mới nhất, Cũ nhất, A-Z, Tương tác...) */}
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
            <label htmlFor="sort-select" className="filter-label">Sắp xếp theo:</label>
            <div className="sort-select-wrapper">
              <select
                id="sort-select"
                className="sort-select-box"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="newest">⏰ Mới nhất trước</option>
                <option value="oldest">⏳ Cũ nhất trước</option>
                <option value="az">🔤 Tiêu đề: A &rarr; Z</option>
                <option value="za">🔠 Tiêu đề: Z &rarr; A</option>
                <option value="most_engaged">🔥 Tương tác cao nhất (Nhiều cảm xúc & đọc)</option>
                <option value="least_engaged">💬 Cần sẻ chia (Tương tác thấp nhất)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chỉ hiển thị lỗi khi hoàn toàn không có bài viết nào */}
        {error && posts.length === 0 && <ErrorMessage message={error} />}

        {loading ? (
          <LoadingSpinner message="Đang tải những câu chuyện mới nhất..." />
        ) : (
          <>
            <PostList posts={posts} />
            <Pagination
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </section>

      {/* Social Buzz / Quote Block kế thừa từ template */}
      <section className="social-quote-section">
        <div className="container" style={{ textAlign: 'center', maxWidth: '780px' }}>
          <img
            src="/images/heart.png"
            alt="Heart"
            style={{ margin: '0 auto 16px', height: '36px' }}
          />
          <blockquote className="social-quote-text">
            "Không sao cả nếu hôm nay mọi thứ chưa diễn ra như ý bạn.
            Một cánh cửa đóng lại là để bạn học cách trân trọng sức khỏe, tâm trí
            và những người thật lòng yêu thương mình."
          </blockquote>
          <strong className="social-quote-author">
            — YOU CAN'T STOP HERE COMMUNITY
          </strong>
        </div>
      </section>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={() => window.location.reload()}
      />
    </div>
  );
};
