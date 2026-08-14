import ModbusRTU from "modbus-serial";
import { readData_cell } from "./read/read";
interface ModbusTCPClientProps {
  client: ModbusRTU;
  client_status: "disconnected" | "connected" | "connecting";
  client_host: string;
  client_port: number;
  client_timeout: number;
  client_connect_times: number;
  client_heatbeat: number;
}
export class ModbusTCPClient {
  public client: ModbusRTU;
  public clientProps: ModbusTCPClientProps;
  private MAX_CONNECT_TIMES: number = 10;
  private HEARTBEAT_INTERVAL: number = 1000;
  constructor(ip: string, port: number, timeout: number) {
    this.client = new ModbusRTU();
    this.clientProps = {
      client: this.client,
      client_status: "disconnected",
      client_host: ip,
      client_port: port,
      client_timeout: timeout,
      client_connect_times: 0,
      client_heatbeat: 0
    };
  }
  async connect() {
    if (this.client.isOpen) {
      this.client.close();
    }
    this.clientProps.client_status = "connecting";
    console.log(
      this.clientProps.client_host,
      "正在连接，连接次数",
      this.clientProps.client_connect_times
    );
    try {
      await this.client.connectTCP(this.clientProps.client_host, {
        port: this.clientProps.client_port,
        timeout: this.clientProps.client_timeout
      });
      await this.client.readInputRegisters(0, 1);
      this.clientProps.client_connect_times = 0;
      console.log(
        this.clientProps.client_host,
        "连接成功，连接次数:",
        this.clientProps.client_connect_times
      );
      this.clientProps.client_status = "connected";
      this.heartbeat();
    } catch (e) {
      console.log(
        this.clientProps.client_host,
        "连接失败，连接次数:",
        this.clientProps.client_connect_times,
        e
      );
      this.clientProps.client_connect_times++;
      await this.repeatConnect();
    }
  }
  async repeatConnect() {
    if (this.clientProps.client_connect_times >= this.MAX_CONNECT_TIMES) {
      console.log("连接次数达到最大限制，停止重连");
      return;
    }
    await this.connect();
  }
  heartbeat() {
    if (this.clientProps.client_status != "connected") {
      console.log("TCP客户端未连接，心跳终止");
      return;
    }
    const timerId = setInterval(async () => {
      console.log("心跳：", this.clientProps.client_heatbeat);
      try {
        await this.client.readHoldingRegisters(0, 1);
        this.clientProps.client_heatbeat++;
      } catch (e) {
        console.error("心跳读取失败", e);
        clearInterval(timerId);
        this.clientProps.client_status = "disconnected";
        await this.repeatConnect();
      }
    }, this.HEARTBEAT_INTERVAL);
  }
}
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
  const readTask = () => {
    if (modbusTCPClient.clientProps.client_status !== "connected") {
      if (readTimer) clearTimeout(readTimer);
      return;
    }
    try {
      readData_cell(modbusTCPClient);
    } catch (e) {
      console.error(e);
    }
    readTimer = setTimeout(readTask, 1000);
  };
  readTask();
}
start();
