<script setup lang="ts">
import { storageLocal } from "@pureadmin/utils";
import { ElMessage, ElMessageBox } from "element-plus";
import FileCopyLine from "~icons/ri/file-copy-line";
import { computed, ref } from "vue";

type SiteSettingsStorage = {
  domain?: string;
};

type ModuleRoute = {
  path?: string;
  name?: string;
  redirect?: string;
  meta?: {
    title?: string;
    shortTitle?: string;
  };
  children?: unknown[];
};

type ModuleRow = {
  name: string;
  shortTitle: string;
  code: string;
  href: string;
  url: string;
};

const moduleCreatedRoutesKey = "module-created-routes";
const siteSettingsStorageKey = "site-settings";
const selectedRows = ref<ModuleRow[]>([]);
const moduleRoutes = ref<ModuleRoute[]>(
  storageLocal().getItem<ModuleRoute[]>(moduleCreatedRoutesKey) ?? []
);
const siteDomainPrefix = ref(getSiteDomainPrefix());

function normalizeSiteDomain(value = "") {
  return value.trim().replace(/\/+$/, "");
}

function ensureLinkProtocol(value = "") {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  return `https://${value}`;
}

function getSiteDomainPrefix() {
  const siteSettings =
    storageLocal().getItem<SiteSettingsStorage>(siteSettingsStorageKey) ?? {};

  return normalizeSiteDomain(siteSettings.domain ?? "");
}

function buildModuleUrl(prefix: string, code: string) {
  const normalizedPrefix = normalizeSiteDomain(prefix);
  const suffix = `/${code}/`;

  return normalizedPrefix ? `${normalizedPrefix}${suffix}` : suffix;
}

const rows = computed<ModuleRow[]>(() => {
  return moduleRoutes.value.map(route => {
    const code = String(route.path ?? "").slice(1);
    const url = buildModuleUrl(siteDomainPrefix.value, code);

    return {
      name: String(route.meta?.title ?? route.name ?? ""),
      shortTitle: String(route.meta?.shortTitle ?? ""),
      code,
      href: ensureLinkProtocol(url),
      url
    };
  });
});

function saveRoutes(routes: ModuleRoute[]) {
  moduleRoutes.value = routes;
  storageLocal().setItem(moduleCreatedRoutesKey, routes);
}

function refreshList() {
  moduleRoutes.value =
    storageLocal().getItem<ModuleRoute[]>(moduleCreatedRoutesKey) ?? [];
  siteDomainPrefix.value = getSiteDomainPrefix();
  selectedRows.value = [];
}

function handleSelectionChange(selection: ModuleRow[]) {
  selectedRows.value = selection;
}

async function handleDelete(row: ModuleRow) {
  try {
    await ElMessageBox.confirm(`确定删除“${row.name}”吗？`, "删除确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning"
    });
  } catch {
    return;
  }

  saveRoutes(moduleRoutes.value.filter(route => route.path !== "/" + row.code));
  selectedRows.value = selectedRows.value.filter(
    item => item.code !== row.code
  );
  ElMessage.success("删除成功");
}

async function handleDeleteSelected() {
  if (selectedRows.value.length === 0) {
    return;
  }

  try {
    await ElMessageBox.confirm(
      `确定删除选中的 ${selectedRows.value.length} 个模块吗？`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning"
      }
    );
  } catch {
    return;
  }

  const selectedCodes = selectedRows.value.map(item => item.code);
  saveRoutes(
    moduleRoutes.value.filter(
      route => !selectedCodes.includes(String(route.path ?? "").slice(1))
    )
  );
  selectedRows.value = [];
  ElMessage.success("删除成功");
}

async function handleCopyCode(code: string) {
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
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>模块列表</span>
      </div>
    </template>

    <el-table
      :data="rows"
      class="module-table"
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="模块名称" />
      <el-table-column prop="shortTitle" label="模块短称" />
      <el-table-column label="模块代码">
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
      <el-table-column label="默认跳转">
        <template #default="{ row }">
          <a :href="row.href" target="_blank" rel="noopener noreferrer">
            {{ row.url }}
          </a>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button class="action-button" link @click="handleDelete(row)"
            >删除</el-button
          >
        </template>
      </el-table-column>
    </el-table>

    <div class="table-actions">
      <el-button @click="refreshList">刷新</el-button>
      <el-button
        type="danger"
        :disabled="selectedRows.length === 0"
        @click="handleDeleteSelected"
      >
        删除选中
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
