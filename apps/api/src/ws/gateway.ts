import type { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import type { WsEvents } from "@cotask/types";

export type WsGateway = ReturnType<typeof registerSocketGateway>;

export function registerSocketGateway(io: Server, redisUrl: string) {
  const pub = createClient({ url: redisUrl });
  const sub = pub.duplicate();

  Promise.all([pub.connect(), sub.connect()]).then(() => {
    io.adapter(createAdapter(pub, sub));
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth["token"] as string | undefined;
    if (!token) return next(new Error("Authentication required"));
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString());
      socket.data["userId"] = payload.sub as string;
      socket.data["workspaceId"] = payload.wid as string;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const wid = socket.data["workspaceId"] as string;
    const uid = socket.data["userId"] as string;
    // Join workspace room for shared events and personal room for notifications
    if (wid) socket.join(`workspace:${wid}`);
    if (uid) socket.join(`user:${uid}`);
  });

  return {
    emitToWorkspace<K extends keyof WsEvents>(workspaceId: string, event: K, payload: WsEvents[K]) {
      io.to(`workspace:${workspaceId}`).emit(event, payload);
    },
    emitToUser<K extends keyof WsEvents>(userId: string, event: K, payload: WsEvents[K]) {
      io.to(`user:${userId}`).emit(event, payload);
    },
  };
}
