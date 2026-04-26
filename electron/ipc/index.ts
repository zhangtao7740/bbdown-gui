import { ipcMain, dialog, BrowserWindow } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import { TaskManager } from '../core/TaskManager'
import { BBDownWrapper } from '../core/BBDownWrapper'
import { ToolDetector } from '../core/ToolDetector'
import type { DownloadOptions, DownloadTask, PostProcessRule, HistoryQuery, TranscodeOptions } from '../core/types'

let taskManager: TaskManager
let bbdown: BBDownWrapper

export function initIpcHandlers(): void {
  taskManager = new TaskManager()
  bbdown = new BBDownWrapper()

  setupTaskEventForwarding()
  setupTaskHandlers()
  setupBBDownHandlers()
  setupUtilityHandlers()
  setupHistoryHandlers()
  setupArtifactHandlers()
}

function setupTaskEventForwarding(): void {
  taskManager.on('task:updated', (task) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.webContents.send('task:updated', task)
    })
  })

  taskManager.on('task:added', (task) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.webContents.send('task:added', task)
    })
  })

  taskManager.on('task:removed', (taskId) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.webContents.send('task:removed', taskId)
    })
  })

  taskManager.on('task:completed', (task) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.webContents.send('task:completed', task)
    })
  })

  taskManager.on('task:failed', (task, error) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.webContents.send('task:failed', task, error)
    })
  })

  taskManager.on('task:log', (taskId, entry) => {
    BrowserWindow.getAllWindows().forEach((win) => {
      if (!win.isDestroyed()) win.webContents.send('task:log', taskId, entry)
    })
  })
}

function setupTaskHandlers(): void {
  ipcMain.handle('task:add', async (
    _,
    url: string,
    title: string,
    options: DownloadOptions,
    enablePostProcess: boolean,
    postProcessRules?: PostProcessRule[],
    metadata?: Partial<DownloadTask>
  ) => {
    return taskManager.addTask(url, title, options, enablePostProcess, postProcessRules, metadata)
  })

  ipcMain.handle('task:get', async (_, taskId: string) => {
    return taskManager.getTask(taskId)
  })

  ipcMain.handle('task:list', async () => {
    return taskManager.getAllTasks()
  })

  ipcMain.handle('task:start', async (_, taskId: string) => {
    taskManager.startTask(taskId)
    return true
  })

  ipcMain.handle('task:stop', async (_, taskId: string) => {
    taskManager.stopTask(taskId)
    return true
  })

  ipcMain.handle('task:retry', async (_, taskId: string) => {
    taskManager.retryTask(taskId)
    return true
  })

  ipcMain.handle('task:remove', async (_, taskId: string) => {
    return taskManager.removeTask(taskId)
  })

  ipcMain.handle('task:pauseAll', async () => {
    taskManager.pauseAll()
    return true
  })

  ipcMain.handle('task:resumeAll', async () => {
    taskManager.resumeAll()
    return true
  })

  ipcMain.handle('task:clearCompleted', async () => {
    taskManager.clearCompleted()
    return true
  })

  ipcMain.handle('task:stats', async () => {
    return taskManager.getStats()
  })

  ipcMain.handle('task:setMaxConcurrent', async (_, max: number) => {
    taskManager.setMaxConcurrent(max)
    return true
  })

  ipcMain.handle('task:getLogs', async (_, taskId: string) => {
    return taskManager.getTaskLogs(taskId)
  })
}

function setupBBDownHandlers(): void {
  ipcMain.handle('bbdown:parse', async (_, url: string, options?: Partial<DownloadOptions>) => {
    try {
      const result = await bbdown.parse(url, options)
      return { success: true, data: result }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '解析失败',
      }
    }
  })

  ipcMain.handle('bbdown:version', async () => {
    try {
      const version = await bbdown.getVersion()
      return { success: true, version }
    } catch {
      return { success: false, error: '无法获取版本信息' }
    }
  })

  ipcMain.handle('bbdown:buildArgs', async (_, options: Partial<DownloadOptions>) => {
    return bbdown.buildArgs(options)
  })

  ipcMain.handle('bbdown:setPath', async (_, path: string) => {
    bbdown.setBBDownPath(path)
    taskManager.setBBDownPath(path)
    return true
  })

  ipcMain.handle('bbdown:login', async (event) => {
    try {
      await bbdown.login((qrcode) => {
        event.sender.send('bbdown:login-qrcode', qrcode)
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '登录失败',
      }
    }
  })
}

