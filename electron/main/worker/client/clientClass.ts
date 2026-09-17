import ModbusRTU from "modbus-serial";
interface ModbusTCPClientProps {
  connectStatus:
    | "notConnected"
    | "connecting"
    | "connected"
    | "cannotConnect"
    | "disconnected"
    | "goodRead"
    | "failRead";
  host: string;
  port: number;
  deviceId: number;
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
  public heartBeatTimer: ReturnType<typeof setInterval> | null = null;
  constructor(
    ip: string,
    port: number,
    deviceId: number,
    connectTimeout: number,
    responseTimeout: number,
    maxRetry: number,
    heartBeatInterval: number
  ) {
    this.client = new ModbusRTU();
    this.clientProps = {
      connectStatus: "notConnected",
      host: ip || "127.0.0.1",
      port: port || 502,
      deviceId: deviceId || 1,
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
    if (
      this.clientProps.connectStatus === "connected" ||
      this.clientProps.connectStatus === "goodRead"
    ) {
      console.log(`${this.clientProps.host}已连接，不再连接`);
      return;
    }
    this.clientProps.connectStatus = "connecting";
    this.notifyConnStatus();
    console.log(this.clientProps.host, "正在连接");
    try {
      await this.client.connectTCP(this.clientProps.host, {
        port: this.clientProps.port,
        timeout: this.clientProps.connectTimeout
      });
      this.client.setID(this.clientProps.deviceId);
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
      this.notifyConnStatus();
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
  /** 向渲染进程推送当前连接状态事件；非 fork 子进程（process.send 不存在）时静默跳过 */
  private notifyConnStatus() {
    process.send?.({
      type: "event",
      api: "bcuConnStatus",
      args: this.clientProps
    });
  }

  /** 断开连接；返回 Promise，在底层 socket 真正关闭后 resolve，调用方据此等待 */
  disConnect(): Promise<void> {
    // 立即标记断开，使仍在跑的旧心跳/read 尽快感知并停止，不再触发重连
    this.clientProps.connectStatus = "disconnected";
    this.notifyConnStatus();
    // 先停心跳定时器，避免 close 期间仍有周期/在途心跳读产生延迟报错与重复打印
    if (this.heartBeatTimer) clearInterval(this.heartBeatTimer);
    this.heartBeatTimer = null;
    return new Promise<void>(resolve => {
      // 已处于关闭/未打开状态时，close 回调不一定会触发，直接 resolve 避免死等
      if (!this.client.isOpen) {
        console.log(`${this.clientProps.host} 已断开连接`);
        resolve();
        return;
      }
      this.client.close(() => {
        console.log(`${this.clientProps.host} 已断开连接`);
        resolve();
      });
    });
  }
  async repeatConnect() {
    if (this.clientProps.reconnectTimes >= this.clientProps.maxRetry) {
      console.log("连接次数达到最大限制，停止重连");
      this.clientProps.connectStatus = "cannotConnect";
      this.notifyConnStatus();
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
    if (this.clientProps.connectStatus !== "connected") {
      console.log("TCP客户端未连接，心跳终止");
      return;
    }
    // 避免重复 connect 时堆积多个心跳定时器
    if (this.heartBeatTimer) clearInterval(this.heartBeatTimer);
    this.heartBeatTimer = setInterval(async () => {
      try {
        await this.client.readInputRegisters(0, 1);
        this.clientProps.heartBeat++;
      } catch (e) {
        if (this.clientProps.connectStatus === "disconnected") {
          // 已断开：清理定时器，避免 setInterval 每个周期重复触发延迟心跳读并打印
          if (this.heartBeatTimer) clearInterval(this.heartBeatTimer);
          this.heartBeatTimer = null;
          console.log(`${this.clientProps.host}手动断开连接，停止心跳`);
          return;
        }
        console.error(`${this.clientProps.host}心跳读取失败`, e);
        if (this.heartBeatTimer) clearInterval(this.heartBeatTimer);
        this.heartBeatTimer = null;
        this.clientProps.connectStatus = "failRead";
        this.notifyConnStatus();
        await this.repeatConnect();
      }
    }, this.clientProps.heartBeatInterval);
  }
}
