import { redirect } from "react-router";
import { requireEventAdmin } from "../../../workers/integration-auth";
import { HttpError } from "../../../workers/lib/http";
export async function requireAdminPage(
  request: Request,
  env: CloudflareEnv,
  ctx: ExecutionContext,
) {
  try {
    return await requireEventAdmin(request, env, ctx);
  } catch (error) {
    if (error instanceof HttpError && [401, 403].includes(error.status))
      throw redirect("/admin/login");
    throw error;
  }
}
export const privateHeaders = () => ({
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow",
});
