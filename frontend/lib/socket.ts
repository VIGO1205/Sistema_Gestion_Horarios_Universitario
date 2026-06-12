let socket: any = null;
let notifSocket: any = null;
let horariosSocket: any = null;
let socketToken: string | null = null;

const buildSocket = async (namespace: string, token: string | null) => {
  const { io } = await import('socket.io-client');
  // Usar la misma URL que la API para consistencia
  const backend = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  console.log('[Socket] Conectando a:', backend + namespace);
  
  const socket = io(backend + namespace, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  // Logs para debug
  socket.on('connect', () => {
    console.log('[Socket] Conectado a', namespace, 'con ID:', socket.id);
  });

  socket.on('connect_error', (error: any) => {
    console.error('[Socket] Error de conexión:', error);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[Socket] Desconectado:', reason);
  });

  return socket;
};

export async function getHorariosSocket() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (horariosSocket && socketToken === token) {
    if (!horariosSocket.connected) {
      horariosSocket.connect();
    }
    return horariosSocket;
  }

  if (horariosSocket) {
    try {
      horariosSocket.disconnect();
    } catch (_error) {
      // ignore
    }
  }

  horariosSocket = await buildSocket('/horarios', token);
  socketToken = token;
  return horariosSocket;
}

export async function getVentanasSocket() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (socket && socketToken === token) {
    if (!socket.connected) {
      socket.connect();
    }
    return socket;
  }

  if (socket) {
    try {
      socket.disconnect();
    } catch (_error) {
      // ignore
    }
  }

  socket = await buildSocket('/ventanas', token);
  socketToken = token;
  return socket;
}

export async function getNotificacionesSocket() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (notifSocket && socketToken === token) {
    if (!notifSocket.connected) {
      notifSocket.connect();
    }
    return notifSocket;
  }

  if (notifSocket) {
    try {
      notifSocket.disconnect();
    } catch (_error) {
      // ignore
    }
  }

  notifSocket = await buildSocket('/notificaciones', token);
  socketToken = token;
  return notifSocket;
}

export function getExistingSocket() {
  return socket;
}

export function resetSockets() {
  if (socket) {
    try { socket.disconnect(); } catch (_e) {}
    socket = null;
  }
  if (notifSocket) {
    try { notifSocket.disconnect(); } catch (_e) {}
    notifSocket = null;
  }
  socketToken = null;
}
