# BBDown GUI

An Electron + React + Fluent UI desktop GUI for [BBDown](https://github.com/nilaoda/BBDown).

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

```sh
npm run dist
```

Build artifacts are emitted to:

```text
release/
```

### macOS Build

The macOS build expects FFmpeg and FFprobe to be available from Homebrew:

```sh
brew install ffmpeg
which ffmpeg
which ffprobe
```

BBDown can be supplied at package time without committing the binary. The default local path used by this repo is:

```text
/Users/zhangtao/Downloads/BBDown
```

For Apple Silicon only builds, BBDown can be supplied with `BBDOWN_BIN_PATH` or `BBDOWN_ARM64_BIN_PATH`:

```sh
export BBDOWN_BIN_PATH=/absolute/path/to/BBDown
```

Universal macOS builds require both BBDown architectures. The default paths are:

```text
/Users/zhangtao/Downloads/BBDown
/Users/zhangtao/Downloads/BBDown-osx-x64/BBDown
```

If either binary is stored elsewhere, set the architecture-specific paths before packaging:

```sh
export BBDOWN_ARM64_BIN_PATH=/absolute/path/to/osx-arm64/BBDown
export BBDOWN_X64_BIN_PATH=/absolute/path/to/osx-x64/BBDown
```

Build an unsigned local universal macOS deliverable:

```sh
npm install
npm run dist:mac
```

`npm run dist:mac` is the universal handoff build. It performs the renderer/main build, copies both BBDown architectures into the packaged app resources, fixes executable bits, removes local quarantine attributes from those copied binaries, validates the Homebrew FFmpeg paths, and then emits macOS artifacts under `release/`.

Expected universal output:

```text
release/mac-universal/BBDown GUI.app
release/BBDown GUI-0.1.4-universal.dmg
release/BBDown GUI-0.1.4-universal-mac.zip
```

Architecture-specific builds remain available with `npm run dist:mac:arm64` and `npm run dist:mac:x64`.

The local macOS script disables automatic certificate discovery with `CSC_IDENTITY_AUTO_DISCOVERY=false`, so Electron Builder falls back to ad-hoc signing and skips notarization. This is suitable for internal handoff and verification. For public distribution, add a Developer ID signing identity plus notarization instead of using the local handoff script as-is.

## Repository Notes

- Do not commit `BBDown.data`; it may contain login state or sensitive data.
- Do not commit local copies of BBDown, FFmpeg, FFprobe, or aria2c executables.
- Release assets may include packaged installers or portable builds.
- The source repository should contain GUI source code only.
- Current builds may show Vite alias deprecation and chunk-size warnings; these do not block generated artifacts.

## License

BBDown GUI is released under the MIT License. See [LICENSE](LICENSE).

BBDown itself is a separate project. Please follow the original BBDown project's license and terms.
