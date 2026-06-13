'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  CalendarMonth as CalendarIcon,
  People as PeopleIcon,
  Book as BookIcon,
  Room as RoomIcon,
  BarChart as ChartIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Timer as TimerIcon,
  Notifications as NotificationsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './providers/AuthProvider';
import LoadingSpinner from './LoadingSpinner';
import VentanaFlotanteDocente from './VentanaFlotanteDocente';
import { HorusChatProvider, HorusChatSidebar, HorusChatFloating } from './horus';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { Badge } from '@mui/material';
import api from '@/lib/api';
import { getNotificacionesSocket } from '@/lib/socket';
import { styled, keyframes } from '@mui/material/styles';

const MySwal = withReactContent(Swal);

const bellAnimation = keyframes`
  0% { transform: rotate(0); }
  5% { transform: rotate(5deg); }
  10% { transform: rotate(-5deg); }
  15% { transform: rotate(10deg); }
  20% { transform: rotate(-10deg); }
  25% { transform: rotate(18deg); }
  30% { transform: rotate(-18deg); }
  35% { transform: rotate(22deg); }
  40% { transform: rotate(-22deg); }
  45% { transform: rotate(18deg); }
  50% { transform: rotate(-18deg); }
  55% { transform: rotate(12deg); }
  60% { transform: rotate(-12deg); }
  65% { transform: rotate(7deg); }
  70% { transform: rotate(-7deg); }
  75% { transform: rotate(3deg); }
  80% { transform: rotate(-3deg); }
  85% { transform: rotate(0); }
  100% { transform: rotate(0); }
`;

const AnimatedBell = styled(NotificationsIcon)(({ theme }: { theme?: any }) => ({
  transformOrigin: 'top center',
}));

const drawerWidth = 280;
const miniDrawerWidth = 80;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  roles?: string[]; // Roles permitidos para esta opción
}

