import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CommunityMoodWall } from '../components/blog/CommunityMoodWall';
import { CommunityResilienceTree } from '../components/wellness/CommunityResilienceTree';
import { GivingSomeEffortsSection } from '../components/wellness/GivingSomeEffortsSection';
import { SectionErrorBoundary } from '../components/common/SectionErrorBoundary';

const WELLNESS_TOOLS = [
  {
    id: 'rant-and-burn',
    eventName: 'freedom_open_rant_and_burn',
    icon: 'fa-solid fa-fire-flame-curved',
    title: 'Lò Đốt Muộn Phiền',
    description: 'Viết ra hết ấm ức, áp lực và nhìn chúng tan biến nhẹ nhàng.',
    tag: 'Xả stress',
  },
  {
    id: 'sos-calm',
    eventName: 'freedom_open_sos_calm',
    icon: 'fa-solid fa-lungs',
    title: 'Sơ Cứu Cảm Xúc SOS',
    description: 'Nhịp thở 4-7-8 và hướng dẫn hạ nhiệt tức thì khi quá tải.',
    tag: 'Khẩn cấp',
  },
  {
    id: 'drift-bottle',
    eventName: 'freedom_open_drift_bottle',
    icon: 'fa-solid fa-bottle-water',
    title: 'Lọ Sao & Chai Trôi Đêm',
    description: 'Gửi gắm điều thầm kín ra biển đêm hoặc nhặt một lời an ủi.',
    tag: 'Ẩn danh',
  },
  {
    id: 'late-night-radio',
    eventName: 'freedom_open_radio',
    icon: 'fa-solid fa-radio',
    title: 'Đài Phát Thanh Đêm',
    description: 'Tần số dịu êm cho những đêm khó ngủ hoặc cần người lắng nghe.',
    tag: 'Âm thanh',
  },
  {
    id: 'cozy-cafe',
    eventName: 'freedom_open_cozy_cafe',
    icon: 'fa-solid fa-mug-hot',
    title: 'Quán Cà Phê Ấm Áp',
    description: 'Không gian lofi tiếng mưa rơi và hơi ấm bên tách trà nóng.',
    tag: 'Thư giãn',
  },
  {
    id: 'gratitude-jar',
    eventName: 'freedom_open_gratitude_jar',
    icon: 'fa-solid fa-jar',
    title: 'Lọ Biết Ơn',
    description: 'Lưu lại một điều tử tế nhỏ bé giúp ngày hôm nay dịu dàng hơn.',
    tag: 'Tích cực',
  },
  {
    id: 'time-capsule',
    eventName: 'freedom_open_time_capsule',
    icon: 'fa-solid fa-hourglass-half',
    title: 'Hộp Thời Gian',
    description: 'Viết bức thư gửi cho chính mình của 30 ngày hoặc 1 năm sau.',
    tag: 'Tương lai',
  },
  {
    id: 'mood-radar',
    eventName: 'freedom_open_mood_radar',
    icon: 'fa-solid fa-satellite-dish',
    title: 'Radar Cảm Xúc',
    description: 'Cảm nhận nhịp đập tâm trạng chung của cộng đồng ngay lúc này.',
    tag: 'Kết nối',
  },
  {
    id: 'whisper-wall',
    eventName: 'freedom_open_whisper_wall',
    icon: 'fa-solid fa-note-sticky',
    title: 'Bức Tường Thì Thầm',
    description: 'Đọc và để lại những mảnh giấy nhỏ đầy sự thấu cảm.',
    tag: 'Cộng đồng',
  },
  {
    id: 'mood-pixel',
    eventName: 'freedom_open_mood_pixel',
    icon: 'fa-solid fa-palette',
    title: 'Bảng Màu Tâm Trạng',
    description: 'Ghi dấu sắc màu cảm xúc mỗi ngày như một cuốn nhật ký thị giác.',
    tag: 'Theo dõi',
  },
];

export function WellnessPage() {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "Trạm Chữa Lành • You Can't Stop Here";
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const dispatchWellnessEvent = (eventName) => {
    if (typeof window === 'undefined' || !eventName) return;
    window.dispatchEvent(new CustomEvent(eventName));
  };

  return (
    <main className="wellness-page">
      <div className="container wellness-page-container">
        <section className="wellness-page-hero" aria-labelledby="wellness-page-heading">
          <span className="wellness-page-eyebrow">
            <i className="fa-solid fa-spa" aria-hidden="true"></i> Calm Space • Trạm Chữa Lành
          </span>
          <h1 id="wellness-page-heading" className="wellness-page-title">
            Chậm lại một nhịp để hồi phục năng lượng
          </h1>
          <p className="wellness-page-subtitle">
            Tập hợp các góc thư giãn, hít thở, xả stress và tiếp sức tinh thần trong một không gian riêng tư, gọn gàng.
          </p>
          <div className="wellness-page-actions">
            <button
              type="button"
              className="wellness-hero-btn wellness-hero-btn--primary"
              onClick={() => dispatchWellnessEvent('freedom_open_wellness')}
            >
              <i className="fa-solid fa-wind" aria-hidden="true"></i>
              <span>Mở Phòng Thở &amp; Thư Giãn</span>
            </button>
            <Link to="/" className="wellness-hero-btn wellness-hero-btn--ghost">
              <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
              <span>Quay về dòng tâm sự</span>
            </Link>
          </div>
        </section>

        <section className="wellness-page-section" aria-label="Bức tường tâm trạng cộng đồng">
          <SectionErrorBoundary name="Community Mood Wall">
            <CommunityMoodWall
              onOpenWellness={() => dispatchWellnessEvent('freedom_open_wellness')}
            />
          </SectionErrorBoundary>
        </section>

        <section className="wellness-page-section" aria-labelledby="wellness-tools-heading">
          <div className="wellness-section-head">
            <h2 id="wellness-tools-heading" className="wellness-section-title">
              Các Góc Chữa Lành Tương Tác
            </h2>
            <p className="wellness-section-desc">
              Chọn công cụ phù hợp với trạng thái của bạn ngay lúc này.
            </p>
          </div>
          <div className="wellness-tools-grid">
            {WELLNESS_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                className="wellness-tool-card"
                onClick={() => dispatchWellnessEvent(tool.eventName)}
              >
                <div className="wellness-tool-card-top">
                  <span className="wellness-tool-icon" aria-hidden="true">
                    <i className={tool.icon}></i>
                  </span>
                  <span className="wellness-tool-tag">{tool.tag}</span>
                </div>
                <h3 className="wellness-tool-title">{tool.title}</h3>
                <p className="wellness-tool-desc">{tool.description}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="wellness-page-section" aria-label="Cây Hồi Sinh Cộng Đồng">
          <SectionErrorBoundary name="Community Resilience Tree">
            <CommunityResilienceTree />
          </SectionErrorBoundary>
        </section>

        <section className="wellness-page-section" aria-label="Giving Some Efforts">
          <SectionErrorBoundary name="Giving Some Efforts">
            <GivingSomeEffortsSection />
          </SectionErrorBoundary>
        </section>
      </div>
    </main>
  );
}

export default WellnessPage;
