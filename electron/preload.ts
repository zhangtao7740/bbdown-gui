import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type { DownloadTask, DownloadOptions, VideoInfo, PostProcessRule, HistoryQuery, LogEntry, HistoryJob } from './core/types'

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
  },
  theme: {
    isDark: () => ipcRenderer.invoke('theme:isDark'),
    onChanged: (callback: (isDark: boolean) => void) => {
      const handler = (_event: IpcRendererEvent, isDark: boolean) => callback(isDark)
      ipcRenderer.on('theme:changed', handler)
      return () => ipcRenderer.removeListener('theme:changed', handler)
    },
  },
  bbdown: {
    parse: (url: string, options?: Partial<DownloadOptions>): Promise<{ success: boolean; data?: VideoInfo; error?: string }> =>
      ipcRenderer.invoke('bbdown:parse', url, options),
    version: (): Promise<{ success: boolean; version?: string; error?: string }> =>
      ipcRenderer.invoke('bbdown:version'),
    buildArgs: (options: Partial<DownloadOptions>): Promise<string[]> =>
      ipcRenderer.invoke('bbdown:buildArgs', options),
    setPath: (path: string): Promise<boolean> =>
      ipcRenderer.invoke('bbdown:setPath', path),
    login: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('bbdown:login'),
    accountStatus: (): Promise<{ loggedIn: boolean; path?: string; updatedAt?: string }> =>
      ipcRenderer.invoke('bbdown:accountStatus'),
    logout: (): Promise<{ success: boolean; removed: string[]; error?: string }> =>
      ipcRenderer.invoke('bbdown:logout'),
    cancelLogin: (): Promise<boolean> =>
      ipcRenderer.invoke('bbdown:cancelLogin'),
    onQRCode: (callback: (qrcode: string) => void) => {
      const handler = (_event: IpcRendererEvent, qrcode: string) => callback(qrcode)
      ipcRenderer.on('bbdown:login-qrcode', handler)
      return () => ipcRenderer.removeListener('bbdown:login-qrcode', handler)
    },
  },
  task: {
    add: (
      url: string,
      title: string,
      options: DownloadOptions,
      enablePostProcess: boolean,
      postProcessRules?: PostProcessRule[],
      metadata?: Partial<DownloadTask>
    ): Promise<DownloadTask> =>
      ipcRenderer.invoke('task:add', url, title, options, enablePostProcess, postProcessRules, metadata),
    get: (taskId: string): Promise<DownloadTask | undefined> =>
      ipcRenderer.invoke('task:get', taskId),
    list: (): Promise<DownloadTask[]> =>
      ipcRenderer.invoke('task:list'),
    start: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('task:start', taskId),
    stop: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('task:stop', taskId),
    retry: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('task:retry', taskId),
    remove: (taskId: string): Promise<boolean> =>
      ipcRenderer.invoke('task:remove', taskId),
    pauseAll: (): Promise<boolean> =>
      ipcRenderer.invoke('task:pauseAll'),
    resumeAll: (): Promise<boolean> =>
      ipcRenderer.invoke('task:resumeAll'),
    clearCompleted: (): Promise<boolean> =>
      ipcRenderer.invoke('task:clearCompleted'),
    stats: (): Promise<{
      total: number
      waiting: number
      downloading: number
      processing: number
      completed: number
      failed: number
    }> => ipcRenderer.invoke('task:stats'),
    setMaxConcurrent: (max: number): Promise<boolean> =>
      ipcRenderer.invoke('task:setMaxConcurrent', max),
    getLogs: (taskId: string): Promise<LogEntry[]> =>
      ipcRenderer.invoke('task:getLogs', taskId),
    onUpdated: (callback: (task: DownloadTask) => void) => {
      const handler = (_event: IpcRendererEvent, task: DownloadTask) => callback(task)
      ipcRenderer.on('task:updated', handler)
      return () => ipcRenderer.removeListener('task:updated', handler)
    },
    onAdded: (callback: (task: DownloadTask) => void) => {
      const handler = (_event: IpcRendererEvent, task: DownloadTask) => callback(task)
      ipcRenderer.on('task:added', handler)
      return () => ipcRenderer.removeListener('task:added', handler)
    },
    onCompleted: (callback: (task: DownloadTask) => void) => {
      const handler = (_event: IpcRendererEvent, task: DownloadTask) => callback(task)
      ipcRenderer.on('task:completed', handler)
      return () => ipcRenderer.removeListener('task:completed', handler)
    },
    onFailed: (callback: (task: DownloadTask, error: string) => void) => {
      const handler = (_event: IpcRendererEvent, task: DownloadTask, error: string) => callback(task, error)
      ipcRenderer.on('task:failed', handler)
      return () => ipcRenderer.removeListener('task:failed', handler)
    },
    onRemoved: (callback: (taskId: string) => void) => {
      const handler = (_event: IpcRendererEvent, taskId: string) => callback(taskId)
      ipcRenderer.on('task:removed', handler)
      return () => ipcRenderer.removeListener('task:removed', handler)
    },
    onLog: (callback: (taskId: string, entry: LogEntry) => void) => {
      const handler = (_event: IpcRendererEvent, taskId: string, entry: LogEntry) => callback(taskId, entry)
      ipcRenderer.on('task:log', handler)
      return () => ipcRenderer.removeListener('task:log', handler)
    },
  },
  util: {
    checkTools: (): Promise<Record<string, {
      name: string
      exists: boolean
      version: string
      path: string
    }>> => ipcRenderer.invoke('util:checkTools'),
    checkTool: (toolName: string): Promise<{
      name: string
      exists: boolean
      version: string
      path: string
    }> => ipcRenderer.invoke('util:checkTool', toolName),
    setToolPath: (toolName: string, toolPath: string): Promise<{
      name: string
      exists: boolean
      version: string
      path: string
    }> => ipcRenderer.invoke('util:setToolPath', toolName, toolPath),
    openDirectory: (dirPath: string): Promise<boolean> =>
      ipcRenderer.invoke('util:openDirectory', dirPath),
    openExternal: (url: string): Promise<boolean> =>
      ipcRenderer.invoke('util:openExternal', url),
    selectDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke('util:selectDirectory'),
    selectFile: (filters?: { name: string; extensions: string[] }[]): Promise<string | null> =>
      ipcRenderer.invoke('util:selectFile', filters),
    getPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'downloads' | 'documents'): Promise<string> =>
      ipcRenderer.invoke('util:getPath', name),
  },
  history: {
    query: (query?: HistoryQuery): Promise<{
      items: HistoryJob[]
      total: number
      page: number
      pageSize: number
    }> => ipcRenderer.invoke('history:query', query),
    getJob: (id: string): Promise<HistoryJob | undefined> =>
      ipcRenderer.invoke('history:getJob', id),
    delete: (id: string): Promise<boolean> =>
      ipcRenderer.invoke('history:delete', id),
    clear: (): Promise<boolean> =>
      ipcRenderer.invoke('history:clear'),
    stats: (): Promise<{
      total: number
      completed: number
      failed: number
      totalSize: number
      missing: number
      artifacts: number
    }> => ipcRenderer.invoke('history:stats'),
    storageInfo: (): Promise<{ path: string; oldHistoryExists: boolean }> =>
      ipcRenderer.invoke('history:storageInfo'),
    rescanJob: (id: string): Promise<{
      job: HistoryJob
      recovered: number
      unresolved: Array<{ artifactId: string; candidates: string[] }>
    } | undefined> => ipcRenderer.invoke('history:rescanJob', id),
  },
  artifact: {
    relocate: (jobId: string, artifactId: string): Promise<HistoryJob | null | undefined> =>
      ipcRenderer.invoke('artifact:relocate', jobId, artifactId),
    remove: (jobId: string, artifactId: string): Promise<HistoryJob | undefined> =>
      ipcRenderer.invoke('artifact:remove', jobId, artifactId),
    rename: (jobId: string, artifactId: string, newName: string): Promise<HistoryJob | undefined> =>
      ipcRenderer.invoke('artifact:rename', jobId, artifactId, newName),
    move: (jobId: string, artifactId: string): Promise<HistoryJob | null | undefined> =>
      ipcRenderer.invoke('artifact:move', jobId, artifactId),
    postprocess: (
      jobId: string,
      artifactId: string,
      ruleKind: 'video-remux-mp4' | 'video-h264-mp4' | 'video-mkv' | 'audio-mp3' | 'audio-m4a' | 'audio-flac',
      deleteOriginal?: boolean
    ): Promise<{
      success: boolean
      finalPath: string
      errors: string[]
    }> => ipcRenderer.invoke('artifact:postprocess', jobId, artifactId, ruleKind, deleteOriginal),
  },
})

