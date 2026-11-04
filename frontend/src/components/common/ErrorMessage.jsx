import React from 'react';

export const ErrorMessage = ({ message }) => {
  if (!message) return null;
  return (
    <div className="error-banner">
      <strong>Lỗi: </strong> {message}
    </div>
  );
};

