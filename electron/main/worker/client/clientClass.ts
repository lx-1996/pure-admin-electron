import ModbusRTU from "modbus-serial";
interface ModbusTCPClientProps {
  client: ModbusRTU;
  connectStatus: "disconnected" | "connected" | "connecting";
  host: string;
  port: number;
  timeout: number;
  reconnectTimes: number;
  heatbeat: number;
}
export interface ThisClientBMUConfigData {
  bmu_total: number;
  afe_perBMU: number;
  cell_config_perAFE: number[];
  temp_config_perAFE: number[];
  total_cell_perBMU: number;
  total_temp_perBMU: number;
  total_cell_num: number;
  total_temp_num: number;
}
interface ThisClientData {
  bmu_config: ThisClientBMUConfigData;
  other_config: Record<string, any>;
}
export class ModbusTCPClient {
  public client: ModbusRTU;
  public clientProps: ModbusTCPClientProps;
  public client_data: ThisClientData;
  private MAX_CONNECT_TIMES: number = 10;
  private HEARTBEAT_INTERVAL: number = 1000;
  constructor(ip: string, port: number, timeout: number) {
    this.client = new ModbusRTU();
    this.clientProps = {
      client: this.client,
      connectStatus: "disconnected",
      host: ip,
      port: port,
      timeout: timeout,
      reconnectTimes: 0,
      heatbeat: 0
    };
    this.client_data = {
      bmu_config: {
        bmu_total: 8,
        afe_perBMU: 4,
        cell_config_perAFE: [12, 12, 12, 12],
        temp_config_perAFE: [6, 6, 6, 6],
        total_cell_perBMU: 48,
        total_temp_perBMU: 24,
        total_cell_num: 384,
        total_temp_num: 192
      },
      other_config: {}
    };
  }
  async connect() {
    if (this.client.isOpen) {
      this.client.close();
    }
    this.clientProps.connectStatus = "connecting";
    console.log(this.clientProps.host, "正在连接");
    try {
      await this.client.connectTCP(this.clientProps.host, {
        port: this.clientProps.port,
        timeout: this.clientProps.timeout
      });
      await this.client.readInputRegisters(0, 1);
      this.clientProps.reconnectTimes = 0;
      console.log(
        this.clientProps.host,
        "连接成功，连接次数:",
        this.clientProps.reconnectTimes
      );
      this.clientProps.connectStatus = "connected";
      this.heartbeat();
    } catch (e) {
      console.log(
        this.clientProps.host,
        "连接失败，连接次数:",
        this.clientProps.reconnectTimes,
        e
      );
      await this.repeatConnect();
    }
  }
  async repeatConnect() {
    if (this.clientProps.reconnectTimes >= this.MAX_CONNECT_TIMES) {
      console.log("连接次数达到最大限制，停止重连");
      return;
    }
    this.clientProps.reconnectTimes++;
    await this.connect();
  }
  heartbeat() {
    if (this.clientProps.connectStatus != "connected") {
      console.log("TCP客户端未连接，心跳终止");
      return;
    }
    console.log("心跳开始");
    const timerId = setInterval(async () => {
      try {
        await this.client.readInputRegisters(0, 1);
        this.clientProps.heatbeat++;
      } catch (e) {
        console.error("心跳读取失败", e);
        clearInterval(timerId);
        this.clientProps.connectStatus = "disconnected";
        await this.repeatConnect();
      }
    }, this.HEARTBEAT_INTERVAL);
  }
}
