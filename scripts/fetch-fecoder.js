const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BASE_URL = "https://www.fecoder.cn";
const PAGE_SIZE = 100;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeFileName(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{Script=Han}\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function titleFromSlug(value) {
  return value
    .split("-")
    .filter(Boolean)
    .map((word) => (word.length <= 3 ? word.toUpperCase() : word[0].toUpperCase() + word.slice(1)))
    .join(" ");
}

function extractFlightPayload(html) {
  const calls = [];
  const re = /<script>self\.__next_f\.push\(([\s\S]*?)\)<\/script>/g;
  let match;

  while ((match = re.exec(html))) {
    const source = `return ${match[1]};`;
    try {
      const value = Function(source)();
      if (Array.isArray(value) && value[0] === 1 && typeof value[1] === "string") {
        calls.push(value[1]);
      }
    } catch {
      continue;
    }
  }

  return calls.join("");
}

function sliceUtf8Bytes(text, startIndex, byteLength) {
  const before = Buffer.byteLength(text.slice(0, startIndex), "utf8");
  const bytes = Buffer.from(text, "utf8");
  return bytes.subarray(before, before + byteLength).toString("utf8");
}

function extractSrcDoc(html) {
  const flight = extractFlightPayload(html);
  const marker = /[0-9a-f]+:T([0-9a-f]+),/g;
  let match;

  while ((match = marker.exec(flight))) {
    const payloadStart = match.index + match[0].length;
    const payload = sliceUtf8Bytes(flight, payloadStart, Number.parseInt(match[1], 16));
    if (payload.includes("<!DOCTYPE html") || payload.includes("<html")) {
      return payload;
    }
  }

  const inline = flight.match(/"srcDoc":"((?:\\.|[^"\\])*)"/);
  if (inline) {
    return JSON.parse(`"${inline[1]}"`);
  }

  return "";
}

async function getJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  const json = await response.json();
  if (!json.success) {
    throw new Error(json.message || `API failed: ${url}`);
  }
  return json.data;
}

async function getText(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${url}`);
  }
  return response.text();
}

async function fetchAllMetas() {
  const metas = [];

  for (let page = 1; ; page += 1) {
    const url = `${BASE_URL}/api/public/docs/blogs?book_id=3&page=${page}&page_size=${PAGE_SIZE}`;
    const data = await getJson(url);
    metas.push(...data);
    if (data.length < PAGE_SIZE) {
      return metas;
    }
  }
}

function buildExamplePage(srcDoc, item) {
  const sourceUrl = `${BASE_URL}/code-fun/${item.slug}`;
  return srcDoc.replace(
    /<\/head>/i,
    `<meta name="source" content="${escapeHtml(sourceUrl)}">\n</head>`,
  );
}

function buildIndex(items) {
  const cards = items
    .map((item) => {
      const englishTitle = titleFromSlug(item.slug);
      const englishSummary = `Preview this front-end effect from the code-fun collection. Original title: ${item.title}.`;
      const cover = item.cover
        ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title)}" loading="lazy">`
        : `<div class="no-cover">${escapeHtml(item.title.slice(0, 2))}</div>`;

      return `<article class="card" data-title="${escapeHtml(`${item.title} ${englishTitle} ${item.slug}`)}" data-file="${escapeHtml(item.file)}">
        <a class="preview" href="${escapeHtml(item.file)}" target="preview">${cover}</a>
        <div class="card-body">
          <h2><span data-i18n-text="zh">${escapeHtml(item.title)}</span><span data-i18n-text="en">${escapeHtml(englishTitle)}</span></h2>
          <p><span data-i18n-text="zh">${escapeHtml(item.summary || "")}</span><span data-i18n-text="en">${escapeHtml(englishSummary)}</span></p>
          <div class="actions">
            <a href="${escapeHtml(item.file)}" target="preview" data-i18n="preview">预览</a>
            <a href="${escapeHtml(item.file)}" target="_blank" data-i18n="newWindow">新窗口</a>
            <a href="${escapeHtml(item.sourceUrl)}" target="_blank" data-i18n="source">来源</a>
          </div>
        </div>
      </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN" data-lang="zh" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>前端 CSS 效果导览</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="topbar">
    <div>
      <p class="eyebrow" data-i18n="eyebrow">GitHub Pages Ready</p>
      <h1 data-i18n="title">前端 CSS 效果导览</h1>
    </div>
    <div class="toolbar" aria-label="页面设置">
      <label class="search">
        <span data-i18n="searchLabel">搜索</span>
        <input id="searchInput" type="search" placeholder="输入名字或关键词" data-i18n-placeholder="searchPlaceholder">
      </label>
      <div class="switchers">
        <button class="toggle-button" type="button" data-theme-toggle aria-pressed="false" data-i18n="themeToggle">暗色</button>
        <button class="toggle-button" type="button" data-lang-toggle aria-pressed="false" data-i18n="langToggle">EN</button>
      </div>
    </div>
  </header>

  <main class="layout">
    <section class="gallery" aria-label="效果列表">
      ${cards}
    </section>
    <aside class="viewer" aria-label="预览窗口">
      <div class="viewer-head">
        <span data-i18n="viewer">预览</span>
        <a id="openCurrent" href="${escapeHtml(items[0]?.file || "#")}" target="_blank" data-i18n="openCurrent">打开当前页</a>
      </div>
      <div class="url-panel">
        <label for="currentUrl" data-i18n="urlLabel">当前 URL</label>
        <div class="url-row">
          <input id="currentUrl" type="text" readonly value="">
          <button id="copyCurrentUrl" type="button" data-i18n="copyUrl">复制</button>
        </div>
      </div>
      <iframe name="preview" src="${escapeHtml(items[0]?.file || "about:blank")}" title="效果预览"></iframe>
    </aside>
  </main>

  <script src="main.js"></script>
</body>
</html>
`;
}

