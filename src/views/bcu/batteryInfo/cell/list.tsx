import CellData from "./cellChild.vue";
import { defineComponent, h, type Component } from "vue";
import BMUDataChild from "../pack_summary/index.vue";
import SysDataChild from "../system_summary/index.vue";
const bmu = (dataClass: string): Component =>
  defineComponent({
    name: `BMU-${dataClass}`,
    setup: () => () =>
      h("div", { class: "flex flex-col gap-1" }, [
        h(SysDataChild, { dataClass }),
        h(BMUDataChild, { dataClass })
      ])
  });
const cell = (cellDataClass: string, sysDataClass: string): Component =>
  defineComponent({
    name: `Cell-${cellDataClass}`,
    setup: () => () => h(CellData, { cellDataClass, sysDataClass })
  });
export const list: { key: string; title: string; component: Component }[] = [
  {
    key: "cell_vltg",
    title: "单体电压(V)",
    component: cell("cell_vltg", "单体电压")
  },
  {
    key: "cell_temp",
    title: "单体温度(℃)",
    component: cell("cell_temp", "单体温度")
  },
  {
    key: "cell_soc",
    title: "单体SOC(%)",
    component: cell("cell_soc", "单体SOC")
  },
  {
    key: "cell_soh",
    title: "单体SOH(%)",
    component: cell("cell_soh", "单体SOH")
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
