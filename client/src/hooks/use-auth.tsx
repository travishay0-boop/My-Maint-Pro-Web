import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@shared/schema';
import { applyTheme } from '@/lib/theme';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setUser: (user: User, token: string) => void;
  updateUser: (updates: Partial<User>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      const userData = JSON.parse(savedUser);
      setUser(userData);
      applyTheme(userData.userType || 'agency');

      // Background sync: always refresh from server to pick up any changes
      // (e.g. agencyId assigned after Stripe signup, emailVerified status, etc.)
      fetch('/api/user/me', {
        headers: { 'x-user-id': String(userData.id), 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      })
        .then(res => res.ok ? res.json() : null)
        .then(freshUser => {
          if (freshUser && freshUser.id) {
            const merged = { ...userData, ...freshUser };
            setUser(merged);
            localStorage.setItem('user', JSON.stringify(merged));
            applyTheme(merged.userType || 'agency');
          }
        })
        .catch(() => { /* non-critical — use cached user */ });
    }

    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Invalid username or password. Please try again.' };
      }

      if (data.user && data.token) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
        applyTheme(data.user.userType || 'agency');
        return { success: true };
      }

      return { success: false, error: 'Login failed. Please try again.' };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Unable to connect. Please check your internet connection and try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    applyTheme('agency');
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_API_CACHE' });
    }
  };

  const setUserAndToken = (user: User, token: string) => {
    setUser(user);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    applyTheme(user.userType || 'agency');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser: setUserAndToken, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
