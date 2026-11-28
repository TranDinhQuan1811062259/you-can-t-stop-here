import React from 'react';

export const ErrorMessage = ({ message, onRetry, retryLabel = 'Thử lại' }) => {
  if (!message) return null;

  if (typeof onRetry === 'function') {
    return (
      <div className="posts-fetch-error-card" role="alert">
        <div className="posts-state-icon" aria-hidden="true">
          📡
        </div>
        <h3 className="posts-state-title">Không thể tải dữ liệu từ máy chủ</h3>
        <p className="posts-state-desc">{message}</p>
        <div className="posts-state-actions">
          <button type="button" className="posts-state-btn posts-state-btn-primary" onClick={onRetry}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true"></i>
            <span>{retryLabel}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="error-banner" role="alert">
      <strong>Lỗi: </strong> {message}
    </div>
  );
};