function setupUtilityHandlers(): void {
  ipcMain.handle('util:checkTools', async () => {
    return await ToolDetector.detectAll()
  })

  ipcMain.handle('util:checkTool', async (_, toolName: string) => {
    return await ToolDetector.detectTool(toolName)
  })

  ipcMain.handle('util:setToolPath', async (_, toolName: string, toolPath: string) => {
    ToolDetector.setToolPath(toolName, toolPath)
    if (toolName === 'bbdown') {
      bbdown.setBBDownPath(toolPath)
      taskManager.setBBDownPath(toolPath)
    }
    return await ToolDetector.detectTool(toolName)
  })

  ipcMain.handle('util:openDirectory', async (_, dirPath: string) => {
    const { shell } = await import('electron')
    if (!dirPath) return false

    let targetPath = dirPath
    try {
      const stat = await fs.stat(targetPath)
      if (stat.isFile()) {
        shell.showItemInFolder(targetPath)
        return true
      }
    } catch {
      targetPath = path.dirname(targetPath)
    }

    const error = await shell.openPath(targetPath)
    return error === ''
  })

  ipcMain.handle('util:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('util:selectFile', async (_, filters?: { name: string; extensions: string[] }[]) => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('util:getPath', async (_, name: 'home' | 'appData' | 'userData' | 'temp' | 'downloads' | 'documents') => {
    const { app } = await import('electron')
    return app.getPath(name)
  })
}

function setupHistoryHandlers(): void {
  ipcMain.handle('history:query', async (_, query?: HistoryQuery) => {
    const historyManager = taskManager.getHistoryManager()
    return await historyManager.query(query)
  })

  ipcMain.handle('history:getJob', async (_, id: string) => {
    const historyManager = taskManager.getHistoryManager()
    return await historyManager.getJob(id)
  })

  ipcMain.handle('history:delete', async (_, id: string) => {
    const historyManager = taskManager.getHistoryManager()
    await historyManager.delete(id)
    return true
  })

  ipcMain.handle('history:clear', async () => {
    const historyManager = taskManager.getHistoryManager()
    await historyManager.clear()
    return true
  })

  ipcMain.handle('history:stats', async () => {
    const historyManager = taskManager.getHistoryManager()
    return await historyManager.getStats()
  })

  ipcMain.handle('history:storageInfo', async () => {
    const historyManager = taskManager.getHistoryManager()
    return await historyManager.getStorageInfo()
  })

  ipcMain.handle('history:rescanJob', async (_, id: string) => {
    const historyManager = taskManager.getHistoryManager()
    return await historyManager.rescanJob(id)
  })
}

function setupArtifactHandlers(): void {
  ipcMain.handle('artifact:relocate', async (_, jobId: string, artifactId: string) => {
    const selected = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'All Files', extensions: ['*'] }],
    })
    if (selected.canceled || !selected.filePaths[0]) return null
    return await taskManager.getHistoryManager().relocateArtifact(jobId, artifactId, selected.filePaths[0])
  })

  ipcMain.handle('artifact:remove', async (_, jobId: string, artifactId: string) => {
    return await taskManager.getHistoryManager().removeArtifact(jobId, artifactId)
  })

  ipcMain.handle('artifact:rename', async (_, jobId: string, artifactId: string, newName: string) => {
    return await taskManager.getHistoryManager().renameArtifact(jobId, artifactId, newName)
  })

  ipcMain.handle('artifact:move', async (_, jobId: string, artifactId: string) => {
    const selected = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (selected.canceled || !selected.filePaths[0]) return null
    return await taskManager.getHistoryManager().moveArtifact(jobId, artifactId, selected.filePaths[0])
  })

  ipcMain.handle('artifact:postprocess', async (
    _,
    jobId: string,
    artifactId: string,
    ruleKind: 'video-remux-mp4' | 'video-h264-mp4' | 'video-mkv' | 'audio-mp3' | 'audio-m4a' | 'audio-flac',
    deleteOriginal: boolean = false
  ) => {
    const job = await taskManager.getHistoryManager().getJob(jobId)
    const artifact = job?.artifacts.find((item) => item.id === artifactId)
    if (!job || !artifact) throw new Error('Artifact not found')
    if (!artifact.exists) throw new Error('Artifact is missing')

    const { PostProcessManager } = await import('../core/PostProcessManager')
    const manager = new PostProcessManager()
    const rule = buildPostProcessRule(ruleKind)
    const result = await manager.processFile(artifact.path, [rule])
    if (result.success) {
      await taskManager.getHistoryManager().addPostProcessArtifact(jobId, artifactId, result.finalPath, deleteOriginal)
    }
    return result
  })
}

function buildPostProcessRule(kind: 'video-remux-mp4' | 'video-h264-mp4' | 'video-mkv' | 'audio-mp3' | 'audio-m4a' | 'audio-flac'): PostProcessRule {
  const transcode: TranscodeOptions =
    kind === 'video-remux-mp4' ? { format: 'mp4', codec: 'copy', fastStart: true, removeMetadata: false } :
    kind === 'video-h264-mp4' ? { format: 'mp4', codec: 'h264', fastStart: true, removeMetadata: false } :
    kind === 'video-mkv' ? { format: 'mkv', codec: 'copy', removeMetadata: false } :
    kind === 'audio-mp3' ? { format: 'mp3', codec: 'mp3', removeMetadata: false } :
    kind === 'audio-m4a' ? { format: 'm4a', codec: 'aac', removeMetadata: false } :
    { format: 'flac', codec: 'flac', removeMetadata: false }

  return {
    id: `artifact-${kind}-${Date.now()}`,
    name: kind,
    enabled: true,
    actions: [{ type: 'transcode', options: transcode }],
  }
}

export function getTaskManager(): TaskManager {
  return taskManager
}

export function getBBDownWrapper(): BBDownWrapper {
  return bbdown
}
