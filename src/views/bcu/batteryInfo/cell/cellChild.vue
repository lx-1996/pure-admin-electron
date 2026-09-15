<script setup lang="ts">
import { ref } from "vue";
import { useColumns } from "./getCellData";
import SysDataChild from "../system_summary/index.vue";
defineOptions({
  name: "Welcome"
});
const props = defineProps({
  cellDataClass: {
    type: String,
    default: "cell_vltg"
  },
  sysDataClass: {
    type: String,
    default: "单体电压"
  }
});
const tableRef = ref();
const { columns, dataSelectedIp } = useColumns(props.cellDataClass);
</script>

<template>
  <div class="flex flex-col gap-1">
    <SysDataChild :dataClass="props.sysDataClass" />
    <pure-table
      ref="tableRef"
      border
      row-key="id"
      alignWhole="center"
      showOverflowTooltip
      :data="dataSelectedIp.data"
      :columns="columns"
      height="100%"
    />
  </div>
</template>
