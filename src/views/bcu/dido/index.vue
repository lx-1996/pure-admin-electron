<template>
  <el-card>
    <el-empty
      v-if="!dataDIDOSelectedIp.length"
      description="等待下位机数据…"
      :image-size="80"
    />

    <template v-else>
      <div class="flex flex-col gap-5">
        <section
          v-for="item in dataDIDOSelectedIp"
          :key="item.id ?? item.data_name"
        >
          <div class="mb-2.5 flex items-center gap-2">
            <span class="h-3.5 w-1 rounded-sm bg-(--el-color-primary)" />
            <h5 class="m-0 text-sm font-medium text-(--el-text-color-primary)">
              {{ item.data_name }}
            </h5>
          </div>

          <el-row :gutter="10" class="gap-y-2.5">
            <re-col
              v-for="(bit, bidx) in item.data_parsed || []"
              :key="`${item.data_name}-${bit.reg_idx ?? bidx}-${bidx}`"
              :value="3"
            >
              <div
                class="flex h-full items-center justify-between rounded-md border bg-(--el-bg-color) py-2 px-2.5 transition duration-200"
                :class="
                  isActive(bit.bit_value)
                    ? 'border-(--el-color-primary-light-5) hover:border-(--el-color-primary)'
                    : 'border-(--el-border-color-lighter) hover:border-(--el-color-primary-light-5)'
                "
              >
                <div
                  class="min-w-0 truncate text-xs text-(--el-text-color-secondary)"
                  :title="bit.bit_name"
                >
                  {{ bit.bit_name }}
                </div>
                <div class="ml-2 flex shrink-0 items-center gap-1.5">
                  <span
                    class="inline-block h-2 w-2 rounded-full"
                    :class="
                      isActive(bit.bit_value)
                        ? 'bg-(--el-color-primary)'
                        : 'bg-(--el-border-color)'
                    "
                  />
                  <span
                    class="text-sm font-semibold tabular-nums leading-tight"
                    :class="
                      isActive(bit.bit_value)
                        ? 'text-(--el-color-primary)'
                        : 'text-(--el-text-color-secondary)'
                    "
                  >
                    {{ bit.bit_value }}
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
import { useDIDO } from "./getDIDOData";
import ReCol from "@/components/ReCol";

defineOptions({
  name: "DIDO"
});

const { dataDIDOSelectedIp } = useDIDO();

function isActive(val: number | null | undefined) {
  return val === 1;
}
</script>
