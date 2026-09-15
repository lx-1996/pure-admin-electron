import type { ModbusTCPClient } from "../client/clientClass";
import { classes_fieldsMap, build_data } from "../dataPoint/tableGenerate";
import type { ClassType } from "../types/dataPoint";
import type { WorkerDataMessage } from "../types/worker";
import {
  parse_raw_data,
  getCellData,
  getPackData
  //getSysData
} from "../dataPoint/parse";
import { writeLog } from "../logger";
import type { ThisClientBMUConfigData } from "../client/clientClass";
const READ_PARAMS = {
  MAX_READ_NUM: 125,
  READ_INTERVAL: 1000
};
const CellClass = ["cell_vltg", "cell_temp", "cell_soc", "cell_soh"];
const PackClass = ["pack_summary"];

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
  bmu_config?: ThisClientBMUConfigData,
  isInput: boolean = true
) {
  const filedsMap = classes_fieldsMap[data_class];
  let addr_num;
  if (CellClass.includes(data_class) && bmu_config) {
    if (data_class == "cell_temp") addr_num = bmu_config.total_temp_num;
    else addr_num = bmu_config.total_cell_num;
  } else addr_num = filedsMap.addr_num;
  try {
    const read_data = await repeatRead(
      client,
      filedsMap.addr_start,
      addr_num,
      isInput
    );
    const data_build = build_data(read_data, filedsMap);
    const data_parsed = parse_raw_data(data_build);
    if (CellClass.includes(data_class) && bmu_config) {
      const isTemp = data_class === "cell_temp";
      const cellData = getCellData(bmu_config, data_parsed, isTemp);
      //writeLog("index", parsedData);
      //console.log("afeIndex", idxRes.afeIndex);
      // console.log("sensorIndexInAFE", idxRes.sensorIndexInAFE);
      const message: WorkerDataMessage = {
        type: data_class,
        data: cellData,
        ip: client.clientProps.host
      };
      process.send?.(message);
    } else if (PackClass.includes(data_class) && bmu_config) {
      const packData = getPackData(bmu_config, data_parsed);
      const message: WorkerDataMessage = {
        type: data_class,
        data: packData,
        ip: client.clientProps.host
      };
      process.send?.(message);
    }
    // else if (data_class === "system_summary") {
    //   const sysData = getSysData(data_parsed);
    // }
    // writeLog(data_class, data_parsed);
    else {
      const message: WorkerDataMessage = {
        type: data_class,
        data: data_parsed,
        ip: client.clientProps.host
      };
      process.send?.(message);
    }
  } catch (e) {
    const err = e instanceof Error ? { message: e.message, stack: e.stack } : e;
    writeLog(`${data_class}-error`, err);
    console.error(e);
    client.clientProps.connectStatus = "failRead";
  }
}
