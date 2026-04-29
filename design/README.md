# BBDown GUI UI/UX Design Pack

本目录是基于“方向 A：平衡型主方案”补全的设计交付物，不修改现有实现代码。

## 交付物

- `uiux-final-spec.md`：最终 UI/UX 设计稿说明，包含信息架构、页面布局、组件状态和可保留/需调整项。
- `platform-comparison.md`：Windows 与 macOS 的平台微调对照。
- `implementation-decision.md`：Electron 技术栈下的组件库、样式、图标、动画、原生能力取舍。
- `coding-technical-selection.md`：Coding 技术选型文档，明确保留、调整、推荐依赖和代码结构。
- `coding-work-plan.md`：Coding 工作计划，按实现步骤拆分编码任务和验收清单。
- `interaction-spec.md`：右键菜单、快捷键、焦点流转、响应式规则。
- `error-handling-spec.md`：错误文案、错误层级、恢复建议、错误边界。
- `design-tokens-spec.md`：完整 token 定义，覆盖颜色、间距、字体、阴影、尺寸、动画。
- `runtime-reliability-security-spec.md`：日志、安全、测试矩阵和 breaking change 策略。
- `mockups/bbdown-gui-balanced-master.svg`：主视觉和所有页面缩略设计稿。
- `mockups/download-page-states.svg`：下载页具体状态设计图。
- `mockups/tasks-page-states.svg`：队列页具体状态设计图。
- `mockups/history-page-states.svg`：历史页和后处理子页面设计图。
- `mockups/settings-about-pages.svg`：设置、扫码登录、关于页面设计图。
- `assets/app-mark.svg`：应用标识素材。
- `assets/empty-download.svg`：下载页空状态素材。
- `assets/status-tools.svg`：工具状态卡片插画素材。
- `assets/queue-states.svg`：任务队列状态素材。

## 设计方向

最终建议采用“平衡型桌面工具”方向：保留主设计图的左侧导航、顶部输入动作区、中间主任务面板和右侧状态栏，但降低纯 Fluent UI 绑定，改成更轻的 token 化设计系统，便于 Electron + React 落地，也便于在 Windows/macOS 之间做平台化微调。
