<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { computed, reactive, ref } from "vue";
import { message } from "@/utils/message";
import {
  getAccountSettings,
  getPermissionMenus,
  saveAccountSettings,
  type AccountSettings,
  type PermissionAction,
  type PermissionMenu
} from "@/utils/account";

const isAccountEditing = ref(false);
const isPermissionEditing = ref(false);
const accountFormRef = ref<FormInstance>();

const permissionActions: Array<{
  label: string;
  value: PermissionAction;
}> = [
  { label: "查看", value: "view" },
  { label: "新增", value: "create" },
  { label: "编辑", value: "edit" }
];

const permissionMenus = computed<PermissionMenu[]>(() => getPermissionMenus());
const form = reactive<AccountSettings>(getAccountSettings());

const accountRequiredFields = ["adminName", "adminPassword"] as const;

const accountRules: FormRules = {
  adminName: [
    { required: true, message: "请输入 admin 账号", trigger: "blur" }
  ],
  adminPassword: [
    { required: true, message: "请输入 admin 密码", trigger: "blur" }
  ]
};

const masterLastLoginTimeText = computed(
  () => form.masterLastLoginTime || "未记录"
);
const masterLastLoginIpText = computed(() => form.masterLastLoginIp || "未记录");

const accountButtonText = computed(() =>
  isAccountEditing.value ? "保存 admin 账号密码" : "修改 admin 账号密码"
);

const permissionButtonText = computed(() =>
  isPermissionEditing.value ? "确定提交" : "修改权限配置"
);

function persistSettings() {
  saveAccountSettings({
    ...form,
    permissionMatrix: { ...form.permissionMatrix }
  });
}

const submitAccountPassword = () => {
  persistSettings();
  message("提交成功", { type: "success" });
};

const submitPermissionSettings = () => {
  persistSettings();
  message("提交成功", { type: "success" });
};

const handleAccountConfirm = async () => {
  if (!isAccountEditing.value) {
    isAccountEditing.value = true;
    return;
  }

  const valid = await accountFormRef.value
    ?.validateField([...accountRequiredFields])
    .catch(() => false);
  if (!valid) return;

  submitAccountPassword();
  isAccountEditing.value = false;
};

const handlePermissionConfirm = () => {
  if (!isPermissionEditing.value) {
    isPermissionEditing.value = true;
    return;
  }

  submitPermissionSettings();
  isPermissionEditing.value = false;
};
</script>

<template>
  <el-card>
    <template #header>
      <div class="card-header">
        <span>账号设置</span>
      </div>
    </template>
    <el-form
      ref="accountFormRef"
      :model="form"
      :rules="accountRules"
      label-width="auto"
      class="account-form"
    >
      <el-divider content-position="left">修改账号密码</el-divider>

      <div class="account-section-grid">
        <section class="account-role-group is-locked">
          <div class="account-role-heading">
            <div>
              <div class="account-role-title">
                <span class="account-role-name">master</span>
                <el-tag type="danger" effect="plain" size="small">
                  超级管理员
                </el-tag>
              </div>
              <p class="account-role-tip">
                master 账号仅展示信息，不支持在此页面修改账号和密码。
              </p>
            </div>
            <span class="account-role-status">只读</span>
          </div>

          <div class="account-role-fields">
            <el-form-item label="账号">
              <el-input :model-value="form.masterName" disabled />
            </el-form-item>
            <el-form-item label="密码">
              <el-input
                :model-value="form.masterPassword"
                type="password"
                readonly
                class="readonly-password-input"
                show-password
              />
            </el-form-item>
            <el-form-item label="上次登录时间">
              <div class="account-static-field">
                {{ masterLastLoginTimeText }}
              </div>
            </el-form-item>
            <el-form-item label="上次登录IP">
              <div class="account-static-field">{{ masterLastLoginIpText }}</div>
            </el-form-item>
          </div>
        </section>

        <section class="account-role-group">
          <div class="account-role-heading">
            <div>
              <div class="account-role-title">
                <span class="account-role-name">admin</span>
                <el-tag type="info" effect="plain" size="small">
                  普通管理员
                </el-tag>
              </div>
              <p class="account-role-tip">
                仅允许修改 admin 的账号和密码，保存后登录页立即按新配置生效。
              </p>
            </div>
            <span
              class="account-role-status"
              :class="{ 'is-editing': isAccountEditing }"
            >
              {{ isAccountEditing ? "编辑中" : "可编辑" }}
            </span>
          </div>

          <div class="account-role-fields">
            <el-form-item label="账号" prop="adminName">
              <el-input v-model="form.adminName" :disabled="!isAccountEditing" />
            </el-form-item>
            <el-form-item label="密码" prop="adminPassword">
              <el-input
                v-model="form.adminPassword"
                type="password"
                :readonly="!isAccountEditing"
                :class="{ 'readonly-password-input': !isAccountEditing }"
                show-password
              />
            </el-form-item>
          </div>
        </section>
      </div>

      <div class="section-actions section-actions--compact">
        <el-button type="primary" @click="handleAccountConfirm">
          {{ accountButtonText }}
        </el-button>
      </div>

      <el-divider content-position="left">账号权限分配</el-divider>
      <el-form-item label="分配账号">
        <el-select
          v-model="form.permissionAccount"
          :disabled="!isPermissionEditing"
          style="width: 200px"
        >
          <el-option label="admin 普通管理员" value="admin" />
        </el-select>
      </el-form-item>
      <el-form-item label="权限配置" class="permission-form-item">
        <div class="permission-matrix">
          <div class="permission-row permission-header">
            <div class="permission-menu-cell">菜单</div>
            <div class="permission-actions-row">
              <div
                v-for="action in permissionActions"
                :key="action.value"
                class="permission-action-title"
              >
                {{ action.label }}
              </div>
            </div>
          </div>

          <template v-for="menu in permissionMenus" :key="menu.key">
            <div class="permission-row permission-parent-row">
              <div class="permission-menu-cell">
                <span class="permission-menu-name">{{ menu.label }}</span>
                <el-tag effect="plain" size="small">一级菜单</el-tag>
              </div>
              <el-checkbox-group
                v-model="form.permissionMatrix[menu.key]"
                :disabled="!isPermissionEditing"
                class="permission-actions-row"
              >
                <el-checkbox
                  v-for="action in permissionActions"
                  :key="action.value"
                  :value="action.value"
                  :aria-label="`${menu.label}${action.label}权限`"
                  :title="`${menu.label}${action.label}权限`"
                />
              </el-checkbox-group>
            </div>

            <div
              v-for="child in menu.children"
              :key="child.key"
              class="permission-row"
            >
              <div class="permission-menu-cell permission-child-cell">
                <span class="permission-menu-name">{{ child.label }}</span>
                <el-tag type="info" effect="plain" size="small">
                  二级菜单
                </el-tag>
              </div>
              <el-checkbox-group
                v-model="form.permissionMatrix[child.key]"
                :disabled="!isPermissionEditing"
                class="permission-actions-row"
              >
                <el-checkbox
                  v-for="action in permissionActions"
                  :key="action.value"
                  :value="action.value"
                  :aria-label="`${child.label}${action.label}权限`"
                  :title="`${child.label}${action.label}权限`"
                />
              </el-checkbox-group>
            </div>
          </template>
        </div>
      </el-form-item>
      <el-form-item label="账号状态">
        <el-switch
          v-model="form.permissionStatus"
          :disabled="!isPermissionEditing"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>
      <div class="section-actions">
        <el-button type="primary" @click="handlePermissionConfirm">
          {{ permissionButtonText }}
        </el-button>
      </div>
    </el-form>
  </el-card>
