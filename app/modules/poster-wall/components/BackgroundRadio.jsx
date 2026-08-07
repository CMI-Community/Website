import { useEffect, useId, useRef, useState } from 'react'

const TWITCH_PLAYER_SCRIPT = 'https://player.twitch.tv/js/embed/v1.js'
const DEFAULT_CHANNEL = 'lofigirl'
const DEFAULT_CHANNEL_URL = 'https://www.twitch.tv/lofigirl'

let twitchApiPromise

function loadTwitchApi() {
  if (window.Twitch?.Player) return Promise.resolve(window.Twitch)
  if (twitchApiPromise) return twitchApiPromise

  twitchApiPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${TWITCH_PLAYER_SCRIPT}"]`)
    const script = existingScript || document.createElement('script')
    script.src = TWITCH_PLAYER_SCRIPT
    script.async = true
    script.onload = () => resolve(window.Twitch)
    script.onerror = () => reject(new Error('Twitch player failed to load'))
    if (!existingScript) document.head.appendChild(script)
  }).catch((error) => {
    twitchApiPromise = undefined
    throw error
  })

  return twitchApiPromise
}

export function BackgroundRadio({
  channel = DEFAULT_CHANNEL,
  channelUrl = DEFAULT_CHANNEL_URL,
}) {
  const reactId = useId()
  const playerId = `cmi-lofi-player-${reactId.replaceAll(':', '')}`
  const playerRef = useRef(null)
  const volumeRef = useRef(28)
  const [open, setOpen] = useState(false)
  const [activated, setActivated] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(28)

  useEffect(() => {
    if (!activated) return undefined
    let cancelled = false

    setLoaded(false)
    setLoadError(false)
    loadTwitchApi()
      .then((Twitch) => {
        if (cancelled) return
        const player = new Twitch.Player(playerId, {
          channel,
          width: '100%',
          height: '100%',
          parent: [window.location.hostname],
          autoplay: true,
          muted: false,
        })
        playerRef.current = player
        player.addEventListener(Twitch.Player.READY, () => {
          if (cancelled) return
          player.setVolume(volumeRef.current / 100)
          player.play()
          setLoaded(true)
        })
        player.addEventListener(Twitch.Player.PLAY, () => setPlaying(true))
        player.addEventListener(Twitch.Player.PAUSE, () => setPlaying(false))
        player.addEventListener(Twitch.Player.PLAYBACK_BLOCKED, () => setPlaying(false))
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
      try {
        playerRef.current?.pause()
      } catch {
        // The remote player may already have been removed.
      }
      playerRef.current = null
      const mount = document.getElementById(playerId)
      if (mount) mount.replaceChildren()
    }
  }, [activated, channel, playerId])

  const openRadio = () => {
    setActivated(true)
    setOpen(true)
  }

  const closeRadio = () => {
    setOpen(false)
  }

  const togglePlayback = () => {
    const nextPlaying = !playing
    setPlaying(nextPlaying)
    if (nextPlaying) playerRef.current?.play()
    else playerRef.current?.pause()
  }

  const updateVolume = (event) => {
    const nextVolume = Number(event.target.value)
    setVolume(nextVolume)
    volumeRef.current = nextVolume
    playerRef.current?.setVolume(nextVolume / 100)
  }

  return (
    <div className="cmi-radio">
      <button
        className="cmi-radio-entry"
        type="button"
        onClick={open ? closeRadio : openRadio}
        aria-expanded={open}
        aria-controls="cmi-lofi-radio"
        title={open
          ? '收起 Lofi 控制窗口，继续后台播放'
          : playing
            ? '打开 Lofi 控制窗口（正在播放）'
            : '打开 Lofi Girl 背景音乐'}
      >
        <span className={playing ? 'is-live' : ''} aria-hidden="true">
          <i /><i /><i />
        </span>
        <b>LOFI</b>
      </button>

      {activated && (
        <section
          className={`cmi-radio-player ${open ? 'is-open' : 'is-collapsed'}`}
          id="cmi-lofi-radio"
          aria-label="Lofi Girl 背景电台"
          aria-hidden={!open}
          inert={open ? undefined : ''}
        >
          <header>
            <div>
              <span><i aria-hidden="true" /> LIVE RADIO</span>
              <strong>Lofi Girl</strong>
              <small>lofi hip hop · relax / study</small>
            </div>
            <button type="button" onClick={closeRadio} aria-label="收起播放器并继续后台播放">×</button>
          </header>

          <div className="cmi-radio-player__screen">
            {!loaded && !loadError && <p>正在连接官方频道…</p>}
            {loadError && (
              <p className="cmi-radio-player__error">
                频道暂时无法嵌入<br />
                <a href={channelUrl} target="_blank" rel="noreferrer">前往 Lofi Girl 官方频道 ↗</a>
              </p>
            )}
            <div id={playerId} />
          </div>

          <div className="cmi-radio-player__controls">
            <button type="button" onClick={togglePlayback} disabled={!loaded} aria-label={playing ? '暂停背景音乐' : '播放背景音乐'}>
              <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>
              {playing ? '暂停' : '播放'}
            </button>
            <label>
              <span>音量</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={volume}
                onChange={updateVolume}
                aria-label="背景音乐音量"
                disabled={!loaded}
              />
            </label>
            <a href={channelUrl} target="_blank" rel="noreferrer">
              官方频道 <span aria-hidden="true">↗</span>
            </a>
          </div>
        </section>
      )}
    </div>
  )
}
