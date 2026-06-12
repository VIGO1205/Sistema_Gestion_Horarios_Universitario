import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { getVentanasSocket } from '@/lib/socket';

export const useVentanaAtencion = (usuario: any, esDocente: boolean) => {
  const [estadoSeleccion, setEstadoSeleccion] = useState<any>(null);

  useEffect(() => {
    if (!esDocente || !usuario?.docenteId) return;

    const fetchEstado = async () => {
      try {
        const estadoRes = await api.get('/ventanas/mi-estado');
        setEstadoSeleccion(estadoRes.data);
      } catch (error) {
        console.error('Error fetching estado ventana:', error);
      }
    };

    fetchEstado();

    let vSocket: any = null;
    const initSocket = async () => {
      vSocket = await getVentanasSocket();
      
      const handleEstadoUpdate = (payload: any) => {
        if (Number(payload.docenteId) === Number(usuario.docenteId)) {
          setEstadoSeleccion(payload);
        }
      };

      vSocket.on('ventanas:mi-estado', handleEstadoUpdate);
    };

    initSocket();

    return () => {
      if (vSocket) {
        vSocket.off('ventana:estado:update');
        vSocket.off('ventana:update');
      }
    };
  }, [usuario?.docenteId, esDocente]);

  const docentePuedeGestionar = esDocente
    ? (estadoSeleccion?.estado === 'en_atencion' && estadoSeleccion?.ventanaEstado !== 'pausada')
    : true;

  return {
    estadoSeleccion,
    docentePuedeGestionar
  };
};
