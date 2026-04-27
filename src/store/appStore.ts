import { create } from 'zustand'
import type { DownloadOptions, DownloadTask, LogEntry, VideoInfo } from '../../electron/core/types'
import { api } from '@/lib/runtime'

export type TabValue = 'download' | 'tasks' | 'history' | 'settings' | 'plugins' | 'about'

export interface DownloadOptionsForm {
  apiMode: 'web' | 'tv' | 'app' | 'intl'
  encodingPriority: string
  dfnPriority: string
  selectedPages: number[]
  filePattern: string
  multiFilePattern: string
  workDir: string
  downloadDanmaku: boolean
  downloadSubtitle: boolean
  downloadCover: boolean
  skipCover: boolean
  videoOnly: boolean
  audioOnly: boolean
  useAria2c: boolean
  aria2cArgs: string
  multiThread: boolean
  skipAI: boolean
  deleteAfterMerge: boolean
  autoRetry: boolean
  threadCount: number
  delayPerPage: number
  useMP4box: boolean
}

const defaultDownloadOptions: DownloadOptionsForm = {
  apiMode: 'web',
  encodingPriority: 'hevc,av1,avc',
  dfnPriority: '',
  selectedPages: [],
  filePattern: '<videoTitle>',
  multiFilePattern: '',
  workDir: '',
  downloadDanmaku: true,
  downloadSubtitle: true,
  downloadCover: false,
  skipCover: false,
  videoOnly: false,
  audioOnly: false,
  useAria2c: false,
  aria2cArgs: '',
  multiThread: true,
  skipAI: true,
  deleteAfterMerge: true,
  autoRetry: true,
  threadCount: 16,
  delayPerPage: 0,
  useMP4box: false,
}

export interface ToolInfo {
  name: string
  exists: boolean
  version: string
  path: string
}

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  bbdownPath: string
  ffmpegPath: string
  aria2cPath: string
  defaultWorkDir: string
  maxConcurrent: number
  closeToTray: boolean
  minimizeToTray: boolean
  autoCheckUpdate: boolean
  notificationEnabled: boolean
}

const defaultSettings: AppSettings = {
  theme: 'system',
  bbdownPath: '',
  ffmpegPath: '',
  aria2cPath: '',
  defaultWorkDir: '',
  maxConcurrent: 2,
  closeToTray: false,
  minimizeToTray: false,
  autoCheckUpdate: true,
  notificationEnabled: true,
}

function resolveToolPath(
  settingsPath: string | undefined,
  tools: Record<string, ToolInfo>,
  toolName: 'ffmpeg' | 'aria2c'
): string | undefined {
  if (settingsPath) return settingsPath
  const detectedTool = tools[toolName]
  return detectedTool?.exists && detectedTool.path ? detectedTool.path : undefined
}

interface AppState {
  selectedTab: TabValue
  setSelectedTab: (tab: TabValue) => void
  urlInput: string
  setUrlInput: (url: string) => void
  isParsing: boolean
  parsedVideoInfo: VideoInfo | null
  downloadOptions: DownloadOptionsForm
  updateDownloadOption: <K extends keyof DownloadOptionsForm>(key: K, value: DownloadOptionsForm[K]) => void
  setDownloadOptions: (options: Partial<DownloadOptionsForm>) => void
  tasks: DownloadTask[]
  setTasks: (tasks: DownloadTask[]) => void
  updateTask: (taskId: string, updates: Partial<DownloadTask>) => void
  tools: Record<string, ToolInfo>
  setTools: (tools: Record<string, ToolInfo>) => void
  refreshTools: () => Promise<void>
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  loadSettings: () => Promise<void>
  saveSettings: () => Promise<void>
  taskLogs: Record<string, LogEntry[]>
  appendTaskLog: (taskId: string, entry: LogEntry) => void
  clearTaskLogs: (taskId: string) => void
  parseUrl: (url: string) => Promise<void>
  startDownload: (url: string, title: string) => Promise<DownloadTask>
  refreshTasks: () => Promise<void>
  subscribeToTaskEvents: () => () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  selectedTab: 'download',
  setSelectedTab: (tab) => set({ selectedTab: tab }),

  urlInput: '',
  setUrlInput: (url) => set({ urlInput: url }),

  isParsing: false,
  parsedVideoInfo: null,

  downloadOptions: defaultDownloadOptions,
  updateDownloadOption: (key, value) =>
    set((state) => ({ downloadOptions: { ...state.downloadOptions, [key]: value } })),
  setDownloadOptions: (options) =>
    set((state) => ({ downloadOptions: { ...state.downloadOptions, ...options } })),

