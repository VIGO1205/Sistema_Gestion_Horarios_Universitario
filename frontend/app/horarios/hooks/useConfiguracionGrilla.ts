import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { getHorariosSocket } from '@/lib/socket';

export const useConfiguracionGrilla = (cicloId: string | number | undefined) => {
  const [configGrilla, setConfigGrilla] = useState({
    horaInicio: '07:00',
    horaFin: '22:00',
    almuerzoInicio: '13:00',
    almuerzoFin: '14:00',
    diasActivos: [1, 2, 3, 4, 5, 6] // Lunes a Sábado
  });
  const [loadingConfig, setLoadingConfig] = useState(false);

  const fetchConfig = async () => {
    if (!cicloId) return;
    setLoadingConfig(true);
    try {
      const configRes = await api.get(`/ciclos/${cicloId}/configuracion`);
      if (configRes.data) {
        const config = {
          ...configRes.data,
          horaInicio: configRes.data.horaInicio?.substring(0, 5),
          horaFin: configRes.data.horaFin?.substring(0, 5),
          almuerzoInicio: configRes.data.almuerzoInicio?.substring(0, 5),
          almuerzoFin: configRes.data.almuerzoFin?.substring(0, 5),
          diasActivos: typeof configRes.data.diasActivos === 'string' 
            ? configRes.data.diasActivos.split(',').map(Number) 
            : Array.isArray(configRes.data.diasActivos) 
              ? configRes.data.diasActivos.map(Number)
              : [1, 2, 3, 4, 5, 6]
        };
        setConfigGrilla(config);
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [cicloId]);

  useEffect(() => {
    let socket: any = null;
    const initSocket = async () => {
      socket = await getHorariosSocket();
      
      const handleConfigUpdate = (data: any) => {
        if (data.cicloId === cicloId) {
          const config = {
            ...data,
            horaInicio: data.horaInicio?.substring(0, 5),
            horaFin: data.horaFin?.substring(0, 5),
            almuerzoInicio: data.almuerzoInicio?.substring(0, 5),
            almuerzoFin: data.almuerzoFin?.substring(0, 5),
            diasActivos: typeof data.diasActivos === 'string' 
              ? data.diasActivos.split(',').map(Number) 
              : Array.isArray(data.diasActivos)
                ? data.diasActivos.map(Number)
                : [1, 2, 3, 4, 5, 6]
          };
          setConfigGrilla(config);
        }
      };

      socket.on('configuracion:update', handleConfigUpdate);
      socket.on('configuracion:change', handleConfigUpdate);
    };

    initSocket();

    return () => {
      if (socket) {
        socket.off('configuracion:update');
        socket.off('configuracion:change');
      }
    };
  }, [cicloId]);

  const updateConfig = async (newConfig: any) => {
    if (!cicloId) return;
    try {
      await api.put(`/ciclos/${cicloId}/configuracion`, newConfig);
      // El socket se encargará de actualizar el estado para todos
      const socket = await getHorariosSocket();
      socket.emit('configuracion:change', newConfig);
    } catch (error) {
      console.error("Error actualizando configuración:", error);
      throw error;
    }
  };

  return {
    configGrilla,
    setConfigGrilla,
    loadingConfig,
    fetchConfig,
    updateConfig
  };
};
