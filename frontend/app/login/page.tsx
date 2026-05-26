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
import { useAuth } from '@/components/providers/AuthProvider';
import api from '@/lib/api';

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
      router.push('/dashboard');
      // No quitamos el loading si es exitoso para que el spinner siga hasta que cambie de página
    } catch (err: any) {
      setLoading(false); // Solo quitamos el loading si hay error
      const message = err.response?.data?.message;
      
      if (err.response?.status === 401) {
        if (message === 'Usuario no encontrado') {
          setError('Credenciales Inválidas');
          setErrorType('email');
        } else if (message === 'Contraseña incorrecta') {
          setError('Contraseña Incorrecta');
          setErrorType('password');
        } else {
          setError('Credenciales Inválidas');
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
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #003366 0%, #001a33 100%)',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255, 215, 0, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none',
        }
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 500, p: 2, zIndex: 1 }}>
        <Paper
          elevation={24}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 1)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 480, // Aumentamos la altura mínima
          }}
        >
          <Box
            sx={{
              p: 4,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#003366',
              color: 'white',
            }}
          >
            <SchoolIcon sx={{ fontSize: 50, mb: 1, color: '#FFD700' }} />
            <Typography variant="h4" component="h1" fontWeight="700" textAlign="center">
              Sistema de Horarios
            </Typography>
            <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
              Universidad Nacional de Trujillo
            </Typography>
          </Box>

          <CardContent sx={{ p: 4, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <form onSubmit={handleLogin} noValidate style={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ mb: 1 }}>
                <TextField
                  fullWidth
                  label="Correo Electrónico"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDown}
                  margin="normal"
                  variant="outlined"
                  placeholder="ejemplo@unt.edu.pe"
                  autoComplete="username"
                  inputProps={{ autoComplete: 'username' }}
                  error={errorType === 'email' || errorType === 'general'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon color={(errorType === 'email' || errorType === 'general') ? 'error' : 'primary'} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={{ mb: 0.5 }}
                />
                <Box sx={{ minHeight: '20px', display: 'flex', alignItems: 'center', px: 1 }}>
                  {(errorType === 'email' || (errorType === 'general' && !email.trim())) && (
                    <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                      <ErrorOutlineIcon sx={{ fontSize: 14, mr: 0.5 }} />
                      {error}
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ mb: 1 }}>
                <TextField
                  fullWidth
                  label="Contraseña"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  margin="normal"
                  variant="outlined"
                  placeholder="Ingresa tu contraseña"
                  autoComplete="current-password"
                  inputProps={{ autoComplete: 'current-password' }}
                  error={errorType === 'password' || errorType === 'general'}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon color={(errorType === 'password' || errorType === 'general') ? 'error' : 'primary'} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          aria-label="toggle password visibility"
                          onClick={handleClickShowPassword}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: { borderRadius: 2 }
                  }}
                  sx={{ mb: 0.5 }}
                />
                <Box sx={{ minHeight: '20px', display: 'flex', alignItems: 'center', px: 1 }}>
                  {(errorType === 'password' || (errorType === 'general' && !password.trim())) && (
                    <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                      <ErrorOutlineIcon sx={{ fontSize: 14, mr: 0.5 }} />
                      {error}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={!loading && <LoginIcon />}
                sx={{
                  mt: 2,
                  py: 1.5,
                  borderRadius: 2,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  backgroundColor: '#003366',
                  '&:hover': {
                    backgroundColor: '#002244',
                  }
                }}
              >
                {loading ? <CircularProgress size={26} color="inherit" /> : 'Iniciar Sesión'}
              </Button>

              {/* Espacio para error general si no aplica a email o password específicamente */}
              <Box sx={{ mt: 2, minHeight: '24px', display: 'flex', justifyContent: 'center' }}>
                {errorType === 'general' && email.trim() && password.trim() && (
                  <Typography variant="caption" color="error" sx={{ display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                    <ErrorOutlineIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    {error}
                  </Typography>
                )}
              </Box>
            </form>
          </CardContent>
        </Paper>
        
        <Typography 
          variant="body2" 
          align="center" 
          display="block"
          sx={{ mt: 3, color: 'rgba(255,255,255,0.7)' }}
        >
          © {new Date().getFullYear()} Escuela de Ingeniería de Sistemas - UNT
        </Typography>
      </Box>
    </Box>
  );
}
