import { useEffect, useMemo, useState } from 'react'
import { Play, Pause, FolderOpen, Trash2, PauseCircle, PlayCircle, CheckCircle2 } from 'lucide-react'
import { Button, Badge, Tooltip, ContextMenu } from '@/components/ui'
import { api } from '@/lib/runtime'
import { useAppStore } from '@/store/appStore'
import type { DownloadTask, LogEntry } from '../../../electron/core/types'
import queueStatesAsset from '@/assets/queue-states.svg'
import './TasksPage.css'

function sanitizeLogText(text: string): string {
  return text
    .replace(/SESSDATA=[^;&\s]+/gi, 'SESSDATA=***')
    .replace(/bili_jct=[^;&\s]+/gi, 'bili_jct=***')
    .replace(/DedeUserID=[^;&\s]+/gi, 'DedeUserID=***')
    .replace(/DedeUserID__ckMd5=[^;&\s]+/gi, 'DedeUserID__ckMd5=***')
    .replace(/access_token=[^;&\s]+/gi, 'access_token=***')
    .replace(/refresh_token=[^;&\s]+/gi, 'refresh_token=***')
    .replace(/Cookie[:\s]*[^\n]*/gi, (match) => match.replace(/SESSDATA=[^;]+/gi, 'SESSDATA=***').replace(/bili_jct=[^;]+/gi, 'bili_jct=***').replace(/DedeUserID=[^;]+/gi, 'DedeUserID=***'))
    .replace(/authorization[:\s]*[^\n]*/gi, 'authorization: ***')
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'completed': return '已完成'
    case 'downloading': return '下载中'
    case 'processing': return '处理中'
    case 'waiting': return '等待中'
    case 'paused': return '已暂停'
    case 'cancelled': return '已取消'
    case 'failed': return '失败'
    default: return status
  }
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'completed': return 'tasks-status-completed'
    case 'downloading': return 'tasks-status-downloading'
    case 'processing': return 'tasks-status-processing'
    case 'waiting': return 'tasks-status-waiting'
    case 'paused': return 'tasks-status-paused'
    case 'cancelled': return 'tasks-status-cancelled'
    case 'failed': return 'tasks-status-failed'
    default: return 'tasks-status-waiting'
  }
}

function getAverageProgress(tasks: DownloadTask[]): number {
  if (tasks.length === 0) return 0
  return Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)
}

function getAssetLabel(task: DownloadTask): string {
  if (task.assetLabel) return task.assetLabel
  const labels = [
    task.options?.videoOnly ? '仅视频' : task.options?.audioOnly ? '仅音频' : '完整视频',
    task.options?.downloadSubtitle && '字幕',
    task.options?.downloadDanmaku && '弹幕',
    task.options?.downloadCover && '封面',
  ].filter(Boolean)
  const pageCount = task.options?.selectedPages?.length
  return `${labels.join(' / ')}${pageCount ? ` · ${pageCount} 个分 P` : ''}`
}

function TaskLogPanel({ logs, isExpanded }: { logs: LogEntry[]; isExpanded: boolean }) {
  if (!isExpanded) return null

  return (
    <div className="tasks-log-panel">
      {logs.length === 0 && <div className="tasks-log-message">暂无日志</div>}
      {logs.slice(-100).map((entry, index) => (
        <div key={`${entry.timestamp}-${index}`} className="tasks-log-line">
          <span className="tasks-log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
          <span className={`tasks-log-source ${entry.level === 'error' ? 'tasks-log-error' : ''}`}>{entry.source}</span>
          <span className={`tasks-log-message ${entry.level === 'error' ? 'tasks-log-error' : ''}`}>{entry.message}</span>
        </div>
      ))}
    </div>
  )
}

async function writeClipboard(text: string) {
  if (!text) return
  await navigator.clipboard?.writeText(text)
}

