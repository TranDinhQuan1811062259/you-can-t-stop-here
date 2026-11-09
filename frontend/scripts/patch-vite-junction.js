import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const chunksDir = path.resolve(__dirname, '../node_modules/vite/dist/node/chunks');
  if (fs.existsSync(chunksDir)) {
    const files = fs.readdirSync(chunksDir);
    for (const f of files) {
      if (f.startsWith('dep-') && f.endsWith('.js')) {
        const fullPath = path.join(chunksDir, f);
        let content = fs.readFileSync(fullPath, 'utf-8');
        let modified = false;

        // 1. Bảo vệ chống văng unhandled TypeError khi output là undefined
        if (content.includes('JSON.stringify(output.imports)')) {
          content = content.replace(
            'JSON.stringify(output.imports)',
            'JSON.stringify(output?.imports || [])'
          );
          content = content.replace(
            'needsInterop(\n            environment,\n            id,\n            idToExports[id],\n            output\n          )',
            'needsInterop(\n            environment,\n            id,\n            idToExports[id],\n            output || {}\n          )'
          );
          modified = true;
        }

        // 2. Cơ chế dò tìm fallback theo flatId cho các thư mục liên kết NTFS Junction / Symlink trên Windows
        if (
          content.includes('function esbuildOutputFromId') &&
          !content.includes('key.endsWith("/" + flatId)')
        ) {
          const target = 'if (normalizePath$3(path$c.relative(cwd, key)) === normalizedOutputPath) {\n      return value;\n    }\n  }';
          const replacement = 'if (normalizePath$3(path$c.relative(cwd, key)) === normalizedOutputPath) {\n      return value;\n    }\n  }\n  for (const [key, value] of Object.entries(outputs)) {\n    if (key.endsWith("/" + flatId) || key === flatId) {\n      return value;\n    }\n  }';
          if (content.includes(target)) {
            content = content.replace(target, replacement);
            modified = true;
          }
        }

        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf-8');
          console.log(`[Vite Windows Junction Patch] Đã vá tương thích Junction thành công cho ${f}`);
        }
      }
    }
  }
} catch (err) {
  // Bỏ qua nếu không có quyền ghi
}
