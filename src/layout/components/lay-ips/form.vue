<script setup lang="ts">
import { ref } from "vue";
import { ipRules } from "./rule";
import type { FormInstance } from "element-plus";
import { message } from "@/utils/message";
import type {
  ConnectAllReq,
  ConnectResultItem
} from "../../../../electron/shared/ipc"; // 或相对路径
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
defineOptions({
  name: "setIPsForm"
});
export interface FormProps {
  formIps: {
    ipStart: string;
    ipNums: number;
    port: number;
    deviceId: number;
    connectTimeout: number;
    responseTimeout: number;
    maxRetry: number;
    heartBeatInterval: number;
  };
}
const bcuConnectStore = useBcuConnectStoreHook();
const props = defineProps<FormProps>();
const newFormIp = ref({ ...props.formIps });
const ruleFormRef = ref<FormInstance>();
const connecting = ref(false);
/** 与 store 的判据保持一致：connected / goodRead 视为连接成功 */
function isConnected(item: ConnectResultItem) {
  return item.status === "connected" || item.status === "goodRead";
}
/** Electron invoke 的报错带 "Error invoking remote method 'xxx': " 前缀，提示前去掉 */
function errorText(e: unknown) {
  return (e as Error).message.replace(
    /^Error invoking remote method '[^']+':\s*(Error:\s*)?/,
    ""
  );
}
/** 提示本次建连结果：成功的 ip 与失败的 ip 分开提示 */
function notifyConnectResult(data?: ConnectResultItem[]) {
  if (!data || data.length === 0) {
    message("没有可连接的目标", { type: "warning" });
    return;
  }
  const connected = data.filter(isConnected).map(item => item.host);
  const failed = data.filter(item => !isConnected(item)).map(item => item.host);
  if (connected.length > 0) {
    message(`已连接：${connected.join("、")}`, { type: "success" });
  }
  if (failed.length > 0) {
    message(`未连接：${failed.join("、")}`, { type: "warning" });
  }
}
async function connectAllInputIps(formEl: FormInstance | undefined) {
  if (!formEl) return;
  connecting.value = true;
  try {
    const valid = await formEl.validate().catch(() => false);
    if (!valid) {
      message("提交失败");
      return;
    }
    const {
      ipStart,
      ipNums,
      port,
      deviceId,
      connectTimeout,
      responseTimeout,
      maxRetry,
      heartBeatInterval
    } = newFormIp.value;
    // 起始 ip 在渲染进程展开成列表，payload 结构与 connectAll 保持一致（数组 + host 字段）
    const parts = ipStart.split(".");
    const prefix = parts.slice(0, 3).join("."); // "192.168.1"
    const last = Number(parts[3]); // 10
    if (last + ipNums - 1 > 255) {
      message(`从 ${ipStart} 起算最多可展开 ${256 - last} 个 ip`, {
        type: "warning"
      });
      return;
    }
    const payload = Array.from({ length: ipNums }, (_, index) => ({
      host: `${prefix}.${last + index}`,
      port,
      deviceId,
      connectTimeout,
      responseTimeout,
      maxRetry,
      heartBeatInterval
    }));
    const req: ConnectAllReq = {
      payload,
      requestId: Math.random().toString(36).slice(2) + Date.now()
    };
    const res = await window.ipcRenderer.invoke("connectAllInputIps", req);
    if (!res.success) {
      message(`失败：${res.error}`, { type: "error" });
      return;
    }
    // worker 回传每个服务器的最终状态，据此提示成功/失败的 ip
    notifyConnectResult(res.data);
  } catch (e) {
    message(`操作失败：${errorText(e)}`, { type: "error" });
  } finally {
    connecting.value = false;
  }
}
async function connectAllIps() {
  connecting.value = true;
  try {
    if (bcuConnectStore.serversArr.length === 0) {
      message("请先添加BCU", { type: "warning" });
      return;
    }
    // serversArr 里是 Pinia 的响应式代理对象，直接丢给 ipcRenderer 会在结构化克隆时
    // 报 "An object could not be cloned."，必须转成普通对象
    const payload = bcuConnectStore.serversArr.map(item => ({
      host: item.host,
      port: item.port,
      deviceId: item.deviceId,
      connectTimeout: item.connectTimeout,
      responseTimeout: item.responseTimeout,
      maxRetry: item.maxRetry,
      heartBeatInterval: item.heartBeatInterval
    }));
    const req: ConnectAllReq = {
      payload,
      requestId: Math.random().toString(36).slice(2) + Date.now()
    };
    // 按钮文案与本分支使用同一个判据，避免"显示断开、实际却是连接"
    // 有任意一个处于已连接/读取中 -> 断开所有；否则（存在未连接的）-> 连接所有
    if (bcuConnectStore.canDisconnectAll()) {
      const res = await window.ipcRenderer.invoke("disconnectAll", req);
      if (!res.success) {
        message(`失败：${res.error}`, { type: "error" });
        return;
      }
      const count = res.data?.disconnected;
      message(
        count === undefined ? "断开指令已下发" : `已断开 ${count} 个连接`,
        { type: "success" }
      );
    } else {
      const res = await window.ipcRenderer.invoke("connectAll", req);
      if (!res.success) {
        message(`失败：${res.error}`, { type: "error" });
        return;
      }
      notifyConnectResult(res.data);
    }
  } catch (e) {
    // 以前这里只 console.log，worker 未启动/已退出等失败在界面上完全看不到
    message(`操作失败：${errorText(e)}`, { type: "error" });
  } finally {
    connecting.value = false;
  }
}
/**
 * 数据源是 serversArrMaped，字段来自 worker 上报的 ModbusTCPClientProps：
 * host（不是 ip）、status（已被 statusMap 转成中文）
 */
