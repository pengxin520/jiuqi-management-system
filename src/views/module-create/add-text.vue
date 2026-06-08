<script setup lang="ts">
import { storageLocal } from "@pureadmin/utils";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { computed, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Delete from "~icons/ep/delete";
import ZoomIn from "~icons/ep/zoom-in";
import { useRenderIcon } from "@/components/ReIcon/src/hooks";
import {
  getContentById,
  getContentRows,
  getModuleCodeByPath,
  saveContent,
  type ModuleContentDetail,
  type ModuleContentTitleLink,
  type ModuleContentStatus
} from "./data";

interface TitleSegment {
  key: string;
  text: string;
  url?: string;
}

type SiteSettingsStorage = {
  domain?: string;
};

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const previewVisible = ref(false);
const previewImageUrl = ref("");
const editId = computed(() => Number(route.query.id) || undefined);
const defaultKeywordCount = 8;
const moduleCode = computed(() => getModuleCodeByPath(route.path));
const getDefaultKeywords = () => Array(defaultKeywordCount).fill("");
const siteSettingsStorageKey = "site-settings";
const getDefaultTitleLinkUrl = () =>
  (
    storageLocal().getItem<SiteSettingsStorage>(siteSettingsStorageKey)
      ?.domain ?? ""
  ).trim();
const createTitleLink = (): ModuleContentTitleLink => ({
  text: "",
  url: getDefaultTitleLinkUrl()
});
const normalizeTitleLinks = (links: ModuleContentTitleLink[]) =>
  links
    .map(link => ({
      text: link.text.trim(),
      url: link.url.trim()
    }))
    .filter(link => link.text && link.url);
const buildTitleSegments = (
  title: string,
  links: ModuleContentTitleLink[]
): TitleSegment[] => {
  if (!title) return [];

  const normalizedLinks = normalizeTitleLinks(links);

  if (normalizedLinks.length === 0) {
    return [{ key: "plain-0", text: title }];
  }

  const segments: TitleSegment[] = [];
  let cursor = 0;
  let segmentIndex = 0;

  while (cursor < title.length) {
    let nextMatch:
      | {
          index: number;
          link: ModuleContentTitleLink;
        }
      | undefined;

    normalizedLinks.forEach(link => {
      const matchIndex = title.indexOf(link.text, cursor);
      if (matchIndex === -1) return;

      if (
        !nextMatch ||
        matchIndex < nextMatch.index ||
        (matchIndex === nextMatch.index &&
          link.text.length > nextMatch.link.text.length)
      ) {
        nextMatch = { index: matchIndex, link };
      }
    });

    if (!nextMatch) {
      segments.push({
        key: `plain-${segmentIndex++}`,
        text: title.slice(cursor)
      });
      break;
    }

    if (nextMatch.index > cursor) {
      segments.push({
        key: `plain-${segmentIndex++}`,
        text: title.slice(cursor, nextMatch.index)
      });
    }

    segments.push({
      key: `link-${segmentIndex++}`,
      text: nextMatch.link.text,
      url: nextMatch.link.url
    });
    cursor = nextMatch.index + nextMatch.link.text.length;
  }

  return segments;
};
const isLinkableDetail = (
  detail: ModuleContentDetail
): detail is ModuleContentDetail & { type: "text" | "textarea" } =>
  detail.type === "text" || detail.type === "textarea";
const getInvalidLinkedTextMessage = (
  links: ModuleContentTitleLink[],
  value: string,
  label: string
) => {
  const hasIncompleteLink = links.some(link => {
    const text = link.text.trim();
    const url = link.url.trim();

    return Boolean(text) !== Boolean(url);
  });

  if (hasIncompleteLink) {
    return `${label}的链接文字和跳转地址需要同时填写`;
  }

  const normalizedLinks = normalizeTitleLinks(links);
  const linkTexts = new Set<string>();
  const duplicateLink = normalizedLinks.find(link => {
    if (linkTexts.has(link.text)) return true;
    linkTexts.add(link.text);
    return false;
  });

  if (duplicateLink) {
    return `${label}的链接文字“${duplicateLink.text}”重复，请只保留一条`;
  }

  const missingTextLink = normalizedLinks.find(link => !value.includes(link.text));

  if (missingTextLink) {
    return `${label}中未找到“${missingTextLink.text}”`;
  }

  return "";
};
const currentContent = computed(() => {
  if (editId.value) {
    return getContentById(moduleCode.value, editId.value);
  }

  return getContentRows(moduleCode.value)[0];
});

const form = reactive({
  name: "",
  nameLinks: [] as ModuleContentTitleLink[],
  contentDetails: [] as ModuleContentDetail[],
  title: "",
  keywords: getDefaultKeywords(),
  description: "",
  status: "enabled" as ModuleContentStatus
});

watch(
  currentContent,
  content => {
    form.name = content?.name ?? "";
    form.nameLinks = content?.nameLinks?.map(link => ({ ...link })) ?? [];
    form.contentDetails =
      content?.contentDetails.map(detail => ({
        ...detail,
        links: detail.links?.map(link => ({ ...link })) ?? []
      })) ?? [];

    form.contentDetails.forEach(detail => {
      if (detail.type !== "image" || !detail.value) return;
      if (detail.width && detail.height) return;
      loadImageDimensions(detail.value, detail);
    });

    form.title = content?.title ?? "";
    form.keywords = content?.keywords?.length
      ? [...content.keywords]
      : getDefaultKeywords();
    form.description = content?.description ?? "";
    form.status = content?.status ?? "enabled";
  },
  {
    immediate: true
  }
);

const rules: FormRules = {
  title: [{ required: true, message: "请输入标题", trigger: "blur" }],
  name: [{ required: true, message: "请输入内容标题", trigger: "blur" }]
};
const titlePreviewSegments = computed(() =>
  buildTitleSegments(form.name, form.nameLinks)
);

const getInvalidTitleLinkMessage = () =>
  getInvalidLinkedTextMessage(form.nameLinks, form.name, "内容标题");

const getInvalidContentDetailLinkMessage = () => {
  for (const [index, detail] of form.contentDetails.entries()) {
    if (!isLinkableDetail(detail)) continue;

    const message = getInvalidLinkedTextMessage(
      detail.links ?? [],
      detail.value,
      `内容详情${index + 1}`
    );

    if (message) return message;
  }

  return "";
};

function formatFileSize(size = 0) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(size % 1024 === 0 ? 0 : 1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function resetImageInfo(target: ModuleContentDetail) {
  target.fileSize = "";
  target.width = 0;
  target.height = 0;
}

function loadImageDimensions(url: string, target: ModuleContentDetail) {
  const image = new Image();

  image.onload = () => {
    target.width = image.naturalWidth;
    target.height = image.naturalHeight;
  };

  image.onerror = () => {
    target.width = 0;
    target.height = 0;
  };

  image.src = url;
}

const blurCurrentTarget = (event?: MouseEvent) => {
  (event?.currentTarget as HTMLElement | null)?.blur();
};

const clearActiveFocus = (event?: Event) => {
  event?.preventDefault();

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
};

const handlePreviewUploadedImage = (imageUrl: string, event?: MouseEvent) => {
  if (!imageUrl) return;
  blurCurrentTarget(event);
  previewImageUrl.value = imageUrl;
  previewVisible.value = true;
};

const handleRemoveContentDetailUpload = (detail: ModuleContentDetail) => {
  if (detail.value.startsWith("blob:")) URL.revokeObjectURL(detail.value);
  detail.value = "";
  detail.name = "";
  detail.title = "";
  detail.alt = "";
  resetImageInfo(detail);
};

function handleContentDetailUpload(detail: ModuleContentDetail, file: any) {
  const rawFile = file.raw ?? file;
  if (detail.value.startsWith("blob:")) URL.revokeObjectURL(detail.value);
  detail.value = URL.createObjectURL(rawFile);
  detail.name = rawFile.name ?? "";
  detail.fileSize = formatFileSize(rawFile.size ?? 0);
  detail.width = 0;
  detail.height = 0;

  if (detail.type === "image") {
    loadImageDimensions(detail.value, detail);
  }

  return false;
}

function handleDetailImageTitleInput(detail: ModuleContentDetail, value: string) {
  detail.title = value;
  detail.alt = value;
}

function handleDetailImageAltInput(detail: ModuleContentDetail, value: string) {
  detail.alt = value;
  detail.title = value;
}

function handleAddContentDetail(type: ModuleContentDetail["type"]) {
  form.contentDetails.push({
    type,
    value: "",
    links: [],
    name: "",
    title: "",
    alt: ""
  });
}

function handleAddTextDetail() {
  handleAddContentDetail("text");
}

function handleAddTextareaDetail() {
  handleAddContentDetail("textarea");
}

function handleAddImageDetail() {
  handleAddContentDetail("image");
}

function handleAddVideoDetail() {
  handleAddContentDetail("video");
}

function handleAddFileDetail() {
  handleAddContentDetail("file");
}

function handleRemoveContentDetail(index: number) {
  const [detail] = form.contentDetails.splice(index, 1);
  if (detail?.value.startsWith("blob:")) URL.revokeObjectURL(detail.value);
}

function handleAddKeyword() {
  form.keywords.push("");
}

function handleRemoveKeyword(index: number) {
  if (index < defaultKeywordCount) return;
  form.keywords.splice(index, 1);
}

function handleAddTitleLink() {
  form.nameLinks.push(createTitleLink());
}

function handleRemoveTitleLink(index: number) {
  form.nameLinks.splice(index, 1);
}

function handleAddDetailLink(detail: ModuleContentDetail) {
  if (!isLinkableDetail(detail)) return;
  detail.links = detail.links ?? [];
  detail.links.push(createTitleLink());
}

function handleRemoveDetailLink(detail: ModuleContentDetail, index: number) {
  if (!isLinkableDetail(detail) || !detail.links) return;
  detail.links.splice(index, 1);
}

function getDetailPreviewSegments(detail: ModuleContentDetail) {
  return buildTitleSegments(detail.value, detail.links ?? []);
}

async function handleConfirm() {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  const invalidTitleLinkMessage = getInvalidTitleLinkMessage();
  if (invalidTitleLinkMessage) {
    ElMessage.error(invalidTitleLinkMessage);
    return;
  }

  const invalidContentDetailLinkMessage = getInvalidContentDetailLinkMessage();
  if (invalidContentDetailLinkMessage) {
    ElMessage.error(invalidContentDetailLinkMessage);
    return;
  }

  const savedContent = saveContent({
    id: currentContent.value?.id,
    moduleCode: moduleCode.value,
    category: "",
    name: form.name,
    nameLinks: normalizeTitleLinks(form.nameLinks),
    image: "",
    imageTitle: "",
    imageAlt: "",
    imageFileSize: "",
    imageWidth: 0,
    imageHeight: 0,
    title: form.title,
    keywords: form.keywords,
    description: form.description,
    displayGroups: [],
    contentDetails: form.contentDetails,
    scheduledPublish: false,
    status: form.status
  });

  ElMessage.success(currentContent.value?.id ? "保存成功" : "添加成功");
  router.replace({
    path: route.path,
    query: { id: String(savedContent.id) }
  });
}
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>{{ currentContent?.id ? "编辑内容" : "添加内容" }}</span>
      </div>
    </template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="auto"
      class="content-form"
      style="max-width: 760px"
    >
      <el-divider content-position="left">SEO设置</el-divider>
      <el-form-item label="标题" prop="title" class="seo-form-item">
        <el-input v-model="form.title" placeholder="请输入网站标题" />
      </el-form-item>
      <el-form-item label="关键词" class="keyword-form-item">
        <div class="keywords-wrapper">
          <div
            v-for="(item, index) in form.keywords"
            :key="index"
            class="keyword-item"
          >
            <el-input
              v-model="form.keywords[index]"
              class="keyword-input"
              placeholder="关键词"
            >
              <template #suffix>
                <el-button
                  v-if="index >= defaultKeywordCount"
                  class="keyword-delete-button"
                  type="danger"
                  link
                  :icon="useRenderIcon(Delete)"
                  :aria-label="`删除关键词${index + 1}`"
                  :title="`删除关键词${index + 1}`"
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
            添加关键词
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

      <el-divider content-position="left">基本信息</el-divider>
      <el-form-item label="内容标题" prop="name">
        <div class="title-link-field">
          <el-input v-model="form.name" placeholder="请输入内容标题" />
          <div class="title-link-editor">
            <div
              v-for="(link, index) in form.nameLinks"
              :key="`title-link-${index}`"
              class="title-link-row"
            >
              <el-input
                v-model="link.text"
                class="title-link-input"
                placeholder="需要加链接的标题文字"
              />
              <el-input
                v-model="link.url"
                class="title-link-input"
                placeholder="请输入跳转地址"
              />
              <el-button
                class="title-link-remove-button"
                type="danger"
                link
                @click="handleRemoveTitleLink(index)"
              >
                删除
              </el-button>
            </div>
            <div class="title-link-toolbar">
              <el-button class="title-link-add-button" @click="handleAddTitleLink">
                添加标题链接
              </el-button>
              <span class="title-link-tip">
                配置后会按标题中的匹配片段生成跳转预览
              </span>
            </div>
            <div class="title-link-preview">
              <span class="title-link-preview-label">标题预览</span>
              <p class="title-link-preview-text">
                <template v-if="titlePreviewSegments.length">
                  <template
                    v-for="segment in titlePreviewSegments"
                    :key="segment.key"
                  >
                    <a
                      v-if="segment.url"
                      :href="segment.url"
                      class="title-link-preview-anchor"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ segment.text }}
                    </a>
                    <span v-else>{{ segment.text }}</span>
                  </template>
                </template>
                <span v-else class="title-link-preview-empty">
                  请输入内容标题后预览
                </span>
              </p>
            </div>
          </div>
        </div>
      </el-form-item>
      <el-form-item
        v-for="(detail, index) in form.contentDetails"
        :key="index"
        :label="`内容详情${index + 1}`"
      >
        <div class="content-detail-item">
          <div
            v-if="detail.type === 'text' || detail.type === 'textarea'"
            class="content-detail-rich-field"
          >
            <el-input
              v-if="detail.type === 'text'"
              v-model="detail.value"
              placeholder="请输入单行文本"
            />
            <el-input
              v-else
              v-model="detail.value"
              type="textarea"
              :rows="4"
              placeholder="请输入多行文本"
            />
            <div class="title-link-editor detail-link-editor">
              <div
                v-for="(link, linkIndex) in detail.links"
                :key="`detail-link-${index}-${linkIndex}`"
                class="title-link-row"
              >
                <el-input
                  v-model="link.text"
                  class="title-link-input"
                  placeholder="需要加链接的文本内容"
                />
                <el-input
                  v-model="link.url"
                  class="title-link-input"
                  placeholder="请输入跳转地址"
                />
                <el-button
                  class="title-link-remove-button"
                  type="danger"
                  link
                  @click="handleRemoveDetailLink(detail, linkIndex)"
                >
                  删除
                </el-button>
              </div>
              <div class="title-link-toolbar">
                <el-button
                  class="title-link-add-button"
                  @click="handleAddDetailLink(detail)"
                >
                  添加文本链接
                </el-button>
                <span class="title-link-tip">
                  配置后会按当前文本中的匹配片段生成跳转预览
                </span>
              </div>
              <div class="title-link-preview">
                <span class="title-link-preview-label">文本预览</span>
                <p class="title-link-preview-text">
                  <template v-if="getDetailPreviewSegments(detail).length">
                    <template
                      v-for="segment in getDetailPreviewSegments(detail)"
                      :key="segment.key"
                    >
                      <a
                        v-if="segment.url"
                        :href="segment.url"
                        class="title-link-preview-anchor"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ segment.text }}
                      </a>
                      <span v-else>{{ segment.text }}</span>
                    </template>
                  </template>
                  <span v-else class="title-link-preview-empty">
                    请输入文本内容后预览
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div
            v-else-if="detail.type === 'image'"
            class="content-detail-image-field"
          >
            <div class="content-detail-image-row">
              <el-upload
                class="content-image-uploader detail-image-uploader"
                action="#"
                :show-file-list="false"
                :before-upload="file => handleContentDetailUpload(detail, file)"
                accept="image/*"
              >
                <div v-if="detail.value" class="content-image-preview">
                  <img
                    :src="detail.value"
                    :alt="detail.alt"
                    :title="detail.title"
                    class="content-image"
                  />
                  <div class="content-image-preview-actions">
                    <el-button
                      class="content-image-action-button"
                      link
                      :icon="useRenderIcon(ZoomIn)"
                      aria-label="预览内容详情图片"
                      title="预览"
                      @click.stop.prevent="
                        handlePreviewUploadedImage(detail.value, $event)
                      "
                    />
                    <el-button
                      class="content-image-action-button"
                      link
                      :icon="useRenderIcon(Delete)"
                      aria-label="删除内容详情图片"
                      title="删除"
                      @click.stop.prevent="
                        handleRemoveContentDetailUpload(detail)
                      "
                    />
                  </div>
                </div>
                <span
                  v-else
                  class="content-image-upload-plus"
                  aria-hidden="true"
                />
              </el-upload>
              <el-button
                class="content-detail-delete-button"
                type="danger"
                link
                @click="handleRemoveContentDetail(index)"
              >
                删除
              </el-button>
            </div>
            <div v-if="detail.value" class="content-image-upload-meta">
              <span>图片大小：{{ detail.fileSize || "未知" }}</span>
              <span v-if="detail.width && detail.height">
                图片尺寸：{{ detail.width }} × {{ detail.height }}px
              </span>
              <span v-else>图片尺寸：读取中</span>
            </div>
            <div v-if="detail.value" class="image-seo-fields">
              <el-input
                :model-value="detail.title"
                class="image-seo-input"
                placeholder="图片 title"
                @input="value => handleDetailImageTitleInput(detail, value)"
              >
                <template #prepend>Title</template>
              </el-input>
              <el-input
                :model-value="detail.alt"
                class="image-seo-input"
                placeholder="图片 alt"
                @input="value => handleDetailImageAltInput(detail, value)"
              >
                <template #prepend>Alt</template>
              </el-input>
            </div>
          </div>
          <el-upload
            v-else-if="detail.type === 'video'"
            class="detail-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="file => handleContentDetailUpload(detail, file)"
            accept="video/*"
          >
            <video
              v-if="detail.value"
              :src="detail.value"
              class="detail-media"
              controls
            />
            <div v-else class="detail-upload-placeholder">上传视频</div>
          </el-upload>
          <el-upload
            v-else
            class="detail-file-uploader"
            action="#"
            :show-file-list="false"
            :before-upload="file => handleContentDetailUpload(detail, file)"
          >
            <el-button>选择文件</el-button>
            <span v-if="detail.name" class="detail-file-name">
              {{ detail.name }}
            </span>
          </el-upload>
          <el-button
            v-if="detail.type !== 'image'"
            class="content-detail-delete-button"
            type="danger"
            link
            @click="handleRemoveContentDetail(index)"
          >
            删除
          </el-button>
        </div>
      </el-form-item>
      <el-form-item label=" ">
        <div class="content-action-buttons">
          <el-button
            class="content-action-button text-button"
            @click="handleAddTextDetail"
          >
            添加单行文本
          </el-button>
          <el-button
            class="content-action-button textarea-button"
            @click="handleAddTextareaDetail"
          >
            添加多行文本
          </el-button>
          <el-button
            class="content-action-button image-button"
            @click="handleAddImageDetail"
          >
            添加上传图片
          </el-button>
          <el-button
            class="content-action-button video-button"
            @click="handleAddVideoDetail"
          >
            添加上传视频
          </el-button>
          <el-button
            class="content-action-button file-button"
            @click="handleAddFileDetail"
          >
            添加上传文件
          </el-button>
        </div>
      </el-form-item>

      <el-divider content-position="left">发布设置</el-divider>
      <el-form-item label="状态">
        <el-select v-model="form.status" style="width: 200px">
          <el-option label="启用" value="enabled" />
          <el-option label="禁用" value="disabled" />
        </el-select>
      </el-form-item>
    </el-form>

    <div class="form-actions">
      <el-button type="primary" @click="handleConfirm">
        {{ currentContent?.id ? "保存修改" : "确定添加" }}
      </el-button>
    </div>
    <el-dialog
      v-model="previewVisible"
      title="内容图片预览"
      width="520px"
      @close-auto-focus="clearActiveFocus"
    >
      <div class="content-image-dialog-preview">
        <img v-if="previewImageUrl" :src="previewImageUrl" alt="内容图片预览" />
      </div>
    </el-dialog>
  </el-card>
