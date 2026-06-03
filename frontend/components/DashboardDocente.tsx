'use client';

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

interface DashboardDocenteProps {
  docente: any;
}

export default function DashboardDocente({ docente }: DashboardDocenteProps) {
  const router = useRouter();
  const nombre = docente?.nombre?.split(' ')[0] || 'Docente';

  const menuOptions = [
    {
      title: 'Carga Académica',
      description: 'Declara tu carga lectiva y no lectiva del ciclo actual.',
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      path: '/carga-academica',
      color: '#003366',
    },
    {
      title: 'Mis Horarios',
      description: 'Consulta y gestiona tu programación semanal de clases.',
      icon: <CalendarIcon sx={{ fontSize: 40 }} />,
      path: '/horarios',
      color: '#003366',
    },
  ];

  return (
    <Box sx={{ py: 4 }}>
      {/* Banner de Bienvenida */}
      <Card 
        sx={{ 
          borderRadius: 5, 
          bgcolor: '#003366', 
          color: 'white',
          mb: 6,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <CardContent sx={{ p: 6, position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item>
              <Avatar 
                sx={{ 
                  width: 120, 
                  height: 120, 
                  bgcolor: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(255,255,255,0.2)'
                }}
              >
                <PersonIcon sx={{ fontSize: 60 }} />
              </Avatar>
            </Grid>
            <Grid item xs>
              <Typography variant="h3" sx={{ fontWeight: 900, mb: 1 }}>
                ¡Hola, {nombre}!
              </Typography>
              <Typography variant="h6" sx={{ opacity: 0.8, fontWeight: 500, maxWidth: 600 }}>
                Bienvenido al Sistema de Gestión de Horarios de la UNT. Desde aquí puedes gestionar tu carga académica y horarios de manera eficiente.
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
        {/* Decoración de fondo */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: -50, 
            right: -50, 
            width: 300, 
            height: 300, 
            bgcolor: 'rgba(255,255,255,0.05)', 
            borderRadius: '50%' 
          }} 
        />
      </Card>

      <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e293b', mb: 4 }}>
        Accesos Directos
      </Typography>

      <Grid container spacing={4}>
        {menuOptions.map((option) => (
          <Grid item xs={12} md={6} key={option.title}>
            <Card 
              sx={{ 
                borderRadius: 4, 
                border: '1px solid #e2e8f0',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 51, 102, 0.1)',
                  borderColor: option.color
                }
              }}
              onClick={() => router.push(option.path)}
            >
              <CardContent sx={{ p: 4 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 3 
                  }}
                >
                  <Box 
                    sx={{ 
                      p: 2, 
                      borderRadius: 3, 
                      bgcolor: `${option.color}10`, 
                      color: option.color 
                    }}
                  >
                    {option.icon}
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                      {option.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                      {option.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
