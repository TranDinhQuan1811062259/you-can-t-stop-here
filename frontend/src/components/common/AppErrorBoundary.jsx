import React from 'react';

/**
 * AppErrorBoundary - Lá Chắn Bảo Vệ Toàn Diện Cho Client SPA
 * - Bắt trọn vẹn lỗi tải lười (ChunkLoadError / Failed to fetch dynamically imported module)
 *   thường xảy ra khi người dùng mất mạng đột ngột hoặc sau khi Vercel deploy bản build mới có hash mới.
 * - Hiển thị giao diện tĩnh lặng, ấm áp, đậm chất Freedom thay vì làm trắng màn hình.
 * - Cung cấp nút "Thử Tải Lại" (Reload / Retry) giúp người dùng khôi phục phiên mượt mà.
 */
export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isChunkError: false,
    };
  }

  static getDerivedStateFromError(error) {
    const message = error?.message || '';
    const isChunk =
      error?.name === 'ChunkLoadError' ||
      message.includes('dynamically imported module') ||
      message.includes('Importing a module script failed') ||
      message.includes('Loading chunk') ||
      message.includes('Failed to fetch');

    return {
      hasError: true,
      error,
      isChunkError: isChunk,
    };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('[AppErrorBoundary] Caught render or chunk error:', error?.message || error, errorInfo?.componentStack);
  }

  handleRetry = () => {
    // Nếu là lỗi tải chunk do deploy mới, tải lại trang để nạp file JS/CSS mới nhất
    if (this.state.isChunkError) {
      window.location.reload();
      return;
    }
    // Với lỗi render cục bộ, thử reset lại state để khôi phục
    this.setState({ hasError: false, error: null, isChunkError: false });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const { isChunkError } = this.state;

      return (
        <div
          className="app-error-boundary-screen"
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #090d16 0%, #0f172a 50%, #1e1b4b 100%)',
            color: '#f8fafc',
            padding: '24px',
            boxSizing: 'border-box',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: 'rgba(15, 23, 42, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '20px',
              padding: '36px 28px',
              boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div
              style={{
                fontSize: '2.8rem',
                marginBottom: '16px',
                lineHeight: 1,
              }}
            >
              {isChunkError ? '❄️' : '🌿'}
            </div>

            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: '#ffffff',
                marginBottom: '10px',
                letterSpacing: '-0.3px',
              }}
            >
              {isChunkError ? 'Đang cập nhật phiên bản mới' : 'Khoảng lặng bất ngờ'}
            </h2>

            <p
              style={{
                fontSize: '0.92rem',
                color: '#94a3b8',
                lineHeight: 1.6,
                marginBottom: '26px',
              }}
            >
              {isChunkError
                ? 'Hệ thống vừa có bản cập nhật mới hoặc kết nối mạng bị gián đoạn đôi chút. Hãy tải lại để tiếp tục lắng nghe giai điệu và tâm sự bạn nhé.'
                : 'Trang tạm thời gặp một chút trục trặc nhỏ trong lúc xử lý. Không sao cả, bạn có thể thử tải lại hoặc quay về Trang Chủ.'}
            </p>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={this.handleRetry}
                style={{
                  background: 'linear-gradient(135deg, #0d9488 0%, #059669 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '11px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)',
                  transition: 'transform 0.15s ease',
                }}
              >
                🔄 Thử Tải Lại
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#e2e8f0',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '999px',
                  padding: '11px 22px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
              >
                🏠 Về Trang Chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
