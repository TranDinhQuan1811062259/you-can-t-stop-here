import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            // Xử lý êm ái khi Backend chưa khởi động, không làm văng Terminal
            if (!res.headersSent) {
              res.writeHead(502, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Backend server chưa bật trên cổng 5050' }));
            }
          });
        },
      },
      '/uploads': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
        bypass: (req) => {
          // Nếu file tĩnh đã có sẵn trong frontend/public/uploads, bỏ qua proxy để Vite tự phục vụ trực tiếp
          try {
            const cleanName = (req.url || '').split('?')[0].replace(/^\/uploads\/?/, '');
            if (cleanName) {
              const localFile = path.resolve(__dirname, 'public/uploads', cleanName);
              if (fs.existsSync(localFile)) {
                return req.url;
              }
            }
          } catch (e) {}
          return null;
        },
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (!res.headersSent) {
              res.writeHead(404, { 'Content-Type': 'text/plain' });
              res.end('File not found or backend server is offline');
            }
          });
        },
      },
    },
  },
});
