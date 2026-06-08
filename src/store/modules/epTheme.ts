import { defineStore } from "pinia";
import {
  store,
  getConfig,
  storageLocal,
  responsiveStorageNameSpace
} from "../utils";

export const useEpThemeStore = defineStore("pure-epTheme", {
  state: () => ({
    epThemeColor:
      storageLocal().getItem<StorageConfigs>(
        `${responsiveStorageNameSpace()}layout`
      )?.epThemeColor ?? getConfig().EpThemeColor,
    epTheme:
      storageLocal().getItem<StorageConfigs>(
        `${responsiveStorageNameSpace()}layout`
      )?.theme ?? getConfig().Theme
  }),
  getters: {
    getEpThemeColor(state) {
      return state.epThemeColor;
    },
    /** 鐢ㄤ簬mix瀵艰埅妯″紡涓媓amburger-svg鐨刦ill灞炴€?*/
    fill(state) {
      if (state.epTheme === "light") {
        return "#FF9967";
      } else {
        return "#fff";
      }
    }
  },
  actions: {
    setEpThemeColor(newColor: string): void {
      const layout = storageLocal().getItem<StorageConfigs>(
        `${responsiveStorageNameSpace()}layout`
      );
      this.epTheme = layout?.theme;
      this.epThemeColor = newColor;
      if (!layout) return;
      layout.epThemeColor = newColor;
      storageLocal().setItem(`${responsiveStorageNameSpace()}layout`, layout);
    }
  }
});

export function useEpThemeStoreHook() {
  return useEpThemeStore(store);
}
