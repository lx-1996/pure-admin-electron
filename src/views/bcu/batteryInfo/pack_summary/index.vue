<template>
  <div>
    <el-row :gutter="10" class="gap-y-2.5">
      <re-col
        v-for="(item, index) in dataSelectedIp[0]?.data_parsed"
        :key="index"
        :value="3"
      >
        <div
          class="h-full rounded-md border border-(--el-border-color-lighter) bg-(--el-bg-color) py-2 px-2.5 transition duration-200 hover:border-(--el-color-primary-light-5) hover:shadow-sm"
        >
          <div class="mb-1 truncate text-xs text-(--el-text-color-primary)">
            {{ item.bit_name }}
          </div>
          <div
            class="text-sm font-semibold tabular-nums leading-tight text-(--el-text-color-primary)"
          >
            {{ item.bit_value }}
          </div>
        </div>
      </re-col>
    </el-row>
    <!-- {{ dataSelectedIp }} -->
  </div>
</template>

<script setup lang="ts">
import ReCol from "@/components/ReCol";
import { usePackData } from "./getBmuData";
defineOptions({
  name: "BMUDataChild"
});
const props = defineProps({
  dataClass: {
    type: String,
    default: ""
  }
});
const { dataSelectedIp } = usePackData(() => props.dataClass);
</script>
