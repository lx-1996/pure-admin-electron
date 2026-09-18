// electron/shared/ipc.ts
/* ============ set-ips（你的真实通道） ============ */
export interface ModbusTCPClientProps {
  status:
    | "notConnected"
    | "connecting"
    | "connected"
    | "cannotConnect"
    | "disconnected"
    | "goodRead"
    | "failRead";
  host: string;
  port: number;
  deviceId: number;
  connectTimeout: number;
  responseTimeout: number;
  reconnectTimes: number;
  maxRetry: number;
  heartBeatInterval: number;
  heartBeat: number;
}
/** 单个服务器的建连结果 */
export interface ConnectResultItem {
  host: string;
  status: ModbusTCPClientProps["status"];
}
export interface ConnectAllReq {
  payload: {
    host: string;
    port: number;
    deviceId: number;
    connectTimeout: number;
    responseTimeout: number;
    maxRetry: number;
    heartBeatInterval: number;
  }[];
  requestId: string;
}
export interface ConnectAllRes {
  success: boolean;
  /** 每个服务器最终的连接状态，供渲染进程提示成功/失败的 ip */
  data?: ConnectResultItem[];
  error?: string;
}
export interface DisconnectAllRes {
  success: boolean;
  /** 实际断开的连接数 */
  data?: { disconnected: number };
  error?: string;
}
/* ============ 通道注册表（核心，用来做 invoke 的双向类型推导） ============ */
export interface IpcChannelMap {
  connectAllInputIps: {
    /** 与 connectAll 相同的请求体与响应体：ip 段已由渲染进程展开成服务器列表 */
    request: ConnectAllReq;
    response: ConnectAllRes;
  };
  connectAll: {
    request: ConnectAllReq;
    response: ConnectAllRes;
  };
  disconnectAll: {
    request: ConnectAllReq;
    response: DisconnectAllRes;
  };
}

export type IpcChannel = keyof IpcChannelMap;
export type IpcRequest<C extends IpcChannel> = IpcChannelMap[C]["request"];
export type IpcResponse<C extends IpcChannel> = IpcChannelMap[C]["response"];
