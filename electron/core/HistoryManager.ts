import fs from 'fs/promises'
import path from 'path'
import { spawn } from 'child_process'
import { app } from 'electron'
import { ToolDetector } from './ToolDetector'
import type {
  HistoryArtifact,
  HistoryArtifactType,
  HistoryDatabase,
  HistoryJob,
  HistoryQuery,
  HistoryResult,
  MediaInfo,
} from './types'

const HISTORY_SCHEMA_VERSION = 2 as const

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mkv', '.flv', '.avi', '.mov', '.webm'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.wav'])
const SUBTITLE_EXTENSIONS = new Set(['.srt', '.ass', '.ssa', '.vtt'])
const COVER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const METADATA_EXTENSIONS = new Set(['.json'])
const DANMAKU_EXTENSIONS = new Set(['.xml'])
const ALL_EXTENSIONS = new Set([
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...SUBTITLE_EXTENSIONS,
  ...COVER_EXTENSIONS,
  ...METADATA_EXTENSIONS,
  ...DANMAKU_EXTENSIONS,
])

export interface AddJobInput {
  url: string
  title: string
  bvid: string
  upName?: string
  cover?: string
  status: HistoryJob['status']
  createdAt?: string
  completedAt?: string
  selectedPages: number[]
  selectedAssetTypes: HistoryArtifactType[]
  saveDir: string
  workDir: string
  artifacts: HistoryArtifact[]
  error?: string
}

export interface RescanResult {
  job: HistoryJob
  recovered: number
  unresolved: Array<{
    artifactId: string
    candidates: string[]
  }>
}

export class HistoryManager {
  private historyPath: string
  private oldHistoryPath: string
  private cache: HistoryDatabase | null = null

  constructor() {
    const userData = app?.getPath('userData') || process.cwd()
    this.historyPath = path.join(userData, 'history.v2.json')
    this.oldHistoryPath = path.join(userData, 'download_history.json')
  }

  async addJob(input: AddJobInput): Promise<HistoryJob> {
    const db = await this.loadDatabase()
    const now = new Date().toISOString()
    const jobId = this.createId('job')
    const artifacts = input.artifacts.map((artifact) => ({
      ...artifact,
      jobId,
      id: artifact.id || this.createId('artifact'),
    }))
    const job: HistoryJob = {
      id: jobId,
      url: input.url,
      title: input.title,
      bvid: input.bvid,
      upName: input.upName,
      cover: input.cover,
      status: input.status,
      createdAt: input.createdAt || now,
      completedAt: input.completedAt || now,
      selectedPages: input.selectedPages,
      selectedAssetTypes: input.selectedAssetTypes,
      saveDir: input.saveDir,
      workDir: input.workDir,
      totalSize: this.sumExistingSize(artifacts),
      artifacts,
      error: input.error,
    }

    db.jobs.unshift(job)
    await this.saveDatabase(db)
    return job
  }

  async query(query: HistoryQuery = {}): Promise<HistoryResult> {
    const { page = 1, pageSize = 50, search, status, startDate, endDate } = query
    const db = await this.loadDatabase()
    let jobs = db.jobs

    if (search) {
      const searchLower = search.toLowerCase()
      jobs = jobs.filter(
        (job) =>
          job.title.toLowerCase().includes(searchLower) ||
          job.bvid.toLowerCase().includes(searchLower) ||
          (job.upName || '').toLowerCase().includes(searchLower)
      )
    }

    if (status) {
      jobs = jobs.filter((job) => job.status === status)
    }

    if (startDate) {
      jobs = jobs.filter((job) => job.createdAt >= startDate)
    }

    if (endDate) {
      jobs = jobs.filter((job) => job.createdAt <= endDate)
    }

    const verifiedJobs = await this.verifyJobs(jobs)
    const total = verifiedJobs.length
    const startIndex = (page - 1) * pageSize

    return {
      items: verifiedJobs.slice(startIndex, startIndex + pageSize),
      total,
      page,
      pageSize,
    }
  }

  async getJob(id: string): Promise<HistoryJob | undefined> {
    const db = await this.loadDatabase()
    const job = db.jobs.find((item) => item.id === id)
    if (!job) return undefined
    const [verified] = await this.verifyJobs([job])
    return verified
  }

