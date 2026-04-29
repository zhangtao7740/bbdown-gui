# AGENTS.md

## Project Overview
Electron + React + Vite desktop GUI for BBDown (Bilibili downloader).
- **Renderer**: React + TypeScript in `src/`
- **Electron main**: TypeScript in `electron/main.ts`
- **Electron preload**: TypeScript in `electron/preload.ts`
- **State**: Zustand store in `src/store/appStore.ts`

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server with hot reload
npm run lint         # Run ESLint
npm run build        # Typecheck + build renderer + build preload
npm run build:icons  # Generate app icons
npm run dist         # Build + package for current platform (output: release/)
npm run dist:mac     # Build unsigned universal macOS package
```

## Build Output
- `dist/` - Renderer build (Vite)
- `dist-electron/` - Electron main + preload build
- `release/` - Electron Builder packaged artifacts

## Architecture Notes
- IPC bridge between renderer and main process via `electron/ipc/`
- Import alias: `@/` maps to `src/` (configured in vite.config.ts)
- TypeScript uses project references pattern (tsconfig.app.json, tsconfig.node.json)
- No test runner configured

## Critical Rules
- **Never commit `*.data` files** - may contain BBDown login state/sensitive data
- **Never commit BBDown/FFmpeg/FFprobe/aria2c executables**
- History stored locally in `history.v2.json` (not committed)

## Style
- ESLint enforces code style (flat config: eslint.config.js)
- Follow existing patterns in the codebase
