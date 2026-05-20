# ARCHITECTURE

## 文件职责

- `index.html`：GitHub Pages 首页，展示全部效果卡片和右侧预览窗口。
- `style.css`：首页外观样式。
- `main.js`：首页搜索、预览链接同步、语言切换、主题切换、当前效果 URL 生成和复制。
- `examples/`：每个前端效果的独立 HTML 文件。
- `data/examples.json`：效果元数据，包含标题、摘要、来源地址和本地文件路径。
- `scripts/fetch-fecoder.js`：抓取 fecoder `code-fun` 内容并重新生成静态文件。
- `CONTEXT.md`：当前项目进度和关键决定。
- `README.md`：项目说明、运行方式、部署方式、搜索记录。
- `ARCHITECTURE.md`：项目结构说明。

## 调用关系

`scripts/fetch-fecoder.js` 抓取远端接口和详情页，生成 `examples/`、`data/examples.json`、`index.html`、`style.css`、`main.js`。

`index.html` 加载 `style.css` 和 `main.js`，通过 iframe 预览 `examples/` 下的独立页面，并通过按钮切换语言和主题。当前效果 URL 由浏览器当前地址和示例相对路径拼出。

## 关键设计决定

- 使用静态文件，不引入框架，原因是 GitHub Pages 可以直接托管。
- 示例页独立保存，原因是每个效果互不影响，预览更稳定。
- 文件名包含中文标题，原因是打开目录时能直接知道每个文件是什么效果。
