/**
 * 点表数据模型类型定义（依据通讯协议定义）
 *
 * - 列式存储：每个属性为一列数组，同一点的不同属性通过索引对应
 * - data_min / data_max 为 raw 值范围
 * - id 为类内序号（从 1 开始）
 * - 常量列通过 SHARE 共享方法按需生成，相同 (value, n) 参数共享同一数组引用，降低内存占用
 * - system_summary.data_name 待补充
 */

/**参数类类型*/
export type ClassType =
  | "cell_vltg"
  | "cell_temp"
  | "cell_soc"
  | "cell_soh"
  | "system_summary"
  | "cluster_summary"
  | "pack_summary"
  | "pcs_data"
  | "cooler_data"
  | "dehumidifier_data"
  | "firefighting_data";
/** 寄存器数据类型 */
export type DataType =
  | "uint16"
  | "int16"
  | "uint32"
  | "float"
  | "ascii"
  | "bitfield"
  | "hex";

export interface DataTypeConfig {
  data_type: DataType;
  data_word_length: number;
}
export type UNITTYPE =
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
export type RES = 1 | 0.1 | 0.01 | 0.001;
export type BIT_VALUE_TYPE =
  | "bit_value"
  | "bit_mapping"
  | "reg_value"
  | "reg_mapping"
  | "reg_value_hex"
  | "reg_value_ascii";
export interface BitConfig {
  reg_idx: number;
  reg_length?: number;
  bit_offset?: number;
  bit_length?: number;
  bit_name?: string;
  bit_value?: boolean;
  bit_value_type?: BIT_VALUE_TYPE;
  reg_type?: "uint16" | "int16" | "uint32" | "float";
  bit_mapping?: Record<number, string>;
}
/** 单类点表（列式结构） */
export interface PointTable {
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
export interface ClassTable {
  class: string;
  /** 参数层级：cluster（簇级参数）/ stack（堆级参数），二者取其一 */
  parmLevel: "cluster" | "stack";
  /** data_type/data_min/data_max/data_res/data_offset/data_unit 是否为类级共用的单一值（true，无需每个参数独立配置）；false 表示这些字段在 data_props 中按参数独立配置 */
  isSharedProps: boolean;
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
export interface Build_data {
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
/** 不规则点表属性列：点表列式结构去掉 id/data_address 后的部分（系统/簇/包汇总类专用） */
export type Irregular_props = Omit<PointTable, "id" | "data_address">;

/**
 * 每类点表的静态构建模板：
 * 点表中除 data_value 外所有字段（id/name/address/type/res/offset/unit/bit_config）
 * 均为静态，只在首次构建时计算一次；slices 记录每个参数的寄存器切片位置。
 */
export interface BuildTemplate {
  /** 静态字段模板（data_value 为占位，轮询时原地覆写） */
  statics: Build_data[];
  /** 每个参数在原始寄存器数组中的切片位置 */
  slices: { start: number; length: number }[];
  /** 该类期望的寄存器总数（= addr_num） */
  regTotal: number;
  /** data_type/data_min/data_max/data_res/data_offset/data_unit 是否为类级共用的单一值（true，无需每个参数独立配置）；false 表示这些字段在 data_props 中按参数独立配置 */
  isSharedProps: boolean;
}
