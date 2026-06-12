import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  Grid, TextField, MenuItem, Typography, Box, Divider, Alert,
  ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { Settings as SettingsIcon, Save as SaveIcon, Close as CloseIcon } from '@mui/icons-material';
import { HORAS, DIAS } from '../constantes';

interface ModalConfiguracionGrillaProps {
  open: boolean;
  onClose: () => void;
  config: any;
  onSave: (newConfig: any) => void;
}

interface ConfigGrilla {
  horaInicio: string;
  horaFin: string;
  almuerzoInicio: string;
  almuerzoFin: string;
  diasActivos: number[];
}

const ModalConfiguracionGrilla: React.FC<ModalConfiguracionGrillaProps> = ({
  open,
  onClose,
  config,
  onSave
}) => {
  const [formConfig, setFormConfig] = React.useState<ConfigGrilla>({
    horaInicio: '07:00',
    horaFin: '22:00',
    almuerzoInicio: '13:00',
    almuerzoFin: '14:00',
    diasActivos: [1, 2, 3, 4, 5, 6],
    ...config
  });

  React.useEffect(() => {
    if (config) {
      setFormConfig(prev => ({
        ...prev,
        ...config,
        // Asegurarse de que las horas tengan el formato HH:00 si vienen de la DB como HH:MM:SS
        horaInicio: config.horaInicio?.substring(0, 5) || prev.horaInicio,
        horaFin: config.horaFin?.substring(0, 5) || prev.horaFin,
        almuerzoInicio: config.almuerzoInicio?.substring(0, 5) || prev.almuerzoInicio,
        almuerzoFin: config.almuerzoFin?.substring(0, 5) || prev.almuerzoFin,
        diasActivos: Array.isArray(config.diasActivos) 
          ? config.diasActivos.map(Number) 
          : typeof config.diasActivos === 'string'
            ? config.diasActivos.split(',').map(Number)
            : prev.diasActivos
      }));
    }
  }, [config]);

  const handleDaysChange = (
    _event: React.MouseEvent<HTMLElement>,
    newDays: number[],
  ) => {
    if (newDays.length > 0) {
      // Ordenar los días para mantener consistencia
      setFormConfig({ ...formConfig, diasActivos: newDays.sort((a, b) => a - b) });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ bgcolor: '#003366', color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
        <SettingsIcon /> Configuración de la Grilla
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Estos ajustes son visuales y afectan cómo se muestra la grilla de horarios para todos los usuarios en este periodo académico.
        </Alert>

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: '#003366' }}>RANGO DE HORAS</Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            <TextField
              select
              fullWidth
              size="small"
              label="Hora Inicio Grilla"
              value={formConfig.horaInicio}
              onChange={(e) => setFormConfig({ ...formConfig, horaInicio: e.target.value })}
            >
              {HORAS.filter(h => {
                const hVal = parseInt(h.split(':')[0]);
                const fVal = parseInt(formConfig.horaFin.split(':')[0]);
                return hVal < fVal;
              }).map(h => (
                <MenuItem key={h} value={h}>{h}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              select
              fullWidth
              size="small"
              label="Hora Fin Grilla"
              value={formConfig.horaFin}
              onChange={(e) => setFormConfig({ ...formConfig, horaFin: e.target.value })}
            >
              {HORAS.filter(h => {
                const hVal = parseInt(h.split(':')[0]);
                const sVal = parseInt(formConfig.horaInicio.split(':')[0]);
                return hVal > sVal;
              }).map(h => (
                <MenuItem key={h} value={h}>{h}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: '#003366' }}>FRANJA DE ALMUERZO</Typography>
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6}>
            <TextField
              select
              fullWidth
              size="small"
              label="Inicio Almuerzo"
              value={formConfig.almuerzoInicio}
              onChange={(e) => setFormConfig({ ...formConfig, almuerzoInicio: e.target.value })}
            >
              {HORAS.map(h => (
                <MenuItem key={h} value={h}>{h}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={6}>
            <TextField
              select
              fullWidth
              size="small"
              label="Fin Almuerzo"
              value={formConfig.almuerzoFin}
              onChange={(e) => setFormConfig({ ...formConfig, almuerzoFin: e.target.value })}
            >
              {HORAS.map(h => (
                <MenuItem key={h} value={h}>{h}</MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2, color: '#003366' }}>DÍAS LABORABLES</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
          <ToggleButtonGroup
            value={formConfig.diasActivos}
            onChange={handleDaysChange}
            aria-label="días activos"
            size="small"
            color="primary"
            sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1,
              '& .MuiToggleButton-root': {
                borderRadius: '8px !important',
                border: '1px solid #e0e0e0 !important',
                px: 2,
                py: 1,
                fontWeight: 600,
                '&.Mui-selected': {
                  bgcolor: '#003366',
                  color: 'white',
                  '&:hover': {
                    bgcolor: '#002244',
                  }
                }
              }
            }}
          >
            {DIAS.map((dia) => (
              <ToggleButton key={dia.id} value={dia.id} aria-label={dia.nombre}>
                {dia.nombre.substring(0, 3)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
          Selecciona los días que aparecerán en la grilla.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} startIcon={<CloseIcon />} variant="outlined" sx={{ borderRadius: 2 }}>
          Cancelar
        </Button>
        <Button 
          onClick={() => onSave(formConfig)} 
          startIcon={<SaveIcon />} 
          variant="contained" 
          sx={{ bgcolor: '#003366', borderRadius: 2 }}
        >
          Guardar Cambios
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalConfiguracionGrilla;
