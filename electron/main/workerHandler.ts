import { fork, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import type { WorkerMessage } from "./worker/types/worker";
type SendToRenderer = (channel: string, data: unknown) => void;
let worker: ChildProcess | null = null;
function startWorker(sendToRenderer: SendToRenderer, dirname: any) {
  const workerPath = join(dirname, "worker.js");
  worker = fork(workerPath);
  worker.on("message", message => {
    const msg = message as WorkerMessage;
    //console.log(msg)
    sendToRenderer(msg.type, msg.data);
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
  // 告诉 Worker 开始工作
  worker.send("start");
}
export { startWorker };
