import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPlaylistBySlug, getAllPlaylists } from '../data/playlists';
import { getActiveSeason } from '../utils/seasonUtils';
import { useMusicPlayer } from '../hooks/useMusicPlayer';
import { MusicPlayerCard } from '../components/music/MusicPlayerCard';
import { MusicTrackList } from '../components/music/MusicTrackList';
import { WinterSnowAtmosphere } from '../components/music/WinterSnowAtmosphere';

/**
 * Trang Không Gian Nhạc & Playlist Đa Chủ Đề (Music Lounge)
 * Khởi đầu với chủ đề Mùa Đông (Winter Chill & Tĩnh Lặng)
 */
export const MusicPage = () => {
  const { themeId } = useParams();
  const navigate = useNavigate();

  const allThemes = getAllPlaylists();
  const player = useMusicPlayer();
  const currentTheme = player.currentTheme || getPlaylistBySlug(themeId || 'winter');

  // Đồng bộ theme theo tham số URL nếu có thay đổi
  useEffect(() => {
    const targetSlug = themeId || 'winter';
    if (targetSlug !== player.currentTheme?.slug) {
      player.switchTheme(targetSlug);
    }
  }, [themeId]);
  const [isZenMode, setIsZenMode] = useState(false);

  // Cập nhật tiêu đề tab trình duyệt
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${currentTheme.name} Chill • Không Gian Nhạc Freedom`;
    return () => {
      document.title = originalTitle;
    };
  }, [currentTheme]);

  // Chuyển chủ đề qua URL
  const handleSelectTheme = (slug) => {
    navigate(`/music/${slug}`);
  };

  const handleToggleZenMode = () => {
    setIsZenMode((prev) => !prev);
  };

  return (
    <div className={`music-page-wrapper ${isZenMode ? 'zen-mode-active' : ''}`}>
      {/* Hiệu ứng thời tiết theo chủ đề (Chỉ render cục bộ nếu layout toàn cục chưa kích hoạt mùa đông) */}
      {currentTheme.atmosphere?.type === 'snow' && getActiveSeason()?.id !== 'winter' && (
        <WinterSnowAtmosphere
          density={currentTheme.atmosphere.density || 35}
          speed={currentTheme.atmosphere.speed || 0.6}
        />
      )}

      <div className="music-page-container">
        {/* Header trang (ẩn khi bật Zen Mode để tối đa không gian tĩnh lặng) */}
        {!isZenMode && (
          <div className="music-page-header">
            <div className="music-title-group">
              <span className="music-page-tagline">
                <i className="fa-solid fa-headphones"></i> Không Gian Nhạc &amp; Chữa Lành
              </span>
              <h1 className="music-page-title">
                {currentTheme.name}: {currentTheme.title}
              </h1>
              <p className="music-page-desc">
                {currentTheme.subtitle} • Giai điệu trầm ấm xoa dịu những mệt mỏi
              </p>
            </div>

            <div className="music-header-actions">
              <Link to="/" className="music-back-home-btn" title="Quay về trang chủ">
                <i className="fa-solid fa-arrow-left"></i>
                <span>Trang Chủ</span>
              </Link>
            </div>
          </div>
        )}

        {/* Nội dung chính 2 cột */}
        <div className="music-content-grid">
          {/* Cột trái: Trình phát đĩa than, seekbar & volume */}
          <MusicPlayerCard
            theme={currentTheme}
            player={player}
            isZenMode={isZenMode}
            onToggleZenMode={handleToggleZenMode}
          />

          {/* Cột phải: Danh sách bài hát, tabs chủ đề & quote */}
          <MusicTrackList
            theme={currentTheme}
            allThemes={allThemes}
            currentTrackIndex={player.currentTrackIndex}
            isPlaying={player.isPlaying}
            onSelectTrack={player.playTrack}
            onSelectTheme={handleSelectTheme}
          />
        </div>
      </div>
    </div>
  );
};
