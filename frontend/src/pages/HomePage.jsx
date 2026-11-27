import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import { CategoryFilter } from '../components/blog/CategoryFilter';
import { CategoryHeroBanner } from '../components/blog/CategoryHeroBanner';
import { PostList } from '../components/blog/PostList';
import { PostListSkeleton } from '../components/common/PostListSkeleton';
import { Pagination } from '../components/common/Pagination';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { StoryBar } from '../components/story/StoryBar';
import { IdleWeatherText } from '../components/common/IdleWeatherText';
import { SectionErrorBoundary } from '../components/common/SectionErrorBoundary';
import {
  useCategoryRegistry,
  enrichCategoryMeta,
  setPendingBannerTransition,
} from '../utils/category-navigation';

const CreatePostModal = lazy(() =>
  import('../components/blog/CreatePostModal').then((m) => ({
    default: m.CreatePostModal || m.default,
  }))
);

const CreateStoryModal = lazy(() =>
  import('../components/story/CreateStoryModal').then((m) => ({
    default: m.CreateStoryModal || m.default,
  }))
);

const StoryViewerModal = lazy(() =>
  import('../components/story/StoryViewerModal').then((m) => ({
    default: m.StoryViewerModal || m.default,
  }))
);

let hasPreloadedCreatePostModal = false;
const preloadCreatePostModal = () => {
  if (hasPreloadedCreatePostModal) return;
  hasPreloadedCreatePostModal = true;
  import('../components/blog/CreatePostModal').catch(() => {
    hasPreloadedCreatePostModal = false;
  });
};

