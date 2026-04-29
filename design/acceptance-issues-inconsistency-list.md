# BBDown GUI 设计验收 / 问题 / 不一致清单

生成时间：2026-04-29  
校验范围：`design/` 设计规范、`design/coding-work-plan.md`、`design/work-progress.md`、`src/` 前端实现、`electron/` IPC 与 preload 暴露 API、`package.json` 构建脚本。

## 结论

本轮复验中，P0 构建阻断已解除：`npm run lint` 和 `npm run build` 均通过，`@fluentui` 源码引用、原生 `window.confirm/prompt/alert`、错误的 `window.electron` 调用和上一轮列出的未定义 token 均未发现有效残留。

但当前实现仍不能按 `work-progress.md` 所述进入“设计规范 100% 覆盖率”的最终验收状态。主要差距集中在下载页信息架构、下载选项完整度、队列/历史统计、设置页配置覆盖、关于页链接信息，以及部分交互语义仍偏“能用”而非严格符合设计稿。

建议验收状态：不通过，需继续整改后重新验收。

## 实际命令校验

| 校验项 | 实际结果 | 影响 |
| --- | --- | --- |
| `npm run lint` | 通过 | P0 已解除 |
| `npm run build` | 通过；仅有 Vite / preload 打包警告 | P0 已解除，警告可后续处理 |
| `rg --pcre2 "@fluentui|window\\.confirm|window\\.prompt|window\\.alert|window\\.electron(?!API)" src electron package.json` | 无有效命中 | 旧 UI 与原生弹窗清理项通过 |
| `rg "--space-36|--radius-12|--color-bg-secondary|--color-text-secondary" src` | 无有效命中 | 上轮未定义 token 清理项通过 |

## P1 设计不一致

### D-001：顶部 URL 输入区缺少设计要求的“开始下载”主按钮

- 规范来源：`uiux-final-spec.md` 下载页顶部输入区要求输入框、次按钮“解析”、主按钮“开始下载”，未解析时开始下载禁用。
- 代码证据：`src/components/pages/DownloadPage.tsx:35-66` 的 `LinkComposer` 只渲染输入框和“解析”按钮；“开始下载”按钮在 `VideoPreview` 内部 `src/components/pages/DownloadPage.tsx:120`。
- 不一致：顶部 URL / BV 输入区没有形成设计稿要求的一组明确动作。
- 影响：第一屏核心工作流与设计稿不一致，用户需要在解析结果卡中寻找主动作。
- 建议：在 `LinkComposer` 右侧增加主按钮“开始下载”，未解析时禁用，解析成功后触发同一个下载确认流程；预览卡内可保留次要入口或移除重复按钮。

### D-002：下载页占位文案与设计稿不一致

- 规范来源：`uiux-final-spec.md` 明确要求 placeholder 为 `粘贴 Bilibili 链接 / BV 号`。
- 代码证据：`src/components/pages/DownloadPage.tsx:57` 使用 `输入 Bilibili URL 或 BV 号`。
- 影响：细节文案没有严格按设计稿落地。
- 建议：改为设计稿指定文案。

### D-003：下载页右侧栏宽度和响应式断点未严格按规范

- 规范来源：`uiux-final-spec.md` 下载页要求主区 `minmax(560px, 1fr)`、右侧状态栏 `320px`；`interaction-spec.md` 要求 `>=1280px` 三栏，`1100-1279px` 右栏下移，`960-1099px` 侧栏变窄且右栏折叠/隐藏。
- 代码证据：`src/components/pages/DownloadPage.css:56` 使用 `minmax(0, 1fr) minmax(300px, 340px)`；`src/components/pages/DownloadPage.css:60-64` 在 `1180px` 才变单列。
- 不一致：主工作区最小宽度、右栏固定宽度和断点均未严格匹配规范。
- 影响：在 1100-1279px 区间的布局行为会偏离设计稿。
- 建议：按规范改为主区 `minmax(560px, 1fr)`、右栏 `320px`，并补齐 1280 / 1100 / 960 三档响应式规则。

