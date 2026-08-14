import { ipcRenderer, contextBridge } from "electron";

// --------- Expose some API to the Renderer process ---------
// contextBridge 对函数不保证跨桥引用恒等性：渲染进程两次传入的
// “同一个 listener”，在 preload 侧可能是两个不同的代理对象，
// 用 listener 当 key 做 === 比对也不可靠。
// 因此这里改用自增 listenerId（原始类型，跨桥为值拷贝，绝对稳定）：
// on 返回一个 listenerId，渲染进程保存该 id，off 时用 id 精确注销。
const listenerMap = new Map<
  number,
  { channel: string; wrapper: (...args: any[]) => void }
>();
let nextListenerId = 1;

contextBridge.exposeInMainWorld("ipcRenderer", {
  on(channel: string, listener: (...args: any[]) => void) {
    const listenerId = nextListenerId++;
    const wrapper = (...args: any[]) => listener(...args);
    listenerMap.set(listenerId, { channel, wrapper });
    ipcRenderer.on(channel, wrapper);
    return listenerId;
  },
  off(listenerId: number) {
    const record = listenerMap.get(listenerId);
    if (record) {
      ipcRenderer.removeListener(record.channel, record.wrapper);
      listenerMap.delete(listenerId);
    }
  },
  send: ipcRenderer.send.bind(ipcRenderer),
  invoke: ipcRenderer.invoke.bind(ipcRenderer),
  listenerCount: ipcRenderer.listenerCount.bind(ipcRenderer),
  listeners: ipcRenderer.listeners.bind(ipcRenderer)

  // You can expose other APTs you need here.
  // ...
});

// --------- Preload scripts loading ---------
function domReady(
  condition: DocumentReadyState[] = ["complete", "interactive"]
) {
  return new Promise(resolve => {
    if (condition.includes(document.readyState)) {
      resolve(true);
    } else {
      document.addEventListener("readystatechange", () => {
        if (condition.includes(document.readyState)) {
          resolve(true);
        }
      });
    }
  });
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(e => e === child)) {
      return parent.appendChild(child);
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(e => e === child)) {
      return parent.removeChild(child);
    }
  }
};

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
  const className = `loaders-css__square-spin`;
  const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `;
  const oStyle = document.createElement("style");
  const oDiv = document.createElement("div");

  oStyle.id = "app-loading-style";
  oStyle.innerHTML = styleContent;
  oDiv.className = "app-loading-wrap";
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`;

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle);
      safeDOM.append(document.body, oDiv);
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle);
      safeDOM.remove(document.body, oDiv);
    }
  };
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

window.onmessage = ev => {
  ev.data.payload === "removeLoading" && removeLoading();
};

setTimeout(removeLoading, 4999);
