import { Text, Card } from '@fluentui/react-components'
import { TaskListLtr20Regular } from '@fluentui/react-icons'

export function TasksPage() {
  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <TaskListLtr20Regular style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--colorNeutralForeground3)' }} />
          <Text size={400}>任务列表</Text>
          <Text size={200} block style={{ marginTop: '8px', color: 'var(--colorNeutralForeground3)' }}>
            显示所有下载任务
          </Text>
        </div>
      </Card>
    </div>
  )
}
