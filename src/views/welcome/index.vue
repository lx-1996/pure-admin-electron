<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
defineOptions({
  name: "Welcome"
});
const data = ref();

function onData(_event: any, value: any) {
  console.log("收到数据:", value);

  data.value = value;
}

onMounted(() => {
  window.ipcRenderer.on("modbus-data", onData);
});

onUnmounted(() => {
  window.ipcRenderer.off("modbus-data", onData);
});
</script>

<template>
  <div v-if="data">
    电压:
    {{ data.voltage }}

    <br />

    电流:
    {{ data.current }}

    <br />

    SOC:
    {{ data.soc }}
  </div>
</template>
