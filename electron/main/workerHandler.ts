import { fork, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import type {
  WorkerDataMessage,
  WorkerEventMessage
} from "./worker/types/worker";
type SendToRenderer = (channel: string, data: object) => void;
let worker: ChildProcess | null = null;
function startWorker(sendToRenderer: SendToRenderer, dirname: string) {
  const workerPath = join(dirname, "worker.js");
  worker = fork(workerPath);
  worker.on("message", message => {
    const msg = message as WorkerDataMessage | WorkerEventMessage;
    //console.log(msg)
    switch (msg.type) {
      case "data": {
        const dataToRenderer = {
          data: msg.data,
          ip: msg.ip
        };
        sendToRenderer(msg.class, dataToRenderer);
        break;
      }
      case "event": {
        sendToRenderer(msg.api, msg.args);
        break;
      }
      default: {
        console.warn(
          "Worker 收到未知消息类型:",
          (msg as { type?: unknown }).type
        );
      }
    }
  });
  worker.on("error", error => {
    console.error("Worker 错误:", error);
  });

  // Worker 退出
  worker.on("exit", (code, signal) => {
    console.log(`Worker 退出 code=${code}, signal=${signal}`);

    worker = null;
  });
  worker.on("close", code => {
    console.log("worker close", code);
  });
  // 子进程通过 process.on("message") 自行驱动，无需额外启动信号
  return worker;
}
export { startWorker, worker };
