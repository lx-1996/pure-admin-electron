import type { WorkerDataMessage } from "../../types/worker";
console.log("worker running");
const message: WorkerDataMessage = {
  type: "data",

  data: {
    voltage: 52.1,
    current: 10.5,
    soc: 80
  }
};
setInterval(() => {
  process.send?.(message);
}, 1000);
