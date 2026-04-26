import { app, BrowserWindow, ipcMain, nativeTheme, shell, Tray, Menu, nativeImage } from 'electron'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initIpcHandlers } from './ipc/index'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
let ipcInitialized = false

// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

function findAssetPath(fileName: string): string | null {
  const candidates = [
    path.join(__dirname, '../dist', fileName),
    path.join(__dirname, '../public', fileName),
    path.join(process.cwd(), 'public', fileName),
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) || null
}

function createTray(): boolean {
  if (tray) return true

  const iconPath = findAssetPath('tray.png') || findAssetPath('icon.ico') || findAssetPath('icon.png')
  if (!iconPath) {
    console.warn('Tray icon not found; close-to-tray is disabled.')
    return false
  }

  try {
    const image = nativeImage.createFromPath(iconPath)
    if (image.isEmpty()) {
      console.warn(`Tray icon is empty: ${iconPath}`)
      return false
    }

    tray = new Tray(image)
    const contextMenu = Menu.buildFromTemplate([
      { label: '显示窗口', click: () => showMainWindow() },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ])
    tray.setToolTip('BBDown GUI')
    tray.setContextMenu(contextMenu)
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.focus()
        } else {
            showMainWindow()
        }
      }
    })
    return true
  } catch (e) {
    console.error('Failed to create tray:', e)
    tray = null
    return false
  }
}

function showMainWindow(): void {
  mainWindow?.show()
  if (mainWindow?.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow?.focus()
}

function createWindow() {
  createTray()
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 680,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
    backgroundMaterial: 'mica',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    show: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault()
      mainWindow?.hide()
      return false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  if (!ipcInitialized) {
    initIpcHandlers()
    ipcInitialized = true
  }
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
  return mainWindow?.isMaximized() ?? false
})

ipcMain.handle('window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('theme:isDark', () => {
  return nativeTheme.shouldUseDarkColors
})

nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors)
})
