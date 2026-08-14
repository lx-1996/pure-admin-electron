import type { ModbusTCPClient } from "../worker";
const READ_PARAMS = {
  MAX_READ_NUM: 125,
  READ_INTERVAL: 1000
};
export async function readData_cell(client: ModbusTCPClient) {
  if (client.clientProps.client_status !== "connected") {
    console.log("TCP客户端未连接，读取数据终止");
    return;
  }
  try {
    const result = await client.client.readInputRegisters(0, 10);
    //console.log(result);
    const message: WorkerDataMessage = {
      type: "data",
      data: result?.data
    };
    process.send?.(message);
  } catch (e) {
    console.error(e);
  }
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function repeatRead(
  client: ModbusTCPClient,
  add_start: string,
  add_num: number,
  isInput: boolean
) {
  let remain_num = add_num;
  let remain_start = add_start;
  const res = [];
  while (remain_num > 0) {
    const res_temp = isInput
      ? await client.client.readInputRegisters(
          parseInt(remain_start, 16),
          remain_num
        )
      : await client.client.readHoldingRegisters(
          parseInt(remain_start, 16),
          remain_num
        );
    res.push(...res_temp.data);
    remain_num -= READ_PARAMS.MAX_READ_NUM;
    remain_start = (
      parseInt(remain_start, 16) + READ_PARAMS.MAX_READ_NUM
    ).toString(16);
  }
}
