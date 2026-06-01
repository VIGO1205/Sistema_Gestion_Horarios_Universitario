'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  CircularProgress,
  InputAdornment,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SchoolIcon from '@mui/icons-material/School';
import LoginIcon from '@mui/icons-material/Login';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '@/lib/api';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useAuth } from '@/components/providers/AuthProvider';

const MySwal = withReactContent(Swal);

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorType, setErrorType] = useState<'email' | 'password' | 'general' | ''>('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    setError('');
    setErrorType('');

    // Validación de campos vacíos
    if (!email.trim() && !password.trim()) {
      setError('Correo y contraseña obligatorios');
      setErrorType('general');
      return;
    }
    if (!email.trim()) {
      setError('El correo electrónico es obligatorio');
      setErrorType('email');
      return;
    }
    if (!password.trim()) {
      setError('La contraseña es obligatoria');
      setErrorType('password');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, usuario } = response.data;

      login(access_token, usuario);
      
      // Marcar para mostrar bienvenida en el dashboard
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('showWelcome', 'true');
      }

      router.push('/dashboard');
    } catch (err: any) {
      setLoading(false);
      const message = err.response?.data?.message;
      
      if (err.response?.status === 401) {
        if (message === 'Credenciales Inválidas') {
          setError('Credenciales Inválidas');
          setErrorType('email');
        } else if (message === 'Contraseña incorrecta') {
          setError('Contraseña Incorrecta');
          setErrorType('password');
        } else if (message.includes('bloqueada')) {
          setError(message);
          setErrorType('general');
        } else if (message.includes('desactivada')) {
          setError(message);
          setErrorType('general');
        } else if (message.includes('perfil de docente')) {
          setError(message);
          setErrorType('general');
        } else {
          setError(message || 'Error de autenticación');
          setErrorType('general');
        }
      } else {
        setError(message || 'Error al iniciar sesión');
        setErrorType('general');
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin(e);
    }
  };

  const handleClickShowPassword = () => setShowPassword(!showPassword);

  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        background: 'white',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        flexDirection: { xs: 'column', md: 'row' }
      }}
    >
      {/* Lado Izquierdo: Formulario */}
      <Box
        sx={{
          flex: { xs: '1 1 auto', md: '1 1 50% ' },
          p: { xs: 4, md: 10, lg: 15 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          bgcolor: 'white',
          zIndex: 2,
        }}
      >
        <Box sx={{ maxWidth: 450, width: '100%' }}>
          <Box sx={{ mb: 6, textAlign: 'left' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              <SchoolIcon sx={{ fontSize: 50, color: '#003366' }} />
              <Typography variant="h2" fontWeight="900" color="#003366" sx={{ letterSpacing: -2 }}>
                SGH - UNT
              </Typography>
            </Box>
            <Typography variant="h5" color="text.secondary" fontWeight="500" sx={{ opacity: 0.8 }}>
              Bienvenido al Sistema de Gestión de Horarios
            </Typography>
          </Box>

          <form onSubmit={handleLogin} noValidate>
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                label="Correo Institucional"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              variant="outlined"
              placeholder="ejemplo@unt.edu.pe"
              autoComplete="username"
              error={errorType === 'email' || errorType === 'general'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color={(errorType === 'email' || errorType === 'general') ? 'error' : 'primary'} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 0, height: 60 }
                }}
              />
              <Box sx={{ minHeight: '24px', mt: 0.5, px: 1 }}>
                {(errorType === 'email' || (errorType === 'general' && !email.trim())) && (
                  <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {error}
                  </Typography>
                )}
              </Box>
            </Box>

            <Box sx={{ mb: 5 }}>
              <TextField
                fullWidth
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                variant="outlined"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errorType === 'password' || errorType === 'general'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon color={(errorType === 'password' || errorType === 'general') ? 'error' : 'primary'} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={handleClickShowPassword} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                  sx: { borderRadius: 0, height: 60 }
                }}
              />
              <Box sx={{ minHeight: '24px', mt: 0.5, px: 1 }}>
                {(errorType === 'password' || (errorType === 'general' && email.trim() && !password.trim())) && (
                  <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {error}
                  </Typography>
                )}
                {errorType === 'general' && email.trim() && password.trim() && (
                  <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 14, mr: 0.5 }} />
                    {error}
                  </Typography>
                )}
              </Box>
            </Box>

            <Button
              fullWidth
              size="large"
              variant="contained"
              onClick={() => handleLogin()}
              disabled={loading}
              sx={{
                py: 2.5,
                borderRadius: 0,
                fontSize: '1.2rem',
                fontWeight: '900',
                textTransform: 'none',
                backgroundColor: '#003366',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#002244',
                }
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar Sesión'}
            </Button>
          </form>

          <Box sx={{ mt: 10, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7, fontWeight: 500, fontSize: '0.8rem' }}>
              © 2026 Universidad Nacional de Trujillo <br />
              Facultad de Ingeniería - Ingeniería de Sistemas
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Lado Derecho: Imagen/Información Institucional */}
      <Box
        sx={{
          flex: { xs: 'none', md: '1 1 50% ' },
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          background: 'linear-gradient(rgba(0, 51, 102, 0.8), rgba(0, 51, 102, 0.9)), url("https://www.unitru.edu.pe/Recursos/img/slider/slider1.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          p: 8,
          color: 'white',
          textAlign: 'center'
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.08) 0%, transparent 80%)',
            pointerEvents: 'none',
          }}
        />
        
        <Box sx={{ zIndex: 1, maxWidth: 600 }}>
          <SchoolIcon sx={{ fontSize: 100, color: '#FFD700', mb: 4 }} />
          <Typography variant="h2" fontWeight="900" sx={{ mb: 3, letterSpacing: -2, lineHeight: 1 }}>
            Excelencia Académica
          </Typography>
          <Typography variant="h5" sx={{ mb: 6, fontWeight: 300, opacity: 0.9, lineHeight: 1.6, maxWidth: 500, mx: 'auto' }}>
            Plataforma oficial para la gestión y organización de horarios académicos de la Universidad Nacional de Trujillo.
          </Typography>
          
          <Divider sx={{ bgcolor: 'rgba(255,215,0,0.4)', width: '80px', mx: 'auto', mb: 6, height: '4px', borderRadius: 0 }} />
          
          <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.1)', px: 3, py: 1.5, borderRadius: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
              <LoginIcon sx={{ fontSize: 20, color: '#FFD700' }} />
              <Typography variant="subtitle1" fontWeight="700">Acceso Seguro</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: 'rgba(255,255,255,0.1)', px: 3, py: 1.5, borderRadius: 0, border: '1px solid rgba(255,255,255,0.2)' }}>
              <SchoolIcon sx={{ fontSize: 20, color: '#FFD700' }} />
              <Typography variant="subtitle1" fontWeight="700">Gestión Integral</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
