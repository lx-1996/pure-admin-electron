<template>
  <div>
    <el-row :gutter="2" class="gap-y-2.5">
      <re-col v-for="(item, index) in dataSelectedIp" :key="index" :value="3">
        <div
          class="h-full rounded-md border border-(--el-border-color-lighter) bg-(--el-bg-color) py-2 px-2.5 transition duration-200 hover:border-(--el-color-primary-light-5) hover:shadow-sm"
        >
          <div class="mb-1 truncate text-xs text-(--el-text-color-secondary)">
            {{ item.data_name }}
          </div>
          <div
            class="text-sm font-semibold tabular-nums leading-tight text-(--el-text-color-primary)"
          >
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
