import { computed, ref } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { useIpcListener } from "@/utils/useIpcListener";
export function useDIDO() {
  const bcuConnectStore = useBcuConnectStoreHook();
  const dataDIDOAllIps = ref<Map<string, Array<Record<string, any>>>>(
    new Map()
  );
  const dataDIDOSelectedIp = computed<Array<Record<string, any>>>(() => {
    return dataDIDOAllIps.value.get(bcuConnectStore.selectIp) ?? [];
  });
  function onDIDOData(_event: any, dataFromMain: any) {
    const { ip, data } = dataFromMain ?? {};
    if (!ip) return;
    dataDIDOAllIps.value.set(ip, Array.isArray(data) ? data : []);
  }
  useIpcListener("dido", onDIDOData);
  const columns = [
    {
      label: "反馈参数",
      prop: "bit_name"
    },
    {
      label: "反馈状态",
      prop: "bit_value"
    }
  ];
  return {
    dataDIDOSelectedIp,
    columns
  };
}
