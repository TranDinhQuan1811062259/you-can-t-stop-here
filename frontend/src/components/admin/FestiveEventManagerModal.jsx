import React, { useState, useEffect, useMemo } from 'react';
import { eventService } from '../../services/eventService';
import { playClickSound, playFestiveEventSound } from '../../utils/soundEffects';

const PRESET_PARTICLE_PACKS = [
  { label: '🇻🇳 Cờ Tổ Quốc & Pháo Hoa', particles: ['🇻🇳', '⭐', '🕊️', '✨', '🎆'], type: 'vietnam_flag' },
  { label: '🌹 Hoa Hồng & Trái Tim', particles: ['🌹', '🌷', '🌸', '🎀', '💖', '✨'], type: 'flower_petals' },
  { label: '🎈 Bong Bóng Tuổi Thơ', particles: ['🎈', '🍭', '🎡', '🧸', '⭐', '✨'], type: 'balloons' },
  { label: '🧧 Lì Xì & Hoa Mai Đào Tết', particles: ['🌸', '🌼', '🧧', '🏮', '🧨', '✨'], type: 'tet_blossoms' },
  { label: '🎆 Pháo Hoa & Kim Tuyến', particles: ['🎆', '✨', '🍾', '🎊', '🎉', '🥂'], type: 'fireworks' },
  { label: '🏮 Đèn Lồng & Trăng Rằm', particles: ['🏮', '🌕', '🥮', '⭐', '✨'], type: 'lanterns' },
  { label: '🎄 Giáng Sinh & Tuyết Trắng', particles: ['❄️', '🎄', '🔔', '🎁', '🎅'], type: 'christmas' },
  { label: '🌻 Hoa Hướng Dương & Tri Ân', particles: ['🌻', '📖', '🖋️', '💐', '✨'], type: 'sunflowers' },
];

