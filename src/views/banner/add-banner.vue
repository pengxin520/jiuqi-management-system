<script setup lang="ts">
import { storageLocal } from "@pureadmin/utils";
import { computed, reactive, ref } from "vue";
import {
  ElMessage,
  type FormInstance,
  type FormRules,
  type UploadProps
} from "element-plus";
import { useRoute, useRouter } from "vue-router";
import Delete from "~icons/ep/delete";
import ZoomIn from "~icons/ep/zoom-in";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import {
  categories,
  getBannerById,
  getNextBannerSort,
  saveBanner,
  type BannerStatus
} from "./data";

type SiteSettingsStorage = {
  domain?: string;
};

const siteSettingsStorageKey = "site-settings";

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();

const editId = computed(() => Number(route.query.id) || undefined);
const editBanner = computed(() =>
  editId.value ? getBannerById(editId.value) : undefined
);

const normalizeSiteDomain = (value = "") => value.trim().replace(/\/+$/, "");
const normalizeLinkSuffix = (value = "") => value.trim().replace(/^\/+/, "");

const buildBannerLink = (prefix: string, suffix: string) => {
  const normalizedPrefix = normalizeSiteDomain(prefix);
  const normalizedSuffix = normalizeLinkSuffix(suffix);

  if (!normalizedPrefix) return normalizedSuffix;
  if (!normalizedSuffix) return normalizedPrefix;

  return `${normalizedPrefix}/${normalizedSuffix}`;
};

const extractLinkSuffix = (link: string, prefix: string) => {
  const normalizedLink = link.trim();
  const normalizedPrefix = normalizeSiteDomain(prefix);

  if (!normalizedLink || !normalizedPrefix) return normalizedLink;
  if (normalizedLink === normalizedPrefix) return "";
  if (normalizedLink.startsWith(`${normalizedPrefix}/`)) {
    return normalizedLink.slice(normalizedPrefix.length + 1);
  }
  if (normalizedLink.startsWith(normalizedPrefix)) {
    return normalizedLink.slice(normalizedPrefix.length).replace(/^\/+/, "");
  }

  return normalizedLink;
};

const siteSettings =
  storageLocal().getItem<SiteSettingsStorage>(siteSettingsStorageKey) ?? {};
const siteDomainDisplay = String(siteSettings.domain ?? "").trim();
const siteDomainPrefix = normalizeSiteDomain(siteDomainDisplay);

const form = reactive({
  category: editBanner.value?.category ?? "",
  image: editBanner.value?.image ?? "",
  imageTitle: editBanner.value?.imageTitle ?? "",
  imageAlt: editBanner.value?.imageAlt ?? "",
  link: extractLinkSuffix(editBanner.value?.link ?? "", siteDomainPrefix),
  sort: editBanner.value?.sort ?? getNextBannerSort(),
  status: (editBanner.value?.status ?? "启用") as BannerStatus
});

const rules = reactive<FormRules<typeof form>>({
  category: [{ required: true, message: "请选择所属分类", trigger: "change" }],
  image: [{ required: true, message: "请上传图片", trigger: "change" }]
});

const imageMeta = reactive({
  width: 0,
  height: 0,
  fileSize: ""
});
const previewVisible = ref(false);
const previewImageUrl = ref("");

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
};

const loadImageSize = (url: string) => {
  const image = new Image();

  image.onload = () => {
    imageMeta.width = image.naturalWidth;
    imageMeta.height = image.naturalHeight;
  };

  image.onerror = () => {
    imageMeta.width = 0;
    imageMeta.height = 0;
  };

  image.src = url;
};

if (form.image) {
  loadImageSize(form.image);
}

const handleImageUpload: UploadProps["beforeUpload"] = file => {
  if (form.image.startsWith("blob:")) URL.revokeObjectURL(form.image);
  form.image = URL.createObjectURL(file);
  imageMeta.fileSize = formatFileSize(file.size);
  imageMeta.width = 0;
  imageMeta.height = 0;
  loadImageSize(form.image);
  formRef.value?.validateField("image").catch(() => undefined);

  return false;
};

const blurCurrentTarget = (event?: MouseEvent) => {
  (event?.currentTarget as HTMLElement | null)?.blur();
};

