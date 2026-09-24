<template>
  <el-card>
    <el-empty
      v-if="!dataBCUVersion.length || !dataBMUVersion.length"
      description="等待下位机数据…"
      :image-size="80"
    />

    <template v-else>
      <div class="flex flex-col gap-3">
        <section v-if="dataBCUVersion.length">
          <el-row :gutter="10" class="gap-y-2.5">
            <re-col
              v-for="(item, index) in dataBCUVersion"
              :key="`s-${item.data_name ?? index}`"
              :value="4"
            >
              <div
                v-if="item.data_name === 'CAN霍尔传感器状态信息'"
                class="h-full rounded-md border border-(--el-border-color-lighter) bg-(--el-bg-color) py-2 px-2.5 transition duration-200 hover:border-(--el-color-primary-light-5) hover:shadow-sm"
              >
                <div
                  class="mb-1 truncate text-xs text-(--el-text-color-secondary)"
                >
                  {{ item.data_name }}
                </div>
                <div class="mt-0.5 flex items-baseline gap-1">
                  <span
                    v-if="item.data_parsed[0].bit_raw == 0"
                    class="text-sm font-semibold tabular-nums leading-tight text-(--el-text-color-primary)"
                  >
                    {{ item.data_parsed[0].bit_value }}
                  </span>
                  <span
                    v-else
                    class="text-sm font-semibold tabular-nums leading-tight text-(--el-text-color-primary)"
                  >
                    {{ item.data_parsed[1].bit_value }}
                  </span>
                </div>
              </div>
              <div
                v-else
                class="h-full rounded-md border border-(--el-border-color-lighter) bg-(--el-bg-color) py-2 px-2.5 transition duration-200 hover:border-(--el-color-primary-light-5) hover:shadow-sm"
              >
                <div
                  class="truncate text-xs text-(--el-text-color-secondary)"
                  :title="item.data_name"
                >
                  {{ item.data_name }}
                </div>
                <div class="mt-0.5 flex items-baseline gap-1">
                  <span
                    class="text-sm font-semibold tabular-nums leading-tight text-(--el-text-color-primary)"
                  >
                    {{ item.data_parsed }}
                  </span>
                </div>
              </div>
            </re-col>
          </el-row>
        </section>

        <section v-if="dataBMUVersion.length" class="flex flex-col gap-3">
          <div
            v-for="(item, i) in dataBMUVersion"
            :key="`bmu-${item.data_name ?? i}`"
          >
            <el-row :gutter="10" class="gap-y-2.5">
              <re-col
                v-for="(bit, bidx) in item.data_parsed || []"
                :key="`bit-${item.data_name}-${bit.reg_idx ?? bidx}`"
                :value="6"
              >
                <div
                  class="h-full rounded-md border border-(--el-border-color-lighter) bg-(--el-bg-color) py-2 px-2.5 transition duration-200 hover:border-(--el-color-primary-light-5) hover:shadow-sm"
                >
                  <div
                    class="truncate text-xs text-(--el-text-color-secondary)"
                    :title="bit.bit_name"
                  >
                    {{ bit.bit_name }}
                  </div>
                  <div class="mt-0.5 flex items-baseline gap-1">
                    <span
                      class="truncate text-sm font-semibold tabular-nums leading-tight text-(--el-text-color-primary)"
                    >
                      {{ bit.bit_value }}
                    </span>
                  </div>
                </div>
              </re-col>
            </el-row>
          </div>
        </section>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { useCol } from "./getVersionData";
import ReCol from "@/components/ReCol";

defineOptions({
  name: "Page2"
});

const { dataBCUVersion, dataBMUVersion } = useCol();
</script>
