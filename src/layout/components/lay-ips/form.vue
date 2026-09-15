<script setup lang="ts">
import { ref } from "vue";
import { ipRules } from "./rule";
import type { FormInstance } from "element-plus";
import { message } from "@/utils/message";
import type { SetIpsRequest } from "../../../../electron/shared/ipc"; // 或相对路径
defineOptions({
  name: "setIPSForm"
});
export interface FormProps {
  formIps: {
    ipStart: string;
    ipNums: number;
    port: number;
    connectTimeout: number;
    responseTimeout: number;
    maxRetry: number;
    heartBeatInterval: number;
  };
}
const props = defineProps<FormProps>();
const newFormIp = ref({ ...props.formIps });
const ruleFormRef = ref<FormInstance>();
async function sendIps(formEl: FormInstance | undefined) {
  if (!formEl) return;
  try {
    const valid = await formEl.validate().catch(() => false);
    if (!valid) {
      message("提交失败");
      return;
    }
    const req: SetIpsRequest = {
      action: "set",
      payload: { ...newFormIp.value },
      requestId: Math.random().toString(36).slice(2) + Date.now()
    };
    const res = await window.ipcRenderer.invoke("set-ips", req);
    if (res.success) message("成功");
    else message(`失败：${res.error}`);
  } catch (e) {
    message("通信异常");
  }
}
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
      <el-form-item>
        <el-button type="primary" @click="sendIps(ruleFormRef)">连接</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>
