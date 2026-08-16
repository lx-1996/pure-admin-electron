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
  | "system_summary";
/** 寄存器数据类型 */
type DataType = "uint16" | "int16" | "uint32" | "ASCII" | "/";

/**
 * 数据解析方式（解码算法）
 *
 * - linear   ：线性量，物理值 = raw * data_res + data_offset
 * - bitfield ：按位解析，需配合 bit_offset（起始位，0 为最低位）+ bit_length（位数）
 * - ascii    ：ASCII 字符串，1 个寄存器存 2 个字符，长度由 reg_count 决定
 * - bcd      ：BCD 码
 * - float    ：IEEE754 浮点（大端：高字节在前）
 *
 * 注：参数「占用几个寄存器」由 reg_count 字段表达，不再由本枚举承载；
 *     缺省时按 DATA_TYPE_REG_COUNT 依据 data_type 推导。
 */
type ParsingMethod = "linear" | "bitfield" | "ascii" | "bcd" | "float";
type UNITTYPE = "V" | "℃" | "%" | "mV" | "/";

/** 各数据类型默认占用的寄存器数（1 寄存器 = 16 bit） */
const DATA_TYPE_REG_COUNT: Record<DataType, number> = {
  uint16: 1,
  int16: 1,
  uint32: 2,
  // ASCII 为变长，默认按 1 寄存器（2 字符），更长需显式指定 reg_count
  ASCII: 1,
  // "/" 为占位类型，默认占 1 寄存器
  "/": 1
};
/** 单类点表（列式结构） */
interface PointTable {
  id?: number[];
  /** 点名；system_summary 暂未生成，待补充 */
  data_name: string[];
  data_type?: DataType[];
  data_min?: number[];
  data_max?: number[];
  data_res?: number[];
  data_offset?: number[];
  data_unit?: UNITTYPE[];
  data_parsing?: ParsingMethod[];
  /** 该参数占用的寄存器数；缺省按 DATA_TYPE_REG_COUNT 依据 data_type 推导 */
  reg_count?: number[];
  /** bitfield 解析专用：起始 bit 位（0 为最低位） */
  bit_offset?: number[];
  /** bitfield 解析专用：解析的 bit 位数 */
  bit_length?: number[];
}

/** 点表类定义 */
interface ClassTable {
  class: string;
  isClusterParm: boolean;
  isBlockParm: boolean;
  addr_start: number;
  addr_num: number;
  data_invalid_value?: string;
  data_disconnect_value?: string;
  data_type?: DataType;
  data_min?: number;
  data_max?: number;
  data_res?: number;
  data_unit?: UNITTYPE;
  data_offset?: number;
  data_props: PointTable;
  data_parsing?: ParsingMethod;
  /** 该参数占用的寄存器数；缺省按 DATA_TYPE_REG_COUNT 依据 data_type 推导 */
  reg_count?: number;
  /** bitfield 解析专用：起始 bit 位（0 为最低位） */
  bit_offset?: number;
  /** bitfield 解析专用：解析的 bit 位数 */
  bit_length?: number;
}
interface Build_data {
  id: number;
  data_name: string;
  data_type?: DataType;
  data_min?: number;
  data_max?: number;
  data_res?: number;
  data_offset?: number;
  data_unit?: UNITTYPE;
  data_parsing?: ParsingMethod;
  /** 该参数占用的寄存器数；缺省按 DATA_TYPE_REG_COUNT 依据 data_type 推导 */
  reg_count?: number;
  /** bitfield 解析专用：起始 bit 位（0 为最低位） */
  bit_offset?: number;
  /** bitfield 解析专用：解析的 bit 位数 */
  bit_length?: number;
  data_value: number;
}
// ---------- 生成工具 ----------
/** 生成 n 个从 1 开始的类内序号 */
// function seq(n: number): number[] {
//   return Array.from({ length: n }, (_, i) => i + 1);
// }

/** 生成 n 个递增点名 */
function names(prefix: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => `${prefix}_${i + 1}`);
}
function names_system_summary(prefix: string): string[] {
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
}

// ---------- 地址长度容器 ----------

/**
 * 各类点表的地址长度（addr_num）
 * 新增其他点表类时，在此按需增加对应长度
 */
