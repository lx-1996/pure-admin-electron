<template>
  <div>
    <PureDescriptions
      :columns="columns"
      :column="10"
      :data="data"
      border
      direction="vertical"
      title="基本信息"
      size="small"
      align="left"
    >
      <template #extra>
        <el-button type="text">查看详情</el-button>
        <el-button type="text">编辑</el-button>
      </template>
    </PureDescriptions>
    <Test1 value="hello" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { DescriptionsColumns } from "@pureadmin/descriptions";
import Test1 from "./test";
// 库导出的 DescriptionsColumns 继承了 element-plus 内部注入类型（span/width 等全为必填），
// 此处包装为"label 必填、其余可选"的列配置类型
type DescriptionsColumn = Pick<DescriptionsColumns, "label"> &
  Partial<Omit<DescriptionsColumns, "label">>;

const columns = ref<DescriptionsColumn[]>([
  { label: "姓名", prop: "name", width: 100, copy: true },
  { label: "年龄", prop: "age" }, // 支持 element-plus DescriptionsItem 的属性
  { label: "地址", prop: "address" }
]);

// data 为记录数组（组件内部对 data 做 unref(data).map，每项按 prop 取值；默认展示第一条记录）
const data = ref([
  { name: "张三", age: 18, address: "北京市朝阳区" },
  { name: "李四", age: 25, address: "上海市浦东新区" },
  { name: "王五", age: 32, address: "广州市天河区" }
]);
</script>

<style lang="less" scoped></style>
