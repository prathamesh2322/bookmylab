import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';

// Exp 4: Context API for global authentication state (JWT stored in localStorage).
const AuthContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('bml_user'));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);
  const [token, setToken] = useState(() => localStorage.getItem('bml_token'));

  const saveSession = (data) => {
    localStorage.setItem('bml_token', data.token);
    localStorage.setItem('bml_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('bml_token');
    localStorage.removeItem('bml_user');
    setToken(null);
    setUser(null);
  }, []);

  const login = async (email, password) =>
    saveSession(await api('/api/auth/login', { method: 'POST', body: { email, password } }));

  const register = async (name, email, password) =>
    saveSession(await api('/api/auth/register', { method: 'POST', body: { name, email, password } }));

  // Validate the stored token on page load; auto-logout when the server says 401.
  useEffect(() => {
    if (token) api('/api/auth/me').catch(() => {});
    window.addEventListener('bml-unauthorized', logout);
    return () => window.removeEventListener('bml-unauthorized', logout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({ user, token, isAdmin: user?.role === 'ADMIN', isStudent: user?.role === 'STUDENT', login, register, logout }),
    [user, token, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