### D-004：下载选项未按“画质 / 内容 / 保存 / 高级”完整分区

- 规范来源：`uiux-final-spec.md` 要求下载选项按“画质 / 内容 / 保存 / 高级”分区，并覆盖画质、内容、附加资源、格式、性能、保存和高级项。
- 代码证据：`src/components/pages/DownloadPage.tsx:217-325` 的 `DownloadOptionsPanel` 仅展示保存目录、API 模式、资源模式和若干 checkbox。
- 不一致：缺少可见的画质选择、字幕语言、弹幕格式、音频质量、视频编码、并发数、命名模板等设计项；UI 也没有分区标题。
- 影响：下载页没有达到设计稿定义的功能可见性和信息架构。
- 建议：按设计稿拆成 `画质`、`内容`、`保存`、`高级` 四个 section；现有 store 中已有 `dfnPriority`、`encodingPriority`、`threadCount`、`filePattern` 等字段，应接入对应控件。

### D-005：API 模式仍作为普通选项前置展示

- 规范来源：`uiux-final-spec.md` 明确“API 模式属于高级配置，默认折叠或放到下载选项底部”。
- 代码证据：`src/components/pages/DownloadPage.tsx:251-266` 在保存目录之后立即展示 API 模式，且没有高级折叠区。
- 影响：高级配置权重过高，违背设计稿对默认工作流的简化要求。
- 建议：将 API 模式移入高级分区，默认折叠或放在下载选项末尾。

### D-006：最近任务数量上限为 3，不符合设计稿最多 4 条

- 规范来源：`uiux-final-spec.md` 右侧状态栏要求最近任务最多 4 条。
- 代码证据：`src/components/pages/DownloadPage.tsx:580` 使用 `tasks.slice(0, 3)`。
- 影响：设计稿约定的信息密度未严格落地。
- 建议：改为 `tasks.slice(0, 4)`，并保证卡片高度压缩，避免与队列页重复。

### D-007：队列页顶部缺少运行中 / 等待 / 失败统计 chips

- 规范来源：`uiux-final-spec.md` 队列页顶部要求统计 chips：运行中、等待、失败，并提供全部暂停、全部继续、清理完成。
- 代码证据：`src/components/pages/TasksPage.tsx:267-291` 有标题、副标题和批量按钮，但没有运行中 / 等待 / 失败 chips。
- 影响：队列页无法按设计稿快速概览关键状态。
- 建议：根据 `tasks` 或 `api.task.stats()` 计算并显示运行中、等待、失败 chips。

### D-008：历史页顶部统计缺少“占用空间”

- 规范来源：`uiux-final-spec.md` 历史页顶部统计要求：总任务、完成、失败、产物、缺失文件、占用空间。
- 代码证据：`src/components/pages/HistoryPage.tsx:390-395` 只展示任务、完成、失败、产物、缺失；`stats.totalSize` 在 `src/components/pages/HistoryPage.tsx:340` 有状态字段但未展示。
- 影响：历史页统计信息不完整。
- 建议：增加“占用空间”统计项，使用 `formatSize(stats.totalSize)` 展示。

### D-009：设置页缺少下载默认值、后处理默认值和托盘相关系统项

- 规范来源：`uiux-final-spec.md` 设置页要求下载默认值包含默认目录、并发数、默认清晰度、默认附加资源；后处理包含默认容器、音频转码、保留源文件；系统包含通知、启动时检查更新、最小化到托盘。
- 代码证据：`src/components/pages/SettingsPage.tsx:260-300` 只展示默认下载目录和最大同时下载数；`src/components/pages/SettingsPage.tsx:321-330` 只展示通知和自动检查更新。`src/store/appStore.ts:69-70` 已有 `closeToTray`、`minimizeToTray` 字段但 UI 未展示。
- 不一致：设置页未覆盖设计稿定义的完整配置组。
- 影响：用户无法在设置页配置默认清晰度、默认附加资源、后处理策略和托盘行为。
- 建议：补齐默认清晰度、默认附加资源、后处理默认值、保留源文件、关闭/最小化到托盘等控件。

