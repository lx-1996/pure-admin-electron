import { ref, computed } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { useIpcListener } from "@/utils/useIpcListener";
interface CellData {
  data: Record<string, any>[];
  maxCellsPerAFE: number;
}
export function useColumns(dataType: string) {
  const dataAllIps = ref<Map<string, CellData>>(new Map());
  const bcuConnectStore = useBcuConnectStoreHook();
  const dataSelectedIp = computed(() => {
    return (
      dataAllIps.value.get(bcuConnectStore.selectIp) ?? {
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
  function onData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain;
    dataAllIps.value.set(ip, data);
  }
  useIpcListener(dataType, onData);
  return {
    columns,
    dataSelectedIp
  };
}
