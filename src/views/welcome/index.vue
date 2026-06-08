<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import AddBoxLine from "~icons/ri/add-box-line";
import AdvertisementLine from "~icons/ri/advertisement-line";
import AppsLine from "~icons/ri/apps-2-line";
import CheckDoubleLine from "~icons/ri/check-double-line";
import CodeLine from "~icons/ri/code-s-slash-line";
import DatabaseLine from "~icons/ri/database-2-line";
import GlobalLine from "~icons/ri/global-line";
import ShieldCheckLine from "~icons/ri/shield-check-line";

defineOptions({
  name: "Welcome"
});

const router = useRouter();
const companyName = "九七信息科技有限公司";

const currentDate = computed(() => {
  const now = new Date();

  return {
    date: new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now),
    weekday: new Intl.DateTimeFormat("zh-CN", {
      weekday: "long"
    }).format(now)
  };
});

const quickLinks = [
  {
    title: "创建新模块",
    description: "生成业务模块入口与基础路由",
    path: "/module/create",
    icon: AddBoxLine
  },
  {
    title: "模块列表",
    description: "查看已创建模块与访问地址",
    path: "/module/list",
    icon: AppsLine
  },
  {
    title: "广告中心",
    description: "维护广告分类、图片与跳转链接",
    path: "/banner/category-list",
    icon: AdvertisementLine
  },
  {
    title: "站点设置",
    description: "配置站点名称、图标与基础信息",
    path: "/base/site",
    icon: GlobalLine
  }
];

const statusItems = [
  {
    label: "系统状态",
    value: "运行中",
    icon: ShieldCheckLine
  },
  {
    label: "数据配置",
    value: "本地就绪",
    icon: DatabaseLine
  },
  {
    label: "开发规范",
    value: "类型校验",
    icon: CodeLine
  }
];

const focusItems = [
  "站点基础配置保持完整",
  "广告素材上线前完成预览",
  "新增模块先确认短称与标识",
  "关键改动提交前执行类型检查"
];

const navigateTo = (path: string) => {
  router.push(path);
};
</script>

<template>
  <div class="welcome-page">
    <section class="hero-section">
      <div class="hero-main">
        <div class="brand-kicker">内部开发管理系统</div>
        <h1>{{ companyName }}</h1>
        <p class="hero-copy">
          面向内部开发与运营维护的统一控制台，覆盖基础设置、广告管理、模块生成与内容配置。
        </p>
        <div class="hero-actions">
          <el-button
            type="primary"
            size="large"
            @click="navigateTo('/module/create')"
          >
            <IconifyIconOffline :icon="AddBoxLine" />
            创建新模块
          </el-button>
          <el-button size="large" @click="navigateTo('/base/site')">
            <IconifyIconOffline :icon="GlobalLine" />
            站点设置
          </el-button>
        </div>
      </div>

      <div class="identity-panel">
        <div class="brand-mark" aria-hidden="true">
          <span>97</span>
        </div>
        <div class="identity-content">
          <span class="identity-label">97 Information</span>
          <strong>内部系统控制台</strong>
          <span>{{ currentDate.date }}</span>
          <span>{{ currentDate.weekday }}</span>
        </div>
      </div>
    </section>

    <section class="status-grid" aria-label="系统概览">
      <div v-for="item in statusItems" :key="item.label" class="status-card">
        <div class="status-icon">
          <IconifyIconOffline :icon="item.icon" />
        </div>
        <div>
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
    </section>

    <section class="content-grid">
      <div class="quick-panel">
        <div class="section-heading">
          <span>常用入口</span>
          <small>Core Access</small>
        </div>
        <div class="quick-grid">
          <button
            v-for="item in quickLinks"
            :key="item.path"
            type="button"
            class="quick-card"
            @click="navigateTo(item.path)"
          >
            <span class="quick-icon">
              <IconifyIconOffline :icon="item.icon" />
            </span>
            <span class="quick-title">{{ item.title }}</span>
            <span class="quick-description">{{ item.description }}</span>
          </button>
        </div>
      </div>

      <aside class="focus-panel">
        <div class="section-heading">
          <span>今日关注</span>
          <small>Focus</small>
        </div>
        <ul class="focus-list">
          <li v-for="item in focusItems" :key="item">
            <IconifyIconOffline :icon="CheckDoubleLine" />
            <span>{{ item }}</span>
          </li>
        </ul>
      </aside>
    </section>
  </div>
</template>

<style scoped lang="scss">
.welcome-page {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: calc(100vh - 124px);
  color: var(--el-text-color-primary);
}

.hero-section {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  padding: 28px;
  overflow: hidden;
  background:
    linear-gradient(135deg, rgb(255 153 103 / 14%), transparent 42%),
    linear-gradient(90deg, rgb(24 117 126 / 10%), rgb(255 255 255 / 84%));
  border: 1px solid rgb(255 153 103 / 20%);
  border-radius: 8px;
  box-shadow: 0 12px 28px rgb(31 43 58 / 8%);
}

