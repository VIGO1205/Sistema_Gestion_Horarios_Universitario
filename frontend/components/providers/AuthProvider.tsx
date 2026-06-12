'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import api from '@/lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  usuario: any | null;
  login: (token: string, usuario: any) => void;
  logout: () => void;
  isValidating: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usuario, setUsuario] = useState<any | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // Verificar si hay token en localStorage y validar con el backend
    const token = localStorage.getItem('token');
    const usuarioData = localStorage.getItem('usuario');
    
    if (token && usuarioData) {
      // Verificar que el token sea válido haciendo un request al backend
      api
        .get('/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((response) => {
          setIsAuthenticated(true);
          setUsuario(JSON.parse(usuarioData));
        })
        .catch((_error) => {
          // Token inválido o expirado
          localStorage.removeItem('token');
          localStorage.removeItem('usuario');
          setIsAuthenticated(false);
          setUsuario(null);
        })
        .finally(() => {
          setIsValidating(false);
        });
    } else {
      setIsValidating(false);
    }
  }, []);

  const login = (token: string, usuarioData: any) => {
    localStorage.setItem('token', token);
    localStorage.setItem('usuario', JSON.stringify(usuarioData));
    setIsAuthenticated(true);
    setUsuario(usuarioData);
  };

  const logout = () => {
    // Limpiar datos de autenticación
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    
    // Limpiar mensajes de HORUS (todos los usuarios)
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('horus-chat-messages')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem('horus-chat-detached');
    
    setIsAuthenticated(false);
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, usuario, login, logout, isValidating }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}
