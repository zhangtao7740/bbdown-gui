import { EventEmitter } from 'events'
import { ChildProcess } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import { BBDownWrapper } from './BBDownWrapper'
import { HistoryManager } from './HistoryManager'
import type { DownloadOptions, DownloadTask, HistoryArtifactType, LogEntry, PostProcessRule } from './types'

export class TaskManager extends EventEmitter {
  private tasks: Map<string, DownloadTask> = new Map()
  private runningTasks: Map<string, ChildProcess> = new Map()
  private bbdown: BBDownWrapper
  private historyManager: HistoryManager
  private maxConcurrent: number = 2
  private requestedStops: Set<string> = new Set()

  constructor(bbdownPath?: string) {
    super()
    this.bbdown = new BBDownWrapper(bbdownPath)
    this.historyManager = new HistoryManager()
  }

  addTask(
    url: string,
    title: string,
    options: DownloadOptions,
    enablePostProcess: boolean = false,
    postProcessRules: PostProcessRule[] = [],
    metadata: Partial<DownloadTask> = {}
  ): DownloadTask {
    const task: DownloadTask = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url,
      title,
      status: 'waiting',
      progress: 0,
      speed: 0,
      downloadedSize: '0 B',
      totalSize: 'Unknown',
      eta: '',
      createdAt: new Date(),
      options,
      enablePostProcess,
      postProcessRules,
      bvid: metadata.bvid,
      thumbnail: metadata.thumbnail,
      upName: metadata.upName,
      pageCount: metadata.pageCount,
      logs: [],
    }

