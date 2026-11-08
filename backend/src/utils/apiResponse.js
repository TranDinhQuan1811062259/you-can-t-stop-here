/**
 * Chuẩn hóa format phản hồi thành công từ API
 * Hỗ trợ cả 2 phong cách gọi:
 * 1. sendSuccess(res, { data, message, pagination, status })
 * 2. sendSuccess(res, data, message, status)
 */
export const sendSuccess = (res, arg2, maybeMessage, maybeStatus) => {
  // Phong cách 1: Truyền options object
  if (
    arg2 &&
    typeof arg2 === 'object' &&
    !Array.isArray(arg2) &&
    ('data' in arg2 || 'message' in arg2 || 'status' in arg2 || 'pagination' in arg2)
  ) {
    const { data = null, message = 'Success', pagination = null, status = 200 } = arg2;
    return res.status(status).json({
      success: true,
      message,
      data,
      ...(pagination && { pagination }),
    });
  }

  // Phong cách 2: Truyền trực tiếp dữ liệu (data, message, status)
  const status = typeof maybeStatus === 'number' ? maybeStatus : 200;
  const message = typeof maybeMessage === 'string' ? maybeMessage : 'Success';
  const data = arg2 !== undefined ? arg2 : null;

  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

/**
 * Chuẩn hóa format phản hồi lỗi từ API
 * Hỗ trợ cả 2 phong cách gọi:
 * 1. sendError(res, { message, status, errors })
 * 2. sendError(res, message, status, errors)
 */
export const sendError = (res, arg2, maybeStatus, maybeErrors) => {
  // Phong cách 1: Truyền options object
  if (
    arg2 &&
    typeof arg2 === 'object' &&
    ('message' in arg2 || 'status' in arg2 || 'errors' in arg2)
  ) {
    const { message = 'Internal Server Error', status = 500, errors = null } = arg2;
    return res.status(status).json({
      success: false,
      message,
      ...(errors && { errors }),
    });
  }

  // Phong cách 2: Truyền trực tiếp message dạng chuỗi (message, status, errors)
  const status = typeof maybeStatus === 'number' ? maybeStatus : 500;
  const message = typeof arg2 === 'string' ? arg2 : 'Internal Server Error';

  return res.status(status).json({
    success: false,
    message,
    ...(maybeErrors && { errors: maybeErrors }),
  });
};

