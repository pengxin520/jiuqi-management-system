import { computed, ref } from "vue";

export type BannerStatus = "启用" | "禁用";

export interface CategoryItem {
  id: number;
  name: string;
  code: string;
  sort: number;
  status: BannerStatus;
}

export interface CategoryRow extends CategoryItem {
  bannerCount: number;
}

export interface BannerItem {
  id: number;
  category: string;
  image: string;
  imageTitle?: string;
  imageAlt?: string;
  link: string;
  sort: number;
  status: BannerStatus;
}

export const categories = ref<CategoryItem[]>([]);
export const banners = ref<BannerItem[]>([]);

let nextCategoryId = 1;
let nextBannerId = 1;

export const categoryRows = computed<CategoryRow[]>(() =>
  categories.value
    .map(category => ({
      ...category,
      bannerCount: banners.value.filter(
        banner => banner.category === category.name
      ).length
    }))
    .sort((first, second) => first.sort - second.sort || first.id - second.id)
);

export const bannerRows = computed<BannerItem[]>(() =>
  [...banners.value].sort(
    (first, second) => first.sort - second.sort || first.id - second.id
  )
);

export const getCategoryById = (id: number) => {
  return categories.value.find(category => category.id === id);
};

export const getNextCategorySort = () => {
  return (
    categories.value.reduce(
      (maxSort, category) => Math.max(maxSort, category.sort),
      0
    ) + 1
  );
};

export const saveCategory = (
  category: Omit<CategoryItem, "id"> & { id?: number }
) => {
  if (category.id) {
    const target = getCategoryById(category.id);

    if (target) {
      Object.assign(target, category);
      return target;
    }
  }

  const newCategory = {
    ...category,
    id: nextCategoryId++
  };

  categories.value.push(newCategory);
  return newCategory;
};

export const deleteCategories = (ids: number[]) => {
  const selectedIds = new Set(ids);
  const selectedCategoryNames = new Set(
    categories.value
      .filter(category => selectedIds.has(category.id))
      .map(category => category.name)
  );

  categories.value = categories.value.filter(
    category => !selectedIds.has(category.id)
  );
  banners.value = banners.value.filter(
    banner => !selectedCategoryNames.has(banner.category)
  );
};

export const getBannerById = (id: number) => {
  return banners.value.find(banner => banner.id === id);
};

export const getNextBannerSort = () => {
  return (
    banners.value.reduce(
      (maxSort, banner) => Math.max(maxSort, banner.sort),
      0
    ) + 1
  );
};

export const saveBanner = (
  banner: Omit<BannerItem, "id"> & { id?: number }
) => {
  if (banner.id) {
    const target = getBannerById(banner.id);

    if (target) {
      Object.assign(target, banner);
      return target;
    }
  }

  const newBanner = {
    ...banner,
    id: nextBannerId++
  };

  banners.value.push(newBanner);
  return newBanner;
};

export const deleteBanners = (ids: number[]) => {
  const selectedIds = new Set(ids);
  banners.value = banners.value.filter(banner => !selectedIds.has(banner.id));
};
