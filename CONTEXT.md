# CONTEXT

当前进度：已从 https://www.fecoder.cn/ 抓取 `code-fun` 分类下 220 个前端效果，生成 GitHub Pages 静态导览页，并加入中英文切换、多主题切换、当前效果完整 URL 展示与一键复制。本次已在 `ui-theme-gallery-refresh` 分支完成 UI 重构，并补充 10 个 Termius 常见终端主题。

上次停在哪里：导览页、独立示例页、数据文件和抓取脚本都已生成；首页 UI 已升级为 GitHub、Tokyo Night 和 10 个 Termius 常见终端主题，顶部搜索/主题/语言控件已统一排版，生成脚本已同步模板；README 已精简为中英文双语用法说明。

关键决定：
- 只抓 `book_id=3` 的 `code-fun` 内容，因为它对应前端效果预览，避免混入资讯文章。
- 每个效果保存为独立 HTML，文件名包含序号、中文标题和原 slug，方便一眼看懂。
- 首页使用 iframe 预览，适合直接发布到 GitHub Pages。
- 语言切换保留中文原文，英文标题来自原 slug 的可读化结果，避免编造逐条翻译。
- 每个效果都保留 `examples/*.html` 独立路径，GitHub Pages 下可以直接通过域名加路径访问。
- 多主题只改变首页外观，不改 220 个效果内容，避免影响原始预览。