  async delete(id: string): Promise<void> {
    const db = await this.loadDatabase()
    db.jobs = db.jobs.filter((job) => job.id !== id)
    await this.saveDatabase(db)
  }

  async clear(): Promise<void> {
    await this.saveDatabase({ schemaVersion: HISTORY_SCHEMA_VERSION, jobs: [] })
  }

  async getStats(): Promise<{
    total: number
    completed: number
    failed: number
    totalSize: number
    missing: number
    artifacts: number
  }> {
    const db = await this.loadDatabase()
    const jobs = await this.verifyJobs(db.jobs)

    return {
      total: jobs.length,
      completed: jobs.filter((job) => job.status === 'completed').length,
      failed: jobs.filter((job) => job.status === 'failed').length,
      totalSize: jobs.reduce((sum, job) => sum + job.totalSize, 0),
      missing: jobs.reduce((sum, job) => sum + job.artifacts.filter((artifact) => !artifact.exists).length, 0),
      artifacts: jobs.reduce((sum, job) => sum + job.artifacts.length, 0),
    }
  }

  async getStorageInfo(): Promise<{ path: string; oldHistoryExists: boolean }> {
    try {
      const stat = await fs.stat(this.oldHistoryPath)
      return { path: this.historyPath, oldHistoryExists: stat.isFile() }
    } catch {
      return { path: this.historyPath, oldHistoryExists: false }
    }
  }

  async removeArtifact(jobId: string, artifactId: string): Promise<HistoryJob | undefined> {
    return await this.updateJob(jobId, (job) => {
      job.artifacts = job.artifacts.filter((artifact) => artifact.id !== artifactId)
      job.totalSize = this.sumExistingSize(job.artifacts)
    })
  }

  async relocateArtifact(jobId: string, artifactId: string, newPath: string): Promise<HistoryJob | undefined> {
    const stat = await fs.stat(newPath)
    if (!stat.isFile()) throw new Error('Selected path is not a file')

    return await this.updateArtifact(jobId, artifactId, async (artifact) => {
      artifact.path = newPath
      artifact.fileName = path.basename(newPath)
      artifact.ext = path.extname(newPath).toLowerCase()
      artifact.size = stat.size
      artifact.exists = true
      artifact.missingReason = undefined
      artifact.lastCheckedAt = new Date().toISOString()
      artifact.mediaInfo = await this.probeMediaInfo(newPath)
    })
  }

  async renameArtifact(jobId: string, artifactId: string, newName: string): Promise<HistoryJob | undefined> {
    const cleanName = this.sanitizeFileName(newName).trim()
    if (!cleanName) throw new Error('File name cannot be empty')

    return await this.updateArtifact(jobId, artifactId, async (artifact) => {
      await this.assertArtifactExists(artifact)
      const ext = path.extname(cleanName) || artifact.ext
      const base = path.extname(cleanName) ? path.basename(cleanName, path.extname(cleanName)) : cleanName
      const targetPath = path.join(path.dirname(artifact.path), `${base}${ext}`)
      await fs.rename(artifact.path, targetPath)
      const stat = await fs.stat(targetPath)
      artifact.path = targetPath
      artifact.fileName = path.basename(targetPath)
      artifact.ext = path.extname(targetPath).toLowerCase()
      artifact.size = stat.size
      artifact.exists = true
      artifact.lastCheckedAt = new Date().toISOString()
    })
  }

  async moveArtifact(jobId: string, artifactId: string, targetDir: string): Promise<HistoryJob | undefined> {
    return await this.updateArtifact(jobId, artifactId, async (artifact) => {
      await this.assertArtifactExists(artifact)
      await fs.mkdir(targetDir, { recursive: true })
      const targetPath = path.join(targetDir, artifact.fileName)
      await fs.rename(artifact.path, targetPath)
      const stat = await fs.stat(targetPath)
      artifact.path = targetPath
      artifact.size = stat.size
      artifact.exists = true
      artifact.lastCheckedAt = new Date().toISOString()
    })
  }

