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

    const exeNames = this.getExecutableNames(toolName)
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

    const searchPaths = exeNames.flatMap((exeName) => [
      ...this.buildCandidatePaths(exeName),
      path.join(process.cwd(), '..', exeName),
      path.join(process.cwd(), exeName),
      exeName,
    ])

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
        const version = await this.getVersion(exeNames[0], toolName)
        info.exists = true
        info.version = version
        info.path = exeNames[0]
        this.toolPaths[toolName] = exeNames[0]
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

  private static buildCandidatePaths(exeName: string): string[] {
    const platformArch = `${process.platform}-${process.arch}`
    const basePaths = [
      path.join(process.cwd(), 'build', 'tools', platformArch),
      process.cwd(),
      path.dirname(process.execPath),
      ...(process.resourcesPath ? [path.join(process.resourcesPath, 'tools', platformArch)] : []),
      ...(process.resourcesPath ? [path.join(process.resourcesPath, 'tools')] : []),
      process.resourcesPath,
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/usr/bin',
    ].filter(Boolean)

    const candidates = new Set<string>()
    for (const basePath of basePaths) {
      let current = basePath
      for (let i = 0; i < 4; i += 1) {
        candidates.add(path.join(current, exeName))
        current = path.dirname(current)
      }
    }

    return [...candidates]
  }

  private static getExecutableNames(toolName: string): string[] {
    if (toolName === 'bbdown') {
      return process.platform === 'win32' ? ['BBDown.exe', 'BBDown'] : ['BBDown', 'BBDown.exe']
    }

    return process.platform === 'win32' ? [`${toolName}.exe`, toolName] : [toolName, `${toolName}.exe`]
  }

  static getToolPath(toolName: string): string | null {
    return this.toolPaths[toolName]
  }

  static setToolPath(toolName: string, path: string): void {
    this.toolPaths[toolName] = path
    if (toolName === 'ffmpeg') {
      const ffprobeName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe'
      const ffprobePath = path.replace(/ffmpeg(\.exe)?$/i, ffprobeName)
      if (ffprobePath !== path && fs.existsSync(ffprobePath)) {
        this.toolPaths.ffprobe = ffprobePath
      }
    }
  }
}
