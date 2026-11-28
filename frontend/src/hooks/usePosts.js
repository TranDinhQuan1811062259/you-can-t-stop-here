import { useState, useEffect, useCallback, useRef } from 'react';
import {
  postService,
  getWarmCachedPosts,
  buildPostsCacheKey,
  invalidatePostsCache,
} from '../services/postService';

const COLD_START_HINT_DELAY_MS = 3000;

const extractPostsPayload = (res, limit) => {
  const raw = res?.data?.posts || res?.data || [];
  const list = Array.isArray(raw) ? raw : [];
  return {
    list,
    paginatedList: list.slice(0, limit),
    pagination: res?.pagination || null,
  };
};

export const usePosts = (queryParams = {}) => {
  const limit = Math.max(1, parseInt(queryParams.limit, 10) || 6);
  const page = Math.max(1, parseInt(queryParams.page, 10) || 1);

  const mergedParams = {
    category: queryParams.category || '',
    tag: queryParams.tag || '',
    q: queryParams.q || '',
    sort: queryParams.sort || 'newest',
    visibility: queryParams.visibility || 'all',
    postType:
      queryParams.postType && queryParams.postType !== 'all'
        ? queryParams.postType
        : '',
    page,
    limit,
  };

  const currentQueryKey = buildPostsCacheKey(mergedParams);

  // Đọc đồng bộ từ Predictive Warm-Cache trong RAM (0ms nếu đã được prefetch trong phiên)
  const warmHit = getWarmCachedPosts(mergedParams);
  const activeWarmPayload = warmHit ? extractPostsPayload(warmHit, limit) : null;
  const hasWarmHit = Boolean(activeWarmPayload);

  const [posts, setPosts] = useState(() => (activeWarmPayload ? activeWarmPayload.paginatedList : []));
  const [pagination, setPagination] = useState(() => (activeWarmPayload ? activeWarmPayload.pagination : null));
  const [settledQueryKey, setSettledQueryKey] = useState(() => (activeWarmPayload ? currentQueryKey : ''));
  const [loading, setLoading] = useState(() => !hasWarmHit);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [error, setError] = useState(null);

  const latestQueryKeyRef = useRef(currentQueryKey);
  latestQueryKeyRef.current = currentQueryKey;

  const fetchPosts = useCallback(
    (options = {}) => {
      let isSubscribed = true;
      const force = Boolean(options?.force);
      const requestKey = currentQueryKey;
      const reqParams = {
        category: queryParams.category || '',
        tag: queryParams.tag || '',
        q: queryParams.q || '',
        sort: queryParams.sort || 'newest',
        visibility: queryParams.visibility || 'all',
        postType:
          queryParams.postType && queryParams.postType !== 'all'
            ? queryParams.postType
            : '',
        page,
        limit,
      };

      if (!force) {
        const warmEntry = getWarmCachedPosts(reqParams);
        if (warmEntry) {
          const parsed = extractPostsPayload(warmEntry, limit);
          setPosts(parsed.paginatedList);
          setPagination(parsed.pagination);
          setSettledQueryKey(requestKey);
          setError(null);
          setLoading(false);
          setIsSlowLoading(false);
          return () => {
            isSubscribed = false;
          };
        }
      }

      setLoading(true);
      setError(null);
      setIsSlowLoading(false);

      postService
        .getPosts(reqParams, { force })
        .then((res) => {
          if (!isSubscribed || latestQueryKeyRef.current !== requestKey) return;
          const parsed = extractPostsPayload(res, limit);
          setPosts(parsed.paginatedList);
          setPagination(parsed.pagination);
          setSettledQueryKey(requestKey);
          setError(null);
        })
        .catch((err) => {
          if (!isSubscribed || latestQueryKeyRef.current !== requestKey) return;
          setPosts([]);
          setPagination(null);
          setSettledQueryKey(requestKey);
          setError(err?.message || 'Không thể tải dữ liệu bài viết từ máy chủ. Vui lòng thử lại.');
        })
        .finally(() => {
          if (isSubscribed && latestQueryKeyRef.current === requestKey) {
            setLoading(false);
            setIsSlowLoading(false);
          }
        });

      return () => {
        isSubscribed = false;
      };
    },
    [
      currentQueryKey,
      page,
      limit,
      queryParams.category,
      queryParams.tag,
      queryParams.q,
      queryParams.sort,
      queryParams.visibility,
      queryParams.postType,
    ]
  );

  // Theo dõi ngưỡng chờ > 3 giây để hiển thị thông báo đánh thức máy chủ Render Cold Start
  useEffect(() => {
    const activeLoading = !hasWarmHit && (loading || currentQueryKey !== settledQueryKey);
    if (!activeLoading) {
      setIsSlowLoading(false);
      return undefined;
    }
    const slowTimer = setTimeout(() => {
      setIsSlowLoading(true);
    }, COLD_START_HINT_DELAY_MS);
    return () => clearTimeout(slowTimer);
  }, [hasWarmHit, loading, currentQueryKey, settledQueryKey]);

  useEffect(() => {
    const cleanup = fetchPosts();

    const handleDataRefresh = () => {
      invalidatePostsCache();
      fetchPosts({ force: true });
    };

    window.addEventListener('profile_updated', handleDataRefresh);
    window.addEventListener('post_updated', handleDataRefresh);
    window.addEventListener('freedom_auth_changed', handleDataRefresh);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('profile_updated', handleDataRefresh);
      window.removeEventListener('post_updated', handleDataRefresh);
      window.removeEventListener('freedom_auth_changed', handleDataRefresh);
    };
  }, [fetchPosts]);

  // Nếu đã có Predictive Warm-Cache cho query mới: render 0ms, tuyệt đối không nháy skeleton
  const isSwitching = !activeWarmPayload && currentQueryKey !== settledQueryKey;

  return {
    posts: activeWarmPayload ? activeWarmPayload.paginatedList : (isSwitching ? [] : posts),
    pagination: activeWarmPayload ? activeWarmPayload.pagination : (isSwitching ? null : pagination),
    loading: activeWarmPayload ? false : (loading || isSwitching),
    isSwitching,
    isSlowLoading: activeWarmPayload ? false : isSlowLoading,
    error: activeWarmPayload ? null : (isSwitching ? null : error),
    refetch: () => fetchPosts({ force: true }),
  };
};
