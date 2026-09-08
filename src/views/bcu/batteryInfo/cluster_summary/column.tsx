import { computed, ref, onBeforeMount, onBeforeUnmount } from "vue";

/** 需要独占一行的点名 */
const SYS_STATUS_NAME = "系统总状态位";

/** 系统总状态位：独占整行 */
const COL_SYS_STATUS = { value: 24, xs: 24, sm: 24, md: 24, lg: 24, xl: 24 };
/** 其余状态位：一行 2 个 */
const COL_BITS = { value: 12, xs: 24, sm: 24, md: 12, lg: 6, xl: 6 };
/** 数值型（遥测值）卡片占宽更小 */
const COL_SCALAR = { value: 4, xs: 12, sm: 8, md: 6, lg: 3, xl: 3 };

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
  const data = ref<Array<Record<string, any>>>([]);
  const dataWithFilter = ref<Array<Record<string, any>>>([]);
  const updatedAt = ref("");
  let listenerId: number | null = null;

  function onData(_event: any, dataFromMain: any) {
    data.value = Array.isArray(dataFromMain.data) ? dataFromMain.data : [];
    dataWithFilter.value = data.value.filter(item => !item.data_isHiden);
    updatedAt.value = new Date().toLocaleTimeString("zh-CN", {
      hour12: false
    });
  }

  onBeforeMount(() => {
    listenerId = window.ipcRenderer.on("cluster_summary", onData);
  });

  onBeforeUnmount(() => {
    if (listenerId !== null) {
      window.ipcRenderer.off(listenerId);
      listenerId = null;
    }
  });

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

  /** 单位："/" 代表无单位 */
  const fmtUnit = (unit?: string) => (unit && unit !== "/" ? unit : "");

  return {
    dataWithFilter,
    sysStatusData,
    bitData,
    scalarData,
    updatedAt,
    isBits,
    COL_SYS_STATUS,
    COL_BITS,
    COL_SCALAR,
    getDisplayMode,
    isBitActive,
    fmtUnit
  };
}
