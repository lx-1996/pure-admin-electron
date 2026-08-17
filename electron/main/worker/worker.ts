import { readData } from "./read/read";
import { ModbusTCPClient } from "./client/clientClass";
let modbusTCPClient: ModbusTCPClient;
async function initTCPClient(ip: string, port: number, timeout: number) {
  modbusTCPClient = new ModbusTCPClient(ip, port, timeout);
  await modbusTCPClient.repeatConnect();
}
async function start() {
  await initTCPClient("192.168.10.208", 502, 10000);
  if (modbusTCPClient.clientProps.client_status !== "connected") {
    return;
  }
  let readTimer: any = null;
  const readTask = async () => {
    if (modbusTCPClient.clientProps.client_status !== "connected") {
      if (readTimer) clearTimeout(readTimer);
      return;
    }
    try {
      await readData(
        modbusTCPClient,
        "cell_vltg",
        modbusTCPClient.client_data.bmu_config.total_cell_num
      );
      await readData(
        modbusTCPClient,
        "cell_temp",
        modbusTCPClient.client_data.bmu_config.total_temp_num
      );
      await readData(
        modbusTCPClient,
        "cell_soc",
        modbusTCPClient.client_data.bmu_config.total_cell_num
      );
      await readData(
        modbusTCPClient,
        "cell_soh",
        modbusTCPClient.client_data.bmu_config.total_cell_num
      );
      await readData(modbusTCPClient, "system_summary");
      const cluster_summary = await readData(
        modbusTCPClient,
        "cluster_summary"
      );
      console.log(cluster_summary);
    } catch (e) {
      console.error(e);
    }
    readTimer = setTimeout(readTask, 1000);
  };
  readTask();
}
start();
