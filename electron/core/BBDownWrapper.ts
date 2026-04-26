import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fsSync from 'fs'
import fs from 'fs/promises'
import type { DownloadOptions, ProcessOutput, VideoInfo } from './types'

export class BBDownWrapper {
  private bbdownPath: string
  private workingDir: string
  private outputEncoding: string = 'utf-8'
  private activeLoginProcess: ChildProcess | null = null
  private activeLoginQRCodePath: string | null = null

  constructor(bbdownPath?: string, workingDir?: string) {
    this.bbdownPath = bbdownPath || this.findBBDown()
    this.workingDir = workingDir || process.cwd()
    this.detectEncoding()
  }

  private detectEncoding() {
    this.outputEncoding = process.platform === 'win32' ? 'gb18030' : 'utf-8'
  }

  setEncoding(encoding: string) {
    this.outputEncoding = encoding
  }

  private findBBDown(): string {
    const candidateBases = [
      process.cwd(),
      path.dirname(process.execPath),
      process.resourcesPath,
    ].filter(Boolean)

    const candidates = new Set<string>()
    for (const base of candidateBases) {
      let current = base
      for (let i = 0; i < 4; i += 1) {
        candidates.add(path.join(current, 'BBDown.exe'))
        current = path.dirname(current)
      }
    }

    for (const candidate of candidates) {
      if (fsSync.existsSync(candidate)) return candidate
    }

    return 'BBDown.exe'
  }

  buildArgs(options: Partial<DownloadOptions>): string[] {
    const args: string[] = []

    if (options.url) args.push(options.url)

    switch (options.apiMode) {
      case 'tv':
        args.push('-tv')
        break
      case 'app':
        args.push('-app')
        break
      case 'intl':
        args.push('-intl')
        break
    }

    if (options.encodingPriority?.length) args.push('-e', options.encodingPriority.join(','))
    if (options.dfnPriority?.length) args.push('-q', options.dfnPriority.join(','))
    if (options.selectedPages?.length) args.push('-p', options.selectedPages.join(','))
    if (options.filePattern) args.push('-F', options.filePattern)
    if (options.multiFilePattern) args.push('-M', options.multiFilePattern)
    if (options.workDir) args.push('--work-dir', options.workDir)
    if (options.downloadDanmaku) args.push('-dd')
    if (options.downloadSubtitle === false) args.push('--skip-subtitle')
    if (options.downloadCover === false || options.skipCover) args.push('--skip-cover')
    if (options.videoOnly) args.push('--video-only')
    if (options.audioOnly) args.push('--audio-only')

    if (options.useAria2c) {
      args.push('-aria2')
      if (options.aria2cArgs) args.push('--aria2c-args', options.aria2cArgs)
    }

    if (options.multiThread) args.push('-mt')
    if (options.skipAI) args.push('--skip-ai')
    if (options.delayPerPage && options.delayPerPage > 0) {
      args.push('--delay-per-page', String(options.delayPerPage))
    }
    if (options.useMP4box) args.push('--use-mp4box')
    if (options.ffmpegPath) args.push('--ffmpeg-path', options.ffmpegPath)
    if (options.aria2cPath) args.push('--aria2c-path', options.aria2cPath)
    if (options.cookie) args.push('-c', options.cookie)
    if (options.accessToken) args.push('-token', options.accessToken)
    if (options.language) args.push('--language', options.language)

    return args
  }