</template>

<style scoped lang="scss">
.content-detail-image-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.content-detail-image-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.content-image-uploader {
  --content-image-uploader-width: 180px;
  --content-image-uploader-height: 90px;

  width: var(--content-image-uploader-width);
  height: var(--content-image-uploader-height);

  :deep(.el-upload) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--content-image-uploader-width);
    height: var(--content-image-uploader-height);
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

.content-image-upload-plus {
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

.content-image {
  display: block;
  width: var(--content-image-uploader-width);
  height: var(--content-image-uploader-height);
  object-fit: cover;
}

.content-image-preview {
  position: relative;
  width: var(--content-image-uploader-width);
  height: var(--content-image-uploader-height);
}

.content-image-preview-actions {
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

.content-image-preview:hover .content-image-preview-actions {
  opacity: 1;
}

.content-image-action-button {
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

.content-image-dialog-preview {
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

.content-image-upload-meta {
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

.image-seo-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: min(100%, 520px);
  margin-top: 10px;
}

.image-seo-input {
  :deep(.el-input-group__prepend) {
    width: 54px;
    padding: 0 10px;
    color: var(--el-text-color-regular);
    text-align: center;
    background-color: var(--el-fill-color-lighter);
  }
}

.content-detail-item {
  display: flex;
  gap: 12px;
  align-items: center;
  width: 100%;

  :deep(.el-input),
  :deep(.el-textarea) {
    flex: 1;
  }
}

.content-detail-rich-field {
  flex: 1;
  min-width: 0;
}

.content-detail-rich-field + .content-detail-delete-button {
  align-self: flex-start;
  margin-top: 6px;
}

.detail-link-editor {
  margin-top: 12px;
}

.title-link-field {
  width: min(100%, 640px);
}

.title-link-editor {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.title-link-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) auto;
  gap: 12px;
  align-items: center;
}

.title-link-input {
  width: 100%;
}

.title-link-remove-button {
  margin-left: 0 !important;
  white-space: nowrap;
}

.title-link-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: center;
}

.title-link-add-button {
  margin-left: 0 !important;
  color: #4f7f6f;
  background-color: #eef6f3;
  border-color: #c8ddd5;

  &:hover,
  &:focus {
    color: #426a5d;
    background-color: #e2eee9;
    border-color: #bdd5cc;
  }
}

.title-link-tip {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.title-link-preview {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.title-link-preview-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.title-link-preview-text {
  margin: 0;
  line-height: 1.7;
  color: var(--el-text-color-primary);
  word-break: break-word;
}

.title-link-preview-anchor {
  color: var(--el-color-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.title-link-preview-empty {
  color: var(--el-text-color-placeholder);
}

.content-detail-delete-button {
  align-self: center;
  margin-left: 0 !important;
  white-space: nowrap;
}

.detail-uploader {
  position: relative;
  display: flex;
  flex: 0 0 180px;
  align-items: center;
  justify-content: center;
  width: 180px;
  height: 90px;
  overflow: hidden;
  cursor: pointer;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  transition: var(--el-transition-duration-fast);

  &:hover {
    border-color: var(--el-color-primary);
  }
}

.detail-media {
  width: 180px;
  height: 90px;
  object-fit: cover;
}

.detail-upload-placeholder {
  font-size: 14px;
  color: #8c939d;
}

.detail-file-uploader {
  display: flex;
  flex: 0 1 auto;
  justify-content: flex-start;
  min-width: 0;

  :deep(.el-upload) {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: flex-start;
    width: auto;
    max-width: 100%;
    text-align: left;
  }
}

.detail-file-name {
  display: inline-block;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.content-action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.content-action-button {
  margin-left: 0 !important;
  color: var(--button-color);
  white-space: nowrap;
  background-color: var(--button-bg);
  border-color: var(--button-border);

  &:hover,
  &:focus {
    color: var(--button-color);
    background-color: var(--button-hover-bg);
    border-color: var(--button-border);
  }
}

.text-button {
  --button-bg: #eef6f3;
  --button-hover-bg: #e2eee9;
  --button-border: #c8ddd5;
  --button-color: #4f7f6f;
}

.textarea-button {
  --button-bg: #f1f4fa;
  --button-hover-bg: #e5eaf4;
  --button-border: #ccd6e8;
  --button-color: #5d6f91;
}

.image-button {
  --button-bg: #f6f1e8;
  --button-hover-bg: #eee4d2;
  --button-border: #dfcfb1;
  --button-color: #8a6f3d;
}

.video-button {
  --button-bg: #f4eff7;
  --button-hover-bg: #eadff0;
  --button-border: #d7c5e1;
  --button-color: #7a6388;
}

.file-button {
  --button-bg: #f2f3f0;
  --button-hover-bg: #e7e9e3;
  --button-border: #d2d6cb;
  --button-color: #6d745f;
}

.keywords-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
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

:deep(.el-divider) {
  margin: 64px 0 40px;
}

:deep(.el-divider:first-child) {
  margin-top: 0;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  margin-top: 20px;
  border-top: 1px solid var(--el-border-color);
}
</style>
