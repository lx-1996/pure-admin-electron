<script setup lang="ts">
import { ref, onBeforeMount, onBeforeUnmount } from "vue";
defineOptions({
  name: "Welcome"
});
const data = ref();
let listenerId: number | null = null;

function onData(_event: any, value: any) {
  console.log(value);
  data.value = value;
}

onBeforeMount(() => {
  listenerId = window.ipcRenderer.on("modbus-data", onData);
});

onBeforeUnmount(() => {
  if (listenerId !== null) {
    window.ipcRenderer.off(listenerId);
    listenerId = null;
  }
});
</script>

<template>
  <div v-if="data">{{ data }}</div>
</template>
