<script setup lang="ts">
import { reactive } from "vue";
import { message } from "@/utils/message";
import Delete from "~icons/ep/delete";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

const defaultKeywordCount = 8;

const form = reactive({
  title: "",
  keywords: Array(defaultKeywordCount).fill(""),
  description: ""
});

const handleAddKeyword = () => {
  form.keywords.push("");
};

const handleRemoveKeyword = (index: number) => {
  if (index < defaultKeywordCount) return;
  form.keywords.splice(index, 1);
};

const handleConfirm = () => {
  console.log("表单提交", form);
  // 这里可以添加表单验证和提交逻辑
  message("修改成功", { type: "success" });
};
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>SEO设置</span>
      </div>
    </template>
    <el-form :model="form" label-width="auto" class="seo-form">
      <el-form-item label="标题" class="seo-form-item">
        <el-input v-model="form.title" placeholder="请输入网站标题" />
      </el-form-item>
      <el-form-item label="关键字" class="keyword-form-item">
        <div class="keywords-wrapper">
          <div
            v-for="(item, index) in form.keywords"
            :key="index"
            class="keyword-item"
          >
            <el-input
              v-model="form.keywords[index]"
              class="keyword-input"
              placeholder="关键字"
            >
              <template #suffix>
                <el-button
                  v-if="index >= defaultKeywordCount"
                  class="keyword-delete-button"
                  type="danger"
                  link
                  :icon="useRenderIcon(Delete)"
                  :aria-label="`删除关键字${index + 1}`"
                  :title="`删除关键字${index + 1}`"
                  @click.stop="handleRemoveKeyword(index)"
                />
                <span
                  v-else
                  class="keyword-delete-placeholder"
                  aria-hidden="true"
                />
              </template>
            </el-input>
          </div>
          <el-button class="add-keyword-button" @click="handleAddKeyword">
            添加关键字
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label="描述" class="seo-form-item">
        <el-input
          v-model="form.description"
          placeholder="请输入网站描述"
          type="textarea"
        />
      </el-form-item>
    </el-form>
    <div class="form-actions">
      <el-button type="primary" @click="handleConfirm">确定提交</el-button>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color);
}

.keywords-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
}

.seo-form {
  max-width: 100%;
}

.seo-form-item {
  max-width: 50%;
}

.keyword-form-item {
  max-width: 80%;
}

.keyword-item {
  width: 140px;
}

.keyword-input {
  width: 100%;
}

.keyword-delete-button {
  width: 24px;
  height: 24px;
  padding: 0;
  margin-left: 0 !important;
  font-size: 16px;
}

.keyword-delete-placeholder {
  display: inline-block;
  width: 24px;
  height: 24px;
}

.add-keyword-button {
  width: 140px;
  margin-left: 0 !important;
  color: #5d6f91;
  background-color: #f6f8fc;
  border-color: #dfe7f2;

  &:hover,
  &:focus {
    color: #4d607e;
    background-color: #eef3fa;
    border-color: #ccd9e9;
  }
}
</style>
