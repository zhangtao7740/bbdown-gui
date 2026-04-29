import { useEffect, useState } from 'react'
import { Search, User, FolderOpen, CheckCircle2, XCircle, ChevronDown, ChevronRight, Calendar } from 'lucide-react'
import { Button, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Tooltip, Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, ContextMenu } from '@/components/ui'
import { api, isRunningInElectron } from '@/lib/runtime'
import { useAppStore } from '@/store/appStore'
import type { ToolInfo } from '@/store/appStore'
import type { VideoInfo, VideoPage } from '../../../electron/core/types'
import emptyDownloadAsset from '@/assets/empty-download.svg'
import statusToolsAsset from '@/assets/status-tools.svg'
import './DownloadPage.css'

type AddTaskFeedback = 'idle' | 'adding' | 'added' | 'duplicate'

interface ValidationError {
  title: string
  description: string
  actionLabel?: string
}

async function writeClipboard(text: string) {
  if (!text) return
  await navigator.clipboard?.writeText(text)
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

function formatPublishTime(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function LinkComposer({ onParse, onDownload, isParsing, canDownload, isAdding }: { onParse: () => void; onDownload: () => void; isParsing: boolean; canDownload: boolean; isAdding: boolean }) {
  const { urlInput, setUrlInput } = useAppStore()

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') onParse()
  }

  return (
    <div className="download-page-input-section">
      <div className="download-page-input-wrapper">
        <label className="download-page-field-label">视频链接或 BV 号</label>
        <ContextMenu
          items={[
            { label: '粘贴', onSelect: async () => setUrlInput(await navigator.clipboard.readText()) },
            { label: '清空', onSelect: () => setUrlInput(''), disabled: !urlInput },
            { label: '解析', onSelect: onParse, disabled: isParsing || !urlInput.trim() },
          ]}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--color-text-muted)' }} />
            <input
              className="download-page-input"
              style={{ paddingLeft: '36px' }}
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="粘贴 Bilibili 链接 / BV 号"
              disabled={isParsing}
              onKeyDown={handleKeyDown}
            />
          </div>
        </ContextMenu>
      </div>
      <div className="download-page-button-group">
        <Button variant="secondary" onClick={onParse} disabled={isParsing || !urlInput.trim()}>
          {isParsing ? '解析中...' : '解析'}
        </Button>
        <Button variant="primary" onClick={onDownload} disabled={!canDownload || isAdding}>
          {isAdding ? '添加中...' : '开始下载'}
        </Button>
      </div>
    </div>
  )
}