export const FestiveEventManagerModal = ({ isOpen, onClose, onEventUpdated }) => {
  const [events, setEvents] = useState([]);
  const [previewEventId, setPreviewEventId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingEvent, setEditingEvent] = useState(null);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'active' | 'custom' | 'inactive'

  // Form data for creating or editing custom event
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    icon: '🎉',
    bannerTitle: '',
    bannerDesc: '',
    startDay: 1,
    startMonth: 1,
    durationDays: 3,
    particlesStr: '🎉, ✨, 🌟, 💖',
    particleType: 'custom',
    themeColor: '#dc2626',
    accentColor: '#facc15',
    isActive: true,
  });

  const loadEvents = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await eventService.getEvents();
      if (res?.data) {
        setEvents(res.data.events || []);
        setPreviewEventId(res.data.previewEventId || null);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Không thể tải danh sách sự kiện lễ hội');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEvents();
      setActiveTab('list');
      setMessage('');
      setErrorMsg('');
      setSearchQuery('');
      setFilterType('all');
    }
  }, [isOpen]);

  // Bộ lọc danh sách sự kiện
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Lọc theo từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = ev.name?.toLowerCase().includes(q);
        const matchShort = ev.shortName?.toLowerCase().includes(q);
        const matchSlogan = ev.bannerTitle?.toLowerCase().includes(q);
        const matchDate = `${ev.startDay}/${ev.startMonth}`.includes(q);
        if (!matchName && !matchShort && !matchSlogan && !matchDate) return false;
      }

      // Lọc theo trạng thái
      if (filterType === 'active') {
        return ev.isCurrentlyActive;
      }
      if (filterType === 'custom') {
        return !ev.isBuiltin;
      }
      if (filterType === 'inactive') {
        return ev.isActive === false;
      }
      return true;
    });
  }, [events, searchQuery, filterType]);

  const activeCount = useMemo(() => events.filter((e) => e.isCurrentlyActive).length, [events]);
  const customCount = useMemo(() => events.filter((e) => !e.isBuiltin).length, [events]);

  if (!isOpen) return null;

  const handleToggleActive = async (event) => {
    playClickSound();
    try {
      const nextActive = !event.isActive;
      if (nextActive) {
        playFestiveEventSound(event);
      }
      await eventService.updateEvent(event.id, { isActive: nextActive });
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isActive: nextActive } : e))
      );
      setMessage(`Đã ${nextActive ? 'bật' : 'tắt'} sự kiện "${event.name}" thành công!`);
      if (onEventUpdated) onEventUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật trạng thái sự kiện');
    }
  };

  const handleTogglePreview = async (event) => {
    playClickSound();
    try {
      const targetId = previewEventId === event.id ? null : event.id;
      if (targetId) {
        // Phát âm thanh đặc trưng của sự kiện khi bật thử nghiệm
        playFestiveEventSound(event);
      }
      const res = await eventService.previewEvent(targetId);
      setPreviewEventId(res?.data?.previewEventId || null);
      setEvents((prev) =>
        prev.map((e) => ({
          ...e,
          isPreview: e.id === targetId,
          isCurrentlyActive: e.id === targetId ? true : e.isToday,
        }))
      );
      setMessage(
        targetId
          ? `✓ Đang kích hoạt thử nghiệm giao diện sự kiện: "${event.name}"!`
          : '✓ Đã tắt chế độ thử nghiệm sự kiện. Trở về trạng thái theo lịch tự nhiên.'
      );
      window.dispatchEvent(new CustomEvent('freedom_festive_event_changed'));
      if (onEventUpdated) onEventUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi bật chế độ xem thử sự kiện');
    }
  };

  const handleStartEdit = (event) => {
    playClickSound();
    setEditingEvent(event);
    setFormData({
      name: event.name || '',
      shortName: event.shortName || '',
      icon: event.icon || '🎉',
      bannerTitle: event.bannerTitle || '',
      bannerDesc: event.bannerDesc || '',
      startDay: event.startDay || 1,
      startMonth: event.startMonth || 1,
      durationDays: event.durationDays || 3,
      particlesStr: Array.isArray(event.particles) ? event.particles.join(', ') : '✨, 🌟',
      particleType: event.particleType || 'custom',
      themeColor: event.themeColor || '#dc2626',
      accentColor: event.accentColor || '#facc15',
      isActive: event.isActive !== false,
    });
    setActiveTab('edit');
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    playClickSound();
    try {
      const particles = formData.particlesStr
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      const payload = {
        name: formData.name.trim(),
        shortName: formData.shortName.trim() || formData.name.trim(),
        icon: formData.icon.trim() || '🎉',
        bannerTitle: formData.bannerTitle.trim(),
        bannerDesc: formData.bannerDesc.trim(),
        startDay: Number(formData.startDay),
        startMonth: Number(formData.startMonth),
        durationDays: Math.max(1, Number(formData.durationDays)),
        particles: particles.length ? particles : ['✨'],
        particleType: formData.particleType,
        themeColor: formData.themeColor,
        accentColor: formData.accentColor,
        isActive: formData.isActive,
      };

      if (activeTab === 'edit' && editingEvent) {
        await eventService.updateEvent(editingEvent.id, payload);
        setMessage(`✓ Đã cập nhật thành công sự kiện "${payload.name}"!`);
      } else {
        await eventService.createEvent(payload);
        setMessage(`✓ Đã tạo thành công sự kiện mới "${payload.name}"!`);
      }

      await loadEvents();
      setActiveTab('list');
      setEditingEvent(null);
      window.dispatchEvent(new CustomEvent('freedom_festive_event_changed'));
      if (onEventUpdated) onEventUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Không thể lưu cài đặt sự kiện');
    }
  };

  const handleDeleteCustomEvent = async (event) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sự kiện "${event.name}" không?`)) {
      return;
    }
    playClickSound();
    try {
      await eventService.deleteEvent(event.id);
      setMessage(`Đã xóa sự kiện "${event.name}" thành công!`);
      await loadEvents();
      window.dispatchEvent(new CustomEvent('freedom_festive_event_changed'));
      if (onEventUpdated) onEventUpdated();
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi khi xóa sự kiện');
    }
  };

  const handleSelectParticlePack = (pack) => {
    playClickSound();
    setFormData((prev) => ({
      ...prev,
      particleType: pack.type,
      particlesStr: pack.particles.join(', '),
    }));
  };

  return (
    <div className="festive-mgmt-backdrop" onClick={onClose}>
      <div className="festive-mgmt-modal" onClick={(e) => e.stopPropagation()}>
        {/* Nút Đóng Modal */}
        <button
          type="button"
          className="festive-mgmt-close-btn"
          onClick={onClose}
          title="Đóng bảng quản lý"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="festive-mgmt-header">
          <div className="festive-mgmt-header-icon">🎊</div>
          <div className="festive-mgmt-header-text">
            <h3 className="festive-mgmt-title">
              Quản Lý Sự Kiện Lễ Hội Trong Năm Theo Lịch
            </h3>
            <p className="festive-mgmt-subtitle">
              Tự động kích hoạt hiệu ứng cờ hoa, pháo hoa, bóng bay, lì xì và banner chào mừng theo lịch dương hoặc tùy chỉnh.
            </p>
          </div>
        </div>

        {/* Thông báo trạng thái Preview đang bật */}
        {previewEventId && (
          <div className="festive-mgmt-preview-banner">
            <div className="festive-preview-info">
              <span className="festive-preview-icon">👁️</span>
              <div className="festive-preview-text">
                <span className="festive-preview-label">Đang bật Thử Nghiệm Giao Diện:</span>
                <strong className="festive-preview-name">
                  {events.find((e) => e.id === previewEventId)?.name || previewEventId}
                </strong>
              </div>
            </div>
            <button
              type="button"
              className="festive-preview-btn-stop"
              onClick={() => handleTogglePreview({ id: previewEventId })}
            >
              ⏹ Tắt Thử Nghiệm
            </button>
          </div>
        )}

        {/* Alert thông báo phản hồi */}
        {message && (
          <div className="festive-mgmt-alert success">
            <span>✓</span> {message}
          </div>
        )}

        {errorMsg && (
          <div className="festive-mgmt-alert error">
            <span>⚠</span> {errorMsg}
          </div>
        )}

        {/* Thanh Tabs Chuyển Đổi */}
        <div className="festive-mgmt-nav">
          <button
            type="button"
            className={`festive-nav-tab ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => {
              playClickSound();
              setActiveTab('list');
            }}
          >
            📋 Danh Sách Sự Kiện ({events.length})
          </button>
          <button
            type="button"
            className={`festive-nav-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => {
              playClickSound();
              setEditingEvent(null);
              setFormData({
                name: '',
                shortName: '',
                icon: '🎉',
                bannerTitle: '',
                bannerDesc: '',
                startDay: new Date().getDate(),
                startMonth: new Date().getMonth() + 1,
                durationDays: 3,
                particlesStr: '🎉, ✨, 🌟, 💖',
                particleType: 'custom',
                themeColor: '#0d9488',
                accentColor: '#2dd4bf',
                isActive: true,
              });
              setActiveTab('create');
            }}
          >
            ➕ Thêm Sự Kiện Mới (Custom)
          </button>
          {activeTab === 'edit' && (
            <button
              type="button"
              className="festive-nav-tab active"
            >
              ✏️ Sửa: {editingEvent?.name}
            </button>
          )}
        </div>

        {/* TAB 1: DANH SÁCH SỰ KIỆN MỞ RỘNG TO & THOÁNG */}
        {activeTab === 'list' && (
          <div className="festive-mgmt-list-container">
            {/* Thanh tìm kiếm & Bộ lọc nhanh */}
            <div className="festive-mgmt-filter-bar">
              <div className="festive-search-box">
                <span className="festive-search-icon">🔍</span>
                <input
                  type="text"
                  className="festive-search-input"
                  placeholder="Tìm theo tên sự kiện (30/4, 2/9, Tết...), ngày tháng, khẩu hiệu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="festive-search-clear"
                    onClick={() => setSearchQuery('')}
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="festive-filter-chips">
                <button
                  type="button"
                  className={`festive-filter-chip ${filterType === 'all' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound();
                    setFilterType('all');
                  }}
                >
                  Tất cả ({events.length})
                </button>
                <button
                  type="button"
                  className={`festive-filter-chip ${filterType === 'active' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound();
                    setFilterType('active');
                  }}
                >
                  🟢 Đang Diễn Ra ({activeCount})
                </button>
                <button
                  type="button"
                  className={`festive-filter-chip ${filterType === 'custom' ? 'active' : ''}`}
                  onClick={() => {
                    playClickSound();
                    setFilterType('custom');
                  }}
                >
                  ✨ Tùy Biến ({customCount})
                </button>
              </div>
            </div>

            {/* Vùng cuộn danh sách thẻ sự kiện - Thoáng đãng, có thanh cuộn mượt và vùng đệm đáy 160px để không bao giờ bị che khuất thẻ cuối cùng */}
            <div
              className="festive-mgmt-cards-scroll"
              style={{
                flex: '1 1 auto',
                minHeight: 0,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
                paddingRight: '8px',
                paddingBottom: '40px',
              }}
            >
              {loading ? (
                <div className="festive-mgmt-empty-state">
                  <div className="festive-mgmt-spinner" />
                  <p>Đang tải danh sách sự kiện lễ hội...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="festive-mgmt-empty-state">
                  <span style={{ fontSize: '3rem' }}>🔍</span>
                  <h4>Không tìm thấy sự kiện phù hợp</h4>
                  <p>Thử nhập từ khóa khác hoặc nhấn "Tất cả" để xem toàn bộ sự kiện.</p>
                  <button
                    type="button"
                    className="festive-filter-chip active"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                    }}
                  >
                    Xem tất cả ({events.length}) sự kiện
                  </button>
                </div>
              ) : (
                <div className="festive-mgmt-cards-list" style={{ paddingBottom: '160px' }}>
                  {filteredEvents.map((ev) => {
                    const isPreviewing = ev.id === previewEventId;
                    const isCurrentlyActive = ev.isCurrentlyActive;
                    const endDay = Number(ev.startDay) + Number(ev.durationDays) - 1;

                    return (
                      <div
                        key={ev.id}
                        className={`festive-mgmt-card ${isCurrentlyActive ? 'card-active' : ''} ${isPreviewing ? 'card-preview' : ''}`}
                      >
                        {/* Biểu tượng Icon sự kiện */}
                        <div className="festive-card-icon-col">
                          <div className="festive-card-icon-bubble">
                            {ev.icon || '🎉'}
                          </div>
                        </div>

                        {/* Cột Chi Tiết Thông Tin Sự Kiện */}
                        <div className="festive-card-content-col">
                          <div className="festive-card-title-row">
                            <span className="festive-card-name">{ev.name}</span>

                            <div className="festive-card-badges">
                              {isPreviewing && (
                                <span className="festive-badge badge-preview">
                                  👁️ ĐANG THỬ NGHIỆM
                                </span>
                              )}
                              {ev.isToday && !isPreviewing && (
                                <span className="festive-badge badge-today">
                                  🟢 ĐANG DIỄN RA HÔM NAY
                                </span>
                              )}
                              {!ev.isBuiltin && (
                                <span className="festive-badge badge-custom">
                                  Tùy Biến (Custom)
                                </span>
                              )}
                              {ev.isActive === false && (
                                <span className="festive-badge badge-disabled">
                                  Đang Tắt Tự Động
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Dòng ngày tháng & Thời lượng */}
                          <div className="festive-card-schedule-row">
                            <span className="schedule-item">
                              📅 Bắt đầu: <strong>Ngày {ev.startDay}/{ev.startMonth}</strong>
                            </span>
                            <span className="schedule-dot">•</span>
                            <span className="schedule-item">
                              ⏱️ Thời lượng: <strong>{ev.durationDays} ngày</strong> (đến hết ngày {endDay}/{ev.startMonth})
                            </span>
                          </div>

                          {/* Dòng hạt bay & Khẩu hiệu */}
                          <div className="festive-card-meta-row">
                            <span className="meta-particles">
                              ✨ Hạt bay: <strong>{(ev.particles || []).slice(0, 7).join(' ')}</strong>
                            </span>
                            {ev.bannerTitle && (
                              <>
                                <span className="schedule-dot">•</span>
                                <span className="meta-slogan">
                                  Khẩu hiệu: <em>"{ev.bannerTitle}"</em>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Cột Thao Tác (Action Buttons) */}
                        <div className="festive-card-actions-col">
                          {/* Nút Thử Nghiệm Giao Diện */}
                          <button
                            type="button"
                            className={`festive-btn-action ${isPreviewing ? 'btn-stop-preview' : 'btn-start-preview'}`}
                            onClick={() => handleTogglePreview(ev)}
                            title="Bấm để kích hoạt thử nghiệm toàn bộ giao diện lễ hội này ngay lập tức"
                          >
                            <span>{isPreviewing ? '⏹ Dừng thử' : '👁️ Thử ngay'}</span>
                          </button>

                          {/* Nút Chỉnh Sửa */}
                          <button
                            type="button"
                            className="festive-btn-action btn-edit"
                            onClick={() => handleStartEdit(ev)}
                            title="Chỉnh sửa ngày tháng, thời lượng và thông điệp"
                          >
                            ✏️ Sửa
                          </button>

                          {/* Nút Bật / Tắt Tự Động Theo Lịch */}
                          <button
                            type="button"
                            className={`festive-btn-action ${ev.isActive !== false ? 'btn-toggle-on' : 'btn-toggle-off'}`}
                            onClick={() => handleToggleActive(ev)}
                            title={ev.isActive !== false ? 'Đang bật tự động theo lịch. Bấm để tắt' : 'Đang tắt. Bấm để bật lại'}
                          >
                            {ev.isActive !== false ? '✓ Bật' : '✕ Tắt'}
                          </button>

                          {/* Nút Xóa (Cho Custom Event) */}
                          {!ev.isBuiltin && (
                            <button
                              type="button"
                              className="festive-btn-action btn-delete"
                              onClick={() => handleDeleteCustomEvent(ev)}
                              title="Xóa sự kiện này khỏi hệ thống"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2 & 3: TẠO MỚI HOẶC CHỈNH SỬA SỰ KIỆN */}
        {(activeTab === 'create' || activeTab === 'edit') && (
          <form className="festive-mgmt-form-container" onSubmit={handleSaveEdit}>
            <div className="festive-form-grid">
              <div className="festive-form-group">
                <label className="festive-form-label">
                  Tên Sự Kiện Lễ Hội <span className="required">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="festive-form-input"
                  placeholder="Ví dụ: Ngày Hội Công Nghệ, 30/4 & 1/5..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="festive-form-group">
                <label className="festive-form-label">
                  Biểu Tượng Icon (Emoji) <span className="required">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="festive-form-input"
                  placeholder="🇻🇳, 🌸, 🎈, 🎆..."
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
            </div>

            <div className="festive-form-grid-3">
              <div className="festive-form-group">
                <label className="festive-form-label">
                  📅 Ngày Bắt Đầu (1-31) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  className="festive-form-input"
                  value={formData.startDay}
                  onChange={(e) => setFormData({ ...formData, startDay: e.target.value })}
                />
              </div>

              <div className="festive-form-group">
                <label className="festive-form-label">
                  📅 Tháng Bắt Đầu (1-12) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  required
                  className="festive-form-input"
                  value={formData.startMonth}
                  onChange={(e) => setFormData({ ...formData, startMonth: e.target.value })}
                />
              </div>

              <div className="festive-form-group">
                <label className="festive-form-label">
                  ⏱ Số Ngày Diễn Ra (Thời Lượng) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  className="festive-form-input highlight"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                />
              </div>
            </div>

            <div className="festive-form-group">
              <label className="festive-form-label">
                Khẩu Hiệu / Tiêu Đề Banner Chào Mừng
              </label>
              <input
                type="text"
                className="festive-form-input"
                placeholder="Ví dụ: Chào Mừng Kỷ Niệm 81 Năm Ngày Quốc Khánh 2/9..."
                value={formData.bannerTitle}
                onChange={(e) => setFormData({ ...formData, bannerTitle: e.target.value })}
              />
            </div>

            <div className="festive-form-group">
              <label className="festive-form-label">
                Mô Tả Ý Nghĩa / Lời Chúc Gửi Tới Cộng Đồng
              </label>
              <textarea
                rows="2"
                className="festive-form-textarea"
                placeholder="Ví dụ: Chúc toàn thể anh chị em một kỳ nghỉ lễ thật ấm áp và tràn đầy năng lượng..."
                value={formData.bannerDesc}
                onChange={(e) => setFormData({ ...formData, bannerDesc: e.target.value })}
              />
            </div>

            {/* Chọn nhanh gói hạt hiệu ứng bay lượn */}
            <div className="festive-particle-pack-section">
              <label className="festive-form-label highlight-teal">
                ✨ Chọn nhanh bộ hạt bay lượn trên màn hình:
              </label>
              <div className="festive-particle-chips">
                {PRESET_PARTICLE_PACKS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`festive-particle-chip ${formData.particleType === p.type ? 'active' : ''}`}
                    onClick={() => handleSelectParticlePack(p)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: '10px' }}>
                <label className="festive-form-sublabel">
                  Hạt bay tùy chỉnh (cách nhau bằng dấu phẩy):
                </label>
                <input
                  type="text"
                  className="festive-form-input small"
                  value={formData.particlesStr}
                  onChange={(e) => setFormData({ ...formData, particlesStr: e.target.value })}
                />
              </div>
            </div>

            {/* Bảng chọn màu sắc chủ đạo */}
            <div className="festive-form-grid">
              <div className="festive-form-group">
                <label className="festive-form-label">
                  Màu Nền / Banner (Theme Color)
                </label>
                <div className="festive-color-picker-row">
                  <input
                    type="color"
                    className="festive-color-swatch"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="festive-form-input mono"
                    value={formData.themeColor}
                    onChange={(e) => setFormData({ ...formData, themeColor: e.target.value })}
                  />
                </div>
              </div>

              <div className="festive-form-group">
                <label className="festive-form-label">
                  Màu Điểm Nhấn (Accent Color)
                </label>
                <div className="festive-color-picker-row">
                  <input
                    type="color"
                    className="festive-color-swatch"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="festive-form-input mono"
                    value={formData.accentColor}
                    onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Nút Submit Form */}
            <div className="festive-form-footer">
              <button
                type="button"
                className="festive-btn-cancel"
                onClick={() => {
                  playClickSound();
                  setActiveTab('list');
                  setEditingEvent(null);
                }}
              >
                Hủy Bỏ
              </button>
              <button type="submit" className="festive-btn-submit">
                {activeTab === 'edit' ? '✓ Lưu Thay Đổi Sự Kiện' : '➕ Tạo Sự Kiện Mới Ngay'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
