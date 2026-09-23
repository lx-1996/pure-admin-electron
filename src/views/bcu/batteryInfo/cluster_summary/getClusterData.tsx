import { computed, ref } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { useIpcListener } from "@/utils/useIpcListener";

/** 需要独占一行的点名 */
const SYS_STATUS_NAME = "系统总状态位";

/** 该项是否为位域/状态位（data_parsed 为数组且非空） */
function isBits(item: any) {
  return Array.isArray(item?.data_parsed) && item.data_parsed.length > 0;
}

/**
 * 位域项是否处于"置位/有效"状态
 * 仅 nameHighLightWithBitRaw 模式下 bit_raw 为 1 才高亮，
 * mappingValue 模式（如 有效/无效、系统正常/重启）语义各异，不做高亮
 */
function isBitActive(value: any) {
  return (
    value?.display_mode === "nameHighLightWithBitRaw" &&
    Number(value?.bit_raw) === 1
  );
}

export function useCol() {
  const bcuConnectStore = useBcuConnectStoreHook();
  /** key 是 ip：所有 ip 的数据都留着，切换所选 ip 时能立刻显示，不必等下一次上报 */
  const dataAllIps = ref<Map<string, Array<Record<string, any>>>>(new Map());
  /** 当前所选 ip 的数据：selectIp 必须在 computed 内部读取，否则切换 ip 不会刷新 */
  const dataSelectedIp = computed<Array<Record<string, any>>>(() => {
    return dataAllIps.value.get(bcuConnectStore.selectIp) ?? [];
  });
  const dataPowerOffAllIps = ref<Map<string, Array<Record<string, any>>>>(
    new Map()
  );
  /** 当前所选 ip 的数据：selectIp 必须在 computed 内部读取，否则切换 ip 不会刷新 */
  const dataPowerOffSelectedIp = computed<Array<Record<string, any>>>(() => {
    return dataPowerOffAllIps.value.get(bcuConnectStore.selectIp) ?? [];
  });
  function onData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain ?? {};
    if (!ip) return;
    dataAllIps.value.set(ip, Array.isArray(data) ? data : []);
  }
  function onPowerOffData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain ?? {};
    if (!ip) return;
    dataPowerOffAllIps.value.set(ip, Array.isArray(data) ? data : []);
  }

  useIpcListener("cluster_summary", onData);
  useIpcListener("power_off_data", onPowerOffData);
  /** 过滤隐藏项：基于所选 ip 的数据 */
  const dataWithFilter = computed(() =>
    dataSelectedIp.value.filter(item => !item.data_isHiden)
  );
  const dataPowerOffWithFilter = computed(() =>
    dataPowerOffSelectedIp.value.filter(item => !item.data_isHiden)
  );
  /** 系统总状态位：独占一行，置于首位 */
  const sysStatusData = computed(() =>
    dataWithFilter.value.filter(
      item => isBits(item) && item.data_name === SYS_STATUS_NAME
    )
  );

  /** 其余状态位：一行 2 个 */
  const bitData = computed(() =>
    dataWithFilter.value.filter(
      item => isBits(item) && item.data_name !== SYS_STATUS_NAME
    )
  );

  /** 遥测值：data_parsed 为标量 */
  const scalarData = computed(() =>
    dataWithFilter.value.filter(
      item => !isBits(item) && !Array.isArray(item.data_parsed)
    )
  );
  const scalarDataWithpowerOff = computed(() => {
    return [...scalarData.value, ...dataPowerOffWithFilter.value];
  });
  const getDisplayMode = (value: any) => {
    switch (value?.display_mode) {
      case "mappingValue":
        return value?.bit_value ?? value?.bit_name ?? "-";
      case "nameHighLightWithBitRaw":
        return value?.bit_name ?? "-";
      default:
        return value?.bit_value ?? value?.bit_name ?? "-";
    }
  };

  return {
    dataAllIps,
    dataSelectedIp,
    dataWithFilter,
    sysStatusData,
    bitData,
    scalarData,
    scalarDataWithpowerOff,
    isBits,
    getDisplayMode,
    isBitActive
  };
}
