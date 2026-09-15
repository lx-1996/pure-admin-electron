import { readData } from "./read/read";
import { ModbusTCPClient } from "./client/clientClass";
import { assertColumnLength } from "./dataPoint/tableGenerate";
interface ClientOptions {
  id: number;
  ip: string;
  port: number;
  connectTimeout: number;
  responseTimeout: number;
  maxRetry: number;
  heartBeatInterval: number;
}
let newClients: ClientOptions[] = [];
const clients: Map<string, ModbusTCPClient> = new Map();
async function initTCPClients(newClients: ClientOptions[]) {
  //console.log(clients.size);
  if (clients.size > 0) {
    await Promise.all([...clients.values()].map(c => c.disConnect()));
    clients.clear();
  }
  for (const item of newClients) {
    const key = `${item.ip}:${item.port}`;
    clients.set(
      key,
      new ModbusTCPClient(
        item.ip,
        item.port,
        item.connectTimeout,
        item.responseTimeout,
        item.maxRetry,
        item.heartBeatInterval
      )
    );
  }
  const res = await Promise.allSettled(
    [...clients.values()].map(async item => {
      await item.repeatConnect();
      await start(item);
      // client 为 ModbusRTU 实例，内部含 socket/Timeout 等循环引用，
      // 不可经 process.send 序列化，仅回传纯数据属性
      const { client: _client, ...clientProps } = item.clientProps;
      return clientProps;
    })
  );
  return res;
}
async function start(modbusTCPClient: ModbusTCPClient) {
  if (modbusTCPClient.clientProps.connectStatus !== "connected") {
    return;
  }
  let readTimer: any = null;
  const readTask = async () => {
    if (modbusTCPClient.clientProps.connectStatus !== "connected") {
      if (readTimer) clearTimeout(readTimer);
      return;
    }
    const bmuConfig = modbusTCPClient.client_data.bmu_config;
    try {
      await readData(modbusTCPClient, "cell_vltg", bmuConfig);
      await readData(modbusTCPClient, "cell_temp", bmuConfig);
      await readData(modbusTCPClient, "cell_soc", bmuConfig);
      await readData(modbusTCPClient, "cell_soh", bmuConfig);
      await readData(modbusTCPClient, "system_summary");
      await readData(modbusTCPClient, "cluster_summary");
      await readData(modbusTCPClient, "pack_summary", bmuConfig);
      // await readData(modbusTCPClient, "pcs_data");
      // await readData(modbusTCPClient, "cooler_data");
      // await readData(modbusTCPClient, "dehumidifier_data");
      // await readData(modbusTCPClient, "firefighting_data");
    } catch (e) {
      console.error(e);
    }
    readTimer = setTimeout(readTask, 1000);
  };
  readTask();
}
async function messageHandler(message: any) {
  switch (message?.api) {
    case "set-ips": {
      const {
        ipStart,
        ipNums,
        port,
        connectTimeout,
        responseTimeout,
        maxRetry,
        heartBeatInterval
      } = message?.args.payload;
      const parts = ipStart.split(".");
      const prefix = parts.slice(0, 3).join("."); // "192.168.1"
      const last = Number(parts[3]); // 10
      const ips = Array.from({ length: ipNums }, (_, index) => {
        return {
          id: index + 1,
          ip: `${prefix}.${last + index}`,
          port,
          connectTimeout,
          responseTimeout,
          maxRetry,
          heartBeatInterval
        };
      });
      newClients = ips;
      const res = await initTCPClients(newClients);
      process.send?.({
        type: "event",
        api: "set-ips",
        args: {
          payload: res
        }
      });
      console.log("最终结果:", res);
    }
  }
}
// 点表完整性校验：列错位/寄存器数不符时直接终止，避免产出错位数据
assertColumnLength();
process.on("message", messageHandler);
