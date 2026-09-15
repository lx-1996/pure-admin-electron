/// <reference types="vite-plugin-electron/electron-env" />
import type { IpcChannel, IpcRequest, IpcResponse } from "./shared/ipc";
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      VSCODE_DEBUG?: "true";
      DIST_ELECTRON: string;
      DIST: string;
      /** /dist/ or /public/ */
      PUBLIC: string;
    }
  }
  interface Window {
    ipcRenderer: {
      on(
        channel: string,
        listener: (event: any, ...args: any[]) => void
      ): number;

      off(listenerId: number): void;

      send(channel: string, ...args: any[]): void;

      // 关键：让 invoke 根据通道名推导 request/response
      invoke<C extends IpcChannel>(
        channel: C,
        args: IpcRequest<C>
      ): Promise<IpcResponse<C>>;

      listenerCount(channel: string): number;

      listeners(channel: string): Function[];
    };
  }
}