const navItems: NavItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', roles: ['admin', 'coordinador', 'docente'] },
  { text: 'Carga Académica', icon: <AssignmentIcon />, path: '/carga-academica', roles: ['admin', 'coordinador', 'docente'] },
  { text: 'Horarios', icon: <CalendarIcon />, path: '/horarios', roles: ['admin', 'coordinador', 'docente'] },
  { text: 'Docentes', icon: <PeopleIcon />, path: '/docentes', roles: ['admin', 'coordinador'] },
  { text: 'Carreras', icon: <SchoolIcon />, path: '/carreras', roles: ['admin'] },
  { text: 'Cursos', icon: <BookIcon />, path: '/cursos', roles: ['admin', 'coordinador'] },
  { text: 'Periodos', icon: <CalendarIcon />, path: '/periodos', roles: ['admin'] },
  { text: 'Aulas', icon: <RoomIcon />, path: '/ambientes', roles: ['admin'] },
  { text: 'Ventanas', icon: <TimerIcon />, path: '/ventanas', roles: ['admin', 'coordinador'] },
  { text: 'Reportes', icon: <ChartIcon />, path: '/reportes', roles: ['admin', 'docente'] },
  { text: 'Usuarios', icon: <PeopleIcon />, path: '/usuarios', roles: ['admin'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifAnchorEl, setNotifAnchorEl] = useState<null | HTMLElement>(null);
  const [notificaciones, setNotificaciones] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, usuario, logout, isValidating } = useAuth();

  const publicRoutes = ['/login', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

  const fetchNotificaciones = async () => {
    if (usuario?.rol !== 'docente') return;
    try {
      const res = await api.get('/notificaciones/mi-bandeja');
      setNotificaciones(res.data);
      const unreadRes = await api.get('/notificaciones/unread-count');
      setUnreadCount(unreadRes.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    if (usuario?.rol === 'docente' && isAuthenticated) {
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
              // Opcional: Mostrar un toast o alerta
              MySwal.fire({
                title: data.titulo || 'Nueva notificación',
                text: data.mensaje,
                icon: 'info',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 5000,
                timerProgressBar: true,
              });
            }
          };

          socket.on('notificaciones:estado-carga', handler);
          detachSocket = () => {
            socket.off('notificaciones:estado-carga', handler);
          };
        } catch (err) {
          console.error('Error in DashboardLayout socket setup:', err);
        }
      };

      setupSocket();
      return () => {
        mounted = false;
        if (detachSocket) detachSocket();
      };
    }
  }, [usuario, isAuthenticated]);

  // Resetear estado de navegación cuando cambia la ruta
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  // Verificar autenticación y redireccionar si es necesario
  useEffect(() => {
    // Esperar a que termine la validación
    if (isValidating) return;

    if (!isPublicRoute && !isAuthenticated) {
      // No mostrar nada, solo redireccionar a login
      router.push('/login');
      return;
    }

    // Verificar permisos por rol para rutas protegidas
    if (!isPublicRoute && isAuthenticated && usuario) {
      const currentItem = navItems.find(item => item.path === pathname);
      // Si la ruta existe en navItems y el usuario no tiene el rol permitido
      if (currentItem && currentItem.roles && !currentItem.roles.includes(usuario.rol)) {
        router.push('/dashboard');
        return;
      }
    }
    
    setIsChecking(false);
  }, [isAuthenticated, pathname, router, isValidating, usuario, isPublicRoute]);

  // Si es una ruta pública (como login o la raíz que redirige), renderizar directamente
  if (isPublicRoute) return <>{children}</>;

  // Mientras se verifica la autenticación, no renderizar nada
  if (isChecking) {
    return null;
  }

  // Si no está autenticado en ruta protegida, no renderizar nada
  if (!isAuthenticated) {
    return null;
  }

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotifMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotifAnchorEl(event.currentTarget);
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  const handleNotifMenuClose = () => {
    setNotifAnchorEl(null);
  };

  const deleteNotification = async (id: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Evitar que se cierre el menú
    try {
      await api.post(`/notificaciones/${id}/delete`);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      // Si la que borramos no estaba leída, bajar el contador
      const deletedNotif = notificaciones.find(n => n.id === id);
      if (deletedNotif && !deletedNotif.leido) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notificaciones/mark-all-read');
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleLogout = async () => {
    handleMenuClose();
    
    const result = await MySwal.fire({
      title: '¿Finalizar sesión?',
      text: '¿Estás seguro de que deseas salir del sistema? Asegúrate de haber guardado tus cambios.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#003366',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      logout();
      router.push('/login');
    }
  };

  const navigateTo = (path: string) => {
    if (pathname !== path) {
      setIsNavigating(true);
      router.push(path);
    }
    if (isMobile && open) {
      setOpen(false);
    }
  };

  const currentDrawerWidth = isMobile ? (open ? drawerWidth : 0) : (open ? drawerWidth : miniDrawerWidth);

  // Logo Elegante para el Sidebar
  const SidebarLogo = () => (
    <Box sx={{ 
      p: 3, 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center',
      gap: 1,
      transition: 'all 0.3s'
    }}>
      <Box sx={{ 
        width: open ? 70 : 50, 
        height: open ? 70 : 50, 
        bgcolor: 'white', 
        borderRadius: '20%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid rgba(255,215,0,0.3)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        transition: 'all 0.3s',
        overflow: 'hidden'
      }}>
        <img 
          src="/img/logo-UNT.png" 
          alt="Logo UNT" 
          style={{ height: '85%', width: 'auto', objectFit: 'contain' }}
        />
      </Box>
      {open && (
        <Box sx={{ textAlign: 'center', mt: 1 }}>
          <Typography variant="h6" sx={{ 
            fontWeight: 800, 
            color: 'white', 
            fontSize: '1.2rem',
            letterSpacing: 1,
            lineHeight: 1.2
          }}>
            SGH - UNT
          </Typography>
          <Typography variant="caption" sx={{ 
            color: '#FFD700', 
            fontWeight: 600,
            letterSpacing: 2,
            opacity: 0.8
          }}>
            SISTEMA DE GESTIÓN
          </Typography>
        </Box>
      )}
    </Box>
  );

  const esDocente = usuario?.rol === 'docente';

  return (
    <HorusChatProvider sidebarOpen={open} isMobile={isMobile} enabled={esDocente}>
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f7f9' }}>
      {/* Header / AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer - 1,
          bgcolor: 'white',
          color: '#333',
          boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          borderBottom: '1px solid #eef2f6',
          width: isMobile ? '100%' : `calc(100% - ${currentDrawerWidth}px)`,
          ml: isMobile ? 0 : `${currentDrawerWidth}px`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              onClick={handleDrawerToggle}
              edge="start"
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            {isMobile && (
              <>
                <img 
                  src="/img/logo-UNT.png" 
                  alt="Logo UNT" 
                  style={{ height: 45, width: 'auto', objectFit: 'contain', marginRight: 8 }}
                />
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: '#003366' }}>
                  SGH - UNT
                </Typography>
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {usuario?.rol === 'docente' && (
              <>
                <Tooltip title="Notificaciones">
                  <IconButton color="inherit" onClick={handleNotifMenuOpen}>
                    <Badge badgeContent={unreadCount} color="error">
                      <AnimatedBell sx={{ animation: unreadCount > 0 ? `${bellAnimation} 4s cubic-bezier(.36,.07,.19,.97) infinite` : 'none' }} />
                    </Badge>
                  </IconButton>
                </Tooltip>
                <Menu
                  anchorEl={notifAnchorEl}
                  open={Boolean(notifAnchorEl)}
                  onClose={handleNotifMenuClose}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      width: 320,
                      maxHeight: 400,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                      borderRadius: 2,
                    }
                  }}
                >
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notificaciones</Typography>
                    {unreadCount > 0 && (
                      <Typography 
                        variant="caption" 
                        sx={{ color: '#003366', cursor: 'pointer', fontWeight: 600 }}
                        onClick={markAllAsRead}
                      >
                        Marcar todo como leído
                      </Typography>
                    )}
                  </Box>
                  <Divider />
                  {notificaciones.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="textSecondary">No tienes notificaciones</Typography>
                    </Box>
                  ) : (
                    notificaciones.map((notif) => (
                      <MenuItem key={notif.id} onClick={handleNotifMenuClose} sx={{ 
                        whiteSpace: 'normal', 
                        borderBottom: '1px solid #f0f0f0',
                        bgcolor: notif.leido ? 'transparent' : 'rgba(0, 51, 102, 0.03)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        pr: 1
                      }}>
                        <Box sx={{ flexGrow: 1, mr: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#003366' }}>
                            {notif.titulo}
                          </Typography>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', mt: 0.5 }}>
                            {notif.mensaje}
                          </Typography>
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                            {new Date(notif.createdAt).toLocaleString()}
                          </Typography>
                        </Box>
                        <IconButton 
                          size="small" 
                          onClick={(e) => deleteNotification(notif.id, e)}
                          sx={{ mt: -0.5, color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                        >
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </MenuItem>
                    ))
                  )}
                </Menu>
              </>
            )}
            <Typography variant="body2" sx={{ fontWeight: 500, display: { xs: 'none', md: 'block' } }}>
              {usuario?.email}
            </Typography>
            <Tooltip title="Opciones de cuenta">
              <IconButton onClick={handleMenuOpen} sx={{ p: 0.5, border: '2px solid #eef2f6' }}>
                <Avatar sx={{ bgcolor: '#003366', width: 35, height: 35 }}>
                  {usuario?.email?.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: {
                  mt: 1.5,
                  minWidth: 180,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                  borderRadius: 2,
                }
              }}
            >
              <MenuItem onClick={handleMenuClose}>
                <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
                Mi Perfil
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                <ListItemIcon><LogoutIcon fontSize="small" color="error" /></ListItemIcon>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Sidebar / Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={open}
        onClose={isMobile ? handleDrawerToggle : undefined}
        ModalProps={{
          disableEnforceFocus: true,
        }}
        sx={{
          width: currentDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: currentDrawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#003366',
            color: 'white',
            borderRight: 'none',
            boxShadow: '4px 0 10px rgba(0,0,0,0.05)',
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            /* Estilo personalizado del scrollbar */
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'transparent',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 215, 0, 0.2)',
              borderRadius: '10px',
            },
            '&:hover::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 215, 0, 0.4)',
            },
          },
        }}
      >
        <SidebarLogo />
        <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', mx: 2, mb: 1 }} />
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            flex: 1,
            overflowY: 'auto',
            py: 1,
            '&::-webkit-scrollbar': {
              width: '6px',
              display: 'none',
            },
            '&:hover::-webkit-scrollbar': {
              display: 'block',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'rgba(255, 215, 0, 0.3)',
              borderRadius: '10px',
            }
          }}>
            <List sx={{ px: open ? 2 : 1 }}>
              {navItems
                .filter(item => !item.roles || item.roles.includes(usuario?.rol))
                .map((item) => {
                const isActive = pathname === item.path;
                return (
                  <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                    <Tooltip title={!open ? item.text : ""} placement="right">
                      <ListItemButton
                        onClick={() => navigateTo(item.path)}
                        sx={{
                          borderRadius: 2,
                          bgcolor: isActive ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                          color: isActive ? '#FFD700' : 'rgba(255,255,255,0.8)',
                          justifyContent: open ? 'initial' : 'center',
                          px: 2.5,
                          minHeight: 48,
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                          },
                          transition: 'all 0.2s',
                        }}
                      >
                        <ListItemIcon sx={{ 
                          color: isActive ? '#FFD700' : 'rgba(255,255,255,0.7)',
                          minWidth: 0,
                          mr: open ? 2 : 'auto',
                          justifyContent: 'center',
                        }}>
                          {item.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.text} 
                          sx={{ opacity: open ? 1 : 0, display: open ? 'block' : 'none' }}
                          primaryTypographyProps={{ 
                            fontWeight: isActive ? 600 : 400,
                            fontSize: '0.9rem',
                            noWrap: true
                          }} 
                        />
                      </ListItemButton>
                    </Tooltip>
                  </ListItem>
                );
              })}
            </List>
          </Box>

          {esDocente && (
            <Box sx={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <HorusChatSidebar />
            </Box>
          )}

          {open && (
            <Box sx={{ p: 2, pt: 1, textAlign: 'center', flexShrink: 0 }}>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                © UNT - 2026
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: isMobile ? '100%' : `calc(100% - ${currentDrawerWidth}px)`,
          transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          mt: 8,
        }}
      >
        {esDocente && <HorusChatFloating />}
        <VentanaFlotanteDocente />
        {isNavigating ? <LoadingSpinner /> : children}
      </Box>
    </Box>
    </HorusChatProvider>
  );
}
