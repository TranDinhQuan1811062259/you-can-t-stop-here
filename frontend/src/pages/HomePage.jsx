import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../context/AuthContext';
import { CategoryFilter } from '../components/blog/CategoryFilter';
import { CategoryHeroBanner } from '../components/blog/CategoryHeroBanner';
import { PostList } from '../components/blog/PostList';
import { PostListSkeleton } from '../components/common/PostListSkeleton';
import { Pagination } from '../components/common/Pagination';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { CreatePostModal } from '../components/blog/CreatePostModal';
import { CommunityMoodWall } from '../components/blog/CommunityMoodWall';
import { StoryBar } from '../components/story/StoryBar';
import { CreateStoryModal } from '../components/story/CreateStoryModal';
import { StoryViewerModal } from '../components/story/StoryViewerModal';
import { IdleWeatherText } from '../components/common/IdleWeatherText';
import { CommunityResilienceTree } from '../components/wellness/CommunityResilienceTree';
import { GivingSomeEffortsSection } from '../components/wellness/GivingSomeEffortsSection';
import { SectionErrorBoundary } from '../components/common/SectionErrorBoundary';
import {
  useCategoryRegistry,
  enrichCategoryMeta,
  setPendingBannerTransition,
} from '../utils/category-navigation';

export const HomePage = () => {
  const { isAuthenticated, openLoginModal } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTag = searchParams.get('tag') || '';
  const searchQuery = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const { categories, topics, appendCategory } = useCategoryRegistry();
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
    ? topics.find((t) => t.slug === selectedCategory || t._id === selectedCategory) ||
      enrichCategoryMeta({ slug: selectedCategory })
    : null;
  const currentCategoryName = matchedTopic?.name || (selectedCategory ? selectedCategory.replace(/-/g, ' ') : '');
  const currentCategoryIcon = matchedTopic?.icon || '🏷️';
  const currentCategoryDesc = matchedTopic?.description || '';

  const handleCategorySelect = useCallback(
    (categorySlug, forcedDirection = null) => {
      const normalized = categorySlug || '';
      const currentIdx = topics.findIndex((t) => t.slug === (selectedCategory || ''));
      const nextIdx = topics.findIndex((t) => t.slug === normalized);
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
    [topics, selectedCategory, searchParams, setSearchParams]
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
      {isAuthenticated ? (
        <button
          className="hero-btn-primary"
          onClick={() => setIsCreateOpen(true)}
        >
          <i className="fa-solid fa-feather-pointed" style={{ marginRight: '8px' }}></i> Viết tâm sự của bạn hôm nay
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
  );

  const homeExtraActions = (
    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('freedom_open_rant_and_burn'))}
        className="hero-rant-burn-pill"
        title="Đang bực tức, ức chế hoặc quá tải vì công việc? Bấm vào đây để xả giận và thiêu rụi thành tro bụi!"
      >
        <span className="rant-pill-flame-wrap">
          <span className="rant-pill-flame" aria-hidden="true">🔥</span>
        </span>
        <span className="rant-pill-text-wrap">
          <span className="rant-pill-text">
            Đang ức chế &amp; quá tải? Ghé <strong className="rant-pill-highlight">Lò Đốt Muộn Phiền</strong> để thiêu rụi
          </span>
          <span className="rant-pill-arrow" aria-hidden="true">→</span>
        </span>
        <span className="rant-pill-badge">MỚI</span>
      </button>

      {/* Dải 4 Lối Khám Phá Nhanh */}
      <div
        className="hero-new-features-strip"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          marginTop: '4px',
        }}
      >
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('freedom_open_drift_bottle'))}
          className="hero-quick-feat-pill"
          title="Mở Chiếc Máy Đánh Chữ Nửa Đêm & Thả Thư Trôi Sông"
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            color: '#0284c7',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>🌊</span>
          <span>Chai Thư Nửa Đêm</span>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('freedom_open_mood_radar'))}
          className="hero-quick-feat-pill"
          title="Mở Radar Đo Nhịp Cảm Xúc Công Sở Thời Gian Thực"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#059669',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>📡</span>
          <span>Radar Công Sở</span>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('freedom_open_whisper_wall'))}
          className="hero-quick-feat-pill"
          title="Mở Bức Tường Thì Thầm 10 Giây & Gửi Cái Ôm Âm Thanh"
          style={{
            background: 'rgba(236, 72, 153, 0.1)',
            border: '1px solid rgba(236, 72, 153, 0.35)',
            color: '#db2777',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>🎙️</span>
          <span>Thì Thầm 10s</span>
        </button>

        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('freedom_open_time_capsule'))}
          className="hero-quick-feat-pill"
          title="Mở Tiệm Hộp Thời Gian & Đóng Dấu Sáp Niêm Phong"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            color: '#d97706',
            padding: '5px 12px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease',
          }}
        >
          <span>📜</span>
          <span>Tiệm Thư Sáp Niêm Phong</span>
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Hero Banner / Banner Chủ Đề thống nhất Gesture 60fps & Dual-Card Peek */}
      {selectedCategory ? (
        <CategoryHeroBanner
          topics={topics}
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
                onClick={() => handleCategorySelect('', 'prev')}
                className="hero-back-link"
              >
                <i className="fa-solid fa-arrow-left" style={{ marginRight: '6px' }}></i> Xem tất cả các câu chuyện khác
              </button>
            </div>
          }
        />
      ) : selectedTag ? (
        <CategoryHeroBanner
          topics={topics}
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
          topics={topics}
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
          topics={topics}
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
              YOU CAN'T <span>STOP HERE</span>
            </IdleWeatherText>
          }
          subtitle="Trút bỏ những áp lực deadline, kiệt sức và bất an nơi công sở. Bạn có thể chậm lại để nghỉ ngơi, nhưng đừng dừng lại. Chúng mình luôn ở đây cùng bạn!"
          actionsContent={homePrimaryCta}
          extraContent={homeExtraActions}
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

        {/* 📊 Bức Tường Tâm Trạng Cộng Đồng & Lối vào Trạm Xả Stress */}
        <CommunityMoodWall
          onOpenWellness={() => window.dispatchEvent(new Event('freedom_open_wellness'))}
        />

        {/* 🌳 Cây Hồi Sinh & Tái Tạo Năng Lượng Cộng Đồng (Live Tree of Resilience) */}
        <CommunityResilienceTree />

        {/* ⚡ Module Truyền Động Lực Tương Tác Thực Thụ: Giving Some Efforts (Tiếp Sức & 2 Nhịp Nhạc Studio WAV) */}
        <SectionErrorBoundary name="Giving Some Efforts">
          <GivingSomeEffortsSection />
        </SectionErrorBoundary>

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
