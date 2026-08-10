export interface WorkerDataMessage {
  type: "data";

  data: {
    voltage: number;
    current: number;
    soc: number;
  };
}

export interface WorkerAlarmMessage {
  type: "alarm";

  data: {
    level: number;
    message: string;
  };
}

export interface WorkerErrorMessage {
  type: "error";

  message: string;
}

export type WorkerMessage =
  | WorkerDataMessage
  | WorkerAlarmMessage
  | WorkerErrorMessage;
