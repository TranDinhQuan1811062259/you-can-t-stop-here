/**
 * Chat SSE Client (Fetch + ReadableStream + AbortController)
 * - Gửi Authorization: Bearer <token> an toàn qua header (không truyền token lên query URL)
 * - Tự động kết nối lại theo Exponential Backoff tối đa 30s
 * - Tạm dừng khi tab ẩn (document.hidden) và tự nối lại + đồng bộ khi tab mở lại / online trở lại
 */

import apiClient from '../services/apiClient';

const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

const getApiBaseUrl = () =>
  String(import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

const getStoredToken = () => {
  try {
    const t = localStorage.getItem('token') || localStorage.getItem('freedom_token') || '';
    const trimmed = t.trim();
    if (!trimmed || ['null', 'undefined', 'false'].includes(trimmed)) return '';
    return trimmed;
  } catch (_) {
    return '';
  }
};

const trySilentRefreshToken = async (baseUrl, signal) => {
  try {
    const refreshToken =
      localStorage.getItem('refreshToken') || localStorage.getItem('freedom_refresh_token');
    if (!refreshToken || ['null', 'undefined', 'false'].includes(refreshToken.trim())) {
      return null;
    }

    const res = await fetch(`${baseUrl}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal,
      cache: 'no-store',
    });
    if (!res.ok) return null;

    const json = await res.json();
    const payload = json?.data || json || {};
    const newAccessToken = payload?.token;
    const newRefreshToken = payload?.refreshToken;
    if (!newAccessToken) return null;

    localStorage.setItem('token', newAccessToken);
    localStorage.setItem('freedom_token', newAccessToken);
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('freedom_refresh_token', newRefreshToken);
    }
    if (apiClient?.defaults?.headers?.common) {
      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
    }
    return newAccessToken;
  } catch (_) {
    return null;
  }
};

const parseSseBlock = (block) => {
  const lines = block.split('\n');
  let eventName = 'message';
  const dataLines = [];

  for (const rawLine of lines) {
    if (!rawLine || rawLine.startsWith(':')) continue;
    const colonIdx = rawLine.indexOf(':');
    const field = colonIdx === -1 ? rawLine : rawLine.slice(0, colonIdx);
    let value = colonIdx === -1 ? '' : rawLine.slice(colonIdx + 1);
    if (value.startsWith(' ')) value = value.slice(1);

    if (field === 'event') {
      eventName = value.trim() || 'message';
    } else if (field === 'data') {
      dataLines.push(value);
    }
  }

  if (dataLines.length === 0) return null;
  const rawData = dataLines.join('\n');
  try {
    return { eventName, data: JSON.parse(rawData) };
  } catch (_) {
    return { eventName, data: { raw: rawData } };
  }
};

export const createChatSseClient = ({ onEvent, onStatusChange, onReconnect } = {}) => {
  let stopped = false;
  let retryCount = 0;
  let retryTimer = null;
  let activeAbortController = null;
  let activeReader = null;
  let hasConnectedOnce = false;
  let isConnectingOrOpen = false;
  let lastRefreshAttemptAt = 0;

  let triggerConnect = () => {};
  let detachListeners = () => {};

  const updateStatus = (nextStatus) => {
    if (stopped) return;
    if (typeof onStatusChange === 'function') {
      onStatusChange(nextStatus);
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const abortActiveStream = () => {
    if (activeAbortController) {
      try {
        activeAbortController.abort();
      } catch (_) {}
      activeAbortController = null;
    }
    if (activeReader) {
      try {
        activeReader.cancel().catch(() => {});
      } catch (_) {}
      activeReader = null;
    }
    isConnectingOrOpen = false;
  };

  const scheduleReconnect = () => {
    if (stopped) return;
    clearRetryTimer();

    if (typeof document !== 'undefined' && document.hidden) {
      updateStatus('reconnecting');
      return;
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      updateStatus('fallback');
      return;
    }

    const expDelay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, retryCount));
    const jitter = Math.floor(Math.random() * 450);
    retryCount = Math.min(retryCount + 1, 6);

    updateStatus(hasConnectedOnce ? 'reconnecting' : 'connecting');
    retryTimer = setTimeout(() => {
      retryTimer = null;
      triggerConnect();
    }, expDelay + jitter);
  };

  const connect = async () => {
    if (stopped || isConnectingOrOpen) return;
    if (typeof document !== 'undefined' && document.hidden) {
      updateStatus('reconnecting');
      return;
    }

    let token = getStoredToken();
    if (!token) {
      updateStatus('disconnected');
      return;
    }

    clearRetryTimer();
    abortActiveStream();
    isConnectingOrOpen = true;
    updateStatus(hasConnectedOnce ? 'reconnecting' : 'connecting');

    const controller = new AbortController();
    activeAbortController = controller;
    const baseUrl = getApiBaseUrl();

    try {
      let response = await fetch(`${baseUrl}/chat/stream`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'text/event-stream',
        },
        signal: controller.signal,
        cache: 'no-store',
      });

      if (response.status === 401 && !stopped && Date.now() - lastRefreshAttemptAt > 10000) {
        lastRefreshAttemptAt = Date.now();
        const refreshed = await trySilentRefreshToken(baseUrl, controller.signal);
        if (refreshed && !stopped) {
          token = refreshed;
          response = await fetch(`${baseUrl}/chat/stream`, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'text/event-stream',
            },
            signal: controller.signal,
            cache: 'no-store',
          });
        }
      }

      if (!response.ok || !response.body) {
        if (response.status === 401 || response.status === 403) {
          isConnectingOrOpen = false;
          updateStatus('fallback');
          return;
        }
        throw new Error(`SSE HTTP ${response.status}`);
      }

      const wasReconnect = hasConnectedOnce;
      hasConnectedOnce = true;
      retryCount = 0;
      updateStatus('connected');
      if (wasReconnect && typeof onReconnect === 'function') {
        onReconnect();
      }

      const reader = response.body.getReader();
      activeReader = reader;
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;

        let chunk = decoder.decode(value, { stream: true });
        if (buffer.endsWith('\r') && chunk.startsWith('\n')) {
          buffer = buffer.slice(0, -1);
        }
        chunk = chunk.replace(/\r\n/g, '\n');
        // Giữ lại \r đơn lẻ ở cuối chunk phòng trường hợp \r\n bị tách đôi qua 2 packet TCP
        const trailingCr = chunk.endsWith('\r');
        buffer += (trailingCr ? chunk.slice(0, -1) : chunk).replace(/\r/g, '\n') + (trailingCr ? '\r' : '');

        let boundaryIdx = buffer.indexOf('\n\n');
        while (boundaryIdx !== -1) {
          const rawBlock = buffer.slice(0, boundaryIdx);
          buffer = buffer.slice(boundaryIdx + 2);

          const parsed = parseSseBlock(rawBlock);
          if (parsed) {
            if (parsed.eventName === 'replaced') {
              // Tab mới hơn vừa chiếm slot kết nối tối đa -> chuyển về fallback tĩnh để tránh vòng lặp đá kết nối giữa các tab
              stopped = true;
              abortActiveStream();
              detachListeners();
              if (typeof onStatusChange === 'function') onStatusChange('fallback');
              return;
            }
            if (typeof onEvent === 'function') {
              onEvent(parsed.eventName, parsed.data);
            }
          }

          boundaryIdx = buffer.indexOf('\n\n');
        }
      }

      // Stream bị đóng từ phía server hoặc proxy -> kết nối lại theo backoff
      isConnectingOrOpen = false;
      activeReader = null;
      if (!stopped) {
        scheduleReconnect();
      }
    } catch (err) {
      isConnectingOrOpen = false;
      activeReader = null;
      if (stopped || err?.name === 'AbortError') return;
      scheduleReconnect();
    }
  };

  triggerConnect = connect;

  const handleVisibilityChange = () => {
    if (stopped) return;
    if (document.hidden) {
      clearRetryTimer();
      abortActiveStream();
      updateStatus('reconnecting');
    } else {
      retryCount = 0;
      if (!isConnectingOrOpen) {
        connect();
      }
    }
  };

  const handleOnline = () => {
    if (stopped || (typeof document !== 'undefined' && document.hidden)) return;
    retryCount = 0;
    clearRetryTimer();
    if (!isConnectingOrOpen) {
      connect();
    }
  };

  detachListeners = () => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', handleOnline);
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
  }

  connect();

  return {
    stop: () => {
      stopped = true;
      clearRetryTimer();
      abortActiveStream();
      detachListeners();
      if (typeof onStatusChange === 'function') {
        onStatusChange('disconnected');
      }
    },
  };
};
