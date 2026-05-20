const input = document.querySelector("#searchInput");
const cards = [...document.querySelectorAll(".card")];
const openCurrent = document.querySelector("#openCurrent");
const currentUrl = document.querySelector("#currentUrl");
const copyCurrentUrl = document.querySelector("#copyCurrentUrl");
const langToggle = document.querySelector("[data-lang-toggle]");
const themeSelect = document.querySelector("#themeSelect");

const themes = new Set([
  "github",
  "atom-one",
  "atom-one-light",
  "catppuccin-mocha",
  "catppuccin-latte",
  "rose-pine",
  "rose-pine-moon",
  "everforest-dark",
  "everforest-light",
  "kanagawa-wave",
  "night-owl",
  "tokyo-night",
]);

const copy = {
  zh: {
    eyebrow: "GitHub Pages Ready",
    title: "前端 CSS 效果导览",
    searchLabel: "搜索",
    searchPlaceholder: "输入名字或关键词",
    themeLabel: "主题",
    langLabel: "语言",
    langToggle: "EN",
    viewer: "预览",
    openCurrent: "打开当前页",
    preview: "预览",
    newWindow: "新窗口",
    source: "来源",
    urlLabel: "当前 URL",
    copyUrl: "复制",
    copiedUrl: "已复制",
  },
  en: {
    eyebrow: "GitHub Pages Ready",
    title: "Front-End CSS Gallery",
    searchLabel: "Search",
    searchPlaceholder: "Name or keyword",
    themeLabel: "Theme",
    langLabel: "Language",
    langToggle: "中文",
    viewer: "Preview",
    openCurrent: "Open page",
    preview: "Preview",
    newWindow: "New tab",
    source: "Source",
    urlLabel: "Current URL",
    copyUrl: "Copy",
    copiedUrl: "Copied",
  },
};

const savedLang = localStorage.getItem("gallery-lang") || "zh";
const savedTheme = localStorage.getItem("gallery-theme") || "github";

function applyLanguage(lang) {
  document.documentElement.dataset.lang = lang;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  for (const node of document.querySelectorAll("[data-i18n]")) {
    const key = node.dataset.i18n;
    node.textContent = copy[lang][key] || node.textContent;
  }

  for (const node of document.querySelectorAll("[data-i18n-placeholder]")) {
    const key = node.dataset.i18nPlaceholder;
    node.placeholder = copy[lang][key] || node.placeholder;
  }

  langToggle.setAttribute("aria-pressed", String(lang === "en"));
  localStorage.setItem("gallery-lang", lang);
}

function applyTheme(theme) {
  const nextTheme = themes.has(theme) ? theme : "github";
  document.documentElement.dataset.theme = nextTheme;
  themeSelect.value = nextTheme;
  localStorage.setItem("gallery-theme", nextTheme);
}

function absoluteUrl(path) {
  return new URL(path, window.location.href).href;
}

function updateCurrentUrl(path) {
  const url = absoluteUrl(path);
  openCurrent.href = url;
  currentUrl.value = url;
}

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[target="preview"]');
  if (link) {
    updateCurrentUrl(link.getAttribute("href"));
  }
});

input.addEventListener("input", () => {
  const keyword = input.value.trim().toLowerCase();
  for (const card of cards) {
    const title = card.dataset.title.toLowerCase();
    card.classList.toggle("is-hidden", keyword && !title.includes(keyword));
  }
});

langToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.lang || "zh";
  applyLanguage(current === "zh" ? "en" : "zh");
});

themeSelect.addEventListener("change", () => {
  applyTheme(themeSelect.value);
});

copyCurrentUrl.addEventListener("click", async () => {
  const lang = document.documentElement.dataset.lang || "zh";
  await navigator.clipboard.writeText(currentUrl.value);
  copyCurrentUrl.textContent = copy[lang].copiedUrl;
  setTimeout(() => {
    copyCurrentUrl.textContent = copy[lang].copyUrl;
  }, 1200);
});

applyTheme(savedTheme);
applyLanguage(savedLang);
updateCurrentUrl(document.querySelector('iframe[name="preview"]').getAttribute("src"));
