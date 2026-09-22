import { ref, computed, toValue, type MaybeRefOrGetter } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
import { useIpcListener } from "@/utils/useIpcListener";
interface Item {
  id: number;
  data_name: string;
  data_address: number;
  data_type: string;
  data_res: number;
  data_offset: number;
  data_word_length: number;
  data_unit: string;
  data_isHiden: boolean;
  data_class: string;
  data_parsed: string;
  // 新增字段
  data_parsed_withIndex?: string;
}

function transformData(arr: Item[], dataClass: string): Item[] {
  // 1. 构建“值名称 -> 对应的编号值”的映射
  const valueMap = new Map<string, string>();

  // 遍历第一遍：收集编号对象的 data_parsed
  for (const item of arr) {
    const name = item.data_name;
    // 匹配“单体SOH_第N大值编号”或“单体SOH_第N小值编号”
    if (name.includes("编号")) {
      // 提取基础名称：去掉“编号”二字
      const baseName = name.replace("编号", "");
      valueMap.set(baseName, item.data_parsed);
    }
  }

  // 2. 遍历第二遍：生成新数组
  return arr.map(item => {
    const newItem = { ...item }; // 浅拷贝原对象
    const name = item.data_name;

    // 如果是“平均值”或“极差值”，直接复制 data_parsed
    if (name === `${dataClass}_平均值` || name === `${dataClass}_极差值`) {
      newItem.data_parsed_withIndex = item.data_parsed;
      return newItem;
    }

    // 如果是“第N大值”或“第N小值”（不包含“编号”），尝试拼接
    // 匹配：以“单体SOH_”开头，包含“大值”或“小值”，且不包含“编号”
    if (
      (name.includes("大值") || name.includes("小值")) &&
      !name.includes("编号")
    ) {
      // 查找对应的编号值
      const indexValue = valueMap.get(name);
      if (indexValue !== undefined) {
        newItem.data_parsed_withIndex = `${item.data_parsed} #${indexValue}`;
      } else {
        // 如果没有找到对应的编号（容错），可设置为仅值本身
        newItem.data_parsed_withIndex = item.data_parsed;
      }
      return newItem;
    }
    // 其他情况（例如“编号”对象本身或无关项）不添加新属性
    return newItem;
  });
}
export function useSysData(dataClass: MaybeRefOrGetter<string>) {
  const dataAllIps = ref<Map<string, Array<any>>>(new Map());
  const bcuConnectStore = useBcuConnectStoreHook();
  const dataSelectedIp = computed<Array<any>>(() => {
    const cls = toValue(dataClass); // 关键：在 computed 内部取值，保证响应式
    const list = dataAllIps.value.get(bcuConnectStore.selectIp);
    if (!list) return [];
    const arr = list.filter(item => item.data_class == cls);
    const arr1 = transformData(arr, cls).filter(
      item => item.data_parsed_withIndex
    );
    return arr1;
  });
  function onData(_event: any, dataFromMain: any) {
    // console.log(dataFromMain);
    const { ip, data } = dataFromMain;
    dataAllIps.value.set(ip, data);
  }
  useIpcListener("system_summary", onData);
  return { dataAllIps, dataSelectedIp };
}
