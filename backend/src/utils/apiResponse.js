/**
 * Chuẩn hóa format phản hồi thành công từ API
 */
export const sendSuccess = (
  res,
  { data = null, message = 'Success', pagination = null, status = 200 } = {}
) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    ...(pagination && { pagination }),
  });
};

/**
 * Chuẩn hóa format phản hồi lỗi từ API
 */
export const sendError = (
  res,
  { message = 'Internal Server Error', status = 500, errors = null } = {}
) => {
  return res.status(status).json({
    success: false,
    message,
    ...(errors && { errors }),
  });
};

