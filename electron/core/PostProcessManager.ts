import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { ToolDetector } from './ToolDetector'
import type {
  PostProcessAction,
  PostProcessRule,
  MoveOptions,
  RenameOptions,
  TranscodeOptions,
} from './types'

export interface ProcessProgress {
  percent: number
  speed: string
  eta: string
}

export interface PostProcessContext {
  title?: string
  bvid?: string
  upName?: string
  page?: string
  date?: string
}

export class PostProcessManager {
  private rules: PostProcessRule[] = []

  constructor() {
    this.loadDefaultRules()
  }

  private loadDefaultRules(): void {
    this.rules = [
      {
        id: 'mkv-to-mp4',
        name: 'MKV 转 MP4（复制流）',
        enabled: false,
        actions: [
          {
            type: 'transcode',
            options: {
              format: 'mp4',
              codec: 'copy',
              fastStart: true,
              removeMetadata: false,
            },
          },
        ],
      },
      {
        id: 'standardize-name',
        name: '标准化文件名',
        enabled: false,
        actions: [
          {
            type: 'rename',
            options: {
              pattern: '{title}_{bvid}',
              replaceSpaces: true,
              toLowerCase: false,
            },
          },
        ],
      },
    ]
  }

  getRules(): PostProcessRule[] {
    return this.rules
  }

  setRules(rules: PostProcessRule[]): void {
    this.rules = rules
  }

  async processFile(
    filePath: string,
    rules: PostProcessRule[],
    onProgress?: (action: string, progress: ProcessProgress) => void,
    context: PostProcessContext = {}
  ): Promise<{ success: boolean; finalPath: string; errors: string[] }> {
    const errors: string[] = []
    let currentPath = filePath

    for (const rule of rules.filter((r) => r.enabled)) {
      for (const action of rule.actions) {
        try {
          const result = await this.executeAction(currentPath, action, onProgress, context)

          if (result.success) {
            currentPath = result.newPath
          } else {
            errors.push(...result.errors)
          }
        } catch (error) {
          errors.push(`Action ${action.type} failed: ${error}`)
        }
      }
    }

    return {
      success: errors.length === 0,
      finalPath: currentPath,
      errors,
    }
  }

  private async executeAction(
    filePath: string,
    action: PostProcessAction,
    onProgress?: (action: string, progress: ProcessProgress) => void,
    context: PostProcessContext = {}
  ): Promise<{ success: boolean; newPath: string; errors: string[] }> {
    switch (action.type) {
      case 'rename':
        return this.renameFile(filePath, action.options, context)

      case 'move':
        return this.moveFile(filePath, action.options)

      case 'transcode':
        return this.transcodeFile(filePath, action.options, onProgress)

      case 'deleteOriginal':
        return this.deleteOriginal(filePath)

      default:
        return { success: true, newPath: filePath, errors: [] }
    }
  }

  private async renameFile(
    filePath: string,
    options: RenameOptions,
    context: PostProcessContext = {}
  ): Promise<{ success: boolean; newPath: string; errors: string[] }> {
    const errors: string[] = []
    const dir = path.dirname(filePath)
    const ext = path.extname(filePath)
    const name = path.basename(filePath, ext)

    const values: Record<string, string> = {
      title: context.title || name,
      bvid: context.bvid || '',
      up: context.upName || '',
      date: context.date || new Date().toISOString().slice(0, 10),
      p: context.page || '',
      page: context.page || '',
    }
    let newName = options.pattern.replace(/\{(title|bvid|up|date|p|page)\}/g, (_, key: string) => values[key] || '')
    newName = this.sanitizeFileName(newName).trim() || name

    if (options.replaceSpaces) {
      newName = newName.replace(/\s+/g, '_')
    }

    if (options.toLowerCase) {
      newName = newName.toLowerCase()
    }

    const newPath = path.join(dir, newName + ext)
    if (newPath === filePath) {
      return { success: true, newPath, errors }
    }

    try {
      await fs.rename(filePath, newPath)
      return { success: true, newPath, errors }
    } catch (error) {
      errors.push(`Rename failed: ${error}`)
      return { success: false, newPath: filePath, errors }
    }
  }

