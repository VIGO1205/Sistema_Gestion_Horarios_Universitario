import React from 'react';
import { Box, Typography, Grid, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { 
  Tune as TuneIcon, 
  School as LectivaIcon, 
  AssignmentLate as NoLectivaIcon,
  ViewModule as TodasIcon 
} from '@mui/icons-material';

interface LeyendaDisponibilidadProps {
  tipoCarga: string;
  setTipoCarga: (tipo: string) => void;
}

const LeyendaDisponibilidad: React.FC<LeyendaDisponibilidadProps> = ({ tipoCarga, setTipoCarga }) => {
  return (
    <Grid item xs={12}>
      <Box sx={{ 
        mt: 1, 
        mb: 2,
        pt: 2, 
        borderTop: '1px dashed #e0e0e0', 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' },
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

        {/* Toggle de 3 estados: Lectiva | Todas | No Lectiva */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          bgcolor: 'white', 
          px: 0.5, 
          py: 0.5, 
          borderRadius: 4, 
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
          transition: 'all 0.2s ease',
          alignSelf: { xs: 'center', md: 'auto' },
          '&:hover': {
            borderColor: '#003366',
            boxShadow: '0 4px 12px rgba(0,51,102,0.08)'
          }
        }}>
          <ToggleButtonGroup
            value={tipoCarga}
            exclusive
            onChange={(_, nuevaCarga) => { if (nuevaCarga !== null) setTipoCarga(nuevaCarga); }}
            size="small"
            sx={{
              '& .MuiToggleButtonGroup-grouped': {
                borderRadius: 3,
                border: 'none',
                mx: 0.3,
                px: 1.8,
                py: 0.6,
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.75rem',
                color: '#94a3b8',
                '&.Mui-selected': {
                  bgcolor: '#003366',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(0,51,102,0.2)',
                  '&:hover': { bgcolor: '#002244' },
                },
                '&:hover': { bgcolor: '#f1f5f9' },
              },
            }}
          >
            <ToggleButton value="LECTIVA">
              <LectivaIcon sx={{ fontSize: 16, mr: 0.6 }} />
              Lectiva
            </ToggleButton>
            <ToggleButton value="TODAS">
              <TodasIcon sx={{ fontSize: 16, mr: 0.6 }} />
              Todas
            </ToggleButton>
            <ToggleButton value="NO_LECTIVA">
              <NoLectivaIcon sx={{ fontSize: 16, mr: 0.6 }} />
              No Lectiva
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
    </Grid>
  );
};

export default LeyendaDisponibilidad;
