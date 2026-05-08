import { io, type Socket } from 'socket.io-client';
import { resolveApiUrl } from '../config';

/** Base del API sin `/api` (mismo host:puerto que Socket.IO del Back). */
function socketOrigin(): string {
  return resolveApiUrl().replace(/\/api\/?$/i, '').replace(/\/+$/, '');
}

export type MatchCreatedPayload = {
  matchId: string;
  matchedUserId: string;
  matchedName: string;
  matchedPhotoUri: string | null;
};

let socket: Socket | null = null;

export function connectMatchRealtime(
  token: string,
  onMatchCreated: (payload: MatchCreatedPayload) => void
): void {
  disconnectMatchRealtime();
  const url = socketOrigin();
  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 2000,
  });
  socket.on('match_created', onMatchCreated);
}

export function disconnectMatchRealtime(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
