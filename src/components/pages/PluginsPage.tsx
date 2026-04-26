import { Text, Card } from '@fluentui/react-components'
import { PlugDisconnected20Regular } from '@fluentui/react-icons'

export function PluginsPage() {
  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <PlugDisconnected20Regular style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--colorNeutralForeground3)' }} />
          <Text size={400}>插件扩展</Text>
          <Text size={200} block style={{ marginTop: '8px', color: 'var(--colorNeutralForeground3)' }}>
            插件系统开发中
          </Text>
        </div>
      </Card>
    </div>
  )
}
