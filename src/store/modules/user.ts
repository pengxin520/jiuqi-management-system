import { defineStore } from "pinia";
import {
  type userType,
  store,
  router,
  resetRouter,
  routerArrays,
  storageLocal
} from "../utils";
import {
  type UserResult,
  type RefreshTokenResult,
  refreshTokenApi
} from "@/api/user";
import { useMultiTagsStoreHook } from "./multiTags";
import { type DataInfo, setToken, removeToken, userKey } from "@/utils/auth";
import { getAccountSettings, recordMasterLoginInfo } from "@/utils/account";

type LoginPayload = {
  username?: string;
  password?: string;
};

function createLoginResult(data: LoginPayload): UserResult {
  const settings = getAccountSettings();
  const username = String(data?.username ?? "");
  const password = String(data?.password ?? "");

  if (
    username === settings.masterName &&
    password === settings.masterPassword
  ) {
    recordMasterLoginInfo();
    return {
      success: true,
      data: {
        avatar: "",
        username: settings.masterName,
        nickname: "",
        roles: ["master"],
        permissions: ["*:*:*"],
        accessToken: "eyJhbGciOiJIUzUxMiJ9.master",
        refreshToken: "eyJhbGciOiJIUzUxMiJ9.masterRefresh",
        expires: new Date("2030/10/30 00:00:00")
      }
    };
  }

  if (
    settings.permissionStatus &&
    username === settings.adminName &&
    password === settings.adminPassword
  ) {
    const permissions = Object.entries(settings.permissionMatrix).flatMap(
      ([key, actions]) => actions.map(action => `${key}:${action}`)
    );

    return {
      success: true,
      data: {
        avatar: "",
        username: settings.adminName,
        nickname: "admin",
        roles: ["admin"],
        permissions,
        accessToken: "eyJhbGciOiJIUzUxMiJ9.admin",
        refreshToken: "eyJhbGciOiJIUzUxMiJ9.adminRefresh",
        expires: new Date("2030/10/30 00:00:00")
      }
    };
  }

  return {
    success: false,
    data: {
      avatar: "",
      username: "",
      nickname: "",
      roles: [],
      permissions: [],
      accessToken: "",
      refreshToken: "",
      expires: new Date()
    }
  };
}

export const useUserStore = defineStore("pure-user", {
  state: (): userType => ({
    // 头像
    avatar: storageLocal().getItem<DataInfo<number>>(userKey)?.avatar ?? "",
    // 用户名
    username: storageLocal().getItem<DataInfo<number>>(userKey)?.username ?? "",
    // 昵称
    nickname: storageLocal().getItem<DataInfo<number>>(userKey)?.nickname ?? "",
    // 页面级别权限
    roles: storageLocal().getItem<DataInfo<number>>(userKey)?.roles ?? [],
    // 按钮级别权限
    permissions:
      storageLocal().getItem<DataInfo<number>>(userKey)?.permissions ?? [],
    // 是否勾选了登录页的免登录
    isRemembered: false,
    // 登录页的免登录存储几天，默认7天
    loginDay: 7
  }),
  actions: {
    /** 存储头像 */
    SET_AVATAR(avatar: string) {
      this.avatar = avatar;
    },
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username;
    },
    /** 存储昵称 */
    SET_NICKNAME(nickname: string) {
      this.nickname = nickname;
    },
    /** 存储角色 */
    SET_ROLES(roles: Array<string>) {
      this.roles = roles;
    },
    /** 存储按钮级别权限 */
    SET_PERMS(permissions: Array<string>) {
      this.permissions = permissions;
    },
    /** 存储是否勾选了登录页的免登录 */
    SET_ISREMEMBERED(bool: boolean) {
      this.isRemembered = bool;
    },
    /** 设置登录页的免登录存储几天 */
    SET_LOGINDAY(value: number) {
      this.loginDay = Number(value);
    },
    /** 登入 */
    async loginByUsername(data: LoginPayload) {
      return new Promise<UserResult>((resolve, reject) => {
        try {
          const loginResult = createLoginResult(data);
          if (loginResult.success) setToken(loginResult.data);
          resolve(loginResult);
        } catch (error) {
          reject(error);
        }
      });
    },
    /** 前端登出（不调用接口） */
    logOut() {
      this.username = "";
      this.roles = [];
      this.permissions = [];
      removeToken();
      useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
      resetRouter();
      router.push("/login");
    },
    /** 刷新`token` */
    async handRefreshToken(data) {
      return new Promise<RefreshTokenResult>((resolve, reject) => {
        refreshTokenApi(data)
          .then(data => {
            if (data) {
              setToken(data.data);
              resolve(data);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}
