import { defineComponent, h, ref } from "vue";
export default defineComponent({
  name: "Test1",
  setup() {
    const count = ref(1);
    const sum = () => {
      count.value++;
    };
    return {
      count,
      sum
    };
  },
  render() {
    return h("div", null, [
      h("el-button", { onClick: this.sum }, "增加"),
      h("div", null, this.count)
    ]);
  }
});