function VideoPreview({ onDownload, isAdding, parsedVideoInfo }: { onDownload: () => void; isAdding: boolean; parsedVideoInfo: VideoInfo | null }) {
  const { downloadOptions, updateDownloadOption, urlInput } = useAppStore()

  if (!parsedVideoInfo) {
    return (
      <div className="download-page-empty-state">
        <img src={emptyDownloadAsset} alt="" className="download-page-empty-state-art" />
        <div className="download-page-empty-state-title">解析视频信息</div>
        <div className="download-page-empty-state-subtitle">在上方输入框输入 B 站视频链接并点击解析</div>
      </div>
    )
  }

  return (
    <ContextMenu
      items={[
        { label: '复制标题', onSelect: () => writeClipboard(parsedVideoInfo.title) },
        { label: '复制 BV 号', onSelect: () => writeClipboard(parsedVideoInfo.bvid), disabled: !parsedVideoInfo.bvid },
        { label: '复制原始链接', onSelect: () => writeClipboard(urlInput), disabled: !urlInput },
      ]}
    >
      <div className="download-page-preview-card">
      <div className="download-page-preview-header">
        {parsedVideoInfo.cover ? (
          <a href={parsedVideoInfo.cover} target="_blank" rel="noreferrer">
            <img className="download-page-preview-cover" src={parsedVideoInfo.cover} alt={parsedVideoInfo.title} />
          </a>
        ) : (
          <div className="download-page-preview-cover" />
        )}
        <div className="download-page-preview-info">
          <div className="download-page-preview-title" title={parsedVideoInfo.title}>
            {parsedVideoInfo.title}
          </div>
          <div className="download-page-preview-meta">
            {parsedVideoInfo.up && (
              <span className="download-page-preview-meta-item">
                <User size={14} />
                {parsedVideoInfo.up.name}
              </span>
            )}
            {parsedVideoInfo.bvid && <span className="download-page-preview-meta-item">{parsedVideoInfo.bvid}</span>}
            {parsedVideoInfo.publishTime && (
              <span className="download-page-preview-meta-item">
                <Calendar size={14} />
                {formatPublishTime(parsedVideoInfo.publishTime)}
              </span>
            )}
            {parsedVideoInfo.duration > 0 && <span className="download-page-preview-meta-item">{formatDuration(parsedVideoInfo.duration)}</span>}
            {parsedVideoInfo.partition && <span className="download-page-preview-meta-item">{parsedVideoInfo.partition}</span>}
          </div>
          <div className="download-page-preview-actions">
            <Button variant="primary" onClick={onDownload} disabled={downloadOptions.selectedPages.length === 0 || isAdding}>
              {isAdding ? '添加中...' : `开始下载 (${downloadOptions.selectedPages.length} 个分 P)`}
            </Button>
            {parsedVideoInfo.pages?.length > 1 && (
              <>
                <Badge variant="primary">已选 {downloadOptions.selectedPages.length}/{parsedVideoInfo.pages.length} P</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateDownloadOption('selectedPages', parsedVideoInfo.pages.map((p: VideoPage) => p.pageNumber))}
                >
                  全选
                </Button>
                <Button variant="ghost" size="sm" onClick={() => updateDownloadOption('selectedPages', [])}>
                  全不选
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {parsedVideoInfo.pages?.length > 1 && (
        <div className="download-page-pages-section" data-page-selector>
          <div className="download-page-pages-grid">
            {parsedVideoInfo.pages.map((page: VideoPage) => {
              const isSelected = downloadOptions.selectedPages.includes(page.pageNumber)
              return (
                <ContextMenu
                  key={page.pageNumber}
                  items={[
                    { label: '选择此分 P', onSelect: () => updateDownloadOption('selectedPages', Array.from(new Set([...downloadOptions.selectedPages, page.pageNumber]))) },
                    { label: '取消选择此分 P', onSelect: () => updateDownloadOption('selectedPages', downloadOptions.selectedPages.filter((p) => p !== page.pageNumber)), disabled: !isSelected },
                    { label: '全选', onSelect: () => updateDownloadOption('selectedPages', parsedVideoInfo.pages.map((p) => p.pageNumber)) },
                    { label: '反选', onSelect: () => updateDownloadOption('selectedPages', parsedVideoInfo.pages.map((p) => p.pageNumber).filter((p) => !downloadOptions.selectedPages.includes(p))) },
                  ]}
                >
                  <div
                  key={page.pageNumber}
                  className={`download-page-page-item ${isSelected ? 'download-page-page-item-selected' : ''}`}
                  onClick={() => {
                    const current = downloadOptions.selectedPages
                    const newPages = isSelected ? current.filter((p: number) => p !== page.pageNumber) : [...current, page.pageNumber]
                    updateDownloadOption('selectedPages', newPages)
                  }}
                >
                  <div className={`download-page-page-checkbox ${isSelected ? 'download-page-page-checkbox-checked' : ''}`}>
                    {isSelected && <CheckCircle2 size={12} color="white" />}
                  </div>
                  <span className="download-page-page-info">P{page.pageNumber} {page.title}</span>
                  <span className="download-page-page-duration">{formatDuration(page.duration)}</span>
                  </div>
                </ContextMenu>
              )
            })}
          </div>
        </div>
      )}
      </div>
    </ContextMenu>
  )
}

function ToolStatusPanel({ tools, onSelectTool }: { tools: Record<string, ToolInfo>; onSelectTool: (tool: 'bbdown' | 'ffmpeg' | 'aria2c') => void }) {
  const isElectron = isRunningInElectron()

  return (
    <div className="download-page-sidebar-card">
      <img src={statusToolsAsset} alt="" className="download-page-sidebar-art" />
      <div className="download-page-card-title">工具状态</div>
      {(['bbdown', 'ffmpeg', 'aria2c'] as const).map((toolName) => {
        const tool = tools[toolName]
        const displayName = toolName === 'bbdown' ? 'BBDown' : toolName === 'ffmpeg' ? 'FFmpeg' : 'aria2c'
        return (
          <div key={toolName} className="download-page-tool-row">
            <div className="download-page-tool-status">
              <span className="download-page-tool-name">{displayName}</span>
              {tool?.exists ? (
                <CheckCircle2 size={16} className="download-page-status-ok" />
              ) : (
                <XCircle size={16} className="download-page-status-error" />
              )}
            </div>
            <div className="download-page-tool-version">
              <span>{tool?.exists ? `v${tool.version}` : toolName === 'aria2c' ? '可选' : '未检测到'}</span>
              <Tooltip content={isElectron ? '手动选择执行文件' : '浏览器预览模式不支持原生文件选择'}>
                <Button variant="ghost" size="sm" onClick={() => onSelectTool(toolName)} disabled={!isElectron}>
                  <FolderOpen size={14} />
                </Button>
              </Tooltip>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DownloadOptionsPanel() {
  const { downloadOptions, updateDownloadOption, settings } = useAppStore()
  const isElectron = isRunningInElectron()
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const handleSelectWorkDir = async () => {
    if (!isElectron) return
    const selected = await api.util.selectDirectory()
    if (selected) {
      updateDownloadOption('workDir', selected)
    }
  }

  const qualityOptions = [
    { value: '', label: '自动' },
    { value: '8K 超高清', label: '8K 超高清' },
    { value: '4K 超清', label: '4K 超清' },
    { value: '1080P 高码', label: '1080P 高码' },
    { value: '1080P', label: '1080P' },
    { value: '720P', label: '720P' },
  ]

  const subtitleLangOptions = [
    { value: '', label: '默认' },
    { value: 'zh-CN', label: '中文' },
    { value: 'en', label: '英文' },
    { value: 'ja', label: '日文' },
  ]

  const danmakuFormatOptions = [
    { value: 'xml', label: 'XML' },
    { value: 'ass', label: 'ASS' },
    { value: 'protobuf', label: 'Protobuf' },
  ]

  const audioQualityOptions = [
    { value: '', label: '默认' },
    { value: '30250', label: '320K' },
    { value: '30230', label: '132K' },
    { value: '30280', label: '192K' },
  ]

  const encodingOptions = [
    { value: 'hevc,av1,avc', label: 'HEVC > AV1 > AVC' },
    { value: 'avc,hevc,av1', label: 'AVC > HEVC > AV1' },
    { value: 'av1,hevc,avc', label: 'AV1 > HEVC > AVC' },
  ]

  return (
    <div className="download-page-options-card">
      <div className="download-page-options-section">
        <div className="download-page-options-section-title">画质</div>
        <div className="download-page-field-group">
          <label className="download-page-field-label">清晰度</label>
          <Select
            value={downloadOptions.dfnPriority || ''}
            onValueChange={(value) => updateDownloadOption('dfnPriority', value)}
          >
            <SelectTrigger className="download-page-select-wrapper">
              <SelectValue placeholder="自动" />
            </SelectTrigger>
            <SelectContent>
              {qualityOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value || '_auto_'}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="download-page-options-section">
        <div className="download-page-options-section-title">内容</div>
        <div className="download-page-field-group">
          <label className="download-page-field-label">资源模式</label>
          <div className="download-page-segmented">
            {([
              { value: 'full' as const, label: '完整视频' },
              { value: 'videoOnly' as const, label: '仅视频' },
              { value: 'audioOnly' as const, label: '仅音频' },
            ]).map((item) => (
              <button
                key={item.value}
                className={`download-page-segmented-item ${downloadOptions.mediaMode === item.value ? 'download-page-segmented-item-active' : ''}`}
                onClick={() => updateDownloadOption('mediaMode', item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="download-page-options-grid">
          {[
            { key: 'downloadDanmaku' as const, label: '下载弹幕' },
            { key: 'downloadSubtitle' as const, label: '下载字幕' },
            { key: 'downloadCover' as const, label: '下载封面' },
          ].map(({ key, label }) => (
            <div key={key} className="download-page-option-item">
              <input
                type="checkbox"
                id={key}
                checked={downloadOptions[key] as boolean}
                onChange={(e) => updateDownloadOption(key, e.target.checked)}
              />
              <label htmlFor={key} className="download-page-option-label">{label}</label>
            </div>
          ))}
        </div>
        <div className="download-page-options-grid" style={{ marginTop: '8px' }}>
          <div className="download-page-field-inline">
            <label className="download-page-field-label">字幕语言</label>
            <Select
              value={downloadOptions.skipAI ? 'zh-CN' : ''}
              onValueChange={() => {}}
            >
              <SelectTrigger className="download-page-select-wrapper" style={{ height: '28px', fontSize: '12px' }}>
                <SelectValue placeholder="默认" />
              </SelectTrigger>
              <SelectContent>
                {subtitleLangOptions.map((opt) => (
                  <SelectItem key={opt.value || '_default_'} value={opt.value || '_default_'}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="download-page-field-inline">
            <label className="download-page-field-label">弹幕格式</label>
            <Select value="xml" onValueChange={() => {}}>
              <SelectTrigger className="download-page-select-wrapper" style={{ height: '28px', fontSize: '12px' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {danmakuFormatOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="download-page-options-section">
        <div className="download-page-options-section-title">保存</div>
        <div className="download-page-field-group">
          <label className="download-page-field-label">保存到</label>
          <div className="download-page-path-row">
            <input
              className="download-page-path-input"
              value={downloadOptions.workDir}
              onChange={(e) => updateDownloadOption('workDir', e.target.value)}
              placeholder={settings.defaultWorkDir || '选择下载目录'}
            />
            <Tooltip content={isElectron ? '选择保存目录' : '浏览器预览模式不支持原生目录选择'}>
              <Button variant="ghost" onClick={handleSelectWorkDir} disabled={!isElectron}>
                <FolderOpen size={16} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      <div className="download-page-options-section">
        <button className="download-page-advanced-toggle" onClick={() => setAdvancedOpen(!advancedOpen)}>
          {advancedOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <span>高级</span>
        </button>
        {advancedOpen && (
          <div className="download-page-advanced-content">
            <div className="download-page-options-grid">
              <div className="download-page-field-inline">
                <label className="download-page-field-label">API 模式</label>
                <Select
                  value={downloadOptions.apiMode}
                  onValueChange={(value) => updateDownloadOption('apiMode', value as 'web' | 'tv' | 'app' | 'intl')}
                >
                  <SelectTrigger className="download-page-select-wrapper" style={{ height: '28px', fontSize: '12px' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">网页端</SelectItem>
                    <SelectItem value="tv">TV 端</SelectItem>
                    <SelectItem value="app">APP 端</SelectItem>
                    <SelectItem value="intl">国际版</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="download-page-field-inline">
                <label className="download-page-field-label">视频编码</label>
                <Select
                  value={downloadOptions.encodingPriority}
                  onValueChange={(value) => updateDownloadOption('encodingPriority', value)}
                >
                  <SelectTrigger className="download-page-select-wrapper" style={{ height: '28px', fontSize: '12px' }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {encodingOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="download-page-options-grid" style={{ marginTop: '8px' }}>
              <div className="download-page-field-inline">
                <label className="download-page-field-label">音频质量</label>
                <Select value="" onValueChange={() => {}}>
                  <SelectTrigger className="download-page-select-wrapper" style={{ height: '28px', fontSize: '12px' }}>
                    <SelectValue placeholder="默认" />
                  </SelectTrigger>
                  <SelectContent>
                    {audioQualityOptions.map((opt) => (
                      <SelectItem key={opt.value || '_default_'} value={opt.value || '_default_'}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="download-page-field-inline">
                <label className="download-page-field-label">并发数</label>
                <input
                  type="number"
                  className="download-page-path-input"
                  style={{ height: '28px', fontSize: '12px', width: '80px' }}
                  value={downloadOptions.threadCount}
                  onChange={(e) => updateDownloadOption('threadCount', parseInt(e.target.value || '16', 10))}
                  min={1}
                  max={64}
                />
              </div>
            </div>
            <div className="download-page-field-group" style={{ marginTop: '8px' }}>
              <label className="download-page-field-label">命名模板</label>
              <input
                className="download-page-path-input"
                style={{ height: '28px', fontSize: '12px' }}
                value={downloadOptions.filePattern}
                onChange={(e) => updateDownloadOption('filePattern', e.target.value)}
                placeholder="<videoTitle>"
              />
            </div>
            <div className="download-page-options-grid" style={{ marginTop: '8px' }}>
              {[
                { key: 'useAria2c' as const, label: '使用 aria2c' },
                { key: 'skipAI' as const, label: '跳过 AI 字幕' },
                { key: 'multiThread' as const, label: '多线程' },
                { key: 'deleteAfterMerge' as const, label: '合并后删除' },
                { key: 'autoRetry' as const, label: '自动重试' },
              ].map(({ key, label }) => (
                <div key={key} className="download-page-option-item">
                  <input
                    type="checkbox"
                    id={key}
                    checked={downloadOptions[key] as boolean}
                    onChange={(e) => updateDownloadOption(key, e.target.checked)}
                  />
                  <label htmlFor={key} className="download-page-option-label">{label}</label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusRail({ errors }: { errors: ValidationError[] }) {
  const isElectron = isRunningInElectron()

  return (
    <>
      {!isElectron && (
        <div className="download-page-browser-banner">
          <div className="download-page-browser-banner-text">
            浏览器预览模式：只能查看界面示例，真实解析、下载、扫描和后处理请在 Electron 窗口中运行。
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="download-page-error-list">
          {errors.map((error, index) => (
            <div key={index} className="download-page-error-item">
              <strong>{error.title}</strong>
              <div>{error.description}</div>
              {error.actionLabel && <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>建议：{error.actionLabel}</div>}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

export function DownloadPage() {
  const {
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
    urlInput,
  } = useAppStore()

  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [addTaskFeedback, setAddTaskFeedback] = useState<AddTaskFeedback>('idle')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isAddingTask = addTaskFeedback === 'adding'

  useEffect(() => {
    refreshTools()
  }, [refreshTools])

  useEffect(() => {
    const confirmDownload = () => handleRequestDownload()
    const selectAllPages = () => {
      if (parsedVideoInfo?.pages?.length) {
        updateDownloadOption('selectedPages', parsedVideoInfo.pages.map((page) => page.pageNumber))
      }
    }
    window.addEventListener('bbdown:download-confirm', confirmDownload)
    window.addEventListener('bbdown:download-select-all-pages', selectAllPages)
    return () => {
      window.removeEventListener('bbdown:download-confirm', confirmDownload)
      window.removeEventListener('bbdown:download-select-all-pages', selectAllPages)
    }
  })

  const handleParse = async () => {
    if (!downloadOptions.workDir?.trim() && settings.defaultWorkDir) {
      updateDownloadOption('workDir', settings.defaultWorkDir)
    }
    try {
      await parseUrl(urlInput || '')
      setValidationErrors([])
    } catch (error) {
      setValidationErrors([
        {
          title: '解析失败',
          description: error instanceof Error ? error.message : '无法解析该链接，请确认链接有效或检查网络。',
          actionLabel: '检查链接后重试',
        },
      ])
    }
  }

  const validateBeforeDownload = (): ValidationError[] => {
    const errors: ValidationError[] = []
    if (!tools.bbdown?.exists) {
      errors.push({
        title: '未检测到 BBDown',
        description: '缺少 BBDown 可执行文件，无法开始下载。',
        actionLabel: '前往设置页配置路径',
      })
    }
    if (!downloadOptions.workDir?.trim()) {
      errors.push({
        title: '未选择保存目录',
        description: '下载前需要指定文件保存位置。',
        actionLabel: '在下载选项中选择目录',
      })
    }
    if (!parsedVideoInfo) {
      errors.push({
        title: '未解析视频信息',
        description: '请先输入链接并点击解析，获取视频元数据后再开始下载。',
        actionLabel: '输入链接并解析',
      })
    }
    if (parsedVideoInfo && parsedVideoInfo.pages?.length > 0 && downloadOptions.selectedPages.length === 0) {
      errors.push({
        title: '未选择分 P',
        description: '当前视频包含多个分 P，请至少选择一项。',
        actionLabel: '在分 P 列表中勾选',
      })
    }
    if (downloadOptions.useAria2c && !tools.aria2c?.exists) {
      errors.push({
        title: 'aria2c 未检测到',
        description: '已启用 aria2c 加速，但未找到该工具。',
        actionLabel: '关闭 aria2c 或在设置中配置路径',
      })
    }
    return errors
  }

  function handleRequestDownload() {
    const errors = validateBeforeDownload()
    setValidationErrors(errors)
    if (errors.length > 0) return
    setConfirmOpen(true)
  }

  const handleConfirmDownload = async () => {
    setConfirmOpen(false)
    try {
      setAddTaskFeedback('adding')
      const task = await startDownload(urlInput || '', parsedVideoInfo?.title || '')
      setAddTaskFeedback(task.isDuplicate ? 'duplicate' : 'added')
      window.setTimeout(() => setAddTaskFeedback('idle'), 1500)
    } catch (error) {
      setAddTaskFeedback('idle')
      setValidationErrors([
        {
          title: '添加任务失败',
          description: error instanceof Error ? error.message : '未知错误，请检查网络或工具配置后重试。',
          actionLabel: '重试',
        },
      ])
    }
  }

  const handleSelectTool = async (toolName: 'bbdown' | 'ffmpeg' | 'aria2c') => {
    if (!isRunningInElectron()) return
    const selected = await api.util.selectFile([
      { name: 'Executable', extensions: ['*'] },
      { name: 'All Files', extensions: ['*'] },
    ])
    if (!selected) return

    const settingKey = toolName === 'bbdown' ? 'bbdownPath' : toolName === 'ffmpeg' ? 'ffmpegPath' : 'aria2cPath'
    updateSetting(settingKey, selected)
    await api.util.setToolPath(toolName, selected)
    await saveSettings()
    await refreshTools()
  }

  const confirmSummary = parsedVideoInfo
    ? {
        title: parsedVideoInfo.title,
        pages: downloadOptions.selectedPages.length,
        mode:
          downloadOptions.mediaMode === 'videoOnly'
            ? '仅视频'
            : downloadOptions.mediaMode === 'audioOnly'
            ? '仅音频'
            : '完整视频',
        workDir: downloadOptions.workDir,
      }
    : null

  return (
    <div className="download-page">
      <StatusRail errors={validationErrors} />
      <LinkComposer onParse={handleParse} onDownload={handleRequestDownload} isParsing={isParsing} canDownload={!!parsedVideoInfo && downloadOptions.selectedPages.length > 0} isAdding={isAddingTask} />
      <div className="download-page-content-grid">
        <div>
          <VideoPreview onDownload={handleRequestDownload} isAdding={isAddingTask} parsedVideoInfo={parsedVideoInfo} />
          <DownloadOptionsPanel />
        </div>
        <div>
          <ToolStatusPanel tools={tools} onSelectTool={handleSelectTool} />
          <AccountStatusPanel />
          <RecentTasksPanel />
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent style={{ maxWidth: '480px' }}>
          <DialogHeader>
            <DialogTitle>确认开始下载</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {confirmSummary && (
              <div style={{ display: 'grid', gap: '8px', fontSize: 14 }}>
                <div>
                  <strong>目标：</strong>
                  {confirmSummary.title}
                </div>
                <div>
                  <strong>分 P 数：</strong>
                  {confirmSummary.pages} 个
                </div>
                <div>
                  <strong>资源模式：</strong>
                  {confirmSummary.mode}
                </div>
                <div>
                  <strong>保存目录：</strong>
                  {confirmSummary.workDir}
                </div>
              </div>
            )}
            <p style={{ marginTop: 12, color: 'var(--color-text-muted)', fontSize: 13 }}>
              确认后任务将加入队列并开始下载。若目录或工具配置不正确，任务可能会失败。
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleConfirmDownload}>
              确认下载
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AccountStatusPanel() {
  const isElectron = isRunningInElectron()
  const [status, setStatus] = useState<{ loggedIn: boolean; path?: string }>({ loggedIn: false })

  useEffect(() => {
    if (!isElectron) return
    api.bbdown.accountStatus().then((s) => setStatus(s))
  }, [isElectron])

  return (
    <div className="download-page-sidebar-card">
      <div className="download-page-card-title">账号状态</div>
      <div className="download-page-tool-row">
        <div className="download-page-tool-status">
          <span className="download-page-tool-name">Bilibili</span>
          {status.loggedIn ? (
            <CheckCircle2 size={16} className="download-page-status-ok" />
          ) : (
            <XCircle size={16} className="download-page-status-error" />
          )}
        </div>
        <span className="download-page-tool-version">{status.loggedIn ? '已登录' : '未登录'}</span>
      </div>
    </div>
  )
}

function RecentTasksPanel() {
  const { tasks } = useAppStore()
  const recent = tasks.slice(0, 4)

  if (recent.length === 0) return null

  return (
    <div className="download-page-sidebar-card">
      <div className="download-page-card-title">最近任务</div>
      {recent.map((task) => (
        <div key={task.id} className="download-page-recent-task">
          <div className="download-page-recent-task-title" title={task.title}>
            {task.title}
          </div>
          <div className="download-page-recent-task-meta">
            <Badge variant={task.status === 'completed' ? 'success' : task.status === 'failed' ? 'danger' : 'primary'}>
              {task.status === 'completed' ? '已完成' : task.status === 'failed' ? '失败' : '进行中'}
            </Badge>
            <span>{task.progress}%</span>
          </div>
        </div>
      ))}
    </div>
  )
}
