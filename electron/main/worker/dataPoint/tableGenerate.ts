/**
 * 点表数据模型（依据通讯协议定义）
 *
 * - 列式存储：每个属性为一列数组，同一点的不同属性通过索引对应
 * - data_min / data_max 为 raw 值范围
 * - id 为类内序号（从 1 开始）
 * - 常量列通过 SHARE 共享方法按需生成，相同 (value, n) 参数共享同一数组引用，降低内存占用
 * - system_summary.data_name 待补充
 */

// ---------- 类型定义 ----------
/**参数类类型*/
type ClassType =
  | "cell_vltg"
  | "cell_temp"
  | "cell_soc"
  | "cell_soh"
  | "system_summary"
  | "cluster_summary"
  | "pack_summary";
/** 寄存器数据类型 */
type DataType =
  | "uint16"
  | "int16"
  | "uint32"
  | "float"
  | "ascii"
  | "bitfield"
  | "hex";

interface DataTypeConfig {
  data_type: DataType;
  data_word_length: number;
}
type UNITTYPE =
  | "V"
  | "℃"
  | "%"
  | "mV"
  | "/"
  | "A"
  | "kΩ"
  | "kW"
  | "kWh"
  | "Ah"
  | "kB";
type RES = 1 | 0.1 | 0.01 | 0.001;
interface BitConfig {
  reg_idx: number;
  bit_offset: number;
  bit_length: number;
  bit_name?: string;
  bit_value?: boolean;
  bit_value_type?: string;
  bit_mapping?: Record<number, string>;
}
/** 单类点表（列式结构） */
interface PointTable {
  id?: number[];
  /** 点名；system_summary 暂未生成，待补充 */
  data_name: string[];
  data_address?: number[];
  data_type?: DataType[];
  data_min?: number[];
  data_max?: number[];
  data_res?: RES[];
  data_offset?: number[];
  data_unit?: UNITTYPE[];
  /** 该参数占用的寄存器数；缺省按 DATA_WORD_LENGTH 依据 data_type 推导 */
  data_word_length?: number[];
  /** 位解析配置列：按参数索引对齐，无位配置的参数为 null */
  data_bit_config?: (BitConfig[] | null)[];
}

/** 点表类定义 */
interface ClassTable {
  class: string;
  isClusterParm: boolean;
  addr_start: number;
  addr_num: number;
  data_invalid_value?: string;
  data_disconnect_value?: string;
  data_type?: DataType;
  data_min?: number;
  data_max?: number;
  data_res?: RES;
  data_unit?: UNITTYPE;
  data_offset?: number;
  data_props: PointTable;
  /** 该参数占用的寄存器数；缺省按 DATA_WORD_LENGTH 依据 data_type 推导 */
  data_bit_config?: BitConfig[];
}
interface Build_data {
  id: number;
  data_name: string;
  data_value: number | number[];
  data_address?: number;
  data_type?: DataType;
  data_min?: number;
  data_max?: number;
  data_res?: RES;
  data_offset?: number;
  data_unit?: UNITTYPE;
  /** 该参数占用的寄存器数；缺省按 DATA_WORD_LENGTH 依据 data_type 推导 */
  data_bit_config?: BitConfig[] | null;
  data_word_length?: number;
}
interface Irregular_props {
  data_name: string[];
  data_type?: DataType[];
  data_min?: number[];
  data_max?: number[];
  data_res?: RES[];
  data_offset?: number[];
  data_unit?: UNITTYPE[];
  data_bit_config?: (BitConfig[] | null)[];
  data_word_length?: number[];
}
// ---------- 生成工具 ----------

// ---------- 地址长度容器 ----------

/**
 * 各类点表的地址长度（addr_num）
 * 新增其他点表类时，在此按需增加对应长度
 */
const ADDR_NUM_MAP = {
  /** 单体数据大类 */
  cell: 4096,
  /** 系统汇总类 */
  system_summary: 144,
  cluster_summary: 256,
  pack_summary: 768
} as const;
const ADDR_NUM_MAP_WITHOUT_RES = {
  /** 系统汇总类 */
  system_summary: 128,
  cluster_summary: 125,
  pack_summary: 614
} as const;
// ---------- 共享常量列方法 ----------

/** 常量列缓存：以 `${value}:${n}` 为键，相同参数的调用共享同一数组引用 */
const columnCache = new Map<string, unknown[]>();

