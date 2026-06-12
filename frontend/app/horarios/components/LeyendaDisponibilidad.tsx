import React from 'react';
import { Box, Typography, Grid, Switch, Stack } from '@mui/material';
import { 
  Tune as TuneIcon, 
  School as LectivaIcon, 
  AssignmentLate as NoLectivaIcon 
} from '@mui/icons-material';

interface LeyendaDisponibilidadProps {
  tipoCarga: string;
  setTipoCarga: (tipo: string) => void;
}

const LeyendaDisponibilidad: React.FC<LeyendaDisponibilidadProps> = ({ tipoCarga, setTipoCarga }) => {
  const isNoLectiva = tipoCarga === 'NO_LECTIVA';

  return (
    <Grid item xs={12}>
      <Box sx={{ 
        mt: 1, 
        mb: 2, // Separación con la grilla igual a la de arriba
        pt: 2, 
        borderTop: '1px dashed #e0e0e0', 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, // Stack vertical en móvil
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        bgcolor: 'rgba(0, 51, 102, 0.02)',
        borderRadius: 4,
        px: 3,
        py: 1.5
      }}>
        {/* Leyenda de Colores */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: { xs: 2, md: 4 }, 
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', md: 'flex-start' }
        }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: '#003366', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <TuneIcon sx={{ fontSize: 16 }} /> LEYENDA:
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: 'rgba(34, 197, 94, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', fontSize: '0.7rem' }}>DISPONIBLE</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#9a3412', fontSize: '0.7rem' }}>PARCIALMENTE OCUPADO</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#991b1b', fontSize: '0.7rem' }}>NO DISPONIBLE / CRUCE</Typography>
          </Box>
        </Box>

        {/* Switch de Modo de Ingreso */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: 'white', 
          px: 2, 
          py: 0.5, 
          borderRadius: 4, 
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s ease',
          alignSelf: { xs: 'center', md: 'auto' }, // Centrado manual en móvil
          '&:hover': {
            borderColor: '#003366',
            boxShadow: '0 4px 12px rgba(0,51,102,0.08)'
          }
        }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.8, 
              opacity: !isNoLectiva ? 1 : 0.4,
              transition: 'opacity 0.2s'
            }}>
              <LectivaIcon sx={{ fontSize: 18, color: '#003366' }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#003366', letterSpacing: 0.5 }}>
                MODO CARGA LECTIVA
              </Typography>
            </Box>

            <Switch
              size="small"
              checked={isNoLectiva}
              onChange={(e) => setTipoCarga(e.target.checked ? 'NO_LECTIVA' : 'LECTIVA')}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#7c3aed' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#7c3aed', opacity: 0.5 },
                '& .MuiSwitch-track': { bgcolor: '#003366' }
              }}
            />

            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 0.8, 
              opacity: isNoLectiva ? 1 : 0.4,
              transition: 'opacity 0.2s'
            }}>
              <NoLectivaIcon sx={{ fontSize: 18, color: '#7c3aed' }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#7c3aed', letterSpacing: 0.5 }}>
                MODO CARGA NO LECTIVA
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Box>
    </Grid>
  );
};

export default LeyendaDisponibilidad;
