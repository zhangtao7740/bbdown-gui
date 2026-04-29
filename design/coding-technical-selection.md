# BBDown GUI Coding 技术选型

## 最终结论

代码实现建议采用：

Electron + React + TypeScript + Zustand + Radix UI primitives + lucide-react + CSS variables/design tokens。

现有工程基础不要推倒重来。保留 Electron 主进程、preload、IPC、BBDown/FFmpeg/aria2c 检测与任务管理能力；前端 UI 层逐步从 Fluent UI 迁移到更轻、更可控的自有组件体系。

## 当前工程保留

| 模块 | 决策 | 说明 |
| --- | --- | --- |
| Electron | 保留 | 本地进程调用、文件选择、目录打开、通知、打包都依赖它 |
| Vite | 保留 | 现有构建链路适合 React + Electron |
| React | 保留 | 适合拆分下载页、队列、历史、设置等复杂状态页面 |
| TypeScript | 保留 | IPC、任务、历史产物、配置项需要强类型 |
| Zustand | 保留 | 当前 tab 型桌面应用状态复杂度适中 |
| electron-builder | 保留 | 已有 Windows/macOS 打包配置 |
| 主进程业务能力 | 保留 | `BBDownWrapper`、`TaskManager`、`ToolDetector`、`HistoryManager` 等继续作为实现基础 |

## UI 层调整

| 当前 | Coding 决策 |
| --- | --- |
| `@fluentui/react-components` | 不作为长期 UI 核心，逐页迁移 |
| `@fluentui/react-icons` | 替换为 `lucide-react` |
| makeStyles/inlined styles | 迁移为 CSS variables + feature/component CSS |
| Fluent Card/Button/Input | 迁移为自有 `ui/*` 组件，底层可用 Radix primitives |

## 推荐新增依赖

| 依赖 | 用途 | 优先级 |
| --- | --- | --- |
| `lucide-react` | 图标系统 | P0 |
| `@radix-ui/react-dialog` | 登录、确认下载、后处理、重新定位弹窗 | P0 |
| `@radix-ui/react-select` | 清晰度、格式、筛选、主题等选择器 | P0 |
| `@radix-ui/react-tooltip` | 图标按钮提示 | P0 |
| `@radix-ui/react-switch` | 设置页开关 | P1 |
| `@radix-ui/react-progress` | 下载和处理进度 | P1 |
| `@tanstack/react-virtual` | 队列、历史、日志长列表虚拟滚动 | P1 |
| `zod` | 设置项、下载参数、IPC payload 校验 | P1 |

## 暂不引入

| 依赖/方案 | 原因 |
| --- | --- |
| Ant Design | 视觉和交互偏 Web 后台，桌面工具质感不合适 |
| MUI | 风格绑定较强，和当前设计 token 不够贴合 |
| TanStack Table | 第一版历史表格不需要完整表格引擎 |
| 动画库 | 当前动效 CSS transition 足够 |
| 路由库 | 当前仍是桌面 tab 模式，暂不需要完整 router |

## 建议目录结构

```text
src/
  styles/
    tokens.css
    themes.css
    platform.css
    components.css

  components/
    ui/
      Button.tsx
      IconButton.tsx
      Badge.tsx
      Dialog.tsx
      Select.tsx
      Switch.tsx
      Tooltip.tsx
      Progress.tsx
    layout/
      AppShell.tsx
      WindowTitleBar.tsx
      SidebarNav.tsx
      StatusBar.tsx

  features/
    download/
    tasks/
    history/
    settings/
    about/
```

## 实现拆分原则

- 先搭 token 和基础 UI，不先重写业务。
- 先迁移 shell，再迁移页面。
- 先保留原有 Zustand store 和 IPC API，减少行为回归。
- 页面组件只通过 typed API/useAppStore 取数据，不直接碰 Electron IPC 细节。
- 后处理只放在历史产物上下文，下载页只负责解析、选择和入队。

## 平台适配

| 平台点 | Coding 实现方式 |
| --- | --- |
| 标题栏 | `WindowTitleBar` 内按 platform 分支 |
| macOS traffic lights | 左侧安全区 padding，不渲染自定义窗口三键 |
| Windows 控制按钮 | 自绘最小化、最大化、关闭按钮 |
| 路径 placeholder | renderer 根据 platform 展示不同示例 |
| 文件选择 | main/preload 层按平台设置 filter |
| 快捷键提示 | UI 文案按 Ctrl/Cmd 切换 |
| 通知/托盘 | main process 按平台分支 |

## 类型策略

建议把关键类型稳定下来：

```text
electron/core/types.ts
src/types/
  task.ts
  history.ts
  settings.ts
  tool.ts
  platform.ts
```

短期可以继续复用 `electron/core/types.ts`，但 renderer 不应散落 import 深路径；可以在 `src/types/index.ts` 做统一 re-export。

## 测试与验证策略

P0 验证：
- `npm run lint`
- `npm run build`
- Windows 下 Electron dev 窗口可打开
- 链接解析、加入队列、任务状态事件不回归
- 设置页工具检测不回归

P1 验证：
- Playwright 或 Electron e2e 覆盖主要页面截图
- 历史产物操作 smoke test
- macOS 打包路径和 titlebar 人工验证

## 明确不做

- 不做 v1 到 v2 数据迁移，采用 breaking change 策略。
- 不做新手引导。
- 不做性能指标体系。
- 不做拖拽链接或文件。
- 不做自动更新。
- 不做 i18n。
- 不做 A11y 专项规范。

相关 runtime、安全、日志和测试矩阵以 `runtime-reliability-security-spec.md` 为准。

## 最终取舍

不重写底层业务，不追求一次性替换所有 Fluent UI。先建立 coding 可持续的 UI 基础设施，再按页面迁移。这样最稳：既能落设计稿，又不破坏已有下载能力。
