import { ref, onBeforeMount, onBeforeUnmount } from "vue";
export function useCol() {
  const data = ref<Array<Record<string, any>>>([]);
  let listenerId: number | null = null;
  function onData(_event: any, value: any) {
    //console.log(value);
    data.value = Array.isArray(value)
      ? value.filter((item: any) => !item?.data_isHiden)
      : [];
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
  const getDisplayMode = (value: any) => {
    switch (value?.display_mode) {
      case "mappingValue":
        return value?.bit_value;
      case "nameHighLightWithBitRaw":
        return value?.bit_name;
    }
  };
  return { data, getDisplayMode };
}
