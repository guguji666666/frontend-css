# Frontend CSS Gallery

[中文](#中文) | [English](#english)

## 中文

一个可直接发布到 GitHub Pages 的前端效果导览站。

项目收录 `fecoder.cn` 的 `code-fun` 前端效果，共 220 个。首页可以搜索、预览、打开独立效果页、查看来源，也可以复制当前效果的完整访问 URL。

### 重点

- 纯静态 HTML / CSS / JS。
- 不需要后端、数据库或构建工具。
- 每个效果都是 `examples/` 下的独立 HTML。
- 首页支持中文/英文切换。
- 首页支持 GitHub、Tokyo Night 和 10 个 Termius 常见终端主题。
- `scripts/fetch-fecoder.js` 可重新抓取并生成全部静态文件。

### 使用

直接打开：

```text
index.html
```

需要本地服务时，在项目根目录启动任意静态服务器即可，例如：

```bash
ruby -run -e httpd . -p 4173
```

然后访问：

```text
http://127.0.0.1:4173
```

### 更新数据

```bash
node scripts/fetch-fecoder.js
```

运行后会重新生成：

- `index.html`
- `style.css`
- `main.js`
- `data/examples.json`
- `examples/*.html`

### 部署

推送到 GitHub 后，在仓库 Settings 里开启 GitHub Pages，选择当前分支和根目录。

单个效果页路径示例：

```text
https://用户名.github.io/仓库名/examples/001-一个可交互的火箭-loading-动画-interactive-rocket-through-space-css-animation.html
```

## English

A static front-end effects gallery ready for GitHub Pages.

It collects 220 `code-fun` effects from `fecoder.cn`. The homepage supports search, inline preview, opening standalone effect pages, source links, and copying the full URL of the current preview.

### Highlights

- Plain HTML / CSS / JS.
- No backend, database, or build step.
- Each effect is a standalone HTML file under `examples/`.
- Chinese / English UI switch.
- GitHub, Tokyo Night, and 10 popular Termius-style terminal themes.
- `scripts/fetch-fecoder.js` can regenerate the whole static site.

### Usage

Open directly:

```text
index.html
```

Or run any static server from the project root, for example:

```bash
ruby -run -e httpd . -p 4173
```

Then visit:

```text
http://127.0.0.1:4173
```

### Refresh Data

```bash
node scripts/fetch-fecoder.js
```

This regenerates:

- `index.html`
- `style.css`
- `main.js`
- `data/examples.json`
- `examples/*.html`

### Deploy

Push the repo to GitHub, enable GitHub Pages in repository Settings, and select the current branch with the root directory.

Example standalone effect URL:

```text
https://username.github.io/repository/examples/001-一个可交互的火箭-loading-动画-interactive-rocket-through-space-css-animation.html
```
