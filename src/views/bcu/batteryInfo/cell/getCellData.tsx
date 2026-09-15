import { ref, onBeforeMount, onBeforeUnmount, computed } from "vue";
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
  let listenerId: number | null = null;

  function onData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain;
    dataAllIps.value.set(ip, data);
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
    listenerId,
    onData
  };
}
