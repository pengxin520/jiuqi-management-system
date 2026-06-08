export default {
  path: "/banner",
  redirect: "/banner/category-list",
  meta: {
    icon: "ri:advertisement-line",
    title: "广告中心",
    rank: 2
  },
  children: [
    {
      path: "/banner/category-list",
      name: "分类列表",
      component: () => import("@/views/banner/category-list.vue"),
      meta: {
        title: "分类列表",
        icon: "ri:list-check-2"
      }
    },
    {
      path: "/banner/banner-list",
      name: "广告列表",
      component: () => import("@/views/banner/banner-list.vue"),
      meta: {
        title: "广告列表",
        icon: "ri:image-2-line"
      }
    },
    {
      path: "/banner/add-category",
      name: "添加分类",
      component: () => import("@/views/banner/add-category.vue"),
      meta: {
        title: "添加分类",
        icon: "ri:add-circle-line"
      }
    },
    {
      path: "/banner/add-banner",
      name: "添加广告",
      component: () => import("@/views/banner/add-banner.vue"),
      meta: {
        title: "添加广告",
        icon: "ri:image-add-line"
      }
    }
  ]
};
