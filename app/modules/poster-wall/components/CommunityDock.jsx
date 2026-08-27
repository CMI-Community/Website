import { useEffect, useRef, useState } from 'react'
import { COMMUNITY_LINKS } from '../../../shared/community-socials'

const DEFAULT_LINKS = {
  ...COMMUNITY_LINKS,
}

function DockIcon({ type }) {
  if (type === 'discord') return <span className="cmi-community-dock__monogram">D+</span>
  if (type === 'bilibili') return <span className="cmi-community-dock__monogram">B</span>
  if (type === 'official') return <span className="cmi-community-dock__monogram">CMI</span>
  if (type === 'xiaohongshu') return <span className="cmi-community-dock__monogram">RED</span>
  if (type === 'reddit') return <span className="cmi-community-dock__monogram">r/</span>
  if (type === 'github') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.88c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.82a9.5 9.5 0 0 1 2.5.34c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9.4 4.2C5.3 4.2 2 6.9 2 10.3c0 2 1.1 3.7 2.9 4.8l-.7 2.5 2.9-1.5c.7.2 1.5.3 2.3.3 4.1 0 7.4-2.7 7.4-6.1S13.5 4.2 9.4 4.2Zm-2.5 4a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm5.1 0a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Zm9.9 7.3c0-2.8-2.4-5.1-5.5-5.4v.2c0 3.7-3.1 6.7-7 7.1.8 2 3.1 3.4 5.8 3.4.7 0 1.4-.1 2-.3l2.4 1.2-.6-2.1c1.8-.9 2.9-2.4 2.9-4.1Zm-8-1.8a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Zm4.3 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Z" />
    </svg>
  )
}

export function CommunityDock({ qrUrl, links = DEFAULT_LINKS }) {
  const [qrOpen, setQrOpen] = useState(false)
  const [copyState, setCopyState] = useState('')
  const dockRef = useRef(null)
  const socialLinks = { ...DEFAULT_LINKS, ...links }

  useEffect(() => {
    if (!copyState) return undefined
    const timer = window.setTimeout(() => setCopyState(''), 2200)
    return () => window.clearTimeout(timer)
  }, [copyState])

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (qrOpen && !dockRef.current?.contains(event.target)) setQrOpen(false)
    }
    window.addEventListener('pointerdown', closeOnOutsideClick)
    return () => window.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [qrOpen])

  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText(socialLinks.wechat)
      setCopyState('已复制微信号')
    } catch {
      setCopyState(`微信号：${socialLinks.wechat}`)
    }
  }

  return (
    <nav className="cmi-community-dock" aria-label="找到 CMI 社区" ref={dockRef}>
      <div className="cmi-community-dock__label">找到 CMI</div>
      <div className="cmi-community-dock__items">
        <button type="button" className="cmi-community-dock__item" onClick={() => setQrOpen((value) => !value)} aria-expanded={qrOpen}>
          <DockIcon type="official" />
          <span><b>公众号</b><small>C M I</small></span>
        </button>
        <a className="cmi-community-dock__item" href={socialLinks.xiaohongshu} target="_blank" rel="noreferrer">
          <DockIcon type="xiaohongshu" />
          <span><b>小红书</b><small>CMI 清迈数字游民社区</small></span>
        </a>
        <a className="cmi-community-dock__item" href={socialLinks.bilibili} target="_blank" rel="noreferrer">
          <DockIcon type="bilibili" />
          <span><b>Bilibili</b><small>CMI 影像频道</small></span>
        </a>
        <button type="button" className="cmi-community-dock__item" onClick={copyWechat}>
          <DockIcon type="wechat" />
          <span><b>微信联系</b><small>{socialLinks.wechat}</small></span>
        </button>
        <a className="cmi-community-dock__item" href={socialLinks.github} target="_blank" rel="noreferrer">
          <DockIcon type="github" />
          <span><b>GitHub</b><small>CMI-Community</small></span>
        </a>
        <a className="cmi-community-dock__item" href={socialLinks.reddit} target="_blank" rel="noreferrer">
          <DockIcon type="reddit" />
          <span><b>Reddit</b><small>r/CMI_Community</small></span>
        </a>
        <a className="cmi-community-dock__item" href={socialLinks.discord} target="_blank" rel="noreferrer">
          <DockIcon type="discord" />
          <span><b>Discord</b><small>社区群聊</small></span>
        </a>
      </div>

      {qrOpen && (
        <div className="cmi-community-dock__qr" role="dialog" aria-label="CMI 公众号二维码">
          <img src={qrUrl} alt="CMI 公众号关注二维码" />
          <div><b>微信扫码关注</b><span>公众号 · C M I</span></div>
          <button type="button" aria-label="关闭二维码" onClick={() => setQrOpen(false)}>×</button>
        </div>
      )}
      {copyState && <p className="cmi-community-dock__toast" role="status">{copyState}</p>}
    </nav>
  )
}