  async addPostProcessArtifact(
    jobId: string,
    sourceArtifactId: string,
    filePath: string,
    deleteOriginal: boolean
  ): Promise<HistoryJob | undefined> {
    const stat = await fs.stat(filePath)
    if (!stat.isFile()) throw new Error('Processed path is not a file')

    return await this.updateJob(jobId, async (job) => {
      const source = job.artifacts.find((artifact) => artifact.id === sourceArtifactId)
      const artifact = await this.createArtifactFromFile(filePath, job.id, 'postprocess', source)
      artifact.size = stat.size
      job.artifacts.push(artifact)

      if (deleteOriginal && source?.exists) {
        try {
          await fs.unlink(source.path)
          source.exists = false
          source.missingReason = 'deleted_by_postprocess'
          source.lastCheckedAt = new Date().toISOString()
        } catch {
          // Keep source unchanged if deletion fails.
        }
      }

      job.totalSize = this.sumExistingSize(job.artifacts)
    })
  }

  async rescanJob(jobId: string): Promise<RescanResult | undefined> {
    const db = await this.loadDatabase()
    const job = db.jobs.find((item) => item.id === jobId)
    if (!job) return undefined

    const scanRoots = Array.from(new Set([job.workDir, job.saveDir].filter(Boolean)))
    const files: Array<{ path: string; size: number; ext: string; fileName: string }> = []
    for (const root of scanRoots) {
      files.push(...await this.scanDirRecursive(root))
    }

    let recovered = 0
    const unresolved: RescanResult['unresolved'] = []

    for (const artifact of job.artifacts.filter((item) => !item.exists)) {
      const candidates = this.findCandidatesForArtifact(artifact, files)
      if (candidates.length === 1) {
        const candidate = candidates[0]
        artifact.path = candidate.path
        artifact.fileName = candidate.fileName
        artifact.ext = candidate.ext
        artifact.size = candidate.size
        artifact.exists = true
        artifact.missingReason = undefined
        artifact.lastCheckedAt = new Date().toISOString()
        artifact.mediaInfo = await this.probeMediaInfo(candidate.path)
        recovered += 1
      } else if (candidates.length > 1) {
        unresolved.push({ artifactId: artifact.id, candidates: candidates.map((candidate) => candidate.path) })
      }
    }

    job.totalSize = this.sumExistingSize(job.artifacts)
    await this.saveDatabase(db)
    return { job, recovered, unresolved }
  }

  async createArtifactsFromDirectory(
    workDir: string,
    beforeFiles: Map<string, number>,
    jobId: string = ''
  ): Promise<HistoryArtifact[]> {
    const files = await this.scanDirRecursive(workDir)
    const newOrUpdated = files.filter((file) => {
      const previous = beforeFiles.get(file.path)
      return previous === undefined || previous < file.mtime
    })

    const artifacts: HistoryArtifact[] = []
    for (const file of newOrUpdated) {
      artifacts.push(await this.createArtifactFromFile(file.path, jobId, 'bbdown'))
    }
    return artifacts
  }

  async snapshotDir(dir: string): Promise<Map<string, number>> {
    const existing = new Map<string, number>()
    const files = await this.scanDirRecursive(dir)
    for (const file of files) {
      existing.set(file.path, file.mtime)
    }
    return existing
  }

  private async loadDatabase(): Promise<HistoryDatabase> {
    if (this.cache) return this.cache

    try {
      const data = await fs.readFile(this.historyPath, 'utf-8')
      const parsed = JSON.parse(data) as Partial<HistoryDatabase>
      if (parsed.schemaVersion === HISTORY_SCHEMA_VERSION && Array.isArray(parsed.jobs)) {
        this.cache = parsed as HistoryDatabase
        return this.cache
      }
    } catch {
      // Missing or invalid files start a fresh v2 database.
    }

    this.cache = { schemaVersion: HISTORY_SCHEMA_VERSION, jobs: [] }
    await this.saveDatabase(this.cache)
    return this.cache
  }

  private async saveDatabase(db: HistoryDatabase): Promise<void> {
    this.cache = db
    await fs.mkdir(path.dirname(this.historyPath), { recursive: true })
    await fs.writeFile(this.historyPath, JSON.stringify(db, null, 2), 'utf-8')
  }