function TaskRow({ task, logs, focused, onFocusTask }: { task: DownloadTask; logs: LogEntry[]; focused: boolean; onFocusTask: (taskId: string) => void }) {
  const [isLogExpanded, setIsLogExpanded] = useState(false)
  const statusClass = getStatusClass(task.status)

  useEffect(() => {
    if (!focused) return undefined
    const toggleLog = () => setIsLogExpanded((value) => !value)
    const copyFocused = () => writeClipboard(sanitizeLogText(task.error || logs.map((entry) => entry.message).join('\n')))
    const toggleTask = () => {
      if (task.status === 'downloading' || task.status === 'processing') void api.task.stop(task.id)
      else void api.task.start(task.id)
    }
    window.addEventListener('bbdown:tasks-toggle-log', toggleLog)
    window.addEventListener('bbdown:tasks-copy-focused', copyFocused)
    window.addEventListener('bbdown:tasks-toggle-focused', toggleTask)
    return () => {
      window.removeEventListener('bbdown:tasks-toggle-log', toggleLog)
      window.removeEventListener('bbdown:tasks-copy-focused', copyFocused)
      window.removeEventListener('bbdown:tasks-toggle-focused', toggleTask)
    }
  }, [focused, logs, task.error, task.id, task.status])

  return (
    <ContextMenu
      items={[
        { label: '开始/继续', onSelect: () => api.task.start(task.id), disabled: task.status === 'downloading' || task.status === 'processing' },
        { label: '暂停', onSelect: () => api.task.stop(task.id), disabled: task.status !== 'downloading' && task.status !== 'processing' },
        { label: '打开输出目录', onSelect: () => api.util.openDirectory(task.outputPath || task.options?.workDir || ''), disabled: !task.outputPath && !task.options?.workDir },
        { label: '复制错误或日志', onSelect: () => writeClipboard(sanitizeLogText(task.error || logs.map((entry) => entry.message).join('\n'))), disabled: !task.error && logs.length === 0 },
        { label: '删除这个子任务', onSelect: () => api.task.remove(task.id), danger: true },
      ]}
    >
      <div className="tasks-task-row" tabIndex={0} onFocus={() => onFocusTask(task.id)} onClick={() => onFocusTask(task.id)}>
      <div className="tasks-task-header">
        <div className="tasks-task-info">
          <div className="tasks-task-title" title={getAssetLabel(task)}>{getAssetLabel(task)}</div>
          <div className="tasks-task-meta">
            <span className={`tasks-status-badge ${statusClass}`}>{getStatusLabel(task.status)}</span>
            {task.speed && <span className="tasks-meta-item">速度：{task.speed}</span>}
            <span className="tasks-meta-item">进度：{task.progress}%</span>
          </div>
        </div>
        <div className="tasks-task-actions">
          {(task.status === 'waiting' || task.status === 'paused' || task.status === 'failed') && (
            <Tooltip content="开始">
              <Button variant="ghost" size="sm" onClick={() => api.task.start(task.id)}>
                <Play size={14} />
              </Button>
            </Tooltip>
          )}
          {(task.status === 'downloading' || task.status === 'processing') && (
            <Tooltip content="暂停">
              <Button variant="ghost" size="sm" onClick={() => api.task.stop(task.id)}>
                <Pause size={14} />
              </Button>
            </Tooltip>
          )}
          {task.status === 'completed' && (
            <Tooltip content="打开文件夹">
              <Button variant="ghost" size="sm" onClick={() => api.util.openDirectory(task.outputPath || task.options?.workDir || '')}>
                <FolderOpen size={14} />
              </Button>
            </Tooltip>
          )}
          <Tooltip content="删除这个子任务">
            <Button variant="ghost" size="sm" onClick={() => api.task.remove(task.id)}>
              <Trash2 size={14} />
            </Button>
          </Tooltip>
          <Button variant="ghost" size="sm" onClick={() => setIsLogExpanded(!isLogExpanded)}>
            {isLogExpanded ? '隐藏日志' : '日志'}
          </Button>
        </div>
      </div>
      {(task.status === 'downloading' || task.status === 'processing') && (
        <div className="tasks-task-progress">
          <div className="tasks-task-progress-bar" style={{ width: `${task.progress}%` }} />
        </div>
      )}
      <TaskLogPanel logs={logs} isExpanded={isLogExpanded} />
      </div>
    </ContextMenu>
  )
}

interface TaskGroup {
  id: string
  title: string
  bvid?: string
  upName?: string
  thumbnail?: string
  tasks: DownloadTask[]
}

