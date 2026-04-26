import { Badge, Tab, TabList } from '@fluentui/react-components'
import {
  ArrowDownload20Regular,
  TaskListLtr20Regular,
  History20Regular,
  Settings20Regular,
  PlugDisconnected20Regular,
  Info20Regular,
} from '@fluentui/react-icons'
import { APP_VERSION } from '@/lib/appInfo'

type TabValue = 'download' | 'tasks' | 'history' | 'settings' | 'plugins' | 'about'

interface SidebarProps {
  selectedTab: TabValue
  onTabChange: (tab: TabValue) => void
  activeTaskCount: number
}

const tabs = [
  { value: 'download' as TabValue, label: '下载', icon: <ArrowDownload20Regular /> },
  { value: 'tasks' as TabValue, label: '任务列表', icon: <TaskListLtr20Regular /> },
  { value: 'history' as TabValue, label: '历史记录', icon: <History20Regular /> },
  { value: 'settings' as TabValue, label: '设置', icon: <Settings20Regular /> },
  { value: 'plugins' as TabValue, label: '插件扩展', icon: <PlugDisconnected20Regular /> },
  { value: 'about' as TabValue, label: '关于', icon: <Info20Regular /> },
]

export function Sidebar({ selectedTab, onTabChange, activeTaskCount }: SidebarProps) {
  return (
    <div
      style={{
        width: '180px',
        height: '100%',
        padding: '8px',
        borderRight: '1px solid var(--colorNeutralStroke2)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_, data) => onTabChange(data.value as TabValue)}
        vertical
        size="large"
      >
        {tabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} icon={tab.icon}>
            {tab.value === 'tasks' ? (
              <span
                key={activeTaskCount}
                className={activeTaskCount > 0 ? 'task-tab-pulse' : undefined}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span>{tab.label}</span>
                {activeTaskCount > 0 && (
                  <Badge appearance="filled" color="danger" size="small">
                    {activeTaskCount > 99 ? '99+' : activeTaskCount}
                  </Badge>
                )}
              </span>
            ) : tab.label}
          </Tab>
        ))}
      </TabList>

      <div style={{ marginTop: 'auto', padding: '16px 8px' }}>
        <div style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>
          BBDown GUI v{APP_VERSION}
        </div>
      </div>
    </div>
  )
}
