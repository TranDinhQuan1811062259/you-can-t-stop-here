import zlib from 'zlib';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let pdfParseModule = null;
let mammothModule = null;
try {
  pdfParseModule = require('pdf-parse');
} catch (_) {}
try {
  mammothModule = require('mammoth');
} catch (_) {}

/**
 * Kiểm tra chuỗi văn bản trích xuất có phải ngôn ngữ người đọc được không,
 * triệt tiêu 100% tình trạng rác nhị phân (mojibake) từ file nén PDF/ZIP.
 */
export function isReadableHumanText(text) {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (trimmed.length < 5) return false;

  // Đếm số lượng ký tự Unicode chữ cái (Letters & Numbers, gồm tiếng Việt có dấu)
  const letters = trimmed.match(/[\p{L}\p{N}]/gu) || [];
  const letterRatio = letters.length / trimmed.length;

  // Đếm các ký tự rác / binary / toán học lạ thường thấy trong mojibake
  const garbageChars = trimmed.match(/[\uFFFD\u0000-\u0008\u000E-\u001F≡≈≠≤≥±√∫~^\\|`{}]/g) || [];
  const garbageRatio = garbageChars.length / trimmed.length;

  // Text người thật phải có ít nhất 35% chữ cái và ít hơn 8% ký tự rác binary
  if (letterRatio < 0.35 || garbageRatio > 0.08) {
    return false;
  }

  // Đếm số từ hợp lệ (độ dài >= 2 ký tự)
  const words = trimmed.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length < 2 && trimmed.length > 50) {
    return false;
  }

  return true;
}

/**
 * Trích xuất text từ file Word (.docx)
 * Sử dụng mammoth engine chuẩn công nghiệp, có dự phòng bằng PKZIP XML parser
 */
export async function parseDocx(buffer) {
  // 1. Thử dùng thư viện mammoth
  if (mammothModule) {
    try {
      const result = await mammothModule.extractRawText({ buffer });
      if (result && result.value && result.value.trim().length > 0) {
        const text = result.value.trim();
        if (isReadableHumanText(text)) {
          return text;
        }
      }
    } catch (mErr) {
      console.warn('mammoth parsing warning, falling back to zip:', mErr.message);
    }
  }

  try {
    // 1. Tìm End of Central Directory (EOCD)
    let eocdOffset = -1;
    for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--) {
      if (
        buffer[i] === 0x50 &&
        buffer[i + 1] === 0x4b &&
        buffer[i + 2] === 0x05 &&
        buffer[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }

    if (eocdOffset !== -1) {
      const cdOffset = buffer.readUInt32LE(eocdOffset + 16);
      const cdCount = buffer.readUInt16LE(eocdOffset + 10);
      let curr = cdOffset;

      for (let i = 0; i < cdCount && curr < buffer.length - 46; i++) {
        if (
          buffer[curr] !== 0x50 ||
          buffer[curr + 1] !== 0x4b ||
          buffer[curr + 2] !== 0x01 ||
          buffer[curr + 3] !== 0x02
        ) {
          break;
        }

        const compression = buffer.readUInt16LE(curr + 10);
        const compSize = buffer.readUInt32LE(curr + 20);
        const fileNameLen = buffer.readUInt16LE(curr + 28);
        const extraLen = buffer.readUInt16LE(curr + 30);
        const commentLen = buffer.readUInt16LE(curr + 32);
        const localHeaderOffset = buffer.readUInt32LE(curr + 42);

        const fileName = buffer.toString('utf8', curr + 46, curr + 46 + fileNameLen);

        if (fileName === 'word/document.xml') {
          // Đọc dữ liệu từ local file header
          const localFileNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
          const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
          const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
          const compressedData = buffer.slice(dataStart, dataStart + compSize);

          let xmlContent = '';
          if (compression === 8) {
            xmlContent = zlib.inflateRawSync(compressedData).toString('utf8');
          } else if (compression === 0) {
            xmlContent = compressedData.toString('utf8');
          }

          if (xmlContent) {
            const extracted = extractTextFromWordXml(xmlContent);
            if (isReadableHumanText(extracted)) return extracted;
          }
        }

        curr += 46 + fileNameLen + extraLen + commentLen;
      }
    }

    // 2. Dự phòng: quét tuần tự các local headers nếu không tìm thấy EOCD
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compression = buffer.readUInt16LE(offset + 8);
        const compSize = buffer.readUInt32LE(offset + 18);
        const fileNameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const fileName = buffer.toString('utf8', offset + 30, offset + 30 + fileNameLen);
        const dataStart = offset + 30 + fileNameLen + extraLen;

        if (fileName === 'word/document.xml' && compSize > 0) {
          const compressedData = buffer.slice(dataStart, dataStart + compSize);
          let xmlContent = '';
          if (compression === 8) {
            xmlContent = zlib.inflateRawSync(compressedData).toString('utf8');
          } else {
            xmlContent = compressedData.toString('utf8');
          }
          if (xmlContent) {
            const extracted = extractTextFromWordXml(xmlContent);
            if (isReadableHumanText(extracted)) return extracted;
          }
        }
        offset = dataStart + (compSize > 0 ? compSize : 1);
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn('Lỗi khi phân tích Word .docx:', err.message);
  }

  return '';
}

/**
 * Phân tích XML trong word/document.xml thành các đoạn văn bản
 */
function extractTextFromWordXml(xml) {
  const paragraphs = [];
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];
    let pText = '';

    const tRegex = /(?:<w:t\b[^>]*>([\s\S]*?)<\/w:t>)|(?:<w:br\/>)|(?:<w:tab\/>)/g;
    let tMatch;

    while ((tMatch = tRegex.exec(pContent)) !== null) {
      if (tMatch[1] !== undefined) {
        pText += decodeXmlEntities(tMatch[1]);
      } else if (tMatch[0] === '<w:br/>') {
        pText += '\n';
      } else if (tMatch[0] === '<w:tab/>') {
        pText += '    ';
      }
    }

    if (pText.trim()) {
      paragraphs.push(pText.trim());
    }
  }

  return paragraphs.length > 0 ? paragraphs.join('\n\n') : '';
}

/**
 * Trích xuất text từ file PDF
 * Hỗ trợ Unicode Tiếng Việt, font nhúng, file xuất từ Google Docs, Word, Canva
 */
export async function parsePdf(buffer) {
  // 1. Thử dùng thư viện PDFParse v2 chính xác
  if (pdfParseModule) {
    try {
      const PDFParse = pdfParseModule.PDFParse || pdfParseModule;
      if (typeof PDFParse === 'function') {
        const parser = new PDFParse({ data: buffer, verbosity: 0 });
        const result = await parser.getText();
        await parser.destroy().catch(() => {});
        if (result && typeof result.text === 'string' && result.text.trim()) {
          const cleanText = result.text
            .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '')
            .replace(/Page\s+\d+\s+of\s+\d+/gi, '')
            .trim();
          if (cleanText.length > 5 && isReadableHumanText(cleanText)) {
            return cleanText;
          }
        }
      }
    } catch (pdfErr) {
      console.warn('PDFParse module warning, trying fallback stream decompression:', pdfErr.message);
    }
  }

  try {
    const textPieces = [];
    const bufStr = buffer.toString('binary');
    
    // Tìm các stream trong PDF
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;

    while ((match = streamRegex.exec(bufStr)) !== null) {
      const streamRaw = Buffer.from(match[1], 'binary');
      let decompressed = null;

      // Thử giải nén FlateDecode (zlib deflate)
      try {
        decompressed = zlib.inflateSync(streamRaw);
      } catch (e1) {
        try {
          decompressed = zlib.inflateRawSync(streamRaw);
        } catch (e2) {
          decompressed = streamRaw;
        }
      }

      if (decompressed) {
        const text = extractPdfStreamText(decompressed.toString('latin1'));
        if (text && text.trim().length > 0 && isReadableHumanText(text)) {
          textPieces.push(text.trim());
        }
      }
    }

    if (textPieces.length > 0) {
      const combined = textPieces.join('\n\n');
      if (isReadableHumanText(combined)) {
        return combined;
      }
    }
  } catch (err) {
    console.warn('Lỗi khi phân tích PDF:', err.message);
  }

  return '';
}

/**
 * Trích xuất các toán tử văn bản PDF như (Text) Tj, <HEX> Tj hoặc [(T) 10 (e)] TJ
 */
function extractPdfStreamText(streamStr) {
  const lines = [];

  // 1. Dạng (Text) Tj hoặc (Text) ' hoặc (Text) "
  const tjRegex = /\(([\s\S]*?)\)\s*(?:Tj|'|")/g;
  let m;
  while ((m = tjRegex.exec(streamStr)) !== null) {
    const rawText = decodePdfString(m[1]);
    if (rawText.trim()) {
      lines.push(rawText.trim());
    }
  }

  // 2. Dạng <HEX> Tj (Phổ biến trong PDF tiếng Việt xuất từ Word / Google Docs)
  const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
  while ((m = hexTjRegex.exec(streamStr)) !== null) {
    const rawText = decodePdfHexString(m[1]);
    if (rawText.trim()) {
      lines.push(rawText.trim());
    }
  }

  // 3. Dạng [(Text1) 20 (Text2)] TJ hoặc [<HEX1> 10 <HEX2>] TJ
  const arrayTjRegex = /\[([\s\S]*?)\]\s*TJ/g;
  while ((m = arrayTjRegex.exec(streamStr)) !== null) {
    const inside = m[1];
    let combined = '';
    
    // Tìm cả chuỗi () và chuỗi <> trong mảng
    const innerTokenRegex = /(?:\(([\s\S]*?)\))|(?:<([0-9a-fA-F]+)>)/g;
    let innerMatch;
    while ((innerMatch = innerTokenRegex.exec(inside)) !== null) {
      if (innerMatch[1] !== undefined) {
        combined += decodePdfString(innerMatch[1]);
      } else if (innerMatch[2] !== undefined) {
        combined += decodePdfHexString(innerMatch[2]);
      }
    }
    if (combined.trim()) {
      lines.push(combined.trim());
    }
  }

  return lines.join(' ');
}

function decodePdfString(str) {
  if (str.charCodeAt(0) === 0xFE && str.charCodeAt(1) === 0xFF) {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    try {
      return new TextDecoder('utf-16be').decode(bytes.subarray(2));
    } catch (_) {}
  }
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\\/])/g, '$1');
}

function decodePdfHexString(hex) {
  const cleanHex = hex.replace(/\s+/g, '');
  if (cleanHex.length % 2 !== 0) return '';
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  // Nếu có BOM UTF-16BE (\xFE\xFF)
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    try {
      return new TextDecoder('utf-16be').decode(bytes.subarray(2));
    } catch (_) {}
  }
  // Thử UTF-8
  try {
    const utf8 = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (isReadableHumanText(utf8)) return utf8;
  } catch (_) {}
  // Fallback Latin1
  return new TextDecoder('latin1').decode(bytes);
}

function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Hàm phân tích chung từ file tải lên (Bất đồng bộ)
 * Nhận buffer và originalname, trả về { title, summary, content, htmlContent, wordCount, fileName }
 */
export async function parseDocument(buffer, originalname = 'bai-viet.txt') {
  const ext = originalname.split('.').pop().toLowerCase();
  let fullText = '';
  let htmlContent = '';

  if (ext === 'docx') {
    if (mammothModule) {
      try {
        const hRes = await mammothModule.convertToHtml({ buffer });
        if (hRes && hRes.value && hRes.value.trim().length > 0) {
          htmlContent = hRes.value.trim();
        }
      } catch (_) {}
    }
    fullText = await parseDocx(buffer);
  } else if (ext === 'pdf') {
    fullText = await parsePdf(buffer);
  } else if (ext === 'txt' || ext === 'md' || ext === 'rtf' || ext === 'csv') {
    fullText = buffer.toString('utf8');
  } else {
    // Thử kiểm tra magic bytes
    if (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      fullText = await parseDocx(buffer);
    } else if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
      fullText = await parsePdf(buffer);
    } else {
      fullText = buffer.toString('utf8');
    }
  }

  fullText = (fullText || '').trim();

  // Kiểm tra tính hợp lệ của văn bản người đọc được
  if (!fullText || !isReadableHumanText(fullText)) {
    throw new Error(
      `Không thể trích xuất văn bản hợp lệ từ file "${originalname}". File có thể là file ảnh scan, bị đặt mật khẩu hoặc chứa định dạng không hỗ trợ. Bạn vui lòng mở file, nhấn Ctrl+A, Copy (Ctrl+C) và Dán (Ctrl+V) trực tiếp vào ô soạn thảo nhé!`
    );
  }

  // Tách các dòng hoặc đoạn văn
  const paragraphs = fullText
    .split(/\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Tạo tiêu đề tự động: dòng đầu tiên (nếu ngắn hơn 120 ký tự) hoặc tên file
  let title = '';
  let startIndex = 0;

  if (paragraphs.length > 0 && paragraphs[0].length <= 120) {
    title = paragraphs[0].replace(/^[#\*\-_\s]+/, '').trim();
    startIndex = 1;
  } else {
    title = originalname.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Tạo tóm tắt tự động: 1-2 câu tiếp theo
  let summary = '';
  if (paragraphs.length > startIndex) {
    summary = paragraphs[startIndex];
    if (summary.length > 180) {
      summary = summary.slice(0, 180) + '...';
    }
  } else {
    summary = title;
  }

  // Nội dung đầy đủ và định dạng HTML chuẩn cho trình soạn thảo
  const content = fullText;
  if (!htmlContent && paragraphs.length > 0) {
    htmlContent = paragraphs.map((p) => `<p>${p}</p>`).join('');
  }

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return {
    title,
    summary,
    content,
    htmlContent,
    wordCount,
    fileName: originalname,
  };
}

