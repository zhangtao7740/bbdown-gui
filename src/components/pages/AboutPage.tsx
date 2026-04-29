import { useState } from 'react'
import { Copy, CheckCircle2, XCircle, ExternalLink } from 'lucide-react'
import { Button, Tooltip } from '@/components/ui'
import { useAppStore } from '@/store/appStore'
import { APP_VERSION } from '@/lib/appInfo'
import { api, isRunningInElectron } from '@/lib/runtime'
import appMarkAsset from '@/assets/app-mark.svg'
import './AboutPage.css'

export function AboutPage() {
  const { tools } = useAppStore()
  const isElectron = isRunningInElectron()
  const [copied, setCopied] = useState(false)

  const platform = typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'
  const electronVersion =
    typeof navigator !== 'undefined'
      ? navigator.userAgent.match(/Electron\/([\d.]+)/)?.[1] || 'N/A'
      : 'N/A'

  const diagnosticInfo = `BBDown GUI v${APP_VERSION}
Electron: ${electronVersion}
Platform: ${platform}
BBDown: ${tools.bbdown?.exists ? `v${tools.bbdown.version} (${tools.bbdown.path || 'system'})` : 'Not found'}
FFmpeg: ${tools.ffmpeg?.exists ? `v${tools.ffmpeg.version} (${tools.ffmpeg.path || 'system'})` : 'Not found'}
aria2c: ${tools.aria2c?.exists ? `v${tools.aria2c.version} (${tools.aria2c.path || 'system'})` : 'Not found'}`

  const handleCopyDiagnostic = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticInfo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard not available
    }
  }

  const openLink = async (url: string) => {
    if (isElectron) {
      await api.util.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return (
    <div className="about-page">
      <div className="about-card">
        <img src={appMarkAsset} alt="" className="about-app-mark" />
        <h1 className="about-title">BBDown GUI</h1>
        <p className="about-version">版本 {APP_VERSION}</p>
        <p className="about-description">基于 Electron + React 构建的 Bilibili 下载工具图形界面</p>

        <div className="about-section">
          <h2 className="about-section-title">版本信息</h2>
          <div className="about-info-row">
            <span className="about-info-label">应用版本</span>
            <span className="about-info-value">{APP_VERSION}</span>
          </div>
          <div className="about-info-row">
            <span className="about-info-label">Electron</span>
            <span className="about-info-value">{electronVersion}</span>
          </div>
          <div className="about-info-row">
            <span className="about-info-label">平台</span>
            <span className="about-info-value">{platform}</span>
          </div>
        </div>

        <div className="about-section">
          <h2 className="about-section-title">工具状态</h2>
          <div className="about-info-row">
            <span className="about-info-label">BBDown</span>
            <div className="about-tool-status">
              {tools.bbdown?.exists ? (
                <>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span className="about-info-value">v{tools.bbdown.version}</span>
                </>
              ) : (
                <>
                  <XCircle size={14} style={{ color: 'var(--color-danger)' }} />
                  <span className="about-info-value" style={{ color: 'var(--color-danger)' }}>未检测到</span>
                </>
              )}
            </div>
          </div>
          <div className="about-info-row">
            <span className="about-info-label">FFmpeg</span>
            <div className="about-tool-status">
              {tools.ffmpeg?.exists ? (
                <>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span className="about-info-value">v{tools.ffmpeg.version}</span>
                </>
              ) : (
                <>
                  <XCircle size={14} style={{ color: 'var(--color-danger)' }} />
                  <span className="about-info-value" style={{ color: 'var(--color-danger)' }}>未检测到</span>
                </>
              )}
            </div>
          </div>
          <div className="about-info-row">
            <span className="about-info-label">aria2c</span>
            <div className="about-tool-status">
              {tools.aria2c?.exists ? (
                <>
                  <CheckCircle2 size={14} style={{ color: 'var(--color-success)' }} />
                  <span className="about-info-value">v{tools.aria2c.version}</span>
                </>
              ) : (
                <>
                  <XCircle size={14} style={{ color: 'var(--color-warning)' }} />
                  <span className="about-info-value" style={{ color: 'var(--color-warning)' }}>可选</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="about-diagnostic">
          <div className="about-diagnostic-text">{diagnosticInfo}</div>
          <Button variant="primary" onClick={handleCopyDiagnostic}>
            {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
            <span>{copied ? '已复制' : '复制诊断信息'}</span>
          </Button>
        </div>

        <div className="about-links">
          <Tooltip content="打开 BBDown GUI GitHub 仓库">
            <span className="about-link" onClick={() => openLink('https://github.com/zhangtao7740/bbdown-gui')}>
              <ExternalLink size={14} />
              <span>BBDown GUI 仓库</span>
            </span>
          </Tooltip>
          <Tooltip content="提交问题反馈">
            <span className="about-link" onClick={() => openLink('https://github.com/zhangtao7740/bbdown-gui/issues')}>
              <ExternalLink size={14} />
              <span>问题反馈</span>
            </span>
          </Tooltip>
          <Tooltip content="查看许可证">
            <span className="about-link" onClick={() => openLink('https://github.com/zhangtao7740/bbdown-gui/blob/main/LICENSE')}>
              <ExternalLink size={14} />
              <span>MIT 许可证</span>
            </span>
          </Tooltip>
          <Tooltip content="打开 BBDown GitHub 仓库">
            <span className="about-link" onClick={() => openLink('https://github.com/nilaoda/BBDown')}>
              <ExternalLink size={14} />
              <span>BBDown 官方仓库</span>
            </span>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}
