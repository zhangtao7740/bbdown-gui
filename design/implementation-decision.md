# Electron 实现取舍

## 最终建议

保留 Electron + React + TypeScript + Zustand + electron-builder。Fluent UI 可以不作为长期设计系统核心：它适合快速成型，但当前界面需要更强的桌面工具密度、跨平台 titlebar 微调、下载任务状态列表和素材化空状态，建议改为“Radix primitives + 自有 design tokens + lucide-react icons”的组合。

## 可保留

- Electron 主进程、preload、IPC 分层。
- BBDown / FFmpeg / aria2c 工具检测思路。
- Zustand 全局状态。
- 现有页面划分：下载、队列、历史、设置、关于。
- electron-builder 的 Windows/macOS 打包目标。
- 主设计图里的整体布局：左侧导航、顶部链接解析、中部下载选项、右侧工具/账号/最近任务。

## 建议调整

- 不继续强依赖 Fluent UI 视觉。可以保留少量组件作为过渡，但新设计按本地 token 落地。
- 统一 CSS 变量：颜色、圆角、阴影、控件高度、间距、状态色。
- 图标改用 `lucide-react`，原因是下载工具场景常用图标覆盖更直接，体积可控，也更方便和自绘 SVG 素材统一。
- 表单复杂控件用 Radix：`@radix-ui/react-select`、`dialog`、`switch`、`tooltip`、`tabs`、`dropdown-menu`、`progress`。
- 下载任务虚拟列表使用 `@tanstack/react-virtual`，避免历史和日志多时卡顿。
- 历史表格使用轻量 table，不建议一开始引入重型 data-grid；后续如果筛选/列配置变复杂，再考虑 TanStack Table。

## 推荐依赖

| 类别 | 推荐库 | 用途 |
| --- | --- | --- |
| UI primitive | `@radix-ui/react-*` | Select、Dialog、Tooltip、Switch、Progress、Tabs |
| 图标 | `lucide-react` | 侧栏、按钮、状态、文件类型图标 |
| 状态 | `zustand` | 保留现有全局状态 |
| 列表性能 | `@tanstack/react-virtual` | 队列、历史、日志 |
| 表单校验 | `zod` | 设置项、下载参数、路径配置 |
| 动画 | `motion` 或纯 CSS | 只做进度、展开、状态反馈，不做重动效 |
| 样式 | CSS Modules 或普通 CSS + tokens | 避免组件库样式锁死 |
| 路由 | 不强制 | 当前 tab 型桌面应用不需要完整 router |

## 不建议

- 不建议用完整 Ant Design：桌面工具密度可以，但 macOS 质感和自绘标题栏融合较重。
- 不建议继续用大量 Fluent Card 嵌套：主图里已经有分区，卡片太多会显得厚。
- 不建议上 Tailwind 作为唯一方案：Electron 桌面平台差异和状态 token 需要更清晰的变量层，Tailwind 可用但不是必需。
- 不建议让下载页承担所有后处理。后处理应放到历史产物页，下载页只负责“解析、选择、入队”。

## 设计到实现映射

| 设计模块 | 实现模块建议 |
| --- | --- |
| App shell | `layout/AppShell.tsx` |
| 自绘标题栏 | `layout/WindowTitleBar.tsx`，按 platform 分支 |
| 左侧导航 | `layout/SidebarNav.tsx` |
| 下载页主表单 | `features/download/DownloadComposer.tsx` |
| 视频预览 | `features/download/VideoPreview.tsx` |
| 下载选项矩阵 | `features/download/DownloadOptionsPanel.tsx` |
| 右侧状态栏 | `features/dashboard/StatusRail.tsx` |
| 队列 | `features/tasks/TaskQueuePage.tsx` |
| 历史 | `features/history/HistoryPage.tsx` |
| 设置 | `features/settings/SettingsPage.tsx` |
| 登录弹窗 | `features/account/LoginDialog.tsx` |

## 最终取舍

采用主设计图的布局和业务密度，放弃“必须 Fluent UI”的限制。视觉语言改成中性桌面工具风格：浅背景、清晰分区、8px 以内圆角、蓝色主操作、绿色/红色状态。这样既能保留原图的专业感，也能避免 Electron 应用在 macOS 上显得过 Windows 化。
