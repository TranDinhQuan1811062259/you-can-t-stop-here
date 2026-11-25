import { useState, useEffect, useMemo } from 'react';
import { categoryService } from '../services/categoryService';

const CATEGORIES_CACHE_KEY = 'freedom_cached_categories_v1';

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

// Thứ tự chuyên mục gốc đồng bộ 100% với Backend persistentStore & Header Category Pills
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
  {
    _id: 'cat_5',
    name: 'Thời Sự & Tình Hình Thế Giới (Global Affairs)',
    shortLabel: 'Thời Sự',
    slug: 'thoi-su-tinh-hinh-the-gioi',
    description: 'Điểm tin thời cuộc, diễn biến quốc tế & góc nhìn toàn cầu',
    icon: '🌍',
    faIcon: 'fa-solid fa-earth-americas',
    tabClass: 'tab-global',
    colorClass: 'healing-icon-sage',
    accentColor: '#38bdf8',
  },
  {
    _id: 'cat_6',
    name: 'Chiến Sự, Xung Đột & Hòa Bình (Conflict & Peace)',
    shortLabel: 'Hòa Bình',
    slug: 'chien-su-xung-dot-hoa-binh',
    description: 'Bình luận thời cuộc, góc nhìn nhân đạo & khát vọng hòa bình',
    icon: '🕊️',
    faIcon: 'fa-solid fa-dove',
    tabClass: 'tab-global',
    colorClass: 'healing-icon-sage',
    accentColor: '#60a5fa',
  },
  {
    _id: 'cat_7',
    name: 'Góc Nhìn & Xã Hội (Perspective & Society)',
    shortLabel: 'Góc Nhìn',
    slug: 'goc-nhin-xa-hoi',
    description: 'Quan điểm đa chiều về thời cuộc và đời sống xã hội',
    icon: '🌐',
    faIcon: 'fa-solid fa-globe',
    tabClass: 'tab-restart',
    colorClass: 'healing-icon-sage',
    accentColor: '#a78bfa',
  },
  {
    _id: 'cat_8',
    name: 'Tâm Sự & Đời Sống Thường Nhật (Life Stories)',
    shortLabel: 'Đời Sống',
    slug: 'tam-su-doi-song-thuong-nhat',
    description: 'Những dòng tâm sự thật, trải lòng nhẹ nhàng không phán xét',
    icon: '☕',
    faIcon: 'fa-solid fa-mug-hot',
    tabClass: 'tab-wins',
    colorClass: 'healing-icon-amber',
    accentColor: '#fb923c',
  },
];

const CORE_META_BY_SLUG = new Map(CORE_CATEGORIES_FALLBACK.map((c) => [c.slug, c]));

/**
 * Suy đoán icon, shortLabel và màu sắc thống nhất cho cả danh mục mặc định lẫn danh mục người dùng tự tạo
 */