  async parse(url: string, options?: Partial<DownloadOptions>): Promise<VideoInfo> {
    const args = [url, '-info', '--show-all']

    if (options?.apiMode && options.apiMode !== 'web') args.push(`-${options.apiMode}`)
    if (options?.cookie) args.push('-c', options.cookie)
    if (options?.accessToken) args.push('-token', options.accessToken)
    if (options?.ffmpegPath) args.push('--ffmpeg-path', options.ffmpegPath)

    return new Promise((resolve, reject) => {
      const proc = spawn(this.bbdownPath, args, {
        cwd: this.workingDir,
        env: { ...process.env },
        windowsHide: true,
      })

      let stdout = ''
      let stderr = ''
      const stdoutDecoder = new TextDecoder(this.outputEncoding)
      const stderrDecoder = new TextDecoder(this.outputEncoding)

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += stdoutDecoder.decode(data, { stream: true })
      })

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += stderrDecoder.decode(data, { stream: true })
      })

      proc.on('close', async (code) => {
        stdout += stdoutDecoder.decode()
        stderr += stderrDecoder.decode()
        if (code !== 0) {
          reject(new Error(`BBDown exited with code ${code}: ${stderr || stdout}`))
          return
        }

        try {
          const info = this.parseInfoOutput(stdout)
          if (!info.bvid) info.bvid = this.extractBvid(url)
          await this.enrichVideoInfo(info)
          resolve(info)
        } catch (error) {
          reject(error)
        }
      })

      proc.on('error', reject)
    })
  }

  private parseInfoOutput(stdout: string): VideoInfo {
    const lines = stdout.split(/\r?\n/)
    const info: Partial<VideoInfo> = {
      tags: [],
      pages: [],
      streams: [],
    }

    for (const line of lines) {
      const trimLine = this.stripLogPrefix(line.trim())
      if (!trimLine) continue

      if (this.parsePageLine(trimLine, info)) continue
      this.parseStreamLine(trimLine, info)

      const colonIdx = this.findFieldColon(trimLine)
      if (colonIdx === -1) continue

      const label = trimLine.substring(0, colonIdx).trim()
      const value = trimLine.substring(colonIdx + 1).trim()
      this.applyParsedField(info, label, value)
    }

    if (!info.title) info.title = '未知视频'
    if (!info.cover) info.cover = ''
    if (!info.bvid) info.bvid = this.extractBvid(stdout)
    if (!info.aid) info.aid = ''
    if (!info.up) info.up = { name: '未知UP主', mid: '' }
    if (!info.duration) info.duration = this.sumPageDurations(info.pages || [])
    if (!info.publishTime) info.publishTime = ''
    if (!info.partition) info.partition = ''

    return info as VideoInfo
  }

  private async enrichVideoInfo(info: VideoInfo): Promise<void> {
    if (!info.bvid) return

    try {
      const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(info.bvid)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 BBDown-GUI',
          Referer: `https://www.bilibili.com/video/${info.bvid}`,
        },
      })
      if (!response.ok) return

      const payload = await response.json() as {
        code?: number
        data?: {
          title?: string
          pic?: string
          duration?: number
          pubdate?: number
          tname?: string
          owner?: { name?: string; mid?: number }
        }
      }
      if (payload.code !== 0 || !payload.data) return

      const data = payload.data
      if (!info.cover && data.pic) info.cover = data.pic
      if ((!info.title || info.title === '未知视频') && data.title) info.title = data.title
      if (!info.duration && data.duration) info.duration = data.duration
      if (!info.partition && data.tname) info.partition = data.tname
      if (!info.publishTime && data.pubdate) {
        info.publishTime = new Date(data.pubdate * 1000).toLocaleString('zh-CN', { hour12: false })
      }
      if ((!info.up || info.up.name === '未知UP主') && data.owner?.name) {
        info.up = { name: data.owner.name, mid: data.owner.mid ? String(data.owner.mid) : '' }
      }
    } catch {
      // Cover enrichment is best-effort; BBDown parsing remains the source of truth.
    }
  }

  private findFieldColon(line: string): number {
    const cnColonIdx = line.indexOf('：')
    const enColonIdx = line.indexOf(':')
    if (cnColonIdx === -1) return enColonIdx
    if (enColonIdx === -1) return cnColonIdx
    return Math.min(cnColonIdx, enColonIdx)
  }

  private applyParsedField(info: Partial<VideoInfo>, label: string, value: string): void {
    const normalizedLabel = label.replace(/^\[[^\]]+\]\s*-\s*/, '').trim()
    switch (normalizedLabel) {
      case '标题':
      case '视频标题':
        info.title = value
        break
      case 'UP主':
        info.up = this.parseUpField(value)
        break
      case 'UP主页':
        info.up = { name: value, mid: this.extractMidFromUrl(value) }
        break
      case 'BVID':
        info.bvid = value
        break
      case 'AID':
      case 'aid':
        info.aid = value
        break
      case '获取aid结束':
        info.aid = value
        break
      case '分区':
        info.partition = value
        break
      case '发布时间':
        info.publishTime = value
        break
      case '封面':
        info.cover = value
        break
      case '时长':
        info.duration = this.parseDuration(value)
        break
    }
  }

  private parseUpField(value: string): { name: string; mid: string } {
    const upMatch = value.match(/(.+?)\s*\[(\d+)\]/)
    if (upMatch) return { name: upMatch[1].trim(), mid: upMatch[2] }
    return { name: value, mid: '' }
  }

  private extractMidFromUrl(value: string): string {
    const match = value.match(/space\.bilibili\.com\/(\d+)/)
    return match ? match[1] : ''
  }

  private extractBvid(text: string): string {
    const match = text.match(/BV[a-zA-Z0-9]+/)
    return match ? match[0] : ''
  }

  private stripLogPrefix(line: string): string {
    return line.replace(/^\[[^\]]+\]\s*-\s*/, '').trim()
  }

  private parsePageLine(trimLine: string, info: Partial<VideoInfo>): boolean {
    const bbdownMatch = trimLine.match(/^P(\d+):\s*\[(.*?)\]\s*\[(.*?)\]\s*\[(.*?)\]/)
    if (!bbdownMatch) return false

    const title = bbdownMatch[3].trim()
    info.pages!.push({
      pageNumber: parseInt(bbdownMatch[1]),
      title: title || `P${bbdownMatch[1]}`,
      duration: this.parseDuration(bbdownMatch[4]),
      cid: bbdownMatch[2],
      selected: true,
    })
    return true
  }

  private parseStreamLine(trimLine: string, info: Partial<VideoInfo>): void {
    const streamMatch = trimLine.match(/^\d+\.\s*\[(.+?)\]\s*(?:\[(.*?)\])?\s*\[(AV1|AVC|HEVC|M4A|FLAC|MP3|AAC|DOLBY|ATMOS)[^\]]*\]/i)
    if (!streamMatch) return

    info.streams!.push({
      quality: streamMatch[1]?.trim() || '',
      resolution: streamMatch[2]?.trim() || '',
      codecs: streamMatch[3] ? [streamMatch[3].trim()] : [],
    })
  }

  private parseDuration(durationStr: string): number {
    const humanMatch = durationStr.match(/(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i)
    if (humanMatch && (humanMatch[1] || humanMatch[2] || humanMatch[3])) {
      return (parseInt(humanMatch[1] || '0') * 3600) +
        (parseInt(humanMatch[2] || '0') * 60) +
        parseInt(humanMatch[3] || '0')
    }

    const parts = durationStr.split(':').map((part) => parseInt(part, 10))
    if (parts.length === 2 && parts.every(Number.isFinite)) return parts[0] * 60 + parts[1]
    if (parts.length === 3 && parts.every(Number.isFinite)) return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return 0
  }

  private sumPageDurations(pages: Array<{ duration: number }>): number {
    return pages.reduce((total, page) => total + (page.duration || 0), 0)
  }

  download(
    options: DownloadOptions,
    onProgress?: (progress: {
      percent: number
      speed: number
      downloaded: string
      total: string
      eta: string
    }) => void,
    onStatus?: (status: string) => void,
    onLog?: (source: 'stdout' | 'stderr', message: string) => void
  ): {
    process: ChildProcess
    promise: Promise<ProcessOutput>
  } {
    const args = this.buildArgs(options)

    const proc = spawn(this.bbdownPath, args, {
      cwd: options.workDir || this.workingDir,
      env: { ...process.env },
      windowsHide: true,
    })

    const promise = new Promise<ProcessOutput>((resolve, reject) => {
      let stdout = ''
      let stderr = ''
      const stdoutDecoder = new TextDecoder(this.outputEncoding)
      const stderrDecoder = new TextDecoder(this.outputEncoding)

      proc.stdout?.on('data', (data: Buffer) => {
        const text = stdoutDecoder.decode(data, { stream: true })
        stdout += text
        this.emitLogLines('stdout', text, onLog)
        this.parseProgressLine(text, onProgress, onStatus)
      })

      proc.stderr?.on('data', (data: Buffer) => {
        const text = stderrDecoder.decode(data, { stream: true })
        stderr += text
        this.emitLogLines('stderr', text, onLog)
      })

      proc.on('close', (code) => {
        const remainingStdout = stdoutDecoder.decode()
        const remainingStderr = stderrDecoder.decode()
        stdout += remainingStdout
        stderr += remainingStderr
        this.emitLogLines('stdout', remainingStdout, onLog)
        this.emitLogLines('stderr', remainingStderr, onLog)
        resolve({ stdout, stderr, code })
      })

      proc.on('error', reject)
    })

    return { process: proc, promise }
  }

  private emitLogLines(
    source: 'stdout' | 'stderr',
    text: string,
    onLog?: (source: 'stdout' | 'stderr', message: string) => void
  ): void {
    if (!onLog) return
    for (const line of text.split(/\r?\n/)) {
      if (line.trim()) onLog(source, line)
    }
  }

  private parseProgressLine(
    line: string,
    onProgress?: (progress: {
      percent: number
      speed: number
      downloaded: string
      total: string
      eta: string
    }) => void,
    onStatus?: (status: string) => void
  ): void {
    const progressMatch = line.match(/(\d+\.?\d*)%.*?(\d+\.?\d*\s*[KM]B\/s).*?(\d+:\d+)/)
    if (progressMatch && onProgress) {
      const sizeMatch = line.match(/(\d+(?:\.\d+)?\s*(?:[KMGT]?i?B|[KMGT]?B))\s*\/\s*(\d+(?:\.\d+)?\s*(?:[KMGT]?i?B|[KMGT]?B))/i)
      onProgress({
        percent: parseFloat(progressMatch[1]),
        speed: this.parseSpeed(progressMatch[2]),
        downloaded: sizeMatch?.[1] || '',
        total: sizeMatch?.[2] || '',
        eta: progressMatch[3],
      })
    }

    if (!onStatus) return
    if (line.includes('混流') || line.includes('合并')) {
      onStatus('processing')
    } else if (line.includes('下载') || line.includes('任务完成')) {
      onStatus('downloading')
    }
  }

  private parseSpeed(speedText: string): number {
    const match = speedText.match(/(\d+\.?\d*)\s*([KM]B\/s)/)
    if (!match) return 0

    const value = parseFloat(match[1])
    if (match[2] === 'MB/s') return value * 1024 * 1024
    if (match[2] === 'KB/s') return value * 1024
    return 0
  }

  async getVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.bbdownPath, ['--version'], { windowsHide: true })
      let stdout = ''
      const stdoutDecoder = new TextDecoder(this.outputEncoding)

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += stdoutDecoder.decode(data, { stream: true })
      })

      proc.on('close', () => {
        stdout += stdoutDecoder.decode()
        const versionMatch = stdout.match(/(\d+\.\d+\.\d+)/)
        resolve(versionMatch ? versionMatch[1] : 'unknown')
      })

      proc.on('error', reject)
    })
  }

  async login(onQRCode: (qrcode: string) => void): Promise<void> {
    if (this.activeLoginProcess) {
      throw new Error('BBDown login is already running')
    }

    return new Promise((resolve, reject) => {
      let settled = false
      const loginWorkingDir = path.dirname(this.bbdownPath)
      this.activeLoginQRCodePath = path.join(loginWorkingDir, 'qrcode.png')
      const proc = spawn(this.bbdownPath, ['login'], {
        cwd: loginWorkingDir,
        env: { ...process.env },
        windowsHide: true,
      })
      this.activeLoginProcess = proc

      const stdoutDecoder = new TextDecoder(this.outputEncoding)
      const stderrDecoder = new TextDecoder(this.outputEncoding)
      let qrcodeImageSent = false

      const finish = (error?: Error) => {
        if (settled) return
        settled = true
        this.activeLoginProcess = null
        this.cleanupLoginQRCode()
        if (error) reject(error)
        else resolve()
      }

      const handleOutput = (text: string) => {
        const cleaned = this.cleanTerminalOutput(text)
        const image = this.readLoginQRCode(loginWorkingDir)
        if (image && !qrcodeImageSent) {
          qrcodeImageSent = true
          onQRCode(image)
        } else if (cleaned && !qrcodeImageSent) {
          onQRCode(cleaned)
        }
        if (this.isLoginSuccess(cleaned)) finish()
      }

      proc.stdout?.on('data', (data: Buffer) => {
        handleOutput(stdoutDecoder.decode(data, { stream: true }))
      })

      proc.stderr?.on('data', (data: Buffer) => {
        handleOutput(stderrDecoder.decode(data, { stream: true }))
      })

      proc.on('close', (code) => {
        const remainingStdout = stdoutDecoder.decode()
        const remainingStderr = stderrDecoder.decode()
        if (remainingStdout) handleOutput(remainingStdout)
        if (remainingStderr) handleOutput(remainingStderr)
        if (code !== 0) {
          finish(new Error(`BBDown login exited with code ${code}`))
        } else {
          finish()
        }
      })

      proc.on('error', (err) => {
        finish(err)
      })
    })
  }

  private cleanTerminalOutput(text: string): string {
    const ansiPattern = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, 'g')
    return text.replace(ansiPattern, '')
  }

  private isLoginSuccess(text: string): boolean {
    return text.includes('登录成功') || text.toLowerCase().includes('login success')
  }

  private readLoginQRCode(loginWorkingDir: string): string | null {
    const qrcodePath = this.activeLoginQRCodePath || path.join(loginWorkingDir, 'qrcode.png')
    try {
      if (!fsSync.existsSync(qrcodePath)) return null
      const image = fsSync.readFileSync(qrcodePath)
      return `data:image/png;base64,${image.toString('base64')}`
    } catch {
      return null
    }
  }

  cancelLogin(): void {
    if (this.activeLoginProcess) {
      this.activeLoginProcess.kill()
      this.activeLoginProcess = null
    }
    this.cleanupLoginQRCode()
  }

  private cleanupLoginQRCode(): void {
    const candidates = [
      this.activeLoginQRCodePath,
      path.join(path.dirname(this.bbdownPath), 'qrcode.png'),
      path.join(this.workingDir, 'qrcode.png'),
      path.join(process.cwd(), 'qrcode.png'),
    ].filter(Boolean) as string[]

    for (const candidate of [...new Set(candidates)]) {
      try {
        if (fsSync.existsSync(candidate)) fsSync.unlinkSync(candidate)
      } catch {
        setTimeout(() => {
          try {
            if (fsSync.existsSync(candidate)) fsSync.unlinkSync(candidate)
          } catch {
            // Ignore cleanup failures; the next login/cancel will try again.
          }
        }, 300)
      }
    }
    this.activeLoginQRCodePath = null
  }

  private getCredentialCandidates(): string[] {
    const candidates = [
      path.join(path.dirname(this.bbdownPath), 'BBDown.data'),
      path.join(this.workingDir, 'BBDown.data'),
      path.join(process.cwd(), 'BBDown.data'),
      path.join(process.cwd(), '..', 'BBDown.data'),
      path.join(process.cwd(), '..', '..', 'BBDown.data'),
    ]
    return [...new Set(candidates)]
  }

  async getAccountStatus(): Promise<{ loggedIn: boolean; path?: string; updatedAt?: string }> {
    for (const candidate of this.getCredentialCandidates()) {
      try {
        const stat = await fs.stat(candidate)
        if (stat.isFile() && stat.size > 0) {
          return {
            loggedIn: true,
            path: candidate,
            updatedAt: stat.mtime.toISOString(),
          }
        }
      } catch {
        // Try next possible BBDown.data location.
      }
    }
    return { loggedIn: false }
  }

  async logout(): Promise<string[]> {
    const removed: string[] = []
    for (const candidate of this.getCredentialCandidates()) {
      try {
        await fs.unlink(candidate)
        removed.push(candidate)
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code !== 'ENOENT') throw error
      }
    }
    return removed
  }

  setBBDownPath(path: string): void {
    this.bbdownPath = path
  }

  setWorkingDir(dir: string): void {
    this.workingDir = dir
  }
}
