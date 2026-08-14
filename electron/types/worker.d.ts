interface WorkerDataMessage {
  type: "data";

  data: unknown;
}

interface WorkerAlarmMessage {
  type: "alarm";

  data: {
    level: number;
    message: string;
  };
}

interface WorkerErrorMessage {
  type: "error";

  message: string;
}

type WorkerMessage =
  | WorkerDataMessage
  | WorkerAlarmMessage
  | WorkerErrorMessage;
