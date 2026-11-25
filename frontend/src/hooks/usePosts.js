import { useState, useEffect, useCallback, useRef } from 'react';
import {
  postService,
  getWarmCachedPosts,
  buildPostsCacheKey,
  invalidatePostsCache,
} from '../services/postService';

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
  const limit = Math.max(1, parseInt(queryParams.limit) || 6);
  const page = Math.max(1, parseInt(queryParams.page) || 1);

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
  const isDefaultHomeFeed =
    !mergedParams.category &&
    !mergedParams.tag &&
    !mergedParams.q &&
    !mergedParams.postType &&
    mergedParams.visibility === 'all' &&
    mergedParams.sort === 'newest' &&
    page === 1;

  // Đọc đồng bộ từ Predictive Warm-Cache (0ms nếu đã được prefetch khi kéo banner hoặc hover header pill)
  const warmHit = getWarmCachedPosts(mergedParams);
  const activeWarmPayload = warmHit ? extractPostsPayload(warmHit, limit) : null;

  const [posts, setPosts] = useState(() => {
    if (activeWarmPayload) return activeWarmPayload.paginatedList;
    if (!isDefaultHomeFeed) return [];
    try {
      const cached = localStorage.getItem('freedom_cached_posts');
      const list = cached ? JSON.parse(cached) : [];
      return Array.isArray(list) ? list.slice(0, limit) : [];
    } catch (e) {
      return [];
    }
  });
  const [pagination, setPagination] = useState(() =>
    activeWarmPayload ? activeWarmPayload.pagination : null
  );
  const [settledQueryKey, setSettledQueryKey] = useState(() => {
    if (activeWarmPayload) return currentQueryKey;
    return isDefaultHomeFeed && posts.length > 0 ? currentQueryKey : '';
  });
  const [loading, setLoading] = useState(() => {
    if (activeWarmPayload) return false;
    return !(isDefaultHomeFeed && posts.length > 0);
  });
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
          return () => {
            isSubscribed = false;
          };
        }
      }

      setLoading(true);

      postService
        .getPosts(reqParams, { force })
        .then((res) => {
          if (!isSubscribed || latestQueryKeyRef.current !== requestKey) return;
          const parsed = extractPostsPayload(res, limit);
          setPosts(parsed.paginatedList);
          setPagination(parsed.pagination);
          setSettledQueryKey(requestKey);
          setError(null);
          try {
            if (parsed.list.length > 0 && !reqParams.q && !reqParams.category && !reqParams.tag) {
              localStorage.setItem('freedom_cached_posts', JSON.stringify(parsed.list));
            }
          } catch (e) {}
        })
        .catch((err) => {
          if (!isSubscribed || latestQueryKeyRef.current !== requestKey) return;
          // Nếu đã có bài viết trong cache khi mất mạng, lọc lại an toàn theo tham số hiện hành
          try {
            const cached = localStorage.getItem('freedom_cached_posts');
            if (cached && !reqParams.category && !reqParams.tag && !reqParams.q) {
              const list = JSON.parse(cached);
              if (Array.isArray(list) && list.length > 0) {
                const total = list.length;
                const totalPages = Math.ceil(total / limit) || 1;
                const sliced = list.slice((page - 1) * limit, page * limit);
                setPosts(sliced);
                setPagination({
                  total,
                  totalPages,
                  page,
                  limit,
                  hasPrevPage: page > 1,
                  hasNextPage: page < totalPages,
                });
                setSettledQueryKey(requestKey);
                setError(null);
                return;
              }
            }
          } catch (e) {}

          setPosts([]);
          setPagination(null);
          setSettledQueryKey(requestKey);
          setError(err.message || 'Lỗi khi tải dữ liệu bài viết');
        })
        .finally(() => {
          if (isSubscribed && latestQueryKeyRef.current === requestKey) {
            setLoading(false);
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
    error: activeWarmPayload ? null : (isSwitching ? null : error),
    refetch: () => fetchPosts({ force: true }),
  };
};
