# BBDown GUI

An Electron + React desktop GUI for [BBDown](https://github.com/nilaoda/BBDown), built with local design tokens, Radix primitives, and lucide-react icons.

BBDown GUI is an orchestration layer. It handles task setup, option selection, logs, local history, and artifact management. Actual parsing, downloading, muxing, media probing, and transcoding are still delegated to local command-line tools:

- BBDown for Bilibili parsing and downloads
- FFmpeg for muxing and post-processing
- FFprobe for media information
- aria2c as an optional download helper

## Features

- Parse Bilibili URL / BV input through BBDown `-info`.
- Preview title, UP name, BVID, cover, duration, and page list.
- Select pages before downloading.
- Choose downloaded asset types: video, audio, subtitle, danmaku, and cover.
- Configure local BBDown, FFmpeg/FFprobe, and optional aria2c executable paths.
- Manage active downloads as task rows with progress and live logs.
- Store local history in `history.v2.json`.
- Model history as one download job with multiple artifacts.
- Classify artifacts as video, audio, subtitle, danmaku, cover, metadata, or other.
- Probe video/audio artifacts with FFprobe when available.
- Relocate, move, rename, remove, rescan, and open artifacts from history.
- Run post-processing from the history page against concrete video/audio artifacts.

## Design Boundary

This project does not reimplement BBDown.

The GUI does not bypass BBDown login, parsing, download, API behavior, or content access restrictions. If a video, account state, or CLI option is not supported by BBDown, this GUI should surface that state instead of implementing a separate downloader.

## History Storage

The current version uses:

```text
history.v2.json
```

Old `download_history.json` files are intentionally not migrated or read.

History is a local index, not the media files themselves. If a user deletes, moves, or renames files in Explorer, BBDown GUI detects that the next time the history page is opened or refreshed. Missing artifacts can be:

- relocated manually
- rescanned from the original task directory
- removed from the record without deleting files

## Post-Processing

Post-processing is intentionally placed in history, not on the download page.

Video artifacts support:

- Remux MP4
- H.264 + AAC MP4
- MKV
- rename
- move

Audio artifacts support:

- MP3
- M4A/AAC
- FLAC
- rename
- move

Subtitles, danmaku, and cover files are treated as file-management artifacts and are not transcoded.

## Development

Recommended environment:

- Node.js 20+
- npm
- BBDown
- FFmpeg / FFprobe
- aria2c optional

Install dependencies:

```powershell
npm install
```

Run in development:

```powershell
npm run dev
```

Lint:

```powershell
npm run lint
```

Build:

```powershell
npm run build
```

Package:

```powershell
npm run dist
```

Build artifacts are emitted to:

```text
release/
```

Expected Windows output:

```text
release/win-unpacked/BBDown GUI.exe
release/BBDown GUI Setup 0.2.0.exe
release/BBDown GUI 0.2.0.exe
```

`npm run dist` also regenerates `public/icon.png`, `public/tray.png`, and `public/icon.ico` from `public/app-icon.svg`.

### macOS Build

The macOS build expects FFmpeg and FFprobe to be available from Homebrew:

```sh
brew install ffmpeg
which ffmpeg
which ffprobe
```

BBDown is not bundled into macOS or Windows release artifacts. Install or download it separately and configure the executable path in Settings. The default local path used on this machine is:

```text
/Users/zhangtao/Downloads/BBDown
```

Build an unsigned local universal macOS deliverable:

```sh
npm install
npm run dist:mac
```

`npm run dist:mac` is the universal handoff build. It performs the renderer/main build and emits macOS artifacts under `release/`. The app remains a GUI shell and resolves BBDown, FFmpeg/FFprobe, and aria2c from user settings or system paths at runtime.

Expected universal output:

```text
release/mac-universal/BBDown GUI.app
release/BBDown GUI-0.2.0-universal.dmg
release/BBDown GUI-0.2.0-universal-mac.zip
```

Architecture-specific builds remain available with `npm run dist:mac:arm64` and `npm run dist:mac:x64`.

The local macOS script disables automatic certificate discovery with `CSC_IDENTITY_AUTO_DISCOVERY=false`, so Electron Builder falls back to ad-hoc signing and skips notarization. This is suitable for internal handoff and verification. For public distribution, add a Developer ID signing identity plus notarization instead of using the local handoff script as-is.

## Repository Notes

- Do not commit `BBDown.data`; it may contain login state or sensitive data.
- Do not commit local copies of BBDown, FFmpeg, FFprobe, or aria2c executables.
- Do not commit generated release installers, portable builds, `dist/`, or `dist-electron/`.
- The source repository should contain GUI source code only.
- Current builds may show Vite alias deprecation and preload output-option warnings; these do not block generated artifacts.

## License

BBDown GUI is released under the MIT License. See [LICENSE](LICENSE).

BBDown itself is a separate project. Please follow the original BBDown project's license and terms.
