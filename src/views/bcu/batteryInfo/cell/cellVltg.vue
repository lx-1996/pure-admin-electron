<script setup lang="ts">
import { ref } from "vue";
import { useColumns } from "./getCellData";
import SysDataChild from "../system_summary/index.vue";
defineOptions({
  name: "Welcome"
});
const tableRef = ref();
const { loading, columns, dataSelectedIp, loadingConfig } =
  useColumns("cell_vltg");
</script>

<template>
  <div>
    <SysDataChild dataClass="单体电压" />
    <pure-table
      ref="tableRef"
      border
      row-key="id"
      alignWhole="center"
      showOverflowTooltip
      :loading="loading"
      :loading-config="loadingConfig"
      :data="dataSelectedIp.data"
      :columns="columns"
      height="100%"
    />
  </div>
</template>
