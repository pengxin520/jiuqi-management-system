<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRoute, useRouter } from "vue-router";
import FileCopyLine from "~icons/ri/file-copy-line";
import {
  deleteCategories,
  getCategoryRows,
  getModuleCodeByPath,
  saveCategory,
  type ModuleCategoryRow
} from "./data";

const route = useRoute();
const router = useRouter();
const moduleCode = computed(() => getModuleCodeByPath(route.path));
const selectedRows = ref<ModuleCategoryRow[]>([]);
const isSortEditing = ref(false);
const sortDrafts = ref<Record<number, string>>({});
const sortSnapshot = ref<Record<number, number>>({});
const rows = computed(() => getCategoryRows(moduleCode.value));

const syncSortDrafts = (currentRows = rows.value) => {
  sortDrafts.value = Object.fromEntries(
    currentRows.map(item => [item.id, String(item.sort)])
  );
};

watch(
  rows,
  currentRows => {
    if (!isSortEditing.value) {
      syncSortDrafts(currentRows);
      return;
    }

    const rowIds = new Set(currentRows.map(item => item.id));

    Object.keys(sortDrafts.value).forEach(id => {
      if (!rowIds.has(Number(id))) {
        delete sortDrafts.value[Number(id)];
      }
    });

    currentRows.forEach(item => {
      if (sortDrafts.value[item.id] === undefined) {
        sortDrafts.value[item.id] = String(item.sort);
      }
    });
  },
  {
    immediate: true
  }
);

const handleSelectionChange = (selection: ModuleCategoryRow[]) => {
  selectedRows.value = selection;
};

const handleEdit = (row: ModuleCategoryRow) => {
  router.push({
    path: router.currentRoute.value.path.replace(
      "category-list",
      "add-category"
    ),
    query: { id: row.id }
  });
};

const handleDeleteSelected = () => {
  deleteCategories(
    moduleCode.value,
    selectedRows.value.map(item => item.id)
  );
  selectedRows.value = [];
};

const handleDelete = (row: ModuleCategoryRow) => {
  deleteCategories(moduleCode.value, [row.id]);
  selectedRows.value = selectedRows.value.filter(item => item.id !== row.id);
  ElMessage.success("删除成功");
};

const handleRefresh = () => {
  isSortEditing.value = false;
  syncSortDrafts();
  sortSnapshot.value = {};
  ElMessage.success("刷新成功");
};

const normalizeSortValue = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const sortValue = Number(digits);

  return Number.isInteger(sortValue) && sortValue > 0 ? String(sortValue) : "";
};

const handleSortInput = (row: ModuleCategoryRow, value: string) => {
  sortDrafts.value[row.id] = normalizeSortValue(value);
};

const startSortEditing = () => {
  syncSortDrafts();
  sortSnapshot.value = Object.fromEntries(
    rows.value.map(item => [item.id, item.sort])
  );
  isSortEditing.value = true;
};

const submitSort = () => {
  const sortValues = rows.value.map(item => ({
    row: item,
    value: Number(sortDrafts.value[item.id])
  }));
  const invalidItem = sortValues.find(
    item => !Number.isInteger(item.value) || item.value <= 0
  );

  if (invalidItem) {
    ElMessage.error("排序必须是大于 0 的整数");
    return;
  }

  const changedItems = sortValues.filter(
    item => item.value !== sortSnapshot.value[item.row.id]
  );

  if (changedItems.length === 0) {
    isSortEditing.value = false;
    ElMessage.info("排序未发生变化");
    return;
  }

  try {
    changedItems.forEach(item => {
      saveCategory({
        id: item.row.id,
        moduleCode: moduleCode.value,
        name: item.row.name,
        code: item.row.code,
        sort: item.value,
        status: item.row.status
      });
    });

    isSortEditing.value = false;
    syncSortDrafts();
    ElMessage.success("排序提交成功");
  } catch {
    ElMessage.error("排序提交失败，请稍后重试");
  }
};

const handleSortAction = () => {
  if (!isSortEditing.value) {
    startSortEditing();
    return;
  }

  submitSort();
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
      :data="rows"
      class="module-table"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="sort" label="排序" width="160" sortable>
        <template #default="{ row }">
          <el-input
            class="sort-input"
            :disabled="!isSortEditing"
            :model-value="sortDrafts[row.id]"
            inputmode="numeric"
            @input="value => handleSortInput(row, value)"
          />
        </template>
      </el-table-column>
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
      <el-table-column prop="contentCount" label="内容数量" width="140" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <span
            :class="
              row.status === 'enabled' ? 'status-enabled' : 'status-disabled'
            "
          >
            {{ row.status === "enabled" ? "启用" : "禁用" }}
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
        :disabled="selectedRows.length === 0"
        @click="handleDeleteSelected"
      >
        删除选中
      </el-button>
      <el-button type="primary" @click="handleSortAction">
        {{ isSortEditing ? "提交排序" : "更改排序" }}
      </el-button>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
.module-table {
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

  :deep(.sort-input) {
    width: 80px;
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
