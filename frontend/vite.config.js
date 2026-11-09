import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Tự động phân giải đường dẫn thực (realpath) để tương thích 100% với Windows NTFS Junction / Symlink
const projectRoot = fs.existsSync(__dirname) ? fs.realpathSync(__dirname) : __dirname;

// https://vitejs.dev/config/
export default defineConfig({
  root: projectRoot,
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router-dom', 'three'],
    alias: {
      '@': path.resolve(projectRoot, './src'),
      'react': path.resolve(projectRoot, 'node_modules/react'),
      'react-dom': path.resolve(projectRoot, 'node_modules/react-dom'),
      'three': path.resolve(projectRoot, 'node_modules/three'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'three'],
  },
  server: {
    port: 3000,
    strictPort: false,
    fs: {
      strict: false,
      allow: [
        projectRoot,
        path.resolve(__dirname),
        path.resolve(projectRoot, '..'),
      ],
    },
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
              const localFile = path.resolve(projectRoot, 'public/uploads', cleanName);
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
