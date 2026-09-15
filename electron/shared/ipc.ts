// electron/shared/ipc.ts
/* ============ set-ips（你的真实通道） ============ */
export interface SetIpsRequest {
  action: "set";
  payload: {
    ipStart: string;
    ipNums: number;
    port: number;
    connectTimeout: number;
    responseTimeout: number;
    maxRetry: number;
    heartBeatInterval: number;
  };
  requestId: string;
}
export interface SetIpsResponse {
  success: boolean;
  data?: { savedAt: number };
  error?: string;
}

/* ============ 通道注册表（核心，用来做 invoke 的双向类型推导） ============ */
export interface IpcChannelMap {
  "set-ips": { request: SetIpsRequest; response: SetIpsResponse };
}

export type IpcChannel = keyof IpcChannelMap;
export type IpcRequest<C extends IpcChannel> = IpcChannelMap[C]["request"];
export type IpcResponse<C extends IpcChannel> = IpcChannelMap[C]["response"];
