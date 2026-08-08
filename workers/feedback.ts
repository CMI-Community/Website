const VISITOR_COOKIE = "cmi_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Visitor {
  id: string;
  isNew: boolean;
}

function characterCount(value = ""): number {
  return Array.from(value).length;
}

function visitorFromRequest(request: Request): Visitor {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]+)`));
  const existing = match ? decodeURIComponent(match[1]) : "";
  if (UUID_PATTERN.test(existing)) return { id: existing, isNew: false };
  return { id: crypto.randomUUID(), isNew: true };
}

function attachVisitorCookie(response: Response, visitor: Visitor): Response {
  if (!visitor.isNew) return response;
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    `${VISITOR_COOKIE}=${encodeURIComponent(visitor.id)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function feedbackJson(
  payload: unknown,
  { status = 200, visitor }: { status?: number; visitor?: Visitor } = {},
) {
  const response = new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
  return visitor ? attachVisitorCookie(response, visitor) : response;
}

function feedbackError(message: string, status: number, visitor: Visitor) {
  return feedbackJson({ error: message }, { status, visitor });
}

async function listIdeas(env: CloudflareEnv, visitor: Visitor) {
  const query = env.DB.prepare(`
    SELECT
      idea.id,
      idea.body,
      idea.author_name AS authorName,
      idea.created_at AS createdAt,
      COALESCE(SUM(CASE WHEN vote.value = 1 THEN 1 ELSE 0 END), 0) AS upvotes,
      COALESCE(SUM(CASE WHEN vote.value = -1 THEN 1 ELSE 0 END), 0) AS downvotes,
      COALESCE(SUM(vote.value), 0) AS score,
      COALESCE(MAX(CASE WHEN vote.voter_id = ?1 THEN vote.value ELSE 0 END), 0) AS userVote,
      CASE WHEN idea.created_by = ?1 THEN 1 ELSE 0 END AS isOwn
    FROM cmi_feedback_ideas AS idea
    LEFT JOIN cmi_feedback_votes AS vote ON vote.idea_id = idea.id
    WHERE idea.status = 'published'
    GROUP BY idea.id, idea.body, idea.author_name, idea.created_at, idea.created_by
    ORDER BY score DESC, idea.created_at DESC
    LIMIT 200
  `).bind(visitor.id);
  const { results } = await query.all();
  return feedbackJson({ ideas: results || [] }, { visitor });
}

async function submitIdea(request: Request, env: CloudflareEnv, visitor: Visitor) {
  let input: { body?: unknown; authorName?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return feedbackError("请求格式无效。", 400, visitor);
  }

  const body = typeof input?.body === "string" ? input.body.trim() : "";
  const authorName = typeof input?.authorName === "string" ? input.authorName.trim() : "";
  if (!body || characterCount(body) > 50) {
    return feedbackError("留言需为 1–50 个字。", 400, visitor);
  }
  if (characterCount(authorName) > 20) {
    return feedbackError("署名不能超过 20 个字。", 400, visitor);
  }

  const recent = await env.DB.prepare(`
    SELECT COUNT(*) AS total FROM cmi_feedback_ideas
    WHERE created_by = ?1
      AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 minute')
  `)
    .bind(visitor.id)
    .first<{ total: number }>();
  if (Number(recent?.total) > 0) return feedbackError("one minute rate limit", 429, visitor);

  const daily = await env.DB.prepare(`
    SELECT COUNT(*) AS total FROM cmi_feedback_ideas
    WHERE created_by = ?1
      AND substr(created_at, 1, 10) = strftime('%Y-%m-%d', 'now')
  `)
    .bind(visitor.id)
    .first<{ total: number }>();
  if (Number(daily?.total) >= 10) return feedbackError("daily limit reached", 429, visitor);

  const ideaId = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO cmi_feedback_ideas (id, body, author_name, created_by)
    VALUES (?1, ?2, ?3, ?4)
  `)
    .bind(ideaId, body, authorName || null, visitor.id)
    .run();
  return feedbackJson({ id: ideaId }, { status: 201, visitor });
}

async function castVote(
  request: Request,
  env: CloudflareEnv,
  visitor: Visitor,
  ideaId: string,
) {
  let input: { value?: unknown };
  try {
    input = (await request.json()) as typeof input;
  } catch {
    return feedbackError("请求格式无效。", 400, visitor);
  }
  const value = Number(input?.value);
  if (value !== 1 && value !== -1) return feedbackError("无效的投票。", 400, visitor);

  const idea = await env.DB.prepare(`
    SELECT created_by AS createdBy FROM cmi_feedback_ideas
    WHERE id = ?1 AND status = 'published'
  `)
    .bind(ideaId)
    .first<{ createdBy: string }>();
  if (!idea) return feedbackError("这条留言已不存在。", 404, visitor);
  if (idea.createdBy === visitor.id) return feedbackError("cannot vote on own idea", 403, visitor);

  const existing = await env.DB.prepare(`
    SELECT value FROM cmi_feedback_votes WHERE idea_id = ?1 AND voter_id = ?2
  `)
    .bind(ideaId, visitor.id)
    .first<{ value: number }>();
  if (Number(existing?.value) === value) {
    await env.DB.prepare("DELETE FROM cmi_feedback_votes WHERE idea_id = ?1 AND voter_id = ?2")
      .bind(ideaId, visitor.id)
      .run();
  } else {
    await env.DB.prepare(`
      INSERT INTO cmi_feedback_votes (idea_id, voter_id, value)
      VALUES (?1, ?2, ?3)
      ON CONFLICT (idea_id, voter_id)
      DO UPDATE SET value = excluded.value,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    `)
      .bind(ideaId, visitor.id, value)
      .run();
  }
  return feedbackJson({ ok: true }, { visitor });
}

export async function handleFeedback(request: Request, env: CloudflareEnv): Promise<Response> {
  const url = new URL(request.url);
  const visitor = visitorFromRequest(request);
  try {
    if (url.pathname === "/api/feedback") {
      if (request.method === "GET") return listIdeas(env, visitor);
      if (request.method === "POST") return submitIdea(request, env, visitor);
      return feedbackError("Method not allowed", 405, visitor);
    }
    const match = url.pathname.match(/^\/api\/feedback\/([0-9a-f-]{36})\/vote$/i);
    if (match) {
      if (request.method !== "POST") return feedbackError("Method not allowed", 405, visitor);
      return castVote(request, env, visitor, match[1]);
    }
    return feedbackError("Not found", 404, visitor);
  } catch (error) {
    console.error("Feedback API failed", error);
    return feedbackError("留言服务暂时不可用，请稍后再试。", 500, visitor);
  }
}
