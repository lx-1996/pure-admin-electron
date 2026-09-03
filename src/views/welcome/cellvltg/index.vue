<script setup lang="ts">
import { ref } from "vue";
import { useColumns } from "./column";
defineOptions({
  name: "Welcome"
});
const tableRef = ref();
const {
  loading,
  columns,
  data,
  pagination,
  loadingConfig,
  adaptiveConfig,
  onCurrentChange,
  onSizeChange
} = useColumns();
</script>

<template>
  <pure-table
    ref="tableRef"
    border
    adaptive
    :adaptiveConfig="adaptiveConfig"
    row-key="id"
    alignWhole="center"
    showOverflowTooltip
    :loading="loading"
    :loading-config="loadingConfig"
    :data="
      data.slice(
        (pagination.currentPage - 1) * pagination.pageSize,
        pagination.currentPage * pagination.pageSize
      )
    "
    :columns="columns"
    :pagination="pagination"
    @page-size-change="onSizeChange"
    @page-current-change="onCurrentChange"
  />
</template>
