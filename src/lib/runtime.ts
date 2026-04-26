/* eslint-disable @typescript-eslint/no-unused-vars */
type ElectronAPI = typeof window.electronAPI

const isElectron = typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined'

function createBrowserStub(): ElectronAPI {
  const noop = (): Promise<void> => Promise.resolve()
  const noopBool = (): Promise<boolean> => Promise.resolve(false)
  const noopString = (): Promise<string> => Promise.resolve('')
  const noopNull = (): Promise<null> => Promise.resolve(null)
  const browserModeMessage = '浏览器预览模式：真实 BBDown / ffmpeg 功能只在 Electron 中可用'

  return {
    window: {
      minimize: noop,
      maximize: () => Promise.resolve(false),
      close: noop,
    },
    theme: {
      isDark: () => Promise.resolve(window.matchMedia('(prefers-color-scheme: dark)').matches),
      onChanged: (callback: (isDark: boolean) => void) => {
        const mql = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = (e: MediaQueryListEvent) => callback(e.matches)
        mql.addEventListener('change', handler)
        return () => mql.removeEventListener('change', handler)
      },
    },
    bbdown: {
      parse: (_url: string, _options?: Partial<Record<string, unknown>>) =>
        Promise.resolve({
          success: true,
          data: {
            title: '浏览器预览示例视频',
            cover: '',
            up: { name: 'BBDown GUI Preview', mid: '' },
            bvid: 'BV_PREVIEW',
            aid: '',
            duration: 1425,
            publishTime: 'Electron 中显示真实解析结果',
            partition: '预览模式',
            tags: [],
            pages: [
              { pageNumber: 1, cid: 'preview-1', title: '示例分 P 1', duration: 720, selected: true },
              { pageNumber: 2, cid: 'preview-2', title: '示例分 P 2', duration: 705, selected: true },
            ],
            streams: [],
          },
        }),
      version: () => Promise.resolve({ success: false, error: browserModeMessage }),
      buildArgs: () => Promise.resolve([]),
      setPath: noopBool,
      login: () => Promise.resolve({ success: false, error: browserModeMessage }),
      cancelLogin: noopBool,
      onQRCode: () => () => {},
    },
    task: {
      add: noop as unknown as ElectronAPI['task']['add'],
      get: () => Promise.resolve(undefined),
      list: () => Promise.resolve([]),
      start: noopBool,
      stop: noopBool,
      retry: noopBool,
      remove: noopBool,
      pauseAll: noopBool,
      resumeAll: noopBool,
      clearCompleted: noopBool,
      stats: () => Promise.resolve({ total: 0, waiting: 0, downloading: 0, processing: 0, completed: 0, failed: 0 }),
      setMaxConcurrent: noopBool,
      getLogs: () => Promise.resolve([]),
      onUpdated: () => () => {},
      onAdded: () => () => {},
      onCompleted: () => () => {},
      onFailed: () => () => {},
      onRemoved: () => () => {},
      onLog: () => () => {},
    },
    util: {
      checkTools: () => Promise.resolve({
        bbdown: { name: 'bbdown', exists: false, version: 'Electron only', path: browserModeMessage },
        ffmpeg: { name: 'ffmpeg', exists: false, version: 'Electron only', path: browserModeMessage },
        aria2c: { name: 'aria2c', exists: false, version: 'optional', path: browserModeMessage },
        ffprobe: { name: 'ffprobe', exists: false, version: 'Electron only', path: browserModeMessage },
      } as Awaited<ReturnType<ElectronAPI['util']['checkTools']>>),
      checkTool: (toolName: string) => Promise.resolve({ name: toolName, exists: false, version: 'Electron only', path: browserModeMessage }),
      setToolPath: (toolName: string, toolPath: string) => Promise.resolve({ name: toolName, exists: false, version: 'Electron only', path: toolPath || browserModeMessage }),
      openDirectory: noopBool,
      selectDirectory: noopNull,
      selectFile: noopNull,
      getPath: noopString,
    },
    history: {
      query: () => Promise.resolve({ items: [], total: 0, page: 1, pageSize: 20 }),
      getJob: () => Promise.resolve(undefined),
      delete: noopBool,
      clear: noopBool,
      stats: () => Promise.resolve({ total: 0, completed: 0, failed: 0, totalSize: 0, missing: 0, artifacts: 0 }),
      storageInfo: () => Promise.resolve({ path: 'browser-preview/history.v2.json', oldHistoryExists: false }),
      rescanJob: () => Promise.resolve(undefined),
    },
    artifact: {
      relocate: () => Promise.resolve(null),
      remove: () => Promise.resolve(undefined),
      rename: () => Promise.resolve(undefined),
      move: () => Promise.resolve(null),
      postprocess: () => Promise.resolve({ success: false, finalPath: '', errors: [browserModeMessage] }),
    },
  }
}

export const api: ElectronAPI = isElectron ? window.electronAPI : createBrowserStub()

export function isRunningInElectron(): boolean {
  return isElectron
}
