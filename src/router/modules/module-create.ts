const Layout = () => import("@/layout/index.vue");

export default {
  path: "/module",
  name: "ModuleManagement",
  component: Layout,
  redirect: "/module/create",
  meta: {
    icon: "ri:apps-2-line",
    title: "模块管理",
    rank: 3
  },
  children: [
    {
      path: "/module/list",
      name: "ModuleList",
      component: () => import("@/views/module-create/module-list.vue"),
      meta: {
        title: "模块列表",
        icon: "ri:list-check",
        showLink: true
      }
    },
    {
      path: "/module/create",
      name: "ModuleCreate",
      component: () => import("@/views/module-create/add-module.vue"),
      meta: {
        title: "创建新模块",
        icon: "ri:add-box-line",
        showLink: true
      }
    }
  ]
} satisfies RouteConfigsTable;
