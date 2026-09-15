<script setup lang="tsx">
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
        connectTimeout: 1000,
        responseTimeout: 3000,
        maxRetry: 30,
        heartBeatInterval: 1000
      }
    }
  });
}
</script>

<template>
  <div>
    <el-button @click="onFormClick">连接</el-button>
  </div>
</template>
