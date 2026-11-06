import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Thiết lập DNS đáng tin cậy để giải quyết SRV record trên Windows mà không bị chặn bởi DNS nội bộ
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Bỏ qua nếu môi trường không cho phép cấu hình DNS
}

// Tự động tìm và nạp file .env chính xác dù chạy từ bất kỳ thư mục nào
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config();

/**
 * Biến trạng thái kết nối Database (dùng cho các controller)
 */
export let isDbConnected = false;

/**
 * Kiểm tra trạng thái kết nối thực tế của Mongoose
 */
export const checkDbReady = () => mongoose.connection.readyState === 1 || isDbConnected;

/**
 * Hàm kết nối MongoDB bằng Mongoose
 * Ưu tiên kết nối MongoDB Atlas từ MONGO_URI trong .env
 * Tự động dự phòng sang MongoDB Local trên máy nếu Atlas gặp sự cố mạng
 */
export const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ [Lỗi Cấu Hình] Chưa tìm thấy biến MONGO_URI trong file .env!');
    console.error('👉 Vui lòng mở file backend/.env và điền MONGO_URI của bạn.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Đợi tối đa 5s
      connectTimeoutMS: 5000,
      family: 4,                      // Ép dùng IPv4, tránh treo DNS IPv6 trên Windows
      autoIndex: true,
    });

    isDbConnected = true;

    console.log(`\n======================================================`);
    console.log(`✅ [MongoDB Atlas] Kết nối cơ sở dữ liệu THÀNH CÔNG!`);
    console.log(`🏠 Host:     ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);
    console.log(`======================================================\n`);
  } catch (error) {
    isDbConnected = false;
    console.log(`\n------------------------------------------------------`);
    console.log(`⚠️  [MongoDB] Chưa thể kết nối Atlas (${error.message})`);
    console.log(`🔄 Đang thử kết nối MongoDB Local trên máy (nếu có)...`);

    try {
      const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/freedom_blog', {
        serverSelectionTimeoutMS: 3000,
        family: 4,
      });
      isDbConnected = true;
      console.log(`✅ [MongoDB Local] Đã kết nối MongoDB cục bộ trên máy thành công!`);
      console.log(`📁 Database: ${localConn.connection.name}`);
      console.log(`------------------------------------------------------\n`);
    } catch (localErr) {
      console.log(`ℹ️ [Hệ thống Bền Vững] Server kích hoạt bộ lưu trữ đĩa cứng backend/data/db_store.json.`);
      console.log(`💾 Toàn bộ bài viết, bình luận và chỉnh sửa sẽ luôn được lưu vĩnh viễn trên máy của bạn.`);
      console.log(`------------------------------------------------------\n`);
    }
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
