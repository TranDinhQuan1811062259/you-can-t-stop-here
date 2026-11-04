import { sendError } from '../utils/apiResponse.js';

export const notFoundHandler = (req, res, next) => {
  return sendError(res, {
    message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}`,
    status: 404,
  });
};

export const globalErrorHandler = (err, req, res, next) => {
  console.error('[Error Details]:', err.stack || err.message);

  const statusCode = err.status || err.statusCode || 500;
  return sendError(res, {
    message: err.message || 'Lỗi hệ thống nội bộ',
    status: statusCode,
    errors: process.env.NODE_ENV === 'development' ? err.stack : null,
  });
};

