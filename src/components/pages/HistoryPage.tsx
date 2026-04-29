import { useEffect, useRef, useState } from 'react'
import { Search, RotateCw, FolderOpen, Trash2, ExternalLink, Edit3, MapPin, X } from 'lucide-react'
import { Button, Badge, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Tooltip, Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, ContextMenu } from '@/components/ui'
import type { HistoryArtifact, HistoryArtifactType, HistoryJob } from '../../../electron/core/types'
import { api } from '@/lib/runtime'
import queueStatesAsset from '@/assets/queue-states.svg'
import './HistoryPage.css'

const typeLabels: Record<HistoryArtifactType, string> = {
  video: '视频',
  audio: '音频',
  subtitle: '字幕',
  danmaku: '弹幕',
  cover: '封面',
  metadata: '元数据',
  other: '其他',
}

function formatSize(bytes?: number): string {
  if (!bytes) return '-'
  const mb = bytes / (1024 * 1024)
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString('zh-CN', { hour12: false })
}

function mediaSummary(artifact: HistoryArtifact): string {
  const info = artifact.mediaInfo
  if (!info) return artifact.type === 'video' || artifact.type === 'audio' ? '未扫描' : artifact.ext || '-'
  if (info.scanError) return '扫描失败'
  const parts: string[] = []
  if (info.container) parts.push(info.container)
  if (info.videoCodec) parts.push(`V:${info.videoCodec}`)
  if (info.audioCodec) parts.push(`A:${info.audioCodec}`)
  if (info.width && info.height) parts.push(`${info.width}x${info.height}`)
  return parts.join(' / ') || '已扫描'
}

function postprocessOptions(type: HistoryArtifactType): Array<{ value: string; label: string }> {
  if (type === 'video') {
    return [
      { value: 'video-remux-mp4', label: 'Remux MP4' },
      { value: 'video-h264-mp4', label: 'H.264 MP4' },
      { value: 'video-mkv', label: '转 MKV' },
    ]
  }
  if (type === 'audio') {
    return [
      { value: 'audio-mp3', label: '转 MP3' },
      { value: 'audio-m4a', label: '转 M4A' },
      { value: 'audio-flac', label: '转 FLAC' },
    ]
  }
  return []
}

async function writeClipboard(text: string) {
  if (!text) return
  await navigator.clipboard?.writeText(text)
}

