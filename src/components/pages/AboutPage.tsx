import { Text, Card, Link } from '@fluentui/react-components'
import { Info20Regular } from '@fluentui/react-icons'
import { APP_VERSION } from '@/lib/appInfo'

export function AboutPage() {
  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Info20Regular style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--colorNeutralForeground3)' }} />
          <Text size={500} weight="semibold" block>BBDown GUI</Text>
          <Text size={300} block style={{ marginTop: '8px', color: 'var(--colorNeutralForeground3)' }}>
            版本 {APP_VERSION}
          </Text>
          <Text size={200} block style={{ marginTop: '16px', color: 'var(--colorNeutralForeground3)' }}>
            基于 Electron + React + Fluent UI 构建
          </Text>
          <div style={{ marginTop: '20px' }}>
            <Link href="https://github.com/nilaoda/BBDown" target="_blank">
              BBDown 官方仓库
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
