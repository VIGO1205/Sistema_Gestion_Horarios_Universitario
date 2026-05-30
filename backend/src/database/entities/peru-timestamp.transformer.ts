import { ValueTransformer } from 'typeorm';

const PERU_OFFSET_MS = 5 * 60 * 60 * 1000;

const pad = (value: number) => String(value).padStart(2, '0');

const toPeruTimestampString = (date: Date): string => {
  const peruDate = new Date(date.getTime() - PERU_OFFSET_MS);
  const ms = String(peruDate.getUTCMilliseconds()).padStart(3, '0');
  return `${peruDate.getUTCFullYear()}-${pad(peruDate.getUTCMonth() + 1)}-${pad(peruDate.getUTCDate())} ${pad(peruDate.getUTCHours())}:${pad(peruDate.getUTCMinutes())}:${pad(peruDate.getUTCSeconds())}.${ms}`;
};

const fromPeruTimestampValue = (value: unknown): Date | null => {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return new Date(value.getTime() + PERU_OFFSET_MS);
  }

  if (typeof value === 'string') {
    // Soportar formatos con y sin milisegundos
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?)?/);
    if (!match) {
      return new Date(value);
    }

    const [, year, month, day, hour = '00', minute = '00', second = '00', ms = '000'] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}-05:00`);
  }

  return value as Date;
};

export const peruTimestampTransformer: ValueTransformer = {
  to(value: Date | string | null): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string') {
      return value;
    }

    return toPeruTimestampString(value);
  },
  from(value: unknown): Date | null {
    return fromPeruTimestampValue(value);
  },
};