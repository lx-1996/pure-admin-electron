<template>
  <div>
    <el-row :gutter="2" class="card-row">
      <re-col v-for="(item, index) in dataSelectedIp" :key="index" :value="3">
        <div class="metric">
          <div class="metric__name">{{ item.data_name }}</div>
          <div class="metric__num">
            {{ item.data_parsed_withIndex }}
          </div>
        </div>
      </re-col>
    </el-row>
    <!-- {{ dataSelectedIp }} -->
  </div>
</template>

<script setup lang="ts">
import ReCol from "@/components/ReCol";
import { useSysData } from "./getSysData";
defineOptions({
  name: "SysDataChild"
});
const props = defineProps({
  dataClass: {
    type: String,
    default: ""
  }
});
const { dataSelectedIp } = useSysData(() => props.dataClass);
</script>

<style lang="scss" scoped>
.card-row {
  row-gap: 10px;
}

.metric {
  height: 100%;
  padding: 8px 10px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 2px 8px rgb(0 0 0 / 6%);
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
  }

  &__value {
    display: flex;
    gap: 3px;
    align-items: baseline;
    margin-top: 2px;
  }

  &__num {
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    line-height: 1.25;
    color: var(--el-text-color-primary);
  }
}
</style>
