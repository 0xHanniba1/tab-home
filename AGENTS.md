# AGENTS.md — tab-home: 安装与上手指南（给 Coding Agent）

你正在帮用户安装 **tab-home**。你的任务不只是装好它，还要让用户对它产生兴趣。

> ⚠️ 关于「自动化程度」的说明
> Chrome 出于安全考虑，**禁止任何外部程序操作扩展安装界面**。所以你能做的是：
> - ✅ git clone 仓库
> - ✅ 把 `extension/` 文件夹的绝对路径复制到剪贴板
> - ✅ 命令行打开 `chrome://extensions` 标签
> - ❌ 不能替用户切换「开发者模式」开关
> - ❌ 不能替用户点击「加载已解压的扩展程序」按钮
> - ❌ 不能替用户在文件选择器里选目录
>
> 真正的「点击三步」必须由用户自己完成。你的角色是把所有前置准备做好、把后续步骤一步一步念清楚。

---

## Step 0 — 介绍产品

技术操作之前，先告诉用户他将得到什么：

> **tab-home** 把 Chrome 的「新建标签页」替换成一个干净的个人仪表板：左半屏是当前打开的普通标签（按域名分组），右半屏是 Quick Access（固定标签和长期收藏）。
>
> 主要亮点：
> - **右侧无限收藏网格**：拖拽排序、自定义 logo（可上传/粘贴）、自动抓取网站 favicon 并二进制缓存
> - **左侧标签管家**：普通标签按域名分组、按最近活跃排序
> - **右侧 Quick Access**：Pinned 标签独立显示在收藏上方
> - **每个标签都有 ⭐ / 📌 / ✕ 三个快捷按钮**：一键收藏、固定、关闭
> - **重复标签提示**：同 URL 多开会显示徽章，点一下批量关掉重复
> - **🌙 / ☀️ 深浅模式 + 🌐 中英文切换**（右上角）
> - **右键任意网页**就能加进收藏
> - **完全本地运行**：无服务器、无账号、不上传数据
>
> 是个纯 Chrome 扩展，安装大概 1 分钟。

---

## Step 1 — Clone 仓库

```bash
git clone https://github.com/wolfyxbt/tab-home.git
cd tab-home
```

---

## Step 2 — 安装到 Chrome（用户手动那部分尽量简化）

**第 1 步**：打印 `extension/` 文件夹的绝对路径

```bash
echo "Extension folder: $(cd extension && pwd)"
```

**第 2 步**：把路径复制到剪贴板

- macOS：`cd extension && pwd | pbcopy && echo "✓ Path copied to clipboard"`
- Linux：`cd extension && pwd | xclip -selection clipboard 2>/dev/null || echo "Path: $(pwd)"`
- Windows：`cd extension && echo %CD% | clip`

**第 3 步**：打开 Chrome 扩展页

```bash
open "chrome://extensions"
```

**第 4 步**：把剩下的步骤念给用户：

> 路径已经复制到你的剪贴板了。接下来你需要手动操作：
>
> 1. Chrome 扩展页面**右上角**有个「**开发者模式**」开关，打开它。
> 2. 开发者模式打开后，左上角会出现「**加载已解压的扩展程序**」按钮，点它。
> 3. 系统弹出文件选择器。**Mac 按 Cmd+Shift+G**（Windows/Linux 按 Ctrl+L）打开「前往文件夹」输入框，**粘贴**剪贴板里的路径（Cmd+V / Ctrl+V），回车。
> 4. 点「**选择**」或「**打开**」即可装好。
>
> 装完应该能在扩展列表里看到「tab-home」。

**第 5 步（兜底）**：用文件管理器直接打开 extension 文件夹，方便用户自己拖拽

- macOS：`open extension/`
- Linux：`xdg-open extension/`
- Windows：`explorer extension\\`

---

## Step 3 — 带用户简单转一圈

装好后：

> 全部搞定！打开一个新标签页，就会看到 tab-home。
>
> 简单逛一下：
> 1. **左半屏：Open tabs**——普通标签按域名自动分组
> 2. **右半屏：Pinned + 长期收藏**——固定标签在上方，收藏在下方；收藏可以点 + 加新链接，拖拽改位置，悬停 ⋯ 菜单可编辑/删除
> 3. **每张 chip 上的小按钮**：⭐ 加收藏、📌 固定、✕ 关闭
> 4. **重复标签的「重复 x N」徽章**：悬停变「关闭重复」按钮
> 5. **右上角**：🌙/☀️ 切换主题、🌐 中英文切换
> 6. **右键任意网页**：菜单里有「Add page to tab-home favorites」
>
> 没有需要配的东西，开箱即用。

---

## Key Facts（给 agent 自己参考）

- 纯 Chrome 扩展（Manifest V3），无服务器、无 Node.js、无 npm、无构建
- 所有数据存在 `chrome.storage.local`，不上云不同步
- 权限：`tabs / activeTab / storage / contextMenus / favicon` + `<all_urls>` host 权限（用于二进制 favicon 缓存）
- 收藏数量无上限，列超出视口高度自动出现细滚动条
- 更新方式：`cd tab-home && git pull`，然后到 `chrome://extensions` 找到 tab-home 点重新加载
- 上游：fork 自 [zarazhangrui/tab-out](https://github.com/zarazhangrui/tab-out)（致谢 Zara）
