// @ts-nocheck
import type { Server } from "socket.io";

let _io: Server | null = null;

export const setSocketIO = (io: Server) => {
  _io = io;
};

export const getSocketIO = (): Server | null => _io;
