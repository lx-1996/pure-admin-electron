const { VITE_HIDE_HOME } = import.meta.env;
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/",
  name: "Home",
  component: Layout,
  redirect: "/page1",
  meta: {
    icon: "ep/home-filled",
    title: "运行信息",
    rank: 0
  },
  children: [
    {
      path: "/page1",
      name: "Page1",
      component: () => import("@/views/bcu/batteryInfo/index.vue"),
      meta: {
        title: "电池数据",
        showLink: VITE_HIDE_HOME === "true" ? false : true
      }
    },
    {
      path: "/page2",
      name: "Page2",
      component: () => import("@/views/bcu/version/index.vue"),
      meta: {
        title: "版本号"
      }
    },
    {
      path: "/page3",
      name: "Page3",
      component: () => import("@/views/bcu/dido/index.vue"),
      meta: {
        title: "DIDO"
      }
    }
  ]
} satisfies RouteConfigsTable;