function buildCss() {
  return `:root {
  color-scheme: light;
  font-family: "Avenir Next", "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  --page: #f4f0e8;
  --text: #1f2523;
  --muted: #59615e;
  --line: rgba(31, 37, 35, 0.14);
  --line-strong: rgba(31, 37, 35, 0.2);
  --panel: rgba(255, 255, 255, 0.78);
  --panel-solid: #fffdfa;
  --accent: #24735e;
  --accent-text: #ffffff;
  --preview-bg: #1f2523;
  --shadow: rgba(31, 37, 35, 0.1);
  background: var(--page);
  color: var(--text);
}

:root[data-theme="dark"] {
  color-scheme: dark;
  --page: #171b1a;
  --text: #f2efe8;
  --muted: #b7c0bb;
  --line: rgba(242, 239, 232, 0.16);
  --line-strong: rgba(242, 239, 232, 0.26);
  --panel: rgba(34, 39, 37, 0.82);
  --panel-solid: #222725;
  --accent: #7fc7a7;
  --accent-text: #10201a;
  --preview-bg: #101312;
  --shadow: rgba(0, 0, 0, 0.28);
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    linear-gradient(120deg, rgba(36, 115, 94, 0.14), transparent 34%),
    linear-gradient(300deg, rgba(214, 77, 55, 0.12), transparent 36%),
    var(--page);
  transition: background-color 0.2s ease, color 0.2s ease;
}

a {
  color: inherit;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  padding: 22px clamp(18px, 4vw, 48px);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--page) 88%, transparent);
  backdrop-filter: blur(16px);
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--accent);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 52px);
  line-height: 1;
}

.search {
  display: grid;
  gap: 8px;
  width: min(340px, 100%);
  font-size: 13px;
  font-weight: 700;
}

.toolbar {
  display: flex;
  align-items: end;
  gap: 12px;
}

.search input {
  width: 100%;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  padding: 12px 14px;
  background: var(--panel);
  color: inherit;
  font: inherit;
}

.search input::placeholder {
  color: color-mix(in srgb, var(--muted) 78%, transparent);
}

.switchers {
  display: flex;
  gap: 8px;
}

.toggle-button {
  min-width: 66px;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  padding: 12px 13px;
  background: var(--panel-solid);
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 900;
}

.toggle-button:active,
.actions a:active,
.viewer-head a:active,
.url-row button:active {
  transform: translateY(1px);
}

.layout {
  display: grid;
  grid-template-columns: minmax(340px, 560px) minmax(460px, 1fr);
  gap: 22px;
  padding: 22px clamp(18px, 4vw, 48px) 48px;
}

.gallery {
  display: grid;
  gap: 14px;
  align-content: start;
}

.card {
  display: grid;
  grid-template-columns: 172px 1fr;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 18px 42px var(--shadow);
}

.preview {
  display: block;
  min-height: 132px;
  background: var(--preview-bg);
}

.preview img,
.no-cover {
  width: 100%;
  height: 100%;
  min-height: 132px;
  object-fit: cover;
  display: block;
}

.no-cover {
  display: grid;
  place-items: center;
  color: var(--page);
  font-size: 30px;
  font-weight: 900;
}

.card-body {
  display: grid;
  gap: 10px;
  padding: 14px;
}

h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.25;
}

.card p {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-self: end;
}

.actions a,
.viewer-head a,
.url-row button {
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  padding: 7px 10px;
  background: var(--panel-solid);
  color: var(--text);
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.actions a:first-child {
  background: var(--accent);
  color: var(--accent-text);
}

.viewer {
  position: sticky;
  top: 112px;
  height: calc(100vh - 134px);
  display: grid;
  grid-template-rows: auto auto 1fr;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel-solid);
  box-shadow: 0 24px 60px var(--shadow);
}

.viewer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  font-weight: 900;
}

.url-panel {
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
}

.url-panel label {
  color: var(--muted);
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.url-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}

.url-row input {
  min-width: 0;
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  padding: 9px 10px;
  background: color-mix(in srgb, var(--panel-solid) 82%, var(--page));
  color: var(--text);
  font: inherit;
  font-size: 12px;
}

.url-row button {
  cursor: pointer;
}

iframe {
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--panel-solid);
}

.is-hidden {
  display: none;
}

:root[data-lang="zh"] [data-i18n-text="en"],
:root[data-lang="en"] [data-i18n-text="zh"] {
  display: none;
}

@media (max-width: 980px) {
  .topbar {
    position: static;
    align-items: stretch;
    flex-direction: column;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .layout {
    grid-template-columns: 1fr;
  }

  .viewer {
    position: static;
    height: 70vh;
    order: -1;
  }
}

@media (max-width: 560px) {
  .card {
    grid-template-columns: 1fr;
  }
}
`;
}

