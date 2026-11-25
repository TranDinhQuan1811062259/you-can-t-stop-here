import { useState, useEffect, useMemo } from 'react';
import { categoryService } from '../services/categoryService';

const CATEGORIES_CACHE_KEY = 'freedom_cached_categories_v2';
const LEGACY_CATEGORIES_CACHE_KEY = 'freedom_cached_categories_v1';

// Các chủ đề ngoài lề được thêm thừa trước đây cần loại bỏ triệt để khỏi điều hướng & dải dot
const EXTRANEOUS_CATEGORY_SLUGS = new Set([
  'thoi-su-tinh-hinh-the-gioi',
  'chien-su-xung-dot-hoa-binh',
  'goc-nhin-xa-hoi',
  'tam-su-doi-song-thuong-nhat',
]);

export const HOME_TOPIC = {
  _id: '__home__',
  path: '/',
  slug: '',
  name: 'Trang Chủ',
  shortLabel: 'Trang Chủ',
  icon: '🏠',
  faIcon: 'fa-solid fa-house',
  tabClass: 'tab-home',
  colorClass: 'healing-icon-sage',
  accentColor: '#34d399',
  description:
    'Trút bỏ những áp lực deadline, kiệt sức và bất an nơi công sở. Bạn có thể chậm lại để nghỉ ngơi, nhưng đừng dừng lại.',
};

// Danh sách 4 chuyên mục chính thức gốc đồng bộ 100% với Seed & Header/Banner
export const CORE_CATEGORIES_FALLBACK = [
  {
    _id: 'cat_1',
    name: 'Áp lực & Kiệt sức (Burnout)',
    shortLabel: 'Burnout',
    slug: 'ap-luc-kiet-suc-burnout',
    description: 'OT, deadline và những ngày cạn kiệt năng lượng',
    icon: '😫',
    faIcon: 'fa-solid fa-heart-pulse',
    tabClass: 'tab-burnout',
    colorClass: 'healing-icon-rose',
    accentColor: '#fb7185',
  },
  {
    _id: 'cat_2',
    name: 'Khủng hoảng nghề nghiệp (Career Crisis)',
    shortLabel: 'Khủng Hoảng',
    slug: 'khung-hoang-nghe-nghiep-career-crisis',
    description: 'Chênh vênh giữa tiếp tục cố gắng hay tìm lối rẽ mới',
    icon: '🧭',
    faIcon: 'fa-solid fa-compass',
    tabClass: 'tab-amber',
    colorClass: 'healing-icon-amber',
    accentColor: '#f59e0b',
  },
  {
    _id: 'cat_3',
    name: 'Chuyển ngành & Bắt đầu lại (Restart)',
    shortLabel: 'Bắt Đầu Lại',
    slug: 'chuyen-nganh-bat-dau-lai-restart',
    description: 'Can đảm bước khỏi vùng an toàn và làm lại từ con số 0',
    icon: '🌱',
    faIcon: 'fa-solid fa-seedling',
    tabClass: 'tab-restart',
    colorClass: 'healing-icon-sage',
    accentColor: '#34d399',
  },
  {
    _id: 'cat_4',
    name: 'Những tia sáng & Động lực (Small Wins)',
    shortLabel: 'Small Wins',
    slug: 'nhung-tia-sang-dong-luc-small-wins',
    description: 'Những thành tựu nhỏ bé nuôi dưỡng niềm tin và hy vọng',
    icon: '✨',
    faIcon: 'fa-solid fa-sun',
    tabClass: 'tab-wins',
    colorClass: 'healing-icon-amber',
    accentColor: '#fbbf24',
  },
];

const CORE_META_BY_SLUG = new Map(CORE_CATEGORIES_FALLBACK.map((c) => [c.slug, c]));

export const MUSIC_TOPIC = {
  _id: '__music__',
  path: '/music',
  slug: '__music__',
  name: 'Góc Nhạc',
  shortLabel: 'Góc Nhạc',
  icon: '🎧',
  faIcon: 'fa-solid fa-compact-disc',
  tabClass: 'tab-music',
  colorClass: 'healing-icon-cyan',
  accentColor: '#38bdf8',
  isExternalSection: true,
  description: 'Không gian nhạc chữa lành & playlist đa chủ đề giúp bạn thả lỏng tâm trí',
};

export const CORE_TOPICS = [
  HOME_TOPIC,
  ...CORE_CATEGORIES_FALLBACK.map((c) => ({
    ...c,
    path: `/category/${c.slug}`,
  })),
];

export const CAROUSEL_TOPICS = [...CORE_TOPICS, MUSIC_TOPIC];

const normalizeSlugValue = (slug = '') => {
  const raw = String(slug || '').trim();
  if (!raw) return '';
  try {
    return decodeURIComponent(raw);
  } catch (_) {
    return raw;
  }
};

/**
 * Suy đoán icon, shortLabel và màu sắc thống nhất cho cả danh mục mặc định lẫn danh mục người dùng tự tạo
 */
