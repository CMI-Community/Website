import { createContext } from "react-router";

export const cloudflareContext = createContext<{
  env: CloudflareEnv;
  ctx: ExecutionContext;
}>();
