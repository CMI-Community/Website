export type ProjectView = "project" | "recap";

export interface ResolvedProjectPath {
  seriesSlug: string;
  routeSegment: string;
  view: ProjectView;
}

export function resolveProjectPath(splat: string | undefined): ResolvedProjectPath | null {
  const parts = (splat ?? "").split("/").filter(Boolean);
  if (parts.length !== 2 && !(parts.length === 3 && parts[2] === "recap")) {
    return null;
  }
  return {
    seriesSlug: parts[0],
    routeSegment: parts[1],
    view: parts[2] === "recap" ? "recap" : "project",
  };
}