  private async verifyJobs(jobs: HistoryJob[]): Promise<HistoryJob[]> {
    let changed = false
    const now = new Date().toISOString()

    for (const job of jobs) {
      for (const artifact of job.artifacts) {
        try {
          const stat = await fs.stat(artifact.path)
          const exists = stat.isFile()
          if (artifact.exists !== exists || artifact.size !== stat.size) changed = true
          artifact.exists = exists
          artifact.size = exists ? stat.size : artifact.size
          artifact.missingReason = exists ? undefined : artifact.missingReason || 'moved_or_renamed'
          artifact.lastCheckedAt = now
        } catch {
          if (artifact.exists || !artifact.missingReason) changed = true
          artifact.exists = false
          artifact.missingReason = artifact.missingReason || 'moved_or_renamed'
          artifact.lastCheckedAt = now
        }
      }
      const totalSize = this.sumExistingSize(job.artifacts)
      if (job.totalSize !== totalSize) changed = true
      job.totalSize = totalSize
    }

    if (changed) {
      const db = await this.loadDatabase()
      await this.saveDatabase(db)
    }
    return jobs
  }

  private async updateJob(
    jobId: string,
    updater: (job: HistoryJob) => void | Promise<void>
  ): Promise<HistoryJob | undefined> {
    const db = await this.loadDatabase()
    const job = db.jobs.find((item) => item.id === jobId)
    if (!job) return undefined
    await updater(job)
    job.totalSize = this.sumExistingSize(job.artifacts)
    await this.saveDatabase(db)
    return job
  }

  private async updateArtifact(
    jobId: string,
    artifactId: string,
    updater: (artifact: HistoryArtifact, job: HistoryJob) => void | Promise<void>
  ): Promise<HistoryJob | undefined> {
    return await this.updateJob(jobId, async (job) => {
      const artifact = job.artifacts.find((item) => item.id === artifactId)
      if (!artifact) throw new Error('Artifact not found')
      await updater(artifact, job)
    })
  }

