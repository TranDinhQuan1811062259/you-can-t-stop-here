import React, { useState, useEffect, useRef } from 'react';
import { uploadService } from '../../services/uploadService';
import { extractYouTubeId } from '../../utils/contentFormatter';
import { postService } from '../../services/postService';
import { chatService } from '../../services/chatService';
import { MediaCameraCaptureModal } from './MediaCameraCaptureModal';

const CURATED_EMOJIS = [
  '🫂', '❤️', '💔', '🥀', '🌧️', '☕', '🥺', '😢', '🩹', '🕊️', '🧘', '💭', '🫶', '🕯️',
  '💼', '💻', '🚀', '💪', '🎯', '⏳', '💡', '🏆', '🌿', '☀️', '🔥', '✨', '📝', '🤝'
];

export const RichVisualEditor = ({ value, onChange, placeholder = 'Hãy thoải mái viết ra những gì bạn đang trăn trở...' }) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const inlineImageInputRef = useRef(null);
  const savedRangeRef = useRef(null);

  // Modal trạng thái chèn Video YouTube
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoPreviewId, setVideoPreviewId] = useState(null);

  // Modal trạng thái chèn Image URL
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Dropdown Emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modal Chụp ảnh & Quay video bằng Camera / Webcam
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Hệ thống Auto-suggest: # Hashtag & @ Mention Bạn bè
  const [suggestionMode, setSuggestionMode] = useState(null); // 'hashtag' | 'mention' | null
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [suggestionCoords, setSuggestionCoords] = useState({ top: 0, left: 0 });
  const [availableHashtags, setAvailableHashtags] = useState([
    'chuyennnganh', 'burnout', 'smallwins', 'congso', 'khoinghiep', 'tamsu', 'tamsucongso', 'vuotkho'
  ]);
  const [friendsList, setFriendsList] = useState([]);
  const [selectedSuggestIndex, setSelectedSuggestIndex] = useState(0);

  // Tải danh sách Hashtag & Bạn bè khi component mount
  useEffect(() => {
    postService
      .getHashtags()
      .then((res) => {
        if (Array.isArray(res?.data) && res.data.length > 0) {
          setAvailableHashtags(res.data);
        }
      })
      .catch(() => {});

    chatService
      .getFriends()
      .then((res) => {
        if (Array.isArray(res?.data)) {
          setFriendsList(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Cập nhật nội dung ban đầu vào contentEditable
  useEffect(() => {
    if (editorRef.current && value !== undefined) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  // ===============================================
  // LỌC KÝ TỰ RÁC KHI PASTE TỪ PDF / WORD
  // ===============================================
  const handlePaste = (e) => {
    e.preventDefault();

    // Ưu tiên lấy văn bản thuần túy để lọc sạch ký tự rác từ PDF
    const rawText = e.clipboardData.getData('text/plain');
    const rawHtml = e.clipboardData.getData('text/html');

    // Nếu có HTML sạch từ web (không phải PDF), dùng HTML
    if (rawHtml && !rawText.includes('Ξ') && !rawText.includes('≡') && !rawText.includes('Ô') && rawText.length < rawHtml.length * 2) {
      // Làm sạch HTML trước khi chèn: giữ định dạng cơ bản, bỏ tag nguy hiểm
      const cleanedHtml = sanitizeHtmlForPaste(rawHtml);
      document.execCommand('insertHTML', false, cleanedHtml);
    } else {
      // PDF/Word: chỉ lấy text thuần và làm sạch ký tự lạ
      const cleanText = sanitizePdfText(rawText);
      document.execCommand('insertText', false, cleanText);
    }

    handleInput();
  };

  // Làm sạch văn bản từ PDF (loại bỏ ký tự điều khiển, ký tự mã hóa lạ)
  const sanitizePdfText = (text) => {
    if (!text) return '';
    return text
      // Xóa ký tự điều khiển (control characters) trừ \n, \r, \t
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Chuẩn hóa dấu xuống dòng
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Xóa các ký tự biến thể Unicode lạ của PDF encoding (Latin Extended và ký tự mapping sai)
      .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
      // Chuẩn hóa khoảng trắng liên tiếp
      .replace(/[ \t]{3,}/g, '  ')
      // Giữ lại nguyên văn bản hợp lệ
      .trim();
  };

  // Làm sạch HTML khi paste từ web (giữ định dạng cơ bản)
  const sanitizeHtmlForPaste = (html) => {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;

    // Xóa script, style, link, meta, event attrs
    div.querySelectorAll('script,style,link,meta,iframe,object,embed').forEach(el => el.remove());
    div.querySelectorAll('*').forEach(el => {
      // Chỉ giữ lại một số thẻ định dạng cơ bản an toàn
      const allowed = ['b','strong','i','em','u','s','strike','br','p','h1','h2','h3','h4','ul','ol','li','blockquote','a','span','img'];
      if (!allowed.includes(el.tagName.toLowerCase())) {
        el.replaceWith(...el.childNodes);
        return;
      }
      // Xóa tất cả attribute nguy hiểm, chỉ giữ href, src, alt
      Array.from(el.attributes).forEach(attr => {
        if (!['href','src','alt','title'].includes(attr.name)) {
          el.removeAttribute(attr.name);
        }
      });
    });

    return div.innerHTML;
  };

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      if (onChange) {
        onChange(html);
      }
    }
  };

  // Thực thi lệnh định dạng nội dung chuẩn của trình duyệt (Tự động hỗ trợ Ctrl+Z / Ctrl+Y)
  const executeCmd = (command, val = null) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, val);
    handleInput();
  };

  const handleUndo = () => executeCmd('undo');
  const handleRedo = () => executeCmd('redo');

  const handleInsertEmoji = (emoji) => {
    executeCmd('insertText', emoji);
    setShowEmojiPicker(false);
  };

  // ===============================================
  // XỬ LÝ CHÈN VIDEO YOUTUBE
  // ===============================================
  const handleOpenVideoModal = () => {
    setVideoUrlInput('');
    setVideoPreviewId(null);
    setIsVideoModalOpen(true);
  };

  const handleVideoUrlChange = (e) => {
    const val = e.target.value;
    setVideoUrlInput(val);
    const vId = extractYouTubeId(val);
    setVideoPreviewId(vId);
  };

  const handleConfirmInsertVideo = () => {
    if (!videoPreviewId) {
      alert('Vui lòng nhập đường dẫn video YouTube hợp lệ!');
      return;
    }

    const embedHtml = `<div class="editor-video-card" contenteditable="false" data-youtube-id="${videoPreviewId}">
      <div class="video-container">
        <iframe src="https://www.youtube.com/embed/${videoPreviewId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    </div><p><br></p>`;

    executeCmd('insertHTML', embedHtml);
    setIsVideoModalOpen(false);
    setVideoUrlInput('');
    setVideoPreviewId(null);
  };

  // ===============================================
  // XỬ LÝ CHÈN ẢNH (TẢI TỪ MÁY HOẶC URL)
  // ===============================================
  const handleInlineImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      let finalUrl = event.target?.result;

      try {
        const uploadResult = await uploadService.uploadImage(file);
        if (uploadResult?.url) {
          finalUrl = uploadResult.url;
        }
      } catch (err) {
        console.warn('Lưu ảnh Base64 vào nội dung:', err.message);
      } finally {
        setUploadingImage(false);
      }

      const imgHtml = `<p><img src="${finalUrl}" alt="${file.name}" style="max-width: 100%; border-radius: 8px; margin: 14px 0; display: block;" /></p><p><br></p>`;
      executeCmd('insertHTML', imgHtml);
    };

    reader.readAsDataURL(file);

    if (inlineImageInputRef.current) {
      inlineImageInputRef.current.value = '';
    }
  };

  const handleConfirmInsertImageUrl = () => {
    if (!imageUrlInput.trim()) return;

    const imgHtml = `<p><img src="${imageUrlInput.trim()}" alt="Ảnh bài viết" style="max-width: 100%; border-radius: 8px; margin: 14px 0; display: block;" /></p><p><br></p>`;
    executeCmd('insertHTML', imgHtml);
    setIsImageModalOpen(false);
    setImageUrlInput('');
  };

  // ===============================================
  // XỬ LÝ ẢNH & VIDEO TỪ CAMERA / WEBCAM
  // ===============================================
  const handleMediaCaptured = (media) => {
    if (!media || !media.dataUrl) return;

    if (media.type === 'image') {
      const imgHtml = `<p><img src="${media.dataUrl}" alt="Ảnh chụp trực tiếp từ Camera" style="max-width: 100%; border-radius: 8px; margin: 14px 0; display: block; box-shadow: 0 4px 14px rgba(0,0,0,0.15);" /></p><p><br></p>`;
      executeCmd('insertHTML', imgHtml);
    } else if (media.type === 'video') {
      const vidHtml = `<div class="editor-captured-video-wrap" contenteditable="false" style="margin: 14px 0;">
        <video controls playsinline src="${media.dataUrl}" style="max-width: 100%; width: 100%; border-radius: 10px; background: #000; display: block; box-shadow: 0 4px 16px rgba(0,0,0,0.2);"></video>
      </div><p><br></p>`;
      executeCmd('insertHTML', vidHtml);
    }
    setIsCameraModalOpen(false);
  };

  // ===============================================
  // HỆ THỐNG GỢI Ý # (HASHTAG) VÀ @ (MENTION BẠN BÈ)
  // ===============================================
  const checkAutoSuggest = (e) => {
    // Không làm gián đoạn khi người dùng đang bấm phím điều hướng trong popover
    if (e && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape')) {
      return;
    }

    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setSuggestionMode(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const node = range.startContainer;

    if (node && node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      const caretOffset = range.startOffset;
      const textBefore = text.slice(0, caretOffset);

      // Nhận diện #hashtag
      const hashtagMatch = textBefore.match(/(?:^|[\s\u00A0])#([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]*)$/);
      // Nhận diện @mention
      const mentionMatch = textBefore.match(/(?:^|[\s\u00A0])@([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]*)$/);

      if (hashtagMatch) {
        const query = hashtagMatch[1];
        setSuggestionMode('hashtag');
        if (suggestionQuery !== query) {
          setSuggestionQuery(query);
          setSelectedSuggestIndex(0);
        }
        savedRangeRef.current = range.cloneRange();
        calculatePopoverPosition(range);
        return;
      } else if (mentionMatch) {
        const query = mentionMatch[1];
        setSuggestionMode('mention');
        if (suggestionQuery !== query) {
          setSuggestionQuery(query);
          setSelectedSuggestIndex(0);
        }
        savedRangeRef.current = range.cloneRange();
        calculatePopoverPosition(range);
        return;
      }
    }

    setSuggestionMode(null);
  };

  const calculatePopoverPosition = (range) => {
    try {
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current?.getBoundingClientRect();

      if (containerRect) {
        let left = rect.left - containerRect.left;
        let top = rect.bottom - containerRect.top + 8;

        // Tránh popover bị tràn ra mép container
        if (left + 260 > containerRect.width) {
          left = Math.max(10, containerRect.width - 270);
        }
        setSuggestionCoords({ top, left: Math.max(10, left) });
      }
    } catch (e) {
      setSuggestionCoords({ top: 120, left: 20 });
    }
  };

  // Chèn hashtag được chọn (tự động phân biệt thay thế từ gõ dở hoặc chèn mới tại con trỏ)
  const handleSelectHashtag = (tag) => {
    const cleanTag = tag.replace(/^#/, '').trim();
    if (!cleanTag) return;

    if (editorRef.current) {
      editorRef.current.focus();
    }

    const sel = window.getSelection();
    let range = null;

    if (savedRangeRef.current) {
      try {
        sel?.removeAllRanges();
        sel?.addRange(savedRangeRef.current);
        range = savedRangeRef.current;
      } catch (_) {}
    }

    if (!range && sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    }

    // Nếu không có selection hợp lệ trong editor, đặt con trỏ ở cuối editor
    if (!range || !editorRef.current?.contains(range.commonAncestorContainer)) {
      if (editorRef.current) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }

    let replaced = false;
    if (range) {
      const node = range.startContainer;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const caretPos = range.startOffset;
        const textBefore = text.slice(0, caretPos);
        const match = textBefore.match(/(?:^|[\s\u00A0])#([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]*)$/);

        if (match) {
          const queryPart = '#' + match[1];
          const startIdx = textBefore.lastIndexOf(queryPart);

          if (startIdx >= 0) {
            const replaceRange = document.createRange();
            replaceRange.setStart(node, startIdx);
            replaceRange.setEnd(node, caretPos);
            replaceRange.deleteContents();

            // Chèn pill hashtag đẹp mắt
            const span = document.createElement('span');
            span.className = 'editor-hashtag-pill';
            span.textContent = `#${cleanTag}`;
            span.contentEditable = 'false';
            replaceRange.insertNode(span);

            const space = document.createTextNode('\u00A0');
            span.after(space);

            const newRange = document.createRange();
            newRange.setStartAfter(space);
            newRange.setEndAfter(space);
            sel?.removeAllRanges();
            sel?.addRange(newRange);
            savedRangeRef.current = newRange.cloneRange();
            replaced = true;
          }
        }
      }

      // Nếu không có # gõ dở phía trước, chèn trực tiếp vào vị trí con trỏ
      if (!replaced) {
        const span = document.createElement('span');
        span.className = 'editor-hashtag-pill';
        span.textContent = `#${cleanTag}`;
        span.contentEditable = 'false';

        range.deleteContents();
        range.insertNode(span);

        const space = document.createTextNode('\u00A0');
        span.after(space);

        const newRange = document.createRange();
        newRange.setStartAfter(space);
        newRange.setEndAfter(space);
        sel?.removeAllRanges();
        sel?.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      }
    }

    // Đăng ký lưu thêm hashtag nếu chưa có trong kho
    if (!availableHashtags.some((t) => t.toLowerCase() === cleanTag.toLowerCase())) {
      postService.addHashtag(cleanTag).catch(() => {});
      setAvailableHashtags((prev) => [...prev, cleanTag]);
    }

    handleInput();
    setSuggestionMode(null);
  };

  // Chèn mention bạn bè (tự động phân biệt thay thế từ gõ dở hoặc chèn mới tại con trỏ)
  const handleSelectFriend = (friend) => {
    if (!friend) return;
    const friendName = friend.name || 'Bạn bè';

    if (editorRef.current) {
      editorRef.current.focus();
    }

    const sel = window.getSelection();
    let range = null;

    if (savedRangeRef.current) {
      try {
        sel?.removeAllRanges();
        sel?.addRange(savedRangeRef.current);
        range = savedRangeRef.current;
      } catch (_) {}
    }

    if (!range && sel && sel.rangeCount > 0) {
      range = sel.getRangeAt(0);
    }

    if (!range || !editorRef.current?.contains(range.commonAncestorContainer)) {
      if (editorRef.current) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }

    let replaced = false;
    if (range) {
      const node = range.startContainer;
      if (node && node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || '';
        const caretPos = range.startOffset;
        const textBefore = text.slice(0, caretPos);
        const match = textBefore.match(/(?:^|[\s\u00A0])@([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]*)$/);

        if (match) {
          const queryPart = '@' + match[1];
          const startIdx = textBefore.lastIndexOf(queryPart);

          if (startIdx >= 0) {
            const replaceRange = document.createRange();
            replaceRange.setStart(node, startIdx);
            replaceRange.setEnd(node, caretPos);
            replaceRange.deleteContents();

            const span = document.createElement('span');
            span.className = 'editor-mention-pill';
            span.setAttribute('data-user-id', friend._id || '');
            span.textContent = `@${friendName}`;
            span.contentEditable = 'false';
            replaceRange.insertNode(span);

            const space = document.createTextNode('\u00A0');
            span.after(space);

            const newRange = document.createRange();
            newRange.setStartAfter(space);
            newRange.setEndAfter(space);
            sel?.removeAllRanges();
            sel?.addRange(newRange);
            savedRangeRef.current = newRange.cloneRange();
            replaced = true;
          }
        }
      }

      if (!replaced) {
        const span = document.createElement('span');
        span.className = 'editor-mention-pill';
        span.setAttribute('data-user-id', friend._id || '');
        span.textContent = `@${friendName}`;
        span.contentEditable = 'false';

        range.deleteContents();
        range.insertNode(span);

        const space = document.createTextNode('\u00A0');
        span.after(space);

        const newRange = document.createRange();
        newRange.setStartAfter(space);
        newRange.setEndAfter(space);
        sel?.removeAllRanges();
        sel?.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();
      }
    }

    handleInput();
    setSuggestionMode(null);
  };

  // Điều hướng bằng bàn phím trong danh sách gợi ý (Phím Up / Down / Enter / Tab / Esc)
  const handleKeyDown = (e) => {
    if (!suggestionMode) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setSuggestionMode(null);
      return;
    }

    if (suggestionMode === 'hashtag') {
      const filtered = availableHashtags.filter((t) =>
        t.toLowerCase().includes(suggestionQuery.toLowerCase())
      );
      const hasCreateNew =
        suggestionQuery.trim() &&
        !availableHashtags.some((t) => t.toLowerCase() === suggestionQuery.trim().toLowerCase());
      const totalCount = filtered.length + (hasCreateNew ? 1 : 0);

      if (totalCount === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedSuggestIndex((prev) => (prev + 1) % totalCount);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedSuggestIndex((prev) => (prev - 1 + totalCount) % totalCount);
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedSuggestIndex < filtered.length) {
          handleSelectHashtag(filtered[selectedSuggestIndex]);
        } else if (hasCreateNew) {
          handleSelectHashtag(suggestionQuery.trim());
        }
        return;
      }
    } else if (suggestionMode === 'mention') {
      const filtered = friendsList.filter((f) =>
        (f.name || '').toLowerCase().includes(suggestionQuery.toLowerCase())
      );
      const totalCount = filtered.length;

      if (totalCount === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedSuggestIndex((prev) => (prev + 1) % totalCount);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedSuggestIndex((prev) => (prev - 1 + totalCount) % totalCount);
        return;
      }

      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        if (filtered[selectedSuggestIndex]) {
          handleSelectFriend(filtered[selectedSuggestIndex]);
        }
        return;
      }
    }
  };

  // Lọc danh sách hiển thị
  const filteredHashtags = availableHashtags.filter((t) =>
    t.toLowerCase().includes(suggestionQuery.toLowerCase())
  );
  const filteredFriends = friendsList.filter((f) =>
    (f.name || '').toLowerCase().includes(suggestionQuery.toLowerCase())
  );

  return (
    <div className="rich-visual-editor-container" ref={containerRef} style={{ position: 'relative' }}>
      {/* Thanh công cụ định dạng chuyên nghiệp */}
      <div className="visual-toolbar">
        {/* Undo / Redo */}
        <button
          type="button"
          className="toolbar-btn"
          title="Hoàn tác (Ctrl + Z)"
          onClick={handleUndo}
        >
          ↶ Hoàn tác
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Làm lại (Ctrl + Y)"
          onClick={handleRedo}
        >
          ↷ Làm lại
        </button>

        <div className="toolbar-divider" />

        {/* Định dạng văn bản */}
        <button
          type="button"
          className="toolbar-btn"
          title="In đậm (Ctrl + B)"
          onClick={() => executeCmd('bold')}
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="In nghiêng (Ctrl + I)"
          onClick={() => executeCmd('italic')}
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Gạch chân (Ctrl + U)"
          onClick={() => executeCmd('underline')}
        >
          <u>U</u>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Tiêu đề phụ"
          onClick={() => executeCmd('formatBlock', '<h3>')}
        >
          H3
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Đoạn văn thường"
          onClick={() => executeCmd('formatBlock', '<p>')}
        >
          Văn bản
        </button>
        <button
          type="button"
          className="toolbar-btn"
          title="Trích dẫn tâm sự"
          onClick={() => executeCmd('formatBlock', '<blockquote>')}
        >
          ❝ Trích dẫn
        </button>

        <div className="toolbar-divider" />

        {/* Chèn Emoji cảm xúc */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className="toolbar-btn"
            title="Chèn biểu tượng cảm xúc"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            😀 Cảm xúc
          </button>

          {showEmojiPicker && (
            <div className="emoji-popover">
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
                Chọn biểu cảm sẻ chia:
              </div>
              <div className="emoji-grid">
                {CURATED_EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="emoji-btn"
                    onClick={() => handleInsertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chụp Ảnh / Quay Video bằng Camera / Webcam */}
        <button
          type="button"
          className="toolbar-btn toolbar-btn-camera"
          title="Chụp ảnh hoặc quay video trực tiếp bằng Camera điện thoại hoặc Webcam máy tính"
          onClick={() => setIsCameraModalOpen(true)}
          style={{ background: '#ecfdf5', borderColor: '#6ee7b7', color: '#047857', fontWeight: 600 }}
        >
          📸 Camera / 🎥 Webcam
        </button>

        {/* Chèn Video YouTube */}
        <button
          type="button"
          className="toolbar-btn"
          title="Nhúng video YouTube với khung xem trực tiếp"
          onClick={handleOpenVideoModal}
          style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626', fontWeight: 600 }}
        >
          🎬 Video YouTube
        </button>

        {/* Tải ảnh từ máy tính */}
        <button
          type="button"
          className="toolbar-btn"
          title="Tải ảnh hoặc GIF từ máy tính lên nội dung bài"
          onClick={() => inlineImageInputRef.current?.click()}
          disabled={uploadingImage}
        >
          {uploadingImage ? '⏳ Đang tải...' : '🖼️ Ảnh/GIF từ máy'}
        </button>
        <input
          type="file"
          ref={inlineImageInputRef}
          accept="image/*,.gif"
          style={{ display: 'none' }}
          onChange={handleInlineImageUpload}
        />

        {/* Chèn ảnh từ URL */}
        <button
          type="button"
          className="toolbar-btn"
          title="Chèn ảnh từ link mạng"
          onClick={() => {
            setImageUrlInput('');
            setIsImageModalOpen(true);
          }}
        >
          🔗 Link ảnh
        </button>

        <button
          type="button"
          className="toolbar-btn"
          title="Đường kẻ ngang phân cách"
          onClick={() => executeCmd('insertHorizontalRule')}
        >
          ➖ Dòng kẻ
        </button>
      </div>

      {/* Hướng dẫn phím tắt # và @ */}
      <div className="editor-hint-bar">
        <span>💡 Gõ <strong>#</strong> để gợi ý & tạo hashtag mới • Gõ <strong>@</strong> để tag bạn bè (chỉ tag khi chọn bạn, nếu không sẽ giữ nguyên văn bản)</span>
      </div>

      {/* Khung soạn thảo Visual Trực quan (WYSIWYG) */}
      <div
        ref={editorRef}
        className="visual-editor-canvas"
        contentEditable={true}
        suppressContentEditableWarning={true}
        onInput={handleInput}
        onKeyUp={checkAutoSuggest}
        onKeyDown={handleKeyDown}
        onClick={checkAutoSuggest}
        onPaste={handlePaste}
        data-placeholder={placeholder}
      />

      {/* ========================================================
          POPOVER GỢI Ý # (HASHTAG)
          ======================================================== */}
      {suggestionMode === 'hashtag' && (
        <div
          className="editor-suggestion-popover hashtag-popover"
          style={{ top: `${suggestionCoords.top}px`, left: `${suggestionCoords.left}px` }}
        >
          <div className="suggestion-popover-header">
            <span>🏷️ Gợi ý Hashtag</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Gõ tiếp hoặc click chọn</span>
          </div>

          <div className="suggestion-list">
            {filteredHashtags.map((tag, idx) => (
              <button
                key={tag}
                type="button"
                className={`suggestion-item ${idx === selectedSuggestIndex ? 'active' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectHashtag(tag);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectHashtag(tag);
                }}
              >
                <span className="suggestion-hash">#</span>
                <span className="suggestion-name">{tag}</span>
              </button>
            ))}

            {/* Mục tạo hashtag mới nếu từ khóa chưa tồn tại */}
            {suggestionQuery.trim() &&
              !availableHashtags.some((t) => t.toLowerCase() === suggestionQuery.trim().toLowerCase()) && (
                <button
                  type="button"
                  className={`suggestion-item suggestion-item-create ${selectedSuggestIndex === filteredHashtags.length ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectHashtag(suggestionQuery.trim());
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectHashtag(suggestionQuery.trim());
                  }}
                >
                  <span className="suggestion-plus">✨</span>
                  <span className="suggestion-name">
                    Tạo hashtag mới: <strong>#{suggestionQuery.trim()}</strong>
                  </span>
                </button>
              )}
          </div>
        </div>
      )}

      {/* ========================================================
          POPOVER GỢI Ý @ (MENTION BẠN BÈ)
          ======================================================== */}
      {suggestionMode === 'mention' && (
        <div
          className="editor-suggestion-popover mention-popover"
          style={{ top: `${suggestionCoords.top}px`, left: `${suggestionCoords.left}px` }}
        >
          <div className="suggestion-popover-header">
            <span>👥 Gắn thẻ Bạn bè</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Danh bạ bạn bè của bạn</span>
          </div>

          <div className="suggestion-list">
            {filteredFriends.length > 0 ? (
              filteredFriends.map((friend, idx) => (
                <button
                  key={friend._id}
                  type="button"
                  className={`suggestion-item friend-item ${idx === selectedSuggestIndex ? 'active' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectFriend(friend);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectFriend(friend);
                  }}
                >
                  <img
                    src={friend.avatar || '/images/man.jpg'}
                    alt={friend.name}
                    className="suggestion-avatar"
                  />
                  <div className="friend-info">
                    <span className="friend-name">{friend.name}</span>
                    <span className="friend-role">{friend.jobTitle || friend.role || 'Bạn bè'}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="suggestion-empty-tip">
                {friendsList.length === 0 ? (
                  <span>Bạn chưa có bạn bè trong danh bạ để tag. Hãy kết bạn ở mục Tin nhắn!</span>
                ) : (
                  <span>Không tìm thấy bạn nào khớp với "@<strong>{suggestionQuery}</strong>". Bạn cứ viết tiếp văn bản bình thường nha!</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL CAMERA & WEBCAM CHỤP ẢNH / QUAY VIDEO TRỰC TIẾP
          ======================================================== */}
      <MediaCameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onMediaCaptured={handleMediaCaptured}
      />

      {/* ========================================================
          BẢNG GỢI Ý HASHTAG INLINE - Hiển thị ngay dưới editor
          ======================================================== */}
      <div className="editor-inline-panel">
        <div className="inline-panel-section">
          <span className="inline-panel-label">🏷️ Hashtag gợi ý <em>(click để chèn vào bài)</em></span>
          <div className="inline-hashtag-cloud">
            {availableHashtags.slice(0, 20).map((tag) => (
              <button
                key={tag}
                type="button"
                className="inline-hashtag-chip"
                title={`Chèn hashtag #${tag} vào bài`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectHashtag(tag);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectHashtag(tag);
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {friendsList.length > 0 && (
          <div className="inline-panel-section">
            <span className="inline-panel-label">👥 Bạn bè <em>(click @ để tag)</em></span>
            <div className="inline-friends-row">
              {friendsList.slice(0, 10).map((friend) => (
                <button
                  key={friend._id}
                  type="button"
                  className="inline-friend-chip"
                  title={`Tag @${friend.name || 'bạn bè'} vào bài`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelectFriend(friend);
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    handleSelectFriend(friend);
                  }}
                >
                  <img
                    src={friend.avatar || '/images/man.jpg'}
                    alt={friend.name}
                    className="inline-friend-avatar"
                  />
                  <span>@{friend.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================
          CỬA SỔ PHỤ: CHÈN VIDEO YOUTUBE
          ======================================================== */}
      {isVideoModalOpen && (
        <div className="sub-modal-overlay" onClick={() => setIsVideoModalOpen(false)}>
          <div className="sub-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
                🎬 Chèn Video YouTube vào bài viết
              </h4>
              <button
                type="button"
                className="modal-close-btn"
                style={{ position: 'static' }}
                onClick={() => setIsVideoModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: '0.86rem', color: '#64748b', marginBottom: '14px' }}>
              Dán liên kết YouTube để nhúng trực tiếp video phát cùng bài tâm sự:
            </p>

            <div className="form-group">
              <label>Link Video YouTube (URL)</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                value={videoUrlInput}
                onChange={handleVideoUrlChange}
                autoFocus
              />
            </div>

            {videoPreviewId ? (
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  ✓ Đã nhận diện video:
                </span>
                <div className="video-container" style={{ margin: '0 auto', maxHeight: '220px' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${videoPreviewId}`}
                    title="YouTube Preview"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
              </div>
            ) : videoUrlInput.trim() ? (
              <div style={{ fontSize: '0.8rem', color: '#e11d48', marginBottom: '12px' }}>
                ⚠️ Chưa nhận diện được mã video. Vui lòng kiểm tra lại đường dẫn!
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="page-btn"
                onClick={() => setIsVideoModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="modal-submit-btn"
                style={{ margin: 0, background: '#e11d48' }}
                onClick={handleConfirmInsertVideo}
                disabled={!videoPreviewId}
              >
                Chèn Video Vào Bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CỬA SỔ PHỤ: CHÈN HÌNH ẢNH TỪ URL
          ======================================================== */}
      {isImageModalOpen && (
        <div className="sub-modal-overlay" onClick={() => setIsImageModalOpen(false)}>
          <div className="sub-modal-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b' }}>
                🔗 Chèn Hình Ảnh từ Đường Dẫn (URL)
              </h4>
              <button
                type="button"
                className="modal-close-btn"
                style={{ position: 'static' }}
                onClick={() => setIsImageModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="form-group">
              <label>Đường dẫn hình ảnh (URL)</label>
              <input
                type="text"
                placeholder="https://example.com/hinh-anh.jpg"
                value={imageUrlInput}
                onChange={(e) => setImageUrlInput(e.target.value)}
                autoFocus
              />
            </div>

            {imageUrlInput.trim() && (
              <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '6px' }}>
                  Xem trước hình ảnh:
                </span>
                <img
                  src={imageUrlInput.trim()}
                  alt="Preview"
                  style={{ maxHeight: '180px', borderRadius: '6px', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="page-btn"
                onClick={() => setIsImageModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="modal-submit-btn"
                style={{ margin: 0 }}
                onClick={handleConfirmInsertImageUrl}
                disabled={!imageUrlInput.trim()}
              >
                Chèn Ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
