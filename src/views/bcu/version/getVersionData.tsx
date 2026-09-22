import { computed, ref } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { useIpcListener } from "@/utils/useIpcListener";

export function useCol() {
  const bcuConnectStore = useBcuConnectStoreHook();
  /** key 是 ip：所有 ip 的数据都留着，切换所选 ip 时能立刻显示，不必等下一次上报 */
  const dataAllIps = ref<Map<string, Array<Record<string, any>>>>(new Map());
  /** 当前所选 ip 的数据：selectIp 必须在 computed 内部读取，否则切换 ip 不会刷新 */
  const dataSelectedIp = computed<Array<Record<string, any>>>(() => {
    return dataAllIps.value.get(bcuConnectStore.selectIp) ?? [];
  });
  function onData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain ?? {};
    if (!ip) return;
    dataAllIps.value.set(ip, Array.isArray(data) ? data : []);
  }

  useIpcListener("cluster_summary", onData);

  /** 过滤隐藏项：基于所选 ip 的数据 */
  const dataVersion = computed(() => dataSelectedIp.value.slice(-9));

  return {
    dataAllIps,
    dataSelectedIp,
    dataVersion
  };
}
