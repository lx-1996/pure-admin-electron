import type { LoadingConfig } from "@pureadmin/table";
import { ref, reactive, onBeforeMount, onBeforeUnmount, computed } from "vue";
interface CellData {
  data: Record<string, any>[];
  maxCellsPerAFE: number;
}
export function useColumns(dataType: string) {
  const dataAllIps = ref<Map<string, CellData>>(new Map());
  const selectedIp = ref<string>("192.168.10.208");
  const dataSelectedIp = computed(() => {
    return (
      dataAllIps.value.get(selectedIp.value) ?? {
        data: [],
        maxCellsPerAFE: 0
      }
    );
  });
  const columnNumSelectedIp = computed(() => {
    return dataSelectedIp.value?.maxCellsPerAFE ?? 0;
  });
  const loading = ref(true);

  const columns = computed(() => {
    return [
      {
        label: "BMU-AFE",
        prop: "bmuAFEIndex"
      },
      ...Array.from({ length: columnNumSelectedIp.value }, (_, index) => {
        return {
          label: `${index}`,
          prop: `${index}`
        };
      })
    ];
  });
  /** 加载动画配置 */
  const loadingConfig = reactive<LoadingConfig>({
    text: "正在加载...",
    viewBox: "-10, -10, 50, 50",
    spinner: `
        <path class="path" d="
          M 30 15
          L 28 17
          M 25.61 25.61
          A 15 15, 0, 0, 1, 15 30
          A 15 15, 0, 1, 1, 27.99 7.5
          L 15 15
        " style="stroke-width: 4px; fill: rgba(0, 0, 0, 0)"/>
      `
    // svg: "",
    // background: rgba()
  });
  let listenerId: number | null = null;

  function onData(_event: any, dataFromMain: any) {
    //console.log("cell_soc");
    const { ip, data } = dataFromMain;
    dataAllIps.value.set(ip, data);
    loading.value = false;
    loadingConfig.text = "加载完成";
  }
  onBeforeMount(() => {
    listenerId = window.ipcRenderer.on(dataType, onData);
  });

  onBeforeUnmount(() => {
    if (listenerId !== null) {
      window.ipcRenderer.off(listenerId);
      listenerId = null;
    }
  });
  return {
    columns,
    dataSelectedIp,
    loading,
    loadingConfig,
    listenerId,
    onData
  };
}
