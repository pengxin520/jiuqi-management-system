<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRoute, useRouter } from "vue-router";
import {
  deleteContents,
  getContentRows,
  getModuleCodeByPath,
  moduleContentDisplayGroupOptions,
  saveContent,
  type ModuleContentRow
} from "./data";

const route = useRoute();
const router = useRouter();
const moduleCode = computed(() => getModuleCodeByPath(route.path));
const selectedRows = ref<ModuleContentRow[]>([]);
const isSortEditing = ref(false);
const isPublishScheduleEditing = ref(false);
const sortDrafts = ref<Record<number, string>>({});
const sortSnapshot = ref<Record<number, number>>({});
const publishIntervalDays = ref(1);
const publishCount = ref(1);
const rows = computed(() => getContentRows(moduleCode.value));
const scheduledPublishRows = computed(() =>
  rows.value.filter(item => item.scheduledPublish)
);
const scheduledPublishFilterOptions = [
  { text: "是", value: "enabled" },
  { text: "否", value: "disabled" }
];
const isGroupDialogVisible = ref(false);
const groupDraft = ref<string[]>([]);

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

const handleSelectionChange = (selection: ModuleContentRow[]) => {
  selectedRows.value = selection;
};

const handleEdit = (row: ModuleContentRow) => {
  router.push({
    path: router.currentRoute.value.path.replace("content-list", "add-content"),
    query: { id: row.id }
  });
};

const handleDeleteSelected = () => {
  deleteContents(
    moduleCode.value,
    selectedRows.value.map(item => item.id)
  );
  selectedRows.value = [];
};

const handleDelete = (row: ModuleContentRow) => {
  deleteContents(moduleCode.value, [row.id]);
  selectedRows.value = selectedRows.value.filter(item => item.id !== row.id);
  ElMessage.success("删除成功");
};

const handleSavePublishSchedule = () => {
  isPublishScheduleEditing.value = false;
  ElMessage.success(
    `定时发布设置已保存：每隔 ${publishIntervalDays.value} 天发布 ${publishCount.value} 条`
  );
};

const handlePublishScheduleAction = () => {
  if (!isPublishScheduleEditing.value) {
    isPublishScheduleEditing.value = true;
    return;
  }

  handleSavePublishSchedule();
};

const filterScheduledPublish = (value: string, row: ModuleContentRow) =>
  value === (row.scheduledPublish ? "enabled" : "disabled");

const getCommonDisplayGroups = (selectedItems: ModuleContentRow[]) => {
  const [firstItem, ...restItems] = selectedItems;

  if (!firstItem) return [];

  return (firstItem.displayGroups ?? []).filter(group =>
    restItems.every(item => (item.displayGroups ?? []).includes(group))
  );
};

const handleOpenGroupDialog = () => {
  groupDraft.value = getCommonDisplayGroups(selectedRows.value);
  isGroupDialogVisible.value = true;
};

const handleConfirmGroupSetting = () => {
  selectedRows.value.forEach(row => {
    saveContent({
      ...row,
      moduleCode: moduleCode.value,
      displayGroups: [...groupDraft.value]
    });
  });

  isGroupDialogVisible.value = false;
  ElMessage.success("展示分组设置成功");
};

const normalizeSortValue = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const sortValue = Number(digits);

  return Number.isInteger(sortValue) && sortValue > 0 ? String(sortValue) : "";
};

const handleSortInput = (row: ModuleContentRow, value: string) => {
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

  changedItems.forEach(item => {
    saveContent({
      ...item.row,
      moduleCode: moduleCode.value,
      sort: item.value
    });
  });

  isSortEditing.value = false;
  syncSortDrafts();
  ElMessage.success("排序提交成功");
};