    this.tasks.set(task.id, task)
    this.emit('task:added', task)
    this.emit('queue:changed')
    this.processQueue()
    return task
  }

  getTask(taskId: string): DownloadTask | undefined {
    return this.tasks.get(taskId)
  }

  getAllTasks(): DownloadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => {
      const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
      const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
      return timeB - timeA
    })
  }

  updateTask(taskId: string, updates: Partial<DownloadTask>): void {
    const task = this.tasks.get(taskId)
    if (!task) return
    Object.assign(task, updates)
    this.emit('task:updated', task)
  }

  removeTask(taskId: string): boolean {
    this.stopTask(taskId, 'cancelled')
    const deleted = this.tasks.delete(taskId)
    if (deleted) {
      this.emit('task:removed', taskId)
      this.emit('queue:changed')
    }
    return deleted
  }

  stopTask(taskId: string, nextStatus: 'paused' | 'cancelled' = 'paused'): void {
    const process = this.runningTasks.get(taskId)
    if (!process) return
    this.requestedStops.add(taskId)
    process.kill()
    this.runningTasks.delete(taskId)
    this.updateTask(taskId, { status: nextStatus, speed: 0 })
  }

  startTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task || task.status === 'downloading' || task.status === 'processing') return
    this.executeTask(task)
  }

  retryTask(taskId: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return
    task.status = 'waiting'
    task.progress = 0
    task.speed = 0
    task.error = undefined
    task.startedAt = undefined
    task.completedAt = undefined
    this.emit('task:updated', task)
    this.processQueue()
  }

  pauseAll(): void {
    for (const taskId of this.runningTasks.keys()) {
      this.stopTask(taskId, 'paused')
    }
  }

  resumeAll(): void {
    for (const task of this.tasks.values()) {
      if (task.status === 'paused') {
        task.status = 'waiting'
        this.emit('task:updated', task)
      }
    }
    this.processQueue()
  }

  clearCompleted(): void {
    for (const task of this.tasks.values()) {
      if (task.status === 'completed') {
        this.tasks.delete(task.id)
        this.emit('task:removed', task.id)
      }
    }
    this.emit('queue:changed')
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max
    this.processQueue()
  }

  getStats(): {
    total: number
    waiting: number
    downloading: number
    processing: number
    completed: number
    failed: number
  } {
    const tasks = this.getAllTasks()
    return {
      total: tasks.length,
      waiting: tasks.filter((task) => task.status === 'waiting').length,
      downloading: tasks.filter((task) => task.status === 'downloading').length,
      processing: tasks.filter((task) => task.status === 'processing').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
      failed: tasks.filter((task) => task.status === 'failed').length,
    }
  }

  getHistoryManager(): HistoryManager {
    return this.historyManager
  }

  setBBDownPath(path: string): void {
    this.bbdown.setBBDownPath(path)
  }

  getTaskLogs(taskId: string): LogEntry[] {
    return this.tasks.get(taskId)?.logs || []
  }

  private processQueue(): void {
    const runningCount = this.runningTasks.size
    if (runningCount >= this.maxConcurrent) return

    const waitingTasks = this.getAllTasks().filter((task) => task.status === 'waiting')
    const toStart = Math.min(this.maxConcurrent - runningCount, waitingTasks.length)
    for (let i = 0; i < toStart; i += 1) {
      this.executeTask(waitingTasks[i])
    }
  }

  private async executeTask(task: DownloadTask): Promise<void> {
    if (this.runningTasks.has(task.id)) return

    task.status = 'downloading'
    task.startedAt = new Date()
    this.emit('task:started', task)
    this.emit('task:updated', task)

    const baseWorkDir = task.options?.workDir || path.join(process.cwd(), 'downloads')
    const workDir = this.getTaskWorkDir(baseWorkDir, task)
    await fs.mkdir(workDir, { recursive: true })
    const beforeFiles = await this.historyManager.snapshotDir(workDir)

    try {
      const options = {
        ...this.getDefaultOptions(task.url, workDir),
        ...(task.options || {}),
        workDir,
      }
      task.options = options

      const { process: downloadProcess, promise } = this.bbdown.download(
        options,
        (progress) => {
          this.updateTask(task.id, {
            progress: progress.percent,
            speed: progress.speed,
            downloadedSize: progress.downloaded,
            totalSize: progress.total,
            eta: progress.eta,
          })
        },
        (status) => {
          if (status === 'processing') {
            this.updateTask(task.id, { status: 'processing' })
          }
        },
        (source, message) => this.addLog(task.id, source, message)
      )

      this.runningTasks.set(task.id, downloadProcess)
      const result = await promise
      this.runningTasks.delete(task.id)

      if (this.requestedStops.delete(task.id)) {
        if (this.tasks.has(task.id)) {
          task.status = 'paused'
          task.speed = 0
          this.emit('task:updated', task)
        }
        setTimeout(() => this.processQueue(), 500)
        return
      }

      if (result.code === 0) {
        await this.completeSuccessfulTask(task, baseWorkDir, workDir, beforeFiles)
      } else {
        task.status = 'failed'
        task.error = result.stderr || 'Download failed'
        this.emit('task:failed', task, task.error)
        await this.writeHistoryJob(task, baseWorkDir, workDir, [], 'failed', task.error)
      }
    } catch (error) {
      this.runningTasks.delete(task.id)
      task.status = 'failed'
      task.error = error instanceof Error ? error.message : 'Unknown error'
      this.emit('task:failed', task, task.error)
      await this.writeHistoryJob(task, baseWorkDir, workDir, [], 'failed', task.error)
    }

    this.emit('task:updated', task)
    setTimeout(() => this.processQueue(), 500)
  }

  private async completeSuccessfulTask(
    task: DownloadTask,
    baseWorkDir: string,
    workDir: string,
    beforeFiles: Map<string, number>
  ): Promise<void> {
    task.status = 'completed'
    task.progress = 100
    task.speed = 0
    task.eta = ''
    task.completedAt = new Date()

    const artifacts = await this.historyManager.createArtifactsFromDirectory(workDir, beforeFiles)
    const primaryArtifact = this.pickPrimaryArtifact(artifacts)
    task.outputPath = primaryArtifact?.path || ''
    task.fileSize = primaryArtifact?.size

    await this.writeHistoryJob(task, baseWorkDir, workDir, artifacts, 'completed')
    this.emit('task:completed', task)
  }

  private async writeHistoryJob(
    task: DownloadTask,
    baseWorkDir: string,
    workDir: string,
    artifacts: Awaited<ReturnType<HistoryManager['createArtifactsFromDirectory']>>,
    status: 'completed' | 'failed' | 'cancelled',
    error?: string
  ): Promise<void> {
    await this.historyManager.addJob({
      title: task.title,
      url: task.url,
      bvid: task.bvid || this.extractBvid(task.url),
      cover: task.thumbnail,
      upName: task.upName,
      status,
      createdAt: task.createdAt.toISOString(),
      completedAt: (task.completedAt || new Date()).toISOString(),
      selectedPages: task.options?.selectedPages || [],
      selectedAssetTypes: this.getSelectedAssetTypes(task.options),
      saveDir: baseWorkDir,
      workDir,
      artifacts,
      error,
    })
  }

  private getDefaultOptions(url: string, workDir: string): DownloadOptions {
    return {
      url,
      apiMode: 'web',
      encodingPriority: ['hevc', 'avc'],
      dfnPriority: [],
      selectedPages: [],
      filePattern: '<videoTitle>',
      multiFilePattern: '',
      workDir,
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
  }

  private getTaskWorkDir(baseWorkDir: string, task: DownloadTask): string {
    const safeTitle = this.sanitizeFileName(task.title).replace(/\s+/g, ' ').trim().slice(0, 80) || 'untitled'
    return path.join(baseWorkDir, `${task.id}-${safeTitle}`)
  }

  private sanitizeFileName(value: string): string {
    return Array.from(value).map((char) => {
      const code = char.charCodeAt(0)
      return code < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char
    }).join('')
  }

  private extractBvid(text: string): string {
    const match = text.match(/BV[a-zA-Z0-9]+/)
    return match ? match[0] : ''
  }

  private addLog(taskId: string, source: 'stdout' | 'stderr', message: string): void {
    const task = this.tasks.get(taskId)
    if (!task) return
    const entry: LogEntry = {
      timestamp: Date.now(),
      level: source === 'stderr' ? 'error' : 'info',
      message,
      source,
    }
    task.logs = [...(task.logs || []), entry].slice(-1500)
    this.emit('task:log', taskId, entry)
  }

  private pickPrimaryArtifact(artifacts: Array<{ type: HistoryArtifactType; path: string; size?: number }>) {
    return [...artifacts].sort((a, b) => {
      const score = (type: HistoryArtifactType) => {
        if (type === 'video') return 30
        if (type === 'audio') return 20
        return 0
      }
      const scoreDiff = score(b.type) - score(a.type)
      return scoreDiff !== 0 ? scoreDiff : (b.size || 0) - (a.size || 0)
    })[0]
  }

  private getSelectedAssetTypes(options?: DownloadOptions): HistoryArtifactType[] {
    const types: HistoryArtifactType[] = []
    if (!options?.audioOnly) types.push('video')
    if (!options?.videoOnly) types.push('audio')
    if (options?.downloadSubtitle) types.push('subtitle')
    if (options?.downloadDanmaku) types.push('danmaku')
    if (options?.downloadCover) types.push('cover')
    return types
  }
}
