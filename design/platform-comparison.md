# Windows / macOS 平台微调对照

## 总原则

同一套信息架构、同一套业务组件、两套窗口 chrome 微调。不要为两个平台维护两套页面，只在标题栏、安全区、控件尺寸、阴影、字体和文件路径表达上做差异。

## 对照表

| 项目 | Windows | macOS | 设计取舍 |
| --- | --- | --- | --- |
| 窗口控制 | 右上角最小化、最大化、关闭，关闭 hover 红色 | 左上角系统红黄绿按钮区域，应用内容右移避让 | Electron 自绘标题栏保留，但按平台调整 padding 和按钮显隐 |
| 标题栏高度 | 32px，紧凑工具型 | 38px，给 traffic lights 留出呼吸 | 设计稿主图 Windows 感更强，mac 版需更轻 |
| 侧栏宽度 | 180px，图标+文字 | 188px，图标+文字，可适当更宽 | 保持导航稳定，避免 mac 文字挤压 |
| 字体 | Segoe UI / Microsoft YaHei UI | SF Pro / PingFang SC | 使用 CSS font stack，不硬编码单一字体 |
| 主色 | #0F6CBD 或 #0A66D8 | #007AFF，可略偏 macOS 蓝 | 品牌蓝保留，但可通过 token 分平台 |
| 边框 | 1px 中性描边更明显 | 描边更淡，更多依赖阴影/层级 | 桌面工具需要清晰边界，mac 不要太“表格化” |
| 阴影 | 弱阴影，更多平面分区 | 中等柔和阴影，面板浮起感略强 | 主设计图的轻玻璃感可保留，但不要做重毛玻璃 |
| 路径展示 | `D:\Downloads\BBDown` | `/Users/name/Downloads/BBDown` | 设置页、保存位置、工具路径占位符按平台切换 |
| 文件选择 | 选择 `.exe` 时明确可执行文件 | 允许无扩展可执行文件 | Electron dialog filters 按平台配置 |
| 通知 | Windows toast | macOS notification center | 文案一致，系统能力不同 |
| 系统托盘 | 右下角托盘 | 菜单栏图标 | 状态和快捷动作一致，图标尺寸分别导出 |
| 快捷键 | Ctrl + V / Ctrl + Enter / Ctrl + , | Cmd + V / Cmd + Enter / Cmd + , | 文档和 tooltip 动态显示 |
| 安装包 | NSIS + portable | dmg + zip | 当前 electron-builder 配置可以保留 |

## macOS 版设计稿调整

- 顶栏左侧预留 78-86px 安全区，应用图标与标题从 traffic lights 右侧开始。
- 右上角不显示 Windows 三键。
- 侧栏底部版本号居中保留，但底部辅助图标减少到“主题 / 关于 / GitHub”三个小图标。
- 输入框和按钮高度可保持 40px，主按钮圆角 8px，mac 视觉会更自然。

## Windows 版设计稿调整

- 顶栏按钮使用 46px 宽的 Windows 命中区域。
- 关闭按钮 hover 使用系统红 `#E81123`。
- 侧栏选中态保留左侧 3px 蓝色指示条，这是 Windows 工具软件里可读性最好的方案。
- 卡片阴影降低，以描边和背景分区为主。
