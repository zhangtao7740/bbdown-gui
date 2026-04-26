import { useEffect, useState } from 'react'
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
} from '@fluentui/react-components'
import {
  FolderOpen20Regular,
  Save20Regular,
  ArrowRepeatAll20Regular,
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  Person20Regular,
} from '@fluentui/react-icons'
import { useAppStore } from '@/store/appStore'
import { api } from '@/lib/runtime'

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
  downloadLinks: { marginTop: '4px', display: 'flex', gap: '8px' },
  qrcodeContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
  },
  qrcode: {
    fontFamily: 'monospace',
    whiteSpace: 'pre',
    lineHeight: 1,
    fontSize: '8px',
    backgroundColor: '#fff',
    color: '#000',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid var(--colorNeutralStroke1)',
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
  const { settings, updateSetting, saveSettings, tools, refreshTools } = useAppStore()
  const [saved, setSaved] = useState(false)

  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false)
  const [loginStatus, setLoginStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle')
  const [qrcode, setQrcode] = useState('')
  const [loginError, setLoginError] = useState('')

  useEffect(() => {
    refreshTools()
  }, [refreshTools])

  const handleLogin = async () => {
    setLoginStatus('scanning')
    setQrcode('')
    setLoginError('')

    let isSubscribed = true
    const unsubscribe = api.bbdown.onQRCode((code: string) => {
      if (isSubscribed) {
        setQrcode((prev) => prev + code + '\n')
      }
    })

    try {
      const result = await api.bbdown.login()
      if (isSubscribed) {
        if (result.success) {
          setLoginStatus('success')
          setTimeout(() => {
            if (isSubscribed) setIsLoginDialogOpen(false)
          }, 2000)
        } else {
          setLoginStatus('error')
          setLoginError(result.error || '登录失败')
        }
      }
    } catch (err) {
      if (isSubscribed) {
        setLoginStatus('error')
        setLoginError(err instanceof Error ? err.message : '未知错误')
      }
    } finally {
      isSubscribed = false
      unsubscribe()
    }
  }

  const handleSelectPath = async (settingKey: 'bbdownPath' | 'ffmpegPath' | 'aria2cPath' | 'defaultWorkDir') => {
    const selected = settingKey === 'defaultWorkDir'
      ? await api.util.selectDirectory()
      : await api.util.selectFile([
        { name: 'Executable', extensions: ['exe'] },
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
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <Text size={400} style={{ fontWeight: 600 }}>工具路径</Text>
          <Dialog open={isLoginDialogOpen} onOpenChange={(_, data) => setIsLoginDialogOpen(data.open)}>
            <DialogTrigger disableButtonEnhancement>
              <Button icon={<Person20Regular />} size="small" onClick={() => {
                setIsLoginDialogOpen(true)
                handleLogin()
              }}>
                B站扫码登录
              </Button>
            </DialogTrigger>
            <DialogSurface>
              <DialogBody>
                <DialogTitle>B站扫码登录</DialogTitle>
                <DialogContent>
                  <div className={styles.qrcodeContainer}>
                    {loginStatus === 'scanning' && !qrcode && (
                      <>
                        <Spinner label="正在初始化登录..." />
                        <Text size={200} block className={styles.note}>
                          请稍候，正在获取登录二维码...
                        </Text>
                      </>
                    )}
                    {qrcode && loginStatus === 'scanning' && (
                      <>
                        <div className={styles.qrcode}>{qrcode}</div>
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
                    <Button appearance="secondary">关闭</Button>
                  </DialogTrigger>
                </DialogActions>
              </DialogBody>
            </DialogSurface>
          </Dialog>
        </div>
        <Card>
          <ToolStatusRow name="BBDown" tool={tools.bbdown} />
          <Field label="BBDown 路径">
            <div className={styles.pathRow}>
              <Input
                value={settings.bbdownPath}
                onChange={(_, data) => updateSetting('bbdownPath', data.value || '')}
                style={{ flex: 1 }}
                placeholder="例如: C:\Tools\BBDown.exe"
              />
              <Button icon={<FolderOpen20Regular />} onClick={() => handleSelectPath('bbdownPath')} />
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
              <Input value={settings.ffmpegPath} onChange={(_, data) => updateSetting('ffmpegPath', data.value || '')} style={{ flex: 1 }} />
              <Button icon={<FolderOpen20Regular />} onClick={() => handleSelectPath('ffmpegPath')} />
            </div>
            <div className={styles.downloadLinks}>
              <Text size={100}>下载: </Text>
              <Link href="https://www.gyan.dev/ffmpeg/builds/" target="_blank">FFmpeg (gyan.dev)</Link>
              <Link href="https://github.com/BtbN/FFmpeg-Builds/releases" target="_blank">FFmpeg (GitHub)</Link>
            </div>
          </Field>

          <Divider style={{ margin: '12px 0' }} />

          <ToolStatusRow name="aria2c" tool={tools.aria2c} />
          <Field label="aria2c 路径">
            <div className={styles.pathRow}>
              <Input value={settings.aria2cPath} onChange={(_, data) => updateSetting('aria2cPath', data.value || '')} style={{ flex: 1 }} />
              <Button icon={<FolderOpen20Regular />} onClick={() => handleSelectPath('aria2cPath')} />
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
              <Button icon={<FolderOpen20Regular />} onClick={() => handleSelectPath('defaultWorkDir')} />
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
            后处理现在按每个下载任务配置：在下载页勾选“启用后处理”，再点击“配置后处理”选择视频重封装、视频转码、音频转码或重命名。
          </Text>
          <Text size={200} block className={styles.note}>
            这里不再维护全局规则，避免不同任务共用一套规则导致音频和视频处理互相冲突。
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
