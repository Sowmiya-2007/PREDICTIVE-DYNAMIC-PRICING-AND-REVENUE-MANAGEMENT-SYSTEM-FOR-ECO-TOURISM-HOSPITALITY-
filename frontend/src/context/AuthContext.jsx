import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('eco_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('eco_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('eco_token');
      if (storedToken) {
        try {
          const res = await authService.getCurrentUser();
          if (res.data.success) {
            setUser(res.data.user);
            localStorage.setItem('eco_user', JSON.stringify(res.data.user));
          }
        } catch (err) {
          console.error("Token verification failed:", err);
          authService.logout();
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const res = await authService.login({ username, password });
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('eco_token', newToken);
      localStorage.setItem('eco_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error(res.data.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await authService.register(userData);
    if (res.data.success) {
      const { token: newToken, user: newUser } = res.data;
      localStorage.setItem('eco_token', newToken);
      localStorage.setItem('eco_user', JSON.stringify(newUser));
      setToken(newToken);
      setUser(newUser);
      return newUser;
    }
    throw new Error(res.data.message || 'Registration failed');
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('eco_user', JSON.stringify(updatedUser));
  };

  const isCustomer = user?.role === 'customer' || user?.role === 'user';
  const isManager = user?.role === 'hospitality_manager' || user?.role === 'administrator';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isAdmin: user?.role === 'administrator',
        isManager,
        isCustomer,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
