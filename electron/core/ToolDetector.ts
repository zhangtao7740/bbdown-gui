import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

export interface ToolInfo {
  name: string
  exists: boolean
  version: string
  path: string
}

export class ToolDetector {
  private static toolPaths: Record<string, string | null> = {
    bbdown: null,
    ffmpeg: null,
    aria2c: null,
    ffprobe: null,
  }

  static async detectAll(): Promise<Record<string, ToolInfo>> {
    const results: Record<string, ToolInfo> = {}

    for (const tool of ['bbdown', 'ffmpeg', 'aria2c', 'ffprobe']) {
      results[tool] = await this.detectTool(tool)
    }

    return results
  }

  static async detectTool(toolName: string): Promise<ToolInfo> {
    const info: ToolInfo = {
      name: toolName,
      exists: false,
      version: 'unknown',
      path: '',
    }

    const exeName = toolName === 'bbdown' ? 'BBDown.exe' : `${toolName}.exe`
    const configuredPath = this.toolPaths[toolName]

    if (configuredPath) {
      try {
        const version = await this.getVersion(configuredPath, toolName)
        return {
          name: toolName,
          exists: true,
          version,
          path: configuredPath,
        }
      } catch {
        this.toolPaths[toolName] = null
      }
    }

    const searchPaths = [
      path.join(process.cwd(), '..', exeName),
      path.join(process.cwd(), exeName),
      exeName,
    ]

    for (const searchPath of searchPaths) {
      try {
        const version = await this.getVersion(searchPath, toolName)
        info.exists = true
        info.version = version
        info.path = searchPath
        this.toolPaths[toolName] = searchPath
        break
      } catch {
        continue
      }
    }

    if (!info.exists) {
      try {
        const version = await this.getVersion(exeName, toolName)
        info.exists = true
        info.version = version
        info.path = exeName
        this.toolPaths[toolName] = exeName
      } catch {
        info.exists = false
      }
    }

    return info
  }

  private static async getVersion(path: string, toolName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = toolName === 'bbdown' ? ['--version'] : ['-version']

      const process = spawn(path, args, {
        timeout: 5000,
      })

      let output = ''

      process.stdout?.on('data', (data) => {
        output += data.toString()
      })

      process.stderr?.on('data', (data) => {
        output += data.toString()
      })

      process.on('close', (code) => {
        if (code !== 0 && code !== 1) {
          reject(new Error(`Process exited with code ${code}`))
          return
        }

        const versionMatch = output.match(/(\d+\.\d+\.\d+)/)
        if (versionMatch) {
          resolve(versionMatch[1])
        } else {
          const shortMatch = output.match(/version\s+(\S+)/i)
          if (shortMatch) {
            resolve(shortMatch[1])
          } else {
            resolve('unknown')
          }
        }
      })

      process.on('error', reject)
    })
  }

  static getToolPath(toolName: string): string | null {
    return this.toolPaths[toolName]
  }

  static setToolPath(toolName: string, path: string): void {
    this.toolPaths[toolName] = path
    if (toolName === 'ffmpeg') {
      const ffprobePath = path.replace(/ffmpeg(\.exe)?$/i, 'ffprobe.exe')
      if (ffprobePath !== path && fs.existsSync(ffprobePath)) {
        this.toolPaths.ffprobe = ffprobePath
      }
    }
  }
}
