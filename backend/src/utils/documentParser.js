import zlib from 'zlib';

/**
 * Trích xuất text từ file Word (.docx)
 * Định dạng .docx thực chất là file PKZIP chứa word/document.xml
 */
export function parseDocx(buffer) {
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
            return extractTextFromWordXml(xmlContent);
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
            return extractTextFromWordXml(xmlContent);
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

  // Nếu không giải nén được XML, thử đọc chuỗi có nghĩa dạng thô
  return extractPrintableStrings(buffer);
}

/**
 * Phân tích XML trong word/document.xml thành các đoạn văn bản
 */
function extractTextFromWordXml(xml) {
  const paragraphs = [];
  // Bóc tách từng đoạn <w:p>
  const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  let pMatch;

  while ((pMatch = pRegex.exec(xml)) !== null) {
    const pContent = pMatch[1];
    let pText = '';

    // Lấy thẻ text <w:t> hoặc ngắt dòng <w:br/> hoặc <w:tab/>
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
 */
export function parsePdf(buffer) {
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
          // Có thể là stream không nén
          decompressed = streamRaw;
        }
      }

      if (decompressed) {
        const text = extractPdfStreamText(decompressed.toString('latin1'));
        if (text && text.trim().length > 0) {
          textPieces.push(text.trim());
        }
      }
    }

    if (textPieces.length > 0) {
      return textPieces.join('\n\n');
    }
  } catch (err) {
    console.warn('Lỗi khi phân tích PDF:', err.message);
  }

  return extractPrintableStrings(buffer);
}

/**
 * Trích xuất các toán tử văn bản PDF như (Text) Tj hoặc [(T) 10 (e) 20 (xt)] TJ
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

  // 2. Dạng [(Text1) 20 (Text2)] TJ
  const arrayTjRegex = /\[([\s\S]*?)\]\s*TJ/g;
  while ((m = arrayTjRegex.exec(streamStr)) !== null) {
    const inside = m[1];
    let combined = '';
    const innerStrRegex = /\(([\s\S]*?)\)/g;
    let innerMatch;
    while ((innerMatch = innerStrRegex.exec(inside)) !== null) {
      combined += decodePdfString(innerMatch[1]);
    }
    if (combined.trim()) {
      lines.push(combined.trim());
    }
  }

  return lines.join(' ');
}

function decodePdfString(str) {
  return str
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([()\\\/])/g, '$1');
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
 * Trích xuất các chuỗi ký tự UTF-8 hoặc ASCII có nghĩa từ file nhị phân
 */
function extractPrintableStrings(buffer) {
  try {
    const utf8Str = buffer.toString('utf8');
    // Lọc các chuỗi dài từ 4 ký tự trở lên
    const matches = utf8Str.match(/[\p{L}\p{N}\p{P}\s]{4,}/gu);
    if (matches && matches.length > 0) {
      return matches.join('\n\n');
    }
  } catch (err) {
    // fallback
  }
  return '';
}

/**
 * Hàm phân tích chung từ file tải lên
 * Nhận buffer và originalname, trả về { title, summary, content, wordCount }
 */
export function parseDocument(buffer, originalname = 'bai-viet.txt') {
  const ext = originalname.split('.').pop().toLowerCase();
  let fullText = '';

  if (ext === 'docx') {
    fullText = parseDocx(buffer);
  } else if (ext === 'pdf') {
    fullText = parsePdf(buffer);
  } else if (ext === 'txt' || ext === 'md' || ext === 'rtf' || ext === 'csv') {
    fullText = buffer.toString('utf8');
  } else {
    // Thử kiểm tra magic bytes
    if (buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b) {
      fullText = parseDocx(buffer);
    } else if (buffer.length > 4 && buffer.toString('ascii', 0, 4) === '%PDF') {
      fullText = parsePdf(buffer);
    } else {
      fullText = buffer.toString('utf8');
    }
  }

  fullText = fullText.trim();

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
    // Viết hoa chữ cái đầu
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

  // Nội dung đầy đủ
  const content = fullText;
  const wordCount = fullText.split(/\s+/).filter(Boolean).length;

  return {
    title,
    summary,
    content,
    wordCount,
    fileName: originalname,
  };
}

