import type { ClassType } from "./dataPoint";
export interface WorkerDataMessage {
  type: ClassType;
  data: unknown;
  ip: string;
}

export type WorkerMessage = WorkerDataMessage;