declare global {
  interface Window {
    electronAPI: {
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<boolean>
        close: () => Promise<void>
      }
      theme: {
        isDark: () => Promise<boolean>
        onChanged: (callback: (isDark: boolean) => void) => () => void
      }
      bbdown: {
        parse: (url: string, options?: Partial<DownloadOptions>) => Promise<{ success: boolean; data?: VideoInfo; error?: string }>
        version: () => Promise<{ success: boolean; version?: string; error?: string }>
        buildArgs: (options: Partial<DownloadOptions>) => Promise<string[]>
        setPath: (path: string) => Promise<boolean>
        login: () => Promise<{ success: boolean; error?: string }>
        accountStatus: () => Promise<{ loggedIn: boolean; path?: string; updatedAt?: string }>
        logout: () => Promise<{ success: boolean; removed: string[]; error?: string }>
        cancelLogin: () => Promise<boolean>
        onQRCode: (callback: (qrcode: string) => void) => () => void
      }
      task: {
        add: (
          url: string,
          title: string,
          options: DownloadOptions,
          enablePostProcess: boolean,
          postProcessRules?: PostProcessRule[],
          metadata?: Partial<DownloadTask>
        ) => Promise<DownloadTask>
        get: (taskId: string) => Promise<DownloadTask | undefined>
        list: () => Promise<DownloadTask[]>
        start: (taskId: string) => Promise<boolean>
        stop: (taskId: string) => Promise<boolean>
        retry: (taskId: string) => Promise<boolean>
        remove: (taskId: string) => Promise<boolean>
        pauseAll: () => Promise<boolean>
        resumeAll: () => Promise<boolean>
        clearCompleted: () => Promise<boolean>
        stats: () => Promise<{
          total: number
          waiting: number
          downloading: number
          processing: number
          completed: number
          failed: number
        }>
        setMaxConcurrent: (max: number) => Promise<boolean>
        getLogs: (taskId: string) => Promise<LogEntry[]>
        onUpdated: (callback: (task: DownloadTask) => void) => () => void
        onAdded: (callback: (task: DownloadTask) => void) => () => void
        onCompleted: (callback: (task: DownloadTask) => void) => () => void
        onFailed: (callback: (task: DownloadTask, error: string) => void) => () => void
        onRemoved: (callback: (taskId: string) => void) => () => void
        onLog: (callback: (taskId: string, entry: LogEntry) => void) => () => void
      }
      util: {
        checkTools: () => Promise<Record<string, {
          name: string
          exists: boolean
          version: string
          path: string
        }>>
        checkTool: (toolName: string) => Promise<{
          name: string
          exists: boolean
          version: string
          path: string
        }>
        setToolPath: (toolName: string, toolPath: string) => Promise<{
          name: string
          exists: boolean
          version: string
          path: string
        }>
        openDirectory: (dirPath: string) => Promise<boolean>
        openExternal: (url: string) => Promise<boolean>
        selectDirectory: () => Promise<string | null>
        selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
        getPath: (name: 'home' | 'appData' | 'userData' | 'temp' | 'downloads' | 'documents') => Promise<string>
      }
      history: {
        query: (query?: HistoryQuery) => Promise<{
          items: HistoryJob[]
          total: number
          page: number
          pageSize: number
        }>
        getJob: (id: string) => Promise<HistoryJob | undefined>
        delete: (id: string) => Promise<boolean>
        clear: () => Promise<boolean>
        stats: () => Promise<{
          total: number
          completed: number
          failed: number
          totalSize: number
          missing: number
          artifacts: number
        }>
        storageInfo: () => Promise<{ path: string; oldHistoryExists: boolean }>
        rescanJob: (id: string) => Promise<{
          job: HistoryJob
          recovered: number
          unresolved: Array<{ artifactId: string; candidates: string[] }>
        } | undefined>
      }
      artifact: {
        relocate: (jobId: string, artifactId: string) => Promise<HistoryJob | null | undefined>
        remove: (jobId: string, artifactId: string) => Promise<HistoryJob | undefined>
        rename: (jobId: string, artifactId: string, newName: string) => Promise<HistoryJob | undefined>
        move: (jobId: string, artifactId: string) => Promise<HistoryJob | null | undefined>
        postprocess: (
          jobId: string,
          artifactId: string,
          ruleKind: 'video-remux-mp4' | 'video-h264-mp4' | 'video-mkv' | 'audio-mp3' | 'audio-m4a' | 'audio-flac',
          deleteOriginal?: boolean
        ) => Promise<{
          success: boolean
          finalPath: string
          errors: string[]
        }>
      }
    }
  }
}
