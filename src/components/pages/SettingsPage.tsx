import { useCallback, useEffect, useState, useRef } from 'react'
import { FolderOpen, Save, RotateCw, CheckCircle2, XCircle, User, LogOut } from 'lucide-react'
import { Button, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Switch, Tooltip, Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, ContextMenu } from '@/components/ui'
import { AUTO_SELECT_VALUE, normalizeSelectValue, useAppStore } from '@/store/appStore'
import { api, isRunningInElectron } from '@/lib/runtime'
import './SettingsPage.css'

type AccountStatus = { loggedIn: boolean; path?: string; updatedAt?: string }
type ToolPathSetting = 'bbdownPath' | 'ffmpegPath' | 'aria2cPath' | 'defaultWorkDir'

function ToolStatusRow({ name, tool }: { name: string; tool?: { exists: boolean; version: string; path?: string } }) {
  return (
    <div className="settings-tool-row">
      <div className="settings-tool-info">
        <span className="settings-tool-name">{name}</span>
        {tool?.exists ? <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} /> : <XCircle size={16} style={{ color: 'var(--color-danger)' }} />}
      </div>
      <span className="settings-tool-version">{tool?.exists ? `v${tool.version}` : '未检测到'}</span>
    </div>
  )
}

export function SettingsPage() {
  const isElectron = isRunningInElectron()
  const { settings, updateSetting, saveSettings, tools, refreshTools } = useAppStore()
  const [saved, setSaved] = useState(false)
  const [accountStatus, setAccountStatus] = useState<AccountStatus>({ loggedIn: false })
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [loginStatus, setLoginStatus] = useState<'idle' | 'scanning' | 'success' | 'error' | 'cancelled'>('idle')
  const [qrcode, setQrcode] = useState('')
  const [loginError, setLoginError] = useState('')
  const [logoutOpen, setLogoutOpen] = useState(false)
  const loginUnsubscribeRef = useRef<(() => void) | null>(null)
  const loginRunningRef = useRef(false)

  const refreshAccountStatus = useCallback(async () => {
    if (!isElectron) {
      setAccountStatus({ loggedIn: false })
      return
    }
    setAccountStatus(await api.bbdown.accountStatus())
  }, [isElectron])

  useEffect(() => {
    refreshTools()
    queueMicrotask(() => { void refreshAccountStatus() })
  }, [refreshTools, refreshAccountStatus])

  const handleLogin = async () => {
    if (!isElectron || loginRunningRef.current) return
    loginRunningRef.current = true
    setLoginStatus('scanning')
    setQrcode('')
    setLoginError('')

    loginUnsubscribeRef.current = api.bbdown.onQRCode((code: string) => {
      setQrcode(code)
    })

    try {
      const result = await api.bbdown.login()
      if (result.success) {
        setLoginStatus('success')
        await refreshAccountStatus()
        setTimeout(() => setIsLoginDialogOpen(false), 1600)
      } else {
        setLoginStatus('error')
        setLoginError(result.error || '登录失败')
      }
    } catch {
      setLoginStatus('error')
      setLoginError('登录失败')
    } finally {
      loginRunningRef.current = false
      loginUnsubscribeRef.current?.()
      loginUnsubscribeRef.current = null
    }
  }

  const cancelLogin = async () => {
    await api.bbdown.cancelLogin()
    loginRunningRef.current = false
    loginUnsubscribeRef.current?.()
    loginUnsubscribeRef.current = null
    setQrcode('')
    setLoginError('')
    setLoginStatus('cancelled')
  }

  const handleLogout = async () => {
    if (!isElectron || !accountStatus.loggedIn) return
    await api.bbdown.logout()
    setLogoutOpen(false)
    await refreshAccountStatus()
  }

  const handleSelectPath = async (settingKey: ToolPathSetting) => {
    if (!isElectron) return
    const selected = settingKey === 'defaultWorkDir'
      ? await api.util.selectDirectory()
      : await api.util.selectFile([{ name: 'Executable', extensions: ['*'] }])
    if (selected) updateSetting(settingKey, selected)
  }

  const pastePath = async (settingKey: ToolPathSetting) => {
    updateSetting(settingKey, await navigator.clipboard.readText())
  }

  const handleSave = async () => {
    await saveSettings()
    if (settings.bbdownPath) await api.util.setToolPath('bbdown', settings.bbdownPath)
    if (settings.ffmpegPath) await api.util.setToolPath('ffmpeg', settings.ffmpegPath)
    if (settings.aria2cPath) await api.util.setToolPath('aria2c', settings.aria2cPath)
    await api.task.setMaxConcurrent(settings.maxConcurrent)
    await refreshTools()
    await refreshAccountStatus()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-page">
      <div className="settings-section">
        <div className="settings-section-title">账号 / Cookie</div>
        <div className="settings-card">
          <ContextMenu
            items={[
              { label: '扫码登录', onSelect: () => { setIsLoginDialogOpen(true); void handleLogin() }, disabled: !isElectron },
              { label: '刷新状态', onSelect: refreshAccountStatus, disabled: !isElectron },
              { label: '退出登录', onSelect: () => setLogoutOpen(true), disabled: !isElectron || !accountStatus.loggedIn, danger: true },
            ]}
          >
            <div className="settings-account-row">
            <div className="settings-account-info">
              <div className="settings-account-status">
                <span style={{ fontWeight: 500 }}>Bilibili 登录状态</span>
                <Badge variant={accountStatus.loggedIn ? 'success' : 'danger'}>
                  {accountStatus.loggedIn ? '已登录' : '未登录'}
                </Badge>
              </div>
              <div className="settings-account-note">
                {accountStatus.loggedIn ? `凭据文件：${accountStatus.path || 'BBDown.data'}` : '登录会调用 BBDown login，GUI 不直接保存账号密码。'}
              </div>
            </div>
            <div className="settings-account-actions">
              <Tooltip content={isElectron ? '调用 BBDown 扫码登录' : '浏览器预览模式不支持扫码登录'}>
                <Button variant="ghost" disabled={!isElectron} onClick={() => { setIsLoginDialogOpen(true); void handleLogin() }}>
                  <User size={16} />
                  <span>扫码登录</span>
                </Button>
              </Tooltip>
              <Button variant="ghost" disabled={!isElectron || !accountStatus.loggedIn} onClick={() => setLogoutOpen(true)}>
                <LogOut size={16} />
                <span>登出</span>
              </Button>
              <Button variant="ghost" disabled={!isElectron} onClick={refreshAccountStatus}>
                <RotateCw size={16} />
              </Button>
            </div>
            </div>
          </ContextMenu>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">工具路径</div>
        <div className="settings-card">
          <ToolStatusRow name="BBDown" tool={tools.bbdown} />
          <div className="settings-field">
            <label className="settings-label">BBDown 路径</label>
            <ContextMenu
              items={[
                { label: '粘贴路径', onSelect: () => pastePath('bbdownPath') },
                { label: '清空', onSelect: () => updateSetting('bbdownPath', '') },
                { label: '选择文件', onSelect: () => handleSelectPath('bbdownPath'), disabled: !isElectron },
                { label: '重新检测', onSelect: refreshTools },
              ]}
            >
              <div className="settings-path-row">
              <input
                className="settings-input settings-path-input"
                value={settings.bbdownPath}
                onChange={(e) => updateSetting('bbdownPath', e.target.value || '')}
                placeholder="选择 BBDown 可执行文件路径"
              />
              <Tooltip content={isElectron ? '选择 BBDown 可执行文件' : '浏览器预览模式不支持原生文件选择'}>
                <Button variant="ghost" onClick={() => handleSelectPath('bbdownPath')} disabled={!isElectron}>
                  <FolderOpen size={16} />
                </Button>
              </Tooltip>
              </div>
            </ContextMenu>
          </div>

          <div className="settings-divider" />

          <ToolStatusRow name="FFmpeg" tool={tools.ffmpeg} />
          <div className="settings-field">
            <label className="settings-label">FFmpeg 路径</label>
            <ContextMenu
              items={[
                { label: '粘贴路径', onSelect: () => pastePath('ffmpegPath') },
                { label: '清空', onSelect: () => updateSetting('ffmpegPath', '') },
                { label: '选择文件', onSelect: () => handleSelectPath('ffmpegPath'), disabled: !isElectron },
                { label: '重新检测', onSelect: refreshTools },
              ]}
            >
              <div className="settings-path-row">
              <input
                className="settings-input settings-path-input"
                value={settings.ffmpegPath}
                onChange={(e) => updateSetting('ffmpegPath', e.target.value || '')}
                placeholder="选择 FFmpeg 可执行文件路径"
              />
              <Tooltip content={isElectron ? '选择 FFmpeg 可执行文件' : '浏览器预览模式不支持原生文件选择'}>
                <Button variant="ghost" onClick={() => handleSelectPath('ffmpegPath')} disabled={!isElectron}>
                  <FolderOpen size={16} />
                </Button>
              </Tooltip>
              </div>
            </ContextMenu>
          </div>

          <div className="settings-divider" />

          <ToolStatusRow name="aria2c" tool={tools.aria2c} />
          <div className="settings-field">
            <label className="settings-label">aria2c 路径</label>
            <ContextMenu
              items={[
                { label: '粘贴路径', onSelect: () => pastePath('aria2cPath') },
                { label: '清空', onSelect: () => updateSetting('aria2cPath', '') },
                { label: '选择文件', onSelect: () => handleSelectPath('aria2cPath'), disabled: !isElectron },
                { label: '重新检测', onSelect: refreshTools },
              ]}
            >
              <div className="settings-path-row">
              <input
                className="settings-input settings-path-input"
                value={settings.aria2cPath}
                onChange={(e) => updateSetting('aria2cPath', e.target.value || '')}
                placeholder="选择 aria2c 可执行文件路径（可选）"
              />
              <Tooltip content={isElectron ? '选择 aria2c 可执行文件' : '浏览器预览模式不支持原生文件选择'}>
                <Button variant="ghost" onClick={() => handleSelectPath('aria2cPath')} disabled={!isElectron}>
                  <FolderOpen size={16} />
                </Button>
              </Tooltip>
              </div>
            </ContextMenu>
          </div>

          <Button variant="ghost" onClick={refreshTools} style={{ marginTop: '12px' }}>
            <RotateCw size={16} />
            <span>重新检测工具</span>
          </Button>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">下载默认值</div>
        <div className="settings-card">
          <div className="settings-grid">
            <div className="settings-field">
              <label className="settings-label">默认下载目录</label>
              <ContextMenu
                items={[
                  { label: '粘贴路径', onSelect: () => pastePath('defaultWorkDir') },
                  { label: '清空', onSelect: () => updateSetting('defaultWorkDir', '') },
                  { label: '选择目录', onSelect: () => handleSelectPath('defaultWorkDir'), disabled: !isElectron },
                ]}
              >
                <div className="settings-path-row">
                <input
                  className="settings-input settings-path-input"
                  value={settings.defaultWorkDir}
                  onChange={(e) => updateSetting('defaultWorkDir', e.target.value || '')}
                  placeholder="选择默认下载目录"
                />
                <Tooltip content={isElectron ? '选择默认下载目录' : '浏览器预览模式不支持原生目录选择'}>
                  <Button variant="ghost" onClick={() => handleSelectPath('defaultWorkDir')} disabled={!isElectron}>
                    <FolderOpen size={16} />
                  </Button>
                </Tooltip>
                </div>
              </ContextMenu>
            </div>
            <div className="settings-field">
              <label className="settings-label">最大同时下载数</label>
              <input
                type="number"
                className="settings-input"
                value={settings.maxConcurrent}
                onChange={(e) => updateSetting('maxConcurrent', parseInt(e.target.value || '2', 10))}
                min={1}
                max={10}
              />
            </div>
            <div className="settings-field">
              <label className="settings-label">默认清晰度</label>
              <Select value={settings.defaultQuality || ''} onValueChange={(value) => updateSetting('defaultQuality', normalizeSelectValue(value))}>
                <SelectTrigger style={{ width: '100%' }}><SelectValue placeholder="自动" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={AUTO_SELECT_VALUE}>自动</SelectItem>
                  <SelectItem value="8K 超高清">8K 超高清</SelectItem>
                  <SelectItem value="4K 超清">4K 超清</SelectItem>
                  <SelectItem value="1080P 高码">1080P 高码</SelectItem>
                  <SelectItem value="1080P">1080P</SelectItem>
                  <SelectItem value="720P">720P</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="settings-field">
              <label className="settings-label">默认附加资源</label>
              <div className="settings-inline-switches">
                <label className="settings-mini-switch-row">
                  <span className="settings-mini-switch-label">字幕</span>
                  <Switch checked={settings.defaultDownloadSubtitle ?? true} onCheckedChange={(checked) => updateSetting('defaultDownloadSubtitle', !!checked)} />
                </label>
                <label className="settings-mini-switch-row">
                  <span className="settings-mini-switch-label">弹幕</span>
                  <Switch checked={settings.defaultDownloadDanmaku ?? true} onCheckedChange={(checked) => updateSetting('defaultDownloadDanmaku', !!checked)} />
                </label>
                <label className="settings-mini-switch-row">
                  <span className="settings-mini-switch-label">封面</span>
                  <Switch checked={settings.defaultDownloadCover ?? false} onCheckedChange={(checked) => updateSetting('defaultDownloadCover', !!checked)} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">后处理默认值</div>
        <div className="settings-card">
          <div className="settings-grid">
            <div className="settings-field">
              <label className="settings-label">默认容器</label>
              <Select value={settings.defaultContainer || 'mp4'} onValueChange={(value) => updateSetting('defaultContainer', value)}>
                <SelectTrigger style={{ width: '100%' }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp4">MP4</SelectItem>
                  <SelectItem value="mkv">MKV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="settings-field">
              <label className="settings-label">音频转码</label>
              <Select value={settings.defaultAudioTranscode || 'copy'} onValueChange={(value) => updateSetting('defaultAudioTranscode', value)}>
                <SelectTrigger style={{ width: '100%' }}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="copy">不转码（复制）</SelectItem>
                  <SelectItem value="aac">AAC</SelectItem>
                  <SelectItem value="mp3">MP3</SelectItem>
                  <SelectItem value="flac">FLAC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="settings-field">
              <label className="settings-label">保留策略</label>
              <label className="settings-control-switch-row">
                <span className="settings-switch-label">保留源文件</span>
                <Switch checked={settings.keepSourceFile ?? true} onCheckedChange={(checked) => updateSetting('keepSourceFile', !!checked)} />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">外观设置</div>
        <div className="settings-card">
          <div className="settings-field">
            <label className="settings-label">主题</label>
            <Select value={settings.theme} onValueChange={(value) => updateSetting('theme', value as 'system' | 'light' | 'dark')}>
              <SelectTrigger style={{ width: '100%' }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system">跟随系统</SelectItem>
                <SelectItem value="light">浅色</SelectItem>
                <SelectItem value="dark">深色</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-section-title">系统设置</div>
        <div className="settings-card">
          <div className="settings-switch-row">
            <span className="settings-switch-label">启用通知</span>
            <Switch checked={settings.notificationEnabled} onCheckedChange={(checked) => updateSetting('notificationEnabled', !!checked)} />
          </div>
          <div className="settings-switch-row">
            <span className="settings-switch-label">启动时检查更新</span>
            <Switch checked={settings.autoCheckUpdate} onCheckedChange={(checked) => updateSetting('autoCheckUpdate', !!checked)} />
          </div>
          <div className="settings-switch-row">
            <span className="settings-switch-label">关闭时最小化到托盘</span>
            <Switch checked={settings.closeToTray} onCheckedChange={(checked) => updateSetting('closeToTray', !!checked)} />
          </div>
          <div className="settings-switch-row">
            <span className="settings-switch-label">最小化到托盘</span>
            <Switch checked={settings.minimizeToTray} onCheckedChange={(checked) => updateSetting('minimizeToTray', !!checked)} />
          </div>
        </div>
      </div>

      <Button variant="primary" onClick={handleSave} className="settings-save-button">
        <Save size={16} />
        <span>{saved ? '已保存' : '保存设置'}</span>
      </Button>

      <Dialog open={isLoginDialogOpen} onOpenChange={(open) => { setIsLoginDialogOpen(open); if (!open) void cancelLogin() }}>
        <DialogContent style={{ maxWidth: '400px' }}>
          <DialogHeader><DialogTitle>B站扫码登录</DialogTitle></DialogHeader>
          <DialogBody>
            {loginStatus === 'scanning' && !qrcode && <div style={{ textAlign: 'center', padding: '40px' }}>正在初始化登录...</div>}
            {qrcode && loginStatus === 'scanning' && (
              <div style={{ textAlign: 'center' }}>
                {qrcode.startsWith('data:image/') ? (
                  <img src={qrcode} alt="Bilibili 登录二维码" style={{ width: '280px', height: '280px' }} />
                ) : (
                  <div style={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '10px', padding: '10px' }}>{qrcode}</div>
                )}
                <p style={{ marginTop: '16px' }}>请使用 Bilibili 手机客户端扫码</p>
              </div>
            )}
            {loginStatus === 'success' && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <CheckCircle2 size={48} style={{ color: 'var(--color-success)' }} />
                <p style={{ marginTop: '16px', fontWeight: 500 }}>登录成功</p>
              </div>
            )}
            {loginStatus === 'error' && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <XCircle size={48} style={{ color: 'var(--color-danger)' }} />
                <p style={{ marginTop: '16px', fontWeight: 500 }}>登录失败</p>
                <p style={{ color: 'var(--color-danger)', marginTop: '8px' }}>{loginError}</p>
                <Button variant="primary" onClick={handleLogin} style={{ marginTop: '16px' }}>重试</Button>
              </div>
            )}
            {loginStatus === 'cancelled' && (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <XCircle size={48} style={{ color: 'var(--color-text-muted)' }} />
                <p style={{ marginTop: '16px', fontWeight: 500, color: 'var(--color-text-muted)' }}>已取消登录</p>
                <Button variant="primary" onClick={handleLogin} style={{ marginTop: '16px' }}>重新登录</Button>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setIsLoginDialogOpen(false); void cancelLogin() }}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent style={{ maxWidth: '400px' }}>
          <DialogHeader><DialogTitle>确认登出</DialogTitle></DialogHeader>
          <DialogBody>
            <p>登出会删除 BBDown.data 本地登录凭据。确认继续？</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLogoutOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleLogout}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
