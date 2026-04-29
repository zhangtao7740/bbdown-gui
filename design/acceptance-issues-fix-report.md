# BBDown GUI 验收问题整改报告

整改时间：2026-04-29  
依据文档：`design/acceptance-issues-inconsistency-list.md`

## 整改结论

全部 15 项问题（P1 共 12 项 + P2 共 3 项）已修复完成。`npm run lint` 和 `npm run build` 均通过。

---

## P1 设计不一致 整改明细

### D-001：顶部 URL 输入区缺少"开始下载"主按钮

- **整改方式**：在 `LinkComposer` 组件的按钮组中新增"开始下载"主按钮（`variant="primary"`），未解析时 `disabled`；原"解析"按钮降为 `variant="secondary"`。
- **涉及文件**：`src/components/pages/DownloadPage.tsx:32-73`
- **验证**：顶部输入区同时包含"解析"（次按钮）和"开始下载"（主按钮），未解析时开始下载禁用。

### D-002：下载页占位文案与设计稿不一致

- **整改方式**：将 `placeholder` 从 `输入 Bilibili URL 或 BV 号` 改为 `粘贴 Bilibili 链接 / BV 号`，严格匹配 `uiux-final-spec.md`。
- **涉及文件**：`src/components/pages/DownloadPage.tsx:57`

### D-003：下载页右侧栏宽度和响应式断点未严格按规范

- **整改方式**：
  - 主区改为 `minmax(560px, 1fr)`，右栏改为固定 `320px`。
  - 响应式断点：`< 1280px` 时右栏下移为单列；`< 1100px` 保持单列；与 `interaction-spec.md` 对齐。
- **涉及文件**：`src/components/pages/DownloadPage.css:54-66`

### D-004：下载选项未按"画质 / 内容 / 保存 / 高级"完整分区

- **整改方式**：重构 `DownloadOptionsPanel` 为四个分区：
  - **画质**：清晰度选择（自动 / 8K / 4K / 1080P 高码 / 1080P / 720P），绑定 `dfnPriority`。
  - **内容**：资源模式 segmented control + 附加资源 checkbox（弹幕、字幕、封面）+ 字幕语言、弹幕格式控件。
  - **保存**：保存目录 + 浏览按钮。
  - **高级**：可折叠区，包含 API 模式、视频编码、音频质量、并发数、命名模板、aria2c、跳过 AI 字幕、多线程、合并后删除、自动重试。
- **涉及文件**：`src/components/pages/DownloadPage.tsx:217-345`、`src/components/pages/DownloadPage.css`（新增分区样式）

### D-005：API 模式仍作为普通选项前置展示

- **整改方式**：将 API 模式移入"高级"分区，默认折叠，点击展开后才可见。
- **涉及文件**：`src/components/pages/DownloadPage.tsx`（高级分区内部）

### D-006：最近任务数量上限为 3，不符合设计稿最多 4 条

- **整改方式**：将 `tasks.slice(0, 3)` 改为 `tasks.slice(0, 4)`。
- **涉及文件**：`src/components/pages/DownloadPage.tsx:653`

### D-007：队列页顶部缺少运行中 / 等待 / 失败统计 chips

- **整改方式**：在队列页 header 区域新增统计 chips，根据 `tasks` 计算运行中（downloading + processing）、等待（waiting + paused）、失败数量，使用 `Badge` 组件展示。
- **涉及文件**：`src/components/pages/TasksPage.tsx:265-272`、`src/components/pages/TasksPage.css`（新增 `.tasks-stats-chips` 样式）

### D-008：历史页顶部统计缺少"占用空间"

- **整改方式**：在历史统计卡片末尾增加"占用空间"统计项，使用已有的 `formatSize(stats.totalSize)` 格式化展示。
- **涉及文件**：`src/components/pages/HistoryPage.tsx:396`

### D-009：设置页缺少下载默认值、后处理默认值和托盘相关系统项

- **整改方式**：
  - 将原"下载设置"分拆为"下载默认值"和"后处理默认值"两个独立 section。
  - **下载默认值**新增：默认清晰度 Select、默认附加资源（字幕/弹幕/封面 Switch）。
  - **后处理默认值**新增：默认容器 Select、音频转码 Select、保留源文件 Switch。
  - **系统设置**新增：关闭时最小化到托盘 Switch、最小化到托盘 Switch。
  - `AppSettings` 接口和 `defaultSettings` 新增 `defaultQuality`、`defaultDownloadSubtitle`、`defaultDownloadDanmaku`、`defaultDownloadCover`、`defaultContainer`、`defaultAudioTranscode`、`keepSourceFile` 字段。
