import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Card,
  Text,
  Dropdown,
  Option,
  Field,
  Input,
  Button,
  SpinButton,
  makeStyles,
  Switch,
  Divider,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogContent,
  DialogBody,
  DialogActions,
  Link,
  Spinner,
  Tooltip,
  Badge,
} from '@fluentui/react-components'
import {
  FolderOpen20Regular,
  Save20Regular,
  ArrowRepeatAll20Regular,
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  Person20Regular,
  SignOut20Regular,
} from '@fluentui/react-icons'
import { useAppStore } from '@/store/appStore'
import { api, isRunningInElectron } from '@/lib/runtime'

type AccountStatus = {
  loggedIn: boolean
  path?: string
  updatedAt?: string
}

const useStyles = makeStyles({
  container: { padding: '20px', height: '100%', overflowY: 'auto' },
  section: { marginBottom: '24px' },
  sectionTitle: { marginBottom: '12px', fontWeight: 600 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' },
  toolRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: 'var(--colorNeutralBackground1)',
    borderRadius: '4px',
    marginBottom: '8px',
  },
  toolInfo: { display: 'flex', alignItems: 'center', gap: '8px' },
  toolName: { fontWeight: 500, textTransform: 'uppercase' },
  statusOK: { color: '#107C10' },
  statusError: { color: '#D13438' },
  pathRow: { display: 'flex', gap: '8px' },
  saveButton: { marginTop: '24px' },
  note: { color: 'var(--colorNeutralForeground3)', marginTop: '8px' },
  downloadLinks: { marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' },
  accountRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  accountActions: { display: 'flex', alignItems: 'center', gap: '8px' },
  qrcodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
  },
  qrcode: {
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere',
    lineHeight: 1,
    fontSize: '10px',
    backgroundColor: '#fff',
    color: '#000',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid var(--colorNeutralStroke1)',
    maxWidth: '100%',
  },
  qrcodeImage: {
    width: '280px',
    height: '280px',
    imageRendering: 'pixelated',
    border: '1px solid var(--colorNeutralStroke1)',
    borderRadius: '4px',
  },
})

function ToolStatusRow({ name, tool }: { name: string; tool?: { exists: boolean; version: string; path?: string } }) {
  const styles = useStyles()
  return (
    <div className={styles.toolRow}>
      <div className={styles.toolInfo}>
        <span className={styles.toolName}>{name}</span>
        {tool?.exists ? (
          <CheckmarkCircle20Regular className={styles.statusOK} />
        ) : (
          <DismissCircle20Regular className={styles.statusError} />
        )}
      </div>
      <Text size={200}>{tool?.exists ? `v${tool.version}` : '未检测到'}</Text>
    </div>
  )
}

