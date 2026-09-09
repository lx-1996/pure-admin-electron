import CellVltg from "./cellVltg.vue";
import CellTemp from "./cellTemp.vue";
import CellSOC from "./cellSOC.vue";
import CellSOH from "./cellSOH.vue";
import { defineComponent, h, type Component } from "vue";
import BMUDataChild from "../pack_summary/index.vue";
import SysDataChild from "../system_summary/index.vue";
// import System_summary from "./system_summary/index.vue";
// import Cluster_summary from "./cluster_summary/index.vue";
// import Pack_summary from "./pack_summary/index.vue";
const bmu = (dataClass: string): Component =>
  defineComponent({
    name: `BMU-${dataClass}`,
    setup: () => () =>
      h("div", [h(SysDataChild, { dataClass }), h(BMUDataChild, { dataClass })])
  });
export const list: { key: string; title: string; component: Component }[] = [
  {
    key: "cell_vltg",
    title: "单体电压(V)",
    component: CellVltg
  },
  {
    key: "cell_temp",
    title: "单体温度(℃)",
    component: CellTemp
  },
  {
    key: "cell_soc",
    title: "单体SOC(%)",
    component: CellSOC
  },
  {
    key: "cell_soh",
    title: "单体SOH(%)",
    component: CellSOH
  },
  {
    key: "bmu_vltg",
    title: "BMU电压(V)",
    component: bmu("BMU电压")
  },
  {
    key: "bmu_temp",
    title: "BMU电路板温度(℃)",
    component: bmu("BMU电路板温度")
  },
  {
    key: "bmu_soc",
    title: "BMU-SOC(%)",
    component: bmu("BMU-SOC")
  },
  {
    key: "bmu_connectT",
    title: "动力接插件温度(℃)",
    component: bmu("动力接插件温度")
  },
  {
    key: "bmu_afeT",
    title: "铜排温度(℃)",
    component: bmu("铜排温度")
  },
  {
    key: "bmu_restartFlag",
    title: "BMU重启标志",
    component: bmu("BMU重启标志")
  }
];