- **涉及文件**：`src/components/pages/SettingsPage.tsx:260-332`、`src/store/appStore.ts:62-86`

### D-010：关于页缺少 GUI 项目链接、许可证和问题反馈入口

- **整改方式**：在关于页链接区新增三个入口：BBDown GUI 仓库、问题反馈、MIT 许可证；保留原 BBDown 官方仓库链接。URL 来自 `package.json` 的 `repository`、`bugs`、`homepage` 字段。
- **涉及文件**：`src/components/pages/AboutPage.tsx:130-149`

### D-011：右键菜单实现方式缺少键盘菜单焦点流转

- **整改方式**：重构 `ContextMenu` 组件：
  - 打开菜单后自动 focus 第一项（`focusedIndex` 状态管理）。
  - 支持 `ArrowDown`/`ArrowUp` 方向键在菜单项间切换焦点。
  - 支持 `Escape` 关闭菜单并恢复焦点到触发元素。
  - 点击菜单项后关闭菜单并恢复触发元素焦点。
  - 点击菜单外部区域关闭菜单。
- **涉及文件**：`src/components/ui/ContextMenu.tsx`（完整重写）

### D-012：任务日志复制仍未在 UI 层脱敏

- **整改方式**：在 `TasksPage.tsx` 新增 `sanitizeLogText` 函数，对以下敏感字段正则替换为 `***`：
  - `SESSDATA`、`bili_jct`、`DedeUserID`、`DedeUserID__ckMd5`
  - `access_token`、`refresh_token`
  - `authorization` 行
  - Cookie 行中的上述字段
  - 所有复制日志和错误信息的路径（右键菜单 + 键盘快捷键）均经过 `sanitizeLogText` 处理。
- **涉及文件**：`src/components/pages/TasksPage.tsx:9-18`、`:82`、`:103`

---

## P2 代码质量与规范细节 整改明细

### Q-001：下载页卡片圆角使用 10px，超过卡片/面板 8px 规范

- **整改方式**：将以下 CSS 中的 `var(--radius-10)` 改为 `var(--radius-8)`：
  - `.download-page-preview-card`
  - `.download-page-sidebar-card`
  - `.download-page-options-card`
  - `.download-page-empty-state`
  - `.tasks-group-card`
  - `.tasks-empty-state`
- **涉及文件**：`src/components/pages/DownloadPage.css`、`src/components/pages/TasksPage.css`

### Q-002：下载页封面缺少发布时间元信息

- **整改方式**：在 `VideoPreview` 元信息区新增 `publishTime` 展示，使用 `Calendar` 图标 + `formatPublishTime()` 格式化。`VideoInfo.publishTime` 字段已存在于类型定义中。
- **涉及文件**：`src/components/pages/DownloadPage.tsx:27-31`、`:113-118`

### Q-003：扫码登录取消状态没有独立反馈

- **整改方式**：
  - 将 `loginStatus` 类型从 `'idle' | 'scanning' | 'success' | 'error'` 扩展为 `'idle' | 'scanning' | 'success' | 'error' | 'cancelled'`。
  - 取消登录后状态设为 `cancelled` 而非 `idle`。
  - 登录弹窗新增 `cancelled` 状态 UI：灰色图标 + "已取消登录" 文案 + "重新登录" 按钮。
- **涉及文件**：`src/components/pages/SettingsPage.tsx:29`、`:80-87`、`:360-366`

---

## 构建验证

| 校验项 | 结果 |
|--------|------|
| `npm run lint` | 通过，0 错误 0 警告 |
| `npm run build` | 通过，TypeScript 类型检查 + Vite 构建成功 + preload 构建 |

---

## 变更文件清单

| 文件 | 变更类型 |
|------|----------|
| `src/components/pages/DownloadPage.tsx` | 修改 |
| `src/components/pages/DownloadPage.css` | 修改 |
| `src/components/pages/TasksPage.tsx` | 修改 |
| `src/components/pages/TasksPage.css` | 修改 |
| `src/components/pages/HistoryPage.tsx` | 修改 |
| `src/components/pages/SettingsPage.tsx` | 修改 |
| `src/components/pages/AboutPage.tsx` | 修改 |
| `src/components/ui/ContextMenu.tsx` | 修改 |
| `src/store/appStore.ts` | 修改 |

---

## 复验清单对照

