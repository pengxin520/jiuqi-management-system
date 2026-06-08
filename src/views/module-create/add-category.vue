<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { pinyin } from "pinyin-pro";
import { useRoute, useRouter } from "vue-router";
import {
  getCategoryById,
  getModuleCodeByPath,
  isCategoryCodeUsed,
  saveCategory,
  type ModuleCategoryStatus
} from "./data";

const route = useRoute();
const router = useRouter();
const randomLetters = "abcdefghijklmnopqrstuvwxyz";
const formRef = ref<FormInstance>();

const editId = computed(() => Number(route.query.id) || undefined);
const moduleCode = computed(() => getModuleCodeByPath(route.path));
const moduleShortTitle = computed(() => {
  const matchedRoute = [...route.matched]
    .reverse()
    .find(
      item => typeof item.meta?.shortTitle === "string" && item.meta.shortTitle
    );

  return (matchedRoute?.meta.shortTitle as string) || "模块";
});
const categoryNamePlaceholder = computed(
  () => `请输入${moduleShortTitle.value}分类名称`
);
const categoryCodePlaceholder = computed(
  () => `请输入${moduleShortTitle.value}分类唯一标识代码`
);

const form = reactive({
  name: "",
  code: "",
  status: "enabled" as ModuleCategoryStatus
});
const rules = computed<FormRules<typeof form>>(() => ({
  name: [
    {
      required: true,
      message: categoryNamePlaceholder.value,
      trigger: "blur"
    }
  ],
  code: [
    {
      required: true,
      message: categoryCodePlaceholder.value,
      trigger: "blur"
    }
  ]
}));
const editCategory = computed(() =>
  editId.value ? getCategoryById(moduleCode.value, editId.value) : undefined
);

watch(
  editCategory,
  category => {
    form.name = category?.name ?? "";
    form.code = category?.code ?? "";
    form.status = category?.status ?? "enabled";
  },
  {
    immediate: true
  }
);

const normalizeCategoryCode = (value: string) => {
  return value
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 8);
};

const getRandomLetters = (length: number) => {
  return Array.from(
    { length },
    () => randomLetters[Math.floor(Math.random() * randomLetters.length)]
  ).join("");
};

const handleCodeInput = (value: string) => {
  form.code = normalizeCategoryCode(value);
};

const handleGenerateCode = () => {
  if (!form.name.trim()) {
    ElMessage.warning("请先输入分类名称");
    return;
  }

  const codeSeed = normalizeCategoryCode(
    String(pinyin(form.name, { toneType: "none" }))
  );
  const prefix = codeSeed.slice(0, Math.min(4, codeSeed.length));
  let nextCode = "";

  for (let index = 0; index < 20; index += 1) {
    nextCode = `${prefix}${getRandomLetters(8)}`.slice(0, 8);

    if (!isCategoryCodeUsed(moduleCode.value, nextCode, editId.value)) {
      break;
    }
  }

  form.code = nextCode;
  formRef.value?.validateField("code").catch(() => undefined);
};

const resetForm = () => {
  form.name = "";
  form.code = "";
  form.status = "enabled";
  formRef.value?.clearValidate();
};

const handleConfirm = async () => {
  const isEditing = Boolean(editId.value);
  form.name = form.name.trim();
  form.code = normalizeCategoryCode(form.code);

  const valid = await formRef.value?.validate().catch(() => false);

  if (!valid) return;

  if (isCategoryCodeUsed(moduleCode.value, form.code, editId.value)) {
    ElMessage.error("分类标识已存在，请重新输入");
    return;
  }

  try {
    saveCategory({
      id: editId.value,
      moduleCode: moduleCode.value,
      name: form.name,
      code: form.code,
      status: form.status
    });
    await router.replace({ path: route.path });
    resetForm();
    ElMessage.success(isEditing ? "保存成功" : "添加成功");
  } catch {
    ElMessage.error(isEditing ? "保存失败，请稍后重试" : "添加失败，请稍后重试");
  }
};
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>{{ editId ? "编辑分类" : "添加分类" }}</span>
      </div>
    </template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
      style="max-width: 600px"
    >
      <el-form-item label="分类名称" prop="name">
        <el-input v-model="form.name" :placeholder="categoryNamePlaceholder" />
      </el-form-item>
      <el-form-item label="分类标识" prop="code">
        <div class="category-code-field">
          <el-input
            class="category-code-input"
            :model-value="form.code"
            maxlength="8"
            :placeholder="categoryCodePlaceholder"
            @input="handleCodeInput"
          />
          <el-button @click="handleGenerateCode">随机生成</el-button>
        </div>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 200px">
          <el-option label="启用" value="enabled" />
          <el-option label="禁用" value="disabled" />
        </el-select>
      </el-form-item>
    </el-form>

    <div class="form-actions">
      <el-button type="primary" @click="handleConfirm">
        {{ editId ? "保存修改" : "确定添加" }}
      </el-button>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.category-code-field {
  display: flex;
  gap: 12px;
  align-items: center;
}

.category-code-input {
  width: 240px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color);
}
</style>
