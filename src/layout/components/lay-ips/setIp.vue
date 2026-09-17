<script setup lang="tsx">
import { ref, onMounted, onUnmounted } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { addDrawer } from "@/components/ReDrawer/index";
import form from "./form.vue";
defineOptions({
  name: "SetIps"
});
function onFormClick() {
  addDrawer({
    size: "30%",
    //title: "连接设备",
    hideFooter: true,
    contentRenderer: () => form,
    props: {
      formIps: {
        ipStart: "192.168.10.208",
        ipNums: 1,
        port: 502,
        deviceId: 1,
        connectTimeout: 1000,
        responseTimeout: 3000,
        maxRetry: 30,
        heartBeatInterval: 1000
      }
    }
  });
}
let listenerId: number | null = null;
const bcuConnectStore = useBcuConnectStoreHook();
function onIps(_event: any, message: any) {
  console.log(message);
  const { host, connectStatus } = message;
  bcuConnectStore.addServer(host, connectStatus);
}
onMounted(() => {
  listenerId = window.ipcRenderer.on("bcuConnStatus", onIps);
});
onUnmounted(() => {
  if (listenerId) window.ipcRenderer.off(listenerId);
  listenerId = null;
});
</script>

<template>
  <div>
    <el-button @click="onFormClick">连接</el-button>
  </div>
</template>
