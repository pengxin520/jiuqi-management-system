// 多组件库的国际化和本地项目国际化兼容
import { type I18n, createI18n } from "vue-i18n";
import { nextTick, watch, type App, type WritableComputedRef } from "vue";
import { responsiveStorageNameSpace } from "@/config";
import { storageLocal, isObject } from "@pureadmin/utils";

// element-plus国际化
import enLocale from "element-plus/es/locale/lang/en";
import zhLocale from "element-plus/es/locale/lang/zh-cn";

const siphonI18n = (function () {
  // 仅初始化一次国际化配置
  const cache = Object.fromEntries(
    Object.entries(
      import.meta.glob("../../locales/*.y(a)?ml", { eager: true })
    ).map(([key, value]: any) => {
      const matched = key.match(/([A-Za-z0-9-_]+)\./i)[1];
      return [matched, value.default];
    })
  );
  return (prefix = "zh-CN") => {
    return cache[prefix];
  };
})();

export const localesConfigs = {
  zh: {
    ...siphonI18n("zh-CN"),
    ...zhLocale
  },
  en: {
    ...siphonI18n("en"),
    ...enLocale
  }
};

/** 获取对象中所有嵌套对象的key键，并将它们用点号分割组成字符串 */
function getObjectKeys(obj) {
  const stack = [];
  const keys: Set<string> = new Set();

  stack.push({ obj, key: "" });

  while (stack.length > 0) {
    const { obj, key } = stack.pop();

    for (const k in obj) {
      const newKey = key ? `${key}.${k}` : k;

      if (obj[k] && isObject(obj[k])) {
        stack.push({ obj: obj[k], key: newKey });
      } else {
        keys.add(key);
      }
    }
  }

  return keys;
}

/** 将展开的key缓存 */
const keysCache: Map<string, Set<string>> = new Map();
const flatI18n = (prefix = "zh-CN") => {
  let cache = keysCache.get(prefix);
  if (!cache) {
    cache = getObjectKeys(siphonI18n(prefix));
    keysCache.set(prefix, cache);
  }
  return cache;
};

const chineseTextReg = /[\u4e00-\u9fff]/;
const sourceTextPrefixes = ["zh-CN", "en"];
const translatableAttributes = ["title", "placeholder", "aria-label"];
const ignoredAutoI18nSelector =
  "script,style,noscript,textarea,code,pre,svg,canvas,[data-i18n-ignore]";
const textNodeSources = new WeakMap<Text, string>();
const attributeSources = new WeakMap<Element, Map<string, string>>();

let autoTextI18nInstalled = false;
let autoTextI18nPending = false;

function getLocaleValue() {
  const locale: string | WritableComputedRef<string> | any = i18n.global.locale;
  return typeof locale === "string" ? locale : (locale?.value ?? "zh");
}

function getLocalePrefix(locale = getLocaleValue()) {
  return locale === "zh" ? "zh-CN" : locale;
}

function getSourceText(prefix = getLocalePrefix()): Record<string, string> {
  return siphonI18n(prefix)?.sourceText ?? {};
}

function hasSourceText(message: string) {
  return sourceTextPrefixes.some(prefix =>
    Object.hasOwn(getSourceText(prefix), message)
  );
}

function resolveSourceText(value: unknown) {
  if (typeof value === "string") return value;

  const globalI18n = i18n.global as any;
  if (typeof globalI18n.rt === "function") {
    return globalI18n.rt(value);
  }

  return String(value);
}

function transformSourceText(message: string) {
  if (!hasSourceText(message)) return;

  const sourceText = getSourceText();
  return Object.hasOwn(sourceText, message)
    ? resolveSourceText(sourceText[message])
    : message;
}

