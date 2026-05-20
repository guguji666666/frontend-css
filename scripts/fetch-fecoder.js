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
<html lang="zh-CN" data-lang="zh" data-theme="github">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>前端 CSS 效果导览</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="topbar">
    <div class="brand">
      <p class="eyebrow" data-i18n="eyebrow">GitHub Pages Ready</p>
      <h1 data-i18n="title">前端 CSS 效果导览</h1>
    </div>
    <div class="toolbar" aria-label="页面设置">
      <label class="search">
        <span data-i18n="searchLabel">搜索</span>
        <input id="searchInput" type="search" placeholder="输入名字或关键词" data-i18n-placeholder="searchPlaceholder">
      </label>
      <label class="field theme-picker">
        <span data-i18n="themeLabel">主题</span>
        <select id="themeSelect" aria-label="主题">
          <option value="github">GitHub</option>
          <option value="atom-one">Atom One Dark</option>
          <option value="atom-one-light">Atom One Light</option>
          <option value="catppuccin-mocha">Catppuccin Mocha</option>
          <option value="catppuccin-latte">Catppuccin Latte</option>
          <option value="rose-pine">Rosé Pine</option>
          <option value="rose-pine-moon">Rosé Pine Moon</option>
          <option value="everforest-dark">Everforest Dark</option>
          <option value="everforest-light">Everforest Light</option>
          <option value="kanagawa-wave">Kanagawa Wave</option>
          <option value="night-owl">Night Owl</option>
          <option value="tokyo-night">Tokyo Night</option>
        </select>
      </label>
      <div class="field lang-picker">
        <span data-i18n="langLabel">语言</span>
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
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --page: #f6f8fa;
  --page-soft: #ffffff;
  --text: #24292f;
  --muted: #57606a;
  --line: #d0d7de;
  --line-strong: #8c959f;
  --panel: #ffffff;
  --panel-raised: #f6f8fa;
  --accent: #0969da;
  --accent-strong: #0550ae;
  --accent-text: #ffffff;
  --success: #1a7f37;
  --preview-bg: #0d1117;
  --shadow: rgba(27, 31, 36, 0.12);
  --shadow-strong: rgba(27, 31, 36, 0.18);
  background: var(--page);
  color: var(--text);
}

:root[data-theme="atom-one"] {
  color-scheme: dark;
  --page: #1f2329;
  --page-soft: #282c34;
  --text: #d7dae0;
  --muted: #9da5b4;
  --line: #3b4048;
  --line-strong: #5c6370;
  --panel: #282c34;
  --panel-raised: #2f343d;
  --accent: #61afef;
  --accent-strong: #98c379;
  --accent-text: #101317;
  --success: #98c379;
  --preview-bg: #17191d;
  --shadow: rgba(0, 0, 0, 0.28);
  --shadow-strong: rgba(0, 0, 0, 0.4);
}

:root[data-theme="atom-one-light"] {
  color-scheme: light;
  --page: #fafafa;
  --page-soft: #ffffff;
  --text: #383a42;
  --muted: #696c77;
  --line: #d9d9d9;
  --line-strong: #a0a1a7;
  --panel: #ffffff;
  --panel-raised: #f1f2f3;
  --accent: #4078f2;
  --accent-strong: #a626a4;
  --accent-text: #ffffff;
  --success: #50a14f;
  --preview-bg: #f1f2f3;
  --shadow: rgba(56, 58, 66, 0.12);
  --shadow-strong: rgba(56, 58, 66, 0.18);
}

:root[data-theme="catppuccin-mocha"] {
  color-scheme: dark;
  --page: #11111b;
  --page-soft: #181825;
  --text: #cdd6f4;
  --muted: #a6adc8;
  --line: #313244;
  --line-strong: #585b70;
  --panel: #1e1e2e;
  --panel-raised: #181825;
  --accent: #89b4fa;
  --accent-strong: #cba6f7;
  --accent-text: #11111b;
  --success: #a6e3a1;
  --preview-bg: #11111b;
  --shadow: rgba(0, 0, 0, 0.3);
  --shadow-strong: rgba(0, 0, 0, 0.44);
}

