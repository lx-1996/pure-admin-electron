import type * as table from "./tableGenerate";
interface FieldsForParse {
  data_type: table.DataType;
  data_parsing_method?: table.ParsingMethod;
  data_res: number;
  data_offset: number;
  bit_config?: table.BitConfig;
}
function parse_linear_uint16(data: number, fields: FieldsForParse) {
  const { data_type, data_res, data_offset } = fields;
  let value = data;
  if (data_type === "int16") {
    value = data & 0x8000 ? data - 0x10000 : data;
  }
  return value * data_res + data_offset;
}
function parse_linear_uint32(data: any | [number, number], fields: any) {
  const [low, high] = data;

  const value = high * 0x10000 + low;

  return value * fields.data_res + fields.data_offset;
}
function parse_raw_data(build_data: table.Build_data[]) {
  return build_data.map((item: any) => {
    const {
      data_type,
      data_parsing_method,
      data_res,
      data_offset,
      data_value
    } = item;
    if (
      data_type == "uint16" ||
      (data_type == "int16" && data_parsing_method == "linear")
    ) {
      const parsed_data = parse_linear_uint16(data_value, {
        data_type,
        data_res,
        data_offset
      });
      return { ...item, value: parsed_data };
    }
    if (data_type == "uint32" && data_parsing_method == "linear") {
      if (!Array.isArray(data_value)) {
        console.log("非数组", data_value);
        return;
      }
      const parsed_data = parse_linear_uint32(data_value, {
        data_res,
        data_offset
      });
      return { ...item, value: parsed_data };
    } else return item;
  });
}
export { parse_raw_data };