function TaskGroupCard({ group, focusedTaskId, onFocusTask }: { group: TaskGroup; focusedTaskId: string | null; onFocusTask: (taskId: string) => void }) {
  const groupStatus = group.tasks.some((t: DownloadTask) => t.status === 'downloading')
    ? 'downloading'
    : group.tasks.some((t: DownloadTask) => t.status === 'processing')
    ? 'processing'
    : group.tasks.every((t: DownloadTask) => t.status === 'completed')
    ? 'completed'
    : group.tasks.some((t: DownloadTask) => t.status === 'failed')
    ? 'failed'
    : 'waiting'

  const progress = getAverageProgress(group.tasks)
  const statusClass = getStatusClass(groupStatus)

  const workDir = group.tasks[0]?.options?.workDir

  return (
    <ContextMenu
      items={[
        { label: '打开保存目录', onSelect: () => api.util.openDirectory(workDir || ''), disabled: !workDir },
        { label: '复制标题', onSelect: () => writeClipboard(group.title) },
        { label: '复制 BV 号', onSelect: () => writeClipboard(group.bvid || ''), disabled: !group.bvid },
        { label: '重试失败子任务', onSelect: async () => { await Promise.all(group.tasks.filter((task) => task.status === 'failed').map((task) => api.task.start(task.id))) }, disabled: !group.tasks.some((task) => task.status === 'failed') },
      ]}
    >
      <div className="tasks-group-card">
      <div className="tasks-group-header">
        {group.thumbnail ? <img className="tasks-group-cover" src={group.thumbnail} alt="" /> : <div className="tasks-group-cover tasks-group-cover-empty" />}
        <div className="tasks-group-info">
          <div className="tasks-group-title" title={group.title}>{group.title}</div>
          <div className="tasks-group-meta">
            <span className={`tasks-status-badge ${statusClass}`}>{getStatusLabel(groupStatus)}</span>
            <Badge variant="primary">{group.tasks.length} 个子任务</Badge>
            {group.bvid && <span className="tasks-meta-item">{group.bvid}</span>}
            {group.upName && <span className="tasks-meta-item">{group.upName}</span>}
            <span className="tasks-meta-item">总进度：{progress}%</span>
          </div>
        </div>
      </div>
      {(groupStatus === 'downloading' || groupStatus === 'processing' || groupStatus === 'waiting') && (
        <div className="tasks-group-progress">
          <div className="tasks-group-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
      {group.tasks.map((task: DownloadTask) => (
        <TaskRow key={task.id} task={task} logs={task.logs || []} focused={focusedTaskId === task.id} onFocusTask={onFocusTask} />
      ))}
      </div>
    </ContextMenu>
  )
}

export function TasksPage() {
  const { tasks } = useAppStore()
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, TaskGroup>()
    for (const task of tasks) {
      const key = task.groupId || task.groupKey || task.bvid || task.url
      const group = map.get(key)
      if (group) {
        group.tasks.push(task)
      } else {
        map.set(key, {
          id: key,
          title: task.title,
          bvid: task.bvid,
          upName: task.upName,
          thumbnail: task.thumbnail,
          tasks: [task],
        })
      }
    }
    return Array.from(map.values()).map((group) => ({
      ...group,
      tasks: group.tasks.sort((a: DownloadTask, b: DownloadTask) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
        return timeA - timeB
      }),
    }))
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className="tasks-page">
          <div className="tasks-empty-state">
          <img src={queueStatesAsset} alt="" className="tasks-empty-state-art" />
          <div className="tasks-empty-state-title">暂无下载任务</div>
          <div className="tasks-empty-state-subtitle">在"下载"页面解析并开始下载视频</div>
        </div>
      </div>
    )
  }

  const runningCount = tasks.filter((t) => t.status === 'downloading' || t.status === 'processing').length
  const waitingCount = tasks.filter((t) => t.status === 'waiting' || t.status === 'paused').length
  const failedCount = tasks.filter((t) => t.status === 'failed').length

  return (
    <div className="tasks-page">
      <div className="tasks-page-header">
        <div>
          <div className="tasks-page-title">任务队列</div>
          <div className="tasks-page-subtitle">
            {groups.length} 个视频组 / {tasks.length} 个子任务
          </div>
        </div>
        <div className="tasks-stats-chips">
          <Badge variant={runningCount > 0 ? 'primary' : 'default'}>运行中 {runningCount}</Badge>
          <Badge variant="default">等待 {waitingCount}</Badge>
          <Badge variant={failedCount > 0 ? 'danger' : 'default'}>失败 {failedCount}</Badge>
        </div>
        <div className="tasks-toolbar">
          <Tooltip content="全部暂停">
            <Button variant="ghost" size="sm" onClick={() => api.task.pauseAll()}>
              <PauseCircle size={16} />
              <span>全部暂停</span>
            </Button>
          </Tooltip>
          <Tooltip content="全部继续">
            <Button variant="ghost" size="sm" onClick={() => api.task.resumeAll()}>
              <PlayCircle size={16} />
              <span>全部继续</span>
            </Button>
          </Tooltip>
          <Tooltip content="清理已完成">
            <Button variant="ghost" size="sm" onClick={() => api.task.clearCompleted()}>
              <CheckCircle2 size={16} />
              <span>清理完成</span>
            </Button>
          </Tooltip>
        </div>
      </div>
      {groups.map((group) => (
        <TaskGroupCard key={group.id} group={group} focusedTaskId={focusedTaskId} onFocusTask={setFocusedTaskId} />
      ))}
    </div>
  )
}
