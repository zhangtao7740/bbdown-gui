import { useEffect, Component, type ReactNode, type ErrorInfo } from 'react'
import { ThemeProvider } from './components/layout/ThemeProvider'
import { Button, TooltipProvider } from './components/ui'
import { WindowTitleBar } from './components/layout/WindowTitleBar'
import { SidebarNav, type TabValue } from './components/layout/SidebarNav'
import { StatusBar } from './components/layout/StatusBar'
import { DownloadPage } from './components/pages/DownloadPage'
import { TasksPage } from './components/pages/TasksPage'
import { HistoryPage } from './components/pages/HistoryPage'
import { SettingsPage } from './components/pages/SettingsPage'
import { AboutPage } from './components/pages/AboutPage'
import { useAppStore } from './store/appStore'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
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
        <div className="error-boundary">
          <div className="error-boundary-card">
            <h2 className="error-boundary-title">渲染出错</h2>
            <p className="error-boundary-desc">应用程序在渲染时发生了意外错误。这可能是插件冲突或数据异常导致的。</p>
            <Button variant="primary" onClick={() => window.location.reload()}>重新加载应用</Button>
          </div>
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
    case 'about':
      return <AboutPage />
    default:
      return <DownloadPage />
  }
}

function AppContent() {
  const { selectedTab, setSelectedTab, subscribeToTaskEvents, refreshTasks, loadSettings, refreshTools, tasks } = useAppStore()
  const activeTaskCount = tasks.filter((task) => ['waiting', 'downloading', 'processing'].includes(task.status)).length

  useGlobalShortcuts({
    currentTab: selectedTab,
    setSelectedTab,
    refreshData: refreshTasks,
  })

  useEffect(() => {
    const unsubscribe = subscribeToTaskEvents()
    void loadSettings().then(async () => {
      await refreshTools()
      await refreshTasks()
    })
    return unsubscribe
  }, [subscribeToTaskEvents, refreshTasks, loadSettings, refreshTools])

  return (
    <div className="app-shell">
      <WindowTitleBar />
      <div className="app-shell-body">
        <SidebarNav selectedTab={selectedTab} onTabChange={setSelectedTab} activeTaskCount={activeTaskCount} />
        <main className="app-shell-main">
          {renderPage(selectedTab)}
        </main>
      </div>
      <StatusBar />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </TooltipProvider>
    </ErrorBoundary>
  )
}

export default App
