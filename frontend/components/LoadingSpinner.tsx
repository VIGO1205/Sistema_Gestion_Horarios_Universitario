import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        width: '100%',
      }}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
        <CircularProgress
          variant="indeterminate"
          size={60}
          thickness={4}
          sx={{
            color: '#003366', // Azul UNT
            animationDuration: '550ms',
          }}
        />
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: '#003366',
          letterSpacing: 1,
          animation: 'pulse 1.5s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': { opacity: 0.6 },
            '50%': { opacity: 1 },
            '100%': { opacity: 0.6 },
          },
        }}
      >
        CARGANDO...
      </Typography>
    </Box>
  );
};

export default LoadingSpinner;