function transformDynamicSourceText(message: string) {
  if (getLocaleValue() !== "en") return;

  const getText = (value: string) => transformSourceText(value) ?? value;

  const categoryName = message.match(/^请输入(.+)分类名称$/);
  if (categoryName) {
    return `Please enter ${getText(categoryName[1])} category name`;
  }

  const categoryCode = message.match(/^请输入(.+)分类唯一标识代码$/);
  if (categoryCode) {
    return `Please enter ${getText(categoryCode[1])} category unique code`;
  }

  const listTemplateTip = message.match(
    /^请在前台 \/public\/module\/ 目录放置 (.+)\.html（列表页）和 (.+)_detail\.html（详情页）模板文件$/
  );
  if (listTemplateTip) {
    return `Place ${listTemplateTip[1]}.html (list page) and ${listTemplateTip[2]}_detail.html (detail page) template files under /public/module/ in the frontend`;
  }

  const textTemplateTip = message.match(
    /^请在前台 \/public\/module\/ 目录放置 (.+)\.html 模板文件$/
  );
  if (textTemplateTip) {
    return `Place ${textTemplateTip[1]}.html template file under /public/module/ in the frontend`;
  }

  const deleteItem = message.match(/^确定删除“(.+)”吗？$/);
  if (deleteItem) {
    return `Delete "${getText(deleteItem[1])}"?`;
  }

  const deleteModules = message.match(/^确定删除选中的\s*(\d+)\s*个模块吗？$/);
  if (deleteModules) {
    return `Delete ${deleteModules[1]} selected modules?`;
  }

  const keyword = message.match(/^删除关键字(\d+)$/);
  if (keyword) {
    return `Delete keyword ${keyword[1]}`;
  }

  const detail = message.match(/^内容详情(\d+)$/);
  if (detail) {
    return `Content Detail ${detail[1]}`;
  }

  const permission = message.match(/^(.+)(查看|新增|编辑)权限$/);
  if (permission) {
    return `${getText(permission[1])} ${getText(permission[2])} permission`;
  }
}

function hasDynamicSourceText(message: string) {
  return [
    /^请输入(.+)分类名称$/,
    /^请输入(.+)分类唯一标识代码$/,
    /^请在前台 \/public\/module\/ 目录放置 (.+)\.html（列表页）和 (.+)_detail\.html（详情页）模板文件$/,
    /^请在前台 \/public\/module\/ 目录放置 (.+)\.html 模板文件$/,
    /^确定删除“(.+)”吗？$/,
    /^确定删除选中的\s*(\d+)\s*个模块吗？$/,
    /^删除关键字(\d+)$/,
    /^内容详情(\d+)$/,
    /^(.+)(查看|新增|编辑)权限$/
  ].some(pattern => pattern.test(message));
}

function hasAutoTextI18nMessage(message: string) {
  return hasSourceText(message) || hasDynamicSourceText(message);
}

/**
 * 国际化转换工具函数（自动读取根目录locales文件夹下文件进行国际化匹配）
 * @param message message
 * @returns 转化后的message
 */
export function transformI18n(message: any = "") {
  if (!message) {
    return "";
  }

  // 处理存储动态路由的title,格式 {zh:"",en:""}
  if (typeof message === "object") {
    const locale: string | WritableComputedRef<string> | any =
      i18n.global.locale;
    return message[locale?.value];
  }

  const sourceText = transformSourceText(message);
  if (sourceText) {
    return sourceText;
  }

  const dynamicSourceText = transformDynamicSourceText(message);
  if (dynamicSourceText) {
    return dynamicSourceText;
  }

  const key = message.match(/(\S*)\./)?.input;

  if (key && flatI18n("zh-CN").has(key)) {
    return i18n.global.t.call(i18n.global.locale, message);
  } else if (!key && Object.hasOwn(siphonI18n("zh-CN"), message)) {
    // 兼容非嵌套形式的国际化写法
    return i18n.global.t.call(i18n.global.locale, message);
  } else {
    return message;
  }
}

/** 此函数只是配合i18n Ally插件来进行国际化智能提示，并无实际意义（只对提示起作用），如果不需要国际化可删除 */
export const $t = (key: string) => key;