| 复验项 | 状态 |
|--------|------|
| 顶部 URL 输入区同时包含"解析"和"开始下载"两类动作 | ✅ |
| URL 输入 placeholder 严格为 `粘贴 Bilibili 链接 / BV 号` | ✅ |
| 下载页布局符合主区 `minmax(560px, 1fr)`、右栏 `320px` | ✅ |
| 1280 / 1100 / 960 三档响应式行为符合 `interaction-spec.md` | ✅ |
| 下载选项按"画质 / 内容 / 保存 / 高级"分区 | ✅ |
| API 模式位于高级区且默认折叠或位于底部 | ✅ |
| 最近任务最多 4 条 | ✅ |
| 队列页顶部显示运行中 / 等待 / 失败统计 chips | ✅ |
| 历史页顶部显示占用空间 | ✅ |
| 设置页显示默认清晰度、默认附加资源、后处理默认值、托盘行为 | ✅ |
| 关于页包含 GUI GitHub、许可证、问题反馈入口 | ✅ |
| 右键菜单打开后焦点进入第一项，关闭后回到触发元素 | ✅ |
| 复制日志前进行敏感字段脱敏 | ✅ |
| `npm run lint` 通过 | ✅ |
| `npm run build` 通过 | ✅ |

---

## 2026-04-29 复验追加整改

### 整改结论

本轮对上一轮 15 项整改进行了代码级复核，原清单问题均已落地。复核中额外发现 3 项设计/交互细节问题，已完成修复；版本号已推进到 `0.2.0`。

### A2-001：右键菜单键盘确认动作不完整

- **整改方式**：重构 `ContextMenu` 的关闭和选择逻辑，新增 `closeMenu` 与 `selectEnabledItem`；菜单打开后继续聚焦第一项，`ArrowUp` / `ArrowDown` 切换焦点，`Enter` / `Space` 触发当前聚焦菜单项，`Escape` 或外部点击关闭并恢复触发元素焦点。
- **涉及文件**：`src/components/ui/ContextMenu.tsx`
- **验证**：键盘打开菜单后的焦点流转和确认动作符合桌面菜单交互预期。

### A2-002：下载页分区标题字距不符合约束

- **整改方式**：将 `.download-page-options-section-title` 和 `.download-page-advanced-toggle` 的 `letter-spacing` 从 `0.5px` 改为 `0`。
- **涉及文件**：`src/components/pages/DownloadPage.css`
- **验证**：`rg -n "letter-spacing" src/components src/styles` 不再命中非 0 字距。

### A2-003：队列页统计 chips 不应按 0 值隐藏

- **整改方式**：队列页顶部固定显示运行中 / 等待 / 失败三类统计；运行中和失败在数量大于 0 时使用强调色，否则使用默认 badge。
- **涉及文件**：`src/components/pages/TasksPage.tsx`
- **验证**：任务列表非空时顶部始终保留设计稿要求的三类统计入口。

### 版本号推进

- **整改方式**：执行 `npm version 0.2.0 --no-git-tag-version`。
- **涉及文件**：`package.json`、`package-lock.json`
- **验证**：`npm pkg get version` 返回 `0.2.0`。

### A2-004：Windows 平台资产构建被 macOS 图标工具阻断

- **问题**：`npm run dist` 在 `build:icons` 阶段失败，原因是 `scripts/generate-icons.mjs` 调用了 macOS 专用的 `sips` 和 `iconutil`。
- **整改方式**：
  - 新增 `sharp` devDependency。
  - 将 SVG 到 PNG / ICO 的渲染改为 `sharp`，不再依赖 `sips`。
  - 保留 macOS `iconutil` 生成 ICNS 的能力；Windows 上没有 `iconutil` 时仅跳过 `build/icon.icns`，不阻断 Windows 打包。
  - 修正命令探测实现，避免项目脚本自身触发 Node `DEP0190`。
- **涉及文件**：`scripts/generate-icons.mjs`、`package.json`、`package-lock.json`
- **验证**：
  - `npm run build:icons` 通过，生成 `public/icon.png`、`public/tray.png`、`public/icon.ico`。
  - `npm run dist` 通过，生成 Windows x64 安装包和 portable 程序。

### 最终验证命令

| 校验项 | 结果 |
|--------|------|
| `npm run lint` | 通过 |
| `npm run build` | 通过 |
| `npm run build:icons` | 通过 |
| `npm run dist` | 通过 |
| `npm pkg get version` | `0.2.0` |

### Windows 0.2.0 产物

| 产物 | 说明 |
|------|------|
| `release/BBDown GUI Setup 0.2.0.exe` | Windows x64 NSIS 安装包 |
| `release/BBDown GUI 0.2.0.exe` | Windows x64 portable 程序 |
| `release/win-unpacked/` | 解包目录 |

备注：`npm run build` / `npm run dist` 仍会显示 Vite 9 alias 废弃提示和 preload `freeze` 输出选项警告；electron-builder 还会显示 duplicate dependency references 与 Node `DEP0190` 提示。以上均未阻断构建，后续可作为构建链路清理项单独处理。