export const enrichCategoryMeta = (rawCat) => {
  if (!rawCat || !rawCat.slug) return null;
  if (rawCat.slug === '' || rawCat._id === '__home__') return HOME_TOPIC;

  const core = CORE_META_BY_SLUG.get(rawCat.slug);
  const name = rawCat.name || core?.name || rawCat.slug.replace(/-/g, ' ');
  const lower = name.toLowerCase();

  if (core) {
    return {
      ...core,
      ...rawCat,
      name,
      shortLabel: rawCat.shortLabel || core.shortLabel,
      icon: rawCat.icon || core.icon,
      faIcon: rawCat.faIcon || core.faIcon,
      tabClass: rawCat.tabClass || core.tabClass,
      colorClass: rawCat.colorClass || core.colorClass,
      accentColor: rawCat.accentColor || core.accentColor,
      description: rawCat.description || core.description,
      path: `/category/${rawCat.slug}`,
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
  } else if (lower.includes('thế giới') || lower.includes('quốc tế') || lower.includes('thời sự') || lower.includes('global')) {
    faIcon = 'fa-solid fa-earth-americas';
    colorClass = 'healing-icon-sage';
    tabClass = 'tab-global';
    accentColor = '#38bdf8';
    fallbackEmoji = '🌍';
  } else if (lower.includes('chiến sự') || lower.includes('hòa bình') || lower.includes('xung đột')) {
    faIcon = 'fa-solid fa-dove';
    colorClass = 'healing-icon-sage';
    tabClass = 'tab-global';
    accentColor = '#60a5fa';
    fallbackEmoji = '🕊️';
  } else if (lower.includes('tâm sự') || lower.includes('đời sống') || lower.includes('life')) {
    faIcon = 'fa-solid fa-mug-hot';
    colorClass = 'healing-icon-amber';
    tabClass = 'tab-wins';
    accentColor = '#fb923c';
    fallbackEmoji = '☕';
  }

  // Rút gọn nhãn trên thanh Header Pill nếu tên quá dài
  const cleanShort = name.split('(')[0].trim();
  const shortLabel = cleanShort.length > 18 ? `${cleanShort.slice(0, 16).trim()}…` : cleanShort;

  return {
    ...rawCat,
    name,
    shortLabel: rawCat.shortLabel || shortLabel,
    icon: rawCat.icon || fallbackEmoji,
    faIcon,
    colorClass,
    tabClass,
    accentColor,
    description: rawCat.description || 'Không gian chia sẻ và đồng cảm cùng cộng đồng',
    path: `/category/${rawCat.slug}`,
  };
};

/**
 * Chuẩn hóa danh sách chủ đề, giữ thứ tự nhất quán giữa Header, Banner & Pages
 */
export const normalizeCategoryList = (rawList) => {
  const input = Array.isArray(rawList) && rawList.length > 0 ? rawList : CORE_CATEGORIES_FALLBACK;
  const bySlug = new Map();

  // Đảm bảo danh mục cốt lõi luôn hiện diện trước theo đúng thứ tự chuẩn
  CORE_CATEGORIES_FALLBACK.forEach((def) => {
    bySlug.set(def.slug, enrichCategoryMeta(def));
  });

  // Cập nhật thông tin hoặc bổ sung thêm các danh mục do server/người dùng tạo
  input.forEach((item) => {
    if (!item || !item.slug) return;
    const enriched = enrichCategoryMeta(item);
    if (enriched) {
      bySlug.set(item.slug, enriched);
    }
  });

  return Array.from(bySlug.values());
};

const readCachedCategories = () => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return normalizeCategoryList(CORE_CATEGORIES_FALLBACK);
    }
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
 * Trả về danh sách chủ đề đồng bộ tức thì (0ms) và tự động đồng bộ từ API
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
      if (!created || !created.slug) return;
      const updated = normalizeCategoryList([...sharedCategoriesMemory, created]);
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

  const topics = useMemo(() => [HOME_TOPIC, ...categories], [categories]);

  const appendCategory = (created) => {
    if (!created || !created.slug) return;
    const updated = normalizeCategoryList([...sharedCategoriesMemory, created]);
    persistSharedCategories(updated);
    setCategories(updated);
  };

  return { categories, topics, appendCategory };
};

/**
 * Tìm chủ đề hiện tại, chủ đề trước và chủ đề tiếp theo theo đúng 1 bước duy nhất
 */
export const getAdjacentTopics = (topics = [], activeSlug = '') => {
  const safeTopics = Array.isArray(topics) && topics.length > 0 ? topics : [HOME_TOPIC, ...CORE_CATEGORIES_FALLBACK];
  const normalizedSlug = String(activeSlug || '');
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
    targetSlug: String(targetSlug || ''),
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
  const normalized = String(currentSlug || '');
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
  if (targetSlug === undefined || pendingBannerTransition.targetSlug === String(targetSlug || '')) {
    pendingBannerTransition = { direction: null, targetSlug: '', timestamp: 0 };
  }
};
