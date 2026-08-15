import ModbusRTU from "modbus-serial";
interface ModbusTCPClientProps {
  client: ModbusRTU;
  client_status: "disconnected" | "connected" | "connecting";
  client_host: string;
  client_port: number;
  client_timeout: number;
  client_reconnect_times: number;
  client_heatbeat: number;
}
interface ThisClientBMUConfigData {
  bmu_total: number;
  afe_perBMU: number;
  cell_config_perAFE: number[];
  temp_config_perAFE: number[];
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
      client_status: "disconnected",
      client_host: ip,
      client_port: port,
      client_timeout: timeout,
      client_reconnect_times: 0,
      client_heatbeat: 0
    };
    this.client_data = {
      bmu_config: {
        bmu_total: 5,
        afe_perBMU: 4,
        cell_config_perAFE: [12, 12, 12, 12],
        temp_config_perAFE: [6, 6, 6, 6],
        total_cell_num: 240,
        total_temp_num: 120
      },
      other_config: {}
    };
  }
  async connect() {
    if (this.client.isOpen) {
      this.client.close();
    }
    this.clientProps.client_status = "connecting";
    console.log(this.clientProps.client_host, "正在连接");
    try {
      await this.client.connectTCP(this.clientProps.client_host, {
        port: this.clientProps.client_port,
        timeout: this.clientProps.client_timeout
      });
      await this.client.readInputRegisters(0, 1);
      this.clientProps.client_reconnect_times = 0;
      console.log(
        this.clientProps.client_host,
        "连接成功，连接次数:",
        this.clientProps.client_reconnect_times
      );
      this.clientProps.client_status = "connected";
      this.heartbeat();
    } catch (e) {
      console.log(
        this.clientProps.client_host,
        "连接失败，连接次数:",
        this.clientProps.client_reconnect_times,
        e
      );
      await this.repeatConnect();
    }
  }
  async repeatConnect() {
    if (this.clientProps.client_reconnect_times >= this.MAX_CONNECT_TIMES) {
      console.log("连接次数达到最大限制，停止重连");
      return;
    }
    this.clientProps.client_reconnect_times++;
    await this.connect();
  }
  heartbeat() {
    if (this.clientProps.client_status != "connected") {
      console.log("TCP客户端未连接，心跳终止");
      return;
    }
    console.log("心跳开始");
    const timerId = setInterval(async () => {
      try {
        await this.client.readInputRegisters(0, 1);
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
