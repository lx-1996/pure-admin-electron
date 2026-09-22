<template>
  <el-card class="cluster-page">
    <el-empty
      v-if="!dataVersion.length"
      description="等待下位机数据…"
      :image-size="80"
    />

    <template v-else>
      <section v-if="dataVersion.length" class="cluster-page__section">
        <el-row :gutter="10" class="card-row">
          <re-col
            v-for="(item, index) in dataVersion"
            :key="`s-${item.data_name ?? index}`"
            :value="3"
          >
            <div class="metric">
              <div class="metric__name" :title="item.data_name">
                {{ item.data_name }}
              </div>
              <div class="metric__value">
                <span class="metric__num">{{ item.data_parsed }}</span>
                <span v-if="item.data_unit" class="metric__unit">
                  {{ item.data_unit }}
                </span>
              </div>
            </div>
          </re-col>
        </el-row>
      </section>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { useCol } from "./getVersionData";
import ReCol from "@/components/ReCol";

defineOptions({
  name: "Page2"
});

const { dataVersion } = useCol();
</script>

<style lang="scss" scoped>
.cluster-page {
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  &__title {
    display: flex;
    align-items: center;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);

    .bar {
      width: 3px;
      height: 14px;
      margin-right: 6px;
      background: var(--el-color-primary);
      border-radius: 2px;
    }
  }

  &__section {
    & + & {
      margin-top: 12px;
    }
  }

  &__section-title {
    margin: 0 0 6px;
    font-size: 13px;
    font-weight: 500;
    color: var(--el-text-color-regular);
  }
}

/* el-row 的 gutter 只作用于水平方向，多行时需用 row-gap 补垂直间距 */
.card-row {
  row-gap: 2px;
}

.metric,
.bitcard {
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
}

.metric {
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

  &__unit {
    font-size: 11px;
    color: var(--el-text-color-secondary);
  }
}
</style>
