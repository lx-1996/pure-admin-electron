import { ref, computed, toValue, type MaybeRefOrGetter } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { useIpcListener } from "@/utils/useIpcListener";
export function usePackData(dataClass: MaybeRefOrGetter<string>) {
  const dataAllIps = ref<Map<string, Array<any>>>(new Map());
  const bcuConnectStore = useBcuConnectStoreHook();
  const dataSelectedIp = computed<Array<any>>(() => {
    const cls = toValue(dataClass); // 关键：在 computed 内部取值，保证响应式
    const list = dataAllIps.value.get(bcuConnectStore.selectIp);
    if (!list) return [];
    return list.filter(item => item.data_name === cls);
  });
  function onData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain;
    dataAllIps.value.set(ip, data);
  }
  useIpcListener("pack_summary", onData);
  return { dataAllIps, dataSelectedIp };
}