/** 生成 n 个 value 的常量列（相同参数共享同一引用） */
function column<T>(value: T, n: number): T[] {
  const key = `${String(value)}:${n}`;
  let arr = columnCache.get(key) as T[] | undefined;
  if (arr === undefined) {
    arr = new Array(n).fill(value);
    columnCache.set(key, arr);
  }
  return arr;
}
/** 生成 n 个递增点名 */
function names(prefix: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${prefix}_${i + 1}`);
}
/**
 * 共享常量列方法：同一方法可被多类复用，按需传入不同参数（如地址长度）
 * 相同 (value, n) 参数下，返回同一数组引用
 */
const SHARE = {
  /** 任意值常量列（通用方法） */
  column,
  names,
  names_bmu(prefix: string, n: number): string[] {
    return Array.from({ length: n }, (_, i) => `BMU${i + 1}-${prefix}`);
  },
  names_afe(prefix: string, n: number): string[] {
    return Array.from({ length: n }, (_, i) => `afe${i + 1}-${prefix}`);
  },
  names_connectT(n: number): string[] {
    return Array.from({ length: n }, (_, i) => [
      `BMU${i + 1}-1号动力接插件温度`,
      `BMU${i + 1}-2号动力接插件温度`
    ]).flat();
  },
  names_bmuVersion(n: number): string[] {
    return Array.from({ length: n }, (_, i) => [
      `BMU${i + 1}-软件版本号`,
      `BMU${i + 1}-BOOT版本号`
    ]).flat();
  },
  names_system_summary(prefix: string): string[] {
    return [
      `${prefix}_第1大值`,
      `${prefix}_第1大值编号`,
      `${prefix}_第2大值`,
      `${prefix}_第2大值编号`,
      `${prefix}_第3大值`,
      `${prefix}_第3大值编号`,
      `${prefix}_第1小值`,
      `${prefix}_第1小值编号`,
      `${prefix}_第2小值`,
      `${prefix}_第2小值编号`,
      `${prefix}_第3小值`,
      `${prefix}_第3小值编号`,
      `${prefix}_平均值`,
      `${prefix}_极差值`,
      "预留",
      "预留"
    ];
  },
  /** uint16 类型常量列 */
  uint16(num: number): DataTypeConfig[] {
    return Array.from({ length: num }, () => ({
      data_type: "uint16",
      data_word_length: 1
    }));
  },
  /** int16 类型常量列 */
  int16(num: number): DataTypeConfig[] {
    return Array.from({ length: num }, () => ({
      data_type: "int16",
      data_word_length: 1
    }));
  },
  uint32(num: number): DataTypeConfig[] {
    return Array.from({ length: num }, () => ({
      data_type: "uint32",
      data_word_length: 2
    }));
  },
  ascii(length: number, num: number): DataTypeConfig[] {
    return Array.from({ length: num }, () => ({
      data_type: "ascii",
      data_word_length: length
    }));
  },
  hex(length: number, num: number): DataTypeConfig[] {
    return Array.from({ length: num }, () => ({
      data_type: "hex",
      data_word_length: length
    }));
  },
  bitfield(length: number, num: number): DataTypeConfig[] {
    return Array.from({ length: num }, () => ({
      data_type: "bitfield",
      data_word_length: length
    }));
  },
  /** 0 常量列 */
  zero: (n: number): number[] => column(0, n),
  /** 0.001 分辨率常量列 */
  res_0_001: (n: number): RES[] => column(0.001, n),
  res_0_01: (n: number): RES[] => column(0.01, n),
  /** 0.1 分辨率常量列 */
  res_0_1: (n: number): RES[] => column(0.1, n),
  res_1: (n: number): RES[] => column(1, n),
  /** V 单位常量列 */
  unit_v: (n: number): UNITTYPE[] => column("V", n),
  /** ℃ 单位常量列 */
  unit_temp: (n: number): UNITTYPE[] => column("℃", n),
  unit_a: (n: number): UNITTYPE[] => column("A", n),
  unit_kΩ: (n: number): UNITTYPE[] => column("kΩ", n),
  /** % 单位常量列 */
  unit_pct: (n: number): UNITTYPE[] => column("%", n),
  unit_kW: (n: number): UNITTYPE[] => column("kW", n),
  unit_kWh: (n: number): UNITTYPE[] => column("kWh", n),
  unit_Ah: (n: number): UNITTYPE[] => column("Ah", n),
  unit_kB: (n: number): UNITTYPE[] => column("kB", n),
  reserved: (n: number): string[] => column("预留", n),
  backslash: (n: number): string[] => column("/", n),
  max_65535: (n: number): number[] => column(65535, n),
  null: (n: number): null[] => column(null, n)
};
const Data_type: Record<"uint16" | "int16", DataTypeConfig> = {
  uint16: {
    data_type: "uint16",
    data_word_length: 1
  },
  int16: {
    data_type: "int16",
    data_word_length: 1
  }
};
function generate_BMU_version_datatype() {
  const res: DataTypeConfig[] = [];
  for (let i = 0; i < 64; i++) {
    if (i % 2 == 0) {
      res.push({
        data_type: "hex",
        data_word_length: 1
      });
    } else
      res.push({
        data_type: "ascii",
        data_word_length: 1
      });
  }
  return res;
}
// ---------- 点表 ----------
const params_data_type = {
  system_summary: [
    ...SHARE.uint16(16),
    ...Array.from({ length: 16 }, (_, index) => {
      if (index % 2 == 0 && index <= 11) return Data_type.int16;
      if (index == 12 || index == 13) return Data_type.int16;
      else return Data_type.uint16;
    }),
    ...SHARE.uint16(16),
    ...Array.from({ length: 16 }, (_, index) => {
      if (index % 2 == 0 && index <= 11) return Data_type.int16;
      if (index == 12 || index == 13) return Data_type.int16;
      else return Data_type.uint16;
    }),
    ...SHARE.uint16(32),
    ...Array.from({ length: 16 }, (_, index) => {
      if (index % 2 == 0 && index <= 11) return Data_type.int16;
      if (index == 12 || index == 13) return Data_type.int16;
      else return Data_type.uint16;
    }),
    ...Array.from({ length: 16 }, (_, index) => {
      if (index % 2 == 0 && index <= 11) return Data_type.int16;
      if (index == 12 || index == 13) return Data_type.int16;
      else return Data_type.uint16;
    })
    //...SHARE.uint16(16)
  ],
  cluster_summary: [
    ...SHARE.uint16(3),
    ...SHARE.bitfield(1, 2),
    ...SHARE.uint16(2),
    ...SHARE.int16(1),
    ...SHARE.uint16(2), //绝缘电阻R-
    ...SHARE.int16(5),
    ...SHARE.bitfield(2, 1),
    ...SHARE.bitfield(1, 1),
    ...SHARE.uint16(4),
    ...SHARE.bitfield(1, 1), //充电SOP有效校验标识
    ...SHARE.uint16(3),
    ...SHARE.bitfield(1, 1),
    ...SHARE.uint16(3),
    ...SHARE.uint32(6), //簇端最大允许充电功率
    ...SHARE.uint16(2),
    ...SHARE.int16(2),
    ...SHARE.bitfield(1, 1),
    ...SHARE.uint16(4),
    ...SHARE.bitfield(1, 1),
    ...SHARE.uint32(3),
    ...SHARE.uint16(4),
    ...SHARE.ascii(7, 9)
    //...SHARE.uint16(131)
  ],
  pack_summary: [
    ...SHARE.bitfield(32, 1),
    ...SHARE.uint16(36),
    ...SHARE.int16(96),
    ...generate_BMU_version_datatype(),
    ...SHARE.uint16(32),
    ...SHARE.hex(7, 32),
    ...SHARE.int16(128),
    ...SHARE.bitfield(2, 1)
    //...SHARE.uint16(154)
  ]
};
/** system_summary 数据类型列：长度 144，各段定义按协议（字段无规律） */
const params_irregular_props: Record<string, Irregular_props> = {
  system_summary: {
    data_name: [
      ...SHARE.names_system_summary("单体电压"),
      ...SHARE.names_system_summary("单体温度"),
      ...SHARE.names_system_summary("BMU电压"),
      ...SHARE.names_system_summary("BMU电路板温度"),
      ...SHARE.names_system_summary("单体SOC"),
      ...SHARE.names_system_summary("单体SOH"),
      ...SHARE.names_system_summary("动力接插件温度"),
      ...SHARE.names_system_summary("AFE铜排温度")
      //...SHARE.reserved(16)
    ],
    data_type: params_data_type.system_summary.map(item => item.data_type),
    data_word_length: params_data_type.system_summary.map(
      item => item.data_word_length
    ),
    data_min: [
      ...SHARE.zero(16),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return -40;
        if (index == 12 || index == 13) return -40;
        else return 0;
      }),
      ...SHARE.zero(16),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return -40;
        if (index == 12 || index == 13) return -40;
        else return 0;
      }),
      ...SHARE.zero(32),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return -40;
        if (index == 12 || index == 13) return -40;
        else return 0;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return -40;
        if (index == 12 || index == 13) return -40;
        else return 0;
      })
      //...SHARE.zero(16)
    ],
    data_max: [
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 5000;
        if (index == 12 || index == 13) return 5000;
        else return 65535;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 125;
        if (index == 12 || index == 13) return 125;
        else return 65535;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 5000;
        if (index == 12 || index == 13) return 5000;
        else return 65535;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 125;
        if (index == 12 || index == 13) return 125;
        else return 65535;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 100;
        if (index == 12 || index == 13) return 100;
        else return 65535;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 100;
        if (index == 12 || index == 13) return 100;
        else return 65535;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 125;
        if (index == 12 || index == 13) return 125;
        else return 65535;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 125;
        if (index == 12 || index == 13) return 125;
        else return 65535;
      })
      // ...SHARE.max_65535(16)
    ],
    data_res: [
      ...SHARE.res_1(16),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 0.1;
        if (index == 12 || index == 13) return 0.1;
        else return 1;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 0.1;
        if (index == 12 || index == 13) return 0.1;
        else return 1;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 0.1;
        if (index == 12 || index == 13) return 0.1;
        else return 1;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 0.1;
        if (index == 12 || index == 13) return 0.1;
        else return 1;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 0.1;
        if (index == 12 || index == 13) return 0.1;
        else return 1;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 0.1;
        if (index == 12 || index == 13) return 0.1;
        else return 1;
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return 0.1;
        if (index == 12 || index == 13) return 0.1;
        else return 1;
      })
      // ...SHARE.res_1(16)
    ],
    data_unit: [
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "mV";
        if (index == 12 || index == 13) return "mV";
        else return "/";
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "℃";
        if (index == 12 || index == 13) return "℃";
        else return "/";
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "mV";
        if (index == 12 || index == 13) return "mV";
        else return "/";
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "℃";
        if (index == 12 || index == 13) return "℃";
        else return "/";
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "%";
        if (index == 12 || index == 13) return "%";
        else return "/";
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "%";
        if (index == 12 || index == 13) return "%";
        else return "/";
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "℃";
        if (index == 12 || index == 13) return "℃";
        else return "/";
      }),
      ...Array.from({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "℃";
        if (index == 12 || index == 13) return "℃";
        else return "/";
      })
      // ...SHARE.backslash(16)
    ] as UNITTYPE[]
  },
  cluster_summary: {
    data_name: [
      "系统配置的AFE总数量",
      "系统配置的电池总数量",
      "系统配置的温度总数量",
      "系统当前状态",
      "模拟量故障总等级",
      "簇端电池电压",
      "簇端预充电压",
      "簇端电流",
      "绝缘电阻R+",
      "绝缘电阻R-",
      "温度1",
      "温度2",
      "温度3",
      "温度4",
      "温度5",
      "系统总状态位",
      "系统控制动作状态",
      "预留",
      "簇SOC",
      "簇SOH",
      "簇SOE",
      "充电SOP有效校验标识",
      "充电SOP",
      "充电SOP-MAP表坐标列",
      "充电SOP-MAP表坐标行",
      "放电SOP有效校验标识",
      "放电SOP",
      "放电SOP-MAP表坐标列",
      "放电SOP-MAP表坐标行",
      "簇端最大允许充电功率",
      //"簇端最大允许充电功率",
      "簇端最大允许放电功率",
      //"簇端最大允许放电功率",
      "单次充电电量",
      //"单次充电电量",
      "单次放电电量",
      //"单次放电电量",
      "单次充电容量",
      //"单次充电容量",
      "单次放电容量",
      //"单次放电容量",
      "簇真实SOC",
      "OCV执行次数",
      "簇端动力接插件电池测温差值",
      "簇端动力接插件PCS测温差值",
      "CAN霍尔传感器状态信息",
      "CAN霍尔传感器名称",
      "CAN霍尔传感器软件版本",
      "预留",
      "预留",
      "系统状态",
      "周期任务堆栈大小",
      //"周期任务堆栈大小",
      "系统堆栈空间",
      //"系统堆栈空间",
      "系统堆栈最小空间",
      //"系统堆栈最小空间",
      "可配置默认参数剩余次数",
      "预留",
      "预留",
      "预留",
      "BCU产品编码",
      "BCU硬件版本号",
      "BCU软件版本号",
      "BCU-BOOT版本号",
      "BCU-BAU协议版本号",
      "BCU-BMU协议版本号",
      "BCU事件记录版本号",
      "BCU-sox算法版本号",
      "可配置默认参数版本号"
      //...SHARE.reserved(131)
    ],
    data_type: params_data_type.cluster_summary.map(item => item.data_type),
    data_word_length: params_data_type.cluster_summary.map(
      item => item.data_word_length
    ),
    data_res: [
      ...SHARE.res_1(5),
      ...SHARE.res_0_1(3),
      ...SHARE.res_1(2),
      ...SHARE.res_0_1(5),
      ...SHARE.res_1(3),
      ...SHARE.res_0_1(3), //簇SOC
      ...SHARE.res_1(1),
      ...SHARE.res_0_1(1), //充电SOP
      ...SHARE.res_1(3),
      ...SHARE.res_0_1(1),
      ...SHARE.res_1(2), //放电SOP-MAP表坐标行
      ...SHARE.res_0_1(2),
      ...SHARE.res_0_01(4),
      ...SHARE.res_0_1(1), //簇真实SOC
      ...SHARE.res_1(1),
      ...SHARE.res_0_1(2), //簇端动力接插件PCS测温差值
      ...SHARE.res_1(22)
      //...SHARE.res_1(153)
    ],
    data_offset: /* SHARE.zero(192) */ SHARE.zero(61),
    data_bit_config: [
      ...SHARE.null(3),
      [
        {
          reg_idx: 0,
          bit_offset: 0,
          bit_length: 16,
          bit_mapping: {
            0: "静置",
            1: "充电",
            2: "放电",
            3: "开路",
            4: "接触器自检"
          }
        }
      ],
      [
        {
          reg_idx: 0,
          bit_offset: 0,
          bit_length: 16,
          bit_mapping: {
            0: "无故障",
            1: "严重故障",
            2: "一般故障",
            3: "轻微故障"
          }
        }
      ],
      ...SHARE.null(10),
      [
        {
          reg_idx: 0,
          bit_offset: 0,
          bit_length: 1,
          bit_name: "静置状态",
          bit_mapping: {
            0: "未静置",
            1: "静置"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 1,
          bit_length: 1,
          bit_name: "充电状态",
          bit_mapping: {
            0: "未充电",
            1: "充电"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 2,
          bit_length: 1,
          bit_name: "放电状态",
          bit_mapping: {
            0: "未放电",
            1: "放电"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 3,
          bit_length: 1,
          bit_name: "禁充状态",
          bit_mapping: {
            0: "未禁充",
            1: "禁充"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 4,
          bit_length: 1,
          bit_name: "禁放状态",
          bit_mapping: {
            0: "未禁放",
            1: "禁放"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 5,
          bit_length: 1,
          bit_name: "禁充禁放",
          bit_mapping: {
            0: "未禁充禁放",
            1: "禁充禁放"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 6,
          bit_length: 1,
          bit_name: "告警状态",
          bit_mapping: {
            0: "未告警",
            1: "告警"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 7,
          bit_length: 1,
          bit_name: "故障状态",
          bit_mapping: {
            0: "未故障",
            1: "故障"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 8,
          bit_length: 1,
          bit_name: "充电功率锁存状态",
          bit_mapping: {
            0: "未充电功率锁存中",
            1: "充电功率锁存中"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 9,
          bit_length: 1,
          bit_name: "放电功率锁存状态",
          bit_mapping: {
            0: "未放电功率锁存中",
            1: "放电功率锁存中"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 10,
          bit_length: 1,
          bit_name: "充电指令",
          bit_mapping: {
            0: "未接收到充电指令",
            1: "接收到充电指令"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 11,
          bit_length: 1,
          bit_name: "充电指令完成状态",
          bit_mapping: {
            0: "充电闭合未完成",
            1: "充电闭合完成"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 12,
          bit_length: 1,
          bit_name: "放电指令",
          bit_mapping: {
            0: "未接收到放电指令",
            1: "接收到放电指令"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 13,
          bit_length: 1,
          bit_name: "放电指令完成状态",
          bit_mapping: {
            0: "放电闭合未完成",
            1: "放电闭合完成"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 14,
          bit_length: 1,
          bit_name: "脱离母线指令",
          bit_mapping: {
            0: "未接收到脱离母线指令",
            1: "接收到脱离母线指令"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 15,
          bit_length: 1,
          bit_name: "脱离母线指令完成状态",
          bit_mapping: {
            0: "断开接触器未完成",
            1: "断开接触器完成"
          }
        },
        {
          reg_idx: 1,
          bit_offset: 0,
          bit_length: 1,
          bit_name: "运维模式",
          bit_mapping: {
            0: "非运维模式",
            1: "运维模式"
          }
        },
        {
          reg_idx: 1,
          bit_offset: 1,
          bit_length: 1,
          bit_name: "测试模式",
          bit_mapping: {
            0: "正常模式",
            1: "测试模式"
          }
        },
        {
          reg_idx: 1,
          bit_offset: 2,
          bit_length: 1,
          bit_name: "初始化状态",
          bit_mapping: {
            0: "初始化完成",
            1: "正在初始化"
          }
        }
      ],
      [
        {
          reg_idx: 0,
          bit_offset: 0,
          bit_length: 2,
          bit_name: "高压允许闭合状态",
          bit_mapping: {
            0: "初始状态",
            1: "不允许闭合高压",
            2: "允许闭合高压"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 0,
          bit_length: 2,
          bit_name: "分励脱扣动作",
          bit_mapping: {
            0: "初始状态",
            1: "未执行脱扣动作",
            2: "已执行脱扣动作"
          }
        }
      ],
      ...SHARE.null(4),
      [
        {
          reg_idx: 0,
          bit_offset: 0,
          bit_length: 16,
          bit_mapping: {
            0x5bb5: "有效",
            0x1221: "无效"
          }
        }
      ],
      ...SHARE.null(3),
      [
        {
          reg_idx: 0,
          bit_offset: 0,
          bit_length: 16,
          bit_mapping: {
            0x5bb5: "有效",
            0x1221: "无效"
          }
        }
      ],
      ...SHARE.null(13),
      [
        {
          reg_idx: 0,
          bit_offset: 0,
          bit_length: 1,
          bit_mapping: {
            0: "无故障",
            1: "有故障"
          }
        },
        {
          reg_idx: 0,
          bit_offset: 1,
          bit_length: 7,
          bit_mapping: {
            1: "存储错误",
            2: "过流检测",
            3: "通量间的振荡时间未超过20ms",
            4: "时钟源",
            5: "电源电压超过范围",
            6: "硬件默认ADC通道",
            7: "新数据不可用",
            8: "硬件默认DAC阈值",
            9: "硬件默认参考电压"
          }
        }
      ],
      ...SHARE.null(4),
      [
        {
          reg_idx: 0,
          bit_offset: 1,
          bit_length: 16,
          bit_mapping: {
            0: "系统正常",
            1: "系统重启"
          }
        }
      ],
      // ...SHARE.null(147)
      ...SHARE.null(16)
    ] as (BitConfig[] | null)[],
    data_unit: [
      ...SHARE.backslash(5),
      ...SHARE.unit_v(2),
      ...SHARE.unit_a(1),
      ...SHARE.unit_kΩ(2),
      ...SHARE.unit_temp(5),
      ...SHARE.backslash(3),
      ...SHARE.unit_pct(3),
      ...SHARE.backslash(1),
      ...SHARE.unit_pct(1),
      ...SHARE.backslash(3),
      ...SHARE.unit_pct(1),
      ...SHARE.backslash(2),
      ...SHARE.unit_kW(2),
      ...SHARE.unit_kWh(2),
      ...SHARE.unit_Ah(2),
      ...SHARE.unit_pct(1),
      ...SHARE.backslash(1),
      ...SHARE.unit_temp(2),
      ...SHARE.backslash(6),
      ...SHARE.unit_kB(3),
      //...SHARE.backslash(144)
      ...SHARE.backslash(13)
    ] as UNITTYPE[]
  },
  pack_summary: {
    data_name: [
      "单向菊花链断连位置",
      "BMU失联数量",
      "AFE失联数量",
      "电芯电压断线数量",
      "电芯温度断线数量",
      ...SHARE.names_bmu("BMU电压", 32),
      ...SHARE.names_bmu("BMU电路板温度", 32),
      ...SHARE.names_connectT(32),
      ...SHARE.names_bmuVersion(32),
      ...SHARE.names_bmu("BMU-SOC", 32),
      ...SHARE.names_bmu("BMU产品编码", 32),
      ...SHARE.names_afe("铜牌温度", 128),
      "BMU重启标志"
      //...SHARE.reserved(154)
    ],
    data_type: params_data_type.pack_summary.map(item => item.data_type),
    data_word_length: params_data_type.pack_summary.map(
      item => item.data_word_length
    ),
    data_bit_config: [
      Array.from({ length: 32 }, (_, idex) => {
        return [
          {
            reg_idx: 0,
            bit_offset: 0,
            bit_length: 8,
            bit_name: `BMU${idex + 1}断联位置-正向`,
            bit_value: true,
            bit_value_type: "bit"
          },
          {
            reg_idx: 0,
            bit_offset: 8,
            bit_length: 8,
            bit_name: `BMU${idex + 1}断联位置-反向`,
            bit_value: true,
            bit_value_type: "bit"
          }
        ];
      }).flat(),
      ...SHARE.null(388),
      [
        ...Array.from({ length: 16 }, (_, index) => {
          return {
            reg_idx: 0,
            bit_offset: 0,
            bit_length: 1,
            bit_name: `BMU${index + 1}重启标志`,
            bit_mapping: {
              0: "重启初始化完成",
              1: "重启初始化中"
            }
          };
        }),
        ...Array.from({ length: 16 }, (_, index) => {
          return {
            reg_idx: 1,
            bit_offset: 0,
            bit_length: 1,
            bit_name: `BMU${index + 17}重启标志`,
            bit_mapping: {
              0: "重启初始化完成",
              1: "重启初始化中"
            }
          };
        })
      ].flat()
      //...SHARE.null(154)
    ],
    data_res: [
      ...SHARE.res_1(5),
      ...SHARE.res_0_1(128),
      ...SHARE.res_1(64),
      ...SHARE.res_0_1(32),
      ...SHARE.res_1(32),
      ...SHARE.res_0_1(128),
      ...SHARE.res_1(1)
      //...SHARE.res_1(155)
    ],
    data_offset: /* SHARE.zero(544) */ SHARE.zero(390),
    data_unit: [
      ...SHARE.backslash(5),
      ...SHARE.unit_v(32),
      ...SHARE.unit_temp(96),
      ...SHARE.backslash(64),
      ...SHARE.unit_pct(32),
      ...SHARE.backslash(32),
      ...SHARE.unit_temp(128),
      ...SHARE.backslash(1)
      /*    ...SHARE.backslash(155) */
    ] as UNITTYPE[]
  }
};

const params_propMap: Record<ClassType, PointTable> = {
  cell_vltg: {
    //id: seq(ADDR_NUM_MAP.cell),
    data_name: names("cell_vltg", ADDR_NUM_MAP.cell)
  },
  cell_temp: {
    //id: seq(ADDR_NUM_MAP.cell),
    data_name: names("cell_temp", ADDR_NUM_MAP.cell)
  },
  cell_soc: {
    //id: seq(ADDR_NUM_MAP.cell),
    data_name: names("cell_soc", ADDR_NUM_MAP.cell)
  },
  cell_soh: {
    //id: seq(ADDR_NUM_MAP.cell),
    data_name: names("cell_soh", ADDR_NUM_MAP.cell)
  },
  system_summary: {
    // data_name 待补充
    //id: seq(ADDR_NUM_MAP.system_summary),
    data_name: params_irregular_props.system_summary.data_name,
    data_type: params_irregular_props.system_summary.data_type,
    data_min: params_irregular_props.system_summary.data_min,
    data_max: params_irregular_props.system_summary.data_max,
    data_res: params_irregular_props.system_summary.data_res,
    data_offset: SHARE.zero(ADDR_NUM_MAP_WITHOUT_RES.system_summary),
    data_unit: params_irregular_props.system_summary.data_unit,
    data_word_length: params_irregular_props.system_summary.data_word_length
  },
  cluster_summary: {
    data_name: params_irregular_props.cluster_summary.data_name,
    data_type: params_irregular_props.cluster_summary.data_type,
    data_res: params_irregular_props.cluster_summary.data_res,
    data_offset: params_irregular_props.cluster_summary.data_offset,
    data_word_length: params_irregular_props.cluster_summary.data_word_length,
    data_bit_config: params_irregular_props.cluster_summary.data_bit_config,
    data_unit: params_irregular_props.cluster_summary.data_unit
  },
  pack_summary: {
    data_name: params_irregular_props.pack_summary.data_name,
    data_type: params_irregular_props.pack_summary.data_type,
    data_res: params_irregular_props.pack_summary.data_res,
    data_offset: params_irregular_props.pack_summary.data_offset,
    data_word_length: params_irregular_props.pack_summary.data_word_length,
    data_bit_config: params_irregular_props.pack_summary.data_bit_config,
    data_unit: params_irregular_props.pack_summary.data_unit
  }
};

// ---------- 类定义 ----------

const classes_fieldsMap: Record<ClassType, ClassTable> = {
  cell_vltg: {
    class: "cell_vltg",
    isClusterParm: true,
    addr_start: 0x0000,
    addr_num: ADDR_NUM_MAP.cell,
    data_invalid_value: "0x7FFF",
    data_disconnect_value: "0x7FFE",
    data_type: "uint16",
    data_min: 0,
    data_max: 5,
    data_res: 0.001,
    data_offset: 0,
    data_unit: "V",
    data_props: params_propMap.cell_vltg
  },
  cell_temp: {
    class: "cell_temp",
    isClusterParm: true,
    addr_start: 0x1000,
    addr_num: ADDR_NUM_MAP.cell,
    data_invalid_value: "0x7FFF",
    data_disconnect_value: "0x7FFE",
    data_type: "int16",
    data_min: -40,
    data_max: 125,
    data_res: 0.1,
    data_offset: 0,
    data_unit: "℃",
    data_props: params_propMap.cell_temp
  },
  cell_soc: {
    class: "cell_soc",
    isClusterParm: true,
    addr_start: 0x2000,
    addr_num: ADDR_NUM_MAP.cell,
    data_invalid_value: "0x7FFF",
    data_type: "uint16",
    data_min: 0,
    data_max: 100,
    data_res: 0.1,
    data_offset: 0,
    data_unit: "%",
    data_props: params_propMap.cell_soc
  },
  cell_soh: {
    class: "cell_soh",
    isClusterParm: true,
    addr_start: 0x3000,
    addr_num: ADDR_NUM_MAP.cell,
    data_invalid_value: "0x7FFF",
    data_type: "uint16",
    data_min: 0,
    data_max: 100,
    data_res: 0.1,
    data_offset: 0,
    data_unit: "%",
    data_props: params_propMap.cell_soh
  },
  system_summary: {
    class: "system_summary",
    isClusterParm: true,
    addr_start: 0x4000,
    addr_num: ADDR_NUM_MAP_WITHOUT_RES.system_summary,
    data_invalid_value: "0x7FFF",
    data_props: params_propMap.system_summary
  },
  cluster_summary: {
    class: "cluster_summary",
    isClusterParm: true,
    addr_start: 0x4100,
    addr_num: ADDR_NUM_MAP_WITHOUT_RES.cluster_summary,
    data_invalid_value: "0x7FFF",
    data_props: params_propMap.cluster_summary
  },
  pack_summary: {
    class: "pack_summary",
    isClusterParm: true,
    addr_start: 0x4200,
    addr_num: ADDR_NUM_MAP_WITHOUT_RES.pack_summary,
    data_props: params_propMap.pack_summary
  }
};

// ---------- 开发期校验 ----------

const PARAM_COLUMNS: (keyof PointTable)[] = [
  "id",
  "data_name",
  "data_type",
  "data_min",
  "data_max",
  "data_res",
  "data_offset",
  "data_unit",
  "data_word_length",
  "data_bit_config"
];
const cell_class = ["cell_vltg", "cell_temp", "cell_soc", "cell_soh"];

/** 计算某类点表的寄存器总数：Σ data_word_length（缺省 1） */
function totalRegisters(cls: ClassTable): number {
  const props = cls.data_props;
  const paramNum = props.data_name.length;
  const wordLengths = props.data_word_length;
  if (!wordLengths) return paramNum; //cell_class直接返回data_name长度
  let total = 0;
  for (let i = 0; i < paramNum; i++) total += wordLengths[i] ?? 1; //其余则计算wordLengths总长度
  return total;
}

/**
 * 点表完整性校验（worker 启动时调用，失败直接 throw）：
 * 1. 参数个数校验：同类下所有已定义列长度一致（等于该类参数个数）
 * 2. 寄存器个数校验：Σ data_word_length（缺省 1）=== addr_num
 */
function assertColumnLength(): void {
  for (const [name, cls] of Object.entries(classes_fieldsMap)) {
    // 1. 参数个数校验：已定义列长度必须一致
    let paramNum: number | undefined;
    for (const col of PARAM_COLUMNS) {
      const arr = cls.data_props[col];
      if (!Array.isArray(arr)) continue;
      if (paramNum === undefined) {
        paramNum = arr.length;
      } else if (arr.length !== paramNum) {
        throw new Error(
          `[点表] ${name}.${col} 长度(${arr.length})与该类参数个数(${paramNum})不一致`
        );
      } else
        console.log(
          `[点表] ${name}.${col} 长度(${arr.length})与该类参数个数(${paramNum})一致`
        );
    }
    // 2. 寄存器个数校验
    const regTotal = totalRegisters(cls);
    if (regTotal !== cls.addr_num) {
      throw new Error(
        `[点表] ${name} 寄存器总数(${regTotal})与 addr_num(${cls.addr_num})不一致`
      );
    } else
      console.log(
        `[点表] ${name} 寄存器总数(${regTotal})与 addr_num(${cls.addr_num})一致`
      );
  }
}

// ---------- 静态模板缓存 ----------

/**
 * 每类点表的静态构建模板：
 * 点表中除 data_value 外所有字段（id/name/address/type/res/offset/unit/bit_config）
 * 均为静态，只在首次构建时计算一次；slices 记录每个参数的寄存器切片位置。
 */
interface BuildTemplate {
  /** 静态字段模板（data_value 为占位，轮询时原地覆写） */
  statics: Build_data[];
  /** 每个参数在原始寄存器数组中的切片位置 */
  slices: { start: number; length: number }[];
  /** 该类期望的寄存器总数（= addr_num） */
  regTotal: number;
  /** 是否单体类（参数与寄存器 1:1，支持按配置数量部分读取） */
  isCellLike: boolean;
}

const templateCache = new WeakMap<ClassTable, BuildTemplate>();

function getTemplate(cls: ClassTable): BuildTemplate {
  let tpl = templateCache.get(cls);
  if (tpl) return tpl;

  const props = cls.data_props;
  const isCellLike = cell_class.includes(cls.class);
  const paramNum = props.data_name.length;
  const statics: Build_data[] = new Array(paramNum);
  const slices: BuildTemplate["slices"] = new Array(paramNum);

  let dataIndex = 0; // 寄存器索引
  for (let i = 0; i < paramNum; i++) {
    const wordLength = props.data_word_length?.[i] ?? 1;
    statics[i] = isCellLike
      ? {
          id: i + 1,
          data_name: props.data_name[i],
          data_address: cls.addr_start + i,
          data_type: cls.data_type,
          data_res: cls.data_res,
          data_offset: cls.data_offset,
          data_word_length: props.data_word_length?.[i],
          data_bit_config: props.data_bit_config?.[i],
          data_unit: cls.data_unit,
          data_value: 0
        }
      : {
          id: i + 1,
          data_name: props.data_name[i],
          data_address: cls.addr_start + dataIndex,
          data_type: props.data_type?.[i],
          data_res: props.data_res?.[i],
          data_offset: props.data_offset?.[i],
          data_word_length: props.data_word_length?.[i],
          data_bit_config: props.data_bit_config?.[i],
          data_unit: props.data_unit?.[i],
          data_value: 0
        };
    slices[i] = { start: dataIndex, length: wordLength };
    dataIndex += wordLength;
  }

  tpl = { statics, slices, regTotal: dataIndex, isCellLike };
  templateCache.set(cls, tpl);
  return tpl;
}

/**
 * 构建解析数据：静态字段复用模板对象，仅覆写 data_value，轮询零静态分配。
 *
 * 注意：返回数组中的对象为缓存模板的复用引用，调用方不应跨轮询周期持有；
 * 当前消费链（parse_raw_data 展开为新对象 → process.send 同步序列化）安全。
 */
function build_data(data: number[], cls: ClassTable): Build_data[] {
  const tpl = getTemplate(cls);

  if (tpl.isCellLike) {
    if (data.length > tpl.statics.length) {
      throw new Error(
        `[点表] ${cls.class} 读取寄存器数(${data.length})超过该类参数个数(${tpl.statics.length})`
      );
    }
    return data.map((value, i) => {
      const item = tpl.statics[i];
      item.data_value = value;
      return item;
    });
  }

  if (data.length !== tpl.regTotal) {
    throw new Error(
      `[点表] ${cls.class} 读取寄存器数(${data.length})与点表寄存器总数(${tpl.regTotal})不一致，可能存在通讯异常`
    );
  }
  return tpl.statics.map((item, i) => {
    const { start, length } = tpl.slices[i];
    item.data_value =
      length === 1 ? data[start] : data.slice(start, start + length);
    return item;
  });
}
export {
  assertColumnLength,
  classes_fieldsMap,
  cell_class,
  build_data,
  SHARE,
  ADDR_NUM_MAP_WITHOUT_RES
};
export type {
  DataType,
  PointTable,
  ClassTable,
  ClassType,
  BitConfig,
  Build_data,
  RES
};
