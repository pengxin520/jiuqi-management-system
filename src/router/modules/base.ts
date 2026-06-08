import { $t } from "@/plugins/i18n";

export default {
  path: "/base",
  redirect: "/base/site",
  meta: {
    icon: "ri:settings-3-line",
    title: "基础设置",
    rank: 1
  },
  children: [
    {
      path: "/base/site",
      name: "站点设置",
      component: () => import("@/views/base/site.vue"),
      meta: {
        title: "站点设置",
        icon: "ri:global-line"
      }
    },
    {
      path: "/base/seo",
      name: "SEO设置",
      component: () => import("@/views/base/seo.vue"),
      meta: {
        title: "SEO设置",
        icon: "ri:seo-line"
      }
    },
    {
      path: "/base/data",
      name: "数据设置",
      component: () => import("@/views/base/data.vue"),
      meta: {
        title: "数据设置",
        icon: "ri:database-2-line"
      }
    },
    {
      path: "/base/account",
      name: "账号设置",
      component: () => import("@/views/base/account.vue"),
      meta: {
        title: "账号设置",
        icon: "ri:user-settings-line"
      }
    },
  ]
};
