<script setup lang="ts">
import { storageLocal } from "@pureadmin/utils";
import { ElMessage } from "element-plus";
import { computed, reactive, watch } from "vue";
import { useRouter, type RouteRecordRaw } from "vue-router";
import { handleAsyncRoutes } from "@/router/utils";

defineOptions({
  name: "ModuleCreate"
});

const router = useRouter();
const moduleCreatedRoutesKey = "module-created-routes";

const form = reactive({
  moduleType: "list",
  title: "",
  shortTitle: "",
  moduleCode: "",
  useTemplate: false,
  template: ""
});

const templateMap: Record<
  string,
  { label: string; shortLabel?: string; code: string }
> = {
  product: { label: "产品中心", shortLabel: "产品", code: "product" },
  news: { label: "新闻中心", shortLabel: "新闻", code: "news" },
  about: { label: "关于我们", code: "about" },
  contact: { label: "联系我们", code: "contact" }
};

const templateOptions = computed(() => {
  if (form.moduleType === "list") {
    return [
      { label: templateMap.product.label, value: "product" },
      { label: templateMap.news.label, value: "news" }
    ];
  }

  return [
    { label: templateMap.about.label, value: "about" },
    { label: templateMap.contact.label, value: "contact" }
  ];
});

const routeTemplates = {
  list: [
    {
      suffix: "category-list",
      name: "CategoryList",
      title: "分类列表",
      component: "module-create/category-list"
    },
    {
      suffix: "content-list",
      name: "ContentList",
      title: "内容列表",
      component: "module-create/content-list"
    },
    {
      suffix: "add-category",
      name: "AddCategory",
      title: "添加分类",
      component: "module-create/add-category"
    },
    {
      suffix: "add-content",
      name: "AddContent",
      title: "添加内容",
      component: "module-create/add-content"
    }
  ],
  text: [
    {
      suffix: "add-text",
      name: "AddText",
      title: "添加内容",
      component: "module-create/add-text"
    }
  ]
};

watch(
  () => form.moduleType,
  () => {
    form.template = "";
    if (form.useTemplate) {
      form.title = "";
      form.shortTitle = "";
      form.moduleCode = "";
    }
  }
);

watch(
  () => form.useTemplate,
  useTemplate => {
    form.template = "";
    if (useTemplate) {
      form.title = "";
      form.shortTitle = "";
      form.moduleCode = "";
    }
  }
);

watch(
  () => form.template,
  template => {
    if (!form.useTemplate || !template) return;
    const currentTemplate = templateMap[template];
    if (!currentTemplate) return;
    form.title = currentTemplate.label;
    form.shortTitle = currentTemplate.shortLabel ?? "";
    form.moduleCode = currentTemplate.code;
  }
);

function toPascalCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map(item => item.charAt(0).toUpperCase() + item.slice(1))
    .join("");
}

function buildModuleRoute() {
  const modulePath = "/" + form.moduleCode;
  const moduleName = toPascalCase(form.moduleCode);
  const children = routeTemplates[form.moduleType].map(item => ({
    path: modulePath + "/" + item.suffix,
    name: moduleName + item.name,
    component: item.component,
    meta: {
      title: item.title,
      showLink: true,
      showParent: form.moduleType === "text" ? true : undefined
    }
  }));

  return {
    path: modulePath,
    name: moduleName + "Module",
    redirect: children[0].path,
    meta: {
      icon: form.moduleType === "list" ? "ri/list-check" : "ri/file-text-line",
      title: form.title,
      shortTitle: form.moduleType === "list" ? form.shortTitle : undefined,
      rank: 99
    },
    children
  } as RouteRecordRaw;
}

function handleSubmit() {
  form.title = form.title.trim();
  form.shortTitle = form.shortTitle.trim();
  form.moduleCode = form.moduleCode.trim();

  if (!form.title) {
    ElMessage.warning("请填写模块名称");
    return;
  }

  if (form.moduleType === "list" && !form.shortTitle) {
    ElMessage.warning("请填写模块短名称");
    return;
  }

  if (!form.moduleCode) {
    ElMessage.warning("请填写模块代码");
    return;
  }

  const moduleRouteName = toPascalCase(form.moduleCode) + "Module";
  const createdRoutes =
    storageLocal().getItem<RouteRecordRaw[]>(moduleCreatedRoutesKey) ?? [];

  if (
    router.hasRoute(moduleRouteName) ||
    createdRoutes.some(route => route.name === moduleRouteName)
  ) {
    ElMessage.warning("该模块路由已存在");
    return;
  }

  const moduleRoute = buildModuleRoute();
  storageLocal().setItem(moduleCreatedRoutesKey, [
    ...createdRoutes,
    moduleRoute
  ]);
  handleAsyncRoutes([moduleRoute]);
  ElMessage.success("创建模块成功");
  router.push(moduleRoute.redirect as string);
}

function handleReset() {
  form.moduleType = "list";
  form.title = "";
  form.shortTitle = "";
  form.moduleCode = "";
  form.useTemplate = false;
  form.template = "";
}
</script>

<template>
  <el-card class="module-create-card">
    <template #header>
      <div class="card-header">
        <span>创建新模块</span>
      </div>
    </template>

    <el-form
      :model="form"
      label-width="120px"
      class="module-create-form"
      style="max-width: 600px"
    >
      <el-form-item label="模块类型">
        <el-radio-group v-model="form.moduleType">
          <el-radio-button label="list">列表模块</el-radio-button>
          <el-radio-button label="text">文本模块</el-radio-button>
        </el-radio-group>
      </el-form-item>

      <el-form-item label="模块名称">
        <el-input
          v-model="form.title"
          placeholder="例如：产品中心"
          :disabled="form.useTemplate"
        />
      </el-form-item>

      <el-form-item v-if="form.moduleType === 'list'" label="模块短名称">
        <el-input
          v-model="form.shortTitle"
          placeholder="例如：产品"
          :disabled="form.useTemplate"
        />
      </el-form-item>

      <el-form-item label="模块代码">
        <el-input
          v-model="form.moduleCode"
          placeholder="仅支持英文小写"
          :disabled="form.useTemplate"
          @input="value => (form.moduleCode = value.replace(/[^a-z]/g, ''))"
        />
        <div class="module-code-tip">
          <template v-if="form.moduleType === 'list'">
            请在前台 /public/module/ 目录放置
            {{ form.moduleCode || "xxx" }}.html（列表页）和
            {{ form.moduleCode || "xxx" }}_detail.html（详情页）模板文件
          </template>
          <template v-else>
            请在前台 /public/module/ 目录放置
            {{ form.moduleCode || "xxx" }}.html 模板文件
          </template>
        </div>
      </el-form-item>

      <el-form-item label="是否使用模板">
        <el-switch v-model="form.useTemplate" />
      </el-form-item>

      <el-form-item v-if="form.useTemplate" label="选择模板">
        <el-select v-model="form.template" placeholder="请选择模板" clearable>
          <el-option
            v-for="item in templateOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <div class="form-actions">
      <el-button type="primary" @click="handleSubmit">创建模块</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.module-code-tip {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color);
}
</style>
