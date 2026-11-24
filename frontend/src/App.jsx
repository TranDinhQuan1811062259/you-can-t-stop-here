import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { MusicProvider } from './context/MusicContext';
import { AppErrorBoundary } from './components/common/AppErrorBoundary';
import { AppRoutes } from './routes/AppRoutes';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function App() {
  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <AppErrorBoundary>
          <AuthProvider>
            <ChatProvider>
              <MusicProvider>
                <AppRoutes />
              </MusicProvider>
            </ChatProvider>
          </AuthProvider>
        </AppErrorBoundary>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
