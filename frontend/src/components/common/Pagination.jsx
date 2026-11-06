import React from 'react';
import { playClickSound } from '../../utils/soundEffects';

export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination) return null;

  const { page, totalPages, total, limit, hasPrevPage, hasNextPage } = pagination;

  // Nếu chỉ có 1 trang và số bài viết ít, vẫn có thể hiển thị thanh thống kê gọn gàng
  if (totalPages <= 1 && (!total || total <= limit)) {
    return (
      <div className="pagination-info-only">
        <span>Hiển thị tất cả {total || 0} bài tâm sự</span>
      </div>
    );
  }

  // Tạo dải số trang thông minh
  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      range.unshift('...');
    }
    if (page + delta < totalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (totalPages > 1) {
      range.push(totalPages);
    }

    return range;
  };

  const handleSelectPage = (p) => {
    if (p === '...' || p === page) return;
    playClickSound();
    onPageChange(p);
  };

  const startIdx = (page - 1) * limit + 1;
  const endIdx = Math.min(total, page * limit);

  return (
    <div className="pagination-container">
      {/* Thông tin số lượng bài viết */}
      <div className="pagination-count-label">
        <span>Đang xem bài viết <strong>{startIdx} - {endIdx}</strong> trong tổng số <strong>{total}</strong> bài</span>
      </div>

      <div className="pagination-wrap">
        <button
          type="button"
          className="page-btn page-nav-btn"
          disabled={!hasPrevPage}
          onClick={() => {
            playClickSound();
            onPageChange(page - 1);
          }}
          title="Trang trước"
        >
          &laquo; Trang trước
        </button>

        {getPageNumbers().map((p, idx) =>
          p === '...' ? (
            <span key={`dots_${idx}`} className="page-dots">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`page-btn page-num-btn ${p === page ? 'active' : ''}`}
              onClick={() => handleSelectPage(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          className="page-btn page-nav-btn"
          disabled={!hasNextPage}
          onClick={() => {
            playClickSound();
            onPageChange(page + 1);
          }}
          title="Trang kế tiếp"
        >
          Trang sau &raquo;
        </button>
      </div>
    </div>
  );
};
