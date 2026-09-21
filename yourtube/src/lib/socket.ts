import { io, Socket } from "socket.io-client";
import { getBackendUrl } from "./backendUrl";

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const backendUrl = getBackendUrl();

    socket = io(backendUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
  }
  return socket;
};
