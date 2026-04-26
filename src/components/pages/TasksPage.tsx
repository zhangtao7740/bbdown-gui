import { useState } from 'react'
import {
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

const useStyles = makeStyles({
  container: { padding: '20px', height: '100%', overflowY: 'auto' },
  taskItem: { marginBottom: '8px' },
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '2px 8px', borderRadius: '10px' },
  logPanel: { maxHeight: '160px', overflowY: 'auto', marginTop: '8px', padding: '6px', backgroundColor: 'var(--colorNeutralBackground3)', borderRadius: '4px', fontSize: '11px', fontFamily: 'Consolas, monospace' },
  logLine: { display: 'flex', gap: '8px', padding: '1px 0' },
  logTime: { color: 'var(--colorNeutralForeground4)', minWidth: '64px' },
  logSource: { minWidth: '44px' },
  logErr: { color: '#D13438' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: 'var(--colorNeutralForeground3)' },
})

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

export function TasksPage() {
  const styles = useStyles()
  const { tasks, taskLogs } = useAppStore()
  const [expandedLogTask, setExpandedLogTask] = useState<string | null>(null)

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
      <Text weight="semibold" size={500} block style={{ marginBottom: '20px' }}>任务队列 ({tasks.length})</Text>
      {tasks.map((task) => {
        const status = getStatus(task.status)
        const logs = taskLogs[task.id] || task.logs || []
        const isLogExpanded = expandedLogTask === task.id
        const assetTypes = [
          !task.options?.audioOnly && '视频',
          !task.options?.videoOnly && '音频',
          task.options?.downloadSubtitle && '字幕',
          task.options?.downloadDanmaku && '弹幕',
          task.options?.downloadCover && '封面',
        ].filter(Boolean).join(' / ')

        return (
          <Card key={task.id} className={styles.taskItem}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text weight="semibold" block truncate>{task.title}</Text>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span className={styles.statusBadge} style={{ backgroundColor: `${status.color}20`, color: status.color }}>{status.label}</span>
                  <Text size={200}>{assetTypes}</Text>
                  {task.options?.selectedPages?.length ? <Text size={200}>分 P：{task.options.selectedPages.length}</Text> : null}
                  {task.speed ? <Text size={200}>速度：{task.speed}</Text> : null}
                  <Text size={200}>进度：{task.progress}%</Text>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
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
                <Tooltip content="删除队列记录" relationship="label">
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
                    <span className={entry.level === 'error' ? styles.logErr : undefined}>{entry.message}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
