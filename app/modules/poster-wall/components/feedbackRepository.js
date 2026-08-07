export function characterCount(value = '') {
  return Array.from(value).length
}

function mapIdea(row) {
  return {
    id: row.id,
    body: row.body,
    authorName: row.authorName || null,
    createdAt: row.createdAt,
    upvotes: Number(row.upvotes) || 0,
    downvotes: Number(row.downvotes) || 0,
    score: Number(row.score) || 0,
    userVote: Number(row.userVote) || 0,
    isOwn: Boolean(row.isOwn),
  }
}

async function requestJson(url, options) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || '留言服务暂时不可用，请稍后再试。')
  }
  return payload
}

export function createFeedbackRepository({ apiBase = '' } = {}) {
  return {
    mode: 'shared',
    async list() {
      const data = await requestJson(`${apiBase}/api/feedback`)
      return (data.ideas || []).map(mapIdea)
    },
    async submit({ body, authorName }) {
      await requestJson(`${apiBase}/api/feedback`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim(), authorName: authorName.trim() || null }),
      })
    },
    async vote(ideaId, value) {
      await requestJson(`${apiBase}/api/feedback/${encodeURIComponent(ideaId)}/vote`, {
        method: 'POST',
        body: JSON.stringify({ value }),
      })
    },
  }
}
