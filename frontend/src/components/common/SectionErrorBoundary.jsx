import React, { Component } from 'react';

/**
 * Component-Level Error Boundary
 * Bắt lỗi cục bộ tại từng Section (Module) để không làm sập toàn bộ trang (CLS = 0)
 */
export class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn(`[SectionErrorBoundary] Gặp lỗi cục bộ tại "${this.props.name || 'Section'}":`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onRetry === 'function') {
      try {
        this.props.onRetry();
      } catch (_) {}
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback({ error: this.state.error, retry: this.handleRetry })
          : this.props.fallback;
      }

      const sectionName = this.props.name || 'Khu vực này';

      return (
        <div
          className="section-error-boundary-box"
          role="alert"
          style={{
            padding: '24px 20px',
            margin: '16px 0',
            borderRadius: '16px',
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '1.8rem', lineHeight: '1' }}>🌱</span>
          <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#334155' }}>
            {sectionName} tạm thời cần một nhịp nghỉ
          </h4>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b', maxWidth: '420px', lineHeight: '1.5' }}>
            Đã có một sự gián đoạn nhỏ khi hiển thị nội dung này. Bạn có thể nhấn thử lại bên dưới để làm mới module nhé.
          </p>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              marginTop: '4px',
              padding: '7px 18px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔄</span>
            <span>Thử tải lại khu vực này</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
