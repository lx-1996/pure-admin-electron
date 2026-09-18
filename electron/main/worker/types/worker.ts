import type { ClassType } from "./dataPoint";
import type { IpcChannel, IpcRequest } from "../../../shared/ipc";
type Event = "bcuConnStatus";
export interface WorkerDataMessage {
  type: "data";
  class: ClassType;
  data: unknown;
  ip: string;
}
export interface WorkerEventMessage {
  type: "event";
  api: Event;
  args: any;
}
export interface WorkerTaskMessage {
  type: "task"; // 任务回包（result / error 二选一）
  requestId: string;
  result?: unknown;
  error?: string;
}
export type WorkerOutMessage =
  | WorkerDataMessage
  | WorkerEventMessage
  | WorkerTaskMessage;

/**
 * 主进程 -> worker 的入站消息。
 * 约定：`api` 与 `IpcRequest` 的字段**摊平**在同一层，
 * worker 侧直接读 `message.payload` / `message.requestId`，
 * 不要再用 `{ api, args }` 这种嵌套结构（`args` 里的 payload 会读不到）。
 */
export type WorkerInMessage = {
  [C in IpcChannel]: { api: C } & IpcRequest<C>;
}[IpcChannel];
