import { useState, useEffect, useCallback } from 'react';
import { postService } from '../services/postService';

export const usePosts = (queryParams = {}) => {
  const limit = Math.max(1, parseInt(queryParams.limit) || 6);
  const page = Math.max(1, parseInt(queryParams.page) || 1);

  const [posts, setPosts] = useState(() => {
    try {
      const cached = localStorage.getItem('freedom_cached_posts');
      const list = cached ? JSON.parse(cached) : [];
      return Array.isArray(list) ? list.slice(0, 6) : [];
    } catch (e) {
      return [];
    }
  });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(() => posts.length === 0);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(() => {
    let isSubscribed = true;
    if (posts.length === 0) setLoading(true);

    const mergedParams = { limit: 6, ...queryParams };

    postService
      .getPosts(mergedParams)
      .then((res) => {
        if (isSubscribed) {
          const raw = res.data?.posts || res.data || [];
          const list = Array.isArray(raw) ? raw : [];
          // Đảm bảo tối đa 6 bài viết mỗi trang
          const paginatedList = list.slice(0, limit);
          setPosts(paginatedList);
          setPagination(res.pagination || null);
          setError(null);
          try {
            if (list.length > 0 && !queryParams.q && !queryParams.category && !queryParams.tag) {
              localStorage.setItem('freedom_cached_posts', JSON.stringify(list));
            }
          } catch (e) {}
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          // Nếu đã có bài viết trong cache hoặc state, tiếp tục hiển thị và triệt tiêu lỗi mạng gây khó chịu
          try {
            const cached = localStorage.getItem('freedom_cached_posts');
            if (cached) {
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
                setError(null);
                return;
              }
            }
          } catch (e) {}

          // Chỉ gán lỗi khi thực sự không có bài viết nào để xem
          setPosts((currentPosts) => {
            if (!currentPosts || currentPosts.length === 0) {
              setError(err.message || 'Lỗi khi tải dữ liệu bài viết');
            } else {
              setError(null);
            }
            return currentPosts;
          });
        }
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [
    queryParams.page,
    queryParams.limit,
    queryParams.category,
    queryParams.tag,
    queryParams.q,
    queryParams.sort,
    queryParams.visibility,
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

  return { posts, pagination, loading, error, refetch: fetchPosts };
};
