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
      const cover = item.cover
        ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title)}" loading="lazy">`
        : `<div class="no-cover">${escapeHtml(item.title.slice(0, 2))}</div>`;

      return `<article class="card" data-title="${escapeHtml(`${item.title} ${item.slug}`)}">
        <a class="preview" href="${escapeHtml(item.file)}" target="preview">${cover}</a>
        <div class="card-body">
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.summary || "")}</p>
          <div class="actions">
            <a href="${escapeHtml(item.file)}" target="preview">预览</a>
            <a href="${escapeHtml(item.file)}" target="_blank">新窗口</a>
            <a href="${escapeHtml(item.sourceUrl)}" target="_blank">来源</a>
          </div>
        </div>
      </article>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>前端 CSS 效果导览</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header class="topbar">
    <div>
      <p class="eyebrow">GitHub Pages Ready</p>
      <h1>前端 CSS 效果导览</h1>
    </div>
    <label class="search">
      <span>搜索</span>
      <input id="searchInput" type="search" placeholder="输入名字或关键词">
    </label>
  </header>

  <main class="layout">
    <section class="gallery" aria-label="效果列表">
      ${cards}
    </section>
    <aside class="viewer" aria-label="预览窗口">
      <div class="viewer-head">
        <span>预览</span>
        <a id="openCurrent" href="${escapeHtml(items[0]?.file || "#")}" target="_blank">打开当前页</a>
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
  font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
  background: #f4f0e8;
  color: #1f2523;
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
    #f4f0e8;
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
  border-bottom: 1px solid rgba(31, 37, 35, 0.12);
  background: rgba(244, 240, 232, 0.9);
  backdrop-filter: blur(16px);
}

.eyebrow {
  margin: 0 0 6px;
  color: #24735e;
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

.search input {
  width: 100%;
  border: 1px solid rgba(31, 37, 35, 0.18);
  border-radius: 8px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.72);
  color: inherit;
  font: inherit;
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
  border: 1px solid rgba(31, 37, 35, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 18px 42px rgba(31, 37, 35, 0.08);
}

.preview {
  display: block;
  min-height: 132px;
  background: #1f2523;
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
  color: #f4f0e8;
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
  color: #59615e;
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
.viewer-head a {
  border: 1px solid rgba(31, 37, 35, 0.16);
  border-radius: 8px;
  padding: 7px 10px;
  background: #fff;
  color: #1f2523;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;
}

.actions a:first-child {
  background: #24735e;
  color: #fff;
}

.viewer {
  position: sticky;
  top: 112px;
  height: calc(100vh - 134px);
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid rgba(31, 37, 35, 0.14);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 24px 60px rgba(31, 37, 35, 0.12);
}

.viewer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(31, 37, 35, 0.12);
  font-weight: 900;
}

iframe {
  width: 100%;
  height: 100%;
  border: 0;
  background: #fff;
}

.is-hidden {
  display: none;
}

@media (max-width: 980px) {
  .topbar {
    position: static;
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

document.addEventListener("click", (event) => {
  const link = event.target.closest('a[target="preview"]');
  if (link) {
    openCurrent.href = link.href;
  }
});

input.addEventListener("input", () => {
  const keyword = input.value.trim().toLowerCase();
  for (const card of cards) {
    const title = card.dataset.title.toLowerCase();
    card.classList.toggle("is-hidden", keyword && !title.includes(keyword));
  }
});
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
