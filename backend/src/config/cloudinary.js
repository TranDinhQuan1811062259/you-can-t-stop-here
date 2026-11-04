/**
 * Cấu hình Cloudinary và tiện ích upload ảnh
 */
export const uploadToCloudinary = async (fileBuffer, folder = 'you_cant_stop_here') => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Chưa cấu hình tài khoản Cloudinary! Vui lòng điền CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET vào file backend/.env'
    );
  }

  try {
    const cloudinaryModule = await import('cloudinary');
    const cloudinary = cloudinaryModule.v2;

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') {
      throw new Error(
        'Chưa cài đặt thư viện cloudinary! Vui lòng chạy lệnh: npm install trong thư mục backend'
      );
    }
    throw err;
  }
};

