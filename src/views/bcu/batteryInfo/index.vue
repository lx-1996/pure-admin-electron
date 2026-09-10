<script setup lang="ts">
//import { list } from "./list";
import { ref } from "vue";
import Cell from "./cell/index.vue";
import Cluster_summary from "./cluster_summary/index.vue";
defineOptions({
  name: "page1"
});
const selected = ref(0);
// function tabClick({ index }) {
//   selected.value = index;
// }
</script>

<template>
  <div class="flex flex-col gap-4">
    <Cluster_summary />
    <Cell />
  </div>
</template>
