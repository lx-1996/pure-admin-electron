<script setup lang="ts">
import { list } from "./list";
import { ref } from "vue";
defineOptions({
  name: "Welcome"
});
const selected = ref(0);
function tabClick({ index }) {
  selected.value = index;
}
</script>

<template>
  <el-card shadow="never">
    <el-tabs @tab-click="tabClick">
      <template v-for="(item, index) of list" :key="item.key">
        <el-tab-pane :lazy="true">
          <template #label>
            <span>{{ item.title }}</span>
          </template>
          <component :is="item.component" v-if="selected == index" />
        </el-tab-pane>
      </template>
    </el-tabs>
  </el-card>
</template>
