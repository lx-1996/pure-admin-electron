import { onMounted, onUnmounted, ref, computed } from "vue";
export function usePackData() {
  const dataAllIps = ref<Map<string, Array<any>>>(new Map());
  const selectedIp = ref<string>("127.0.0.1");
  const dataSelectedIp = computed(() => {
    return dataAllIps.value.get(selectedIp.value) || [];
  });
  let listenerId = null;
  function onData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain;
    dataAllIps.value.set(ip, data);
    console.log(dataAllIps.value);
  }
  onMounted(() => {
    listenerId = window.ipcRenderer.on("pack_summary", onData);
  });
  onUnmounted(() => {
    if (listenerId !== null) {
      window.ipcRenderer.off(listenerId);
      listenerId = null;
    }
  });
  return { dataAllIps, dataSelectedIp };
}
