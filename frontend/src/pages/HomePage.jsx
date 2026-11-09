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
import { CommunityMoodWall } from '../components/blog/CommunityMoodWall';
import { StoryBar } from '../components/story/StoryBar';
import { CreateStoryModal } from '../components/story/CreateStoryModal';
import { StoryViewerModal } from '../components/story/StoryViewerModal';
import { IdleWeatherText } from '../components/common/IdleWeatherText';
import { CommunityResilienceTree } from '../components/wellness/CommunityResilienceTree';

export const HomePage = () => {
  const { isAuthenticated, openLoginModal } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get('tag') || '';
  const searchQuery = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);

  useEffect(() => {
    setSelectedCategory(categoryParam);
  }, [categoryParam]);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'az' | 'za' | 'most_engaged' | 'least_engaged'
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'public' | 'friends'
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // States cho Story 24h
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [storyToEdit, setStoryToEdit] = useState(null);
  const [isViewStoryOpen, setIsViewStoryOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storiesList, setStoriesList] = useState([]);

  useEffect(() => {
    categoryService
      .getCategories()
      .then((res) => setCategories(res.data || []))
      .catch((err) => console.warn('Lỗi tải danh mục:', err));

    // Lắng nghe khi có thể loại mới được tạo ở bất cứ đâu
    const handleCategoryCreated = (e) => {
      const created = e.detail?.category;
      if (created) {
        setCategories((prev) => {
          const exists = prev.some((c) => c._id === created._id || c.slug === created.slug);
          return exists ? prev : [...prev, created];
        });
      }
    };
    window.addEventListener('freedom_category_created', handleCategoryCreated);
    return () => window.removeEventListener('freedom_category_created', handleCategoryCreated);
  }, []);

  // Khi tag, tìm kiếm hoặc tiêu chí lọc thay đổi, reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag, searchQuery, sortBy, visibilityFilter, selectedCategory]);

  const { posts, pagination, loading, error } = usePosts({
    category: selectedCategory,
    tag: selectedTag,
    q: searchQuery,
    sort: sortBy,
    visibility: visibilityFilter,
    page: currentPage,
    limit: 6,
  });

  const currentCategory = categories.find(
    (c) => c.slug === selectedCategory || c._id === selectedCategory
  );
  const currentCategoryName = currentCategory?.name || (selectedCategory ? selectedCategory.replace(/-/g, ' ') : '');
  const currentCategoryIcon = currentCategory?.icon || (() => {
    const lower = (currentCategoryName || '').toLowerCase();
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

  const handleCategorySelect = (categorySlug) => {
    setSelectedCategory(categorySlug);
    if (categorySlug) {
      searchParams.set('category', categorySlug);
    } else {
      searchParams.delete('category');
    }
    setSearchParams(searchParams);
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
      {/* Hero Banner chuẩn 3 tầng xuống dòng */}
      {selectedCategory ? (
        <section className="hero-banner" style={{ padding: '48px 0' }}>
          <div className="container hero-banner-container">
            <div className="hero-tag-pill-wrap">
              <span className="hero-tag-pill">
                <i className="fa-solid fa-layer-group" style={{ marginRight: '6px' }}></i> Chủ đề tâm sự
              </span>
            </div>
            <h1 className="hero-title" style={{ textTransform: 'capitalize' }}>
              <IdleWeatherText>{currentCategoryName}</IdleWeatherText>
            </h1>
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => handleCategorySelect('')}
                className="hero-back-link"
              >
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Xem tất cả các câu chuyện khác
              </button>
            </div>
          </div>
        </section>
      ) : selectedTag ? (
        <section className="hero-banner" style={{ padding: '48px 0' }}>
          <div className="container hero-banner-container">
            <div className="hero-tag-pill-wrap">
              <span className="hero-tag-pill">
                <i className="fa-solid fa-hashtag" style={{ marginRight: '6px' }}></i> Chủ đề Hashtag
              </span>
            </div>
            <h1 className="hero-title">
              <IdleWeatherText>#{selectedTag}</IdleWeatherText>
            </h1>
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={handleClearTag}
                className="hero-back-link"
              >
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Xem tất cả các câu chuyện khác
              </button>
            </div>
          </div>
        </section>
      ) : searchQuery ? (
        <section className="hero-banner" style={{ padding: '48px 0' }}>
          <div className="container hero-banner-container">
            <div className="hero-tag-pill-wrap">
              <span className="hero-tag-pill">
                <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '6px' }}></i> Kết quả tìm kiếm
              </span>
            </div>
            <h1 className="hero-title">
              <IdleWeatherText>"{searchQuery}"</IdleWeatherText>
            </h1>
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  searchParams.delete('q');
                  setSearchParams(searchParams);
                }}
                className="hero-back-link"
              >
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Xem tất cả các câu chuyện khác
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="hero-banner">
          <div className="container hero-banner-container">
            <div className="hero-tag-pill-wrap">
              <span className="hero-tag-pill">Cộng đồng sẻ chia của người đi làm</span>
            </div>
            <h1 className="hero-title">
              <IdleWeatherText>
                YOU CAN'T <span>STOP HERE</span>
              </IdleWeatherText>
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
                  <i className="fa-solid fa-feather-pointed" style={{ marginRight: '8px' }}></i> Viết tâm sự của bạn hôm nay
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    className="hero-btn-primary"
                    onClick={openLoginModal}
                  >
                    <i className="fa-solid fa-arrow-right-to-bracket" style={{ marginRight: '8px' }}></i> Đăng nhập để chia sẻ &amp; Động viên
                  </button>
                  <a href="#posts-section" className="hero-btn-secondary">
                    Đọc tâm sự của mọi người <i className="fa-solid fa-arrow-down" style={{ marginLeft: '6px' }}></i>
                  </a>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Main Content Area */}
      <section className="container" id="posts-section" style={{ paddingTop: '30px' }}>
        {/* 🌟 Thanh Story 24h (Phong cách Instagram/Facebook có nhạc & cọ vẽ) */}
        <StoryBar
          onOpenCreateStory={() => {
            setStoryToEdit(null);
            setIsCreateStoryOpen(true);
          }}
          onOpenViewStory={(story, index, allStories) => {
            setActiveStoryIndex(index);
            setStoriesList(allStories);
            setIsViewStoryOpen(true);
          }}
        />

        {/* 📊 Bức Tường Tâm Trạng Cộng Đồng & Lối vào Trạm Xả Stress */}
        <CommunityMoodWall
          onOpenWellness={() => window.dispatchEvent(new Event('freedom_open_wellness'))}
        />

        {/* 🌳 Cây Hồi Sinh & Tái Tạo Năng Lượng Cộng Đồng (Live Tree of Resilience) */}
        <CommunityResilienceTree />

        {/* Bộ lọc danh mục */}
        <CategoryFilter
          categories={categories}
          activeCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          onCategoryCreated={(created) => {
            setCategories((prev) => {
              const exists = prev.some((c) => c._id === created._id || c.slug === created.slug);
              return exists ? prev : [...prev, created];
            });
          }}
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

        {/* Banner hiển thị khi tìm kiếm bài viết bằng thanh Search trên Header */}
        {searchQuery && (
          <div className="active-tag-filter-banner" style={{ borderColor: 'rgba(13, 148, 136, 0.4)' }}>
            <div className="tag-filter-info">
              <span className="tag-filter-icon">🔍</span>
              <span>Đang tìm kiếm tâm sự theo từ khóa: <strong>"{searchQuery}"</strong></span>
            </div>
            <button
              type="button"
              className="clear-tag-btn"
              onClick={() => {
                searchParams.delete('q');
                setSearchParams(searchParams);
              }}
              title="Xóa tìm kiếm để xem tất cả"
            >
              ✕ Bỏ tìm kiếm
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

      {/* Modal Tạo / Sửa Story 24h */}
      <CreateStoryModal
        isOpen={isCreateStoryOpen}
        onClose={() => {
          setIsCreateStoryOpen(false);
          setStoryToEdit(null);
        }}
        storyToEdit={storyToEdit}
      />

      {/* Modal Xem Story 24h Toàn Màn Hình */}
      <StoryViewerModal
        isOpen={isViewStoryOpen}
        onClose={() => setIsViewStoryOpen(false)}
        initialIndex={activeStoryIndex}
        stories={storiesList}
        onEditStory={(story) => {
          setStoryToEdit(story);
          setIsCreateStoryOpen(true);
        }}
      />
    </div>
  );
};
