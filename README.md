# 前端 CSS 效果导览

这是一个可直接发布到 GitHub Pages 的静态网页集合。首页是导览页，点击每个卡片可以在右侧预览对应效果，也可以新窗口打开单个效果页。

## 功能简介

- 收录 `fecoder.cn` 的 `code-fun` 前端效果，共 220 个。
- 每个效果独立保存到 `examples/`。
- 首页支持搜索、预览、新窗口打开和查看来源。
- 首页支持中文/英文切换。
- 首页支持明亮/暗黑模式切换。
- 预览区显示当前效果的完整访问 URL，并支持一键复制。

## 技术架构

- 纯静态 HTML / CSS / JS。
- 不需要后端、不需要数据库、不需要构建工具。
- `scripts/fetch-fecoder.js` 用于重新抓取并生成页面。

## 本地运行

直接打开 `index.html` 即可。

如果需要本地服务，可以用任意静态服务器托管当前目录。

## 部署命令

推到 GitHub 后，在仓库 Settings 里开启 GitHub Pages，选择当前分支和根目录即可。

每个效果都可以通过 GitHub Pages 域名加路径访问，例如：

```text
https://用户名.github.io/仓库名/examples/001-一个可交互的火箭-loading-动画-interactive-rocket-through-space-css-animation.html
```

## 测试方法

```bash
node scripts/fetch-fecoder.js
```

运行成功会重新生成 `index.html`、`style.css`、`main.js`、`data/examples.json` 和 `examples/`。

## 搜索记录

- 已访问 `https://www.fecoder.cn/`，确认首页是 Next.js 站点。
- 已确认公开接口：`https://www.fecoder.cn/api/public/docs/blogs?book_id=3&page=1&page_size=100`。
- 已确认详情页里新版效果使用 Next Flight payload 保存预览 HTML，旧版效果使用内联 `srcDoc` 保存预览 HTML。

## 已完成功能

- 抓取 220 个前端效果。
- 生成 220 个独立预览 HTML。
- 生成 GitHub Pages 首页导览。
- 增加中英文切换和明亮/暗黑模式切换。
- 增加当前效果 URL 展示和复制按钮。
- 生成可复跑抓取脚本。

## 待办

- 无。
# frontend-css
