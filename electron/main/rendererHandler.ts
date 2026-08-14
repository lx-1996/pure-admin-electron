import { ipcMain, BrowserWindow } from "electron";
interface InitOptions {
  preload: string;
  url: string | undefined;
  indexHtml: string;
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
}
export { initRendererHandler };
