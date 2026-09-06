<template>
  <div>
    <el-row :gutter="24">
      <re-col v-for="(item, index) in data" :key="index" :value="2">
        <el-card shadow="always">
          <div>{{ item.data_name }}</div>
          <div v-if="!Array.isArray(item.data_parsed)">
            {{ item.data_parsed }}
          </div>
          <div v-else-if="Array.isArray(item.data_parsed)" class="bitValue">
            <span
              v-for="(value, i) in item.data_parsed"
              :key="i"
              :class="[
                value.display_mode == 'nameHighLightWithBitRaw' &&
                value.bit_raw == 1
                  ? 'bit1'
                  : null
              ]"
              >{{ getDisplayMode(value) }}</span
            >
          </div>
        </el-card>
      </re-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { useCol } from "./column";
import ReCol from "@/components/ReCol";
const { data, getDisplayMode } = useCol();
defineOptions({
  name: "Test"
});
</script>
<style lang="scss" scoped>
.el-row {
  margin-bottom: 20px;
}

.bit1 {
  color: green;
}

.bitValue {
  display: flex;
  flex-direction: column;
}
</style>
