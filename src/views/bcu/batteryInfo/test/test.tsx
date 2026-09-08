import { onMounted, onUnmounted } from "vue";
export function usePackData() {
  // interface Data {
  //   data: Array<Record<string, any>>;
  //   ip: string;
  // }
  // const data = ref(Array<Data>);
  // const dataSelectedIp = ref([]);
  let listenerId = null;
  function onData(_event: any, data: any) {
    console.log(data);
  }
  onMounted(() => {
    listenerId = window.ipcRenderer.on("pack_summary", onData);
  });
  onUnmounted(() => {
    if (listenerId !== null) {
      window.ipcRenderer.off(listenerId);
      listenerId = null;
    }
  });
}
