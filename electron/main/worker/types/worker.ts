import type { ClassType } from "../dataPoint/tableGenerate";
export interface WorkerDataMessage {
  type: ClassType;

  data: unknown;
}

interface WorkerAlarmMessage {
  type: "alarm";

  data: {
    level: number;
    message: string;
  };
}

export type WorkerMessage = WorkerDataMessage | WorkerAlarmMessage;
