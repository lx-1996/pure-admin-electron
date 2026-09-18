import { fork, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import type { WorkerOutMessage } from "./worker/types/worker";
import type { IpcChannel, IpcRequest, IpcResponse } from "../shared/ipc";

type SendToRenderer = (channel: string, data: object) => void;
type TaskEntry = {
  resolve: (value: unknown) => void;
  reject: (err: unknown) => void;
};

/** pending 任务表：requestId -> { resolve, reject } */
export const taskMap = new Map<string, TaskEntry>();

/** worker 连续崩溃自动重启的次数上限，避免配置错误导致无限崩溃循环 */
const MAX_RESTART = 3;
/** worker 存活超过该时长即视为偶发崩溃，重置重启计数 */
const RESTART_RESET_MS = 10_000;
/** 重启前的等待时间，给端口/句柄释放留出时间 */
const RESTART_DELAY_MS = 1000;

let worker: ChildProcess | null = null;
let sendToRenderer: SendToRenderer | null = null;
let workerDir = "";
let restartCount = 0;
let stopping = false;

/** 取当前可用的 worker；未启动或已退出返回 `null` */
export function getWorker(): ChildProcess | null {
  return worker && !worker.killed && worker.exitCode === null ? worker : null;
}

/** 让所有等待中的调用明确失败，而不是永远 await */
function rejectPendingTasks(reason: string) {
  for (const [requestId, task] of taskMap) {
    task.reject(new Error(`${reason}，任务 ${requestId} 未完成`));
  }
  taskMap.clear();
}

/**
 * 主进程 -> worker 的唯一发送入口。
 * 消息结构由 `WorkerInMessage` 定义并强制摊平（`api` + request 字段），
 * 调用方只能按 `IpcChannelMap` 的通道与请求体发送，发不出 `{ api, args }` 这类错位结构。
 */
export function sendToWorker<C extends IpcChannel>(
  channel: C,
  request: IpcRequest<C>
): void {
  const target = getWorker();
  if (!target) throw new Error("worker 未启动或已退出，无法下发指令");
  target.send({ api: channel, ...request });
}

/** 发送任务给 worker 并等待回包：唯一一处类型断言点 */
export function requestWorker<C extends IpcChannel>(
  channel: C,
  request: IpcRequest<C>
): Promise<IpcResponse<C>> {
  const target = getWorker();
  if (!target) {
    return Promise.reject(new Error("worker 未启动或已退出，无法执行任务"));
  }
  return new Promise<IpcResponse<C>>((resolve, reject) => {
    taskMap.set(request.requestId, {
      resolve: value => resolve(value as IpcResponse<C>),
      reject
    });
    try {
      target.send({ api: channel, ...request });
    } catch (e) {
      // 发送失败（例如 IPC 通道已关闭）时立刻失败，避免 promise 永远挂起
      taskMap.delete(request.requestId);
      reject(e);
    }
  });
}

function onWorkerMessage(raw: unknown) {
  const msg = raw as WorkerOutMessage;
  if (msg.type === "task") {
    const task = taskMap.get(msg.requestId);
    if (!task) return;
    taskMap.delete(msg.requestId);
    if (msg.error) task.reject(new Error(msg.error));
    else task.resolve({ success: true, data: msg.result });
    return;
  }
  switch (msg.type) {
    case "data":
      sendToRenderer?.(msg.class, { data: msg.data, ip: msg.ip });
      break;
    case "event":
      sendToRenderer?.(msg.api, msg.args);
      break;
    default:
      console.warn("收到未知的 worker 消息:", (msg as { type?: unknown }).type);
  }
}

function forkWorker(): ChildProcess {
  const child = fork(join(workerDir, "worker.js"));
  worker = child;

  // 存活足够久说明这次启动是正常的，重置崩溃计数
  const resetTimer = setTimeout(() => (restartCount = 0), RESTART_RESET_MS);

  child.on("message", onWorkerMessage);
  child.on("error", error => console.error("Worker 错误:", error));

  child.on("exit", (code, signal) => {
    clearTimeout(resetTimer);
    console.log(`Worker 退出 code=${code}, signal=${signal}`);
    if (worker !== child) return; // 已被新实例取代，忽略旧实例的退出
    worker = null;
    // worker 一死，等待中的任务不可能再拿到回包，必须立刻失败
    rejectPendingTasks(`worker 已退出(code=${code})`);

    if (stopping || code === 0) return;
    if (restartCount >= MAX_RESTART) {
      console.error(
        `worker 已连续退出 ${MAX_RESTART} 次，停止自动重启，请检查日志`
      );
      return;
    }
    restartCount += 1;
    console.warn(
      `worker 将在 ${RESTART_DELAY_MS}ms 后自动重启（第 ${restartCount} 次）`
    );
    setTimeout(() => {
      if (!stopping) forkWorker();
    }, RESTART_DELAY_MS);
  });

  child.on("close", code => {
    console.log("worker close", code);
  });

  return child;
}

function startWorker(sendToRendererFn: SendToRenderer, dirname: string) {
  sendToRenderer = sendToRendererFn;
  workerDir = dirname;
  stopping = false;
  restartCount = 0;
  return forkWorker();
}

/** 应用退出时调用：停止自动重启，并让等待中的调用立刻失败 */
function stopWorker() {
  stopping = true;
  rejectPendingTasks("应用正在退出");
  worker?.kill();
  worker = null;
}

export { startWorker, stopWorker };