const columns = [
  {
    label: "IP",
    prop: "host"
  },
  {
    label: "状态",
    prop: "status"
  }
];
</script>

<template>
  <div>
    <el-form
      ref="ruleFormRef"
      :model="newFormIp"
      :rules="ipRules"
      label-position="left"
      label-width="120px"
    >
      <el-form-item prop="ipStart" label="起始ip">
        <el-input v-model="newFormIp.ipStart" clearable placeholder="起始ip" />
      </el-form-item>
      <el-form-item prop="ipNums" label="ip数量">
        <el-input
          v-model.number="newFormIp.ipNums"
          clearable
          placeholder="ip数量"
        />
      </el-form-item>
      <el-form-item prop="port" label="server端口">
        <el-input
          v-model.number="newFormIp.port"
          clearable
          placeholder="server端口"
        />
      </el-form-item>
      <el-form-item prop="deviceId" label="设备ID">
        <el-input
          v-model.number="newFormIp.deviceId"
          clearable
          placeholder="设备ID"
        />
      </el-form-item>
      <el-form-item prop="connectTimeout" label="连接超时时间">
        <el-input
          v-model.number="newFormIp.connectTimeout"
          clearable
          placeholder="连接超时时间"
        />
      </el-form-item>
      <el-form-item prop="responseTimeout" label="响应超时时间">
        <el-input
          v-model.number="newFormIp.responseTimeout"
          clearable
          placeholder="响应超时时间"
        />
      </el-form-item>
      <el-form-item prop="maxRetry" label="最大重连次数">
        <el-input
          v-model.number="newFormIp.maxRetry"
          clearable
          placeholder="最大重连次数"
        />
      </el-form-item>
      <el-form-item prop="heartBeatInterval" label="心跳间隔">
        <el-input
          v-model.number="newFormIp.heartBeatInterval"
          clearable
          placeholder="心跳间隔"
        />
      </el-form-item>
      <!-- 该行没有 label，label-width 置 0 让按钮占满抽屉宽度 -->
      <el-form-item label-width="0px" class="ips-actions">
        <div class="ips-actions__inner">
          <el-button
            type="primary"
            :loading="connecting"
            @click="connectAllInputIps(ruleFormRef)"
          >
            添加BCU
          </el-button>
          <el-button
            type="primary"
            :loading="connecting"
            @click="connectAllIps()"
          >
            {{ bcuConnectStore.canDisconnectAll() ? "断开所有" : "连接所有" }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
    <pure-table :data="bcuConnectStore.serversArrMaped" :columns="columns" />
  </div>
</template>

<style scoped lang="scss">
/* Element Plus 的 .el-form-item__content 默认 flex-wrap: wrap，
   抽屉随窗口变窄时两个按钮会被折到第二行，这里禁止换行 */
.ips-actions :deep(.el-form-item__content) {
  flex-wrap: nowrap;
}

/* 两个按钮等分整行宽度：空间不足时一起收缩，而不是换行 */
.ips-actions__inner {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  align-items: center;
  width: 100%;
}

.ips-actions__inner .el-button {
  flex: 1;
  min-width: 0;
  margin-left: 0;
}

/* 极窄时宁可省略号，也不让文字撑破按钮 */
.ips-actions__inner :deep(.el-button > span) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