.hero-main {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.brand-kicker {
  width: fit-content;
  padding: 5px 10px;
  margin-bottom: 14px;
  font-size: 13px;
  line-height: 1;
  color: #8a4d24;
  background-color: rgb(255 153 103 / 16%);
  border: 1px solid rgb(255 153 103 / 28%);
  border-radius: 4px;
}

.hero-main h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.25;
  color: #202b3c;
}

.hero-copy {
  max-width: 680px;
  margin: 14px 0 0;
  font-size: 15px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;

  :deep(.el-button) {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    margin-left: 0;
  }
}

.identity-panel {
  display: flex;
  gap: 18px;
  align-items: center;
  min-width: 0;
  padding: 22px;
  background-color: rgb(255 255 255 / 72%);
  border: 1px solid rgb(255 255 255 / 84%);
  border-radius: 8px;
}

.brand-mark {
  position: relative;
  display: grid;
  flex: 0 0 96px;
  place-items: center;
  width: 96px;
  height: 96px;
  overflow: hidden;
  color: #fff;
  background-color: #ff8f5a;
  border-radius: 8px;

  &::before {
    position: absolute;
    inset: 12px;
    content: "";
    border: 1px solid rgb(255 255 255 / 34%);
    border-radius: 6px;
  }

  &::after {
    position: absolute;
    inset: 0;
    content: "";
    background-image:
      linear-gradient(rgb(255 255 255 / 18%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(255 255 255 / 18%) 1px, transparent 1px);
    background-size: 24px 24px;
  }

  span {
    position: relative;
    z-index: 1;
    font-size: 34px;
    font-weight: 800;
  }
}

.identity-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.7;

  strong {
    font-size: 18px;
    color: #202b3c;
  }

  span {
    color: var(--el-text-color-secondary);
  }
}

.identity-label {
  font-size: 12px;
  text-transform: uppercase;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.status-card {
  display: flex;
  gap: 14px;
  align-items: center;
  min-width: 0;
  padding: 18px;
  background-color: rgb(255 255 255 / 86%);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;

  > div:last-child {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  span {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  strong {
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 18px;
    font-weight: 700;
    color: #202b3c;
    white-space: nowrap;
  }
}

.status-icon,
.quick-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: #18757e;
  background-color: rgb(24 117 126 / 10%);
  border-radius: 6px;
}

.status-icon {
  width: 42px;
  height: 42px;
  font-size: 22px;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}

.quick-panel,
.focus-panel {
  padding: 20px;
  background-color: rgb(255 255 255 / 88%);
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
}

.section-heading {
  display: flex;
  gap: 12px;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 16px;

  span {
    font-size: 16px;
    font-weight: 700;
    color: #202b3c;
  }

  small {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.quick-card {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 4px 12px;
  width: 100%;
  min-height: 108px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background-color: #fff;
  border: 1px solid var(--el-border-color-light);
  border-radius: 8px;
  transition:
    border-color var(--el-transition-duration-fast),
    box-shadow var(--el-transition-duration-fast),
    transform var(--el-transition-duration-fast);

  &:hover,
  &:focus-visible {
    outline: none;
    border-color: rgb(255 153 103 / 62%);
    box-shadow: 0 10px 24px rgb(31 43 58 / 10%);
    transform: translateY(-2px);
  }
}

.quick-icon {
  grid-row: span 2;
  width: 42px;
  height: 42px;
  font-size: 21px;
}

.quick-title {
  align-self: end;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 15px;
  font-weight: 700;
  color: #202b3c;
  white-space: nowrap;
}

.quick-description {
  align-self: start;
  min-width: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);
}

.focus-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
  margin: 0;
  list-style: none;

  li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    min-width: 0;
    padding: 12px;
    line-height: 1.5;
    color: var(--el-text-color-regular);
    background-color: #fff;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;

    svg {
      flex: 0 0 auto;
      margin-top: 2px;
      font-size: 17px;
      color: #2f9e73;
    }
  }
}

@media (width <= 1180px) {
  .hero-section,
  .content-grid {
    grid-template-columns: 1fr;
  }

  .identity-panel {
    max-width: 520px;
  }
}

@media (width <= 760px) {
  .welcome-page {
    min-height: auto;
  }

  .hero-section {
    padding: 20px;
  }

  .hero-main h1 {
    font-size: 26px;
  }

  .status-grid,
  .quick-grid {
    grid-template-columns: 1fr;
  }

  .identity-panel {
    align-items: flex-start;
  }
}

@media (width <= 480px) {
  .identity-panel {
    flex-direction: column;
  }

  .hero-actions {
    :deep(.el-button) {
      width: 100%;
    }
  }
}
</style>
