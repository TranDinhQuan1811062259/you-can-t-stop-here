import apiClient from './apiClient';

export const musicService = {
  // Trích xuất metadata bài hát (title, artist, thumbnail, provider)
  getMetadata: (url) => apiClient.get(`/music/metadata?url=${encodeURIComponent(url)}`),
};

