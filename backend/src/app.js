import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

const app = express();

// Middlewares & CORS hỗ trợ linh hoạt cổng local
app.use(cors({
  origin: (origin, callback) => {
    // Trong môi trường dev, cho phép tất cả các cổng localhost / 127.0.0.1 hoặc requests không có origin
    if (
      !origin ||
      process.env.NODE_ENV !== 'production' ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
}));

// Hỗ trợ upload ảnh và dữ liệu tài liệu lớn tới 50MB
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Phục vụ thư mục static cho các file ảnh tải lên cục bộ
app.use('/uploads', express.static(uploadsDir));

// Mount API routes
app.use('/api', routes);

// Handle 404 & Global Errors
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
