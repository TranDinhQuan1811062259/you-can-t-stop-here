import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = parseInt(process.env.PORT, 10) || 5050;

/**
 * Khởi động Server Backend & Kết nối MongoDB
 */
const startServer = async () => {
  // 1. Khởi động máy chủ Express lắng nghe cổng ngay lập tức để không bị chậm trễ
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🚀 Server Backend Node.js + Express đã khởi động!`);
    console.log(`📡 URL API:      http://127.0.0.1:${PORT}/api`);
    console.log(`📡 Health Check: http://127.0.0.1:${PORT}/api/health`);
    console.log(`🌿 Cổng Backend: ${PORT}`);
    console.log(`===============================================`);
  });

  // 2. Kết nối Database song song trong nền (không làm nghẽn mở cổng)
  connectDB().catch((err) => {
    console.warn('⚠️ Lỗi kết nối DB:', err.message);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Cổng ${PORT} đang bị chiếm dụng. Vui lòng đổi PORT trong file .env!`);
    } else {
      console.error(`❌ Lỗi khởi động server:`, err.message);
    }
  });

  // Xử lý tắt server an toàn (Graceful Shutdown)
  const shutdown = async () => {
    console.log('\n🛑 Đang đóng kết nối Server và MongoDB...');
    server.close(async () => {
      const mongoose = (await import('mongoose')).default;
      await mongoose.connection.close();
      console.log('✅ Đã tắt an toàn!');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

startServer();
