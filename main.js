const input = document.querySelector("#searchInput");
const cards = [...document.querySelectorAll(".card")];
const openCurrent = document.querySelector("#openCurrent");
const currentUrl = document.querySelector("#currentUrl");
const copyCurrentUrl = document.querySelector("#copyCurrentUrl");
const langToggle = document.querySelector("[data-lang-toggle]");
const themeToggle = document.querySelector("[data-theme-toggle]");

const copy = {
  zh: {
    eyebrow: "GitHub Pages Ready",
    title: "前端 CSS 效果导览",
    searchLabel: "搜索",
    searchPlaceholder: "输入名字或关键词",
    themeToggle: "暗色",
    themeToggleDark: "亮色",
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
    themeToggle: "Dark",
    themeToggleDark: "Light",
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
const savedTheme = localStorage.getItem("gallery-theme") || "light";

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

  updateThemeButton();
  langToggle.setAttribute("aria-pressed", String(lang === "en"));
  localStorage.setItem("gallery-lang", lang);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  localStorage.setItem("gallery-theme", theme);
  updateThemeButton();
}

function updateThemeButton() {
  const lang = document.documentElement.dataset.lang || "zh";
  const theme = document.documentElement.dataset.theme || "light";
  themeToggle.textContent = theme === "dark" ? copy[lang].themeToggleDark : copy[lang].themeToggle;
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

themeToggle.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme || "light";
  applyTheme(current === "light" ? "dark" : "light");
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