### D-010：关于页缺少 GUI 项目链接、许可证和问题反馈入口

- 规范来源：`uiux-final-spec.md` 关于页要求 GitHub、许可证、问题反馈。
- 代码证据：`src/components/pages/AboutPage.tsx:130-136` 仅提供 `BBDown 官方仓库` 链接；`package.json:8-15` 已存在 GUI 项目的 repository、bugs 和 homepage 元信息。
- 影响：关于页没有完成设计稿要求的信息入口，也没有利用已有 package metadata。
- 建议：增加 BBDown GUI 项目仓库、问题反馈、许可证入口；保留 BBDown 官方仓库作为相关项目链接。

### D-011：右键菜单实现方式缺少键盘菜单焦点流转

- 规范来源：`interaction-spec.md` 要求右键菜单打开后焦点进入菜单第一项，菜单关闭后焦点回到触发元素。
- 代码证据：`src/components/ui/ContextMenu.tsx:44-66` 仅通过 portal 渲染菜单并监听 click/scroll/resize/keydown 关闭，没有将焦点移动到第一项，也没有恢复触发元素焦点。
- 影响：右键菜单虽然可用，但不满足桌面交互规范中的焦点流转要求。
- 建议：记录触发元素，打开菜单后 focus 第一项；关闭时恢复触发元素焦点；同时支持方向键和 Esc。

### D-012：任务日志复制仍未在 UI 层脱敏

- 规范来源：`runtime-reliability-security-spec.md` 与 `coding-work-plan.md` Step 7 要求复制日志不包含 Cookie 或敏感字段。
- 代码证据：`src/components/pages/TasksPage.tsx:82` 和 `src/components/pages/TasksPage.tsx:103` 直接复制 `task.error` 或 `logs.map(...).join('\n')`。
- 不一致：当前 UI 层没有任何脱敏兜底。
- 影响：如果主进程或 BBDown 输出中出现 `SESSDATA`、`bili_jct`、`DedeUserID` 等敏感字段，复制操作可能泄露。
- 建议：在复制前增加统一 `sanitizeLogText`，对 Cookie、token、authorization、SESSDATA、bili_jct、DedeUserID 等字段做脱敏。

## P2 代码质量与规范细节

### Q-001：下载页卡片圆角使用 10px，超过卡片/面板 8px 规范

- 规范来源：`design-tokens-spec.md` 规定卡片不超过 8px，除非是窗口或大弹窗。
- 代码证据：`src/components/pages/DownloadPage.css:72`、`:213`、`:378` 等卡片/空状态使用 `var(--radius-10)`。
- 影响：视觉细节与 token 使用规则不完全一致。
- 建议：普通卡片和面板改为 `--radius-8`；仅窗口或较大 Dialog 使用 `--radius-10`。

### Q-002：下载页封面缺少发布时间元信息

- 规范来源：`uiux-final-spec.md` 视频预览元信息要求 UP 主、BV、发布时间、时长、分区。
- 代码证据：`src/components/pages/DownloadPage.tsx:96-107` 展示 UP、BV、时长、分区，但没有展示 `publishTime`。
- 影响：视频预览信息不完整。
- 建议：补充发布时间字段，注意长文本截断。

### Q-003：扫码登录取消状态没有独立反馈

- 规范来源：`coding-work-plan.md` Step 9 验收要求扫码登录有初始化、二维码、成功、失败、取消状态。
- 代码证据：`src/components/pages/SettingsPage.tsx:40` 的 `loginStatus` 类型只有 `idle | scanning | success | error`，`src/components/pages/SettingsPage.tsx:82-89` 取消后回到 `idle`。
- 影响：用户取消登录后没有明确状态反馈。
- 建议：增加 `cancelled` 状态或取消反馈文案。

## 已通过或基本符合项

