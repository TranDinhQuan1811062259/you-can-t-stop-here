import React from 'react';

export const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, hasPrevPage, hasNextPage } = pagination;

  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination-wrap">
      <button
        className="page-btn"
        disabled={!hasPrevPage}
        onClick={() => onPageChange(page - 1)}
      >
        &laquo; Trước
      </button>

      {pages.map((p) => (
        <button
          key={p}
          className={`page-btn ${p === page ? 'active' : ''}`}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}

      <button
        className="page-btn"
        disabled={!hasNextPage}
        onClick={() => onPageChange(page + 1)}
      >
        Sau &raquo;
      </button>
    </div>
  );
};

