# CONTEXT

当前进度：已从 https://www.fecoder.cn/ 抓取 `code-fun` 分类下 220 个前端效果，生成 GitHub Pages 静态导览页。

上次停在哪里：导览页、独立示例页、数据文件和抓取脚本都已生成，等待本地校验。

关键决定：
- 只抓 `book_id=3` 的 `code-fun` 内容，因为它对应前端效果预览，避免混入资讯文章。
- 每个效果保存为独立 HTML，文件名包含序号、中文标题和原 slug，方便一眼看懂。
- 首页使用 iframe 预览，适合直接发布到 GitHub Pages。
