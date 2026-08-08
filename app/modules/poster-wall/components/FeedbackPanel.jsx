import { useCallback, useEffect, useRef, useState } from 'react'
import { characterCount } from './feedbackRepository.js'

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' }).format(new Date(value))
}

function friendlyError(error) {
  const message = error?.message || '操作没有完成，请稍后再试。'
  if (message.includes('rate limit') || message.includes('one minute')) return '提交得有点快，请一分钟后再试。'
  if (message.includes('daily limit')) return '今天已经提交 10 条留言了，明天再来吧。'
  if (message.includes('own idea')) return '不能给自己的留言投票。'
  return message
}

export function FeedbackPanel({ repository, onClose }) {
  const panelRef = useRef(null)
  const [ideas, setIdeas] = useState([])
  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [votingId, setVotingId] = useState(null)
  const [error, setError] = useState('')
  const bodyLength = characterCount(body)

  const loadIdeas = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true)
    try {
      setIdeas(await repository.list())
      setError('')
    } catch (loadError) {
      setError(friendlyError(loadError))
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [repository])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    loadIdeas()
    const refreshTimer = window.setInterval(() => loadIdeas({ quiet: true }), 20000)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      if (refreshTimer) window.clearInterval(refreshTimer)
    }
  }, [loadIdeas, onClose, repository.mode])

  const handleBodyChange = (event) => {
    setBody(Array.from(event.target.value).slice(0, 50).join(''))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!body.trim() || bodyLength > 50 || submitting) return
    setSubmitting(true)
    try {
      await repository.submit({ body, authorName })
      setBody('')
      setAuthorName('')
      await loadIdeas({ quiet: true })
      setError('')
    } catch (submitError) {
      setError(friendlyError(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  const handleVote = async (ideaId, value) => {
    if (votingId) return
    setVotingId(ideaId)
    try {
      await repository.vote(ideaId, value)
      await loadIdeas({ quiet: true })
      setError('')
    } catch (voteError) {
      setError(friendlyError(voteError))
    } finally {
      setVotingId(null)
    }
  }

  return (
    <div className="cmi-feedback-layer">
      <button className="cmi-feedback-backdrop" type="button" aria-label="关闭留言" onClick={onClose} />
      <aside
        className="cmi-feedback"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cmi-feedback-title"
        tabIndex="-1"
        ref={panelRef}
      >
        <header className="cmi-feedback__header">
          <div>
            <p>COMMUNITY SIGNALS</p>
            <h2 id="cmi-feedback-title">留下一条想法</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭留言面板">
            <span>关闭</span><b aria-hidden="true">×</b>
          </button>
        </header>

        <form className="cmi-feedback__form" onSubmit={handleSubmit}>
          <label htmlFor="cmi-feedback-body">你希望 CMI 接下来做什么？</label>
          <textarea
            id="cmi-feedback-body"
            value={body}
            onChange={handleBodyChange}
            placeholder="一个建议、一点感受，或一个想一起实现的念头……"
            rows="3"
            maxLength="50"
            required
          />
          <div className="cmi-feedback__form-foot">
            <label className="cmi-feedback__name">
              <span>署名（选填）</span>
              <input
                value={authorName}
                onChange={(event) => setAuthorName(Array.from(event.target.value).slice(0, 20).join(''))}
                placeholder="匿名也完全可以"
                maxLength="20"
              />
            </label>
            <div className="cmi-feedback__submit">
              <output className={bodyLength >= 45 ? 'is-near-limit' : ''}>{bodyLength}/50</output>
              <button type="submit" disabled={!body.trim() || submitting}>
                {submitting ? '送出中…' : '送出想法'}
              </button>
            </div>
          </div>
          {error && <p className="cmi-feedback__error" role="alert">{error}</p>}
        </form>

        <section className="cmi-feedback__ideas" aria-label="社区留言">
          <div className="cmi-feedback__ideas-head">
            <span>大家正在关心</span>
            <span>按优先级排列</span>
          </div>
          {loading ? (
            <p className="cmi-feedback__empty">正在读取社区信号…</p>
          ) : ideas.length === 0 ? (
            <p className="cmi-feedback__empty">这里还很安静。留下第一条想法吧。</p>
          ) : (
            <ol>
              {ideas.map((idea, index) => (
                <li key={idea.id}>
                  <span className="cmi-feedback__rank" aria-label={`优先级第 ${index + 1}`}>{String(index + 1).padStart(2, '0')}</span>
                  <div className="cmi-feedback__idea-copy">
                    <p>{idea.body}</p>
                    <span>{idea.authorName || '匿名访客'} · {formatDate(idea.createdAt)}{idea.isOwn ? ' · 我的留言' : ''}</span>
                  </div>
                  <div className="cmi-feedback__votes" aria-label={`当前优先级分数 ${idea.score}`}>
                    <button
                      type="button"
                      aria-label={`赞成这条想法，当前 ${idea.upvotes} 票`}
                      aria-pressed={idea.userVote === 1}
                      disabled={idea.isOwn || votingId === idea.id}
                      title={idea.isOwn ? '自己的留言无需投票' : 'Upvote'}
                      onClick={() => handleVote(idea.id, 1)}
                    >
                      <span aria-hidden="true">↑</span>{idea.upvotes}
                    </button>
                    <strong aria-label={`优先级 ${idea.score}`}>{idea.score}</strong>
                    <button
                      type="button"
                      aria-label={`不赞成这条想法，当前 ${idea.downvotes} 票`}
                      aria-pressed={idea.userVote === -1}
                      disabled={idea.isOwn || votingId === idea.id}
                      title={idea.isOwn ? '自己的留言无需投票' : 'Downvote'}
                      onClick={() => handleVote(idea.id, -1)}
                    >
                      <span aria-hidden="true">↓</span>{idea.downvotes}
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </aside>
    </div>
  )
}
