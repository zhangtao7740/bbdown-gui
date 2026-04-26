import { useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import { Card, Text, Button } from '@fluentui/react-components'
import { ThemeProvider } from './components/layout/ThemeProvider'
import { TitleBar } from './components/layout/TitleBar'
import { Sidebar } from './components/layout/Sidebar'
import { DownloadPage } from './components/pages/DownloadPage'
import { TasksPage } from './components/pages/TasksPage'
import { HistoryPage } from './components/pages/HistoryPage'
import { SettingsPage } from './components/pages/SettingsPage'
import { PluginsPage } from './components/pages/PluginsPage'
import { AboutPage } from './components/pages/AboutPage'
import { useAppStore, type TabValue } from './store/appStore'
import './App.css'

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--colorNeutralBackground1)' }}>
          <Card style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
            <Text size={500} weight="semibold" block style={{ marginBottom: '12px' }}>渲染出错</Text>
            <Text block style={{ marginBottom: '20px' }}>应用程序在渲染时发生了意外错误。这可能是插件冲突或数据异常导致的。</Text>
            <Button appearance="primary" onClick={() => window.location.reload()}>重新加载应用</Button>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}

const renderPage = (tab: TabValue) => {
  switch (tab) {
    case 'download':
      return <DownloadPage />
    case 'tasks':
      return <TasksPage />
    case 'history':
      return <HistoryPage />
    case 'settings':
      return <SettingsPage />
    case 'plugins':
      return <PluginsPage />
    case 'about':
      return <AboutPage />
    default:
      return <DownloadPage />
  }
}

function AppContent() {
  const { selectedTab, setSelectedTab, subscribeToTaskEvents, refreshTasks, loadSettings, refreshTools } = useAppStore()

  useEffect(() => {
    const unsubscribe = subscribeToTaskEvents()
    void loadSettings().then(async () => {
      await refreshTools()
      await refreshTasks()
    })
    return unsubscribe
  }, [subscribeToTaskEvents, refreshTasks, loadSettings, refreshTools])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <TitleBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar selectedTab={selectedTab} onTabChange={setSelectedTab} />
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {renderPage(selectedTab)}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