:root[data-theme="catppuccin-latte"] {
  color-scheme: light;
  --page: #eff1f5;
  --page-soft: #e6e9ef;
  --text: #4c4f69;
  --muted: #6c6f85;
  --line: #ccd0da;
  --line-strong: #9ca0b0;
  --panel: #ffffff;
  --panel-raised: #e6e9ef;
  --accent: #1e66f5;
  --accent-strong: #8839ef;
  --accent-text: #ffffff;
  --success: #40a02b;
  --preview-bg: #dce0e8;
  --shadow: rgba(76, 79, 105, 0.12);
  --shadow-strong: rgba(76, 79, 105, 0.18);
}

:root[data-theme="rose-pine"] {
  color-scheme: dark;
  --page: #191724;
  --page-soft: #1f1d2e;
  --text: #e0def4;
  --muted: #908caa;
  --line: #403d52;
  --line-strong: #6e6a86;
  --panel: #1f1d2e;
  --panel-raised: #26233a;
  --accent: #c4a7e7;
  --accent-strong: #ebbcba;
  --accent-text: #191724;
  --success: #31748f;
  --preview-bg: #111019;
  --shadow: rgba(0, 0, 0, 0.32);
  --shadow-strong: rgba(0, 0, 0, 0.46);
}

:root[data-theme="rose-pine-moon"] {
  color-scheme: dark;
  --page: #232136;
  --page-soft: #2a273f;
  --text: #e0def4;
  --muted: #908caa;
  --line: #44415a;
  --line-strong: #6e6a86;
  --panel: #2a273f;
  --panel-raised: #393552;
  --accent: #c4a7e7;
  --accent-strong: #f6c177;
  --accent-text: #232136;
  --success: #9ccfd8;
  --preview-bg: #191724;
  --shadow: rgba(0, 0, 0, 0.3);
  --shadow-strong: rgba(0, 0, 0, 0.42);
}

:root[data-theme="everforest-dark"] {
  color-scheme: dark;
  --page: #1e2326;
  --page-soft: #272e33;
  --text: #d3c6aa;
  --muted: #9da9a0;
  --line: #414b50;
  --line-strong: #859289;
  --panel: #272e33;
  --panel-raised: #2e383c;
  --accent: #7fbbb3;
  --accent-strong: #dbbc7f;
  --accent-text: #1e2326;
  --success: #a7c080;
  --preview-bg: #171b1d;
  --shadow: rgba(0, 0, 0, 0.32);
  --shadow-strong: rgba(0, 0, 0, 0.46);
}

:root[data-theme="everforest-light"] {
  color-scheme: light;
  --page: #f3ead3;
  --page-soft: #fff9e8;
  --text: #5c6a72;
  --muted: #7a8478;
  --line: #d8c9a8;
  --line-strong: #a79a78;
  --panel: #fff9e8;
  --panel-raised: #f4f0d9;
  --accent: #3a94c5;
  --accent-strong: #8da101;
  --accent-text: #ffffff;
  --success: #8da101;
  --preview-bg: #edeada;
  --shadow: rgba(92, 106, 114, 0.13);
  --shadow-strong: rgba(92, 106, 114, 0.2);
}

:root[data-theme="kanagawa-wave"] {
  color-scheme: dark;
  --page: #16161d;
  --page-soft: #1f1f28;
  --text: #dcd7ba;
  --muted: #c8c093;
  --line: #363646;
  --line-strong: #54546d;
  --panel: #1f1f28;
  --panel-raised: #2a2a37;
  --accent: #7e9cd8;
  --accent-strong: #957fb8;
  --accent-text: #16161d;
  --success: #98bb6c;
  --preview-bg: #111118;
  --shadow: rgba(0, 0, 0, 0.34);
  --shadow-strong: rgba(0, 0, 0, 0.48);
}

:root[data-theme="night-owl"] {
  color-scheme: dark;
  --page: #011627;
  --page-soft: #061b30;
  --text: #d6deeb;
  --muted: #7fdbca;
  --line: #1d3b53;
  --line-strong: #5f7e97;
  --panel: #0b2942;
  --panel-raised: #08233a;
  --accent: #82aaff;
  --accent-strong: #c792ea;
  --accent-text: #011627;
  --success: #addb67;
  --preview-bg: #010d18;
  --shadow: rgba(0, 0, 0, 0.36);
  --shadow-strong: rgba(0, 0, 0, 0.5);
}