export const enrichCategoryMeta = (rawCat) => {
  if (!rawCat || rawCat.slug === undefined || rawCat.slug === null) return null;
  const slug = normalizeSlugValue(rawCat.slug);
  if (slug === '' || rawCat._id === '__home__') return HOME_TOPIC;

  const core = CORE_META_BY_SLUG.get(slug);
  const name = rawCat.name || core?.name || slug.replace(/-/g, ' ');
  const lower = name.toLowerCase();

  if (core) {
    return {
      ...core,
      ...rawCat,
      slug,
      name,
      shortLabel: rawCat.shortLabel || core.shortLabel,
      icon: rawCat.icon || core.icon,
      faIcon: rawCat.faIcon || core.faIcon,
      tabClass: rawCat.tabClass || core.tabClass,
      colorClass: rawCat.colorClass || core.colorClass,
      accentColor: rawCat.accentColor || core.accentColor,
      description: rawCat.description || core.description,
      path: `/category/${slug}`,
    };
  }

  let faIcon = 'fa-solid fa-bookmark';
  let colorClass = 'healing-icon-sage';
  let tabClass = 'tab-restart';
  let accentColor = '#38bdf8';
  let fallbackEmoji = '🏷️';

  if (lower.includes('kiệt sức') || lower.includes('burnout') || lower.includes('áp lực')) {
    faIcon = 'fa-solid fa-heart-pulse';
    colorClass = 'healing-icon-rose';
    tabClass = 'tab-burnout';
    accentColor = '#fb7185';
    fallbackEmoji = '😫';
  } else if (lower.includes('khủng hoảng') || lower.includes('career')) {
    faIcon = 'fa-solid fa-compass';
    colorClass = 'healing-icon-amber';
    tabClass = 'tab-amber';
    accentColor = '#f59e0b';
    fallbackEmoji = '🧭';
  } else if (lower.includes('chuyển ngành') || lower.includes('restart') || lower.includes('bắt đầu lại')) {
    faIcon = 'fa-solid fa-seedling';
    colorClass = 'healing-icon-sage';
    tabClass = 'tab-restart';
    accentColor = '#34d399';
    fallbackEmoji = '🌱';
  } else if (lower.includes('động lực') || lower.includes('small wins') || lower.includes('tia sáng')) {
    faIcon = 'fa-solid fa-sun';
    colorClass = 'healing-icon-amber';
    tabClass = 'tab-wins';
    accentColor = '#fbbf24';
    fallbackEmoji = '✨';
  }

  // Rút gọn nhãn trên thanh Header Pill nếu tên quá dài
  const cleanShort = name.split('(')[0].trim();
  const shortLabel = cleanShort.length > 18 ? `${cleanShort.slice(0, 16).trim()}…` : cleanShort;

  return {
    ...rawCat,
    slug,
    name,
    shortLabel: rawCat.shortLabel || shortLabel,
    icon: rawCat.icon || fallbackEmoji,
    faIcon,
    colorClass,
    tabClass,
    accentColor,
    description: rawCat.description || 'Không gian chia sẻ và đồng cảm cùng cộng đồng',
    path: `/category/${slug}`,
  };
};

/**
 * Chuẩn hóa danh sách chủ đề, giữ thứ tự 4 chủ đề chính thức gốc và lọc bỏ các chủ đề ngoài ý muốn
 */
export const normalizeCategoryList = (rawList) => {
  const input = Array.isArray(rawList) && rawList.length > 0 ? rawList : CORE_CATEGORIES_FALLBACK;
  const bySlug = new Map();

  // Đảm bảo 4 danh mục chính thức gốc luôn hiện diện trước theo đúng thứ tự chuẩn
  CORE_CATEGORIES_FALLBACK.forEach((def) => {
    bySlug.set(def.slug, enrichCategoryMeta(def));
  });

  // Cập nhật thông tin hoặc bổ sung thêm các danh mục hợp lệ do người dùng tạo (bỏ qua 4 slug bị thêm thừa)
  input.forEach((item) => {
    const slug = normalizeSlugValue(item?.slug);
    if (!slug || EXTRANEOUS_CATEGORY_SLUGS.has(slug)) return;
    const enriched = enrichCategoryMeta({ ...item, slug });
    if (enriched) {
      bySlug.set(slug, enriched);
    }
  });

  return Array.from(bySlug.values());
};

const readCachedCategories = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return normalizeCategoryList(CORE_CATEGORIES_FALLBACK);
    }
    try {
      localStorage.removeItem(LEGACY_CATEGORIES_CACHE_KEY);
    } catch (_) {}
    const raw = localStorage.getItem(CATEGORIES_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeCategoryList(parsed);
      }
    }
  } catch (_) {}
  return normalizeCategoryList(CORE_CATEGORIES_FALLBACK);
};

let sharedCategoriesMemory = readCachedCategories();
let hasFetchedCategoriesOnce = false;
let inflightCategoriesPromise = null;

const persistSharedCategories = (list) => {
  sharedCategoriesMemory = list;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(list));
    }
  } catch (_) {}
};

/**
 * Hook dùng chung cho Header, HomePage, CategoryPage và PageTransitionWrapper
 * Cung cấp coreTopics (5 mục chính thức gốc) và danh sách categories đã chuẩn hóa
 */