function ArtifactRow({ job, artifact, onRefresh }: { job: HistoryJob; artifact: HistoryArtifact; onRefresh: () => void }) {
  const [processing, setProcessing] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(artifact.fileName)
  const [removeOpen, setRemoveOpen] = useState(false)
  const options = postprocessOptions(artifact.type)

  const handleRename = async () => {
    if (!renameValue || renameValue === artifact.fileName) {
      setRenameOpen(false)
      return
    }
    await api.artifact.rename(job.id, artifact.id, renameValue)
    setRenameOpen(false)
    onRefresh()
  }

  const handleMove = async () => {
    await api.artifact.move(job.id, artifact.id)
    onRefresh()
  }

  const handleRelocate = async () => {
    await api.artifact.relocate(job.id, artifact.id)
    onRefresh()
  }

  const handleRemove = async () => {
    await api.artifact.remove(job.id, artifact.id)
    setRemoveOpen(false)
    onRefresh()
  }

  const handlePostprocess = async (kind: 'video-remux-mp4' | 'video-h264-mp4' | 'video-mkv' | 'audio-mp3' | 'audio-m4a' | 'audio-flac') => {
    setProcessing(true)
    try {
      const result = await api.artifact.postprocess(job.id, artifact.id, kind, false)
      if (!result.success) {
        console.error('后处理失败:', result.errors.join('\n'))
      }
      onRefresh()
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <ContextMenu
        items={[
          { label: '打开文件', onSelect: () => api.util.openDirectory(artifact.path), disabled: !artifact.exists },
          { label: '打开所在目录', onSelect: () => api.util.openDirectory(artifact.path), disabled: !artifact.exists },
          { label: '重命名', onSelect: () => { setRenameValue(artifact.fileName); setRenameOpen(true) }, disabled: !artifact.exists },
          { label: '移动', onSelect: handleMove, disabled: !artifact.exists },
          { label: '重新定位', onSelect: handleRelocate },
          { label: '移除记录', onSelect: () => setRemoveOpen(true), danger: true },
        ]}
      >
        <tr>
        <td className="history-artifact-type">{typeLabels[artifact.type]}</td>
        <td className="history-artifact-file">
          <span className="history-artifact-name">{artifact.fileName}</span>
          <span className="history-artifact-path">{artifact.path}</span>
        </td>
        <td className="history-artifact-info">
          <span className="history-artifact-info-text">{mediaSummary(artifact)}</span>
        </td>
        <td className="history-artifact-size">{formatSize(artifact.size)}</td>
        <td className="history-artifact-status">
          <Badge variant={artifact.exists ? 'success' : 'danger'}>{artifact.exists ? '存在' : '缺失'}</Badge>
        </td>
        <td className="history-artifact-actions">
          <div className="history-artifact-actions-row">
            <Tooltip content="打开文件">
              <Button variant="ghost" size="sm" disabled={!artifact.exists} onClick={() => api.util.openDirectory(artifact.path)}>
                <ExternalLink size={12} />
              </Button>
            </Tooltip>
            <Tooltip content="重命名">
              <Button variant="ghost" size="sm" disabled={!artifact.exists} onClick={() => { setRenameValue(artifact.fileName); setRenameOpen(true) }}>
                <Edit3 size={12} />
              </Button>
            </Tooltip>
            <Tooltip content="移动">
              <Button variant="ghost" size="sm" disabled={!artifact.exists} onClick={handleMove}>
                <FolderOpen size={12} />
              </Button>
            </Tooltip>
            <Tooltip content="重新定位">
              <Button variant="ghost" size="sm" onClick={handleRelocate}>
                <MapPin size={12} />
              </Button>
            </Tooltip>
            <Tooltip content="移除记录">
              <Button variant="ghost" size="sm" onClick={() => setRemoveOpen(true)}>
                <X size={12} />
              </Button>
            </Tooltip>
            {options.length > 0 && (
              <Select disabled={!artifact.exists || processing} onValueChange={handlePostprocess}>
                <SelectTrigger style={{ width: '100px', height: '28px', fontSize: '12px' }}>
                  <SelectValue placeholder="后处理" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </td>
        </tr>
      </ContextMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent style={{ maxWidth: '400px' }}>
          <DialogHeader><DialogTitle>重命名</DialogTitle></DialogHeader>
          <DialogBody>
            <input
              className="history-rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleRename}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent style={{ maxWidth: '400px' }}>
          <DialogHeader><DialogTitle>移除记录</DialogTitle></DialogHeader>
          <DialogBody>
            <p>确定要移除这条记录吗？这不会删除实际文件。</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleRemove}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}



function HistoryJobCard({ job, onRefresh, focused, onFocusJob }: { job: HistoryJob; onRefresh: () => void; focused: boolean; onFocusJob: (jobId: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const missingCount = job.artifacts.filter((a) => !a.exists).length

  const handleDeleteJob = async () => {
    await api.history.delete(job.id)
    setDeleteOpen(false)
    onRefresh()
  }

  const handleRescan = async () => {
    await api.history.rescanJob(job.id)
    onRefresh()
  }

  useEffect(() => {
    if (!focused) return undefined
    const toggle = () => setExpanded((value) => !value)
    const remove = () => setDeleteOpen(true)
    window.addEventListener('bbdown:history-toggle-focused', toggle)
    window.addEventListener('bbdown:history-delete-focused', remove)
    return () => {
      window.removeEventListener('bbdown:history-toggle-focused', toggle)
      window.removeEventListener('bbdown:history-delete-focused', remove)
    }
  }, [focused])

  return (
    <>
      <ContextMenu
        items={[
          { label: '打开任务目录', onSelect: () => api.util.openDirectory(job.workDir || job.saveDir) },
          { label: '复制标题', onSelect: () => writeClipboard(job.title) },
          { label: '复制 BV 号', onSelect: () => writeClipboard(job.bvid), disabled: !job.bvid },
          { label: '重新扫描目录', onSelect: handleRescan },
          { label: '删除历史记录', onSelect: () => setDeleteOpen(true), danger: true },
        ]}
      >
        <div className="history-job-card" tabIndex={0} onFocus={() => onFocusJob(job.id)} onClick={() => onFocusJob(job.id)}>
        <div className="history-job-header">
          {job.cover ? <img className="history-job-cover" src={job.cover} alt={job.title} /> : <div className="history-job-cover" />}
          <div style={{ minWidth: 0 }}>
            <span className="history-job-title">{job.title}</span>
            <div className="history-job-meta">
              <span className="history-job-meta-item">{job.bvid || '无 BVID'}</span>
              {job.upName && <span className="history-job-meta-item">{job.upName}</span>}
              <span className="history-job-meta-item">{formatDate(job.completedAt || job.createdAt)}</span>
              <span className="history-job-meta-item">{formatSize(job.totalSize)}</span>
              <Badge variant={job.status === 'completed' ? 'success' : 'danger'}>{job.status === 'completed' ? '已完成' : '失败'}</Badge>
              <Badge variant={missingCount ? 'danger' : 'primary'}>{job.artifacts.length} 个产物</Badge>
              {missingCount > 0 && <Badge variant="danger">{missingCount} 个缺失</Badge>}
            </div>
          </div>
          <div className="history-job-actions">
            <Tooltip content="打开任务目录">
              <Button variant="ghost" size="sm" onClick={() => api.util.openDirectory(job.workDir || job.saveDir)}>
                <FolderOpen size={14} />
              </Button>
            </Tooltip>
            <Tooltip content="重新扫描">
              <Button variant="ghost" size="sm" onClick={handleRescan}>
                <RotateCw size={14} />
              </Button>
            </Tooltip>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? '收起' : '展开'}
            </Button>
            <Tooltip content="删除历史">
              <Button variant="ghost" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 size={14} />
              </Button>
            </Tooltip>
          </div>
        </div>
        {expanded && (
          <div className="history-artifacts">
            <div style={{ overflowX: 'auto' }}>
              <table className="history-artifacts-table">
                <thead>
                  <tr>
                    <th className="history-artifact-type">类型</th>
                    <th className="history-artifact-file">文件</th>
                    <th className="history-artifact-info">媒体信息</th>
                    <th className="history-artifact-size">大小</th>
                    <th className="history-artifact-status">状态</th>
                    <th className="history-artifact-actions">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {job.artifacts.map((artifact) => (
                    <ArtifactRow key={artifact.id} job={job} artifact={artifact} onRefresh={onRefresh} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
      </ContextMenu>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent style={{ maxWidth: '400px' }}>
          <DialogHeader><DialogTitle>删除历史记录</DialogTitle></DialogHeader>
          <DialogBody>
            <p>确定要删除这条历史记录吗？</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>取消</Button>
            <Button variant="primary" onClick={handleDeleteJob}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function HistoryPage() {
  const [jobs, setJobs] = useState<HistoryJob[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, totalSize: 0, missing: 0, artifacts: 0 })
  const [isClearDialogExternalLink, setIsClearDialogExternalLink] = useState(false)
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const loadHistory = async () => {
    const result = await api.history.query({
      page: 1,
      pageSize: 100,
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    })
    setJobs(result.items)
    setTotal(result.total)
    setStats(await api.history.stats())
  }

  useEffect(() => {
    let cancelled = false
    api.history.query({
      page: 1,
      pageSize: 100,
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }).then((result) => {
      if (!cancelled) {
        setJobs(result.items)
        setTotal(result.total)
      }
    })
    api.history.stats().then((s) => {
      if (!cancelled) setStats(s)
    })
    return () => { cancelled = true }
  }, [search, statusFilter])

  useEffect(() => {
    const focusSearch = () => searchRef.current?.focus()
    window.addEventListener('bbdown:history-focus-search', focusSearch)
    return () => window.removeEventListener('bbdown:history-focus-search', focusSearch)
  }, [])

  const handleClearAll = async () => {
    setIsClearDialogExternalLink(false)
    await api.history.clear()
    await loadHistory()
  }

  return (
    <div className="history-page">
      <div className="history-stats-card">
        <div className="history-stat-item"><div className="history-stat-value">{stats.total}</div><div className="history-stat-label">任务</div></div>
        <div className="history-stat-item"><div className="history-stat-value" style={{ color: 'var(--color-success)' }}>{stats.completed}</div><div className="history-stat-label">完成</div></div>
        <div className="history-stat-item"><div className="history-stat-value" style={{ color: 'var(--color-danger)' }}>{stats.failed}</div><div className="history-stat-label">失败</div></div>
        <div className="history-stat-item"><div className="history-stat-value">{stats.artifacts}</div><div className="history-stat-label">产物</div></div>
        <div className="history-stat-item"><div className="history-stat-value" style={{ color: stats.missing ? 'var(--color-danger)' : undefined }}>{stats.missing}</div><div className="history-stat-label">缺失</div></div>
        <div className="history-stat-item"><div className="history-stat-value">{formatSize(stats.totalSize)}</div><div className="history-stat-label">占用空间</div></div>
      </div>

      <div className="history-header">
        <div className="history-title">下载历史 ({total})</div>
        <div className="history-toolbar">
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input ref={searchRef} className="history-search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索标题、BV、UP" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger style={{ width: '100px' }}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" onClick={loadHistory}><RotateCw size={14} /></Button>
          <Button variant="ghost" onClick={() => setIsClearDialogExternalLink(true)}><Trash2 size={14} /></Button>
        </div>
      </div>

      <div className="history-list">
        {jobs.length === 0 ? (
          <div className="history-empty-state">
            <img src={queueStatesAsset} alt="" className="history-empty-state-art" />
            <div className="history-empty-state-title">暂无下载历史</div>
          </div>
        ) : (
          jobs.map((job) => <HistoryJobCard key={job.id} job={job} onRefresh={loadHistory} focused={focusedJobId === job.id} onFocusJob={setFocusedJobId} />)
        )}
      </div>

      <Dialog open={isClearDialogExternalLink} onOpenChange={(open) => setIsClearDialogExternalLink(open)}>
        <DialogContent style={{ maxWidth: '400px' }}>
          <DialogHeader><DialogTitle>清空历史记录</DialogTitle></DialogHeader>
          <DialogBody>
            <p style={{ marginBottom: '20px' }}>确定要清空所有历史记录吗？这不会删除本地磁盘上的实际文件。</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsClearDialogExternalLink(false)}>取消</Button>
            <Button variant="primary" onClick={handleClearAll}>确定</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
