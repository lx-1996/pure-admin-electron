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
  // if (clients.size > 0) {
  //   await Promise.all([...clients.values()].map(c => c.disConnect()));
  //   clients.clear();
  // }
  for (const item of newClients) {
    const client = new ModbusTCPClient(
      item.host,
      item.port,
      item.deviceId,
      item.connectTimeout,
      item.responseTimeout,
      item.maxRetry,
      item.heartBeatInterval
    );
    // 连接成功（含后台重连后成功）时启动数据读取。
    // connect() 只等第一轮尝试、不等重连链，所以不能再用 `await connect(); start()`
    client.onConnected = c => {
      start(c).catch(e =>
        console.error(`${c.clientProps.host}启动读取失败`, e)
      );
    };
    clients.set(item.host, client);
  }
  // 只连接本次请求里的客户端：遍历 clients 全表会把此前已手动断开的实例
  // 也拉进来 connect()，触发 "已断开，取消本次连接" 并产生无意义的重复日志
  const res = await Promise.allSettled(
    newClients.map(async item => {
      const client = clients.get(item.host);
      if (!client) return;
      // connect() 在第一轮尝试后即返回：首轮没连上的 ip 状态仍是 connecting（后台重连中），
      // 不会把其它已连上的 ip 的结果一直拖着不回包
      await client.connect();
      // client 为 ModbusRTU 实例，内部含 socket/Timeout 等循环引用，
      // 不可经 process.send 序列化，仅回传纯数据属性item.clientProps;
      return client.clientProps;
    })
  );
  return res;
}
async function start(modbusTCPClient: ModbusTCPClient) {
  if (modbusTCPClient.clientProps.status !== "connected") {
    return;
  }
  // 已在读取中：心跳失败后重连成功会再次触发 onConnected，
  // 不判断就会同时跑起两个读取循环（数据重复读取、请求量翻倍）
  if (modbusTCPClient.readTimer) return;
  // 连接已建立，标记为「正在正常读取服务端」
  modbusTCPClient.clientProps.status = "goodRead";
  process.send?.({
    type: "event",
    api: "bcuConnStatus",
    args: modbusTCPClient.clientProps
  });
  const readTask = async () => {
    // 允许 connected / goodRead 两种状态继续读取；failRead/disconnected 等则停止
    if (
      modbusTCPClient.clientProps.status !== "connected" &&
      modbusTCPClient.clientProps.status !== "goodRead"
    ) {
      if (modbusTCPClient.readTimer) clearTimeout(modbusTCPClient.readTimer);
      modbusTCPClient.readTimer = null;
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
    modbusTCPClient.readTimer = setTimeout(readTask, 1000);
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
        const newClients: ClientOptions[] = [];
        for (const item of message.payload) {
          const exist = clients.get(item.host);
          if (exist) {
            const { status } = exist.clientProps;
            // 连接中/已连接/读取中：保留现有连接，不重复建连
            if (
              status === "connecting" ||
              status === "connected" ||
              status === "goodRead"
            ) {
              continue;
            }
            // 已断开/读取失败/达到最大重连：这些实例的 status 已无法回到可连接态
            // （connect() 会被 "disconnected" 守卫直接拒绝），必须先关闭并移出表，
            // 下面用配置重建一个全新实例，否则表现为"点连接没反应"
            await exist.disConnect();
            clients.delete(item.host);
          }
          newClients.push(item);
        }
        await initTCPClients(newClients);
        process.send!({
          type: "task",
          requestId: message.requestId,
          // 按请求里的全部 host 回传结果，已连接被 continue 跳过的那部分也要有状态
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
      // const count = clients.size;
      // if (count > 0) {
      //   await Promise.all([...clients.values()].map(c => c.disConnect()));
      //   clients.clear();
      //   process.send!({
      //     type: "task",
      //     requestId: message.requestId,
      //     result: { disconnected: count }
      //   });
      // } else {
      //   // 没有可断开的连接时用 error 回包：主进程会走 reject，
      //   // 渲染进程才能提示真实原因，而不是被包装成一次"成功"
      //   process.send!({
      //     type: "task",
      //     requestId: message.requestId,
      //     error: "worker 中没有已建立的连接，请先添加BCU"
      //   });
      // }
      if (!Array.isArray(message.payload) || message.payload.length === 0) {
        process.send!({
          type: "task",
          requestId: message.requestId,
          error: "没有需要断开的服务器（请先添加BCU）"
        });
        break;
      }
      try {
        const keys = new Set(message.payload.map(item => item.host));
        const clientsDisconnect = new Map(
          [...clients].filter(([k]) => keys.has(k))
        );
        await Promise.all(
          [...clientsDisconnect.values()].map(c => c.disConnect())
        );
        const count = clientsDisconnect.size;
        process.send!({
          type: "task",
          requestId: message.requestId,
          result: { disconnected: count }
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