const handleSortAction = () => {
  if (!isSortEditing.value) {
    startSortEditing();
    return;
  }

  submitSort();
};
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>内容列表</span>
      </div>
    </template>

    <div class="publish-settings">
      <span class="publish-settings-title">定时发布设置</span>
      <span class="publish-settings-label">每隔</span>
      <el-input-number
        v-model="publishIntervalDays"
        class="publish-settings-input"
        :disabled="!isPublishScheduleEditing"
        :min="1"
        :max="365"
        controls-position="right"
      />
      <span class="publish-settings-label">天发布</span>
      <el-input-number
        v-model="publishCount"
        class="publish-settings-input"
        :disabled="!isPublishScheduleEditing"
        :min="1"
        :max="999"
        controls-position="right"
      />
      <span class="publish-settings-label">条</span>
      <el-tag type="info" effect="plain">
        剩余 {{ scheduledPublishRows.length }} 条待发布
      </el-tag>
      <el-button type="primary" @click="handlePublishScheduleAction">
        {{ isPublishScheduleEditing ? "保存设置" : "修改设置" }}
      </el-button>
    </div>

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
      <el-table-column prop="category" label="所属分类" width="160" />
      <el-table-column prop="name" label="内容标题" min-width="240" />
      <el-table-column label="预览图" width="140">
        <template #default="{ row }">
          <el-image
            v-if="row.image"
            :src="row.image"
            :alt="row.imageAlt"
            :title="row.imageTitle"
            class="preview-image"
            fit="cover"
            :preview-src-list="[row.image]"
            preview-teleported
          />
          <span v-else class="empty-image">暂无图片</span>
        </template>
      </el-table-column>
      <el-table-column
        label="定时发布"
        width="120"
        column-key="scheduledPublish"
        :filters="scheduledPublishFilterOptions"
        :filter-method="filterScheduledPublish"
        filter-placement="bottom-end"
      >
        <template #default="{ row }">
          <span
            :class="
              row.scheduledPublish ? 'scheduled-enabled' : 'scheduled-disabled'
            "
          >
            {{ row.scheduledPublish ? "是" : "否" }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="展示分组" min-width="180">
        <template #default="{ row }">
          <div v-if="row.displayGroups.length" class="display-groups-cell">
            <el-tag
              v-for="group in row.displayGroups"
              :key="group"
              effect="plain"
            >
              {{ group }}
            </el-tag>
          </div>
          <span v-else class="empty-group">未分组</span>
        </template>
      </el-table-column>
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
      <el-button
        type="danger"
        :disabled="selectedRows.length === 0"
        @click="handleDeleteSelected"
      >
        删除选中
      </el-button>
      <el-button
        :disabled="selectedRows.length === 0"
        @click="handleOpenGroupDialog"
      >
        设置分组
      </el-button>
      <el-button type="primary" @click="handleSortAction">
        {{ isSortEditing ? "提交排序" : "更改排序" }}
      </el-button>
    </div>

    <el-dialog
      v-model="isGroupDialogVisible"
      title="设置展示分组"
      width="420px"
    >
      <el-select
        v-model="groupDraft"
        multiple
        filterable
        allow-create
        default-first-option
        clearable
        collapse-tags
        collapse-tags-tooltip
        placeholder="请选择或输入展示分组"
        style="width: 100%"
      >
        <el-option
          v-for="group in moduleContentDisplayGroupOptions"
          :key="group"
          :label="group"
          :value="group"
        />
      </el-select>
      <template #footer>
        <el-button @click="isGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmGroupSetting">
          确定
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<style scoped lang="scss">
.publish-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 16px;
  background-color: var(--el-fill-color-extra-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.publish-settings-title {
  margin-right: 4px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.publish-settings-label {
  color: var(--el-text-color-regular);
}

.publish-settings-input {
  width: 112px;
}

.module-table {
  :deep(.preview-image) {
    width: 96px;
    height: 48px;
    border-radius: 4px;
  }

  :deep(.empty-image) {
    color: var(--el-text-color-secondary);
  }

  .display-groups-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  :deep(.empty-group) {
    color: var(--el-text-color-secondary);
  }

  :deep(.scheduled-enabled) {
    color: var(--el-color-primary);
  }

  :deep(.scheduled-disabled) {
    color: var(--el-text-color-secondary);
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