export function SettingsPage() {
  const styles = useStyles()
  const isElectron = isRunningInElectron()
  const isMac = typeof window !== 'undefined' && window.navigator.platform.toLowerCase().includes('mac')
  const { settings, updateSetting, saveSettings, tools, refreshTools } = useAppStore()
  const [saved, setSaved] = useState(false)
  const [accountStatus, setAccountStatus] = useState<AccountStatus>({ loggedIn: false })

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [loginStatus, setLoginStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [qrcode, setQrcode] = useState('')
  const [loginError, setLoginError] = useState('')
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
    queueMicrotask(() => {
      void refreshAccountStatus()
    })
  }, [refreshTools, refreshAccountStatus])

  const handleLogin = async () => {
    if (!isElectron) return
    if (loginRunningRef.current) return
    loginRunningRef.current = true
    setLoginStatus('scanning')
    setQrcode('')
    setLoginError('')

    loginUnsubscribeRef.current?.()
    loginUnsubscribeRef.current = api.bbdown.onQRCode((code: string) => {
      setQrcode(code)
    })

    try {
      if (settings.bbdownPath.trim()) {
        const tool = await api.util.setToolPath('bbdown', settings.bbdownPath.trim())
        if (!tool.exists) {
          throw new Error(`未检测到 BBDown：${settings.bbdownPath.trim()}`)
        }
      }
      const result = await api.bbdown.login()
      if (result.success) {
        setLoginStatus('success')
        await refreshAccountStatus()
        setTimeout(() => setIsLoginDialogOpen(false), 1600)
      } else {
        setLoginStatus('error')
        setLoginError(result.error || '登录失败')
      }
    } catch (err) {
      setLoginStatus('error')
      setLoginError(err instanceof Error ? err.message : '未知错误')
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
    setLoginStatus('idle')
  }

  const handleLogout = async () => {
    if (!isElectron || !accountStatus.loggedIn) return
    const confirmed = window.confirm('登出会删除 BBDown.data 本地登录凭据。确认继续？')
    if (!confirmed) return
    await api.bbdown.logout()
    await refreshAccountStatus()
  }

  useEffect(() => {
    return () => {
      void cancelLogin()
    }
  }, [])

  const handleSelectPath = async (settingKey: 'bbdownPath' | 'ffmpegPath' | 'aria2cPath' | 'defaultWorkDir') => {
    if (!isElectron) return
    const selected = settingKey === 'defaultWorkDir'
      ? await api.util.selectDirectory()
      : await api.util.selectFile([
        { name: 'Executable', extensions: ['*'] },
        { name: 'All Files', extensions: ['*'] },
      ])

    if (selected) updateSetting(settingKey, selected)
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
    <div className={styles.container}>
      <div className={styles.section}>
        <Text className={styles.sectionTitle} size={400}>账号 / Cookie</Text>
        <Card>
          <div className={styles.accountRow}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text weight="semibold">Bilibili 登录状态</Text>
                <Badge color={accountStatus.loggedIn ? 'success' : 'danger'}>
                  {accountStatus.loggedIn ? '已登录' : '未登录'}
                </Badge>
              </div>
              <Text size={200} block className={styles.note}>
                {accountStatus.loggedIn
                  ? `凭据文件：${accountStatus.path || 'BBDown.data'}`
                  : '登录会调用 BBDown login，GUI 不直接保存账号密码。'}
              </Text>
            </div>
            <div className={styles.accountActions}>
              <Dialog open={isLoginDialogOpen} onOpenChange={(_, data) => {
                setIsLoginDialogOpen(data.open)
                if (!data.open) void cancelLogin()
              }}>
                <DialogTrigger disableButtonEnhancement>
                  <Tooltip content={isElectron ? '调用 BBDown 扫码登录' : '浏览器预览模式不支持扫码登录'} relationship="label">
                    <Button icon={<Person20Regular />} disabled={!isElectron} onClick={() => {
                      setIsLoginDialogOpen(true)
                      void handleLogin()
                    }}>
                      扫码登录
                    </Button>
                  </Tooltip>
                </DialogTrigger>
                <DialogSurface>
                  <DialogBody>
                    <DialogTitle>B站扫码登录</DialogTitle>
                    <DialogContent>
                      <div className={styles.qrcodeContainer}>
                        {loginStatus === 'scanning' && !qrcode && (
                          <>
                            <Spinner label="正在初始化登录..." />
                            <Text size={200} block className={styles.note}>请稍候，正在获取登录二维码...</Text>
                          </>
                        )}
                        {qrcode && loginStatus === 'scanning' && (
                          <>
                            {qrcode.startsWith('data:image/') ? (
                              <img className={styles.qrcodeImage} src={qrcode} alt="Bilibili 登录二维码" />
                            ) : (
                              <div className={styles.qrcode}>{qrcode}</div>
                            )}
                            <Text weight="semibold">请使用 Bilibili 手机客户端扫码</Text>
                          </>
                        )}
                        {loginStatus === 'success' && (
                          <>
                            <CheckmarkCircle20Regular style={{ fontSize: '48px', color: '#107C10' }} />
                            <Text weight="semibold" size={500}>登录成功</Text>
                          </>
                        )}
                        {loginStatus === 'error' && (
                          <>
                            <DismissCircle20Regular style={{ fontSize: '48px', color: '#D13438' }} />
                            <Text weight="semibold">登录失败</Text>
                            <Text size={200} className={styles.statusError}>{loginError}</Text>
                            <Button appearance="primary" onClick={handleLogin}>重试</Button>
                          </>
                        )}
                      </div>
                    </DialogContent>
                    <DialogActions>
                      <DialogTrigger disableButtonEnhancement>
                        <Button appearance="secondary" onClick={() => void cancelLogin()}>关闭</Button>
                      </DialogTrigger>
                    </DialogActions>
                  </DialogBody>
                </DialogSurface>
              </Dialog>
              <Button icon={<SignOut20Regular />} disabled={!isElectron || !accountStatus.loggedIn} onClick={handleLogout}>
                登出
              </Button>
              <Button appearance="subtle" icon={<ArrowRepeatAll20Regular />} disabled={!isElectron} onClick={refreshAccountStatus}>
                刷新
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div className={styles.section}>
        <Text className={styles.sectionTitle} size={400}>工具路径</Text>
        <Card>
          <ToolStatusRow name="BBDown" tool={tools.bbdown} />
          <Field label="BBDown 路径">
            <div className={styles.pathRow}>
              <Input
                value={settings.bbdownPath}
                onChange={(_, data) => updateSetting('bbdownPath', data.value || '')}
                style={{ flex: 1 }}
                placeholder={isMac ? '/Users/zhangtao/Downloads/BBDown' : 'C:\\Tools\\BBDown.exe'}
              />
              <Tooltip content={isElectron ? '选择 BBDown 可执行文件' : '浏览器预览模式不支持原生文件选择'} relationship="label">
                <Button icon={<FolderOpen20Regular />} onClick={() => handleSelectPath('bbdownPath')} disabled={!isElectron} />
              </Tooltip>
            </div>
            <div className={styles.downloadLinks}>
              <Text size={100}>下载: </Text>
              <Link href="https://github.com/nilaoda/BBDown/releases" target="_blank">BBDown GitHub</Link>
            </div>
          </Field>

          <Divider style={{ margin: '12px 0' }} />

          <ToolStatusRow name="FFmpeg" tool={tools.ffmpeg} />
          <Field label="FFmpeg 路径">
            <div className={styles.pathRow}>
              <Input
                value={settings.ffmpegPath}
                onChange={(_, data) => updateSetting('ffmpegPath', data.value || '')}
                style={{ flex: 1 }}
                placeholder={isMac ? '/opt/homebrew/bin/ffmpeg' : 'C:\\Tools\\ffmpeg.exe'}
              />
              <Tooltip content={isElectron ? '选择 ffmpeg 可执行文件' : '浏览器预览模式不支持原生文件选择'} relationship="label">
                <Button icon={<FolderOpen20Regular />} onClick={() => handleSelectPath('ffmpegPath')} disabled={!isElectron} />
              </Tooltip>
            </div>
            <div className={styles.downloadLinks}>
              <Text size={100}>下载: </Text>
              <Link href="https://formulae.brew.sh/formula/ffmpeg" target="_blank">Homebrew</Link>
              <Link href="https://www.gyan.dev/ffmpeg/builds/" target="_blank">FFmpeg (gyan.dev)</Link>
              <Link href="https://github.com/BtbN/FFmpeg-Builds/releases" target="_blank">FFmpeg (GitHub)</Link>
            </div>
          </Field>

          <Divider style={{ margin: '12px 0' }} />

          <ToolStatusRow name="aria2c" tool={tools.aria2c} />
          <Field label="aria2c 路径">
            <div className={styles.pathRow}>
              <Input
                value={settings.aria2cPath}
                onChange={(_, data) => updateSetting('aria2cPath', data.value || '')}
                style={{ flex: 1 }}
                placeholder={isMac ? '/opt/homebrew/bin/aria2c' : 'C:\\Tools\\aria2c.exe'}
              />
              <Tooltip content={isElectron ? '选择 aria2c 可执行文件' : '浏览器预览模式不支持原生文件选择'} relationship="label">
                <Button icon={<FolderOpen20Regular />} onClick={() => handleSelectPath('aria2cPath')} disabled={!isElectron} />
              </Tooltip>
            </div>
            <div className={styles.downloadLinks}>
              <Text size={100}>下载: </Text>
              <Link href="https://github.com/aria2/aria2/releases" target="_blank">aria2 GitHub</Link>
            </div>
          </Field>

          <Button appearance="subtle" icon={<ArrowRepeatAll20Regular />} onClick={refreshTools} style={{ marginTop: '12px' }}>
            重新检测工具
          </Button>
        </Card>
      </div>

      <div className={styles.section}>
        <Text className={styles.sectionTitle} size={400}>下载设置</Text>
        <Card className={styles.grid}>
          <Field label="默认下载目录">
            <div className={styles.pathRow}>
              <Input value={settings.defaultWorkDir} onChange={(_, data) => updateSetting('defaultWorkDir', data.value || '')} style={{ flex: 1 }} />
              <Tooltip content={isElectron ? '选择默认下载目录' : '浏览器预览模式不支持原生目录选择'} relationship="label">
                <Button icon={<FolderOpen20Regular />} onClick={() => handleSelectPath('defaultWorkDir')} disabled={!isElectron} />
              </Tooltip>
            </div>
          </Field>
          <Field label="最大同时下载数">
            <SpinButton value={settings.maxConcurrent} onChange={(_, data) => updateSetting('maxConcurrent', parseInt(String(data.value || '2'), 10))} min={1} max={10} />
          </Field>
        </Card>
      </div>

      <div className={styles.section}>
        <Text className={styles.sectionTitle} size={400}>后处理</Text>
        <Card>
          <Text size={200} block>
            后处理现在放在历史记录里的具体产物上执行。下载页只负责解析、选择产物和下载；历史页负责重命名、移动、转封装和转码。
          </Text>
          <Text size={200} block className={styles.note}>
            这样可以避免不同下载任务共享同一套全局规则，也能按视频、音频、字幕、弹幕、封面分别提供合适操作。
          </Text>
        </Card>
      </div>

      <div className={styles.section}>
        <Text className={styles.sectionTitle} size={400}>外观设置</Text>
        <Card className={styles.grid}>
          <Field label="主题">
            <Dropdown
              value={settings.theme === 'system' ? '跟随系统' : settings.theme === 'light' ? '浅色' : '深色'}
              onOptionSelect={(_, data) => updateSetting('theme', data.optionValue as 'system' | 'light' | 'dark')}
            >
              <Option value="system">跟随系统</Option>
              <Option value="light">浅色</Option>
              <Option value="dark">深色</Option>
            </Dropdown>
          </Field>
        </Card>
      </div>

      <div className={styles.section}>
        <Text className={styles.sectionTitle} size={400}>系统设置</Text>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>启用通知</Text>
              <Switch checked={settings.notificationEnabled} onChange={(_, data) => updateSetting('notificationEnabled', data.checked ?? false)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>自动检查更新</Text>
              <Switch checked={settings.autoCheckUpdate} onChange={(_, data) => updateSetting('autoCheckUpdate', data.checked ?? false)} />
            </div>
          </div>
        </Card>
      </div>

      <Button appearance="primary" icon={<Save20Regular />} onClick={handleSave} className={styles.saveButton}>
        {saved ? '已保存' : '保存设置'}
      </Button>
    </div>
  )
}
