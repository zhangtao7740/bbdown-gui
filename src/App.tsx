import { useEffect } from 'react'
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
  const { selectedTab, setSelectedTab, subscribeToTaskEvents, refreshTasks } = useAppStore()

  useEffect(() => {
    const unsubscribe = subscribeToTaskEvents()
    refreshTasks()
    return unsubscribe
  }, [subscribeToTaskEvents, refreshTasks])

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
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
