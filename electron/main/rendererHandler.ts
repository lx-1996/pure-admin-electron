import { ipcMain, BrowserWindow } from "electron";
import type { IpcChannel, IpcRequest, IpcResponse } from "../shared/ipc";
import type { ChildProcess } from "node:child_process";
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
function initRendererHandler(
  { preload, url, indexHtml }: InitOptions,
  worker: ChildProcess
) {
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
  handleIpc("set-ips", args => {
    worker.send({ api: "set-ips", args });
    return { success: true };
  });
}
export { initRendererHandler };
