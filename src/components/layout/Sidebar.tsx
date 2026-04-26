import { Tab, TabList } from '@fluentui/react-components'
import {
  ArrowDownload20Regular,
  TaskListLtr20Regular,
  History20Regular,
  Settings20Regular,
  PlugDisconnected20Regular,
  Info20Regular,
} from '@fluentui/react-icons'

type TabValue = 'download' | 'tasks' | 'history' | 'settings' | 'plugins' | 'about'

interface SidebarProps {
  selectedTab: TabValue
  onTabChange: (tab: TabValue) => void
}

const tabs = [
  { value: 'download' as TabValue, label: '涓嬭浇', icon: <ArrowDownload20Regular /> },
  { value: 'tasks' as TabValue, label: '浠诲姟鍒楄〃', icon: <TaskListLtr20Regular /> },
  { value: 'history' as TabValue, label: '鍘嗗彶璁板綍', icon: <History20Regular /> },
  { value: 'settings' as TabValue, label: '璁剧疆', icon: <Settings20Regular /> },
  { value: 'plugins' as TabValue, label: '鎻掍欢鎵╁睍', icon: <PlugDisconnected20Regular /> },
  { value: 'about' as TabValue, label: '鍏充簬', icon: <Info20Regular /> },
]

export function Sidebar({ selectedTab, onTabChange }: SidebarProps) {
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
            {tab.label}
          </Tab>
        ))}
      </TabList>

      <div style={{ marginTop: 'auto', padding: '16px 8px' }}>
        <div style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3)' }}>
          BBDown GUI v0.1.2
        </div>
      </div>
    </div>
  )
}
