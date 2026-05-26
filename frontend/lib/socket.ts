let socket: any = null;
let socketToken: string | null = null;

const buildVentanasSocket = async (token: string | null) => {
  const { io } = await import('socket.io-client');
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

  return io(backend + '/ventanas', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
};

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
      // ignore disconnect errors when replacing the socket instance
    }
    socket = null;
    socketToken = null;
  }

  socket = await buildVentanasSocket(token);
  socketToken = token;
  return socket;
}

export function getExistingSocket() {
  return socket;
}

export function resetVentanasSocket() {
  if (socket) {
    try {
      socket.disconnect();
    } catch (_error) {
      // ignore
    }
  }

  socket = null;
  socketToken = null;
}