- `npm run lint` 通过。
- `npm run build` 通过。
- `@fluentui` 源码引用已清理。
- `ThemeProvider` 已恢复，并能写入 `theme-*` 与 `platform-*` class。
- “仅视频 / 仅音频 / 完整视频”已改为互斥 segmented control。
- 下载确认弹窗已实现。
- 下载页右侧已包含工具状态、账号状态、最近任务。
- 右键菜单已在下载、队列、历史、设置页做了基础落地。
- 设计 SVG 素材已复制到 `src/assets` 并在关键空状态 / 关于页使用。
- 关于页外部链接已通过 `api.util.openExternal` 调用。
- 原生 `window.confirm/prompt/alert` 未发现有效残留。
- 历史页重命名、移除、删除、清空等操作已改用项目自有 Dialog。

## `work-progress.md` 与实际状态不一致记录

| 进度清单声明 | 实际校验 | 结论 |
| --- | --- | --- |
| 设计规范 100% 覆盖率 | 下载页、队列页、历史页、设置页、关于页仍有多项设计稿缺口 | 不一致 |
| Step 6：下载页实现设计稿流程 | 顶部缺少开始下载主按钮，下载选项未完整分区，API 模式未放入高级区 | 不一致 |
| Step 7：队列页顶部统计 chips 完成 | 仅有副标题和批量按钮，缺少运行中 / 等待 / 失败 chips | 不一致 |
| Step 8：历史统计完整 | 缺少占用空间统计项 | 不一致 |
| Step 9：下载默认值和后处理默认值完成 | UI 未展示默认清晰度、默认附加资源、后处理默认值 | 不一致 |
| Step 9：扫码登录有取消状态 | 取消后回到 idle，没有独立取消状态或反馈 | 部分符合 |
| Step 10：关于页包含 GitHub、许可证、问题反馈 | 仅有 BBDown 官方仓库链接 | 不一致 |
| interaction-spec：右键菜单焦点流转完成 | ContextMenu 未 focus 第一项，也未恢复触发元素焦点 | 不一致 |

## 建议整改顺序

1. 下载页先补顶部“开始下载”按钮、精确 placeholder、320px 右栏和规范断点。
2. 下载选项重构为“画质 / 内容 / 保存 / 高级”四区，补齐质量、格式、性能、命名模板等控件。
3. 队列页补运行中 / 等待 / 失败统计 chips。
4. 历史页补“占用空间”统计。
5. 设置页补默认清晰度、默认附加资源、后处理默认值、托盘行为。
6. 关于页补 GUI 仓库、问题反馈、许可证入口。
7. ContextMenu 补焦点流转和键盘菜单导航。
8. 日志复制前增加 UI 层脱敏兜底。
9. 再执行 `npm run lint`、`npm run build` 和 Electron 窗口 smoke test。

## 复验清单

- [ ] 顶部 URL 输入区同时包含“解析”和“开始下载”两类动作。
- [ ] URL 输入 placeholder 严格为 `粘贴 Bilibili 链接 / BV 号`。
- [ ] 下载页布局符合主区 `minmax(560px, 1fr)`、右栏 `320px`。
- [ ] 1280 / 1100 / 960 三档响应式行为符合 `interaction-spec.md`。
- [ ] 下载选项按“画质 / 内容 / 保存 / 高级”分区。
- [ ] API 模式位于高级区且默认折叠或位于底部。
- [ ] 最近任务最多 4 条。
- [ ] 队列页顶部显示运行中 / 等待 / 失败统计 chips。
- [ ] 历史页顶部显示占用空间。
- [ ] 设置页显示默认清晰度、默认附加资源、后处理默认值、托盘行为。
- [ ] 关于页包含 GUI GitHub、许可证、问题反馈入口。
- [ ] 右键菜单打开后焦点进入第一项，关闭后回到触发元素。
- [ ] 复制日志前进行敏感字段脱敏。
- [ ] `npm run lint` 通过。
- [ ] `npm run build` 通过。

---

## 2026-04-29 复验追加记录

