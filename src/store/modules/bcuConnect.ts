import { defineStore } from "pinia";
import { store } from "../utils";
interface Server {
  serverHost: string;
  serverPort: number;
  serverConnStatus: ServerStatus;
}
type ServerStatus =
  | "disconnected"
  | "connected"
  | "connecting"
  | "failRead"
  | "notConnected"
  | "cannotConnect";
export const useBcuConnectStore = defineStore("bcuConnect", {
  state: () => ({
    servers: [] as Server[]
  }),
  getters: {
    getServers: state => state.servers,
    getServerStatus: state => {
      return state.servers.map(server => server.serverConnStatus);
    }
  },
  actions: {
    addServer(server: Server) {
      this.servers.push(server);
    },
    removeAllServers() {
      this.servers = [];
    }
  }
});
export function useBcuConnectStoreHook() {
  return useBcuConnectStore(store);
}
