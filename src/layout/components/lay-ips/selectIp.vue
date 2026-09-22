<script setup lang="ts">
import { watch } from "vue";
import { useBcuConnectStoreHook } from "@/store/modules/bcuConnect";
defineOptions({
  name: "SelectIp"
});
const bcuConnectStore = useBcuConnectStoreHook();
// const selectIp = computed({
//   get: () => bcuConnectStore.selectIp,
//   set: v => (bcuConnectStore.selectIp = v)
// });

/**
 * 选项就绪后自动选中第一个：只在还没选过时兜底，不覆盖用户手动选择。
 * immediate 保证组件挂载时已有选项也能立即选中；
 * serverOptions 是 getter，每次重算都会返回新数组引用，因此选项变化会触发这里。
 */
watch(
  () => bcuConnectStore.serverOptions,
  options => {
    if (!options.length || bcuConnectStore.selectIp) return;
    bcuConnectStore.selectIp = options[0].value;
  },
  { immediate: true }
);
</script>

<template>
  <el-select
    v-model="bcuConnectStore.selectIp"
    placeholder="请选择IP"
    class="ip-select"
  >
    <el-option
      v-for="item in bcuConnectStore.serverOptions"
      :key="item.value"
      :label="item.label"
      :value="item.value"
    />
  </el-select>
</template>

<style lang="scss" scoped>
.ip-select {
  --el-select-width: 150px;
}
</style>
