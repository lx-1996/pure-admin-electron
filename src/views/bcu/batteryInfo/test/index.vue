<template>
  <div>{{ dataSelectedIp }}</div>
</template>

<script setup>
// import { ref } from "vue";
import { usePackData } from "./test";
const { dataSelectedIp } = usePackData();
</script>

<style lang="less" scoped></style>
