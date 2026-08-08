export function json(
  payload: unknown,
  init: ResponseInit & { headers?: HeadersInit } = {},
): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return new Response(JSON.stringify(payload), { ...init, headers });
}

export function apiError(status: number, code: string, message: string): Response {
  return json({ error: { code, message } }, { status });
}

export async function parseJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "请求必须使用 JSON。 ");
  }

  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "请求 JSON 无法解析。");
  }
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function isHttpError(error: unknown): error is HttpError {
  if (!error || typeof error !== "object") return false;
  const candidate = error as Partial<HttpError>;
  return (
    Number.isInteger(candidate.status) &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}

export function methodNotAllowed(allowed: string[]): Response {
  const response = apiError(405, "METHOD_NOT_ALLOWED", "此接口不支持当前请求方法。 ");
  const headers = new Headers(response.headers);
  headers.set("Allow", allowed.join(", "));
  return new Response(response.body, { status: response.status, headers });
}

export function withApiHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
