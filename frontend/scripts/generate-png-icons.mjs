import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

function createPng(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter
  ihdrData[12] = 0; // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Scanlines (filter byte 0 + RGBA per pixel)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.46;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Gradient background from teal (#0d9488) to dark emerald (#042f2e)
      const t = (x + y) / (width + height);
      let r = Math.round(13 * (1 - t) + 4 * t);
      let g = Math.round(148 * (1 - t) + 47 * t);
      let b = Math.round(136 * (1 - t) + 46 * t);
      let a = 255;

      // Rounded app corner mask
      const cornerR = width * 0.22;
      const qx = Math.max(0, Math.abs(dx) - (width / 2 - cornerR));
      const qy = Math.max(0, Math.abs(dy) - (height / 2 - cornerR));
      const cornerDist = Math.sqrt(qx * qx + qy * qy);
      if (cornerDist > cornerR) {
        a = 0;
      }

      // Golden Sun in center top (cx, cy - height * 0.12)
      const sunDx = x - cx;
      const sunDy = y - (cy - height * 0.14);
      const sunDist = Math.sqrt(sunDx * sunDx + sunDy * sunDy);
      const sunR = width * 0.15;
      if (a > 0 && sunDist < sunR) {
        const sunT = sunDist / sunR;
        r = Math.round(254 * (1 - sunT) + 245 * sunT);
        g = Math.round(240 * (1 - sunT) + 158 * sunT);
        b = Math.round(138 * (1 - sunT) + 11 * sunT);
      }

      // Soaring Wings White V shape
      const wingY = cy - height * 0.05;
      const wingDx = Math.abs(dx);
      if (a > 0 && Math.abs(y - wingY - (wingDx * 0.2)) < height * 0.04 && wingDx < width * 0.38) {
        r = 255;
        g = 255;
        b = 255;
      }

      // Heart red center bottom
      const heartY = cy + height * 0.14;
      const hx = dx / (width * 0.18);
      const hy = -(y - heartY) / (height * 0.18);
      if (a > 0) {
        const heartEq = Math.pow(hx * hx + hy * hy - 1, 3) - hx * hx * Math.pow(hy, 3);
        if (heartEq <= 0) {
          r = 225;
          g = 29;
          b = 72; // Crimson Rose Heart #e11d48
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve(__dirname, '../public/icons');
fs.mkdirSync(outDir, { recursive: true });

const icon192 = createPng(192, 192);
fs.writeFileSync(path.join(outDir, 'icon-192.png'), icon192);
console.log('Generated icon-192.png:', icon192.length, 'bytes');

const icon512 = createPng(512, 512);
fs.writeFileSync(path.join(outDir, 'icon-512.png'), icon512);
console.log('Generated icon-512.png:', icon512.length, 'bytes');

const appleTouchIcon = createPng(180, 180);
fs.writeFileSync(path.resolve(__dirname, '../public/apple-touch-icon.png'), appleTouchIcon);
console.log('Generated apple-touch-icon.png:', appleTouchIcon.length, 'bytes');
