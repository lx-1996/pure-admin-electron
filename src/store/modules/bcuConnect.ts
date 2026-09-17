import { defineStore } from "pinia";
import { store } from "../utils";
interface Server {
  serverHost: string;
  serverConnStatus: ServerStatus;
}
type ServerStatus =
  | "notConnected"
  | "connecting"
  | "connected"
  | "cannotConnect"
  | "disconnected"
  | "goodRead"
  | "failRead";
export const useBcuConnectStore = defineStore("bcuConnect", {
  state: () => ({
    servers: new Map() as Map<string, Server>
  }),
  getters: {
    getServers: state => state.servers
  },
  actions: {
    addServer(ip: string, status: ServerStatus) {
      this.servers.set(ip, {
        serverHost: ip,
        serverConnStatus: status
      });
    },
    updateStatus(ip: string, status: ServerStatus) {
      if (this.servers.has(ip)) {
        const server = this.servers.get(ip);
        server.serverConnStatus = status;
      } else {
        this.addServer(ip, status);
      }
    }
  }
});
export function useBcuConnectStoreHook() {
  return useBcuConnectStore(store);
}
