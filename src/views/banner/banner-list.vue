<script setup lang="ts">
import { ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { useRouter } from "vue-router";
import { bannerRows, deleteBanners, saveBanner, type BannerItem } from "./data";

const router = useRouter();
const selectedBanners = ref<BannerItem[]>([]);
const isSortEditing = ref(false);
const sortDrafts = ref<Record<number, string>>({});
const sortSnapshot = ref<Record<number, number>>({});
const imageSizeMap = ref<Record<number, { url: string; text: string }>>({});

const syncSortDrafts = (rows = bannerRows.value) => {
  sortDrafts.value = Object.fromEntries(
    rows.map(item => [item.id, String(item.sort)])
  );
};

const syncImageSizes = (rows = bannerRows.value) => {
  const rowIds = new Set(rows.map(item => item.id));

  Object.keys(imageSizeMap.value).forEach(id => {
    if (!rowIds.has(Number(id))) {
      delete imageSizeMap.value[Number(id)];
    }
  });

  rows.forEach(item => {
    if (!item.image) {
      imageSizeMap.value[item.id] = {
        url: "",
        text: "暂无尺寸"
      };
      return;
    }

    if (imageSizeMap.value[item.id]?.url === item.image) return;

    imageSizeMap.value[item.id] = {
      url: item.image,
      text: "读取中"
    };

    const image = new Image();

    image.onload = () => {
      if (imageSizeMap.value[item.id]?.url !== item.image) return;

      imageSizeMap.value[item.id] = {
        url: item.image,
        text: `${image.naturalWidth} × ${image.naturalHeight}px`
      };
    };

    image.onerror = () => {
      if (imageSizeMap.value[item.id]?.url !== item.image) return;

      imageSizeMap.value[item.id] = {
        url: item.image,
        text: "读取失败"
      };
    };

    image.src = item.image;
  });
};

watch(
  bannerRows,
  rows => {
    syncImageSizes(rows);

    if (!isSortEditing.value) {
      syncSortDrafts(rows);
      return;
    }

    const rowIds = new Set(rows.map(item => item.id));

    Object.keys(sortDrafts.value).forEach(id => {
      if (!rowIds.has(Number(id))) {
        delete sortDrafts.value[Number(id)];
      }
    });

    rows.forEach(item => {
      if (sortDrafts.value[item.id] === undefined) {
        sortDrafts.value[item.id] = String(item.sort);
      }
    });
  },
  {
    immediate: true
  }
);

const handleSelectionChange = (selection: BannerItem[]) => {
  selectedBanners.value = selection;
};

const handleDeleteSelected = () => {
  deleteBanners(selectedBanners.value.map(item => item.id));
  selectedBanners.value = [];
};

const handleRefresh = () => {
  isSortEditing.value = false;
  syncSortDrafts();
  syncImageSizes();
  sortSnapshot.value = {};
  ElMessage.success("刷新成功");
};

const handleEdit = (row: BannerItem) => {
  router.push({
    path: "/banner/add-banner",
    query: {
      id: row.id
    }
  });
};

const getLinkHref = (link: string) => {
  const trimmedLink = link.trim();

  if (!trimmedLink) return "";

  if (/^(https?:)?\/\//i.test(trimmedLink) || trimmedLink.startsWith("/")) {
    return trimmedLink;
  }

  return `https://${trimmedLink}`;
};

const normalizeSortValue = (value: string) => {
  const digits = value.replace(/\D/g, "");
  const sortValue = Number(digits);

  return Number.isInteger(sortValue) && sortValue > 0 ? String(sortValue) : "";
};

const handleSortInput = (row: BannerItem, value: string) => {
  sortDrafts.value[row.id] = normalizeSortValue(value);
};

const startSortEditing = () => {
  syncSortDrafts();
  sortSnapshot.value = Object.fromEntries(
    bannerRows.value.map(item => [item.id, item.sort])
  );
  isSortEditing.value = true;
};

const submitSort = () => {
  const sortValues = bannerRows.value.map(item => ({
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
      saveBanner({
        id: item.row.id,
        category: item.row.category,
        image: item.row.image,
        imageTitle: item.row.imageTitle,
        imageAlt: item.row.imageAlt,
        link: item.row.link,
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
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>广告列表</span>
      </div>
    </template>
    <el-table
      :data="bannerRows"
      class="banner-table"
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
      <el-table-column prop="category" label="所属分类" />
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
      <el-table-column label="尺寸" width="140">
        <template #default="{ row }">
          <span class="image-size">
            {{ imageSizeMap[row.id]?.text ?? "暂无尺寸" }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="link" label="跳转链接" min-width="240">
        <template #default="{ row }">
          <a
            v-if="row.link"
            class="banner-link"
            :href="getLinkHref(row.link)"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ row.link }}
          </a>
          <span v-else class="empty-link">暂无链接</span>
        </template>
      </el-table-column>
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
          <el-button class="action-button" link>删除</el-button>
        </template>
      </el-table-column>
    </el-table>
    <div class="table-actions">
      <el-button @click="handleRefresh">刷新</el-button>
      <el-button
        type="danger"
        :disabled="selectedBanners.length === 0"
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
.banner-table {
  :deep(.preview-image) {
    width: 96px;
    height: 48px;
    border-radius: 4px;
  }

  :deep(.empty-image) {
    color: var(--el-text-color-secondary);
  }

  :deep(.image-size) {
    color: var(--el-text-color-secondary);
  }

  :deep(.banner-link) {
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--el-text-color-regular);
    white-space: nowrap;
  }

  :deep(.empty-link) {
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
