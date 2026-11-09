import React, { useState, useEffect, useRef } from 'react';
import { postService } from '../../services/postService';
import { categoryService } from '../../services/categoryService';
import { uploadService } from '../../services/uploadService';
import { RichVisualEditor } from './RichVisualEditor';
import { MediaCameraCaptureModal } from './MediaCameraCaptureModal';
import { formatPostContent } from '../../utils/contentFormatter';
import { maskSensitiveText, analyzeContentSafety } from '../../utils/sensitiveFilter';
import { PostAtmosphereSelector } from './PostAtmosphereSelector';
import { AsmrKeyboardToggle } from '../common/AsmrKeyboardToggle';
import { PostSubmitAtmosphereOverlay } from './PostSubmitAtmosphereOverlay';
import { getActiveSeason } from '../../utils/seasonUtils';
import { eventService } from '../../services/eventService';

const DEFAULT_FALLBACK_CATEGORIES = [
  { _id: 'cat_work_life', name: 'Công Sở & Sự Nghiệp', icon: '💼', slug: 'cong-so' },
  { _id: 'cat_emotion', name: 'Tâm Sự & Cảm Xúc', icon: '🌧️', slug: 'tam-su' },
  { _id: 'cat_healing', name: 'Chữa Lành & Bình Yên', icon: '🌿', slug: 'chua-lanh' },
  { _id: 'cat_life', name: 'Cuộc Sống Thường Nhật', icon: '☕', slug: 'cuoc-song' },
];

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [categories, setCategories] = useState(DEFAULT_FALLBACK_CATEGORIES);
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: DEFAULT_FALLBACK_CATEGORIES[0]._id,
    coverImage: '',
    tags: '',
    showReactionCount: true,
    allowComments: true,
    visibility: 'public',
    audioMood: 'auto',
    voiceGender: 'female',
    voiceRegion: 'north',
    atmosphere: {
      theme: 'default',
      soundEnabled: true,
      bgPreset: 'default',
      customColor: '',
      customBgGradient: '',
      particleEffect: 'none',
    },
  });

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' hoặc 'preview'
  const [uploadingCover, setUploadingCover] = useState(false);
  const [isCoverCameraOpen, setIsCoverCameraOpen] = useState(false);
  const [importingDoc, setImportingDoc] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Quản lý tạo thể loại bài viết mới trực tiếp
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🌍');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [creatingCatLoading, setCreatingCatLoading] = useState(false);

  // States cho Hiệu ứng đăng bài theo Sự kiện & 4 Mùa
  const [submitEffect, setSubmitEffect] = useState(null);
  const [activeSeason, setActiveSeasonState] = useState(() => getActiveSeason());
  const [activeEvent, setActiveEvent] = useState(null);
  const submitButtonRef = useRef(null);

  const docFileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setActiveSeasonState(getActiveSeason());
      eventService
        .getActiveEvent()
        .then((res) => setActiveEvent(res?.data || null))
        .catch(() => setActiveEvent(null));

      categoryService
        .getCategories()
        .then((res) => {
          const list = Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
            ? res
            : [];
          const validList = list.length > 0 ? list : DEFAULT_FALLBACK_CATEGORIES;
          setCategories(validList);
          setFormData((prev) => ({
            ...prev,
            category: prev.category || validList[0]._id,
          }));
        })
        .catch((err) => {
          console.warn('Lỗi lấy danh mục:', err);
          setCategories(DEFAULT_FALLBACK_CATEGORIES);
          setFormData((prev) => ({
            ...prev,
            category: prev.category || DEFAULT_FALLBACK_CATEGORIES[0]._id,
          }));
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleContentChange = (newHtml) => {
    setFormData((prev) => ({ ...prev, content: newHtml }));
    setErrorMsg('');
  };

  // Tạo thể loại bài viết mới trực tiếp
  const handleCreateNewCategory = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!newCatName.trim()) return;

    try {
      setCreatingCatLoading(true);
      const res = await categoryService.createCategory({
        name: newCatName.trim(),
        icon: newCatIcon || '🌍',
        description: newCatDesc.trim(),
      });

      const created = res?.data?.data || res?.data || res;
      if (created && (created._id || created.name)) {
        setCategories((prev) => {
          const exists = prev.some((c) => c._id === created._id || c.slug === created.slug);
          return exists ? prev : [...prev, created];
        });
        setFormData((prev) => ({ ...prev, category: created._id }));
        setIsCreatingCategory(false);
        setNewCatName('');
        setNewCatDesc('');
        window.dispatchEvent(
          new CustomEvent('freedom_category_created', { detail: { category: created } })
        );
      }
    } catch (err) {
      console.error('Lỗi khi tạo thể loại:', err);
      alert('Không thể tạo thể loại: ' + (err.response?.data?.message || err.message));
    } finally {
      setCreatingCatLoading(false);
    }
  };

  // ==========================================
  // XỬ LÝ ẢNH BÌA
  // ==========================================
  const handleCoverImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setInfoMsg('');
    setUploadingCover(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64Url = event.target?.result;
      setFormData((prev) => ({ ...prev, coverImage: base64Url }));

      try {
        const uploadResult = await uploadService.uploadImage(file);
        if (uploadResult?.url) {
          setFormData((prev) => ({ ...prev, coverImage: uploadResult.url }));
          setInfoMsg('✓ Đã tải và lưu trữ ảnh bìa thành công!');
        }
      } catch (err) {
        setInfoMsg('✓ Đã lưu ảnh bìa cục bộ cho bài viết của bạn.');
      } finally {
        setUploadingCover(false);
      }
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveCover = () => {
    setFormData((prev) => ({ ...prev, coverImage: '' }));
    setInfoMsg('');
  };

  const handleCoverCameraCaptured = (media) => {
    if (media?.dataUrl) {
      setFormData((prev) => ({ ...prev, coverImage: media.dataUrl }));
      setInfoMsg('✓ Đã chụp ảnh bìa trực tiếp từ Camera/Webcam!');
    }
    setIsCoverCameraOpen(false);
  };

  // ==========================================
  // NHẬP TỪ FILE WORD / PDF / TXT
  // ==========================================
  // Kiểm tra chuỗi văn bản trích xuất có phải ngôn ngữ người đọc được không,
  // triệt tiêu 100% tình trạng rác nhị phân (mojibake) từ file nén PDF/ZIP.
  const isReadableHumanText = (text) => {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (trimmed.length < 5) return false;

    // Đếm số lượng ký tự Unicode chữ cái & số
    const letters = trimmed.match(/[\p{L}\p{N}]/gu) || [];
    const letterRatio = letters.length / trimmed.length;

    // Đếm các ký tự rác binary / toán học lạ thường thấy trong mojibake
    const garbageChars = trimmed.match(/[\uFFFD\u0000-\u0008\u000E-\u001F≡≈≠≤≥±√∫~^\\|`{}]/g) || [];
    const garbageRatio = garbageChars.length / trimmed.length;

    if (letterRatio < 0.35 || garbageRatio > 0.08) {
      return false;
    }

    const words = trimmed.split(/\s+/).filter((w) => w.length >= 2);
    if (words.length < 2 && trimmed.length > 50) {
      return false;
    }

    return true;
  };

  // Trích xuất DOCX trực tiếp trên trình duyệt bằng DecompressionStream (Chuẩn PKZIP Native)
  const extractClientSideDocx = async (buffer) => {
    try {
      const u8 = new Uint8Array(buffer);
      const view = new DataView(buffer);
      let offset = 0;
      let docXml = '';

      while (offset < u8.length - 30) {
        if (view.getUint32(offset, true) === 0x04034b50) {
          const compMethod = view.getUint16(offset + 8, true);
          const compSize = view.getUint32(offset + 18, true);
          const nameLen = view.getUint16(offset + 26, true);
          const extraLen = view.getUint16(offset + 28, true);
          const nameBytes = u8.subarray(offset + 30, offset + 30 + nameLen);
          const name = new TextDecoder().decode(nameBytes);
          const dataStart = offset + 30 + nameLen + extraLen;

          if (name === 'word/document.xml') {
            const compressed = u8.subarray(dataStart, dataStart + compSize);
            if (compMethod === 8 && typeof DecompressionStream !== 'undefined') {
              const ds = new DecompressionStream('deflate-raw');
              const writer = ds.writable.getWriter();
              writer.write(compressed);
              writer.close();
              docXml = await new Response(ds.readable).text();
            } else if (compMethod === 0) {
              docXml = new TextDecoder().decode(compressed);
            }
            break;
          }
          offset = dataStart + (compSize > 0 ? compSize : 1);
        } else {
          offset++;
        }
      }

      if (docXml) {
        const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
        const tRegex = /(?:<w:t\b[^>]*>([\s\S]*?)<\/w:t>)|(?:<w:br\/>)|(?:<w:tab\/>)/g;
        const paragraphs = [];
        let pm;
        while ((pm = pRegex.exec(docXml)) !== null) {
          let pText = '';
          let tm;
          while ((tm = tRegex.exec(pm[1])) !== null) {
            if (tm[1] !== undefined) {
              pText += tm[1]
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&apos;/g, "'");
            } else if (tm[0] === '<w:br/>') {
              pText += '\n';
            } else if (tm[0] === '<w:tab/>') {
              pText += '    ';
            }
          }
          if (pText.trim()) paragraphs.push(pText.trim());
        }
        return paragraphs.join('\n\n');
      }
    } catch (err) {
      console.warn('Client-side docx decompression failed:', err);
    }
    return '';
  };

  // Trích xuất PDF trực tiếp trên trình duyệt bằng DecompressionStream (Giải nén luồng FlateDecode)
  const extractClientSidePdf = async (buffer) => {
    try {
      const u8 = new Uint8Array(buffer);
      const rawStr = new TextDecoder('latin1').decode(u8);
      const textPieces = [];

      const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
      let match;
      while ((match = streamRegex.exec(rawStr)) !== null) {
        const streamBytes = new Uint8Array(match[1].length);
        for (let i = 0; i < match[1].length; i++) streamBytes[i] = match[1].charCodeAt(i);

        let decompressed = '';
        if (typeof DecompressionStream !== 'undefined') {
          try {
            const ds = new DecompressionStream('deflate');
            const writer = ds.writable.getWriter();
            writer.write(streamBytes);
            writer.close();
            decompressed = await new Response(ds.readable).text();
          } catch (_) {
            try {
              const dsRaw = new DecompressionStream('deflate-raw');
              const writer = dsRaw.writable.getWriter();
              writer.write(streamBytes);
              writer.close();
              decompressed = await new Response(dsRaw.readable).text();
            } catch (_) {
              decompressed = match[1];
            }
          }
        } else {
          decompressed = match[1];
        }

        if (decompressed) {
          // (Text) Tj
          const tjRegex = /\(([\s\S]*?)\)\s*(?:Tj|'|")/g;
          let m;
          while ((m = tjRegex.exec(decompressed)) !== null) {
            const t = m[1].replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
                          .replace(/\\[nrtbf\\()]/g, ' ')
                          .trim();
            if (t.length > 1) textPieces.push(t);
          }
          // <HEX> Tj
          const hexRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
          while ((m = hexRegex.exec(decompressed)) !== null) {
            const hex = m[1].replace(/\s+/g, '');
            if (hex.length >= 4 && hex.length % 2 === 0) {
              const b = new Uint8Array(hex.length / 2);
              for (let i = 0; i < hex.length; i += 2) b[i / 2] = parseInt(hex.substring(i, i + 2), 16);
              try {
                if (b[0] === 0xFE && b[1] === 0xFF) {
                  const s = new TextDecoder('utf-16be').decode(b.subarray(2));
                  if (s.trim()) textPieces.push(s.trim());
                }
              } catch (_) {}
            }
          }
        }
      }

      if (textPieces.length > 0) {
        return textPieces.join(' ');
      }
    } catch (err) {
      console.warn('Client-side pdf decompression failed:', err);
    }
    return '';
  };

  const extractClientSideText = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result;
          if (!buffer) return resolve('');
          const ext = file.name.split('.').pop().toLowerCase();

          if (ext === 'docx') {
            const docxText = await extractClientSideDocx(buffer);
            if (docxText && isReadableHumanText(docxText)) return resolve(docxText);
          } else if (ext === 'pdf') {
            const pdfText = await extractClientSidePdf(buffer);
            if (pdfText && isReadableHumanText(pdfText)) return resolve(pdfText);
          } else if (ext === 'txt' || ext === 'md') {
            const utf8 = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
            if (isReadableHumanText(utf8)) return resolve(utf8);
          }
          resolve('');
        } catch (_) {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsArrayBuffer(file);
    });
  };

  const handleDocFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportingDoc(true);
    setErrorMsg('');
    setInfoMsg('');

    try {
      const ext = file.name.split('.').pop().toLowerCase();

      if (ext === 'txt' || ext === 'md') {
        const textReader = new FileReader();
        textReader.onload = (event) => {
          const text = event.target?.result || '';
          applyImportedText(text, file.name);
          setImportingDoc(false);
        };
        textReader.readAsText(file, 'utf-8');
        return;
      }

      let docData = null;
      try {
        const result = await uploadService.uploadDocument(file);
        docData = result?.data || result;
      } catch (uploadErr) {
        console.warn('Backend uploadDocument failed, using client-side extraction:', uploadErr);
      }

      if (
        docData &&
        (docData.content || docData.htmlContent || docData.title) &&
        isReadableHumanText(docData.content || docData.htmlContent || docData.summary || '')
      ) {
        const extractedText = docData.content || '';
        const formattedHtml =
          docData.htmlContent ||
          (extractedText
            ? extractedText
                .split(/\r?\n+/)
                .map((p) => p.trim())
                .filter(Boolean)
                .map((p) => `<p>${p}</p>`)
                .join('')
            : '');

        const fileBaseName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

        setFormData((prev) => ({
          ...prev,
          title: prev.title || docData.title || fileBaseName,
          summary: prev.summary || docData.summary || fileBaseName,
          content: prev.content ? `${prev.content}<p><br/></p>${formattedHtml}` : formattedHtml,
        }));
        setActiveTab('edit');
        setInfoMsg(
          `✓ Đã trích xuất & hiển thị toàn bộ nội dung từ "${file.name}" (${docData.wordCount || 0} từ)!`
        );
      } else {
        // Fallback sang trích xuất trực tiếp trên client nếu backend không đọc được
        const clientText = await extractClientSideText(file);
        if (clientText && isReadableHumanText(clientText)) {
          applyImportedText(clientText, file.name);
          setInfoMsg(`✓ Đã trích xuất & hiển thị toàn bộ nội dung từ "${file.name}"!`);
        } else {
          setErrorMsg(
            `Không thể tự động đọc nội dung từ file "${file.name}". File có thể là ảnh scan chưa có lớp text (OCR), định dạng Word đời cũ (.doc) hoặc file được bảo vệ bằng mật khẩu. Bạn vui lòng mở file, nhấn Ctrl+A, Copy (Ctrl+C) và Paste (Ctrl+V) vào ô soạn thảo bên dưới nhé!`
          );
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Không thể trích xuất file văn bản. Vui lòng kiểm tra lại định dạng file!');
    } finally {
      setImportingDoc(false);
      if (docFileInputRef.current) {
        docFileInputRef.current.value = '';
      }
    }
  };

  const applyImportedText = (fullText, fileName) => {
    const paragraphs = fullText
      .split(/\r?\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    let title = '';
    let summary = '';

    if (paragraphs.length > 0 && paragraphs[0].length <= 120) {
      title = paragraphs[0].replace(/^[#\*\-_\s]+/, '').trim();
    } else {
      title = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }

    if (paragraphs.length > 1) {
      summary = paragraphs[1].slice(0, 180);
    } else {
      summary = title;
    }

    const htmlContent = paragraphs.map((p) => `<p>${p}</p>`).join('');

    setFormData((prev) => ({
      ...prev,
      title: prev.title || title,
      summary: prev.summary || summary,
      content: prev.content ? `${prev.content}<p><br/></p>${htmlContent}` : htmlContent,
    }));
    setActiveTab('edit');
    setInfoMsg(`✓ Đã nhập và hiển thị toàn bộ nội dung từ "${fileName}"!`);
  };

  // ==========================================
  // SUBMIT
  // ==========================================
  const handleSubmit = async (e) => {
    e.preventDefault();

    let currentCategory = formData.category;
    if (!currentCategory) {
      if (categories && categories.length > 0) {
        currentCategory = categories[0]._id;
      } else {
        currentCategory = DEFAULT_FALLBACK_CATEGORIES[0]._id;
      }
      setFormData((prev) => ({ ...prev, category: currentCategory }));
    }

    if (!formData.title?.trim() || !formData.summary?.trim() || !formData.content?.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ tiêu đề, tóm tắt và nội dung bài viết.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Tự động chèn dấu chấm vào từ ngữ nhạy cảm (ví dụ Die -> D.I.E, chết -> c.h.ế.t)
      const cleanTitle = maskSensitiveText(formData.title.trim());
      const cleanSummary = maskSensitiveText(formData.summary.trim());
      const cleanContent = maskSensitiveText(formData.content);
      const cleanTags = formData.tags
        ? formData.tags.split(',').map((t) => maskSensitiveText(t.trim().replace(/^#/, ''))).filter(Boolean)
        : [];

      const res = await postService.createPost({
        title: cleanTitle,
        summary: cleanSummary,
        content: cleanContent,
        category: currentCategory,
        coverImage: formData.coverImage || undefined,
        tags: cleanTags,
        showReactionCount: formData.showReactionCount,
        allowComments: formData.allowComments,
        audioMood: formData.audioMood || 'auto',
        voiceGender: formData.voiceGender || 'female',
        voiceRegion: formData.voiceRegion || 'north',
        atmosphere: formData.atmosphere,
      });

      // Kích hoạt hiệu ứng Đăng Bài theo Sự Kiện (hoặc Mùa Màng)
      const btnRect = submitButtonRef.current?.getBoundingClientRect() || null;
      setSubmitEffect({
        buttonRect: btnRect,
        createdData: res?.data || res,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Không thể đăng bài lúc này. Vui lòng thử lại!');
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        style={{ maxWidth: '820px', width: '95%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close-btn" onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 className="modal-heading" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="healing-icon-pill healing-icon-sage" style={{ width: '30px', height: '30px', fontSize: '0.85rem' }}>
              <i className="fa-solid fa-feather-pointed"></i>
            </span>
            <span>Trút Bầu Tâm Sự</span>
          </h3>
          <div style={{ marginRight: '36px' }}>
            <AsmrKeyboardToggle variant="pill" />
          </div>
        </div>
        <p className="modal-subtitle">
          Không gian lắng nghe những trăn trở trong công việc. Bạn có thể chèn video YouTube, hình ảnh và icon cảm xúc để bài viết sinh động hơn.
        </p>

        {errorMsg && <div className="modal-error">{errorMsg}</div>}
        {infoMsg && (
          <div
            style={{
              background: '#ecfdf5',
              borderLeft: '4px solid #10b981',
              color: '#065f46',
              padding: '10px 14px',
              borderRadius: '4px',
              fontSize: '0.86rem',
              marginBottom: '14px',
              fontWeight: 500,
            }}
          >
            {infoMsg}
          </div>
        )}

        {/* Thanh Nhập nội dung từ file */}
        <div className="doc-import-bar">
          <div className="doc-import-info">
            <span style={{ fontSize: '1.25rem' }}>📄</span>
            <span>
              <strong>Bạn đã viết sẵn bài tâm sự?</strong> Nhập nhanh từ file Word (.docx), PDF hoặc TXT.
            </span>
          </div>
          <button
            type="button"
            className="doc-import-btn"
            disabled={importingDoc}
            onClick={() => docFileInputRef.current?.click()}
          >
            {importingDoc ? '⏳ Đang đọc file...' : '📂 Chọn file Word/PDF/TXT'}
          </button>
          <input
            type="file"
            ref={docFileInputRef}
            accept=".docx,.doc,.pdf,.txt,.md,.rtf"
            style={{ display: 'none' }}
            onChange={handleDocFileSelect}
          />
        </div>

        {/* Cảnh báo kiểm duyệt an toàn thời gian thực */}
        {(() => {
          const safety = analyzeContentSafety(formData.title, formData.summary, formData.content, formData.tags ? formData.tags.split(',') : []);
          if (!safety.isFlagged) return null;
          return (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '14px',
                color: '#92400e',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🛡️</span>
              <div>
                <strong>Lưu ý an toàn:</strong> Nội dung có chứa từ ngữ nhạy cảm ({safety.foundWords.join(', ')}). Hệ thống sẽ tự động chèn dấu chấm (D.I.E, c.h.ế.t...) và gắn cờ để Admin kiểm duyệt nhằm bảo vệ website không bị vi phạm.
              </div>
            </div>
          );
        })()}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Tiêu đề bài viết / cảm nghĩ *</label>
            <input
              type="text"
              name="title"
              placeholder="Ví dụ: Hôm nay mình đã vượt qua ngày thứ 21 áp lực liên miên..."
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group category-select-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0, fontWeight: 700 }}>Chuyên mục / Thể loại bài viết *</label>
              <button
                type="button"
                className="page-btn"
                onClick={() => setIsCreatingCategory(!isCreatingCategory)}
                style={{
                  fontSize: '0.8rem',
                  padding: '3px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: isCreatingCategory ? '#fef2f2' : '#f0fdf4',
                  borderColor: isCreatingCategory ? '#fca5a5' : '#86efac',
                  color: isCreatingCategory ? '#dc2626' : '#15803d',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: '8px',
                }}
              >
                {isCreatingCategory ? '✕ Đóng' : '✨ + Tạo thể loại mới'}
              </button>
            </div>

            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.92rem',
                fontWeight: 600,
              }}
            >
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {(c.icon ? `${c.icon} ` : '🏷️ ') + c.name}
                </option>
              ))}
            </select>

            {/* Khung tạo thể loại mới trượt ra tiện lợi */}
            {isCreatingCategory && (
              <div
                className="new-category-inline-creator"
                style={{
                  marginTop: '10px',
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '12px',
                  border: '1.5px dashed #0d9488',
                  animation: 'fadeIn 0.25s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '1.1rem' }}>🌍</span>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0f766e' }}>
                    Tạo thể loại bài viết mới (Thời sự, Thế giới, Chiến sự, Cuộc sống...)
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Nhập tên thể loại (VD: Chiến sự Trung Đông, Tình hình Quốc tế...)"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewCategory();
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.86rem',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewCategory}
                    disabled={!newCatName.trim() || creatingCatLoading}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #0d9488 0%, #047857 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.84rem',
                      cursor: !newCatName.trim() || creatingCatLoading ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {creatingCatLoading ? 'Đang tạo...' : 'Lưu & Chọn luôn ➔'}
                  </button>
                </div>

                {/* Khay chọn Icon nhanh */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Biểu tượng:</span>
                  {['🌍', '🕊️', '💣', '📰', '🌐', '🛡️', '⚖️', '🏛️', '💬', '☕', '🌱', '✨', '🔥', '💼'].map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewCatIcon(ic)}
                      style={{
                        background: newCatIcon === ic ? '#ccfbf1' : '#ffffff',
                        border: newCatIcon === ic ? '1.5px solid #0d9488' : '1px solid #e2e8f0',
                        borderRadius: '6px',
                        width: '28px',
                        height: '28px',
                        fontSize: '0.95rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transform: newCatIcon === ic ? 'scale(1.15)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                      title={`Chọn ${ic}`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ảnh bìa bài viết (Hỗ trợ Ảnh JPG/PNG và Ảnh động GIF 🎬) */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Ảnh bìa bài viết (Hỗ trợ JPG/PNG, GIF & Chụp trực tiếp 🎬)</label>
              <button
                type="button"
                className="page-btn"
                onClick={() => setIsCoverCameraOpen(true)}
                style={{
                  fontSize: '0.8rem',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#ecfdf5',
                  borderColor: '#6ee7b7',
                  color: '#047857',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                📸 Chụp từ Camera/Webcam
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="file"
                accept="image/*,.gif"
                onChange={handleCoverImageChange}
                disabled={uploadingCover}
                style={{ fontSize: '0.85rem' }}
              />
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>hoặc dán link GIF:</span>
              <input
                type="url"
                placeholder="https://.../cover.gif"
                value={formData.coverImage?.startsWith('http') ? formData.coverImage : ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, coverImage: e.target.value }))}
                style={{ flex: 1, minWidth: '180px', fontSize: '0.85rem', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              {uploadingCover && (
                <span style={{ fontSize: '0.85rem', color: 'var(--primary-hover)', fontWeight: 600 }}>
                  ☁️ Đang xử lý ảnh bìa/GIF...
                </span>
              )}
            </div>

            {formData.coverImage && (
              <div className="cover-preview-box">
                <img
                  src={formData.coverImage}
                  alt="Ảnh bìa bài viết hoặc GIF đã chọn"
                  className="cover-preview-img"
                />
                <button
                  type="button"
                  className="cover-remove-btn"
                  title="Xóa ảnh bìa"
                  onClick={handleRemoveCover}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Đoạn tóm tắt ngắn (1-2 câu hiển thị ở trang chủ) *</label>
            <input
              type="text"
              name="summary"
              placeholder="Tóm tắt ngắn gọn cảm xúc cốt lõi của bạn..."
              value={formData.summary}
              onChange={handleChange}
              required
            />
          </div>

          {/* Khu vực soạn thảo Visual WYSIWYG */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0 }}>Nội dung bài viết (Trực quan & Hỗ trợ Ctrl+Z) *</label>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  className={`toolbar-btn ${activeTab === 'edit' ? 'active' : ''}`}
                  onClick={() => setActiveTab('edit')}
                >
                  ✍️ Soạn thảo trực quan
                </button>
                <button
                  type="button"
                  className={`toolbar-btn ${activeTab === 'preview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('preview')}
                >
                  👁️ Xem trước
                </button>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <RichVisualEditor
                value={formData.content}
                onChange={handleContentChange}
                placeholder="Hãy thoải mái viết ra những gì bạn đang trăn trở. Chèn hình ảnh, video YouTube và icon cảm xúc để bộc lộ trọn vẹn cảm xúc của bạn..."
              />
            ) : (
              <div
                className="preview-pane"
                dangerouslySetInnerHTML={{
                  __html: formatPostContent(formData.content || '<em>(Chưa có nội dung để xem trước)</em>'),
                }}
              />
            )}
          </div>

          <div className="form-group">
            <label>Thẻ tag liên quan (cách nhau bằng dấu phẩy)</label>
            <input
              type="text"
              name="tags"
              placeholder="Burnout, OT, Deadline, Chuyển nghề, Quyết tâm"
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          <div className="form-group" style={{ marginTop: '14px', background: 'rgba(99, 102, 241, 0.05)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <label style={{ fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.95rem' }}>
              <span>🎧</span>
              <span>Cài đặt Giọng đọc A.I Tiếng Việt & Ngữ điệu vùng miền</span>
            </label>
            <p style={{ margin: '0 0 12px', fontSize: '0.8rem', color: '#64748b' }}>
              Bạn có thể chọn giọng đọc Nam hoặc Nữ, ngữ điệu vùng miền (Bắc / Trung / Nam) và tâm trạng mặc định khi người đọc bấm nút "Nghe AI đọc".
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '10px' }}>
              {/* Chọn Giới Tính Giọng Đọc */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  👤 Giới tính giọng đọc:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, voiceGender: 'female' }))}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: formData.voiceGender === 'female' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: formData.voiceGender === 'female' ? 'rgba(13, 148, 136, 0.1)' : '#ffffff',
                      color: formData.voiceGender === 'female' ? '#0d9488' : '#475569',
                      fontWeight: formData.voiceGender === 'female' ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>👩</span>
                    <span>Giọng Nữ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, voiceGender: 'male' }))}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: formData.voiceGender === 'male' ? '2px solid #0d9488' : '1px solid #cbd5e1',
                      background: formData.voiceGender === 'male' ? 'rgba(13, 148, 136, 0.1)' : '#ffffff',
                      color: formData.voiceGender === 'male' ? '#0d9488' : '#475569',
                      fontWeight: formData.voiceGender === 'male' ? 700 : 500,
                      cursor: 'pointer',
                      fontSize: '0.84rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>👨</span>
                    <span>Giọng Nam</span>
                  </button>
                </div>
              </div>

              {/* Chọn Ngôn Ngữ Vùng Miền */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  📍 Vùng miền đặc trưng:
                </label>
                <select
                  name="voiceRegion"
                  value={formData.voiceRegion || 'north'}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #c7d2fe',
                    fontSize: '0.84rem',
                    background: '#ffffff',
                    fontWeight: 600,
                    color: '#1e1b4b',
                  }}
                >
                  <option value="north">🏛️ Miền Bắc (Hà Nội - Chuẩn thanh lịch, đĩnh đạc)</option>
                  <option value="central">🏖️ Miền Trung (Huế & Đà Nẵng - Da diết, sâu lắng)</option>
                  <option value="south">🌴 Miền Nam (Sài Gòn - Ngọt ngào, phóng khoáng)</option>
                </select>
              </div>
            </div>

            {/* Chọn Cảm Xúc Bài Viết */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                🎭 Tâm trạng ngữ điệu:
              </label>
              <select
                name="audioMood"
                value={formData.audioMood || 'auto'}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #c7d2fe',
                  fontSize: '0.86rem',
                  background: '#ffffff',
                  fontWeight: 600,
                  color: '#1e1b4b',
                }}
              >
                <option value="auto">✨ Tự động theo tâm trạng (A.I tự phân tích cảm xúc từ ngữ)</option>
                <option value="melancholic">🌧️ Trầm buồn, sâu lắng & vỗ về (Tâm sự đêm muộn, burnout, áp lực)</option>
                <option value="uplifting">☀️ Vui tươi, tích cực & hứng khởi (Small wins, khởi sắc, truyền cảm hứng)</option>
                <option value="child">🎈 Hồn nhiên, trong trẻo (Giọng đọc trẻ em đáng yêu)</option>
                <option value="podcast">🎙️ Podcast truyền cảm (Chuẩn phát thanh viên Storyteller)</option>
                <option value="custom_voice">🧬 Giọng A.I nhân bản chính chủ (Dùng giọng thu âm của bạn)</option>
              </select>
            </div>
          </div>

          {/* Chế độ hiển thị bài viết (Công khai hoặc Chỉ bạn bè) */}
          <div className="form-group" style={{ marginTop: '14px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontWeight: 700, color: 'var(--bg-dark)', marginBottom: '8px', display: 'block' }}>
              🔒 Chế độ hiển thị bài viết
            </label>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={formData.visibility === 'public'}
                  onChange={() => setFormData({ ...formData, visibility: 'public' })}
                />
                <span>🌐 <strong>Công khai</strong> (Tất cả mọi người đều đọc được)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                <input
                  type="radio"
                  name="visibility"
                  value="friends"
                  checked={formData.visibility === 'friends'}
                  onChange={() => setFormData({ ...formData, visibility: 'friends' })}
                />
                <span>👥 <strong>Chỉ bạn bè</strong> (Chỉ bạn bè đã kết bạn mới xem được)</span>
              </label>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '14px', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: 'var(--bg-dark)', marginBottom: 0 }}>
              <input
                type="checkbox"
                checked={formData.showReactionCount}
                onChange={(e) => setFormData({ ...formData, showReactionCount: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              <span>👁️ Cho phép hiển thị số lượng bày tỏ cảm xúc trên bài viết</span>
            </label>
            <p style={{ margin: '4px 0 0 28px', fontSize: '0.82rem', color: '#64748b' }}>
              Nếu bỏ chọn, bài viết chỉ hiển thị các biểu tượng cảm xúc (Đồng Cảm 🫂, Stop 🛑, Yêu thích ❤️, Cố Lên 💪) mà không hiển thị con số cụ thể.
            </p>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: 'var(--bg-dark)', marginBottom: 0, marginTop: '12px' }}>
              <input
                type="checkbox"
                checked={formData.allowComments}
                onChange={(e) => setFormData({ ...formData, allowComments: e.target.checked })}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)', cursor: 'pointer' }}
              />
              <span>💬 Cho phép mọi người gửi bình luận & động viên dưới bài viết</span>
            </label>
            <p style={{ margin: '4px 0 0 28px', fontSize: '0.82rem', color: '#64748b' }}>
              {formData.allowComments
                ? 'Đang bật: Người đọc có thể gửi lời chia sẻ, bình luận và động viên bạn.'
                : 'Đang tắt: Khóa tính năng bình luận, không ai có thể bình luận dưới bài viết này (bạn có thể mở lại bất cứ lúc nào).'}
            </p>
          </div>

          {/* Cài đặt Không Gian Cảm Xúc & Background Đặc Trưng */}
          <PostAtmosphereSelector
            atmosphere={formData.atmosphere}
            onChange={(newAtmosphere) => setFormData((prev) => ({ ...prev, atmosphere: newAtmosphere }))}
          />

          <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
            <button
              type="button"
              className="page-btn"
              style={{ flex: 1 }}
              onClick={onClose}
            >
              Hủy
            </button>
            <button
              ref={submitButtonRef}
              type="submit"
              className="modal-submit-btn"
              style={{ flex: 2, margin: 0 }}
              disabled={loading || uploadingCover || importingDoc}
            >
              {loading ? 'Đang gửi...' : 'Đăng Tâm Sự Ngay'}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Camera / Webcam chụp ảnh bìa trực tiếp */}
      <MediaCameraCaptureModal
        isOpen={isCoverCameraOpen}
        onClose={() => setIsCoverCameraOpen(false)}
        onMediaCaptured={handleCoverCameraCaptured}
      />

      {/* Hiệu ứng Đăng Bài Viết hoành tráng theo Sự kiện Lễ Hội & 4 Mùa Thời Tiết */}
      {submitEffect && (
        <PostSubmitAtmosphereOverlay
          activeSeason={activeSeason}
          activeEvent={activeEvent}
          buttonRect={submitEffect.buttonRect}
          onComplete={() => {
            if (onPostCreated) {
              onPostCreated(submitEffect.createdData);
            }
            setLoading(false);
            setSubmitEffect(null);
            onClose();
          }}
        />
      )}
    </div>
  );
};
