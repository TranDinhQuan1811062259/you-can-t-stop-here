import { useState, useEffect, useCallback, useRef } from 'react';
import { postService } from '../services/postService';

const buildQueryKey = (params = {}, page = 1, limit = 6) =>
  JSON.stringify({
    category: params.category || '',
    tag: params.tag || '',
    q: params.q || '',
    sort: params.sort || 'newest',
    visibility: params.visibility || 'all',
    postType: params.postType || '',
    page,
    limit,
  });

export const usePosts = (queryParams = {}) => {
  const limit = Math.max(1, parseInt(queryParams.limit) || 6);
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const currentQueryKey = buildQueryKey(queryParams, page, limit);
  const isDefaultHomeFeed =
    !queryParams.category &&
    !queryParams.tag &&
    !queryParams.q &&
    !queryParams.postType &&
    (!queryParams.visibility || queryParams.visibility === 'all') &&
    (!queryParams.sort || queryParams.sort === 'newest') &&
    page === 1;

  const [posts, setPosts] = useState(() => {
    if (!isDefaultHomeFeed) return [];
    try {
      const cached = localStorage.getItem('freedom_cached_posts');
      const list = cached ? JSON.parse(cached) : [];
      return Array.isArray(list) ? list.slice(0, limit) : [];
    } catch (e) {
      return [];
    }
  });
  const [pagination, setPagination] = useState(null);
  const [settledQueryKey, setSettledQueryKey] = useState(() =>
    isDefaultHomeFeed && posts.length > 0 ? currentQueryKey : ''
  );
  const [loading, setLoading] = useState(() => !(isDefaultHomeFeed && posts.length > 0));
  const [error, setError] = useState(null);

  const latestQueryKeyRef = useRef(currentQueryKey);
  latestQueryKeyRef.current = currentQueryKey;

  const fetchPosts = useCallback(() => {
    let isSubscribed = true;
    const requestKey = currentQueryKey;
    setLoading(true);

    const mergedParams = { limit: 6, ...queryParams, page, limit };

    postService
      .getPosts(mergedParams)
      .then((res) => {
        if (!isSubscribed || latestQueryKeyRef.current !== requestKey) return;
        const raw = res.data?.posts || res.data || [];
        const list = Array.isArray(raw) ? raw : [];
        // Đảm bảo tối đa 6 bài viết mỗi trang
        const paginatedList = list.slice(0, limit);
        setPosts(paginatedList);
        setPagination(res.pagination || null);
        setSettledQueryKey(requestKey);
        setError(null);
        try {
          if (list.length > 0 && !queryParams.q && !queryParams.category && !queryParams.tag) {
            localStorage.setItem('freedom_cached_posts', JSON.stringify(list));
          }
        } catch (e) {}
      })
      .catch((err) => {
        if (!isSubscribed || latestQueryKeyRef.current !== requestKey) return;
        // Nếu đã có bài viết trong cache khi mất mạng, lọc lại an toàn theo tham số hiện hành
        try {
          const cached = localStorage.getItem('freedom_cached_posts');
          if (cached && !queryParams.category && !queryParams.tag && !queryParams.q) {
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
  }, [
    currentQueryKey,
    page,
    limit,
    queryParams.category,
    queryParams.tag,
    queryParams.q,
    queryParams.sort,
    queryParams.visibility,
    queryParams.postType,
  ]);

  useEffect(() => {
    const cleanup = fetchPosts();

    const handleDataRefresh = () => {
      fetchPosts();
    };

    window.addEventListener('profile_updated', handleDataRefresh);
    window.addEventListener('post_updated', handleDataRefresh);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener('profile_updated', handleDataRefresh);
      window.removeEventListener('post_updated', handleDataRefresh);
    };
  }, [fetchPosts]);

  // Đồng bộ tức thì: nếu queryKey vừa đổi sang chủ đề mới mà response chưa về, isSwitching = true ngay tại frame đầu
  const isSwitching = currentQueryKey !== settledQueryKey;

  return {
    posts: isSwitching ? [] : posts,
    pagination: isSwitching ? null : pagination,
    loading: loading || isSwitching,
    isSwitching,
    error: isSwitching ? null : error,
    refetch: fetchPosts,
  };
};
