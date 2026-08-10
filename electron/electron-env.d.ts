/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
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
    on(channel: string, listener: (event: any, ...args: any[]) => void): void;

    off(channel: string, listener: any): void;

    send(channel: string, ...args: any[]): void;

    invoke(channel: string, ...args: any[]): Promise<any>;
  };
}
