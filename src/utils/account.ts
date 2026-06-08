import { storageLocal } from "@pureadmin/utils";

export type PermissionAction = "view" | "create" | "edit";

export interface PermissionMenu {
  key: string;
  label: string;
  children: Array<{
    key: string;
    label: string;
  }>;
}

export interface AccountSettings {
  masterName: string;
  masterPassword: string;
  masterLastLoginTime: string;
  masterLastLoginIp: string;
  adminName: string;
  adminPassword: string;
  permissionAccount: "admin";
  permissionMatrix: Record<string, PermissionAction[]>;
  permissionStatus: boolean;
}

type ModuleRoute = {
  path?: string;
  name?: string;
  meta?: {
    title?: string;
  };
  children?: Array<{
    path?: string;
    name?: string;
    meta?: {
      title?: string;
    };
  }>;
};

type PermissionRoute = {
  path?: string;
  children?: PermissionRoute[];
};

export const accountSettingsKey = "base-account-settings";

const moduleCreatedRoutesKey = "module-created-routes";

const fixedPermissionMenus: PermissionMenu[] = [
  {
    key: "home",
    label: "首页",
    children: [{ key: "home.welcome", label: "首页" }]
  },
  {
    key: "base",
    label: "基础设置",
    children: [
      { key: "base.site", label: "站点设置" },
      { key: "base.seo", label: "SEO设置" },
      { key: "base.data", label: "数据设置" },
      { key: "base.account", label: "账号设置" }
    ]
  },
  {
    key: "module",
    label: "模块管理",
    children: [
      { key: "module.create", label: "创建新模块" },
      { key: "module.list", label: "模块列表" }
    ]
  },
  {
    key: "banner",
    label: "广告中心",
    children: [
      { key: "banner.categoryList", label: "分类列表" },
      { key: "banner.addCategory", label: "添加分类" },
      { key: "banner.bannerList", label: "广告列表" },
      { key: "banner.addBanner", label: "添加广告" }
    ]
  }
];

function getCreatedModuleMenus(): PermissionMenu[] {
  const moduleRoutes =
    storageLocal().getItem<ModuleRoute[]>(moduleCreatedRoutesKey) ?? [];

  return moduleRoutes.map(route => {
    const moduleCode = String(route.path ?? "").replace(/^\//, "");
    const menuKey = moduleCode || String(route.name ?? "");

    return {
      key: `created.${menuKey}`,
      label: String(route.meta?.title ?? route.name ?? menuKey),
      children: (route.children ?? []).map(child => ({
        key: `created.${menuKey}.${String(
          child.path ?? child.name ?? ""
        ).replace(/^\//, "")}`,
        label: String(child.meta?.title ?? child.name ?? child.path ?? "")
      }))
    };
  });
}

export function getPermissionMenus(): PermissionMenu[] {
  return [
    fixedPermissionMenus[0],
    fixedPermissionMenus[1],
    fixedPermissionMenus[3],
    fixedPermissionMenus[2],
    ...getCreatedModuleMenus()
  ];
}

export function createDefaultPermissionMatrix() {
  return getPermissionMenus().reduce<Record<string, PermissionAction[]>>(
    (matrix, menu) => {
      matrix[menu.key] = ["view"];
      menu.children.forEach(child => {
        matrix[child.key] = ["view"];
      });
      return matrix;
    },
    {}
  );
}

export function getAccountSettings(): AccountSettings {
  const saved =
    storageLocal().getItem<Partial<AccountSettings>>(accountSettingsKey);
  const defaultMatrix = createDefaultPermissionMatrix();

  return {
    masterName: saved?.masterName ?? "master",
    masterPassword: saved?.masterPassword ?? "KSJQ0708",
    masterLastLoginTime: saved?.masterLastLoginTime ?? "",
    masterLastLoginIp: saved?.masterLastLoginIp ?? "",
    adminName: saved?.adminName ?? "admin",
    adminPassword: saved?.adminPassword ?? "KSJQ1234",
    permissionAccount: "admin",
    permissionMatrix: {
      ...defaultMatrix,
      ...(saved?.permissionMatrix ?? {})
    },
    permissionStatus: saved?.permissionStatus ?? true
  };
}

export function saveAccountSettings(settings: AccountSettings) {
  storageLocal().setItem(accountSettingsKey, settings);
}

function formatLoginTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") +
    " " +
    [
      pad(date.getHours()),
      pad(date.getMinutes()),
      pad(date.getSeconds())
    ].join(":");
}

function detectCurrentLoginIp() {
  const hostname = globalThis.location?.hostname?.trim();
  if (!hostname) return "";
  if (hostname === "localhost") return "127.0.0.1";

  const segments = hostname.split(".");
  const isIpv4 =
    segments.length === 4 &&
    segments.every(
      part =>
        /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255
    );

  if (isIpv4) return hostname;
  return hostname.includes(":") ? hostname : "";
}

export function recordMasterLoginInfo() {
  const settings = getAccountSettings();
  saveAccountSettings({
    ...settings,
    permissionMatrix: { ...settings.permissionMatrix },
    masterLastLoginTime: formatLoginTime(new Date()),
    masterLastLoginIp:
      detectCurrentLoginIp() || settings.masterLastLoginIp || ""
  });
}

export function getPermissionKeyByPath(path?: string) {
  if (!path) return "";

  if (path === "/") return "home";
  if (path === "/welcome") return "home.welcome";

  const fixedRouteMap: Record<string, string> = {
    "/base": "base",
    "/base/site": "base.site",
    "/base/seo": "base.seo",
    "/base/data": "base.data",
    "/base/account": "base.account",
    "/banner": "banner",
    "/banner/category-list": "banner.categoryList",
    "/banner/add-category": "banner.addCategory",
    "/banner/banner-list": "banner.bannerList",
    "/banner/add-banner": "banner.addBanner",
    "/module": "module",
    "/module/create": "module.create",
    "/module/list": "module.list"
  };

  if (fixedRouteMap[path]) return fixedRouteMap[path];

  const modulePath = path.split("/").filter(Boolean)[0];
  if (!modulePath) return "";
  return path === `/${modulePath}`
    ? `created.${modulePath}`
    : `created.${modulePath}.${path.replace(/^\//, "")}`;
}

export function routeHasAdminViewPermission(route: PermissionRoute) {
  const permissionKey = getPermissionKeyByPath(route?.path);
  if (!permissionKey) return true;

  const settings = getAccountSettings();
  return settings.permissionMatrix[permissionKey]?.includes("view") ?? false;
}

export function routeOrChildHasAdminViewPermission(route: PermissionRoute) {
  if (routeHasAdminViewPermission(route)) return true;
  return Boolean(
    route?.children?.some(child => routeOrChildHasAdminViewPermission(child))
  );
}

export function isAdminAccountEnabled() {
  return getAccountSettings().permissionStatus;
}
