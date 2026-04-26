# BBDown GUI

一个基于 Electron、React 和 Fluent UI 的 BBDown 桌面图形界面。

本项目只做任务编排、参数选择、日志、历史记录和本地产物管理；真正的视频解析、下载、混流仍交给 [BBDown](https://github.com/nilaoda/BBDown)，转码和媒体信息扫描交给本机 FFmpeg / FFprobe。

## 功能状态

- 输入 Bilibili URL / BV 号并调用 BBDown `-info` 解析预览。
- 展示标题、UP 主、BVID、封面、分 P 列表，并可选择分 P 下载。
- 支持选择下载视频、音频、字幕、弹幕、封面。
- 支持配置 BBDown、FFmpeg、aria2c 可执行文件路径。
- 下载队列按“一次点击下载 = 一个任务”管理。
- 实时显示任务状态、进度和日志。
- 下载完成后扫描任务目录，生成本地历史记录。
- 历史记录采用 `history.v2.json`，结构为 `任务 -> 产物`。
- 产物区分视频、音频、字幕、弹幕、封面、元数据和其他文件。
- 使用 FFprobe 扫描视频/音频编码、容器、分辨率、码率、时长等信息。
- 支持历史产物重新定位、移动、重命名、移除记录。
- 支持在历史记录中对视频/音频产物做二次处理。

## 设计边界

BBDown GUI 不重新实现下载器。

- 解析：BBDown.exe
- 下载：BBDown.exe
- 混流：BBDown 调用本机 FFmpeg
- 媒体信息：FFprobe
- 后处理：本机 FFmpeg
- GUI：Electron / React 只负责配置、队列、日志、历史和文件索引

这意味着如果 BBDown CLI 不支持某个站点、参数或登录状态，GUI 不会绕过 BBDown 自己实现。

## 历史记录说明

新版本只使用：

```text
history.v2.json
```

旧版 `download_history.json` 不会读取，也不会迁移。

历史记录是本地文件索引，不是文件本体。用户如果在资源管理器中删除、移动或改名文件，历史记录不会实时监听；打开历史页或点击刷新时会重新检查文件状态。

缺失文件可以在历史页中：

- 重新定位
- 重新扫描任务目录
- 从记录中移除

## 后处理说明

后处理不在下载页配置，而是在历史记录中对具体产物执行。

视频产物支持：

- Remux MP4
- H.264 + AAC + MP4
- 转 MKV
- 重命名
- 移动

音频产物支持：

- 转 MP3
- 转 M4A/AAC
- 转 FLAC
- 重命名
- 移动

字幕、弹幕、封面默认只做文件整理，不做转码。

## 开发环境

推荐环境：

- Windows 10/11
- Node.js 20+
- npm
- BBDown.exe
- FFmpeg / FFprobe
- aria2c 可选

安装依赖：

```powershell
npm install
```

开发运行：

```powershell
npm run dev
```

类型检查和构建：

```powershell
npm run build
```

Lint：

```powershell
npm run lint
```

打包：

```powershell
npm run dist
```

构建产物默认输出到：

```text
release/
```

## 注意事项

- 不要提交 `BBDown.data`，它可能包含登录状态或敏感信息。
- 不要把本机 BBDown.exe、FFmpeg.exe、aria2c.exe 打进仓库。
- Release 可以上传打包后的安装包或便携版，但源码仓库只保存 GUI 代码。
- 当前构建可能出现 Vite alias deprecation 和 chunk size warning，不影响生成产物。

## License

本 GUI 项目尚未指定许可证。BBDown 本体请遵循其原项目许可证。
