import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { formatDate } from '../../utils/formatDate';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { playClickSound } from '../../utils/soundEffects';

const DEFAULT_AVATAR = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2394a3b8'%3E%3Cpath fill-rule='evenodd' d='M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12 7.5a3 3 0 100 6 3 3 0 000-6zm-6.75 10.5a7.48 7.48 0 0113.5 0 8.22 8.22 0 01-13.5 0z' clip-rule='evenodd'/%3E%3C/svg%3E";

export const MutualMemoriesDrawer = ({
  isOpen,
  onClose,
  targetUserId,
  partnerName = 'Bạn đồng hành',
  partnerAvatar = '',
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bondData, setBondData] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'reaction' | 'comment'

  useEffect(() => {
    if (!isOpen || !targetUserId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    apiClient
      .get(`/user/bonds/${targetUserId}/memories`)
      .then((res) => {
        if (isMounted) {
          setBondData(res?.data?.data || null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[MutualMemories] Lỗi tải nhật ký:', err);
          setError(err.response?.data?.message || 'Không thể tải nhật ký tri kỷ lúc này.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetUserId]);

  // Phím Escape và khóa cuộn trang nền
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const partner = bondData?.partner || { name: partnerName, avatar: partnerAvatar };
  const tierInfo = bondData?.tierInfo || {
    name: 'Mới Kết Nối 🌱',
    color: '#94a3b8',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.3)',
  };

  const scoreAtoB = bondData?.scoreAtoB || 0; // Bạn gửi tới đối tác
  const scoreBtoA = bondData?.scoreBtoA || 0; // Đối tác gửi tới Bạn
  const totalScore = scoreAtoB + scoreBtoA;
  const selfRatio = totalScore > 0 ? Math.round((scoreAtoB / totalScore) * 100) : 50;
  const partnerRatio = 100 - selfRatio;

  const memories = Array.isArray(bondData?.recentMemories) ? bondData.recentMemories : [];
  const reactionCount = memories.filter((m) => m.type === 'reaction').length;
  const commentCount = memories.filter((m) => m.type === 'comment').length;
  const filteredMemories = memories.filter((m) => {
    if (filterType === 'all') return true;
    return m.type === filterType;
  });

  return (
    <div
      className="modal-backdrop mutual-memories-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(5px)',
        WebkitBackdropFilter: 'blur(5px)',
        zIndex: 10020,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(8px, 2.5vw, 16px)',
        animation: 'fadeIn 0.2s ease-out',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="modal-box mutual-memories-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          backgroundColor: '#ffffff',
          borderRadius: 'clamp(14px, 4vw, 18px)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 'clamp(12px, 3.5vw, 18px) clamp(14px, 4vw, 22px)',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
            <span
              style={{
                width: '36px',
                height: '36px',
                minWidth: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                flexShrink: 0,
              }}
            >
              📖
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 'clamp(0.92rem, 3.5vw, 1.05rem)',
                  fontWeight: 800,
                  color: '#0f172a',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Nhật Ký Tri Kỷ
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '0.76rem',
                  color: '#64748b',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Hành trình tương tác cùng {partner?.name || 'Bạn đồng hành'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#e2e8f0',
              border: 'none',
              borderRadius: '50%',
              width: '34px',
              height: '34px',
              minWidth: '34px',
              minHeight: '34px',
              cursor: 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.95rem',
              transition: 'all 0.15s ease',
              flexShrink: 0,
              touchAction: 'manipulation',
            }}
            aria-label="Đóng nhật ký"
          >
            ✕
          </button>
        </div>

        {/* Nội dung chính cuộn dọc */}
        <div style={{ padding: 'clamp(12px, 3.5vw, 20px)', overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <LoadingSpinner />
              <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#64748b' }}>
                Đang nạp các mốc kỷ niệm tri kỷ...
              </p>
            </div>
          ) : error ? (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: '#fff1f2',
                color: '#be123c',
                fontSize: '0.88rem',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          ) : (
            <>
              {/* Thẻ Cấp Bậc & Điểm Gắn Kết */}
              <div
                style={{
                  background: tierInfo.bg || '#f8fafc',
                  border: `1.5px solid ${tierInfo.border || '#cbd5e1'}`,
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={partner?.avatar || DEFAULT_AVATAR}
                    alt={partner?.name}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid #ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          background: tierInfo.color || '#f59e0b',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                        }}
                      >
                        {tierInfo.name}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                      Điểm thân thiết 2 chiều: <strong style={{ color: tierInfo.color }}>{bondData?.mutualScore || 0} điểm</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Thanh Cân Bằng Tương Tác 2 Chiều */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px 16px',
                  marginBottom: '22px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', marginBottom: '8px' }}>
                  <span>
                    <strong>Bạn gửi:</strong> {scoreAtoB} điểm ({selfRatio}%)
                  </span>
                  <span>
                    <strong>{partner?.name || 'Đối tác'} gửi:</strong> {scoreBtoA} điểm ({partnerRatio}%)
                  </span>
                </div>
                {/* Progress bar đối xứng */}
                <div
                  style={{
                    height: '8px',
                    borderRadius: '999px',
                    backgroundColor: '#e2e8f0',
                    overflow: 'hidden',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      width: `${selfRatio}%`,
                      background: 'linear-gradient(90deg, #38bdf8, #0284c7)',
                      transition: 'width 0.4s ease',
                    }}
                    title={`Bạn: ${selfRatio}%`}
                  />
                  <div
                    style={{
                      width: `${partnerRatio}%`,
                      background: 'linear-gradient(90deg, #f59e0b, #ef4444)',
                      transition: 'width 0.4s ease',
                    }}
                    title={`${partner?.name}: ${partnerRatio}%`}
                  />
                </div>
                <p style={{ margin: '8px 0 0', fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' }}>
                  🛡️ Điểm tri kỷ chỉ tăng mạnh khi cả 2 người cùng tương tác qua lại trên bài viết của nhau
                </p>
              </div>

              {/* Dòng Thời Gian Kỷ Niệm (Timeline) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginBottom: '10px',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>✨ Các Mốc Tương Tác Gần Nhất</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                    ({memories.length} mốc)
                  </span>
                </h4>
              </div>

              {/* Thanh Bộ Lọc Phân Loại (Filter Tabs) */}
              {memories.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    marginBottom: '14px',
                  }}
                  role="tablist"
                  aria-label="Lọc mốc kỷ niệm"
                >
                  {[
                    { key: 'all', label: 'Tất cả', count: memories.length, icon: '🌟' },
                    { key: 'reaction', label: 'Thắp nến / Tim', count: reactionCount, icon: '🕯️' },
                    { key: 'comment', label: 'Bình luận', count: commentCount, icon: '💬' },
                  ].map((tab) => {
                    const isActive = filterType === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => {
                          playClickSound();
                          setFilterType(tab.key);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '6px 12px',
                          minHeight: '34px',
                          borderRadius: '999px',
                          fontSize: '0.76rem',
                          fontWeight: isActive ? 700 : 500,
                          border: isActive ? '1px solid #f59e0b' : '1px solid #e2e8f0',
                          background: isActive
                            ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                            : '#ffffff',
                          color: isActive ? '#ffffff' : '#475569',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isActive ? '0 2px 6px rgba(245, 158, 11, 0.25)' : 'none',
                          touchAction: 'manipulation',
                        }}
                      >
                        <span style={{ fontSize: '0.85rem' }}>{tab.icon}</span>
                        <span>{tab.label}</span>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '1px 5px',
                            borderRadius: '999px',
                            background: isActive ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                            color: isActive ? '#ffffff' : '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {memories.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <span style={{ fontSize: '1.6rem', display: 'block', marginBottom: '6px' }}>🌱</span>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#64748b', fontWeight: 500 }}>
                    Chưa có tương tác đáng nhớ nào được ghi lại.
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
                    Hãy cùng thắp nến và để lại lời bình luận cho nhau để lưu giữ những kỷ niệm đầu tiên nhé!
                  </p>
                </div>
              ) : filteredMemories.length === 0 ? (
                <div
                  style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <span style={{ fontSize: '1.4rem', display: 'block', marginBottom: '6px' }}>
                    {filterType === 'comment' ? '💬' : '🕯️'}
                  </span>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                    Chưa có mốc kỷ niệm nào thuộc danh mục "{filterType === 'comment' ? 'Bình luận' : 'Thắp nến / Thả tim'}".
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setFilterType('all');
                    }}
                    style={{
                      marginTop: '8px',
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Xem tất cả kỷ niệm ({memories.length})
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredMemories.map((m, idx) => {
                    const isComment = m.type === 'comment';
                    const icon = isComment ? '💬' : '🕯️';
                    const actionText = isComment ? 'đã gửi bình luận vào' : 'đã thắp nến / thả tim vào';

                    return (
                      <div
                        key={m._id || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: m.isSelf ? '#f0fdf4' : '#fffbeb',
                          border: `1px solid ${m.isSelf ? '#bbf7d0' : '#fef3c7'}`,
                          transition: 'transform 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '1.25rem', lineHeight: '1.2' }}>{icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.82rem', color: '#1e293b', lineHeight: '1.4' }}>
                            <strong>{m.actorName}</strong> {actionText}{' '}
                            {m.postId ? (
                              <Link
                                to={`/post/${m.postId}`}
                                onClick={() => {
                                  playClickSound();
                                  onClose();
                                }}
                                style={{
                                  color: '#0284c7',
                                  fontWeight: 600,
                                  textDecoration: 'none',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'anywhere',
                                }}
                                title="Bấm để mở bài viết này"
                              >
                                "{m.postTitle || 'bài viết'}"
                              </Link>
                            ) : (
                              <strong>"{m.postTitle || 'bài viết'}"</strong>
                            )}
                          </p>

                          {m.snippet && (
                            <p
                              style={{
                                margin: '4px 0 0',
                                fontSize: '0.78rem',
                                color: '#475569',
                                fontStyle: 'italic',
                                background: 'rgba(255, 255, 255, 0.65)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                borderLeft: '3px solid #cbd5e1',
                              }}
                            >
                              "{m.snippet}"
                            </p>
                          )}

                          <span style={{ display: 'block', marginTop: '4px', fontSize: '0.7rem', color: '#94a3b8' }}>
                            {formatDate(m.createdAt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
