export interface VideoInfo {
  title: string
  cover: string
  up: {
    name: string
    mid: string
  }
  bvid: string
  aid: string
  duration: number
  publishTime: string
  partition: string
  tags: string[]
  pages: VideoPage[]
  streams: VideoStream[]
}

export interface VideoPage {
  pageNumber: number
  cid: string
  title: string
  duration: number
  selected: boolean
}

export interface VideoStream {
  quality: string
  resolution: string
  codecs: string[]
}

export interface DownloadOptions {
  url: string
  apiMode: 'web' | 'tv' | 'app' | 'intl'
  encodingPriority: string[]
  dfnPriority: string[]
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
  ffmpegPath?: string
  aria2cPath?: string
  cookie?: string
  accessToken?: string
  language?: string
}

export type TaskStatus = 'waiting' | 'parsing' | 'downloading' | 'processing' | 'completed' | 'failed' | 'paused' | 'cancelled'

export interface LogEntry {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  source: 'stdout' | 'stderr' | 'system'
}

export interface DownloadTask {
  id: string
  url: string
  title: string
  status: TaskStatus
  progress: number
  speed: number
  downloadedSize: string
  totalSize: string
  eta: string
  outputPath?: string
  error?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  options?: DownloadOptions
  enablePostProcess?: boolean
  postProcessRules?: PostProcessRule[]
  postProcessErrors?: string[]
  bvid?: string
  thumbnail?: string
  upName?: string
  pageCount?: number
  fileSize?: number
  logs?: LogEntry[]
}

export type HistoryArtifactType =
  | 'video'
  | 'audio'
  | 'subtitle'
  | 'danmaku'
  | 'cover'
  | 'metadata'
  | 'other'

export interface MediaInfo {
  container?: string
  duration?: number
  bitrate?: number
  videoCodec?: string
  audioCodec?: string
  width?: number
  height?: number
  frameRate?: string
  sampleRate?: number
  channels?: number
  scannedAt?: string
  scanError?: string
}

export interface HistoryArtifact {
  id: string
  jobId: string
  type: HistoryArtifactType
  pageNumber?: number
  title?: string
  path: string
  fileName: string
  ext: string
  size?: number
  exists: boolean
  missingReason?: 'deleted' | 'moved_or_renamed' | 'deleted_by_postprocess'
  createdAt: string
  lastCheckedAt?: string
  mediaInfo?: MediaInfo
  source: 'bbdown' | 'postprocess'
  derivedFromArtifactId?: string
}

export interface HistoryJob {
  id: string
  url: string
  title: string
  bvid: string
  upName?: string
  cover?: string
  status: 'completed' | 'failed' | 'cancelled'
  createdAt: string
  completedAt?: string
  selectedPages: number[]
  selectedAssetTypes: HistoryArtifactType[]
  saveDir: string
  workDir: string
  totalSize: number
  artifacts: HistoryArtifact[]
  error?: string
}

export interface HistoryDatabase {
  schemaVersion: 2
  jobs: HistoryJob[]
}

export interface ProcessOutput {
  stdout: string
  stderr: string
  code: number | null
}

export interface PostProcessRule {
  id: string
  name: string
  enabled: boolean
  actions: PostProcessAction[]
}

export type PostProcessAction =
  | { type: 'rename'; options: RenameOptions }
  | { type: 'move'; options: MoveOptions }
  | { type: 'transcode'; options: TranscodeOptions }
  | { type: 'deleteOriginal'; options?: object }

export interface RenameOptions {
  pattern: string
  replaceSpaces?: boolean
  toLowerCase?: boolean
}

export interface MoveOptions {
  targetDir: string
  createSubDir?: boolean
}

export interface TranscodeOptions {
  format: 'mp4' | 'mkv' | 'copy' | 'mp3' | 'm4a' | 'flac'
  codec: 'copy' | 'h264' | 'hevc' | 'aac' | 'mp3' | 'flac'
  quality?: 'high' | 'medium' | 'low'
  removeMetadata?: boolean
  fastStart?: boolean
}

export interface HistoryQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
  startDate?: string
  endDate?: string
}

export interface HistoryResult {
  items: HistoryJob[]
  total: number
  page: number
  pageSize: number
}
