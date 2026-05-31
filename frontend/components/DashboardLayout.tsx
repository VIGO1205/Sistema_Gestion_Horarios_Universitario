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
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './providers/AuthProvider';
import LoadingSpinner from './LoadingSpinner';
import VentanaFlotanteDocente from './VentanaFlotanteDocente';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

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
  { text: 'Carga Académica', icon: <AssignmentIcon />, path: '/carga-academica', roles: ['admin', 'coordinador'] },
  { text: 'Horarios', icon: <CalendarIcon />, path: '/horarios', roles: ['admin', 'coordinador', 'docente'] },
  { text: 'Docentes', icon: <PeopleIcon />, path: '/docentes', roles: ['admin', 'coordinador'] },
  { text: 'Carreras', icon: <SchoolIcon />, path: '/carreras', roles: ['admin'] },
  { text: 'Cursos', icon: <BookIcon />, path: '/cursos', roles: ['admin', 'coordinador'] },
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
  const [isChecking, setIsChecking] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, usuario, logout, isValidating } = useAuth();

  const publicRoutes = ['/login', '/'];
  const isPublicRoute = publicRoutes.includes(pathname);

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
        width: open ? 60 : 45, 
        height: open ? 60 : 45, 
        bgcolor: 'rgba(255,255,255,0.1)', 
        borderRadius: '20%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '1px solid rgba(255,215,0,0.3)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        transition: 'all 0.3s'
      }}>
        <SchoolIcon sx={{ color: '#FFD700', fontSize: open ? 35 : 28 }} />
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f4f7f9' }}>
      {/* Header / AppBar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
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
            <SchoolIcon sx={{ color: '#003366', mr: 1, fontSize: 32 }} />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700, color: '#003366' }}>
              {open || isMobile ? 'SGH - UNT' : 'SGH'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
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
          overflowX: 'hidden', 
          overflowY: 'auto',
          py: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%',
          '&::-webkit-scrollbar': {
            width: '6px',
            display: 'none', // Oculto por defecto
          },
          '&:hover::-webkit-scrollbar': {
            display: 'block', // Solo aparece al hacer hover
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
          
          {open && (
            <Box sx={{ mt: 'auto', p: 3, textAlign: 'center' }}>
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
        <VentanaFlotanteDocente />
        {isNavigating ? <LoadingSpinner /> : children}
      </Box>
    </Box>
  );
}
