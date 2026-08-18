import type * as table from "./tableGenerate";
interface FieldsForParse {
  data_type: table.DataType;
  data_res: table.RES;
  data_offset: number;
  data_bit_config?: table.BitConfig[];
  data_word_length?: number;
}
function get_decimal_places(res: table.RES) {
  switch (res) {
    case 1:
      return 0;
    case 0.1:
      return 1;
    case 0.01:
      return 2;
    case 0.001:
      return 3;
  }
}
function parse_linear_uint16(data: number, fields: FieldsForParse) {
  const { data_type, data_res, data_offset } = fields;
  let value = data;
  if (data_type === "int16") {
    value = data & 0x8000 ? data - 0x10000 : data;
  }
  const decimal_places = get_decimal_places(data_res);
  return (value * data_res + data_offset).toFixed(decimal_places);
}
function parse_linear_uint32(data: any, fields: any) {
  const [low, high] = data;
  const { data_res, data_offset } = fields;
  const value = high * 0x10000 + low;
  const decimal_places = get_decimal_places(data_res);
  return (value * data_res + data_offset).toFixed(decimal_places);
}
function parse_ascii_ascii(data: number[]) {
  if (!Array.isArray(data)) {
    data = data !== undefined ? [data] : [];
  }
  const result: any = [];

  // 遍历每个寄存器的十进制数
  data.forEach(reg => {
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
  function isValidAscii(code: any) {
    return code >= 32 && code <= 126;
  }
  // 返回组合后的字符串
  return result.join("");
}
function parse_bitfield(
  data: number[] | number,
  data_bit_config: table.BitConfig[]
) {
  // let parsed_data: number[]
  // console.log('data', data)
  const res = data_bit_config?.map(item => {
    const item_value = Array.isArray(data) ? data[item.reg_idx] : data;
    //console.log('item_value', item_value)
    const mask = (1 << item.bit_length) - 1;
    //console.log('mask', mask)
    const item_bit_value = (item_value >> item.bit_offset) & mask;
    return {
      bit_name: item?.bit_name,
      bit_value: item.bit_mapping[item_bit_value]
    };
  });
  return res.map(item => item.bit_value).join(",");
}
function judge_data_type(
  data_type: table.DataType,
  data_bit_config: table.BitConfig[]
) {
  if (data_type == "uint16" || data_type == "int16") {
    return "isUint16";
  } else if (data_type == "uint32") {
    return "isUint32";
  } else if (data_type == "ascii") {
    return "isASCII";
  } else if (data_type == "bitfield" && data_bit_config?.length > 0) {
    return "isBitfield";
  }
}
function parse_raw_data(build_data: table.Build_data[]) {
  //console.log(build_data)
  try {
    return build_data.map((item: any) => {
      const { data_type, data_res, data_offset, data_value, data_bit_config } =
        item;
      switch (judge_data_type(data_type, data_bit_config)) {
        case "isUint16": {
          const data_parsed = parse_linear_uint16(data_value, {
            data_type,
            data_res,
            data_offset
          });
          return { ...item, data_parsed };
        }
        case "isUint32": {
          const data_parsed = parse_linear_uint32(data_value, {
            data_res,
            data_offset
          });
          return { ...item, data_parsed };
        }
        case "isASCII": {
          const data_parsed = parse_ascii_ascii(data_value);
          return { ...item, data_parsed };
        }
        case "isBitfield": {
          //console.log(data_bit_config)
          const data_parsed = parse_bitfield(data_value, data_bit_config);
          return { ...item, data_parsed: data_parsed };
        }
        default: {
          return { ...item, data_parsed: item?.data_value };
        }
      }
    });
  } catch (e) {
    console.log(e);
  }
}
// console.log(parse_bitfield(3, [
//   {
//     reg_idx: 1,
//     bit_offset: 0,
//     bit_length: 16,
//     bit_mapping: { '0': '静置', '1': '充电', '2': '放电', '3': '开路', '4': '接触器自检' }
//   }
// ]))
export { parse_raw_data };
