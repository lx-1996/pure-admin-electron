import { ipcMain, BrowserWindow } from "electron";
import type { IpcChannel, IpcRequest, IpcResponse } from "../shared/ipc";
import { requestWorker } from "./workerHandler";
interface InitOptions {
  preload: string;
  url: string | undefined;
  indexHtml: string;
}
/* ============ 主进程侧带类型的注册封装 ============ */
function handleIpc<C extends IpcChannel>(
  channel: C,
  handler: (args: IpcRequest<C>) => IpcResponse<C> | Promise<IpcResponse<C>>
) {
  ipcMain.handle(channel, (_, args: any) => handler(args as IpcRequest<C>));
}
function initRendererHandler({ preload, url, indexHtml }: InitOptions) {
  // New window example arg: new windows url
  ipcMain.handle("open-win", (_, arg) => {
    const childWindow = new BrowserWindow({
      webPreferences: {
        preload,
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    if (process.env.VITE_DEV_SERVER_URL) {
      childWindow.loadURL(`${url}#${arg}`);
    } else {
      childWindow.loadFile(indexHtml, { hash: arg });
    }
  });
  // 三个通道都是「下发任务 + 等 worker 回传结果」
  handleIpc("connectAllInputIps", args =>
    requestWorker("connectAllInputIps", args)
  );
  handleIpc("connectAll", args => requestWorker("connectAll", args));
  handleIpc("disconnectAll", args => requestWorker("disconnectAll", args));
}
export { initRendererHandler };
