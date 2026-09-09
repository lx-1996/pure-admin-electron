import Cell from "./cell/index.vue";
// import System_summary from "./system_summary/index.vue";
import Cluster_summary from "./cluster_summary/index.vue";
import test from "./test/index.vue";
export const list = [
  {
    key: "cell",
    title: "单体数据",
    component: Cell
  },
  // {
  //   key: "system_summary",
  //   title: "系统汇总",
  //   component: System_summary
  // },
  {
    key: "cluster_summary",
    title: "簇端汇总",
    component: Cluster_summary
  },
  {
    key: "test",
    title: "测试",
    component: test
  }
];
