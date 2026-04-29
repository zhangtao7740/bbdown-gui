import { useAppStore } from '@/store/appStore'
import { Badge } from '@/components/ui'

export function StatusBar() {
  const { tasks, tools } = useAppStore()
  const activeTaskCount = tasks.filter((task) => ['waiting', 'downloading', 'processing'].includes(task.status)).length

  const bbdownExists = tools['bbdown']?.exists
  const ffmpegExists = tools['ffmpeg']?.exists

  return (
    <footer className="status-bar">
      <div className="status-bar-left">
        <div className="status-item">
          <span className={`status-indicator ${bbdownExists ? '' : 'warning'}`} />
          <span>BBDown: {bbdownExists ? '就绪' : '未检测到'}</span>
        </div>
        <div className="status-item">
          <span className={`status-indicator ${ffmpegExists ? '' : 'warning'}`} />
          <span>FFmpeg: {ffmpegExists ? '就绪' : '未检测到'}</span>
        </div>
      </div>

      <div className="status-bar-right">
        <div className="status-item">
          {activeTaskCount > 0 ? (
            <>
              <Badge variant="primary">
                {activeTaskCount} 个活动任务
              </Badge>
            </>
          ) : (
            <span>无活动任务</span>
          )}
        </div>
      </div>
    </footer>
  )
}
