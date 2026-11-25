import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { PostList } from '../components/blog/PostList';
import { PostListSkeleton } from '../components/common/PostListSkeleton';
import { Pagination } from '../components/common/Pagination';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { IdleWeatherText } from '../components/common/IdleWeatherText';
import { GivingSomeEffortsSection } from '../components/wellness/GivingSomeEffortsSection';
import { CategoryHeroBanner } from '../components/blog/CategoryHeroBanner';
import { useCategoryRegistry, enrichCategoryMeta, setPendingBannerTransition } from '../utils/category-navigation';

export const CategoryPage = () => {
  const { categorySlug } = useParams();
  const { categories, carouselTopics } = useCategoryRegistry();

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [isCommitSwitching, setIsCommitSwitching] = useState(false);

  const prevSlugRef = useRef(categorySlug);
  const switchResetTimerRef = useRef(null);

  // Đồng bộ reset trang về 1 ngay lập tức khi categorySlug thay đổi (không giữ số trang của chủ đề cũ)
  if (prevSlugRef.current !== categorySlug) {
    prevSlugRef.current = categorySlug;
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
    if (isCommitSwitching) {
      setIsCommitSwitching(false);
    }
  }

  useEffect(() => {
    setIsCommitSwitching(false);
    if (switchResetTimerRef.current) {
      clearTimeout(switchResetTimerRef.current);
      switchResetTimerRef.current = null;
    }
  }, [categorySlug]);

  useEffect(() => {
    return () => {
      if (switchResetTimerRef.current) {
        clearTimeout(switchResetTimerRef.current);
        switchResetTimerRef.current = null;
      }
    };
  }, []);

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

  // Phân giải tên & icon trực tiếp từ Registry đồng bộ theo slug (không bao giờ lấy nhầm từ bài viết cũ)
  const matchedTopic =
    carouselTopics.find((t) => t.slug === categorySlug || t._id === categorySlug) ||
    categories.find((t) => t.slug === categorySlug || t._id === categorySlug) ||
    enrichCategoryMeta({ slug: categorySlug });

  const bannerTopics = carouselTopics.some((t) => t.slug === categorySlug)
    ? carouselTopics
    : matchedTopic
    ? [...carouselTopics, matchedTopic]
    : carouselTopics;

  const matchedPostCategory =
    posts[0]?.category?.slug === categorySlug ? posts[0].category : null;

  const categoryDisplayName =
    matchedPostCategory?.name || matchedTopic?.name || categorySlug.replace(/-/g, ' ');
  const categoryIcon = matchedPostCategory?.icon || matchedTopic?.icon || '🏷️';
  const categoryDescription = matchedTopic?.description || '';

  return (
    <div>
      {/* Category Header Banner với Engine Kéo Vật Lý 60fps & Dual-Card Peek */}
      <CategoryHeroBanner
        topics={bannerTopics}
        activeSlug={categorySlug}
        variant="category"
        swipeEnabled={true}
        paddingStyle={{ padding: '44px 0 40px' }}
        onTransitionCommitStart={() => {
          setIsCommitSwitching(true);
          if (switchResetTimerRef.current) clearTimeout(switchResetTimerRef.current);
          switchResetTimerRef.current = setTimeout(() => {
            setIsCommitSwitching(false);
            switchResetTimerRef.current = null;
          }, 900);
        }}
        badgeContent={
          <span className="hero-tag-pill">
            <span>{categoryIcon}</span>
            <span>Chủ đề tâm sự</span>
          </span>
        }
        titleContent={<IdleWeatherText>{categoryDisplayName}</IdleWeatherText>}
        subtitle={categoryDescription}
        actionsContent={
          <div style={{ marginTop: '12px' }}>
            <Link
              to="/"
              state={{ transitionDirection: 'prev', targetSlug: '' }}
              onClick={() => setPendingBannerTransition('prev', '')}
              className="hero-back-link"
            >
              &larr; Xem tất cả các câu chuyện khác
            </Link>
          </div>
        }
      />

      {/* Main Content */}
      <section className="container" style={{ padding: '30px 20px' }}>
        {/* Module Truyền Động Lực Tiếp Sức Giving Some Efforts (Hiển thị nổi bật khi duyệt chuyên mục Động Lực / Small Wins) */}
        {(categorySlug.includes('dong-luc') ||
          categorySlug.includes('small-wins') ||
          categorySlug.includes('tia-sang') ||
          categorySlug.includes('effort')) && (
          <div style={{ marginBottom: '24px' }}>
            <GivingSomeEffortsSection />
          </div>
        )}

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

        {error && !loading && !isCommitSwitching && posts.length === 0 && (
          <ErrorMessage message={error} />
        )}

        {loading || isCommitSwitching ? (
          <PostListSkeleton count={6} label="Đang tải các bài viết trong chủ đề này..." />
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