  private async moveFile(
    filePath: string,
    options: MoveOptions
  ): Promise<{ success: boolean; newPath: string; errors: string[] }> {
    const errors: string[] = []
    const fileName = path.basename(filePath)
    let targetDir = options.targetDir

    if (options.createSubDir) {
      const date = new Date().toISOString().split('T')[0]
      targetDir = path.join(targetDir, date)
    }

    try {
      await fs.mkdir(targetDir, { recursive: true })
      const newPath = path.join(targetDir, fileName)
      await fs.rename(filePath, newPath)
      return { success: true, newPath, errors }
    } catch (error) {
      errors.push(`Move failed: ${error}`)
      return { success: false, newPath: filePath, errors }
    }
  }

  private sanitizeFileName(value: string): string {
    return Array.from(value).map((char) => {
      const code = char.charCodeAt(0)
      return code < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char
    }).join('')
  }

  private async transcodeFile(
    filePath: string,
    options: TranscodeOptions,
    onProgress?: (action: string, progress: ProcessProgress) => void
  ): Promise<{ success: boolean; newPath: string; errors: string[] }> {
    const errors: string[] = []
    const ffmpegPath = ToolDetector.getToolPath('ffmpeg') || 'ffmpeg.exe'

    const dir = path.dirname(filePath)
    const name = path.basename(filePath, path.extname(filePath))
    const newExt = options.format === 'copy' ? path.extname(filePath) : `.${options.format}`
    const newPath = path.join(dir, `${name}_processed${newExt}`)

    const args: string[] = ['-i', filePath]

    const audioOnlyOutput = ['mp3', 'm4a', 'flac'].includes(options.format)

    if (audioOnlyOutput) {
      args.push('-vn')
      if (options.codec === 'copy') {
        args.push('-c:a', 'copy')
      } else if (options.codec === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-b:a', '192k')
      } else if (options.codec === 'aac') {
        args.push('-c:a', 'aac', '-b:a', '192k')
      } else if (options.codec === 'flac') {
        args.push('-c:a', 'flac')
      }
    } else if (options.codec === 'copy') {
      args.push('-c:v', 'copy')
      args.push('-c:a', 'copy')
    } else if (options.codec === 'h264') {
      args.push('-c:v', 'libx264')
      args.push('-crf', '23')
      args.push('-preset', 'medium')
    } else if (options.codec === 'hevc') {
      args.push('-c:v', 'libx265')
      args.push('-crf', '28')
    }

    if (options.removeMetadata) {
      args.push('-map_metadata', '-1')
    }

    if (options.format === 'mp4' && options.fastStart) {
      args.push('-movflags', '+faststart')
    }

    args.push('-y', newPath)

    return new Promise((resolve) => {
      const process = spawn(ffmpegPath, args)

      process.stderr?.on('data', (data) => {
        const output = data.toString()

        const timeMatch = output.match(/time=(\d+:\d+:\d+\.\d+)/)
        const speedMatch = output.match(/speed=\s*(\S+)/)

        if (timeMatch && onProgress) {
          onProgress('transcode', {
            percent: 50,
            speed: speedMatch ? speedMatch[1] : '',
            eta: '',
          })
        }
      })

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, newPath, errors })
        } else {
          errors.push(`FFmpeg exited with code ${code}`)
          resolve({ success: false, newPath: filePath, errors })
        }
      })

      process.on('error', (error) => {
        errors.push(`FFmpeg error: ${error.message}`)
        resolve({ success: false, newPath: filePath, errors })
      })
    })
  }

  private async deleteOriginal(
    filePath: string
  ): Promise<{ success: boolean; newPath: string; errors: string[] }> {
    const errors: string[] = []

    try {
      await fs.unlink(filePath)
      return { success: true, newPath: '', errors }
    } catch (error) {
      errors.push(`Delete failed: ${error}`)
      return { success: false, newPath: filePath, errors }
    }
  }
}
