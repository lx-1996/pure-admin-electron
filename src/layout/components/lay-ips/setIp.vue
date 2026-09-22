<script setup lang="tsx">
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { useIpcListener } from "@/utils/useIpcListener";
import { addDrawer } from "@/components/ReDrawer/index";
import form from "./form.vue";
defineOptions({
  name: "SetIps"
});
function onFormClick() {
  addDrawer({
    size: "30%",
    title: "连接管理",
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
const bcuConnectStore = useBcuConnectStoreHook();
function onIps(_event: any, message: any) {
  //console.log(message);
  bcuConnectStore.updateStatus(message);
}
useIpcListener("bcuConnStatus", onIps);
</script>

<template>
  <el-button @click="onFormClick">连接</el-button>
</template>
