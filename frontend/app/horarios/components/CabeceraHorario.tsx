import React from 'react';
import { Box, Typography, IconButton, Tooltip, Button } from '@mui/material';
import { Refresh as RefreshIcon, Download as DownloadIcon, Settings as SettingsIcon } from '@mui/icons-material';

interface CabeceraHorarioProps {
  onRefrescar: () => void;
  onExportar: () => void;
  onConfigurar?: () => void;
  esAdmin?: boolean;
}

const CabeceraHorario: React.FC<CabeceraHorarioProps> = ({ onRefrescar, onExportar, onConfigurar, esAdmin }) => {
  return (
    <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#003366', mb: 1 }}>
          Visualización de Horarios
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Consulta la programación académica detallada por ciclo, docente o ambiente.
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        {esAdmin && (
          <Tooltip title="Configuración de la Grilla">
            <IconButton 
              onClick={onConfigurar} 
              sx={{ 
                bgcolor: 'white', 
                border: '1px solid #eef2f6', 
                color: '#003366',
                width: 40,
                height: 40,
                borderRadius: '50%',
                '&:hover': { bgcolor: '#f8f9fa' }
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        )}
        <Tooltip title="Actualizar">
          <IconButton 
            onClick={onRefrescar} 
            sx={{ 
              bgcolor: 'white', 
              border: '1px solid #eef2f6',
              width: 40,
              height: 40,
              borderRadius: '50%',
              '&:hover': { bgcolor: '#f8f9fa' }
            }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          onClick={onExportar}
          startIcon={<DownloadIcon />}
          sx={{ bgcolor: '#003366', borderRadius: 2, fontWeight: 600 }}
        >
          Exportar PDF
        </Button>
      </Box>
    </Box>
  );
};

export default CabeceraHorario;
