import type { ClassType } from "./dataPoint";
type Event = "set-ips";
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
