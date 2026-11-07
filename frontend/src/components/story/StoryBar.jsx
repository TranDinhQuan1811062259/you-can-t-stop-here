import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { storyService } from '../../services/storyService';
import { playClickSound } from '../../utils/soundEffects';

export const StoryBar = ({ onOpenCreateStory, onOpenViewStory }) => {
  const { user, isAuthenticated, openLoginModal } = useAuth();
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStories = () => {
    storyService
      .getActiveStories()
      .then((res) => {
        setStories(res?.data || []);
      })
      .catch((err) => {
        console.warn('Lỗi tải story:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStories();
    window.addEventListener('freedom_story_updated', fetchStories);
    return () => window.removeEventListener('freedom_story_updated', fetchStories);
  }, []);

  const handleCreateClick = () => {
    playClickSound();
    if (!isAuthenticated) {
      openLoginModal();
      return;
    }
    if (onOpenCreateStory) onOpenCreateStory();
  };

  const handleStoryClick = (story, index) => {
    playClickSound();
    if (onOpenViewStory) onOpenViewStory(story, index, stories);
  };

  return (
    <div
      className="stories-tray-container"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        overflowX: 'auto',
        padding: '12px 6px 16px',
        marginBottom: '20px',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {/* Nút Tạo Story của tôi (+ Tạo Story) */}
      <div
        className="story-item create-story-item"
        onClick={handleCreateClick}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          width: '74px',
          textAlign: 'center',
        }}
        title="Tạo Story 24h kèm nhạc & cọ vẽ tự do"
      >
        <div
          style={{
            position: 'relative',
            width: '62px',
            height: '62px',
            borderRadius: '50%',
            padding: '2.5px',
            background: 'linear-gradient(135deg, #0d9488, #059669)',
            boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
          }}
        >
          <img
            src={
              user?.avatar && !user?.avatar.includes('google_avatar')
                ? user.avatar
                : (user?.role === 'admin'
                    ? '/uploads/1793903034671-886587470_122145020103357128_3735488146127846733_n.jpg'
                    : '/images/man.jpg')
            }
            alt="Tạo Story"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid #ffffff',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-2px',
              right: '-2px',
              background: '#0d9488',
              color: '#ffffff',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
              fontWeight: 800,
              border: '2px solid #ffffff',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
          >
            +
          </div>
        </div>
        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#334155',
            marginTop: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          Tạo Story
        </span>
      </div>

      {/* Danh sách các Story 24h của mọi người */}
      {stories.map((story, index) => {
        const isSelf = user && String(user._id) === String(story.userId);

        return (
          <div
            key={story._id || index}
            className="story-item"
            onClick={() => handleStoryClick(story, index)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              width: '74px',
              textAlign: 'center',
              transition: 'transform 0.2s ease',
            }}
            title={`${story.userName}: "${story.content?.slice(0, 40) || 'Story'}" • Bấm để xem`}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div
              style={{
                position: 'relative',
                width: '62px',
                height: '62px',
                borderRadius: '50%',
                padding: '2.5px',
                background: 'linear-gradient(45deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6)',
                backgroundSize: '200% 200%',
                animation: 'gradientRing 3s ease infinite',
                boxShadow: '0 4px 14px rgba(236, 72, 153, 0.28)',
              }}
            >
              <img
                src={story.userAvatar || '/images/man.jpg'}
                alt={story.userName}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2px solid #ffffff',
                }}
              />
              {story.musicTitle && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-3px',
                    right: '-3px',
                    background: '#1e293b',
                    color: '#f8fafc',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    border: '1.5px solid #ffffff',
                  }}
                  title={`Có nhạc nền: ${story.musicTitle}`}
                >
                  🎵
                </div>
              )}
              {story.mediaType === 'video' && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '-3px',
                    left: '-3px',
                    background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                    color: '#ffffff',
                    borderRadius: '50%',
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.62rem',
                    border: '1.5px solid #ffffff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                  title="Story dạng Video"
                >
                  🎬
                </div>
              )}
            </div>
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: isSelf ? 800 : 600,
                color: isSelf ? '#0d9488' : '#334155',
                marginTop: '6px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {isSelf ? 'Story của bạn' : story.userName?.split(' ')[0] || story.userName}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default StoryBar;