const clearActiveFocus = (event?: Event) => {
  event?.preventDefault();

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const goToSiteSettings = () => {
  router.push("/base/site").catch(() => undefined);
};

const handlePreviewImage = (event?: MouseEvent) => {
  if (!form.image) return;
  blurCurrentTarget(event);
  previewImageUrl.value = form.image;
  previewVisible.value = true;
};

const handleRemoveImage = () => {
  if (form.image.startsWith("blob:")) URL.revokeObjectURL(form.image);
  form.image = "";
  form.imageTitle = "";
  form.imageAlt = "";
  imageMeta.width = 0;
  imageMeta.height = 0;
  imageMeta.fileSize = "";
  previewImageUrl.value = "";
  formRef.value?.validateField("image").catch(() => undefined);
};

const handleImageTitleInput = (value: string) => {
  form.imageTitle = value;
  form.imageAlt = value;
};

const handleImageAltInput = (value: string) => {
  form.imageAlt = value;
  form.imageTitle = value;
};

const resetForm = () => {
  form.category = "";
  form.image = "";
  form.imageTitle = "";
  form.imageAlt = "";
  form.link = "";
  form.sort = getNextBannerSort();
  form.status = "启用" as BannerStatus;
  imageMeta.width = 0;
  imageMeta.height = 0;
  imageMeta.fileSize = "";
  previewVisible.value = false;
  previewImageUrl.value = "";
  formRef.value?.clearValidate();
};

const handleConfirm = async () => {
  const valid = await formRef.value?.validate().catch(() => false);

  if (!valid) {
    ElMessage.error("请先完善表单后再提交");
    return;
  }

  saveBanner({
    id: editId.value,
    category: form.category,
    image: form.image,
    imageTitle: form.imageTitle,
    imageAlt: form.imageAlt,
    link: buildBannerLink(siteDomainPrefix, form.link),
    sort: editId.value ? form.sort : getNextBannerSort(),
    status: form.status
  });

  await router.replace({ path: route.path, query: {} }).catch(() => undefined);
  resetForm();

  ElMessage.success(editId.value ? "Banner 修改成功" : "Banner 添加成功");
};
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>{{ editId ? "编辑广告" : "添加广告" }}</span>
      </div>
    </template>
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
      style="max-width: 600px"
    >
      <el-form-item label="所属分类" prop="category">
        <el-select v-model="form.category" style="width: 200px">
          <el-option
            v-for="category in categories"
            :key="category.id"
            :label="category.name"
            :value="category.name"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="上传图片" prop="image">
        <div class="banner-upload-content">
          <el-upload
            class="banner-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleImageUpload"
            accept="image/*"
          >
            <div v-if="form.image" class="banner-preview">
              <img
                :src="form.image"
                :alt="form.imageAlt"
                :title="form.imageTitle"
                class="banner-image"
              />
              <div class="banner-preview-actions">
                <el-button
                  class="banner-action-button"
                  link
                  :icon="useRenderIcon(ZoomIn)"
                  aria-label="预览上传图片"
                  title="预览"
                  @click.stop.prevent="handlePreviewImage($event)"
                />
                <el-button
                  class="banner-action-button"
                  link
                  :icon="useRenderIcon(Delete)"
                  aria-label="删除上传图片"
                  title="删除"
                  @click.stop.prevent="handleRemoveImage"
                />
              </div>
            </div>
            <span v-else class="banner-upload-plus" aria-hidden="true" />
          </el-upload>

          <div v-if="form.image" class="banner-image-meta">
            <span v-if="imageMeta.fileSize">
              图片大小：{{ imageMeta.fileSize }}
            </span>
            <span v-if="imageMeta.width && imageMeta.height">
              图片尺寸：{{ imageMeta.width }} x {{ imageMeta.height }}px
            </span>
            <span v-else>图片尺寸：读取中</span>
          </div>

          <div v-if="form.image" class="banner-image-seo-fields">
            <el-input
              :model-value="form.imageTitle"
              class="banner-image-seo-input"
              placeholder="图片 title"
              @input="handleImageTitleInput"
            >
              <template #prepend>Title</template>
            </el-input>
            <el-input
              :model-value="form.imageAlt"
              class="banner-image-seo-input"
              placeholder="图片 alt"
              @input="handleImageAltInput"
            >
              <template #prepend>Alt</template>
            </el-input>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="跳转链接">
        <div class="banner-link-field">
          <div v-if="!siteDomainPrefix" class="banner-link-prefix">
            <span class="banner-link-prefix-label">
              请先在
              <el-link
                type="primary"
                :underline="false"
                @click="goToSiteSettings"
              >
                基础设置 &gt; 站点设置
              </el-link>
              中配置网站地址
            </span>
          </div>

          <el-input
            v-model="form.link"
            placeholder="请输入跳转路径，如 product/"
            class="banner-link-suffix-input"
          >
            <template #prepend>{{ siteDomainDisplay || "/" }}</template>
          </el-input>
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

    <el-dialog
      v-model="previewVisible"
      title="图片预览"
      width="520px"
      @close-auto-focus="clearActiveFocus"
    >
      <div class="banner-dialog-preview">
        <img v-if="previewImageUrl" :src="previewImageUrl" alt="上传图片预览" />
      </div>
    </el-dialog>
  </el-card>
</template>

<style scoped lang="scss">
.banner-uploader {
  --banner-uploader-width: 180px;
  --banner-uploader-height: 90px;

  width: var(--banner-uploader-width);
  height: var(--banner-uploader-height);

  :deep(.el-upload) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--banner-uploader-width);
    height: var(--banner-uploader-height);
    overflow: hidden;
    cursor: pointer;
    background-color: #fff;
    border: 1px dashed var(--el-border-color);
    border-radius: 6px;
    transition: var(--el-transition-duration-fast);
  }

  :deep(.el-upload:hover) {
    border-color: var(--el-color-primary);
  }
}

