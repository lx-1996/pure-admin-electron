import {
  onMounted,
  onUnmounted,
  ref,
  computed,
  toValue,
  type MaybeRefOrGetter
} from "vue";
export function usePackData(dataClass: MaybeRefOrGetter<string>) {
  const dataAllIps = ref<Map<string, Array<any>>>(new Map());
  const selectedIp = ref<string>("192.168.10.208");
  const dataSelectedIp = computed<Array<any>>(() => {
    const cls = toValue(dataClass); // 关键：在 computed 内部取值，保证响应式
    const list = dataAllIps.value.get(selectedIp.value);
    if (!list) return [];
    return list.filter(item => item.data_name === cls);
  });
  let listenerId = null;
  function onData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain;
    dataAllIps.value.set(ip, data);
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