export const useCategoryRegistry = () => {
  const [categories, setCategories] = useState(() => sharedCategoriesMemory);

  useEffect(() => {
    let mounted = true;

    const applyCategories = (nextRaw) => {
      const normalized = normalizeCategoryList(nextRaw);
      persistSharedCategories(normalized);
      if (!mounted) return;
      setCategories((prev) => {
        const prevSig = prev.map((c) => `${c.slug}:${c.name}:${c.icon}`).join('|');
        const nextSig = normalized.map((c) => `${c.slug}:${c.name}:${c.icon}`).join('|');
        return prevSig === nextSig ? prev : normalized;
      });
    };

    if (!hasFetchedCategoriesOnce) {
      if (!inflightCategoriesPromise) {
        inflightCategoriesPromise = categoryService
          .getCategories()
          .then((res) => {
            hasFetchedCategoriesOnce = true;
            return res?.data || [];
          })
          .catch(() => [])
          .finally(() => {
            inflightCategoriesPromise = null;
          });
      }

      inflightCategoriesPromise.then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          applyCategories(list);
        }
      });
    }

    const handleCategoryCreated = (e) => {
      const created = e?.detail?.category;
      const createdSlug = normalizeSlugValue(created?.slug);
      if (!createdSlug || EXTRANEOUS_CATEGORY_SLUGS.has(createdSlug)) return;
      const updated = normalizeCategoryList([...sharedCategoriesMemory, { ...created, slug: createdSlug }]);
      persistSharedCategories(updated);
      if (mounted) {
        setCategories(updated);
      }
    };

    window.addEventListener('freedom_category_created', handleCategoryCreated);
    return () => {
      mounted = false;
      window.removeEventListener('freedom_category_created', handleCategoryCreated);
    };
  }, []);

  const topics = useMemo(() => CORE_TOPICS, []);
  const carouselTopics = useMemo(() => CAROUSEL_TOPICS, []);

  const appendCategory = (created) => {
    const createdSlug = normalizeSlugValue(created?.slug);
    if (!createdSlug || EXTRANEOUS_CATEGORY_SLUGS.has(createdSlug)) return;
    const updated = normalizeCategoryList([...sharedCategoriesMemory, { ...created, slug: createdSlug }]);
    persistSharedCategories(updated);
    setCategories(updated);
  };

  return { categories, coreTopics: CORE_TOPICS, carouselTopics, topics, appendCategory };
};

/**
 * Tìm chủ đề hiện tại, chủ đề trước và chủ đề tiếp theo theo đúng 1 bước duy nhất
 */
export const getAdjacentTopics = (topics = [], activeSlug = '') => {
  const safeTopics = Array.isArray(topics) && topics.length > 0 ? topics : CORE_TOPICS;
  const normalizedSlug = normalizeSlugValue(activeSlug);
  const currentIndex = safeTopics.findIndex(
    (t) => t.slug === normalizedSlug || t._id === normalizedSlug
  );

  if (currentIndex === -1) {
    const dynamicFallback = enrichCategoryMeta({ slug: normalizedSlug });
    return {
      currentIndex: -1,
      currentTopic: dynamicFallback || HOME_TOPIC,
      prevTopic: HOME_TOPIC,
      nextTopic: safeTopics[1] || null,
    };
  }

  return {
    currentIndex,
    currentTopic: safeTopics[currentIndex],
    prevTopic: currentIndex > 0 ? safeTopics[currentIndex - 1] : null,
    nextTopic: currentIndex < safeTopics.length - 1 ? safeTopics[currentIndex + 1] : null,
  };
};

// =============================================================================
// ĐỒNG BỘ HƯỚNG CHUYỂN TRANG VẬT LÝ (SYNCHRONOUS SPATIAL TRANSITION STATE)
// =============================================================================
let pendingBannerTransition = {
  direction: null,
  targetSlug: '',
  timestamp: 0,
};

export const setPendingBannerTransition = (direction, targetSlug = '') => {
  pendingBannerTransition = {
    direction: direction === 'prev' || direction === 'next' ? direction : null,
    targetSlug: normalizeSlugValue(targetSlug),
    timestamp: Date.now(),
  };

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('freedom_topic_switching', {
        detail: {
          direction: pendingBannerTransition.direction,
          targetSlug: pendingBannerTransition.targetSlug,
        },
      })
    );
  }
};

export const peekPendingBannerTransition = (currentSlug = '') => {
  const normalized = normalizeSlugValue(currentSlug);
  if (
    pendingBannerTransition.direction &&
    pendingBannerTransition.targetSlug === normalized &&
    Date.now() - pendingBannerTransition.timestamp < 2500
  ) {
    return pendingBannerTransition.direction;
  }
  return null;
};

export const clearPendingBannerTransition = (targetSlug) => {
  if (
    targetSlug === undefined ||
    pendingBannerTransition.targetSlug === normalizeSlugValue(targetSlug)
  ) {
    pendingBannerTransition = { direction: null, targetSlug: '', timestamp: 0 };
  }
};