const ADDR_NUM_MAP = {
  /** 单体数据大类 */
  cell: 4096,
  /** 系统汇总类 */
  system_summary: 144
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

/**
 * 共享常量列方法：同一方法可被多类复用，按需传入不同参数（如地址长度）
 * 相同 (value, n) 参数下，返回同一数组引用
 */
const SHARE = {
  /** 任意值常量列（通用方法） */
  column,
  /** uint16 类型常量列 */
  uint16: (n: number): DataType[] => column("uint16", n),
  /** int16 类型常量列 */
  int16: (n: number): DataType[] => column("int16", n),
  uint32: (n: number): DataType[] => column("uint32", n),
  ASCII: (n: number): DataType[] => column("ASCII", n),
  /** 0 常量列 */
  zero: (n: number): number[] => column(0, n),
  /** 0.001 分辨率常量列 */
  res_0_001: (n: number): number[] => column(0.001, n),
  /** 0.1 分辨率常量列 */
  res_0_1: (n: number): number[] => column(0.1, n),
  /** V 单位常量列 */
  unit_v: (n: number): UNITTYPE[] => column("V", n),
  /** ℃ 单位常量列 */
  unit_temp: (n: number): UNITTYPE[] => column("℃", n),
  /** % 单位常量列 */
  unit_pct: (n: number): UNITTYPE[] => column("%", n),
  /** linear 线性解析常量列 */
  linear: (n: number): ParsingMethod[] => column("linear", n),
  /** bitfield 按位解析常量列 */
  bitfield: (n: number): ParsingMethod[] => column("bitfield", n),
  reserved: (n: number): string[] => column("预留", n),
  backslash: (n: number): string[] => column("/", n),
  1: (n: number): number[] => column(1, n),
  65535: (n: number): number[] => column(65535, n)
};

// ---------- 点表 ----------

/** system_summary 数据类型列：长度 144，各段定义按协议（字段无规律） */
const params_irregular_props = {
  system_summary: {
    data_name: [
      ...names_system_summary("单体电压"),
      ...names_system_summary("单体温度"),
      ...names_system_summary("BMU电压"),
      ...names_system_summary("BMU电路板温度"),
      ...names_system_summary("单体SOC"),
      ...names_system_summary("单体SOH"),
      ...names_system_summary("动力接插件温度"),
      ...names_system_summary("AFE铜排温度"),
      ...SHARE.reserved(16)
    ],
    data_type: [
      ...SHARE.uint16(16),
      ...Array.from<number, DataType>({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "int16";
        if (index == 12 || index == 13) return "int16";
        else return "uint16";
      }),
      ...SHARE.uint16(16),
      ...Array.from<number, DataType>({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "int16";
        if (index == 12 || index == 13) return "int16";
        else return "uint16";
      }),
      ...SHARE.uint16(32),
      ...Array.from<number, DataType>({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "int16";
        if (index == 12 || index == 13) return "int16";
        else return "uint16";
      }),
      ...Array.from<number, DataType>({ length: 16 }, (_, index) => {
        if (index % 2 == 0 && index <= 11) return "int16";
        if (index == 12 || index == 13) return "int16";
        else return "uint16";
      }),
      ...SHARE.uint16(16)
    ],
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
      }),
      ...SHARE.zero(16)
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
      }),
      ...SHARE[65535](16)
    ],
    data_res: [
      ...SHARE[1](16),
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
      }),
      ...SHARE[1](16)
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
      }),
      ...SHARE.backslash(16)
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
      "簇端最大允许充电功率",
      "簇端最大允许放电功率",
      "簇端最大允许放电功率",
      "单次充电电量",
      "单次充电电量",
      "单次放电电量",
      "单次放电电量",
      "单次充电容量",
      "单次充电容量",
      "单次放电容量",
      "单次放电容量",
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
      "周期任务堆栈大小",
      "系统堆栈空间",
      "系统堆栈空间",
      "系统堆栈最小空间",
      "系统堆栈最小空间",
      "可配置默认参数剩余次数",
      "预留",
      "预留",
      "预留",
      ...SHARE.column("BCU产品编码", 7),
      ...SHARE.column("BCU硬件版本号", 7),
      ...SHARE.column("BCU软件版本号", 7),
      ...SHARE.column("BCU-BOOT版本号", 7),
      ...SHARE.column("BCU-BAU协议版本号", 7),
      ...SHARE.column("BCU-BMU协议版本号", 7),
      ...SHARE.column("BCU事件记录版本号", 7),
      ...SHARE.column("BCU-sox算法版本号", 7),
      ...SHARE.column("可配置默认参数版本号", 7),
      ...SHARE.reserved(131)
    ],
    data_type: [
      ...SHARE.uint16(10),
      ...SHARE.int16(5),
      ...SHARE.backslash(3),
      ...SHARE.uint16(1),
      ...SHARE.uint16(12),
      ...SHARE.uint32(12),
      ...SHARE.uint16(2),
      ...SHARE.int16(2),
      ...SHARE.uint16(5),
      ...SHARE.uint16(1),
      ...SHARE.uint32(6),
      ...SHARE.uint16(4),
      ...SHARE.ASCII(63),
      ...SHARE.uint16(131)
    ]
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
    data_offset: SHARE.zero(ADDR_NUM_MAP.system_summary),
    data_unit: params_irregular_props.system_summary.data_unit,
    data_parsing: SHARE.linear(ADDR_NUM_MAP.system_summary)
  }
};

