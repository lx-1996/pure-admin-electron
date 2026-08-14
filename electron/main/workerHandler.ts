import { fork, type ChildProcess } from "node:child_process";
import { join } from "node:path";
type SendToRenderer = (channel: string, data: unknown) => void;
let worker: ChildProcess | null = null;
function startWorker(sendToRenderer: SendToRenderer, dirname: any) {
  const workerPath = join(dirname, "worker.js");
  worker = fork(workerPath);
  worker.on("message", message => {
    const msg = message as WorkerMessage;

    switch (msg.type) {
      case "data":
        //console.log("实时数据", msg.data);

        sendToRenderer("modbus-data", msg.data);

        break;

      case "alarm":
        console.log("告警", msg.data);

        break;

      case "error":
        console.error(msg.message);

        break;
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
  // 告诉 Worker 开始工作
  worker.send("start");
}
export { startWorker };
