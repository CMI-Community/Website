export const adminEnvironmentLabel: Record<CloudflareEnv["APP_ENV"], string> = {
  development: "本地预览",
  staging: "测试站",
  production: "正式官网",
};

export class AdminApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public fields: Record<string, string> = {},
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}
export async function adminApi<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  const body = (await response
    .json()
    .catch(() => ({ error: { message: "服务暂时不可用，请稍后重试。" } }))) as {
    error?: {
      message?: string;
      code?: string;
      fields?: Record<string, string>;
    };
    message?: string;
    code?: string;
    [key: string]: unknown;
  };
  if (!response.ok)
    throw new AdminApiError(
      body.error?.message ?? body.message ?? "操作未完成。",
      body.error?.code ?? body.code ?? "REQUEST_FAILED",
      response.status,
      body.error?.fields ?? {},
      body,
    );
  return body as T;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "操作未完成，请稍后重试。";
}
export function bangkokInput(value: string | null): string {
  return value
    ? new Date(Date.parse(value) + 7 * 3600_000).toISOString().slice(0, 16)
    : "";
}