.banner-upload-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.banner-image-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 20px;

  > span {
    padding: 2px 8px;
    color: #2f6f73;
    background-color: #eef8f7;
    border: 1px solid #d4ebee;
    border-radius: 4px;
  }
}

.banner-image-seo-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: min(100%, 520px);
  margin-top: 2px;
}

.banner-image-seo-input {
  :deep(.el-input-group__prepend) {
    width: 54px;
    padding: 0 10px;
    color: var(--el-text-color-regular);
    text-align: center;
    background-color: var(--el-fill-color-lighter);
  }
}

.banner-link-field {
  display: grid;
  gap: 10px;
  width: min(100%, 600px);
}

.banner-link-prefix {
  padding: 0 12px;
  background: #fff8eb;
  border: 1px solid #f3d19e;
  border-radius: 6px;
}

.banner-link-prefix-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);

  :deep(.el-link) {
    vertical-align: baseline;
  }

  :deep(.el-link__inner) {
    font-size: 12px;
  }
}

.banner-link-suffix-input {
  width: 100%;

  :deep(.el-input-group__prepend) {
    padding: 0 12px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-light);
    white-space: nowrap;
  }
}

.banner-upload-plus {
  position: relative;
  display: block;
  width: 14px;
  height: 14px;

  &::before,
  &::after {
    position: absolute;
    content: "";
    background-color: #8c939d;
    border-radius: 999px;
  }

  &::before {
    top: 6px;
    left: 0;
    width: 14px;
    height: 1px;
  }

  &::after {
    top: 0;
    left: 6px;
    width: 1px;
    height: 14px;
  }
}

.banner-preview {
  position: relative;
  width: var(--banner-uploader-width);
  height: var(--banner-uploader-height);
}

.banner-preview-actions {
  position: absolute;
  inset: 0;
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  background-color: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: opacity var(--el-transition-duration-fast);
}

.banner-preview:hover .banner-preview-actions {
  opacity: 1;
}

.banner-action-button {
  width: 24px;
  height: 24px;
  padding: 0;
  margin-left: 0 !important;
  font-size: 16px;
  color: #fff;

  &:hover,
  &:focus {
    color: #fff;
    background-color: rgb(255 255 255 / 18%);
  }
}

.banner-image {
  display: block;
  width: var(--banner-uploader-width);
  height: var(--banner-uploader-height);
  object-fit: cover;
}

.banner-dialog-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 260px;

  img {
    max-width: 100%;
    max-height: 520px;
    object-fit: contain;
  }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color);
}
</style>