复验范围：上一轮 `acceptance-issues-fix-report.md` 声明已修复的 D-001 ~ D-012、Q-001 ~ Q-003，以及本轮版本推进和 Windows 平台资产构建前的补充设计一致性校验。

### 复验结论

上一轮 15 项整改已在代码中找到对应落地证据；`npm run lint`、`npm run build` 在版本推进前均已通过。复验中发现 3 个补充问题，已在本轮直接修复。

### A2-001：右键菜单键盘 Enter / Space 选择行为不完整

- 规范来源：`interaction-spec.md` 要求右键菜单具备键盘焦点流转和可操作性。
- 代码证据：`src/components/ui/ContextMenu.tsx` 已实现打开后聚焦第一项和方向键移动，但全局 `keydown` 对 Enter / Space 没有触发当前菜单项选择，可能导致键盘用户只关闭菜单而不执行动作。
- 影响：右键菜单焦点流转已接近规范，但键盘确认动作不完整。
- 整改状态：已修复。

### A2-002：下载页分区标题仍使用 `letter-spacing: 0.5px`

- 规范来源：当前前端设计约束要求文字 `letter-spacing` 为 0。
- 代码证据：`src/components/pages/DownloadPage.css` 的 `.download-page-options-section-title` 和 `.download-page-advanced-toggle` 使用 `letter-spacing: 0.5px`。
- 影响：下载选项分区标题与当前文字规范不一致。
- 整改状态：已修复。

### A2-003：队列页统计 chips 在数量为 0 时隐藏

- 规范来源：`uiux-final-spec.md` 队列页顶部固定要求统计 chips：运行中、等待、失败。
- 代码证据：`src/components/pages/TasksPage.tsx` 中运行中 / 等待 / 失败 chips 原先仅在数量大于 0 时显示。
- 影响：某些状态为 0 时顶部概览不完整，和设计稿“固定三类统计”的信息结构不完全一致。
- 整改状态：已修复。

### 版本推进

- `package.json` 已由 `0.1.4` 推进到 `0.2.0`。
- `package-lock.json` 已同步版本号。

### 本轮复验清单状态

- [x] 上一轮 15 项整改均已在代码中核对。
- [x] 右键菜单 Enter / Space 可触发当前聚焦菜单项。
- [x] 下载页分区标题 `letter-spacing` 已归零。
- [x] 队列页顶部固定显示运行中 / 等待 / 失败统计 chips。
- [x] 版本号已推进到 `0.2.0`。

### A2-004：Windows 平台资产构建脚本依赖 macOS 专用工具

- 触发命令：`npm run dist`。
- 代码证据：`scripts/generate-icons.mjs` 原先调用 `sips` 渲染 PNG，并调用 `iconutil` 生成 ICNS；这两个工具在 Windows 环境不可用。
- 影响：Windows 平台无法执行 `npm run dist`，会在 `build:icons` 阶段失败，阻断 Windows 安装包和 portable 资产生成。
- 整改状态：已修复。图标渲染改为跨平台 `sharp`，Windows 上生成 `public/icon.png`、`public/tray.png`、`public/icon.ico`；无 `iconutil` 时仅跳过 macOS `build/icon.icns`。

### Windows 资产构建结果

- `npm run lint`：通过。
- `npm run build`：通过；仅保留 Vite 9 alias 废弃提示和 preload `freeze` 输出选项警告。
- `npm run build:icons`：通过。
- `npm run dist`：通过，生成 Windows x64 NSIS 安装包、portable 程序和 `win-unpacked`。
- 产物：
  - `release/BBDown GUI Setup 0.2.0.exe`
  - `release/BBDown GUI 0.2.0.exe`
  - `release/win-unpacked/`

备注：打包过程中 electron-builder 输出 duplicate dependency references 和 Node `DEP0190` 提示，未阻断产物生成；单独运行项目 `scripts/build-preload.mjs` 未复现 `DEP0190`，判断为 electron-builder 链路提示，后续可单独跟进。