</template>

<style scoped lang="scss">
:deep(.el-divider) {
  margin: 64px 0 40px;
}

:deep(.el-divider:first-child) {
  margin-top: 0;
}

.account-form {
  width: 100%;
  max-width: 920px;
}

.account-section-grid {
  display: grid;
  gap: 18px;
}

.account-role-group {
  padding: 24px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.account-role-group.is-locked {
  background: linear-gradient(180deg, #fcfcfd 0%, #f8fafc 100%);
  border-color: var(--el-border-color);
}

.account-role-heading {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 24px;
}

.account-role-title {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.account-role-name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
  color: var(--el-text-color-primary);
}

.account-role-tip {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.account-role-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 68px;
  height: 32px;
  padding: 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 999px;
}

.account-role-status.is-editing {
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.account-role-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}

.account-static-field {
  display: flex;
  align-items: center;
  min-height: 32px;
  width: 100%;
  padding: 0 11px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
}

.permission-matrix {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
}

.permission-form-item {
  :deep(.el-form-item__content) {
    min-width: 0;
    overflow-x: visible;
  }
}

.permission-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) clamp(156px, 36%, 240px);
  min-height: 44px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  &:last-child {
    border-bottom: 0;
  }
}

.permission-header {
  min-height: 40px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-secondary);
  background-color: #f7f9fc;
}

.permission-parent-row {
  background-color: #fbfcff;
}

.permission-menu-cell {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
  padding: 0 16px;
}

.permission-child-cell {
  padding-left: 32px;
}

.permission-menu-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.permission-actions-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(52px, 1fr));
  place-items: center center;
  width: 100%;
  min-width: 156px;
  padding: 0;

  :deep(.el-checkbox) {
    height: 100%;
    margin-right: 0;
  }

  :deep(.el-checkbox__label) {
    display: none;
  }
}

.permission-action-title {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.readonly-password-input {
  :deep(.el-input__wrapper) {
    cursor: default;
    background-color: var(--el-disabled-bg-color);
    box-shadow: 0 0 0 1px var(--el-disabled-border-color) inset;
  }

  :deep(.el-input__inner) {
    color: var(--el-disabled-text-color);
    cursor: default;
    -webkit-text-fill-color: var(--el-disabled-text-color);
  }
}

.section-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  margin-top: 24px;
  border-top: 1px solid var(--el-border-color);
}

.section-actions--compact {
  margin-top: 20px;
  padding-top: 0;
  border-top: 0;
}

@media screen and (width <= 992px) {
  .account-form {
    max-width: 100%;
  }

  .account-role-fields {
    grid-template-columns: 1fr;
  }
}

@media screen and (width <= 640px) {
  .account-role-group {
    padding: 20px 16px;
  }

  .account-role-heading {
    flex-direction: column;
  }

  .permission-form-item {
    :deep(.el-form-item__content) {
      overflow-x: auto;
    }
  }

  .permission-matrix {
    min-width: 520px;
  }
}
</style>
