import type {
  LoadingConfig,
  AdaptiveConfig,
  PaginationProps
} from "@pureadmin/table";
import { ref, reactive, onBeforeMount, onBeforeUnmount } from "vue";
import { delay } from "@pureadmin/utils";
export function useColumns() {
  const data = ref<Array<Record<string, any>>>([]);
  const loading = ref(true);
  const columns: TableColumnList = [
    {
      label: "id",
      prop: "id"
    },
    {
      label: "名称",
      prop: "data_name"
    },
    {
      label: "值",
      prop: "data_value"
    }
  ];
  /** 分页配置 */
  const pagination = reactive<PaginationProps>({
    pageSize: 20,
    currentPage: 1,
    pageSizes: [20, 40, 60],
    total: 0,
    align: "right",
    background: true,
    size: "default"
  });
  /** 加载动画配置 */
  const loadingConfig = reactive<LoadingConfig>({
    text: "正在加载第一页...",
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
  /** 撑满内容区自适应高度相关配置 */
  const adaptiveConfig: AdaptiveConfig = {
    /** 表格距离页面底部的偏移量，默认值为 `96` */
    offsetBottom: 110
    /** 是否固定表头，默认值为 `true`（如果不想固定表头，fixHeader设置为false并且表格要设置table-layout="auto"） */
    // fixHeader: true
    /** 页面 `resize` 时的防抖时间，默认值为 `60` ms */
    // timeout: 60
    /** 表头的 `z-index`，默认值为 `100` */
    // zIndex: 100
  };
  function onCurrentChange(val) {
    loadingConfig.text = `正在加载第${val}页...`;
    loading.value = true;
    delay(600).then(() => {
      loading.value = false;
    });
  }
  function onSizeChange(val) {
    console.log("onSizeChange", val);
  }
  let listenerId: number | null = null;

  function onData(_event: any, value: any) {
    //console.log("cell_soh");
    data.value = Array.isArray(value) ? value : [];
    loading.value = false;
    loadingConfig.text = "加载完成";
    pagination.total = data.value.length;
  }
  onBeforeMount(() => {
    listenerId = window.ipcRenderer.on("cell_soh", onData);
  });

  onBeforeUnmount(() => {
    if (listenerId !== null) {
      window.ipcRenderer.off(listenerId);
      listenerId = null;
    }
  });
  return {
    columns,
    data,
    loading,
    pagination,
    loadingConfig,
    adaptiveConfig,
    listenerId,
    onData,
    onCurrentChange,
    onSizeChange
  };
}
