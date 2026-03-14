import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './auth0';
import { getAccessToken } from './api';

let socket: Socket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Connect to the Socket.io server with the current auth token.
 */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  // Disconnect existing socket if any
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  const token = getAccessToken();
  if (!token) {
    throw new Error('No access token available for socket connection');
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    if (__DEV__) console.log('[Socket] Connected:', socket?.id);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  });

  socket.on('disconnect', (reason) => {
    if (__DEV__) console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    if (__DEV__) console.error('[Socket] Connection error:', err.message);
  });

  return socket;
}

/**
 * Get the current socket instance (or null if not connected).
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect and clean up the socket.
 */
export function disconnectSocket(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Update the auth token on the existing socket so reconnections use
 * the fresh token. Call this after a token refresh.
 */
export function updateSocketAuth(): void {
  if (socket) {
    const token = getAccessToken();
    if (token) {
      (socket as any).auth = { token };
    }
  }
}

/**
 * Reconnect with a fresh token (e.g. after token refresh).
 */
export function reconnectSocket(): Socket {
  disconnectSocket();
  return connectSocket();
}
