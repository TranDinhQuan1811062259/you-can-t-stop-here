import { useState, useEffect, useCallback } from 'react';
import { postService } from '../services/postService';

export const usePosts = (queryParams = {}) => {
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(() => {
    let isSubscribed = true;
    setLoading(true);

    postService
      .getPosts(queryParams)
      .then((res) => {
        if (isSubscribed) {
          setPosts(res.data || []);
          setPagination(res.pagination || null);
          setError(null);
        }
      })
      .catch((err) => {
        if (isSubscribed) {
          setError(err.message || 'Lỗi khi tải dữ liệu bài viết');
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
