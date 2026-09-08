const { VITE_HIDE_HOME } = import.meta.env;
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/",
  name: "Home",
  component: Layout,
  redirect: "/page1",
  meta: {
    icon: "ep/home-filled",
    title: "首页",
    rank: 0
  },
  children: [
    {
      path: "/page1",
      name: "Page1",
      component: () => import("@/views/bcu/batteryInfo/index.vue"),
      meta: {
        title: "首页1",
        showLink: VITE_HIDE_HOME === "true" ? false : true
      }
    },
    {
      path: "/page2",
      name: "Page2",
      component: () =>
        import("@/views/bcu/batteryInfo/cluster_summary/index.vue"),
      meta: {
        title: "首页2"
      }
    }
  ]
} satisfies RouteConfigsTable;
