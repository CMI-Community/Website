import type { Route } from "./+types/poster-archive";
import { loadPublicPosterCatalog } from "../modules/activities/event-public";
import { CmiPosterWall } from "../modules/poster-wall/components/CmiPosterWall.jsx";
import { cloudflareContext } from "../shared/cloudflare-context";
import "../modules/poster-wall/components/cmi-poster-wall.css";

export const headers = () => ({ "Cache-Control": "no-store, max-age=0" });

export function meta() {
  return [
    { title: "CMI Community｜活动海报档案" },
    {
      name: "description",
      content: "CMI Community 2023–2026 活动海报档案。人在社区就在。",
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  const { env } = context.get(cloudflareContext);
  const catalog = await loadPublicPosterCatalog(env);
  return {
    ...catalog,
    assetBase: `${env.ASSET_BASE_URL.replace(/\/$/, "")}/poster-wall/v1/posters/`,
  };
}

export default function PosterArchive({ loaderData }: Route.ComponentProps) {
  if (loaderData.unavailable) {
    return (
      <main className="system-state">
        <p className="system-state__eyebrow">CMI LIVING ARCHIVE</p>
        <h1>海报档案正在连接</h1>
        <p>公共资产暂时不可用，请稍后刷新。留言和账号数据没有受到影响。</p>
      </main>
    );
  }

  return (
    <CmiPosterWall
      posters={loaderData.posters}
      assetBase={loaderData.assetBase}
      height="100svh"
    />
  );
}
