<template>
  <el-card>
    <el-empty
      v-if="!dataWithFilter.length"
      description="等待下位机数据…"
      :image-size="80"
    />

    <template v-else>
      <div class="flex flex-col gap-0.5">
        <section v-if="sysStatusData.length || bitData.length">
          <el-row :gutter="10" class="gap-y-0.5">
            <re-col
              v-for="(item, index) in sysStatusData"
              :key="`sys-${item.data_name ?? index}`"
              :value="24"
            >
              <div
                class="flex h-full flex-col rounded-md border border-(--el-border-color-lighter) bg-(--el-bg-color) p-2 transition duration-200 hover:border-(--el-color-primary-light-5) hover:shadow-sm"
              >
                <div
                  class="mb-1 truncate text-xs text-(--el-text-color-primary)"
                  :title="item.data_name"
                >
                  {{ item.data_name }}
                </div>
                <div
                  class="flex flex-wrap gap-1 max-h-28 overflow-y-auto truncate"
                >
                  <span
                    v-for="(value, i) in item.data_parsed"
                    :key="i"
                    class="rounded border border-transparent bg-(--el-fill-color-light) px-1 py-px text-xs leading-snug text-(--el-text-color-secondary) transition-all duration-200"
                    :class="{
                      'bg-(--el-color-primary)! text-white! border-(--el-color-primary)!':
                        isBitActive(value)
                    }"
                    :title="value?.bit_name"
                  >
                    {{ getDisplayMode(value) }}
                  </span>
                </div>
              </div>
            </re-col>
            <re-col
              v-for="(item, index) in bitData"
              :key="`b-${item.data_name ?? index}`"
              :value="6"
            >
              <div
                class="flex truncate h-full flex-col rounded-md border border-(--el-border-color-lighter) bg-(--el-bg-color) p-2 transition duration-200 hover:border-(--el-color-primary-light-5) hover:shadow-sm"
              >
                <div
                  class="mb-1 truncate text-xs font-medium text-(--el-text-color-primary)"
                  :title="item.data_name"
                >
                  {{ item.data_name }}
                </div>
                <div class="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                  <span
                    v-for="(value, i) in item.data_parsed"
                    :key="i"
                    class="rounded border border-transparent bg-(--el-color-primary) px-1 py-px text-xs leading-snug text-white"
                    :title="value?.bit_name"
                  >
                    {{ getDisplayMode(value) }}
                  </span>
                </div>
              </div>
            </re-col>
          </el-row>
        </section>

        <section v-if="scalarDataWithpowerOff.length">
          <el-row :gutter="10" class="gap-y-0.5">
            <re-col
              v-for="(item, index) in scalarDataWithpowerOff"
              :key="`s-${item.data_name ?? index}`"
              :value="2"
            >
              <div
                class="h-full rounded-md border border-(--el-border-color-lighter) bg-(--el-bg-color) p-2 transition duration-200 hover:border-(--el-color-primary-light-5) hover:shadow-sm"
              >
                <div
                  class="mb-1 truncate text-xs text-(--el-text-color-primary)"
                  :title="item.data_name"
                >
                  {{ item.data_name }}
                </div>
                <div class="flex items-baseline gap-1 truncate">
                  <span
                    class="text-sm font-semibold tabular-nums leading-tight text-(--el-text-color-primary)"
                  >
                    {{ item.data_parsed }}
                  </span>
                  <span
                    v-if="item.data_unit"
                    class="text-xs text-(--el-text-color-secondary)"
                  >
                    {{ item.data_unit }}
                  </span>
                </div>
              </div>
            </re-col>
          </el-row>
        </section>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { useCol } from "./getClusterData";
import ReCol from "@/components/ReCol";

defineOptions({
  name: "Page2"
});

const {
  dataWithFilter,
  bitData,
  scalarData,
  sysStatusData,
  scalarDataWithpowerOff,
  getDisplayMode,
  isBitActive
} = useCol();
</script>
