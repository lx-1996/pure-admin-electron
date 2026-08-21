import type * as table from "./tableGenerate";
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
function parse_ascii(data: number | number[]) {
  const regs = Array.isArray(data) ? data : data !== undefined ? [data] : [];
  const result: string[] = [];

  // 遍历每个寄存器的十进制数
  regs.forEach(reg => {
    if (reg === 0) {
      result.push("0"); // 用 0 替换
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
  function isValidAscii(code: number) {
    return code >= 32 && code <= 126;
  }
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
) {
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
          bit_name: item?.bit_name,
          bit_value: item_bit_value
        };
      }
      case "bit_mapping": {
        return {
          bit_name: item?.bit_name,
          bit_value: item?.bit_mapping?.[item_bit_value] ?? null
        };
      }
      case "reg_value": {
        return {
          bit_name: item?.bit_name,
          bit_value: reg_value
        };
      }
      case "reg_value_hex": {
        return {
          bit_name: item?.bit_name,
          bit_value: parse_hex_registers(
            data,
            item.reg_idx,
            item.reg_length ?? 1
          )
        };
      }
      case "reg_value_ascii": {
        return {
          bit_name: item?.bit_name,
          bit_value: parse_ascii(
            Array.isArray(data)
              ? data.slice(item.reg_idx, item.reg_idx + (item.reg_length ?? 1))
              : [data]
          )
        };
      }
      case "reg_mapping": {
        return {
          bit_name: item?.bit_name,
          bit_value: item?.bit_mapping?.[item_value] ?? null
        };
      }
      default: {
        return {
          bit_name: item?.bit_name,
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
  } else if (
    data_type == "uint16_regs" ||
    (data_type == "int16_regs" && data_bit_config?.length)
  ) {
    return "isuint16_regs";
  }
}
function parse_raw_data(build_data: table.Build_data[]) {
  //console.log(build_data)
  try {
    return build_data.map(item => {
      const { data_type, data_res, data_offset, data_value, data_bit_config } =
        item;
      switch (judge_data_type(data_type, data_bit_config)) {
        case "isUint16": {
          const data_parsed = parse_linear_uint16(
            Array.isArray(data_value) ? (data_value[0] ?? 0) : data_value,
            {
              data_type,
              data_res,
              data_offset
            }
          );
          return { ...item, data_parsed };
        }
        case "isUint32": {
          const data_parsed = parse_linear_uint32(
            Array.isArray(data_value) ? data_value : [data_value],
            {
              data_res,
              data_offset
            }
          );
          return { ...item, data_parsed };
        }
        case "isASCII": {
          const data_parsed = parse_ascii(data_value);
          return { ...item, data_parsed };
        }
        case "isBitfield": {
          // judge_data_type 已保证 data_bit_config 非空，此处防御性再判
          const data_parsed = data_bit_config?.length
            ? parse_bitfield_value(data_value, data_bit_config, {
                data_type,
                data_res,
                data_offset
              })
            : undefined;
          return { ...item, data_parsed };
        }
        default: {
          return { ...item, data_parsed: item.data_value };
        }
      }
    });
  } catch (e) {
    console.log(e);
  }
}
export { parse_raw_data };
