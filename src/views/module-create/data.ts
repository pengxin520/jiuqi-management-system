import { ref } from "vue";

export type ModuleCategoryStatus = "enabled" | "disabled";

export interface ModuleCategoryItem {
  id: number;
  moduleCode: string;
  name: string;
  code: string;
  sort: number;
  status: ModuleCategoryStatus;
}

export interface ModuleCategoryRow
  extends Omit<ModuleCategoryItem, "moduleCode"> {
  contentCount: number;
}

export type ModuleContentStatus = "enabled" | "disabled";

export type ModuleContentDetailType =
  | "text"
  | "textarea"
  | "image"
  | "video"
  | "file";

export interface ModuleContentDetail {
  type: ModuleContentDetailType;
  value: string;
  links?: ModuleContentTitleLink[];
  name?: string;
  title?: string;
  alt?: string;
  fileSize?: string;
  width?: number;
  height?: number;
}

export interface ModuleContentTitleLink {
  text: string;
  url: string;
}

export interface ModuleContentItem {
  id: number;
  moduleCode: string;
  category: string;
  name: string;
  nameLinks?: ModuleContentTitleLink[];
  image: string;
  imageTitle?: string;
  imageAlt?: string;
  imageFileSize?: string;
  imageWidth?: number;
  imageHeight?: number;
  sort: number;
  displayGroups: string[];
  scheduledPublish: boolean;
  status: ModuleContentStatus;
  title: string;
  keywords: string[];
  description: string;
  contentDetails: ModuleContentDetail[];
}

export type ModuleContentRow = Omit<ModuleContentItem, "moduleCode">;

export const categories = ref<ModuleCategoryItem[]>([]);
export const contents = ref<ModuleContentItem[]>([]);
export const moduleContentDisplayGroupOptions = ref<string[]>([]);

let nextCategoryId = 1;
let nextContentId = 1;

export const getModuleCodeByPath = (path: string) => {
  return path.split("/").filter(Boolean)[0] || "module";
};

export const getCategoryRows = (moduleCode: string): ModuleCategoryRow[] => {
  return categories.value
    .filter(category => category.moduleCode === moduleCode)
    .map(category => {
      const { moduleCode: _moduleCode, ...categoryRow } = category;

      return {
        ...categoryRow,
        sort: getCategorySort(category),
        contentCount: contents.value.filter(
          content =>
            content.moduleCode === moduleCode &&
            content.category === category.name
        ).length
      };
    })
    .sort((first, second) => first.sort - second.sort || first.id - second.id);
};

export const getContentRows = (moduleCode: string): ModuleContentRow[] => {
  return contents.value
    .filter(content => content.moduleCode === moduleCode)
    .map(content => {
      const { moduleCode: _moduleCode, ...contentRow } = content;

      return {
        ...contentRow,
        displayGroups: [...(content.displayGroups ?? [])],
        sort: getContentSort(content)
      };
    })
    .sort((first, second) => first.sort - second.sort || first.id - second.id);
};

export const getCategoryById = (moduleCode: string, id: number) => {
  return categories.value.find(
    category => category.moduleCode === moduleCode && category.id === id
  );
};

export const getContentById = (moduleCode: string, id: number) => {
  return contents.value.find(
    content => content.moduleCode === moduleCode && content.id === id
  );
};

export const isCategoryCodeUsed = (
  moduleCode: string,
  code: string,
  excludeId?: number
) => {
  return categories.value.some(
    category =>
      category.moduleCode === moduleCode &&
      category.code === code &&
      category.id !== excludeId
  );
};

const getCategorySort = (category: Pick<ModuleCategoryItem, "id" | "sort">) => {
  return Number.isInteger(category.sort) && category.sort > 0
    ? category.sort
    : category.id;
};

const getContentSort = (content: Pick<ModuleContentItem, "id" | "sort">) => {
  return Number.isInteger(content.sort) && content.sort > 0
    ? content.sort
    : content.id;
};

export const getNextCategorySort = (moduleCode: string) => {
  return (
    categories.value
      .filter(category => category.moduleCode === moduleCode)
      .reduce(
        (maxSort, category) => Math.max(maxSort, getCategorySort(category)),
        0
      ) + 1
  );
};

export const getNextContentSort = (moduleCode: string) => {
  return (
    contents.value
      .filter(content => content.moduleCode === moduleCode)
      .reduce(
        (maxSort, content) => Math.max(maxSort, getContentSort(content)),
        0
      ) + 1
  );
};

type SaveModuleCategoryPayload = Omit<ModuleCategoryItem, "id" | "sort"> & {
  id?: number;
  sort?: number;
};

export const saveCategory = (category: SaveModuleCategoryPayload) => {
  if (category.id) {
    const target = getCategoryById(category.moduleCode, category.id);

    if (target) {
      Object.assign(target, {
        ...category,
        sort: category.sort ?? getCategorySort(target)
      });
      return target;
    }
  }

  const newCategory = {
    ...category,
    sort: category.sort ?? getNextCategorySort(category.moduleCode),
    id: nextCategoryId++
  };

  categories.value.push(newCategory);
  return newCategory;
};

type SaveModuleContentPayload = Omit<
  ModuleContentItem,
  "id" | "sort" | "displayGroups"
> & {
  id?: number;
  sort?: number;
  displayGroups?: string[];
};

export const ensureContentDisplayGroups = (groups: string[]) => {
  const existingGroups = new Set(moduleContentDisplayGroupOptions.value);
  const normalizedGroups = Array.from(
    new Set(groups.map(group => group.trim()).filter(Boolean))
  );

  normalizedGroups.forEach(group => {
    if (!existingGroups.has(group)) {
      moduleContentDisplayGroupOptions.value.push(group);
      existingGroups.add(group);
    }
  });

  return normalizedGroups;
};

const cloneContentPayload = (content: SaveModuleContentPayload) => ({
  ...content,
  displayGroups: ensureContentDisplayGroups(content.displayGroups ?? []),
  nameLinks:
    content.nameLinks?.map(link => ({
      text: link.text.trim(),
      url: link.url.trim()
    })) ?? [],
  keywords: [...content.keywords],
  contentDetails: content.contentDetails.map(detail => ({
    ...detail,
    links:
      detail.links?.map(link => ({
        text: link.text.trim(),
        url: link.url.trim()
      })) ?? []
  }))
});

export const saveContent = (content: SaveModuleContentPayload) => {
  if (content.id) {
    const target = getContentById(content.moduleCode, content.id);

    if (target) {
      Object.assign(target, {
        ...cloneContentPayload(content),
        sort: content.sort ?? getContentSort(target)
      });
      return target;
    }
  }

  const newContent = {
    ...cloneContentPayload(content),
    sort: content.sort ?? getNextContentSort(content.moduleCode),
    id: nextContentId++
  };

  contents.value.push(newContent);
  return newContent;
};

export const deleteCategories = (moduleCode: string, ids: number[]) => {
  const selectedIds = new Set(ids);

  categories.value = categories.value.filter(
    category =>
      category.moduleCode !== moduleCode || !selectedIds.has(category.id)
  );
};

export const deleteContents = (moduleCode: string, ids: number[]) => {
  const selectedIds = new Set(ids);

  contents.value = contents.value.filter(
    content => content.moduleCode !== moduleCode || !selectedIds.has(content.id)
  );
};
