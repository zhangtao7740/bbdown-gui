import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ProgressBar,
  Text,
  Tooltip,
  makeStyles,
} from '@fluentui/react-components'
import {
  Delete20Regular,
  FolderOpen20Regular,
  Pause20Regular,
  Play20Regular,
} from '@fluentui/react-icons'
import { api } from '@/lib/runtime'
import { useAppStore } from '@/store/appStore'
import type { DownloadTask, TaskStatus } from '../../../electron/core/types'

const useStyles = makeStyles({
  container: { padding: '20px', height: '100%', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden' },
  taskGroup: { marginBottom: '12px', overflow: 'hidden', minWidth: 0 },
  groupHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '12px', minWidth: 0 },
  groupMeta: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' },
  taskRow: { padding: '10px 0', borderTop: '1px solid var(--colorNeutralStroke2)' },
  taskRowHeader: { display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap', minWidth: 0 },
  taskActions: { display: 'flex', gap: '4px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '2px 8px', borderRadius: '10px' },
  logPanel: { maxHeight: '160px', overflowY: 'auto', marginTop: '8px', padding: '6px', backgroundColor: 'var(--colorNeutralBackground3)', borderRadius: '4px', fontSize: '11px', fontFamily: 'Consolas, monospace' },
  logLine: { display: 'grid', gridTemplateColumns: '64px 44px minmax(0, 1fr)', gap: '8px', padding: '1px 0', minWidth: 0 },
  logTime: { color: 'var(--colorNeutralForeground4)', minWidth: '64px' },
  logSource: { minWidth: '44px' },
  logMessage: { minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' },
  logErr: { color: '#D13438' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: 'var(--colorNeutralForeground3)' },
})

interface TaskGroup {
  id: string
  title: string
  bvid?: string
  upName?: string
  thumbnail?: string
  tasks: DownloadTask[]
}

function getStatus(status: string): { color: string; label: string } {
  switch (status) {
    case 'completed': return { color: '#107C10', label: '已完成' }
    case 'downloading': return { color: '#0078D4', label: '下载中' }
    case 'processing': return { color: '#0078D4', label: '处理中' }
    case 'waiting': return { color: '#666666', label: '等待中' }
    case 'paused': return { color: '#666666', label: '已暂停' }
    case 'cancelled': return { color: '#666666', label: '已取消' }
    case 'failed': return { color: '#D13438', label: '失败' }
    default: return { color: '#666666', label: status }
  }
}

function getGroupStatus(tasks: DownloadTask[]): TaskStatus {
  if (tasks.some((task) => task.status === 'downloading')) return 'downloading'
  if (tasks.some((task) => task.status === 'processing')) return 'processing'
  if (tasks.some((task) => task.status === 'waiting')) return 'waiting'
  if (tasks.some((task) => task.status === 'paused')) return 'paused'
  if (tasks.some((task) => task.status === 'failed')) return 'failed'
  if (tasks.every((task) => task.status === 'cancelled')) return 'cancelled'
  return 'completed'
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

export function TasksPage() {
  const styles = useStyles()
  const { tasks, taskLogs } = useAppStore()
  const [expandedLogTask, setExpandedLogTask] = useState<string | null>(null)
  const groups = useMemo<TaskGroup[]>(() => {
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
      tasks: group.tasks.sort((a, b) => {
        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime()
        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime()
        return timeA - timeB
      }),
    }))
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className={styles.container}>
        <Card className={styles.emptyState}>
          <Text size={400}>暂无下载任务</Text>
          <Text size={200} block style={{ marginTop: '8px' }}>
            在“下载”页面解析并开始下载视频
          </Text>
        </Card>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <Text weight="semibold" size={500} block style={{ marginBottom: '20px' }}>
        任务队列 ({groups.length} 个视频组 / {tasks.length} 个子任务)
      </Text>
      {groups.map((group) => {
        const groupStatus = getStatus(getGroupStatus(group.tasks))
        const progress = getAverageProgress(group.tasks)
        return (
          <Card key={group.id} className={styles.taskGroup}>
            <div className={styles.groupHeader}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text weight="semibold" block truncate title={group.title}>{group.title}</Text>
                <div className={styles.groupMeta}>
                  <span className={styles.statusBadge} style={{ backgroundColor: `${groupStatus.color}20`, color: groupStatus.color }}>{groupStatus.label}</span>
                  <Badge appearance="tint" color="brand" size="small">{group.tasks.length} 个子任务</Badge>
                  {group.bvid ? <Text size={200}>{group.bvid}</Text> : null}
                  {group.upName ? <Text size={200}>{group.upName}</Text> : null}
                  <Text size={200}>总进度：{progress}%</Text>
                </div>
              </div>
            </div>
            {['downloading', 'processing', 'waiting'].includes(getGroupStatus(group.tasks)) && (
              <ProgressBar value={progress / 100} style={{ marginBottom: '8px' }} />
            )}

            {group.tasks.map((task) => {
              const status = getStatus(task.status)
              const logs = taskLogs[task.id] || task.logs || []
              const isLogExpanded = expandedLogTask === task.id

              return (
                <div key={task.id} className={styles.taskRow}>
                  <div className={styles.taskRowHeader}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text weight="semibold" block truncate>{getAssetLabel(task)}</Text>
                      <div className={styles.groupMeta}>
                        <span className={styles.statusBadge} style={{ backgroundColor: `${status.color}20`, color: status.color }}>{status.label}</span>
                        {task.speed ? <Text size={200}>速度：{task.speed}</Text> : null}
                        <Text size={200}>进度：{task.progress}%</Text>
                      </div>
                    </div>
                    <div className={styles.taskActions}>
                      {(task.status === 'waiting' || task.status === 'paused' || task.status === 'failed') && (
                        <Tooltip content="开始" relationship="label">
                          <Button appearance="subtle" icon={<Play20Regular />} onClick={() => api.task.start(task.id)} />
                        </Tooltip>
                      )}
                      {(task.status === 'downloading' || task.status === 'processing') && (
                        <Tooltip content="暂停" relationship="label">
                          <Button appearance="subtle" icon={<Pause20Regular />} onClick={() => api.task.stop(task.id)} />
                        </Tooltip>
                      )}
                      {task.status === 'completed' && (
                        <Tooltip content="打开文件夹" relationship="label">
                          <Button appearance="subtle" icon={<FolderOpen20Regular />} onClick={() => api.util.openDirectory(task.outputPath || task.options?.workDir || '')} />
                        </Tooltip>
                      )}
                      <Tooltip content="删除这个子任务" relationship="label">
                        <Button appearance="subtle" icon={<Delete20Regular />} onClick={() => api.task.remove(task.id)} />
                      </Tooltip>
                      <Button appearance="subtle" onClick={() => setExpandedLogTask(isLogExpanded ? null : task.id)}>
                        {isLogExpanded ? '隐藏日志' : '日志'}
                      </Button>
                    </div>
                  </div>
                  {(task.status === 'downloading' || task.status === 'processing') && (
                    <ProgressBar value={task.progress / 100} style={{ marginTop: '8px' }} />
                  )}
                  {isLogExpanded && (
                    <div className={styles.logPanel}>
                      {logs.length === 0 && <Text size={200}>暂无日志</Text>}
                      {logs.slice(-100).map((entry, index) => (
                        <div key={`${entry.timestamp}-${index}`} className={styles.logLine}>
                          <span className={styles.logTime}>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                          <span className={`${styles.logSource} ${entry.level === 'error' ? styles.logErr : ''}`}>{entry.source}</span>
                          <span className={`${styles.logMessage} ${entry.level === 'error' ? styles.logErr : ''}`}>{entry.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        )
      })}
    </div>
  )
}
