import React from 'react';
import { Popover, Box, Typography } from '@mui/material';
import { Person as PersonIcon, Room as RoomIcon } from '@mui/icons-material';

interface PopoverEventosProps {
  anchor: HTMLElement | null;
  onClose: () => void;
  eventos: any[];
}

const PopoverEventos: React.FC<PopoverEventosProps> = ({ anchor, onClose, eventos }) => {
  return (
    <Popover
      open={Boolean(anchor)}
      anchorEl={anchor}
      onClose={onClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
    >
      <Box sx={{ p: 2, maxWidth: 400, maxHeight: 400, overflow: 'auto' }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: '#7c3aed' }}>
          Actividades No Lectivas ({eventos.length})
        </Typography>
        {eventos.map((evt, idx) => (
          <Box key={evt.id || idx} sx={{ mb: 1.5, pb: 1.5, borderBottom: idx < eventos.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', fontSize: '0.65rem' }}>
              NO LECTIVA
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#333', fontSize: '0.8rem', mt: 0.25 }}>
              {evt.actividadNoLectiva || 'ACTIVIDAD NO LECTIVA'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem', mt: 0.25 }}>
              <PersonIcon sx={{ fontSize: 11 }} /> {evt.docente?.nombreCompleto || 'Sin docente'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem' }}>
              <RoomIcon sx={{ fontSize: 11 }} /> {evt.aula?.nombre || 'Sin aula asignada'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666', fontWeight: 500, fontSize: '0.7rem' }}>
              {evt.horaInicio} - {evt.horaFin}
            </Typography>
          </Box>
        ))}
      </Box>
    </Popover>
  );
};

export default PopoverEventos;
