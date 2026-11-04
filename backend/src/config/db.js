import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * Biến trạng thái kết nối Database (dùng cho các controller)
 */
export let isDbConnected = false;

/**
 * Hàm kết nối MongoDB bằng Mongoose
 * Đọc trực tiếp biến MONGO_URI từ file .env
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ [Lỗi Cấu Hình] Chưa tìm thấy biến MONGO_URI trong file .env!');
    console.error('👉 Vui lòng mở file backend/.env và điền MONGO_URI của bạn.');
    return;
  }

  try {
    // Thiết lập cấu hình kết nối tối ưu
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Đợi tối đa 5s nếu server chưa bật
      autoIndex: true,                // Tự động tạo index
    });

    isDbConnected = true;

    console.log(`\n======================================================`);
    console.log(`✅ [MongoDB] Kết nối cơ sở dữ liệu THÀNH CÔNG!`);
    console.log(`🏠 Host:     ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);
    console.log(`======================================================\n`);
  } catch (error) {
    isDbConnected = false;
    console.log(`\n------------------------------------------------------`);
    console.log(`⚠️  [MongoDB] Chưa thể kết nối đến URI: ${mongoUri}`);
    console.log(`Chi tiết: ${error.message}`);
    console.log(`💡 Mẹo:`);
    console.log(` - Nếu dùng MongoDB Local: Đảm bảo MongoDB Compass hoặc dịch vụ mongod đã được bật.`);
    console.log(` - Nếu dùng MongoDB Atlas: Kiểm tra lại Network Access (đã Allow IP 0.0.0.0/0 chưa) và mật khẩu.`);
    console.log(`------------------------------------------------------\n`);
  }
};

// Lắng nghe các sự kiện kết nối của Mongoose
mongoose.connection.on('disconnected', () => {
  isDbConnected = false;
  console.warn('⚠️  [MongoDB] Đã ngắt kết nối với cơ sở dữ liệu!');
});

mongoose.connection.on('reconnected', () => {
  isDbConnected = true;
  console.log('🔄 [MongoDB] Đã kết nối lại thành công!');
});

export default mongoose;
