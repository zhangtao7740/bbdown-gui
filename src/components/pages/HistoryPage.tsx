import { useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Dropdown,
  Field,
  Image,
  Input,
  Option,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Tooltip,
  makeStyles,
} from '@fluentui/react-components'
import {
  ArrowClockwise20Regular,
  Delete20Regular,
  FolderOpen20Regular,
  Open20Regular,
  Search20Regular,
} from '@fluentui/react-icons'
import type { HistoryArtifact, HistoryArtifactType, HistoryJob } from '../../../electron/core/types'
import { api } from '@/lib/runtime'

const useStyles = makeStyles({
  container: { padding: '20px', height: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' },
  statsCard: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '16px', padding: '16px', flexShrink: 0 },
  statItem: { textAlign: 'center', minWidth: 0 },
  statValue: { fontSize: '22px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  statLabel: { fontSize: '12px', color: 'var(--colorNeutralForeground3)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexShrink: 0 },
  toolbar: { display: 'flex', gap: '8px', alignItems: 'center', minWidth: 0 },
  searchInput: { width: '280px' },
  list: { flex: 1, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  jobCard: { padding: '14px' },
  jobHeader: { display: 'grid', gridTemplateColumns: '96px 1fr auto', gap: '12px', alignItems: 'center' },
  cover: { width: '96px', height: '60px', objectFit: 'cover', borderRadius: '6px', backgroundColor: 'var(--colorNeutralBackground3)' },
  title: { display: 'block', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  meta: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px', color: 'var(--colorNeutralForeground3)' },
  actions: { display: 'flex', gap: '4px', alignItems: 'center' },
  artifacts: { marginTop: '12px', borderTop: '1px solid var(--colorNeutralStroke2)', paddingTop: '10px' },
  table: { tableLayout: 'fixed', width: '100%', minWidth: '920px' },
  typeCell: { width: '92px' },
  fileCell: { width: '28%' },
  infoCell: { width: '30%' },
  sizeCell: { width: '92px' },
  statusCell: { width: '92px' },
  actionCell: { width: '260px' },
  fileName: { display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  filePath: { display: 'block', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--colorNeutralForeground3)' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: 'var(--colorNeutralForeground3)' },
})

const typeLabels: Record<HistoryArtifactType, string> = {
  video: '视频',
  audio: '音频',
  subtitle: '字幕',
  danmaku: '弹幕',
  cover: '封面',
  metadata: '元数据',
  other: '其他',
}

type PostprocessKind = 'video-remux-mp4' | 'video-h264-mp4' | 'video-mkv' | 'audio-mp3' | 'audio-m4a' | 'audio-flac'

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
  if (info.sampleRate) parts.push(`${info.sampleRate}Hz`)
  if (info.channels) parts.push(`${info.channels}ch`)
  if (info.duration) parts.push(`${Math.round(info.duration)}s`)
  return parts.join(' / ') || '已扫描'
}

function postprocessOptions(type: HistoryArtifactType): Array<{ value: PostprocessKind; label: string }> {
  if (type === 'video') {
    return [
      { value: 'video-remux-mp4', label: 'Remux MP4' },
      { value: 'video-h264-mp4', label: 'H.264 + AAC MP4' },
      { value: 'video-mkv', label: '转 MKV' },
    ]
  }
  if (type === 'audio') {
    return [
      { value: 'audio-mp3', label: '转 MP3' },
      { value: 'audio-m4a', label: '转 M4A/AAC' },
      { value: 'audio-flac', label: '转 FLAC' },
    ]
  }
  return []
}

export function HistoryPage() {
  const styles = useStyles()
  const [jobs, setJobs] = useState<HistoryJob[]>([])
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [processing, setProcessing] = useState<Record<string, boolean>>({})
  const [stats, setStats] = useState({ total: 0, completed: 0, failed: 0, totalSize: 0, missing: 0, artifacts: 0 })
  const [oldHistoryExists, setOldHistoryExists] = useState(false)

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
    setOldHistoryExists((await api.history.storageInfo()).oldHistoryExists)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  const expandedJobs = useMemo(() => expanded, [expanded])

  const replaceJob = (job?: HistoryJob | null) => {
    if (!job) return
    setJobs((current) => current.map((item) => (item.id === job.id ? job : item)))
  }

  const refreshStats = async () => {
    setStats(await api.history.stats())
  }

  const handleDeleteJob = async (id: string) => {
    await api.history.delete(id)
    await loadHistory()
  }

  const handleClearAll = async () => {
    if (!confirm('确定要清空所有历史记录吗？不会删除本地文件。')) return
    await api.history.clear()
    await loadHistory()
  }

  const handleRename = async (jobId: string, artifact: HistoryArtifact) => {
    const value = prompt('输入新的文件名', artifact.fileName)
    if (!value || value === artifact.fileName) return
    replaceJob(await api.artifact.rename(jobId, artifact.id, value))
    await refreshStats()
  }

  const handlePostprocess = async (jobId: string, artifact: HistoryArtifact, kind: PostprocessKind) => {
    setProcessing((current) => ({ ...current, [artifact.id]: true }))
    try {
      const result = await api.artifact.postprocess(jobId, artifact.id, kind, false)
      if (!result.success) alert(result.errors.join('\n') || '后处理失败')
      replaceJob(await api.history.getJob(jobId))
      await refreshStats()
    } finally {
      setProcessing((current) => ({ ...current, [artifact.id]: false }))
    }
  }

  const handleRescan = async (jobId: string) => {
    const result = await api.history.rescanJob(jobId)
    if (result?.unresolved.length) {
      alert(`已恢复 ${result.recovered} 个文件，还有 ${result.unresolved.length} 个文件需要手动重新定位。`)
    }
    if (result?.job) replaceJob(result.job)
    await refreshStats()
  }

  return (
    <div className={styles.container}>
      <Card className={styles.statsCard}>
        <div className={styles.statItem}><div className={styles.statValue}>{stats.total}</div><div className={styles.statLabel}>任务</div></div>
        <div className={styles.statItem}><div className={styles.statValue} style={{ color: '#107C10' }}>{stats.completed}</div><div className={styles.statLabel}>完成</div></div>
        <div className={styles.statItem}><div className={styles.statValue} style={{ color: '#D13438' }}>{stats.failed}</div><div className={styles.statLabel}>失败</div></div>
        <div className={styles.statItem}><div className={styles.statValue}>{stats.artifacts}</div><div className={styles.statLabel}>产物</div></div>
        <div className={styles.statItem}><div className={styles.statValue} style={{ color: stats.missing ? '#D13438' : undefined }}>{stats.missing}</div><div className={styles.statLabel}>缺失</div></div>
      </Card>

      <div className={styles.header}>
        <Text weight="semibold" size={500}>下载历史 ({total})</Text>
        <div className={styles.toolbar}>
          <Input className={styles.searchInput} value={search} onChange={(_, data) => setSearch(data.value)} placeholder="搜索标题、BV、UP" contentBefore={<Search20Regular />} />
          <Dropdown
            value={statusFilter === 'all' ? '全部' : statusFilter === 'completed' ? '已完成' : '失败'}
            onOptionSelect={(_, data) => setStatusFilter(data.optionValue || 'all')}
            style={{ width: '120px' }}
          >
            <Option value="all">全部</Option>
            <Option value="completed">已完成</Option>
            <Option value="failed">失败</Option>
          </Dropdown>
          <Button appearance="subtle" icon={<ArrowClockwise20Regular />} onClick={loadHistory}>刷新</Button>
          <Button appearance="subtle" icon={<Delete20Regular />} onClick={handleClearAll}>清空</Button>
        </div>
      </div>

      {oldHistoryExists && (
        <Card>
          <Text size={200}>
            历史结构已升级：当前版本只使用 history.v2.json，旧 download_history.json 不再读取，也不会自动迁移。
          </Text>
        </Card>
      )}

      <div className={styles.list}>
        {jobs.length === 0 ? (
          <Card className={styles.emptyState}><Text>暂无下载历史</Text></Card>
        ) : jobs.map((job) => {
          const missingCount = job.artifacts.filter((artifact) => !artifact.exists).length
          const isExpanded = Boolean(expandedJobs[job.id])
          return (
            <Card key={job.id} className={styles.jobCard}>
              <div className={styles.jobHeader}>
                {job.cover ? <Image className={styles.cover} src={job.cover} alt={job.title} fit="cover" /> : <div className={styles.cover} />}
                <div style={{ minWidth: 0 }}>
                  <Text className={styles.title}>{job.title}</Text>
                  <div className={styles.meta}>
                    <span>{job.bvid || '无 BVID'}</span>
                    {job.upName && <span>{job.upName}</span>}
                    <span>{formatDate(job.completedAt || job.createdAt)}</span>
                    <span>{formatSize(job.totalSize)}</span>
                    <Badge color={job.status === 'completed' ? 'success' : 'danger'}>{job.status === 'completed' ? '已完成' : '失败'}</Badge>
                    <Badge color={missingCount ? 'danger' : 'informative'}>{job.artifacts.length} 个产物</Badge>
                    {missingCount > 0 && <Badge color="danger">{missingCount} 个缺失</Badge>}
                  </div>
                </div>
                <div className={styles.actions}>
                  <Tooltip content="打开任务目录" relationship="label"><Button appearance="subtle" icon={<FolderOpen20Regular />} onClick={() => api.util.openDirectory(job.workDir || job.saveDir)} /></Tooltip>
                  <Tooltip content="重新扫描任务目录" relationship="label"><Button appearance="subtle" icon={<ArrowClockwise20Regular />} onClick={() => handleRescan(job.id)} /></Tooltip>
                  <Button appearance="subtle" onClick={() => setExpanded((current) => ({ ...current, [job.id]: !current[job.id] }))}>{isExpanded ? '收起' : '展开'}</Button>
                  <Tooltip content="删除历史记录，不删除文件" relationship="label"><Button appearance="subtle" icon={<Delete20Regular />} onClick={() => handleDeleteJob(job.id)} /></Tooltip>
                </div>
              </div>

              {isExpanded && (
                <div className={styles.artifacts}>
                  <Table className={styles.table}>
                    <TableHeader>
                      <TableRow>
                        <TableHeaderCell className={styles.typeCell}>类型</TableHeaderCell>
                        <TableHeaderCell className={styles.fileCell}>文件</TableHeaderCell>
                        <TableHeaderCell className={styles.infoCell}>媒体信息</TableHeaderCell>
                        <TableHeaderCell className={styles.sizeCell}>大小</TableHeaderCell>
                        <TableHeaderCell className={styles.statusCell}>状态</TableHeaderCell>
                        <TableHeaderCell className={styles.actionCell}>操作</TableHeaderCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {job.artifacts.map((artifact) => {
                        const options = postprocessOptions(artifact.type)
                        return (
                          <TableRow key={artifact.id}>
                            <TableCell className={styles.typeCell}>{typeLabels[artifact.type]}</TableCell>
                            <TableCell className={styles.fileCell}>
                              <Text className={styles.fileName}>{artifact.fileName}</Text>
                              <Text size={100} className={styles.filePath}>{artifact.path}</Text>
                            </TableCell>
                            <TableCell className={styles.infoCell}>{mediaSummary(artifact)}</TableCell>
                            <TableCell className={styles.sizeCell}>{formatSize(artifact.size)}</TableCell>
                            <TableCell className={styles.statusCell}>
                              <Badge color={artifact.exists ? 'success' : 'danger'}>{artifact.exists ? '存在' : '缺失'}</Badge>
                            </TableCell>
                            <TableCell className={styles.actionCell}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <Button size="small" icon={<Open20Regular />} disabled={!artifact.exists} onClick={() => api.util.openDirectory(artifact.path)}>打开</Button>
                                <Button size="small" disabled={!artifact.exists} onClick={() => handleRename(job.id, artifact)}>重命名</Button>
                                <Button size="small" disabled={!artifact.exists} onClick={async () => { replaceJob(await api.artifact.move(job.id, artifact.id)); await refreshStats() }}>移动</Button>
                                <Button size="small" onClick={async () => { replaceJob(await api.artifact.relocate(job.id, artifact.id)); await refreshStats() }}>重新定位</Button>
                                <Button size="small" onClick={async () => { replaceJob(await api.artifact.remove(job.id, artifact.id)); await refreshStats() }}>移除记录</Button>
                                {options.length > 0 && (
                                  <Field>
                                    <Dropdown
                                      placeholder="后处理"
                                      disabled={!artifact.exists || processing[artifact.id]}
                                      onOptionSelect={(_, data) => {
                                        if (data.optionValue) void handlePostprocess(job.id, artifact, data.optionValue as PostprocessKind)
                                      }}
                                      style={{ minWidth: '118px' }}
                                    >
                                      {options.map((option) => <Option key={option.value} value={option.value}>{option.label}</Option>)}
                                    </Dropdown>
                                  </Field>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
