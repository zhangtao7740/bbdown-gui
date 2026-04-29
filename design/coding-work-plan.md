# BBDown GUI Coding 工作计划

本文档是实现计划，不是设计计划。每一步都包含编码任务和验收清单。

## Step 1：现状基线确认

目标：在改 UI 前确认工程能跑、能构建、关键能力在哪里。

编码任务：
- 运行 `npm run lint`，记录当前错误。
- 运行 `npm run build`，记录当前错误。
- 梳理现有入口：`src/App.tsx`、`src/store/appStore.ts`、`electron/ipc/index.ts`。
- 梳理核心能力：工具检测、解析、任务管理、历史记录、账号登录。
- 确认当前中文乱码问题影响范围。

验收清单：
- 有一份当前 lint/build 状态记录。
- 知道哪些错误是改造前既有问题。
- 确认 UI 改造不会先动主进程核心业务。

## Step 2：依赖和基础设施

目标：安装 coding 选型需要的前端基础依赖。

编码任务：
- 新增 `lucide-react`。
- 新增需要的 Radix primitive 包。
- 视情况新增 `zod` 和 `@tanstack/react-virtual`。
- 确认 package-lock 更新正常。
- 不删除 Fluent UI，保留过渡期兼容。

验收清单：
- `npm install` 后 lockfile 正常。
- `npm run build` 至少不因为新增依赖失败。
- 新旧 UI 依赖可以短期共存。

## Step 3：样式 token 落地

目标：把设计稿的视觉规范转成代码里的 CSS variables。

编码任务：
- 新增 `src/styles/tokens.css`。
- 新增 `src/styles/themes.css`。
- 新增 `src/styles/platform.css`。
- 在 `src/main.tsx` 或根样式入口引入这些 CSS。
- 定义 light/dark/system 主题变量。
- 定义 Windows/macOS 平台 class。
- 按 `design-tokens-spec.md` 落完整颜色、间距、字体、阴影、尺寸和动画变量。

验收清单：
- 页面背景、文字、边框、主色都来自 CSS variables。
- 切换主题不会依赖 Fluent UI theme 才能工作。
- 平台差异可以通过 class 或 data attribute 覆盖。
- token 名称和 `design-tokens-spec.md` 一致。

## Step 4：基础 UI 组件

目标：建立项目自己的 UI 组件层。

编码任务：
- 新增 `Button`、`IconButton`。
- 新增 `Badge`、`Progress`。
- 新增 `Dialog`、`Select`、`Switch`、`Tooltip`。
- 统一尺寸、圆角、disabled 状态。
- 图标统一从 `lucide-react` 引入。

验收清单：
- 基础组件不直接依赖业务 store。
- 所有按钮有 hover、active、disabled 状态。
- 图标按钮都有 tooltip。
- 组件可以替换下载页和设置页常用控件。

## Step 5：App Shell 迁移

目标：先把应用外壳迁到新设计系统。

编码任务：
- 新增或重构 `AppShell`。
- 重构 `TitleBar` 为 `WindowTitleBar`。
- 重构侧栏为 `SidebarNav`，导航只保留下载、队列、历史、设置、关于。
- 新增底部 `StatusBar`。
- 删除 UI 中已移除页面入口。
- 按 `interaction-spec.md` 实现全局快捷键、焦点流转和最小窗口规则。

验收清单：
- Windows 显示右上三键。
- macOS 预留 traffic lights 安全区。
- 侧栏没有多余入口。
- 当前 tab 切换不回归。
- 活动任务数量仍能显示在队列入口。
- 只用键盘可以切换主要页面。

## Step 6：下载页迁移

目标：实现设计稿里的下载页流程。

编码任务：
- 拆分 `LinkComposer`。
- 拆分 `VideoPreview`。
- 拆分 `PageSelector`。
- 拆分 `DownloadOptionsPanel`。
- 拆分 `StatusRail`。
- 实现 `DownloadConfirmDialog`。
- 统一下载前校验错误显示。
- 将仅音频/仅视频改为互斥模式。
- 按 `error-handling-spec.md` 实现下载页错误文案和恢复操作。
- 按 `interaction-spec.md` 实现下载页右键菜单和快捷键。

验收清单：
- 空状态、解析中、解析成功、解析失败都有 UI。
- 未解析时开始下载不可用。
- 多分 P 能选择、全选、反选。
- 校验错误能明确提示下一步。
- 成功加入队列后有反馈。
- 错误提示包含原因和恢复建议。

## Step 7：队列页迁移

目标：实现队列页的任务组、日志和失败恢复。

