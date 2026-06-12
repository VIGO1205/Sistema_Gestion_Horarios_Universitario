"use client";

import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './providers/AuthProvider';

import { useState, useEffect } from 'react';
import { getNotificacionesSocket } from '@/lib/socket';
import api from '@/lib/api';

export default function Header() {
  const { usuario, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const fetchNotificaciones = async () => {
    if (usuario?.rol !== 'docente') return;
    try {
      const res = await api.get('/notificaciones/mi-bandeja');
      setNotificaciones(res.data);
      const unread = await api.get('/notificaciones/unread-count');
      setUnreadCount(unread.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (usuario?.rol === 'docente') {
      fetchNotificaciones();
      
      let mounted = true;
      let detachSocket: (() => void) | null = null;

      const setupSocket = async () => {
        try {
          const socket = await getNotificacionesSocket();
          if (!mounted) return;

          const handler = (data: any) => {
            if (!mounted) return;
            if (Number(data.docenteId) === Number(usuario.docenteId)) {
              fetchNotificaciones(); // Refrescar lista y contador
            }
          };

          socket.on('notificaciones:estado-carga', handler);
          detachSocket = () => {
            socket.off('notificaciones:estado-carga', handler);
          };
        } catch (err) {
          console.error('Error in Header socket setup:', err);
        }
      };

      setupSocket();
      return () => {
        mounted = false;
        if (detachSocket) detachSocket();
      };
    }
  }, [usuario]);

  return null;
}
