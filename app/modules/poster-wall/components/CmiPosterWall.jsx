import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BackgroundRadio } from './BackgroundRadio.jsx'
import { CommunityDock } from './CommunityDock.jsx'
import { FeedbackPanel } from './FeedbackPanel.jsx'
import { createFeedbackRepository } from './feedbackRepository.js'

const DIRECTIONS = [
  { value: 'left', label: '向左', glyph: '←' },
  { value: 'right', label: '向右', glyph: '→' },
  { value: 'up', label: '向上', glyph: '↑' },
  { value: 'down', label: '向下', glyph: '↓' },
]

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function boundedNumber(value, fallback, min, max) {
  const number = Number(value)
  return Number.isFinite(number) ? clamp(number, min, max) : fallback
}

function randomSample(items, limit) {
  const pool = [...items]
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
  }
  return pool.slice(0, limit)
}

function useElementSize(ref) {
  const [size, setSize] = useState({ width: 1280, height: 800 })

  useEffect(() => {
    if (!ref.current) return undefined
    const update = () => {
      const rect = ref.current.getBoundingClientRect()
      setSize({ width: rect.width, height: rect.height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [ref])

  return size
}

function getPosterUrl(poster, assetBase) {
  const base = assetBase.endsWith('/') ? assetBase : `${assetBase}/`
  return `${base}${poster.imagePath}`
}

function splitIntoLanes(items, count) {
  const lanes = Array.from({ length: count }, () => [])
  items.forEach((item, index) => lanes[index % count].push(item))
  return lanes
}

function PosterTile({ poster, assetBase, onSelect, index, eager = false }) {
  return (
    <button
      className="cmi-poster-tile"
      type="button"
      onClick={() => onSelect(poster)}
      aria-label={`查看海报：${poster.title}`}
      data-poster-key={poster.id}
      style={{ '--tile-index': index }}
    >
      <span className="cmi-poster-tile__image-wrap">
        <img
          src={getPosterUrl(poster, assetBase)}
          alt={poster.title}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          draggable="false"
        />
      </span>
      <span className="cmi-poster-tile__meta" aria-hidden="true">
        <span>{poster.publishedDate.slice(0, 4)}</span>
        <span>{poster.series.name}</span>
      </span>
    </button>
  )
}

function FlowWall({ posters, assetBase, direction, speed, paused, onSelect, size }) {
  const vertical = direction === 'up' || direction === 'down'
  const laneCount = vertical
    ? clamp(Math.ceil(size.width / 190), 3, 8)
    : clamp(Math.ceil(size.height / 215), 3, 5)
  const lanes = useMemo(() => splitIntoLanes(posters, laneCount), [posters, laneCount])

  return (
    <div
      className={`cmi-flow-wall cmi-flow-wall--${vertical ? 'vertical' : 'horizontal'} cmi-flow-wall--${direction}`}
      data-paused={paused ? 'true' : 'false'}
      aria-label={`流动海报墙，${DIRECTIONS.find((item) => item.value === direction)?.label}`}
    >
      {lanes.map((lane, laneIndex) => (
        <div className="cmi-flow-lane" key={`${direction}-${laneIndex}`}>
          <div
            className="cmi-flow-track"
            style={{
              '--duration': `${(72 + laneIndex * 13) / speed}s`,
              '--lane-delay': `${laneIndex * -7.3}s`,
            }}
          >
            {[0, 1].map((repeat) => (
              <div className="cmi-flow-set" key={repeat} aria-hidden={repeat === 1 ? 'true' : undefined}>
                {lane.map((poster, posterIndex) => (
                  <PosterTile
                    key={`${repeat}-${poster.id}`}
                    poster={poster}
                    assetBase={assetBase}
                    onSelect={onSelect}
                    index={laneIndex * 20 + posterIndex}
                    eager={repeat === 0 && posterIndex < 2}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function FlipWall({ posters, assetBase, paused, onSelect, size, frequency, flipSpeed, probability, batchSize }) {
  const compact = size.width < 720
  const gap = compact ? 3 : 5
  const horizontalPadding = compact ? 8 : 14
  const columns = clamp(Math.round(size.width / (compact ? 104 : 160)), 3, 10)
  const estimatedCellWidth = (size.width - horizontalPadding - gap * (columns - 1)) / columns
  const availableHeight = Math.max(300, size.height - (compact ? 216 : 146))
  const rows = clamp(Math.round(availableHeight / (estimatedCellWidth / 0.75)), 3, 6)
  const count = columns * rows
  const safeFrequency = boundedNumber(frequency, 72, 30, 120)
  const safeFlipSpeed = boundedNumber(flipSpeed, 1, 0.5, 2)
  const safeProbability = boundedNumber(probability, 18, 5, 45)
  const safeBatchSize = Math.round(boundedNumber(batchSize, 3, 1, 8))
  const flipDuration = clamp(Math.round(900 / safeFlipSpeed), 380, 1800)
  const [cells, setCells] = useState(() => [])
  const cellsRef = useRef(cells)

  useEffect(() => {
    const next = Array.from({ length: count }, (_, index) => ({
      front: Math.floor((index * posters.length) / count) % posters.length,
      back: (Math.floor((index * posters.length) / count) + Math.ceil(posters.length / 2)) % posters.length,
      flipping: false,
      turn: 0,
    }))
    cellsRef.current = next
    setCells(next)
  }, [count, posters.length])

  useEffect(() => {
    cellsRef.current = cells
  }, [cells])

  useEffect(() => {
    if (paused || !cells.length || !posters.length) return undefined
    let timer
    let active = true

    const schedule = (retrySoon = false) => {
      const baseDelay = 60000 / safeFrequency
      const jitteredDelay = retrySoon
        ? Math.min(180, baseDelay * 0.28)
        : baseDelay * (0.86 + Math.random() * 0.28)
      timer = window.setTimeout(() => {
        if (!active) return
        const available = cellsRef.current
          .map((cell, index) => ({ cell, index }))
          .filter(({ cell }) => !cell.flipping)
        const activeCount = cellsRef.current.length - available.length
        const openSlots = Math.max(0, safeBatchSize - activeCount)
        if (!available.length || !openSlots) {
          schedule(true)
          return
        }

        const selected = randomSample(
          available.filter(() => Math.random() < safeProbability / 100),
          openSlots,
        )

        if (!selected.length) {
          schedule()
          return
        }

        const usedPosters = new Set()
        const flips = selected.map(({ cell, index }) => {
          const visiblePoster = cell.turn % 2 === 0 ? cell.front : cell.back
          let nextPoster = Math.floor(Math.random() * posters.length)
          let attempts = 0
          while ((nextPoster === visiblePoster || usedPosters.has(nextPoster)) && attempts < 8) {
            nextPoster = (nextPoster + 1 + Math.floor(Math.random() * 7)) % posters.length
            attempts += 1
          }
          usedPosters.add(nextPoster)
          return { index, nextPoster, targetTurn: cell.turn + 1 }
        })
        const flipsByIndex = new Map(flips.map((flip) => [flip.index, flip]))

        setCells((currentCells) => {
          const nextCells = currentCells.map((cell, index) => {
            const flip = flipsByIndex.get(index)
            if (!flip || cell.flipping) return cell
            return cell.turn % 2 === 0
              ? { ...cell, back: flip.nextPoster, flipping: true, turn: flip.targetTurn }
              : { ...cell, front: flip.nextPoster, flipping: true, turn: flip.targetTurn }
          })
          cellsRef.current = nextCells
          return nextCells
        })

        flips.forEach(({ index: selectedIndex, targetTurn }) => {
          window.setTimeout(() => {
            setCells((currentCells) => {
              const nextCells = currentCells.map((cell, index) =>
                index === selectedIndex && cell.turn === targetTurn ? { ...cell, flipping: false } : cell,
              )
              cellsRef.current = nextCells
              return nextCells
            })
          }, flipDuration + 80)
        })
        schedule()
      }, jitteredDelay)
    }

    schedule()
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [paused, posters, cells.length, safeFrequency, safeProbability, safeBatchSize, flipDuration])

  const activeCount = cells.filter((cell) => cell.flipping).length

  return (
    <div
      className="cmi-flip-wall"
      style={{ '--flip-columns': columns, '--flip-rows': rows, '--flip-duration': `${flipDuration}ms` }}
      data-paused={paused ? 'true' : 'false'}
      data-active-count={activeCount}
      data-probability={safeProbability}
      data-batch-size={safeBatchSize}
      aria-label={`动态翻转静态海报墙，每分钟 ${safeFrequency} 个节拍，单卡概率 ${safeProbability}%，最多同时翻动 ${safeBatchSize} 张，速度 ${safeFlipSpeed} 倍`}
    >
      {cells.map((cell, index) => {
        const front = posters[cell.front % posters.length]
        const back = posters[cell.back % posters.length]
        const visible = cell.turn % 2 === 0 ? front : back
        if (!front || !back) return null
        return (
          <button
            className={`cmi-flip-cell ${cell.flipping ? 'is-flipping' : ''}`}
            type="button"
            key={index}
            onClick={() => onSelect(visible)}
            aria-label={`查看海报：${visible.title}`}
            data-poster-key={visible.id}
            data-turn={cell.turn}
          >
            <span
              className="cmi-flip-cell__inner"
              style={{ '--flip-rotation': `${cell.turn * 180}deg` }}
            >
              <span className="cmi-flip-cell__face cmi-flip-cell__front">
                <img src={getPosterUrl(front, assetBase)} alt="" loading={index < columns * 2 ? 'eager' : 'lazy'} />
              </span>
              <span className="cmi-flip-cell__face cmi-flip-cell__back">
                <img src={getPosterUrl(back, assetBase)} alt="" loading="lazy" />
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function DetailDrawer({ poster, assetBase, onClose }) {
  const drawerRef = useRef(null)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    drawerRef.current?.focus()
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  if (!poster) return null
  const issueLabel = poster.series.issue ? `第 ${poster.series.issue} 期` : '社区活动'

  return (
    <div className="cmi-detail-layer">
      <button className="cmi-detail-backdrop" type="button" aria-label="关闭详情" onClick={onClose} />
      <aside
        className="cmi-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmi-detail-title"
        tabIndex="-1"
        ref={drawerRef}
      >
        <header className="cmi-detail__header">
          <p>CMI LIVING ARCHIVE</p>
          <button type="button" onClick={onClose} aria-label="关闭海报详情">
            <span>关闭</span>
            <b aria-hidden="true">×</b>
          </button>
        </header>

        <figure className="cmi-detail__poster">
          <img src={getPosterUrl(poster, assetBase)} alt={poster.title} />
          <figcaption>
            档案编号<br />{poster.id}
          </figcaption>
        </figure>

        <div className="cmi-detail__content">
          <div className="cmi-detail__kicker">
            <span>{poster.publishedDate.replaceAll('-', '.')}</span>
            <span>{poster.category}</span>
          </div>
          <h2 id="cmi-detail-title">{poster.title}</h2>

          <dl className="cmi-detail__facts">
            <div>
              <dt>活动时间</dt>
              <dd>{poster.eventTime}</dd>
            </div>
            <div>
              <dt>发起 / 组织</dt>
              <dd>{poster.initiator}</dd>
            </div>
            <div>
              <dt>系列</dt>
              <dd>{poster.series.name} · {issueLabel}</dd>
            </div>
            <div>
              <dt>微信发布</dt>
              <dd>{poster.publishedAt}</dd>
            </div>
          </dl>

          <section className="cmi-detail__section">
            <p className="cmi-detail__eyebrow">内容提要 / ABSTRACT</p>
            <p className="cmi-detail__summary">{poster.summary}</p>
          </section>

          <a className="cmi-detail__source" href={poster.articleUrl} target="_blank" rel="noreferrer">
            <span>打开微信原文</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </aside>
    </div>
  )
}

/**
 * 可独立嵌入的 CMI 社区历史海报墙。
 *
 * @param {object} props
 * @param {Array<object>} props.posters 海报数据；图片文件名是每条数据的主键。
 * @param {string} props.assetBase 优化后海报图片的公共路径。
 * @param {string} [props.logoUrl='/brand/cmi-community-logo.png'] CMI 社区 Logo 的公共路径。
 * @param {'flow'|'flip'} [props.initialMode='flow'] 初始显示模式。
 * @param {'left'|'right'|'up'|'down'} [props.initialDirection='left'] 初始流动方向。
 * @param {number} [props.initialSpeed=1] 初始速度倍率。
 * @param {number} [props.initialFlipFrequency=72] 翻转墙每分钟的概率检查节拍数。
 * @param {number} [props.initialFlipSpeed=1] 翻转动画速度倍率。
 * @param {number} [props.initialFlipProbability=18] 每个节拍中，单张卡片触发翻动的概率百分比。
 * @param {number} [props.initialFlipBatchSize=3] 同一时刻允许翻动的最大卡片数。
 * @param {string} [props.officialAccountQrUrl='/social/cmi-official-account-qr.jpg'] CMI 公众号二维码。
 * @param {object} [props.socialLinks] 社区外部入口，可覆盖小红书、Reddit、GitHub 与微信号。
 * @param {object} [props.feedbackRepository] 留言数据适配器；未传入时连接同域 Cloudflare D1 API。
 * @param {boolean} [props.showCommunityLinks=true] 是否展示左下角社区入口。
 * @param {boolean} [props.showFeedback=true] 是否展示导航栏留言入口。
 * @param {boolean} [props.showBackgroundRadio=true] 是否展示 Lofi Girl 背景电台入口。
 * @param {string} [props.lofiChannel='lofigirl'] Lofi Girl 官方 Twitch 频道名。
 * @param {string} [props.lofiChannelUrl='https://www.twitch.tv/lofigirl'] 官方频道链接。
 * @param {boolean} [props.showControls=true] 是否展示内置控制器。
 * @param {string|number} [props.height='100svh'] 组件高度，可在官网板块中设为 `720px` 等值。
 * @param {(poster: object) => void} [props.onPosterSelect] 海报打开回调。
 */
export function CmiPosterWall({
  posters,
  assetBase = '/posters/',
  logoUrl = '/brand/cmi-community-logo.png',
  initialMode = 'flow',
  initialDirection = 'left',
  initialSpeed = 1,
  initialFlipFrequency = 72,
  initialFlipSpeed = 1,
  initialFlipProbability = 18,
  initialFlipBatchSize = 3,
  officialAccountQrUrl = '/social/cmi-official-account-qr.jpg',
  socialLinks,
  feedbackRepository,
  showCommunityLinks = true,
  showFeedback = true,
  showBackgroundRadio = true,
  lofiChannel = 'lofigirl',
  lofiChannelUrl = 'https://www.twitch.tv/lofigirl',
  showControls = true,
  height = '100svh',
  onPosterSelect,
  className = '',
}) {
  const rootRef = useRef(null)
  const size = useElementSize(rootRef)
  const [mode, setMode] = useState(initialMode)
  const [direction, setDirection] = useState(initialDirection)
  const [speed, setSpeed] = useState(() => boundedNumber(initialSpeed, 1, 0.55, 1.8))
  const [flipFrequency, setFlipFrequency] = useState(() => boundedNumber(initialFlipFrequency, 72, 30, 120))
  const [flipSpeed, setFlipSpeed] = useState(() => boundedNumber(initialFlipSpeed, 1, 0.5, 2))
  const [flipProbability, setFlipProbability] = useState(() =>
    boundedNumber(initialFlipProbability, 18, 5, 45),
  )
  const [flipBatchSize, setFlipBatchSize] = useState(() =>
    Math.round(boundedNumber(initialFlipBatchSize, 3, 1, 8)),
  )
  const [paused, setPaused] = useState(false)
  const [selected, setSelected] = useState(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)

  const resolvedFeedbackRepository = useMemo(
    () => feedbackRepository || createFeedbackRepository(),
    [feedbackRepository],
  )

  const orderedPosters = useMemo(
    () => [...posters].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    [posters],
  )

  const selectPoster = useCallback((poster) => {
    setFeedbackOpen(false)
    setControlsOpen(false)
    setSelected(poster)
    onPosterSelect?.(poster)
  }, [onPosterSelect])

  const openFeedback = () => {
    setSelected(null)
    setControlsOpen(false)
    setFeedbackOpen(true)
  }

  const closeFeedback = useCallback(() => setFeedbackOpen(false), [])
  const closeDetail = useCallback(() => setSelected(null), [])

  return (
    <section
      className={`cmi-poster-wall ${className}`}
      ref={rootRef}
      style={{ height }}
      data-mode={mode}
      aria-label="CMI Community Event Poster Museum 海报墙"
    >
      <div className="cmi-poster-wall__grain" aria-hidden="true" />
      <header className="cmi-archive-head">
        <div className="cmi-archive-head__brand">
          <img src={logoUrl} alt="CMI 社区 Logo" />
          <h1 aria-label="CMI Community｜Event Poster Museum，2023–2026">
            <span className="cmi-archive-head__main-title">
              <span className="cmi-archive-head__name">CMI Community</span>
              <span className="cmi-archive-head__divider" aria-hidden="true" />
              <span className="cmi-archive-head__title">Event Poster Museum</span>
            </span>
            <span className="cmi-archive-head__years">2023–2026</span>
          </h1>
        </div>
        <div className="cmi-archive-head__actions">
          {showBackgroundRadio && (
            <BackgroundRadio channel={lofiChannel} channelUrl={lofiChannelUrl} />
          )}
          {showFeedback && (
            <button
              className="cmi-feedback-entry"
              type="button"
              onClick={feedbackOpen ? closeFeedback : openFeedback}
              aria-expanded={feedbackOpen}
              aria-controls="cmi-feedback-title"
            >
              <span aria-hidden="true">＋</span>
              留言
            </button>
          )}
        </div>
      </header>

      {showControls && (
        <>
          {controlsOpen && (
            <button
              className="cmi-controls-backdrop"
              type="button"
              aria-label="收起显示设置"
              onClick={() => setControlsOpen(false)}
            />
          )}
          <button
            className="cmi-controls-entry"
            type="button"
            onClick={() => setControlsOpen((value) => !value)}
            aria-expanded={controlsOpen}
            aria-controls="cmi-wall-controls"
          >
            <span>{controlsOpen ? '收起' : '设置'}</span>
            <b aria-hidden="true">{controlsOpen ? '×' : '＋'}</b>
          </button>
          <nav
            className="cmi-wall-controls"
            id="cmi-wall-controls"
            aria-label="海报墙显示设置"
            data-mode={mode}
            data-mobile-open={controlsOpen ? 'true' : 'false'}
          >
          <div className="cmi-control-group" aria-label="显示模式">
            <button type="button" className={mode === 'flow' ? 'is-active' : ''} onClick={() => setMode('flow')}>
              流动墙
            </button>
            <button type="button" className={mode === 'flip' ? 'is-active' : ''} onClick={() => setMode('flip')}>
              翻转墙
            </button>
          </div>

          {mode === 'flow' && (
            <>
              <div className="cmi-control-group cmi-control-group--direction" aria-label="流动方向">
                {DIRECTIONS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={direction === item.value ? 'is-active' : ''}
                    onClick={() => setDirection(item.value)}
                    aria-label={item.label}
                    title={item.label}
                  >
                    {item.glyph}
                  </button>
                ))}
              </div>
              <label className="cmi-speed-control">
                <span>流速</span>
                <input
                  type="range"
                  min="0.55"
                  max="1.8"
                  step="0.05"
                  value={speed}
                  onChange={(event) => setSpeed(boundedNumber(event.target.value, speed, 0.55, 1.8))}
                />
              </label>
            </>
          )}

          {mode === 'flip' && (
            <div className="cmi-flip-tuning" aria-label="翻转动画设置">
              <label className="cmi-tune-control">
                <span>节拍 <output>{flipFrequency} 轮/分</output></span>
                <input
                  type="range"
                  min="30"
                  max="120"
                  step="6"
                  value={flipFrequency}
                  aria-label="翻动频率"
                  onChange={(event) =>
                    setFlipFrequency(boundedNumber(event.target.value, flipFrequency, 30, 120))
                  }
                />
              </label>
              <label className="cmi-tune-control">
                <span>单卡概率 <output>{flipProbability}%</output></span>
                <input
                  type="range"
                  min="5"
                  max="45"
                  step="1"
                  value={flipProbability}
                  aria-label="单卡翻动概率"
                  onChange={(event) =>
                    setFlipProbability(boundedNumber(event.target.value, flipProbability, 5, 45))
                  }
                />
              </label>
              <label className="cmi-tune-control">
                <span>同时翻动 <output>{flipBatchSize} 张</output></span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={flipBatchSize}
                  aria-label="同时翻动数量"
                  onChange={(event) =>
                    setFlipBatchSize(Math.round(boundedNumber(event.target.value, flipBatchSize, 1, 8)))
                  }
                />
              </label>
              <label className="cmi-tune-control">
                <span>翻速 <output>{flipSpeed.toFixed(1)}×</output></span>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={flipSpeed}
                  aria-label="翻动速度"
                  onChange={(event) => setFlipSpeed(boundedNumber(event.target.value, flipSpeed, 0.5, 2))}
                />
              </label>
            </div>
          )}

          <button className="cmi-pause-control" type="button" onClick={() => setPaused((value) => !value)}>
            <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
            {paused ? '继续' : '暂停'}
          </button>
          </nav>
        </>
      )}

      <main className="cmi-wall-stage">
        {mode === 'flow' ? (
          <FlowWall
            posters={orderedPosters}
            assetBase={assetBase}
            direction={direction}
            speed={speed}
            paused={paused || Boolean(selected) || feedbackOpen}
            onSelect={selectPoster}
            size={size}
          />
        ) : (
          <FlipWall
            posters={orderedPosters}
            assetBase={assetBase}
            paused={paused || Boolean(selected) || feedbackOpen}
            onSelect={selectPoster}
            size={size}
            frequency={flipFrequency}
            flipSpeed={flipSpeed}
            probability={flipProbability}
            batchSize={flipBatchSize}
          />
        )}
      </main>

      {showCommunityLinks && (
        <CommunityDock qrUrl={officialAccountQrUrl} links={socialLinks} />
      )}

      {selected && (
        <DetailDrawer
          poster={selected}
          assetBase={assetBase}
          onClose={closeDetail}
        />
      )}

      {feedbackOpen && (
        <FeedbackPanel repository={resolvedFeedbackRepository} onClose={closeFeedback} />
      )}
    </section>
  )
}
