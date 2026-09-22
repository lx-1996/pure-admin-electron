import { onMounted, onUnmounted, onActivated, onDeactivated } from "vue";

type IpcHandler = (event: any, ...args: any[]) => void;

/**
 * 注册渲染进程侧的 IPC 监听，并随组件生命周期自动注销。
 *
 * listenerId 由 preload 侧 `nextListenerId` 自增计数器生成，全局唯一、永不复用，
 * 因此无需调用方管理 id，也不会出现跨组件误注销。
 *
 * 兼容性：
 * - 普通组件：onMounted 注册、onUnmounted 注销；
 * - 被 <keep-alive> 缓存的组件：额外在 onActivated 重新注册、onDeactivated 注销，
 *   用 listenerId 非空守卫保证不会重复注册。
 */
export function useIpcListener(channel: string, handler: IpcHandler) {
  let listenerId: number | null = null;

  const register = () => {
    if (listenerId === null) {
      listenerId = window.ipcRenderer.on(channel, handler);
    }
  };
  const unregister = () => {
    if (listenerId !== null) {
      window.ipcRenderer.off(listenerId);
      listenerId = null;
    }
  };

  onMounted(register);
  onUnmounted(unregister);
  onActivated(register);
  onDeactivated(unregister);

  return { off: unregister };
}