function buildJs() {
  return `const input = document.querySelector("#searchInput");
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
`;
}

async function main() {
  await fs.mkdir(path.join(ROOT, "examples"), { recursive: true });
  await fs.mkdir(path.join(ROOT, "data"), { recursive: true });

  const metas = await fetchAllMetas();
  const saved = [];

  for (const [index, meta] of metas.entries()) {
    const url = `${BASE_URL}/code-fun/${meta.slug}`;
    const html = await getText(url);
    const srcDoc = extractSrcDoc(html);
    if (!srcDoc) {
      throw new Error(`No preview HTML found: ${url}`);
    }

    const baseName = `${String(index + 1).padStart(3, "0")}-${normalizeFileName(meta.title)}-${meta.slug}.html`;
    const file = `examples/${baseName}`;
    await fs.writeFile(path.join(ROOT, file), buildExamplePage(srcDoc, meta), "utf8");

    saved.push({
      id: meta.id,
      title: meta.title,
      slug: meta.slug,
      summary: meta.summary,
      cover: meta.cover,
      publishedAt: meta.publishedAt,
      sourceUrl: url,
      file,
    });

    console.log(`${saved.length}/${metas.length} ${meta.title}`);
  }

  await fs.writeFile(path.join(ROOT, "data", "examples.json"), `${JSON.stringify(saved, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(ROOT, "index.html"), buildIndex(saved), "utf8");
  await fs.writeFile(path.join(ROOT, "style.css"), buildCss(), "utf8");
  await fs.writeFile(path.join(ROOT, "main.js"), buildJs(), "utf8");

  console.log(`done: ${saved.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
