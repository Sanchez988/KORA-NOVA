import type { Server } from 'socket.io';

let ioSingleton: Server | null = null;

export function setRealtimeIO(server: Server): void {
  ioSingleton = server;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!ioSingleton) return;
  ioSingleton.to(`user:${userId}`).emit(event, payload);
}
