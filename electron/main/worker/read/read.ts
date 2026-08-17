import type { ModbusTCPClient } from "../client/clientClass";
import { classes_fieldsMap, build_data } from "../dataPoint/tableGenerate";
import type { ClassType } from "../dataPoint/tableGenerate";
import type { WorkerDataMessage } from "../types/worker";
import { parse_raw_data } from "../dataPoint/parse";
const READ_PARAMS = {
  MAX_READ_NUM: 125,
  READ_INTERVAL: 1000
};
async function repeatRead(
  client: ModbusTCPClient,
  add_start: number,
  add_num_total: number,
  isInput: boolean
) {
  let remain_num = add_num_total;
  let remain_start = add_start;
  const res = [];
  while (remain_num > 0) {
    const addNum_read = Math.min(remain_num, READ_PARAMS.MAX_READ_NUM);
    const res_temp = isInput
      ? await client.client.readInputRegisters(remain_start, addNum_read)
      : await client.client.readHoldingRegisters(remain_start, addNum_read);
    res.push(...res_temp.data);
    remain_num -= READ_PARAMS.MAX_READ_NUM;
    remain_start = remain_start + READ_PARAMS.MAX_READ_NUM;
  }
  return res;
}
export async function readData(
  client: ModbusTCPClient,
  data_class: ClassType,
  add_num_config?: number
) {
  const filedsMap = classes_fieldsMap[data_class];
  const addr_num = add_num_config ? add_num_config : filedsMap.addr_num;
  try {
    const read_data = await repeatRead(
      client,
      filedsMap.addr_start,
      addr_num,
      true
    );
    const data_build = build_data(read_data, filedsMap);
    const data_parsed = parse_raw_data(data_build);
    //console.log(data_build);
    const message: WorkerDataMessage = {
      type: data_class,
      data: data_parsed
    };
    process.send?.(message);
  } catch (e) {
    console.error(e);
  }
}
