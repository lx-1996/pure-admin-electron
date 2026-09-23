import { computed, ref } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { useIpcListener } from "@/utils/useIpcListener";

export function useCol() {
  const bcuConnectStore = useBcuConnectStoreHook();
  /** key 是 ip：所有 ip 的数据都留着，切换所选 ip 时能立刻显示，不必等下一次上报 */
  const dataBCUVersionAllIps = ref<Map<string, Array<Record<string, any>>>>(
    new Map()
  );
  const dataBMUVersionAllIps = ref<Map<string, Array<Record<string, any>>>>(
    new Map()
  );
  const dataBMUVersionSelectedIp = computed<Array<Record<string, any>>>(() => {
    return dataBMUVersionAllIps.value.get(bcuConnectStore.selectIp) ?? [];
  });
  /** 当前所选 ip 的数据：selectIp 必须在 computed 内部读取，否则切换 ip 不会刷新 */
  const dataBCUVersionSelectedIp = computed<Array<Record<string, any>>>(() => {
    return dataBCUVersionAllIps.value.get(bcuConnectStore.selectIp) ?? [];
  });
  function onclusterSummaryData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain ?? {};
    if (!ip) return;
    dataBCUVersionAllIps.value.set(ip, Array.isArray(data) ? data : []);
  }
  function onpackSummaryData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain ?? {};
    if (!ip) return;
    dataBMUVersionAllIps.value.set(ip, Array.isArray(data) ? data : []);
  }
  useIpcListener("cluster_summary", onclusterSummaryData);
  useIpcListener("pack_summary", onpackSummaryData);
  /** 过滤隐藏项：基于所选 ip 的数据 */
  const dataBCUVersion = computed(() => [
    ...dataBCUVersionSelectedIp.value.filter(item =>
      [
        //"CAN霍尔传感器状态信息",
        "CAN霍尔传感器名称",
        "CAN霍尔传感器软件版本"
      ].includes(item.data_name)
    ),
    ...dataBCUVersionSelectedIp.value.slice(-9)
  ]);
  const bmuVersionName = ["BMU版本号", "BMU产品编码"];
  const dataBMUVersion = computed(() =>
    dataBMUVersionSelectedIp.value.filter(item =>
      bmuVersionName.includes(item.data_name)
    )
  );

  return {
    dataBCUVersionAllIps,
    dataBCUVersionSelectedIp,
    dataBCUVersion,
    dataBMUVersion
  };
}