// ---------- 类定义 ----------

const classes_filedsMap: Record<ClassType, ClassTable> = {
  cell_vltg: {
    class: "cell_vltg",
    isClusterParm: true,
    isBlockParm: false,
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
    data_parsing: "linear",
    data_props: params_propMap.cell_vltg
  },
  cell_temp: {
    class: "cell_temp",
    isClusterParm: true,
    isBlockParm: false,
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
    data_parsing: "linear",
    data_props: params_propMap.cell_temp
  },
  cell_soc: {
    class: "cell_soc",
    isClusterParm: true,
    isBlockParm: false,
    addr_start: 0x2000,
    addr_num: ADDR_NUM_MAP.cell,
    data_invalid_value: "0x7FFF",
    data_type: "uint16",
    data_min: 0,
    data_max: 100,
    data_res: 0.1,
    data_offset: 0,
    data_unit: "%",
    data_parsing: "linear",
    data_props: params_propMap.cell_soc
  },
  cell_soh: {
    class: "cell_soh",
    isClusterParm: true,
    isBlockParm: false,
    addr_start: 0x3000,
    addr_num: ADDR_NUM_MAP.cell,
    data_invalid_value: "0x7FFF",
    data_type: "uint16",
    data_min: 0,
    data_max: 100,
    data_res: 0.1,
    data_offset: 0,
    data_unit: "%",
    data_parsing: "linear",
    data_props: params_propMap.cell_soh
  },
  system_summary: {
    class: "system_summary",
    isClusterParm: true,
    isBlockParm: false,
    addr_start: 0x4000,
    addr_num: ADDR_NUM_MAP.system_summary,
    data_invalid_value: "0x7FFF",
    data_props: params_propMap.system_summary
  }
};

// ---------- 开发期校验 ----------

const POINT_COLUMNS: (keyof PointTable)[] = [
  "id",
  "data_name",
  "data_type",
  "data_min",
  "data_max",
  "data_res",
  "data_offset",
  "data_unit",
  "data_parsing",
  "reg_count",
  "bit_offset",
  "bit_length"
];
const class_which_data_propsInside = [
  "cell_vltg",
  "cell_temp",
  "cell_soc",
  "cell_soh"
];
/** 校验各列长度必须与 addr_num 一致，防止列错位 */
function assertColumnLength(): void {
  for (const [name, cls] of Object.entries(classes_filedsMap)) {
    for (const col of POINT_COLUMNS) {
      const arr = cls.data_props[col];
      if (arr !== undefined && arr.length !== cls.addr_num) {
        throw new Error(
          `[点表] ${name}.${col} 长度(${arr.length})与 addr_num(${cls.addr_num}) 不一致`
        );
      }
    }
  }
}
function build_data(data: number[], cls: ClassTable) {
  // if (data.length !== cls.addr_num) {
  //   throw new Error(`[点表] 数据长度(${data.length})与 addr_num(${cls.addr_num}) 不一致`);
  // }
  let data_build: Build_data[];
  if (class_which_data_propsInside.includes(cls.class)) {
    data_build = data.map((item, index) => {
      return {
        id: index + 1,
        data_name: cls.data_props.data_name[index],
        data_value: item
      };
    });
  } else
    data_build = data.map((item, index) => {
      return {
        id: index + 1,
        data_name: cls.data_props.data_name[index],
        data_value: item,
        data_type: cls.data_props.data_type?.[index],
        data_min: cls.data_props.data_min?.[index],
        data_max: cls.data_props.data_max?.[index],
        data_res: cls.data_props.data_res?.[index],
        data_unit: cls.data_props.data_unit?.[index],
        data_parsing: cls.data_props.data_parsing?.[index]
      };
    });
  return data_build;
}
export {
  assertColumnLength,
  classes_filedsMap,
  DATA_TYPE_REG_COUNT,
  class_which_data_propsInside,
  build_data
};
export type { DataType, ParsingMethod, PointTable, ClassTable, ClassType };
