import { io, type Socket } from "socket.io-client";
import type { WsEvents } from "@cotask/types";

const WS_URL = process.env["NEXT_PUBLIC_WS_URL"] ?? "http://localhost:3002";

let socket: Socket | null = null;

export function getSocket(accessToken: string): Socket {
  if (socket?.connected) return socket;

  socket = io(WS_URL, {
    auth: { token: accessToken },
    reconnectionDelay: 1000,
    reconnectionDelayMax: 30000,
    transports: ["websocket"],
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

type Handler<K extends keyof WsEvents> = (payload: WsEvents[K]) => void;

export function onWsEvent<K extends keyof WsEvents>(event: K, handler: Handler<K>) {
  socket?.on(event as string, handler as (...args: unknown[]) => void);
  return () => socket?.off(event as string, handler as (...args: unknown[]) => void);
}
