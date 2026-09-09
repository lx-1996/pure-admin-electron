import { readData } from "./read/read";
import { ModbusTCPClient } from "./client/clientClass";
import { assertColumnLength } from "./dataPoint/tableGenerate";
let modbusTCPClient: ModbusTCPClient;
async function initTCPClient(tcpOption: any) {
  const { IP, PORT, TIMEOUT } = tcpOption;
  modbusTCPClient = new ModbusTCPClient(IP, PORT, TIMEOUT);
  await modbusTCPClient.repeatConnect();
}
const TCP_PARAMS = {
  IP: "192.168.10.208",
  PORT: 502,
  TIMEOUT: 10000
};
async function start() {
  // 点表完整性校验：列错位/寄存器数不符时直接终止，避免产出错位数据
  assertColumnLength();
  await initTCPClient(TCP_PARAMS);
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
start();
