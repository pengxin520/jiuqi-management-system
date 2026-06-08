<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import type { FormInstance, FormRules } from "element-plus";
import { pinyin } from "pinyin-pro";
import { useRoute, useRouter } from "vue-router";
import {
  categories,
  getCategoryById,
  getNextCategorySort,
  saveCategory,
  type BannerStatus
} from "./data";

const route = useRoute();
const router = useRouter();
const randomLetters = "abcdefghijklmnopqrstuvwxyz";
const formRef = ref<FormInstance>();

const editId = computed(() => Number(route.query.id) || undefined);
const editCategory = computed(() =>
  editId.value ? getCategoryById(editId.value) : undefined
);

const form = reactive({
  name: editCategory.value?.name ?? "",
  code: editCategory.value?.code ?? "",
  sort: editCategory.value?.sort ?? getNextCategorySort(),
  status: (editCategory.value?.status ?? "启用") as BannerStatus
});
const rules = reactive<FormRules<typeof form>>({
  name: [{ required: true, message: "请输入广告分类名称", trigger: "blur" }],
  code: [{ required: true, message: "请输入分类标识", trigger: "blur" }]
});

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

const isCodeUsed = (code: string) => {
  return categories.value.some(
    category => category.code === code && category.id !== editId.value
  );
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

    if (!isCodeUsed(nextCode)) {
      break;
    }
  }

  form.code = nextCode;
  formRef.value?.validateField("code").catch(() => undefined);
};

const resetForm = () => {
  form.name = "";
  form.code = "";
  form.sort = getNextCategorySort();
  form.status = "启用" as BannerStatus;
  formRef.value?.clearValidate();
};

const handleConfirm = async () => {
  form.code = normalizeCategoryCode(form.code);

  const valid = await formRef.value?.validate().catch(() => false);

  if (!valid) {
    ElMessage.error("请先完善表单后再提交");
    return;
  }

  if (isCodeUsed(form.code)) {
    ElMessage.error("分类标识已存在，请重新输入");
    return;
  }

  saveCategory({
    id: editId.value,
    name: form.name,
    code: form.code,
    sort: editId.value ? form.sort : getNextCategorySort(),
    status: form.status
  });

  ElMessage.success(editId.value ? "分类修改成功" : "分类添加成功");
  await router.replace({ path: route.path, query: {} }).catch(() => undefined);
  resetForm();
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
        <el-input v-model="form.name" placeholder="请输入广告分类名称" />
      </el-form-item>
      <el-form-item label="分类标识" prop="code">
        <div class="category-code-field">
          <el-input
            class="category-code-input"
            :model-value="form.code"
            maxlength="8"
            placeholder="请输入广告分类唯一标识代码"
            @input="handleCodeInput"
          />
          <el-button @click="handleGenerateCode">随机生成</el-button>
        </div>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 200px">
          <el-option label="启用" value="启用" />
          <el-option label="禁用" value="禁用" />
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