  private async createArtifactFromFile(
    filePath: string,
    jobId: string,
    source: HistoryArtifact['source'],
    derivedFrom?: HistoryArtifact
  ): Promise<HistoryArtifact> {
    const stat = await fs.stat(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const artifact: HistoryArtifact = {
      id: this.createId('artifact'),
      jobId,
      type: this.classifyArtifact(filePath),
      pageNumber: this.extractPageNumber(filePath),
      title: path.basename(filePath, ext),
      path: filePath,
      fileName: path.basename(filePath),
      ext,
      size: stat.size,
      exists: true,
      createdAt: new Date().toISOString(),
      lastCheckedAt: new Date().toISOString(),
      mediaInfo: await this.probeMediaInfo(filePath),
      source,
      derivedFromArtifactId: derivedFrom?.id,
    }
    return artifact
  }

  private classifyArtifact(filePath: string): HistoryArtifactType {
    const ext = path.extname(filePath).toLowerCase()
    const lower = path.basename(filePath).toLowerCase()
    if (VIDEO_EXTENSIONS.has(ext)) return 'video'
    if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
    if (SUBTITLE_EXTENSIONS.has(ext)) return 'subtitle'
    if (COVER_EXTENSIONS.has(ext)) return 'cover'
    if (DANMAKU_EXTENSIONS.has(ext)) return 'danmaku'
    if (METADATA_EXTENSIONS.has(ext)) return lower.includes('danmaku') ? 'danmaku' : 'metadata'
    return 'other'
  }

  private async probeMediaInfo(filePath: string): Promise<MediaInfo | undefined> {
    const type = this.classifyArtifact(filePath)
    if (type !== 'video' && type !== 'audio') return undefined

    const ffprobePath = ToolDetector.getToolPath('ffprobe') || 'ffprobe.exe'
    const args = ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath]

    return await new Promise((resolve) => {
      const child = spawn(ffprobePath, args, { windowsHide: true })
      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
      })
      child.stderr?.on('data', (data) => {
        stderr += data.toString()
      })
      child.on('close', (code) => {
        if (code !== 0) {
          resolve({ scannedAt: new Date().toISOString(), scanError: stderr || `ffprobe exited with code ${code}` })
          return
        }
        try {
          const parsed = JSON.parse(stdout) as {
            format?: { format_name?: string; duration?: string; bit_rate?: string }
            streams?: Array<Record<string, unknown>>
          }
          const video = parsed.streams?.find((stream) => stream.codec_type === 'video')
          const audio = parsed.streams?.find((stream) => stream.codec_type === 'audio')
          resolve({
            container: parsed.format?.format_name,
            duration: parsed.format?.duration ? Number(parsed.format.duration) : undefined,
            bitrate: parsed.format?.bit_rate ? Number(parsed.format.bit_rate) : undefined,
            videoCodec: typeof video?.codec_name === 'string' ? video.codec_name : undefined,
            audioCodec: typeof audio?.codec_name === 'string' ? audio.codec_name : undefined,
            width: typeof video?.width === 'number' ? video.width : undefined,
            height: typeof video?.height === 'number' ? video.height : undefined,
            frameRate: typeof video?.avg_frame_rate === 'string' ? video.avg_frame_rate : undefined,
            sampleRate: typeof audio?.sample_rate === 'string' ? Number(audio.sample_rate) : undefined,
            channels: typeof audio?.channels === 'number' ? audio.channels : undefined,
            scannedAt: new Date().toISOString(),
          })
        } catch (error) {
          resolve({ scannedAt: new Date().toISOString(), scanError: String(error) })
        }
      })
      child.on('error', (error) => {
        resolve({ scannedAt: new Date().toISOString(), scanError: error.message })
      })
    })
  }

  private async scanDirRecursive(
    dir: string
  ): Promise<Array<{ path: string; fileName: string; ext: string; size: number; mtime: number }>> {
    const results: Array<{ path: string; fileName: string; ext: string; size: number; mtime: number }> = []

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          results.push(...await this.scanDirRecursive(fullPath))
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase()
          if (!ALL_EXTENSIONS.has(ext)) continue
          const stat = await fs.stat(fullPath)
          results.push({ path: fullPath, fileName: entry.name, ext, size: stat.size, mtime: stat.mtimeMs })
        }
      }
    } catch {
      // Ignore inaccessible directories.
    }

    return results
  }

  private findCandidatesForArtifact(
    artifact: HistoryArtifact,
    files: Array<{ path: string; fileName: string; ext: string; size: number }>
  ): Array<{ path: string; fileName: string; ext: string; size: number }> {
    const sameName = files.filter((file) => file.fileName.toLowerCase() === artifact.fileName.toLowerCase())
    if (sameName.length > 0) return sameName

    const sameExtAndSize = files.filter((file) => {
      if (file.ext !== artifact.ext || !artifact.size) return false
      const diff = Math.abs(file.size - artifact.size)
      return diff <= Math.max(1024 * 1024, artifact.size * 0.05)
    })
    if (sameExtAndSize.length > 0) return sameExtAndSize

    const title = (artifact.title || '').toLowerCase()
    if (!title) return []
    return files.filter((file) => file.ext === artifact.ext && file.fileName.toLowerCase().includes(title))
  }

  private async assertArtifactExists(artifact: HistoryArtifact): Promise<void> {
    if (!artifact.exists) throw new Error('Artifact is missing')
    const stat = await fs.stat(artifact.path)
    if (!stat.isFile()) throw new Error('Artifact is missing')
  }

  private sumExistingSize(artifacts: HistoryArtifact[]): number {
    return artifacts.reduce((sum, artifact) => sum + (artifact.exists ? artifact.size || 0 : 0), 0)
  }

  private extractPageNumber(filePath: string): number | undefined {
    const match = path.basename(filePath).match(/(?:^|[\s._-])P?(\d{1,4})(?:[\s._-]|$)/i)
    return match ? Number(match[1]) : undefined
  }

  private sanitizeFileName(value: string): string {
    return Array.from(value).map((char) => {
      const code = char.charCodeAt(0)
      return code < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char
    }).join('')
  }

  private createId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }
}