编码任务：
- 拆分 `QueueToolbar`。
- 拆分 `TaskGroupCard`。
- 拆分 `TaskRow`。
- 拆分 `TaskLogPanel`。
- 统一 `TaskStatus` 到 UI badge 的映射。
- 日志面板限制渲染行数，必要时接入虚拟滚动。
- 按 `runtime-reliability-security-spec.md` 实现任务日志级别、来源、滚动和脱敏。
- 按 `interaction-spec.md` 实现队列页右键菜单。

验收清单：
- 等待、下载中、处理中、暂停、完成、失败状态可区分。
- 任务组进度和子任务进度显示正确。
- 日志展开不撑坏布局。
- 失败任务能重试或跳转设置/账号。
- 复制日志不包含 Cookie 或敏感字段。

## Step 8：历史页迁移

目标：实现历史产物管理和后处理入口。

编码任务：
- 拆分 `HistoryStats`。
- 拆分 `HistoryFilters`。
- 拆分 `HistoryJobCard`。
- 拆分 `ArtifactTable`。
- 实现 `PostprocessDialog`。
- 实现 `RelocateDialog`。
- 文件名和路径使用截断与 tooltip。
- 按 `interaction-spec.md` 实现历史任务和产物行右键菜单。
- 按 `runtime-reliability-security-spec.md` 确认删除历史记录不删除真实文件。

验收清单：
- 历史统计能正常刷新。
- 搜索和筛选不回归。
- 产物展开后可打开、重命名、移动、重新定位。
- 后处理只在视频/音频产物上出现。
- 缺失文件不会被误导为真实删除。
- 缺失文件有重新定位和移除记录两个恢复路径。

## Step 9：设置页迁移

目标：实现设置页的账号和工具配置。

编码任务：
- 拆分 `AccountSection`。
- 拆分 `ToolPathsSection`。
- 拆分 `DownloadDefaultsSection`。
- 拆分 `AppearanceSection`。
- 实现 `LoginDialog`。
- 工具检测结果和下载页右栏共用状态映射。
- 按 `runtime-reliability-security-spec.md` 实现 Cookie 脱敏和路径校验。
- 明确不做旧配置、历史和 Cookie 迁移；按 breaking change 策略提示旧数据。

验收清单：
- BBDown、FFmpeg、aria2c 状态显示一致。
- 手动选择工具路径后能保存并重新检测。
- 扫码登录有初始化、二维码、成功、失败、取消状态。
- 保存设置后有明确成功反馈。
- 诊断和日志不暴露 Cookie。

## Step 10：关于页和诊断信息

目标：实现关于页可用于排错。

编码任务：
- 新增/重构 `AboutPage`。
- 展示应用版本、Electron 版本、平台信息。
- 展示 BBDown/FFmpeg/aria2c 检测结果。
- 实现复制诊断信息。
- 增加 GitHub/许可证/反馈入口。
- 按 `runtime-reliability-security-spec.md` 收集诊断信息。

验收清单：
- 复制出的诊断信息包含版本、平台、工具路径和工具版本。
- 关于页不承担设置修改。
- 工具状态和设置页一致。
- 诊断信息已脱敏。

## Step 11：移除 Fluent UI 依赖

目标：在页面迁移完成后清理旧 UI 依赖。

编码任务：
- 搜索 `@fluentui/react-components` 使用点。
- 搜索 `@fluentui/react-icons` 使用点。
- 确认所有页面已迁移到自有 UI。
- 从 `package.json` 移除 Fluent 依赖。
- 更新 lockfile。

验收清单：
- `rg "@fluentui" src` 无命中。
- `npm run lint` 通过或只剩明确非本次问题。
- `npm run build` 通过。
- 应用运行时主要页面可打开。

## Step 12：回归验证

目标：确认 UI 重构没有破坏核心下载能力。

编码任务：
- 验证工具检测。
- 验证链接解析。
- 验证加入队列。
- 验证任务状态事件。
- 验证历史记录刷新。
- 验证设置保存。
- 验证 Windows titlebar。
- macOS 如有环境，再验证 macOS titlebar 和打包。
- 按 `runtime-reliability-security-spec.md` 执行测试矩阵。

验收清单：
- `npm run lint` 完成。
- `npm run build` 完成。
- Electron dev 窗口可运行。
- 下载页、队列页、历史页、设置页、关于页都能打开。
- 关键 IPC 调用无运行时错误。
- 安全测试和响应式测试完成。

## 推荐实施顺序

1. Step 1-3：先稳住基线和样式基础。
2. Step 4-5：建立 UI 组件和 shell。
3. Step 6-10：逐页迁移。
4. Step 11：旧依赖清理。
5. Step 12：完整回归。

## 第一阶段最小可交付

第一阶段建议只做到：
- token 样式基础
- App shell
- 下载页
- 设置页工具检测
- 保留其余页面旧实现

这样风险最低，也能最快看到新设计落地效果。
