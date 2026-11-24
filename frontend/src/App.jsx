import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { MusicProvider } from './context/MusicContext';
import { PersonalHubProvider } from './context/PersonalHubContext';
import { PersonalHubModal } from './components/hub/PersonalHubModal';
import { FocusGoalReminderToast } from './components/common/FocusGoalReminderToast';
import { BondLevelUpToast } from './components/common/BondLevelUpToast';
import { OfflineSyncToast } from './components/common/OfflineSyncToast';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { AppRoutes } from './routes/AppRoutes';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  // Silent wake-up ping khi App khởi tạo lần đầu (đánh thức Render server ngủ đông, có session guard chống gọi thừa)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (sessionStorage.getItem('freedom_server_pinged')) return;
        sessionStorage.setItem('freedom_server_pinged', '1');
      }
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      fetch(`${baseUrl}/health`).catch(() => {});
    } catch (_) {}
  }, []);

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AppErrorBoundary>
          <AuthProvider>
            <PersonalHubProvider>
              <ChatProvider>
                <MusicProvider>
                  <AppRoutes />
                  <PersonalHubModal />
                  <FocusGoalReminderToast />
                  <BondLevelUpToast />
                  <OfflineSyncToast />
                </MusicProvider>
              </ChatProvider>
            </PersonalHubProvider>
          </AuthProvider>
        </AppErrorBoundary>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
