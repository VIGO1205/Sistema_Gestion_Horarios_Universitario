import { HORA_INICIO_TABLA } from '../constantes';

export const timeToSlotIndex = (time: string, baseHour: string = '07:00') => {
  if (!time) return 0;
  const startHour = parseInt(baseHour.split(':')[0]);
  return parseInt(time.split(':')[0]) - startHour;
};

export const slotIndexToTime = (index: number, baseHour: string = '07:00') => {
  const startHour = parseInt(baseHour.split(':')[0]);
  return `${String(startHour + index).padStart(2, '0')}:00`;
};

export const slotIndexToEndTime = (index: number, baseHour: string = '07:00') => {
  const startHour = parseInt(baseHour.split(':')[0]);
  return `${String(startHour + index + 1).padStart(2, '0')}:00`;
};

export const normalizeSlotRange = (startIndex: number, endIndex: number) => ({
  startIndex: Math.min(startIndex, endIndex),
  endIndex: Math.max(startIndex, endIndex),
});

export const formatHoraHHMM = (hora: string) => {
  if (!hora) return '';
  const parts = hora.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return hora;
};
