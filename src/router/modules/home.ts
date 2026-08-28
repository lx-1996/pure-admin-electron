const { VITE_HIDE_HOME } = import.meta.env;
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/",
  name: "Home",
  component: Layout,
  redirect: "/welcome",
  meta: {
    icon: "ep/home-filled",
    title: "首页",
    rank: 0
  },
  children: [
    {
      path: "/welcome",
      name: "Welcome",
      component: () => import("@/views/welcome/index.vue"),
      meta: {
        title: "首页1",
        showLink: VITE_HIDE_HOME === "true" ? false : true
      }
    },
    {
      path: "/welcome1",
      name: "Welcome1",
      component: () => import("@/views/welcome/cluster_summary/index.vue"),
      meta: {
        title: "首页2"
      }
    }
  ]
} satisfies RouteConfigsTable;
