<template>
  <el-card class="cluster-page">
    <el-empty
      v-if="!dataWithFilter.length"
      description="等待下位机数据…"
      :image-size="80"
    />

    <template v-else>
      <section
        v-if="sysStatusData.length || bitData.length"
        class="cluster-page__section"
      >
        <el-row :gutter="10" class="card-row">
          <re-col
            v-for="(item, index) in sysStatusData"
            :key="`sys-${item.data_name ?? index}`"
            :value="24"
          >
            <div class="bitcard bitcard--wide">
              <div class="bitcard__title" :title="item.data_name">
                {{ item.data_name }}
              </div>
              <div class="bitcard__body bitcard__body--wide">
                <span
                  v-for="(value, i) in item.data_parsed"
                  :key="i"
                  class="chip"
                  :class="{ 'chip--on': isBitActive(value) }"
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
            <div class="bitcard">
              <div class="bitcard__title" :title="item.data_name">
                {{ item.data_name }}
              </div>
              <div class="bitcard__body">
                <span
                  v-for="(value, i) in item.data_parsed"
                  :key="i"
                  class="chip"
                  :class="{ 'chip--on': isBitActive(value) }"
                  :title="value?.bit_name"
                >
                  {{ getDisplayMode(value) }}
                </span>
              </div>
            </div>
          </re-col>
        </el-row>
      </section>

      <section v-if="scalarData.length" class="cluster-page__section">
        <el-row :gutter="10" class="card-row">
          <re-col
            v-for="(item, index) in scalarData"
            :key="`s-${item.data_name ?? index}`"
            :value="3"
          >
            <div class="metric">
              <div class="metric__name" :title="item.data_name">
                {{ item.data_name }}
              </div>
              <div class="metric__value">
                <span class="metric__num">{{ item.data_parsed }}</span>
                <span v-if="fmtUnit(item.data_unit)" class="metric__unit">
                  {{ fmtUnit(item.data_unit) }}
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
  updatedAt,
  getDisplayMode,
  isBitActive,
  fmtUnit
} = useCol();
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

.bitcard {
  display: flex;
  flex-direction: column;

  &__title {
    margin-bottom: 3px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 12px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    white-space: nowrap;
  }

  &__body {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 104px;
    overflow-y: auto;
  }

  /* 系统总状态位：独占整行，chip 全部展开不滚动 */
  // &--wide {
  //   padding: 10px 12px;
  // }

  // &__body--wide {
  //   gap: 6px;
  //   max-height: none;
  //   overflow: visible;
  // }
}

.chip {
  padding: 1px 3px;
  font-size: 13px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border: 1px solid transparent;
  border-radius: 3px;
  transition: all 0.2s;

  &--on {
    color: #fff;
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
  }
}
</style>
