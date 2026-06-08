<script setup lang="ts">
import { ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useRouter } from "vue-router";
import FileCopyLine from "~icons/ri/file-copy-line";
import { type CategoryRow, categoryRows, deleteCategories } from "./data";

const router = useRouter();
const selectedCategories = ref<CategoryRow[]>([]);

const handleSelectionChange = (selection: CategoryRow[]) => {
  selectedCategories.value = selection;
};

const buildDeleteConfirmMessage = (categories: CategoryRow[]) => {
  const bannerCount = categories.reduce(
    (total, category) => total + category.bannerCount,
    0
  );

  return `删除后将同步删除所选分类下的 ${bannerCount} 条广告，是否继续？`;
};

const handleDeleteSelected = async () => {
  if (selectedCategories.value.length === 0) return;

  const confirmed = await ElMessageBox.confirm(
    buildDeleteConfirmMessage(selectedCategories.value),
    "删除确认",
    {
      type: "warning",
      confirmButtonText: "确定删除",
      cancelButtonText: "取消"
    }
  )
    .then(() => true)
    .catch(() => false);

  if (!confirmed) return;

  deleteCategories(selectedCategories.value.map(item => item.id));
  selectedCategories.value = [];
  ElMessage.success("删除成功");
};

const handleDelete = async (row: CategoryRow) => {
  const confirmed = await ElMessageBox.confirm(
    buildDeleteConfirmMessage([row]),
    "删除确认",
    {
      type: "warning",
      confirmButtonText: "确定删除",
      cancelButtonText: "取消"
    }
  )
    .then(() => true)
    .catch(() => false);

  if (!confirmed) return;

  deleteCategories([row.id]);
  selectedCategories.value = selectedCategories.value.filter(
    item => item.id !== row.id
  );
  ElMessage.success("删除成功");
};

const handleRefresh = () => {
  ElMessage.success("刷新成功");
};

const handleEdit = (row: CategoryRow) => {
  router.push({
    path: "/banner/add-category",
    query: {
      id: row.id
    }
  });
};

const handleCopyCode = async (code: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    ElMessage.success("复制成功");
  } catch {
    ElMessage.error("复制失败");
  }
};
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>分类列表</span>
      </div>
    </template>
    <el-table
      :data="categoryRows"
      class="category-table"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="分类名称" />
      <el-table-column label="分类标识" width="180">
        <template #default="{ row }">
          <div class="code-cell">
            <span>{{ row.code }}</span>
            <el-button
              link
              type="primary"
              title="复制"
              @click="handleCopyCode(row.code)"
            >
              <IconifyIconOffline :icon="FileCopyLine" />
            </el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="bannerCount" label="广告数目" width="140" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <span
            :class="
              row.status === '启用' ? 'status-enabled' : 'status-disabled'
            "
          >
            {{ row.status }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button class="action-button" link @click="handleEdit(row)"
            >编辑</el-button
          >
          <el-button class="action-button" link @click="handleDelete(row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>
    <div class="table-actions">
      <el-button @click="handleRefresh">刷新</el-button>
      <el-button
        type="danger"
        :disabled="selectedCategories.length === 0"
        @click="handleDeleteSelected"
      >
        删除选中
      </el-button>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.category-table {
  .code-cell {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  :deep(.status-enabled) {
    color: var(--el-color-success);
  }

  :deep(.status-disabled) {
    color: var(--el-color-danger);
  }

  :deep(.action-button) {
    color: var(--el-text-color-secondary);
  }

  :deep(.el-table__header-wrapper th) {
    font-weight: 600;
    background-color: var(--el-fill-color-light);
  }
}

.table-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}
</style>
