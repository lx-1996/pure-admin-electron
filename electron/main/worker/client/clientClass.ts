import ModbusRTU from "modbus-serial";
interface ModbusTCPClientProps {
  client: ModbusRTU;
  connectStatus:
    | "disconnected"
    | "connected"
    | "connecting"
    | "failRead"
    | "notConnected"
    | "cannotConnect";
  host: string;
  port: number;
  connectTimeout: number;
  responseTimeout: number;
  reconnectTimes: number;
  maxRetry: number;
  heartBeatInterval: number;
  heartBeat: number;
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
  constructor(
    ip: string,
    port: number,
    connectTimeout: number,
    responseTimeout: number,
    maxRetry: number,
    heartBeatInterval: number
  ) {
    this.client = new ModbusRTU();
    this.clientProps = {
      client: this.client,
      connectStatus: "notConnected",
      host: ip || "127.0.0.1",
      port: port || 502,
      connectTimeout: connectTimeout || 2000,
      responseTimeout: responseTimeout || 1000,
      reconnectTimes: 0,
      heartBeatInterval: heartBeatInterval || 1000,
      maxRetry: maxRetry || 10,
      heartBeat: 0
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
        timeout: this.clientProps.connectTimeout
      });
      //设置请求超时时间
      this.client.setTimeout(this.clientProps.responseTimeout);
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
  disConnect() {
    this.client.close(() => {
      console.log(`${this.clientProps.host} 已断开连接`);
      this.clientProps.connectStatus = "disconnected";
    });
  }
  async repeatConnect() {
    if (this.clientProps.reconnectTimes >= this.clientProps.maxRetry) {
      console.log("连接次数达到最大限制，停止重连");
      return;
    }
    if (this.clientProps.connectStatus === "disconnected") {
      console.log("重连过程中手动断开，停止重连");
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
    const timerId = setInterval(async () => {
      try {
        await this.client.readInputRegisters(0, 1);
        this.clientProps.heartBeat++;
      } catch (e) {
        console.error(`${this.clientProps.host}心跳读取失败`, e);
        clearInterval(timerId);
        if (this.clientProps.connectStatus == "disconnected") {
          console.log(`${this.clientProps.host}手动断开连接，停止心跳`);
          return;
        }
        await this.repeatConnect();
      }
    }, this.clientProps.heartBeatInterval);
  }
}
