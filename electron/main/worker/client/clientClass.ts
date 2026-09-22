import ModbusRTU from "modbus-serial";
import type { ModbusTCPClientProps } from "../../../shared/ipc";
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
  /**
   * 数据读取循环的定时器句柄，由 worker 的读取循环独占读写：
   * 1. 心跳失败重连成功会再次触发 onConnected，靠它判断"已有一个循环在跑"，避免跑出两个循环；
   * 2. 循环退出时置空，便于下次连接重新启动。
   * 注意不要在循环之外 clear/置空，否则会失去对在途循环的引用
   */
  public readTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * 连接成功回调（首轮直连成功、或后台重连后成功都会触发）。
   * worker 用它来启动数据读取：connect() 只等"第一轮尝试"，重连在后台继续，
   * 成功时机晚于 connect() 返回，所以不能再用 `await connect(); start()` 的写法
   */
  public onConnected: ((client: ModbusTCPClient) => void) | null = null;
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
      status: "notConnected",
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
  /**
   * 发起一次连接（一次尝试）。
   * 注意：失败后的重连链条**不会**在这里被 await，本方法在第一轮尝试结束后就返回，
   * 状态停留在 "connecting"；多个 ip 同时连接时，先连上的 ip 才不会被一直重连的 ip
   * 拖住（表现为界面迟迟没有任何结果提示）
   */
  async connect() {
    // 先判断再关闭：已连接状态下如果先 close() 再 return，会出现
    // "状态显示已连接、socket 却被关掉" 的假连接，随后心跳必然失败
    if (
      this.clientProps.status === "connected" ||
      this.clientProps.status === "goodRead"
    ) {
      console.log(`${this.clientProps.host}已连接，不再连接`);
      return;
    }
    if (this.client.isOpen) {
      this.client.close();
    }
    // status 可能在 await 期间被 disConnect() 改写，用函数读取避免被类型收窄影响
    const isDisconnected = () => this.clientProps.status === "disconnected";
    // 已被手动断开：不要再建连接（重连/心跳重试期间可能刚好被断开）
    if (isDisconnected()) {
      console.log(`${this.clientProps.host}已断开，取消本次连接`);
      return;
    }
    this.clientProps.status = "connecting";
    this.notifyConnStatus();
    console.log(this.clientProps.host, "正在连接");
    try {
      await this.client.connectTCP(this.clientProps.host, {
        port: this.clientProps.port,
        timeout: this.clientProps.connectTimeout
      });
      // 连接建立期间被手动断开（disConnect 此时早已 resolve）：
      // 必须立刻关闭，否则断开会被这次在途连接"撤销"
      if (isDisconnected()) {
        this.client.close();
        console.log(
          `${this.clientProps.host} 连接建立过程中已被断开，立即关闭`
        );
        return;
      }
      this.client.setID(this.clientProps.deviceId);
      //设置请求超时时间
      this.client.setTimeout(this.clientProps.responseTimeout);
      await this.client.readInputRegisters(0, 1);
      this.clientProps.reconnectTimes = 1;
      console.log(
        this.clientProps.host,
        "连接成功，连接次数:",
        this.clientProps.reconnectTimes
      );
      this.clientProps.status = "connected";
      this.notifyConnStatus();
      this.heartbeat();
      // 必须放在 heartbeat() 之后：start() 会把状态改成 goodRead，
      // 而 heartbeat() 的入口只接受 connected
      this.onConnected?.(this);
    } catch (e) {
      console.log(
        this.clientProps.host,
        "连接失败，连接次数:",
        this.clientProps.reconnectTimes,
        e
      );
      // 不 await：重连链在后台继续跑，本次 connect() 到这里就结束，
      // 调用方（worker）可以立刻回包，让界面先提示"已连接 N 个 / M 个连接中请等待"。
      // 后续重连成功时由 onConnected 触发数据读取
      this.repeatConnect().catch(err =>
        console.error(`${this.clientProps.host}重连链路异常`, err)
      );
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
    this.clientProps.status = "disconnected";
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
      this.clientProps.status = "cannotConnect";
      this.notifyConnStatus();
      return;
    }
    if (this.clientProps.status === "disconnected") {
      console.log("重连过程中手动断开，停止重连");
      return;
    }
    this.clientProps.reconnectTimes++;
    await this.connect();
  }
  heartbeat() {
    if (this.clientProps.status !== "connected") {
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
        if (this.clientProps.status === "disconnected") {
          // 已断开：清理定时器，避免 setInterval 每个周期重复触发延迟心跳读并打印
          if (this.heartBeatTimer) clearInterval(this.heartBeatTimer);
          this.heartBeatTimer = null;
          console.log(`${this.clientProps.host}手动断开连接，停止心跳`);
          return;
        }
        console.error(`${this.clientProps.host}心跳读取失败`, e);
        if (this.heartBeatTimer) clearInterval(this.heartBeatTimer);
        this.heartBeatTimer = null;
        this.clientProps.status = "failRead";
        this.notifyConnStatus();
        await this.repeatConnect();
      }
    }, this.clientProps.heartBeatInterval);
  }
}
