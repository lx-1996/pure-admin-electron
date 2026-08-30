import type { ClassType } from "./dataPoint";
export interface WorkerDataMessage {
  type: ClassType;

  data: unknown;
}

export type WorkerMessage = WorkerDataMessage;
