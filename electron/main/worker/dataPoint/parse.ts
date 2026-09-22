import type * as table from "../types/dataPoint";
// import { writeLog } from "../logger";
interface FieldsForParse {
  data_type?: table.DataType;
  data_res?: table.RES;
  data_offset?: number;
  data_bit_config?: table.BitConfig[] | null;
  data_word_length?: number;
}
function get_decimal_places(res: table.RES | undefined): number {
  switch (res) {
    case 0.1:
      return 1;
    case 0.01:
      return 2;
    case 0.001:
    case 0.00098:
      return 3;
    default:
      return 0; // 含 res=1 与 undefined
  }
}
function parse_linear_uint16(data: number, fields: FieldsForParse) {
  const { data_type, data_res = 1, data_offset = 0 } = fields;
  let value = data;
  if (data_type === "int16") {
    value = data & 0x8000 ? data - 0x10000 : data;
  }
  const decimal_places = get_decimal_places(data_res);
  return (value * data_res + data_offset).toFixed(decimal_places);
}
function parse_linear_uint32(data: number[], fields: FieldsForParse) {
  const [low = 0, high = 0] = data;
  const { data_res = 1, data_offset = 0 } = fields;
  const value = high * 0x10000 + low;
  const decimal_places = get_decimal_places(data_res);
  return (value * data_res + data_offset).toFixed(decimal_places);
}
/** ASCII 可打印字符校验（32~126），不可打印字符以空格占位 */
function isValidAscii(code: number) {
  return code >= 32 && code <= 126;
}
function parse_ascii(data: number | number[]) {
  const regs = Array.isArray(data) ? data : data !== undefined ? [data] : [];
  const result: string[] = [];

  // 遍历每个寄存器的十进制数
  regs.forEach(reg => {
    if (reg === 0) {
      result.push("00"); // 补零对齐：每个寄存器固定输出 2 字符，避免与正常寄存器混排时长度错位
      return;
    }
    // 🔥 新增：确保处理的是16位数字
    if (typeof reg !== "number" || reg < 0 || reg > 0xffff) {
      //console.error('无效寄存器值:', reg)
      return;
    }
    // 将十进制数转换为16位二进制
    const binaryStr = reg.toString(2).padStart(16, "0"); // 转为16位二进制

    // 提取高字节和低字节
    const highByte = binaryStr.slice(0, 8); // 高字节
    const lowByte = binaryStr.slice(8, 16); // 低字节

    // 交换高字节和低字节
    const swappedBinaryStr = lowByte + highByte;
    // 转换为对应的ASCII字符
    const firstCharCode = parseInt(swappedBinaryStr.slice(0, 8), 2);
    const secondCharCode = parseInt(swappedBinaryStr.slice(8, 16), 2); // 检查字符是否有效，如果不是有效的 ASCII 字符，替换为 '0'
    result.push(
      isValidAscii(firstCharCode) ? String.fromCharCode(firstCharCode) : " ",
      isValidAscii(secondCharCode) ? String.fromCharCode(secondCharCode) : " "
    );
  });
  // 返回组合后的字符串
  return result.join("");
}
function parse_hex_registers(
  data: number[] | number,
  reg_idx: number,
  reg_length: number
) {
  const registers = Array.isArray(data)
    ? data.slice(reg_idx, reg_idx + reg_length)
    : [data];
  return registers
    .map(value => (value ?? 0).toString(16).padStart(4, "0"))
    .join("")
    .toUpperCase();
}
function parse_bitfield_value(
  data: number[] | number,
  data_bit_config: table.BitConfig[],
  fields: FieldsForParse
): table.BitParsedItem[] {
  // console.log('data', data)
  // console.log('data_bit_config', data_bit_config)
  const { data_res = 1, data_offset = 0 } = fields;
  const decimal_places = get_decimal_places(data_res);
  const res = data_bit_config?.map(item => {
    let item_value = Array.isArray(data)
      ? (data[item.reg_idx] ?? 0)
      : (data ?? 0);
    let reg_value: number | string = item_value;
    //console.log('item_value', item_value)
    const mask = 2 ** item.bit_length! - 1;
    //console.log('mask', mask)
    const item_bit_value = (item_value >> item.bit_offset!) & mask;
    if (item.reg_type) {
      if (item.reg_type === "int16") {
        item_value = item_value & 0x8000 ? item_value - 0x10000 : item_value;
      }
      reg_value = (item_value * data_res + data_offset).toFixed(decimal_places);
    }
    switch (item.bit_value_type) {
      case "bit_value": {
        return {
          ...item,
          bit_raw: item_bit_value,
          bit_value: item_bit_value
        };
      }
      case "bit_mapping": {
        return {
          ...item,
          bit_raw: item_bit_value,
          bit_value: item?.bit_mapping?.[item_bit_value] ?? null
        };
      }
      case "reg_value": {
        return {
          ...item,
          bit_raw: item_bit_value,
          bit_value: reg_value
        };
      }
      case "reg_value_hex": {
        return {
          ...item,
          bit_raw: item_bit_value,
          bit_value: parse_hex_registers(
            data,
            item.reg_idx,
            item.reg_length ?? 1
          )
        };
      }
      case "reg_value_ascii": {
        return {
          ...item,
          bit_raw: item_bit_value,
          bit_value: parse_ascii(
            Array.isArray(data)
              ? data.slice(item.reg_idx, item.reg_idx + (item.reg_length ?? 1))
              : [data]
          )
        };
      }
      case "reg_mapping": {
        return {
          ...item,
          bit_raw: item_bit_value,
          bit_value: item?.bit_mapping?.[item_value] ?? null
        };
      }
      default: {
        return {
          ...item,
          bit_raw: item_bit_value,
          bit_value: item_bit_value
        };
      }
    }
  });
  return res;
}
function judge_data_type(
  data_type: table.DataType | undefined,
  data_bit_config: table.BitConfig[] | null | undefined
) {
  if (data_type == "uint16" || data_type == "int16") {
    return "isUint16";
  } else if (data_type == "uint32") {
    return "isUint32";
  } else if (data_type == "ascii") {
    return "isASCII";
  } else if (data_type == "bitfield" && data_bit_config?.length) {
    return "isBitfield";
  }
  // 其余类型（hex/float/未配置 data_type 等）返回 undefined，
  // 由 parse_raw_data 的 default 分支原样返回 data_value
}
function parse_raw_data(build_data: table.Build_data[]) {
  // 解析失败直接上抛，由调用方（readData）的 try/catch 统一记录错误，
  // 避免静默吞错后向渲染进程发送 undefined 数据
  let parsed_data = [];
  parsed_data = build_data.map(item => {
    const { data_value, data_bit_config, ...rest } = item;
    switch (judge_data_type(rest.data_type, data_bit_config)) {
      case "isUint16": {
        const data_parsed = parse_linear_uint16(
          Array.isArray(data_value) ? (data_value[0] ?? 0) : data_value,
          {
            data_type: rest.data_type,
            data_res: rest.data_res,
            data_offset: rest.data_offset
          }
        );
        return { ...rest, data_parsed };
      }
      case "isUint32": {
        const data_parsed = parse_linear_uint32(
          Array.isArray(data_value) ? data_value : [data_value],
          {
            data_res: rest.data_res,
            data_offset: rest.data_offset
          }
        );
        return { ...rest, data_parsed };
      }
      case "isASCII": {
        const data_parsed = parse_ascii(data_value);
        return { ...rest, data_parsed };
      }
      case "isBitfield": {
        // judge_data_type 已保证 data_bit_config 非空，此处防御性再判
        const data_parsed = data_bit_config?.length
          ? parse_bitfield_value(data_value, data_bit_config, {
              data_type: rest.data_type,
              data_res: rest.data_res,
              data_offset: rest.data_offset
            })
          : [];
        return { ...rest, data_parsed };
      }
      default: {
        return { ...rest, data_parsed: data_value };
      }
    }
  });
  return parsed_data;
}
import type { ThisClientBMUConfigData } from "../client/clientClass";
function getCellData(
  bmu_config: ThisClientBMUConfigData,
  data: table.Parsed_data[],
  isTemp: boolean
) {
  const {
    cell_config_perAFE,
    temp_config_perAFE,
    total_cell_perBMU,
    total_temp_perBMU,
    bmu_total,
    afe_perBMU
  } = bmu_config;
  const cellIdx = data.map(item => item?.id);
  const sensor_config_perAFE = isTemp ? temp_config_perAFE : cell_config_perAFE;
  const total_sensor_perBMU = isTemp ? total_temp_perBMU : total_cell_perBMU;
  const bmuIndex: Array<number> = [];
  const afeIndex: Array<number> = [];
  const sensorIndexInBMUs: Array<number> = [];
  const sensorIndexInBMU: Array<number> = [];
  const sensorIndexInAFE: Array<number> = [];
  cellIdx.forEach(item => {
    sensorIndexInBMUs.push(item);
    bmuIndex.push(Math.trunc((item - 1) / total_sensor_perBMU) + 1);
    sensorIndexInBMU.push(((item - 1) % total_sensor_perBMU) + 1);
    for (let i = 0; i < afe_perBMU; i++) {
      const sumStart = sensor_config_perAFE
        .slice(0, i)
        .reduce((acc, val) => acc + val, 0);
      const sumEnd =
        sensor_config_perAFE
          .slice(0, i + 1)
          .reduce((acc, val) => acc + val, 0) - 1;
      if (
        (item - 1) % total_sensor_perBMU >= sumStart &&
        (item - 1) % total_sensor_perBMU <= sumEnd
      ) {
        afeIndex.push(i + 1);
        break;
      }
    }
  });
  for (let i = 0; i < bmu_total; i++) {
    const sensorIndexInAFEEachBMU = [];
    for (let j = 0; j < afe_perBMU; j++) {
      sensorIndexInAFEEachBMU.push(
        ...Array.from(
          { length: sensor_config_perAFE[j] },
          (_, index) => index + 1
        )
      );
    }
    sensorIndexInAFE.push(...sensorIndexInAFEEachBMU);
  }
  const parsedData = data.map((item, index) => {
    return {
      ...item,
      bmuIndex: bmuIndex[index],
      afeIndex: afeIndex[index],
      sensorIndexInBMUs: sensorIndexInBMUs[index],
      sensorIndexInBMU: sensorIndexInBMU[index],
      sensorIndexInAFE: sensorIndexInAFE[index],
      indexLabel: isTemp
        ? `temp-${sensorIndexInBMU[index]}`
        : `cell-${sensorIndexInBMU[index]}`,
      bmuAFEIndex: `${bmuIndex[index]}-${afeIndex[index]}`,
      valueWithIdx: `${item.data_parsed} #${sensorIndexInBMUs[index]}`
    };
  });
  const parsedDataForRenderer = [
    ...new Set(parsedData.map(item => item.bmuAFEIndex))
  ].map(item => {
    return {
      ...{ bmuAFEIndex: item },
      ...Object.assign(
        {},
        parsedData
          .filter(item1 => item1.bmuAFEIndex === item)
          .map(item => item.valueWithIdx)
      )
    };
  });
  const dataForSend = {
    data: parsedDataForRenderer,
    maxCellsPerAFE: Math.max(...sensor_config_perAFE),
    time: Date.now()
  };
  //writeLog("vlgt", data1);
  //console.log(parsedData);
  return dataForSend;
  /* 
  遍历所有cellIdx,索引
[0,10],属于afe1,11,[slice(0,0).reduce,slice(0,1).reduce-1]  [0,10] 0
[11,22]属于afe2,12,[slice(0,1).reduce,slice(0,2).reduce-1]  [0,11] 1
[23,35]属于afe3,13,[slice(0,2).reduce,slice(0,3).reduce-1]  [0,12] 2
[36,49]属于afe4,14,[slice(0,3).reduce,slice(0,4).reduce-1]  [0,13] 3
[50,60]属于afe1,
[61,72]属于afe2,
[73,85]属于afe3,
[86,99]属于afe4,
  */
}
function getPackData(
  bmu_config: ThisClientBMUConfigData,
  data: table.Parsed_data[]
) {
  const { bmu_total, afe_perBMU } = bmu_config;
  return data.map(item => {
    switch (item.data_name) {
      case "单向菊花链断连位置":
      case "BMU版本号":
      case "动力接插件温度": {
        if (item.data_parsed && Array.isArray(item.data_parsed)) {
          return {
            ...item,
            data_parsed: item.data_parsed.slice(0, bmu_total * 2)
          };
        }
      }
      case "BMU电压":
      case "BMU电路板温度":
      case "BMU-SOC":
      case "BMU产品编码":
      case "BMU重启标志": {
        if (item.data_parsed && Array.isArray(item.data_parsed)) {
          return {
            ...item,
            data_parsed: item.data_parsed.slice(0, bmu_total)
          };
        }
      }
      case "铜排温度": {
        if (item.data_parsed && Array.isArray(item.data_parsed)) {
          return {
            ...item,
            data_parsed: item.data_parsed.slice(0, afe_perBMU * bmu_total)
          };
        }
      }
      default:
        return { ...item };
    }
  });
}
// function getSysData(data: table.Parsed_data[]) {}
export {
  parse_raw_data,
  getCellData,
  getPackData
  //getSysData
};