  tasks: [],
  setTasks: (tasks) => set({ tasks }),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, ...updates } : task)),
    })),

  tools: {},
  setTools: (tools) => set({ tools }),
  refreshTools: async () => {
    const tools = await api.util.checkTools()
    set({ tools })
  },

  settings: defaultSettings,
  updateSetting: (key, value) =>
    set((state) => ({ settings: { ...state.settings, [key]: value } })),
  loadSettings: async () => {
    let loadedSettings = defaultSettings
    const saved = localStorage.getItem('bbdown-settings')
    if (saved) {
      try {
        loadedSettings = { ...defaultSettings, ...JSON.parse(saved) }
      } catch {
        loadedSettings = defaultSettings
      }
    }
    if (!loadedSettings.defaultWorkDir) {
      const downloadPath = await api.util.getPath('downloads')
      loadedSettings = {
        ...loadedSettings,
        defaultWorkDir: [downloadPath, 'BBDown GUI'].join(window.navigator.platform.includes('Win') ? '\\' : '/'),
      }
    }
    set((state) => ({
      settings: loadedSettings,
      downloadOptions: {
        ...state.downloadOptions,
        workDir: state.downloadOptions.workDir || loadedSettings.defaultWorkDir,
      },
    }))
    if (loadedSettings.bbdownPath) await api.util.setToolPath('bbdown', loadedSettings.bbdownPath)
    if (loadedSettings.ffmpegPath) await api.util.setToolPath('ffmpeg', loadedSettings.ffmpegPath)
    if (loadedSettings.aria2cPath) await api.util.setToolPath('aria2c', loadedSettings.aria2cPath)
  },
  saveSettings: async () => {
    localStorage.setItem('bbdown-settings', JSON.stringify(get().settings))
  },

  taskLogs: {},
  appendTaskLog: (taskId, entry) =>
    set((state) => ({
      taskLogs: {
        ...state.taskLogs,
        [taskId]: [...(state.taskLogs[taskId] || []), entry].slice(-1500),
      },
    })),
  clearTaskLogs: (taskId) =>
    set((state) => ({ taskLogs: { ...state.taskLogs, [taskId]: [] } })),

  parseUrl: async (url: string) => {
    set({ isParsing: true, parsedVideoInfo: null })
    try {
      const { downloadOptions, settings, tools } = get()
      const result = await api.bbdown.parse(url, {
        apiMode: downloadOptions.apiMode,
        ffmpegPath: resolveToolPath(settings.ffmpegPath, tools, 'ffmpeg'),
      })
      if (!result.success || !result.data) {
        throw new Error(result.error || '解析失败')
      }
      set({ parsedVideoInfo: result.data, isParsing: false })
      if (result.data.pages) {
        get().updateDownloadOption('selectedPages', result.data.pages.map((page) => page.pageNumber))
      }
    } catch (error) {
      set({ isParsing: false })
      throw error
    }
  },

  startDownload: async (url: string, title: string) => {
    const options = get().downloadOptions
    const settings = get().settings
    const tools = get().tools
    const downloadOptions: DownloadOptions = {
      url,
      apiMode: options.apiMode,
      encodingPriority: options.encodingPriority.split(',').map((item) => item.trim()).filter(Boolean),
      dfnPriority: options.dfnPriority ? options.dfnPriority.split(',').map((item) => item.trim()).filter(Boolean) : [],
      selectedPages: options.selectedPages,
      filePattern: options.filePattern,
      multiFilePattern: options.multiFilePattern,
      workDir: options.workDir || settings.defaultWorkDir || [await api.util.getPath('downloads'), 'BBDown GUI'].join(window.navigator.platform.includes('Win') ? '\\' : '/'),
      downloadDanmaku: options.downloadDanmaku,
      downloadSubtitle: options.downloadSubtitle,
      downloadCover: options.downloadCover,
      skipCover: options.skipCover,
      videoOnly: options.videoOnly,
      audioOnly: options.audioOnly,
      useAria2c: options.useAria2c,
      aria2cArgs: options.aria2cArgs,
      multiThread: options.multiThread,
      skipAI: options.skipAI,
      deleteAfterMerge: options.deleteAfterMerge,
      autoRetry: options.autoRetry,
      threadCount: options.threadCount,
      delayPerPage: options.delayPerPage,
      useMP4box: options.useMP4box,
      ffmpegPath: resolveToolPath(settings.ffmpegPath, tools, 'ffmpeg'),
      aria2cPath: resolveToolPath(settings.aria2cPath, tools, 'aria2c'),
    }
    const downloadOptionsWithWorkDir = {
      ...downloadOptions,
      workDir: downloadOptions.workDir?.replace(/[\\/]$/, ''),
    }
    const videoInfo = get().parsedVideoInfo
    const task = await api.task.add(url, title, downloadOptionsWithWorkDir, false, [], {
      bvid: videoInfo?.bvid,
      thumbnail: videoInfo?.cover,
      upName: videoInfo?.up?.name,
      pageCount: videoInfo?.pages?.length,
    })
    await get().refreshTasks()
    return task
  },

  refreshTasks: async () => {
    const tasks = await api.task.list()
    set({ tasks })
  },

  subscribeToTaskEvents: () => {
    const unsubscribers = [
      api.task.onUpdated((task) => {
        set((state) => ({
          tasks: state.tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item)),
        }))
      }),
      api.task.onAdded((task) => {
        set((state) => ({ tasks: [task, ...state.tasks.filter((item) => item.id !== task.id)] }))
      }),
      api.task.onCompleted((task) => {
        set((state) => ({
          tasks: state.tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item)),
        }))
      }),
      api.task.onFailed((task) => {
        set((state) => ({
          tasks: state.tasks.map((item) => (item.id === task.id ? { ...item, ...task } : item)),
        }))
      }),
      api.task.onRemoved((taskId) => {
        set((state) => ({
          tasks: state.tasks.filter((task) => task.id !== taskId),
          taskLogs: Object.fromEntries(Object.entries(state.taskLogs).filter(([id]) => id !== taskId)),
        }))
      }),
      api.task.onLog((taskId, entry) => {
        get().appendTaskLog(taskId, entry)
      }),
    ]

    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe()
    }
  },
}))
