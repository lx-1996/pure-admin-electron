import CellVltg from "./cellvltg/index.vue";
import CellTemp from "./celltemp/index.vue";
import CellSOC from "./cellsoc/index.vue";
import CellSOH from "./cellsoh/index.vue";
export const list = [
  {
    key: "cell_vltg",
    title: "单体电压",
    component: CellVltg
  },
  {
    key: "cell_temp",
    title: "单体温度",
    component: CellTemp
  },
  {
    key: "cell_soc",
    title: "单体SOC",
    component: CellSOC
  },
  {
    key: "cell_soh",
    title: "单体SOH",
    component: CellSOH
  }
];
