import { defineStore } from "pinia";
import { store } from "../utils";
import type { ModbusTCPClientProps } from "../../../electron/shared/ipc";
type ServerStatus = ModbusTCPClientProps["status"];
const statusMap: Record<ServerStatus, string> = {
  notConnected: "未连接",
  connecting: "连接中",
  connected: "已连接",
  cannotConnect: "达到最大重连次数",
  disconnected: "已断开",
  goodRead: "读取中...",
  failRead: "读取失败"
};
export const useBcuConnectStore = defineStore("bcuConnect", {
  state: () => ({
    servers: new Map() as Map<string, ModbusTCPClientProps>
  }),
  getters: {
    //用 Array.from() 把迭代器转成数组，既满足表格的 data 类型，也保留了响应式
    serversArr: (state): ModbusTCPClientProps[] =>
      Array.from(state.servers.values()),
    serversArrMaped: state => {
      return Array.from(state.servers.values()).map(server => ({
        ...server,
        status: statusMap[server.status]
      }));
    }
  },
  actions: {
    addServer(connOption: ModbusTCPClientProps) {
      const { host } = connOption;
      this.servers.set(host, connOption);
    },
    updateStatus(connOption: ModbusTCPClientProps) {
      const { host, status } = connOption;
      if (this.servers.has(host)) {
        const server = this.servers.get(host);
        server.status = status;
      } else {
        this.addServer(connOption);
      }
    },
    getServersByStatus(status: ServerStatus) {
      return Array.from(this.servers.values()).filter(
        server => server.status === status
      );
    },
    areAllServersInStatus(status: ServerStatus, status1?: ServerStatus) {
      // 空列表不算"全部处于某状态"，否则按钮/分支会误判成已全部连接
      if (this.serversArr.length === 0) return false;
      return this.serversArr.every(
        server => server.status === status || server.status === status1
      );
    },
    hasAnyServerInStatus(status: ServerStatus) {
      return this.serversArr.some(server => server.status === status);
    },
    anyServerConnected() {
      return (
        this.hasAnyServerInStatus("connected") ||
        this.hasAnyServerInStatus("goodRead")
      );
    },
    areallServersConnected() {
      return this.areAllServersInStatus("connected", "goodRead");
    },
    canDisconnectAll() {
      return (
        this.hasAnyServerInStatus("connecting") || this.anyServerConnected()
      );
    }
  }
});
export function useBcuConnectStoreHook() {
  return useBcuConnectStore(store);
}
