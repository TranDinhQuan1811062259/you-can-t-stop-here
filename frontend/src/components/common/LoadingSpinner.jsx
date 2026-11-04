import React from 'react';

export const LoadingSpinner = ({ message = 'Đang tải dữ liệu...' }) => {
  return (
    <div className="loading-box">
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
};