export const HomePage = () => {
  const { isAuthenticated, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get('tag') || '';
  const searchQuery = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const { categories, carouselTopics, appendCategory } = useCategoryRegistry();
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [isCommitSwitching, setIsCommitSwitching] = useState(false);
  const switchResetTimerRef = useRef(null);
  const prevCategoryParamRef = useRef(categoryParam);

  if (prevCategoryParamRef.current !== categoryParam) {
    prevCategoryParamRef.current = categoryParam;
    if (selectedCategory !== categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (isCommitSwitching) {
      setIsCommitSwitching(false);
    }
  }

  useEffect(() => {
    setSelectedCategory(categoryParam);
    setIsCommitSwitching(false);
    if (switchResetTimerRef.current) {
      clearTimeout(switchResetTimerRef.current);
      switchResetTimerRef.current = null;
    }
  }, [categoryParam]);

  useEffect(() => {
    return () => {
      if (switchResetTimerRef.current) {
        clearTimeout(switchResetTimerRef.current);
        switchResetTimerRef.current = null;
      }
    };
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'oldest' | 'az' | 'za' | 'most_engaged' | 'least_engaged'
  const [visibilityFilter, setVisibilityFilter] = useState('all'); // 'all' | 'public' | 'friends'
  const [selectedPostType, setSelectedPostType] = useState('all'); // 'all' | 'article' | 'photo' | 'video'
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // States cho Story 24h
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [storyToEdit, setStoryToEdit] = useState(null);
  const [isViewStoryOpen, setIsViewStoryOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storiesList, setStoriesList] = useState([]);

  // Khi tag, tìm kiếm hoặc tiêu chí lọc thay đổi, reset về trang 1
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTag, searchQuery, sortBy, visibilityFilter, selectedCategory, selectedPostType]);

  const { posts, pagination, loading, error } = usePosts({
    category: selectedCategory,
    tag: selectedTag,
    q: searchQuery,
    sort: sortBy,
    visibility: visibilityFilter,
    postType: selectedPostType !== 'all' ? selectedPostType : undefined,
    page: currentPage,
    limit: 6,
  });

  const matchedTopic = selectedCategory
    ? categories.find((t) => t.slug === selectedCategory || t._id === selectedCategory) ||
      carouselTopics.find((t) => t.slug === selectedCategory || t._id === selectedCategory) ||
      enrichCategoryMeta({ slug: selectedCategory })
    : null;
  const currentCategoryName = matchedTopic?.name || (selectedCategory ? selectedCategory.replace(/-/g, ' ') : '');
  const currentCategoryIcon = matchedTopic?.icon || '🏷️';
  const currentCategoryDesc = matchedTopic?.description || '';

  const handleCategorySelect = useCallback(
    (categorySlug, forcedDirection = null) => {
      const normalized = categorySlug || '';
      const currentIdx = carouselTopics.findIndex((t) => t.slug === (selectedCategory || ''));
      const nextIdx = carouselTopics.findIndex((t) => t.slug === normalized);
      const computedDir =
        forcedDirection ||
        (currentIdx !== -1 && nextIdx !== -1 && nextIdx !== currentIdx
          ? nextIdx > currentIdx
            ? 'next'
            : 'prev'
          : 'next');

      setPendingBannerTransition(computedDir, normalized);
      setIsCommitSwitching(false);
      setSelectedCategory(normalized);

      const nextParams = new URLSearchParams(searchParams);
      if (normalized) {
        nextParams.set('category', normalized);
      } else {
        nextParams.delete('category');
      }
      setSearchParams(nextParams);
      setCurrentPage(1);
    },
    [carouselTopics, selectedCategory, searchParams, setSearchParams]
  );

  const handleClearTag = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('tag');
    setSearchParams(nextParams);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const homePrimaryCta = (
    <div className="hero-cta-group">
      <div className="hero-cta-row">
        <button
          type="button"
          className="hero-btn-primary"
          onMouseEnter={isAuthenticated ? preloadCreatePostModal : undefined}
          onFocus={isAuthenticated ? preloadCreatePostModal : undefined}
          onClick={() => (isAuthenticated ? setIsCreateOpen(true) : openLoginModal())}
        >
          <i className="fa-solid fa-feather-pointed" style={{ marginRight: '8px' }}></i>
          Viết tâm sự
        </button>
        <Link to="/wellness" className="hero-btn-secondary">
          <i className="fa-solid fa-spa" style={{ marginRight: '8px' }}></i>
          Khám phá Trạm Chữa Lành
        </Link>
      </div>
    </div>
  );

  return (
    <div>
      {/* Hero Banner / Banner Chủ Đề thống nhất Gesture 60fps & Dual-Card Peek */}
      {selectedCategory ? (
        <CategoryHeroBanner
          topics={carouselTopics}
          activeSlug={selectedCategory}
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
          onNavigateTopic={(targetTopic, dir) => {
            if (targetTopic?.isExternalSection) {
              navigate(targetTopic.path, {
                state: {
                  transitionDirection: dir || 'next',
                  targetSlug: targetTopic.slug,
                  fromSlug: selectedCategory,
                },
              });
              return;
            }
            if (!targetTopic?.slug) {
              handleCategorySelect('', dir || 'prev');
              return;
            }
            handleCategorySelect(targetTopic.slug, dir);
          }}
          badgeContent={
            <span className="hero-tag-pill">
              <span>{currentCategoryIcon}</span>
              <span>Chủ đề tâm sự</span>
            </span>
          }
          titleContent={<IdleWeatherText>{currentCategoryName}</IdleWeatherText>}
          subtitle={currentCategoryDesc}
          actionsContent={
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  handleCategorySelect('', 'prev');
                }}
                className="hero-back-link"
              >
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Xem tất cả các câu chuyện khác
              </button>
            </div>
          }
        />
      ) : selectedTag ? (
        <CategoryHeroBanner
          topics={carouselTopics}
          activeSlug=""
          variant="tag"
          swipeEnabled={false}
          paddingStyle={{ padding: '48px 0' }}
          badgeContent={
            <span className="hero-tag-pill">
              <i className="fa-solid fa-hashtag" style={{ marginRight: '6px' }}></i> Chủ đề Hashtag
            </span>
          }
          titleContent={<IdleWeatherText>#{selectedTag}</IdleWeatherText>}
          actionsContent={
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={handleClearTag}
                className="hero-back-link"
              >
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Xem tất cả các câu chuyện khác
              </button>
            </div>
          }
        />
      ) : searchQuery ? (
        <CategoryHeroBanner
          topics={carouselTopics}
          activeSlug=""
          variant="search"
          swipeEnabled={false}
          paddingStyle={{ padding: '48px 0' }}
          badgeContent={
            <span className="hero-tag-pill">
              <i className="fa-solid fa-magnifying-glass" style={{ marginRight: '6px' }}></i> Kết quả tìm kiếm
            </span>
          }
          titleContent={<IdleWeatherText>"{searchQuery}"</IdleWeatherText>}
          actionsContent={
            <div style={{ marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  const nextParams = new URLSearchParams(searchParams);
                  nextParams.delete('q');
                  setSearchParams(nextParams);
                }}
                className="hero-back-link"
              >
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Xem tất cả các câu chuyện khác
              </button>
            </div>
          }
        />
      ) : (
        <CategoryHeroBanner
          topics={carouselTopics}
          activeSlug=""
          variant="home"
          swipeEnabled={true}
          onTransitionCommitStart={() => {
            setIsCommitSwitching(true);
            if (switchResetTimerRef.current) clearTimeout(switchResetTimerRef.current);
            switchResetTimerRef.current = setTimeout(() => {
              setIsCommitSwitching(false);
              switchResetTimerRef.current = null;
            }, 900);
          }}
          onNavigateTopic={(targetTopic, dir) => {
            navigate(targetTopic.path, {
              state: {
                transitionDirection: dir,
                targetSlug: targetTopic.slug,
                fromSlug: '',
              },
            });
          }}
          badgeContent={<span className="hero-tag-pill">Cộng đồng sẻ chia của người đi làm</span>}
          titleContent={
            <IdleWeatherText>
              YOU CAN'T <span className="hero-title-accent">STOP HERE</span>
            </IdleWeatherText>
          }
          subtitle="Trút bỏ những áp lực deadline, kiệt sức và bất an nơi công sở. Bạn có thể chậm lại để nghỉ ngơi, nhưng đừng dừng lại. Chúng mình luôn ở đây cùng bạn!"
          actionsContent={homePrimaryCta}
          extraContent={null}
        />
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

        {/* Bộ lọc danh mục */}
        <CategoryFilter
          categories={categories}
          activeCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          onCategoryCreated={(created) => {
            appendCategory(created);
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
          <div className="filter-toolbar-left" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="filter-label" style={{ minWidth: '70px', fontWeight: 600 }}>Định dạng:</span>
              <div className="filter-pill-group">
                <button
                  type="button"
                  className={`filter-pill ${selectedPostType === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedPostType('all')}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  className={`filter-pill ${selectedPostType === 'article' ? 'active' : ''}`}
                  onClick={() => setSelectedPostType('article')}
                  title="Chỉ hiển thị bài viết tâm sự sâu sắc"
                >
                  📝 Bài viết sâu
                </button>
                <button
                  type="button"
                  className={`filter-pill ${selectedPostType === 'photo' ? 'active' : ''}`}
                  onClick={() => setSelectedPostType('photo')}
                  title="Chỉ hiển thị khoảnh khắc ảnh kèm status"
                >
                  📸 Khoảnh khắc ảnh
                </button>
                <button
                  type="button"
                  className={`filter-pill ${selectedPostType === 'video' ? 'active' : ''}`}
                  onClick={() => setSelectedPostType('video')}
                  title="Chỉ hiển thị video & thước phim ngắn"
                >
                  🎬 Video ngắn
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="filter-label" style={{ minWidth: '70px', fontWeight: 600 }}>Chế độ:</span>
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
        {error && !loading && !isCommitSwitching && posts.length === 0 && <ErrorMessage message={error} />}

        <SectionErrorBoundary name="Danh sách bài viết tâm sự" onRetry={() => handlePageChange(pagination?.page || 1)}>
          {loading || isCommitSwitching ? (
            <PostListSkeleton count={6} label="Đang tải những câu chuyện mới nhất..." />
          ) : (
            <>
              <PostList posts={posts} />
              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </SectionErrorBoundary>
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

      {/* Create Post Modal (Lazy-loaded đồng bộ với Header/MainLayout) */}
      {isCreateOpen && (
        <Suspense fallback={null}>
          <CreatePostModal
            isOpen={isCreateOpen}
            onClose={() => setIsCreateOpen(false)}
            onPostCreated={() => {
              setIsCreateOpen(false);
              setSortBy('newest');
              setCurrentPage(1);
              window.dispatchEvent(new Event('post_updated'));
            }}
          />
        </Suspense>
      )}

      {/* Modal Tạo / Sửa Story 24h (Lazy-loaded) */}
      {isCreateStoryOpen && (
        <Suspense fallback={null}>
          <CreateStoryModal
            isOpen={isCreateStoryOpen}
            onClose={() => {
              setIsCreateStoryOpen(false);
              setStoryToEdit(null);
            }}
            storyToEdit={storyToEdit}
          />
        </Suspense>
      )}

      {/* Modal Xem Story 24h Toàn Màn Hình (Lazy-loaded) */}
      {isViewStoryOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
  );
};
