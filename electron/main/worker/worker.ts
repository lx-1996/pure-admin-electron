import { readData } from "./read/read";
import { ModbusTCPClient } from "./client/clientClass";
import { assertColumnLength } from "./dataPoint/tableGenerate";
import type { WorkerInMessage } from "./types/worker";
import type { ConnectResultItem } from "../../shared/ipc";
interface ClientOptions {
  id?: number;
  host: string;
  port: number;
  deviceId: number;
  connectTimeout: number;
  responseTimeout: number;
  maxRetry: number;
  heartBeatInterval: number;
}
const clients: Map<string, ModbusTCPClient> = new Map();
async function initTCPClients(newClients: ClientOptions[]) {
  //console.log(clients.size);
  if (clients.size > 0) {
    await Promise.all([...clients.values()].map(c => c.disConnect()));
    clients.clear();
  }
  for (const item of newClients) {
    clients.set(
      item.host,
      new ModbusTCPClient(
        item.host,
        item.port,
        item.deviceId,
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
      // 不可经 process.send 序列化，仅回传纯数据属性item.clientProps;
      return item.clientProps;
    })
  );
  return res;
}
async function start(modbusTCPClient: ModbusTCPClient) {
  if (modbusTCPClient.clientProps.status !== "connected") {
    return;
  }
  // 连接已建立，标记为「正在正常读取服务端」
  modbusTCPClient.clientProps.status = "goodRead";
  process.send?.({
    type: "event",
    api: "bcuConnStatus",
    args: modbusTCPClient.clientProps
  });
  let readTimer: any = null;
  const readTask = async () => {
    // 允许 connected / goodRead 两种状态继续读取；failRead/disconnected 等则停止
    if (
      modbusTCPClient.clientProps.status !== "connected" &&
      modbusTCPClient.clientProps.status !== "goodRead"
    ) {
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
/** 汇总本次建连结果（host + 最终状态），供渲染进程提示成功/失败的 ip */
function collectConnectResult(list: ClientOptions[]): ConnectResultItem[] {
  return list.map(item => ({
    host: item.host,
    status: clients.get(item.host)?.clientProps.status ?? "notConnected"
  }));
}
async function messageHandler(message: WorkerInMessage) {
  switch (message.api) {
    // 两个通道语义一致：重建（内部会先断开旧的）这批连接，并回传每个服务器的最终状态
    case "connectAll":
    case "connectAllInputIps": {
      if (!Array.isArray(message.payload) || message.payload.length === 0) {
        process.send!({
          type: "task",
          requestId: message.requestId,
          error: "没有需要连接的服务器（请先添加BCU）"
        });
        break;
      }
      try {
        await initTCPClients(message.payload);
        process.send!({
          type: "task",
          requestId: message.requestId,
          result: collectConnectResult(message.payload)
        });
      } catch (e) {
        process.send!({
          type: "task",
          requestId: message.requestId,
          error: (e as Error).message
        });
      }
      break;
    }
    case "disconnectAll": {
      const count = clients.size;
      if (count > 0) {
        await Promise.all([...clients.values()].map(c => c.disConnect()));
        clients.clear();
        process.send!({
          type: "task",
          requestId: message.requestId,
          result: { disconnected: count }
        });
      } else {
        // 没有可断开的连接时用 error 回包：主进程会走 reject，
        // 渲染进程才能提示真实原因，而不是被包装成一次"成功"
        process.send!({
          type: "task",
          requestId: message.requestId,
          error: "worker 中没有已建立的连接，请先添加BCU"
        });
      }
      break;
    }
    default:
      // 类型上已穷尽所有 api，此处仅为运行时兜底
      console.warn("未知消息api:", (message as { api?: unknown }).api);
      break;
  }
}
// 点表完整性校验：列错位/寄存器数不符时直接终止，避免产出错位数据
assertColumnLength();
process.on("message", raw => {
  // `process.on("message")` 的形参只有 Serializable，边界处收窄到 WorkerInMessage
  // 单条消息处理失败不能杀死 worker，否则所有已建立的 Modbus 连接会一起断开
  Promise.resolve(messageHandler(raw as WorkerInMessage)).catch(e => {
    console.error("worker 处理消息失败:", e);
  });
});
