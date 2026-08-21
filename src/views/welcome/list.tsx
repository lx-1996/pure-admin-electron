import CellVltg from "./cellvltg/index.vue";
import CellTemp from "./celltemp/index.vue";
import CellSOC from "./cellsoc/index.vue";
import CellSOH from "./cellsoh/index.vue";
import System_summary from "./system_summary/index.vue";
import Cluster_summary from "./cluster_summary/index.vue";
import Pack_summary from "./pack_summary/index.vue";
import Pcs_data from "./pcs_data/index.vue";
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
  },
  {
    key: "system_summary",
    title: "系统汇总",
    component: System_summary
  },
  {
    key: "cluster_summary",
    title: "簇端汇总",
    component: Cluster_summary
  },
  {
    key: "pack_summary",
    title: "PACK汇总",
    component: Pack_summary
  },
  {
    key: "pcs_data",
    title: "PCS数据",
    component: Pcs_data
  }
];
