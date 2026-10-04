import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { NavProvider } from './context/NavContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <NavProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </NavProvider>
    </AuthProvider>
  </StrictMode>
);
