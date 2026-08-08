import type { Route } from "./+types/poster-archive";
import { CmiPosterWall } from "../modules/poster-wall/components/CmiPosterWall.jsx";
import { cloudflareContext } from "../shared/cloudflare-context";
import "../modules/poster-wall/components/cmi-poster-wall.css";

interface PublicPoster {
  id: string;
  imagePath: string;
  width: number;
  height: number;
  title: string;
  publishedAt: string;
  publishedDate: string;
  eventTime: string;
  initiator: string;
  summary: string;
  articleUrl: string;
  series: { name: string; issue: number | null };
  category: string;
}

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
  try {
    const object = await env.MEDIA.get("poster-wall/v1/catalog.json");
    if (!object) throw new Error("catalog missing");
    const parsed = (await object.json()) as { version?: string; posters?: PublicPoster[] } | PublicPoster[];
    const posters = Array.isArray(parsed) ? parsed : parsed.posters;
    if (!Array.isArray(posters) || !posters.length) throw new Error("catalog empty");
    return {
      posters,
      assetBase: `${env.ASSET_BASE_URL.replace(/\/$/, "")}/poster-wall/v1/posters/`,
      unavailable: false,
    };
  } catch {
    return { posters: [] as PublicPoster[], assetBase: "", unavailable: true };
  }
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
