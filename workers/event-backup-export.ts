/** REST envelope differs from the older flattened Workflows example. */
export interface D1ExportStatus {
  bookmark: string | null;
  signedUrl: string | null;
}
export function parseD1ExportResponse(raw: unknown): D1ExportStatus {
  if (!raw || typeof raw !== "object")
    throw new Error("Invalid D1 export response");
  const envelope = raw as Record<string, unknown>;
  if (
    envelope.success !== true ||
    !envelope.result ||
    typeof envelope.result !== "object"
  )
    throw new Error("D1 export rejected");
  const result = envelope.result as Record<string, unknown>;
  if (result.status === "error" || result.success === false || result.error)
    throw new Error("D1 export failed");
  const output =
    result.result && typeof result.result === "object"
      ? (result.result as Record<string, unknown>)
      : result;
  const signedUrl =
    typeof output.signed_url === "string" ? output.signed_url : null;
  if (signedUrl) {
    const url = new URL(signedUrl);
    if (url.protocol !== "https:")
      throw new Error("Invalid export download URL");
  }
  return {
    bookmark:
      typeof result.at_bookmark === "string" ? result.at_bookmark : null,
    signedUrl,
  };
}