:root[data-theme="tokyo-night"] {
  color-scheme: dark;
  --page: #16161e;
  --page-soft: #1a1b26;
  --text: #c0caf5;
  --muted: #9aa5ce;
  --line: #2f3549;
  --line-strong: #565f89;
  --panel: #1f2335;
  --panel-raised: #24283b;
  --accent: #7aa2f7;
  --accent-strong: #bb9af7;
  --accent-text: #11131a;
  --success: #9ece6a;
  --preview-bg: #101014;
  --shadow: rgba(0, 0, 0, 0.3);
  --shadow-strong: rgba(0, 0, 0, 0.44);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--page);
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 12%, transparent), transparent 340px),
    var(--page);
  color: var(--text);
  transition: background-color 180ms ease, color 180ms ease;
}

a {
  color: inherit;
}

button,
select,
input {
  font: inherit;
}

button,
select,
a {
  -webkit-tap-highlight-color: transparent;
}

:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 74%, white);
  outline-offset: 3px;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(320px, 760px);
  gap: 24px;
  align-items: end;
  padding: 20px clamp(16px, 4vw, 44px);
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--page-soft) 90%, transparent);
  box-shadow: 0 16px 42px var(--shadow);
  backdrop-filter: blur(18px);
}

.brand {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.eyebrow {
  margin: 0;
  color: var(--success);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 48px);
  line-height: 1.02;
}

.toolbar {
  display: grid;
  grid-template-columns: minmax(260px, 1fr) 180px 78px;
  gap: 14px;
  align-items: start;
}

.field {
  display: grid;
  gap: 6px;
  min-width: 0;
  color: var(--muted);
  font-size: 12px;
  font-weight: 800;
  line-height: 1;
}

.search input,
.theme-picker select {
  width: 100%;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0 12px;
  background: var(--panel);
  color: var(--text);
  box-shadow: inset 0 1px 0 color-mix(in srgb, white 18%, transparent);
}

.search input::placeholder {
  color: color-mix(in srgb, var(--muted) 82%, transparent);
}

.theme-picker {
  min-width: 0;
}

.toggle-button {
  width: 100%;
  height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0 14px;
  background: var(--panel-raised);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
}

.layout {
  display: grid;
  grid-template-columns: minmax(320px, 520px) minmax(520px, 1fr);
  gap: 20px;
  padding: 20px clamp(16px, 4vw, 44px) 44px;
}

.gallery {
  display: grid;
  gap: 12px;
  align-content: start;
}

.card {
  display: grid;
  grid-template-columns: 160px 1fr;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 10px 28px var(--shadow);
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

.card:hover {
  border-color: color-mix(in srgb, var(--accent) 58%, var(--line));
  box-shadow: 0 16px 34px var(--shadow-strong);
  transform: translateY(-1px);
}

.preview {
  display: block;
  min-height: 126px;
  background: var(--preview-bg);
}

.preview img,
.no-cover {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 126px;
  object-fit: cover;
}

.no-cover {
  display: grid;
  place-items: center;
  color: var(--page);
  font-size: 28px;
  font-weight: 900;
}

.card-body {
  display: grid;
  gap: 9px;
  padding: 13px;
}

h2 {
  margin: 0;
  font-size: 17px;
  line-height: 1.28;
}

.card p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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
  min-height: 36px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 8px 11px;
  background: var(--panel-raised);
  color: var(--text);
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
  transition: background-color 160ms ease, border-color 160ms ease, transform 160ms ease;
}

.actions a:hover,
.viewer-head a:hover,
.url-row button:hover,
.toggle-button:hover {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--panel-raised));
}

.actions a:first-child {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--accent-text);
}

.actions a:active,
.viewer-head a:active,
.url-row button:active,
.toggle-button:active {
  transform: translateY(1px);
}

.viewer {
  position: sticky;
  top: 104px;
  height: calc(100vh - 124px);
  display: grid;
  grid-template-rows: auto auto 1fr;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: 0 20px 54px var(--shadow-strong);
}

.viewer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--panel-raised);
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
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 9px 10px;
  background: var(--panel-raised);
  color: var(--text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
}

iframe {
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--preview-bg);
}

.is-hidden {
  display: none;
}

:root[data-lang="zh"] [data-i18n-text="en"],
:root[data-lang="en"] [data-i18n-text="zh"] {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

@media (max-width: 1040px) {
  .topbar {
    position: static;
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .toolbar {
    grid-template-columns: minmax(220px, 1fr) 180px 78px;
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

@media (max-width: 640px) {
  .toolbar {
    grid-template-columns: 1fr;
  }

  .theme-picker {
    min-width: 0;
  }

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
