import { useEffect, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dropdown,
  Field,
  Image,
  Input,
  Option,
  Text,
  Tooltip,
  makeStyles,
} from '@fluentui/react-components'
import {
  ArrowDownload20Regular,
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  FolderOpen20Regular,
  Person20Regular,
  Search20Regular,
} from '@fluentui/react-icons'
import { api, isRunningInElectron } from '@/lib/runtime'
import { useAppStore } from '@/store/appStore'

const useStyles = makeStyles({
  container: { padding: '20px', height: '100%', overflowY: 'auto' },
  inputSection: { display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'flex-end' },
  inputWrapper: { flex: 1 },
  buttonGroup: { display: 'flex', gap: '8px' },
  contentGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' },
  previewCard: { marginBottom: '20px' },
  previewHeader: { display: 'flex', gap: '16px' },
  previewCover: { width: '168px', minWidth: '168px', height: '104px', objectFit: 'cover', borderRadius: '6px', backgroundColor: 'var(--colorNeutralBackground3)' },
  previewInfo: { flex: 1, minWidth: 0 },
  previewTitle: { display: 'block', fontWeight: 600, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  previewMeta: { display: 'flex', gap: '12px', flexWrap: 'wrap', color: 'var(--colorNeutralForeground3)' },
  pageGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', maxHeight: '180px', overflowY: 'auto', marginTop: '12px' },
  pageItem: { display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' },
  pageInfo: { flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  taskItem: { marginBottom: '8px' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '2px 8px', borderRadius: '10px' },
  logPanel: { maxHeight: '160px', overflowY: 'auto', marginTop: '8px', padding: '6px', backgroundColor: 'var(--colorNeutralBackground3)', borderRadius: '4px', fontSize: '11px', fontFamily: 'Consolas, monospace' },
  logLine: { display: 'flex', gap: '8px', padding: '1px 0' },
  logTime: { color: 'var(--colorNeutralForeground4)', minWidth: '64px' },
  logSource: { minWidth: '44px' },
  logErr: { color: '#D13438' },
  sidebarCard: { marginBottom: '16px' },
  toolRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' },
  toolStatus: { display: 'flex', alignItems: 'center', gap: '6px' },
  pathRow: { display: 'flex', gap: '8px' },
  errorList: { marginBottom: '12px', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--colorPaletteRedBackground1)', color: 'var(--colorPaletteRedForeground1)' },
  browserBanner: { marginBottom: '12px', padding: '10px 12px', borderRadius: '6px', backgroundColor: 'var(--colorPaletteYellowBackground2)' },
})

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}


export function DownloadPage() {
  const styles = useStyles()
  const isElectron = isRunningInElectron()
  const {
    urlInput,
    setUrlInput,
    isParsing,
    parseUrl,
    parsedVideoInfo,
    startDownload,
    tools,
    refreshTools,
    settings,
    updateSetting,
    saveSettings,
    downloadOptions,
    updateDownloadOption,
  } = useAppStore()
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    refreshTools()
  }, [refreshTools])

  const handleParse = async () => {
    if (!urlInput.trim()) return
    try {
      await parseUrl(urlInput.trim())
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : '解析失败'])
    }
  }

  const handleDownload = async () => {
    if (!urlInput.trim() || !parsedVideoInfo) return
    const errors = validateBeforeDownload()
    setValidationErrors(errors)
    if (errors.length > 0) return

    try {
      await startDownload(urlInput.trim(), parsedVideoInfo.title)
    } catch (error) {
      setValidationErrors([error instanceof Error ? error.message : '添加任务失败'])
    }
  }

  const validateBeforeDownload = () => {
    const errors: string[] = []
    if (!tools.bbdown?.exists) errors.push('未检测到 BBDown，请在“设置”页配置其路径。')
    if (!downloadOptions.workDir?.trim()) errors.push('请先选择保存目录。')
    if (downloadOptions.videoOnly && downloadOptions.audioOnly) errors.push('“仅视频”和“仅音频”不能同时启用。')
    if (!parsedVideoInfo) errors.push('请先解析视频信息。')
    if (parsedVideoInfo && parsedVideoInfo.pages?.length > 0 && downloadOptions.selectedPages.length === 0) errors.push('至少选择一个分 P。')
    if (downloadOptions.useAria2c && !tools.aria2c?.exists) errors.push('已启用 aria2c，但未检测到 aria2c。')
    return errors
  }

  const handleSelectWorkDir = async () => {
    if (!isElectron) return
    const selected = await api.util.selectDirectory()
    if (selected) {
      updateDownloadOption('workDir', selected)
      // 如果没有默认下载目录，提示用户是否保存为默认
      if (!settings.defaultWorkDir) {
        updateSetting('defaultWorkDir', selected)
        await saveSettings()
      }
    }
  }

  const handleSelectTool = async (toolName: 'bbdown' | 'ffmpeg' | 'aria2c') => {
    if (!isElectron) return
    const selected = await api.util.selectFile([
      { name: 'Executable', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] },
    ])
    if (!selected) return

    updateSetting(toolName === 'bbdown' ? 'bbdownPath' : toolName === 'ffmpeg' ? 'ffmpegPath' : 'aria2cPath', selected)
    await api.util.setToolPath(toolName, selected)
    await saveSettings()
    await refreshTools()
  }

  const togglePage = (pageNumber: number) => {
    const current = downloadOptions.selectedPages
    updateDownloadOption('selectedPages', current.includes(pageNumber) ? current.filter((page) => page !== pageNumber) : [...current, pageNumber])
  }


  return (
    <div className={styles.container}>
      {!isElectron && (
        <div className={styles.browserBanner}>
          <Text size={200}>浏览器预览模式：只能查看界面示例，真实解析、下载、扫描和后处理请在 Electron 窗口中运行。</Text>
        </div>
      )}

      {validationErrors.length > 0 && (
        <div className={styles.errorList}>
          {validationErrors.map((error) => <Text key={error} size={200} block>{error}</Text>)}
        </div>
      )}

      <div className={styles.inputSection}>
        <div className={styles.inputWrapper}>
          <Field label="视频链接或 BV 号">
            <Input
              value={urlInput}
              onChange={(_, data) => setUrlInput(data.value)}
              placeholder="输入 Bilibili URL 或 BV 号"
              contentBefore={<Search20Regular />}
              disabled={isParsing}
              onKeyDown={(event) => { if (event.key === 'Enter') void handleParse() }}
            />
          </Field>
        </div>
        <div className={styles.buttonGroup}>
          <Button appearance="primary" onClick={handleParse} disabled={isParsing || !urlInput.trim()}>
            {isParsing ? '解析中...' : '解析'}
          </Button>
          <Button appearance="primary" onClick={handleDownload} disabled={!parsedVideoInfo} icon={<ArrowDownload20Regular />}>
            开始下载
          </Button>
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div>
          {parsedVideoInfo && (
            <Card className={styles.previewCard}>
              <div className={styles.previewHeader}>
                {parsedVideoInfo.cover ? (
                  <a href={parsedVideoInfo.cover} target="_blank" rel="noreferrer">
                    <Image className={styles.previewCover} src={parsedVideoInfo.cover} alt={parsedVideoInfo.title} />
                  </a>
                ) : (
                  <div className={styles.previewCover} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text size={200} style={{ color: 'var(--colorNeutralForeground3)' }}>无封面</Text>
                  </div>
                )}
                <div className={styles.previewInfo}>
                  <Text className={styles.previewTitle} size={500}>{parsedVideoInfo.title}</Text>
                  <div className={styles.previewMeta}>
                    {parsedVideoInfo.up && <span><Person20Regular /> {parsedVideoInfo.up.name}</span>}
                    {parsedVideoInfo.bvid && <span>{parsedVideoInfo.bvid}</span>}
                    {parsedVideoInfo.duration > 0 && <span>{formatDuration(parsedVideoInfo.duration)}</span>}
                    {parsedVideoInfo.partition && <span>{parsedVideoInfo.partition}</span>}
                  </div>
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <Button appearance="primary" icon={<ArrowDownload20Regular />} onClick={handleDownload} disabled={downloadOptions.selectedPages.length === 0}>
                      开始下载 ({downloadOptions.selectedPages.length} 个分 P)
                    </Button>
                    {parsedVideoInfo.pages?.length > 1 && (
                      <>
                        <Badge appearance="filled" color="brand" size="small">已选 {downloadOptions.selectedPages.length}/{parsedVideoInfo.pages.length} P</Badge>
                        <Button size="small" appearance="subtle" onClick={() => updateDownloadOption('selectedPages', parsedVideoInfo.pages.map((p) => p.pageNumber))}>全选</Button>
                        <Button size="small" appearance="subtle" onClick={() => updateDownloadOption('selectedPages', [])}>全不选</Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {parsedVideoInfo.pages?.length > 1 && (
                <div className={styles.pageGrid}>
                  {parsedVideoInfo.pages.map((page) => (
                    <div
                      key={page.pageNumber}
                      className={styles.pageItem}
                      onClick={() => togglePage(page.pageNumber)}
                      style={{ backgroundColor: downloadOptions.selectedPages.includes(page.pageNumber) ? 'var(--colorBrandBackground2)' : 'transparent' }}
                    >
                      <Checkbox checked={downloadOptions.selectedPages.includes(page.pageNumber)} onChange={() => togglePage(page.pageNumber)} />
                      <span className={styles.pageInfo}>P{page.pageNumber} {page.title}</span>
                      <Text size={100}>{formatDuration(page.duration)}</Text>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {!parsedVideoInfo && (
            <Card style={{ padding: '60px', textAlign: 'center', color: 'var(--colorNeutralForeground3)' }}>
              <Search20Regular style={{ fontSize: '48px', marginBottom: '16px' }} />
              <Text size={400} block>解析视频信息</Text>
              <Text size={200}>在上方输入框输入 B 站视频链接并点击解析</Text>
            </Card>
          )}
        </div>

        <div>
          <Card className={styles.sidebarCard}>
            <Text weight="semibold" block style={{ marginBottom: '12px' }}>工具状态</Text>
            {(['bbdown', 'ffmpeg', 'aria2c'] as const).map((toolName) => (
              <div className={styles.toolRow} key={toolName}>
                <div className={styles.toolStatus}>
                  <Text weight="semibold">{toolName === 'bbdown' ? 'BBDown' : toolName === 'ffmpeg' ? 'FFmpeg' : 'aria2c'}</Text>
                  {tools[toolName]?.exists ? <CheckmarkCircle20Regular style={{ color: '#107C10' }} /> : <DismissCircle20Regular style={{ color: '#D13438' }} />}
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Text size={200}>{tools[toolName]?.exists ? `v${tools[toolName].version}` : toolName === 'aria2c' ? '可选' : '未检测到'}</Text>
                  <Tooltip content={isElectron ? '手动选择执行文件' : '浏览器预览模式不支持原生文件选择'} relationship="label">
                    <Button appearance="subtle" size="small" icon={<FolderOpen20Regular />} onClick={() => handleSelectTool(toolName)} disabled={!isElectron} />
                  </Tooltip>
                </div>
              </div>
            ))}
            {(settings.bbdownPath || settings.ffmpegPath || settings.aria2cPath) && (
              <Text size={100} block style={{ color: 'var(--colorNeutralForeground3)', marginTop: '6px' }}>
                已保存手动路径，检测会优先使用这些路径。
              </Text>
            )}
          </Card>

          <Card className={styles.sidebarCard}>
            <Text weight="semibold" block style={{ marginBottom: '12px' }}>下载选项</Text>
            <Field label="保存到">
              <div className={styles.pathRow}>
                <Input value={downloadOptions.workDir} onChange={(_, data) => updateDownloadOption('workDir', data.value)} style={{ flex: 1 }} />
                <Tooltip content={isElectron ? '选择保存目录' : '浏览器预览模式不支持原生目录选择'} relationship="label">
                  <Button icon={<FolderOpen20Regular />} onClick={handleSelectWorkDir} disabled={!isElectron} />
                </Tooltip>
              </div>
            </Field>
            <Field label="API 模式">
              <Dropdown
                value={downloadOptions.apiMode === 'web' ? '网页端' : downloadOptions.apiMode === 'tv' ? 'TV 端' : downloadOptions.apiMode === 'app' ? 'APP 端' : '国际版'}
                onOptionSelect={(_, data) => updateDownloadOption('apiMode', data.optionValue as 'web' | 'tv' | 'app' | 'intl')}
              >
                <Option value="web">网页端</Option>
                <Option value="tv">TV 端</Option>
                <Option value="app">APP 端</Option>
                <Option value="intl">国际版</Option>
              </Dropdown>
            </Field>
            <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <Checkbox label="下载弹幕" checked={downloadOptions.downloadDanmaku} onChange={(_, data) => updateDownloadOption('downloadDanmaku', Boolean(data.checked))} />
              <Checkbox label="下载字幕" checked={downloadOptions.downloadSubtitle} onChange={(_, data) => updateDownloadOption('downloadSubtitle', Boolean(data.checked))} />
              <Checkbox label="下载封面" checked={downloadOptions.downloadCover} onChange={(_, data) => updateDownloadOption('downloadCover', Boolean(data.checked))} />
              <Checkbox label="仅视频" checked={downloadOptions.videoOnly} onChange={(_, data) => updateDownloadOption('videoOnly', Boolean(data.checked))} />
              <Checkbox label="仅音频" checked={downloadOptions.audioOnly} onChange={(_, data) => updateDownloadOption('audioOnly', Boolean(data.checked))} />
              <Checkbox label="使用 aria2c" checked={downloadOptions.useAria2c} onChange={(_, data) => updateDownloadOption('useAria2c', Boolean(data.checked))} />
              <Checkbox label="跳过 AI 字幕" checked={downloadOptions.skipAI} onChange={(_, data) => updateDownloadOption('skipAI', Boolean(data.checked))} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
