import { describe, expect, it } from "vitest";
import { resolveProjectPath } from "../app/modules/projects/project-route";

describe("project route parser", () => {
  it("accepts a project and its recap only", () => {
    expect(resolveProjectPath("waytoagi/26-lanna-museum")).toEqual({
      seriesSlug: "waytoagi",
      routeSegment: "26-lanna-museum",
      view: "project",
    });
    expect(resolveProjectPath("waytoagi/26-lanna-museum/recap")).toEqual({
      seriesSlug: "waytoagi",
      routeSegment: "26-lanna-museum",
      view: "recap",
    });
  });

  it("rejects incomplete or unsupported child paths", () => {
    expect(resolveProjectPath(undefined)).toBeNull();
    expect(resolveProjectPath("waytoagi")).toBeNull();
    expect(resolveProjectPath("waytoagi/26-lanna-museum/admin")).toBeNull();
    expect(resolveProjectPath("waytoagi/26-lanna-museum/recap/more")).toBeNull();
  });
});
