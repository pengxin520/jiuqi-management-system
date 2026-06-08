<script setup lang="ts">
import { storageLocal } from "@pureadmin/utils";
import { reactive, ref } from "vue";
import { message } from "@/utils/message";
import Delete from "~icons/ep/delete";
import ZoomIn from "~icons/ep/zoom-in";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";

type SiteSettingsStorage = {
  domain?: string;
};

const siteSettingsStorageKey = "site-settings";
const siteSettings =
  storageLocal().getItem<SiteSettingsStorage>(siteSettingsStorageKey) ?? {};

const form = reactive({
  name: "",
  domain: siteSettings.domain ?? "",
  support: "KSJQ",
  icon: "",
  iconTitle: "",
  iconAlt: "",
  language: "中文"
});
const iconInfo = reactive({
  fileSize: "",
  width: 0,
  height: 0
});
const previewVisible = ref(false);
const previewImageUrl = ref("");
const iconAcceptExtensions = [".ico", ".png", ".svg"];
const maxIconSize = 10 * 1024;
let iconDimensionToken = 0;

const blurCurrentTarget = (event?: MouseEvent) => {
  (event?.currentTarget as HTMLElement | null)?.blur();
};

const clearActiveFocus = (event?: Event) => {
  event?.preventDefault();

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const formatFileSize = (size = 0) => {
  if (size < 1024) return `${size} B`;

  return `${(size / 1024).toFixed(size % 1024 === 0 ? 0 : 1)} KB`;
};

const resetIconInfo = () => {
  iconInfo.fileSize = "";
  iconInfo.width = 0;
  iconInfo.height = 0;
};

const loadIconDimensions = (url: string) => {
  const currentToken = ++iconDimensionToken;
  const image = new Image();

  image.onload = () => {
    if (currentToken !== iconDimensionToken) return;

    iconInfo.width = image.naturalWidth;
    iconInfo.height = image.naturalHeight;
  };

  image.onerror = () => {
    if (currentToken !== iconDimensionToken) return;

    iconInfo.width = 0;
    iconInfo.height = 0;
  };

  image.src = url;
};

const handleIconUpload = (file: any) => {
  console.log("处理上传图片", file);
  const rawFile = file.raw ?? file;
  const fileName = rawFile.name ?? "";
  const extension = fileName
    ? `.${fileName.split(".").pop()?.toLowerCase()}`
    : "";

  if (!iconAcceptExtensions.includes(extension)) {
    message("仅支持 .ico、.png、.svg 格式", { type: "warning" });
    return false;
  }

  if ((rawFile.size ?? 0) > maxIconSize) {
    message("文件大小不能超过 10KB", { type: "warning" });
    return false;
  }

  if (form.icon.startsWith("blob:")) URL.revokeObjectURL(form.icon);
  form.icon = URL.createObjectURL(rawFile);
  iconInfo.fileSize = formatFileSize(rawFile.size ?? 0);
  iconInfo.width = 0;
  iconInfo.height = 0;
  loadIconDimensions(form.icon);
  return false;
};

const handlePreviewIcon = (event?: MouseEvent) => {
  if (!form.icon) return;
  blurCurrentTarget(event);
  previewImageUrl.value = form.icon;
  previewVisible.value = true;
};

const handleRemoveIcon = () => {
  if (form.icon.startsWith("blob:")) URL.revokeObjectURL(form.icon);
  form.icon = "";
  form.iconTitle = "";
  form.iconAlt = "";
  previewImageUrl.value = "";
  iconDimensionToken++;
  resetIconInfo();
};

const handleIconTitleInput = (value: string) => {
  form.iconTitle = value;
  form.iconAlt = value;
};

const handleIconAltInput = (value: string) => {
  form.iconAlt = value;
  form.iconTitle = value;
};

const handleConfirm = () => {
  storageLocal().setItem(siteSettingsStorageKey, {
    ...siteSettings,
    domain: form.domain.trim()
  });
  console.log("表单提交", form);
  // 这里可以添加表单验证和提交逻辑
  message("修改成功", { type: "success" });
};
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>站点设置</span>
      </div>
    </template>
    <el-form :model="form" label-width="auto" style="max-width: 600px">
      <el-form-item label="网站名称">
        <el-input v-model="form.name" placeholder="请输入网站名称" />
      </el-form-item>
      <el-form-item label="网站地址">
        <el-input v-model="form.domain" placeholder="请输入网站域名" />
      </el-form-item>
      <el-form-item label="网站图标">
        <div class="icon-upload-field">
          <el-upload
            class="icon-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="handleIconUpload"
            accept=".ico,.png,.svg"
          >
            <div v-if="form.icon" class="icon-preview">
              <img
                :src="form.icon"
                :alt="form.iconAlt"
                :title="form.iconTitle"
                class="icon"
              />
              <div class="icon-preview-actions">
                <el-button
                  class="icon-action-button"
                  link
                  :icon="useRenderIcon(ZoomIn)"
                  aria-label="预览网站图标"
                  title="预览"
                  @click.stop.prevent="handlePreviewIcon($event)"
                />
                <el-button
                  class="icon-action-button"
                  link
                  :icon="useRenderIcon(Delete)"
                  aria-label="删除网站图标"
                  title="删除"
                  @click.stop.prevent="handleRemoveIcon"
                />
              </div>
            </div>
            <span v-else class="icon-upload-plus" aria-hidden="true" />
          </el-upload>
          <div v-if="form.icon" class="icon-upload-meta">
            <span>图片大小：{{ iconInfo.fileSize }}</span>
            <span v-if="iconInfo.width && iconInfo.height">
              图片尺寸：{{ iconInfo.width }} × {{ iconInfo.height }}px
            </span>
            <span v-else>图片尺寸：读取中</span>
          </div>
          <div v-if="form.icon" class="icon-seo-fields">
            <el-input
              :model-value="form.iconTitle"
              class="icon-seo-input"
              placeholder="图片 title"
              @input="handleIconTitleInput"
            >
              <template #prepend>Title</template>
            </el-input>
            <el-input
              :model-value="form.iconAlt"
              class="icon-seo-input"
              placeholder="图片 alt"
              @input="handleIconAltInput"
            >
              <template #prepend>Alt</template>
            </el-input>
          </div>
          <div class="icon-upload-tip">
            前台 favicon 图标，仅支持 <b>.ico、.png、.svg</b> 格式，最大不超过
            <b>10KB</b> ，不限制尺寸
          </div>
        </div>
      </el-form-item>
      <el-form-item label="技术支持">
        <el-input v-model="form.support" placeholder="请输入技术支持" />
      </el-form-item>
      <el-form-item label="选择语言">
        <el-select v-model="form.language" style="width: 200px">
          <el-option label="中文" value="中文" />
          <el-option label="英文" value="英文" />
          <el-option label="俄语" value="俄语" />
        </el-select>
      </el-form-item>
    </el-form>
    <div class="form-actions">
      <el-button type="primary" @click="handleConfirm">确定提交</el-button>
    </div>
    <el-dialog
      v-model="previewVisible"
      title="网站图标预览"
      width="360px"
      @close-auto-focus="clearActiveFocus"
    >
      <div class="icon-dialog-preview">
        <img v-if="previewImageUrl" :src="previewImageUrl" alt="网站图标预览" />
      </div>
    </el-dialog>
  </el-card>
</template>

<style scoped lang="scss">
.icon-upload-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.icon-uploader {
  --icon-uploader-size: 80px;

  width: var(--icon-uploader-size);
  height: var(--icon-uploader-size);

  :deep(.el-upload) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--icon-uploader-size);
    height: var(--icon-uploader-size);
    overflow: hidden;
    cursor: pointer;
    background-color: #fff;
    border: 1px dashed var(--el-color-primary);
    border-radius: 8px;
    transition: var(--el-transition-duration-fast);
  }

  :deep(.el-upload:hover) {
    background-color: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary);
  }
}

.icon-upload-plus {
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

.icon-preview {
  position: relative;
  width: var(--icon-uploader-size);
  height: var(--icon-uploader-size);
}

.icon-preview-actions {
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

.icon-preview:hover .icon-preview-actions {
  opacity: 1;
}

.icon-action-button {
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

.icon-upload-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.icon-upload-meta {
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

.icon-seo-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: min(100%, 520px);
  margin-top: 10px;
}

.icon-seo-input {
  :deep(.el-input-group__prepend) {
    width: 54px;
    padding: 0 10px;
    color: var(--el-text-color-regular);
    text-align: center;
    background-color: var(--el-fill-color-lighter);
  }
}

.icon {
  width: var(--icon-uploader-size);
  height: var(--icon-uploader-size);
  object-fit: cover;
}

.icon-dialog-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 180px;

  img {
    max-width: 100%;
    max-height: 320px;
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