export const i18n: I18n = createI18n({
  legacy: false,
  locale:
    storageLocal().getItem<StorageConfigs>(
      `${responsiveStorageNameSpace()}locale`
    )?.locale ?? "zh",
  fallbackLocale: "en",
  messages: localesConfigs
});

function hasAutoTextI18nValue(value: string) {
  const message = value.trim();
  return chineseTextReg.test(message) && hasAutoTextI18nMessage(message);
}

function transformAutoTextI18nValue(value: string) {
  const message = value.trim();
  if (!message) return value;

  const translated = transformI18n(message);
  if (translated === message) return value;

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  return `${leading}${translated}${trailing}`;
}

function shouldSkipAutoTextI18n(node: Node) {
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

  return Boolean(element?.closest(ignoredAutoI18nSelector));
}

function translateTextNode(node: Text) {
  if (shouldSkipAutoTextI18n(node)) return;

  const current = node.nodeValue ?? "";
  const currentHasChinese = chineseTextReg.test(current.trim());

  if (currentHasChinese && !hasAutoTextI18nValue(current)) {
    textNodeSources.delete(node);
    return;
  }

  const source = currentHasChinese
    ? current
    : (textNodeSources.get(node) ?? current);

  if (!textNodeSources.has(node) && !hasAutoTextI18nValue(source)) return;

  textNodeSources.set(node, source);

  const nextValue = transformAutoTextI18nValue(source);
  if (current !== nextValue) {
    node.nodeValue = nextValue;
  }
}

function translateElementAttributes(element: Element) {
  if (shouldSkipAutoTextI18n(element)) return;

  translatableAttributes.forEach(attribute => {
    const current = element.getAttribute(attribute);
    if (!current) return;

    let sources = attributeSources.get(element);
    const currentHasChinese = chineseTextReg.test(current.trim());

    if (currentHasChinese && !hasAutoTextI18nValue(current)) {
      sources?.delete(attribute);
      return;
    }

    const source = currentHasChinese
      ? current
      : (sources?.get(attribute) ?? current);

    if (!sources?.has(attribute) && !hasAutoTextI18nValue(source)) return;

    if (!sources) {
      sources = new Map();
      attributeSources.set(element, sources);
    }

    sources.set(attribute, source);

    const nextValue = transformAutoTextI18nValue(source);
    if (current !== nextValue) {
      element.setAttribute(attribute, nextValue);
    }
  });
}

function translateDomTree(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }

  if (
    root.nodeType !== Node.ELEMENT_NODE &&
    root.nodeType !== Node.DOCUMENT_NODE
  ) {
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementAttributes(root as Element);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        return shouldSkipAutoTextI18n(node)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode = walker.nextNode();
  while (currentNode) {
    if (currentNode.nodeType === Node.TEXT_NODE) {
      translateTextNode(currentNode as Text);
    } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(currentNode as Element);
    }

    currentNode = walker.nextNode();
  }
}

function scheduleAutoTextI18n() {
  if (autoTextI18nPending || typeof window === "undefined") return;

  autoTextI18nPending = true;
  window.requestAnimationFrame(() => {
    autoTextI18nPending = false;
    if (document.body) {
      translateDomTree(document.body);
    }
  });
}

function installAutoTextI18n() {
  if (autoTextI18nInstalled || typeof window === "undefined") return;

  autoTextI18nInstalled = true;

  const start = () => {
    scheduleAutoTextI18n();

    watch(
      () => getLocaleValue(),
      () => scheduleAutoTextI18n(),
      { flush: "post" }
    );

    const observer = new MutationObserver(() => {
      scheduleAutoTextI18n();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: translatableAttributes
    });
  };

  if (document.body) {
    nextTick(start);
  } else {
    window.addEventListener("DOMContentLoaded", start, { once: true });
  }
}

export function useI18n(app: App) {
  app.use(i18n);
  installAutoTextI18n();
}
