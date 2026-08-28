import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ACTIVITY_CATALOG } from "../app/modules/activities/activity-catalog";
import { ActivityTimeline } from "../app/modules/activities/components/ActivityTimeline";

describe("ActivityTimeline", () => {
  it("renders both groups, the NOW separator and all three visible states", () => {
    const html = renderToStaticMarkup(
      <ActivityTimeline
        ongoing={[ACTIVITY_CATALOG[0]]}
        upcoming={[ACTIVITY_CATALOG[1]]}
        completed={[ACTIVITY_CATALOG[2]]}
      />,
    );

    expect(html).toContain("最近，可以一起做什么");
    expect(html).toContain("activity-timeline-active-title");
    expect(html).toContain("activity-timeline-completed-title");
    expect(html).toContain("role=\"separator\"");
    expect(html).toContain("NOW");
    expect(html).toContain("即将举行");
    expect(html).toContain("进行中");
    expect(html).toContain("已完成");
  });

  it("keeps compact empty states without hiding the timeline", () => {
    const html = renderToStaticMarkup(
      <ActivityTimeline ongoing={[]} upcoming={[]} completed={[]} />,
    );

    expect(html).toContain("activity-timeline");
    expect(html).toContain("暂无即将举行的活动");
    expect(html).toContain("近期还没有已完成活动");
  });
});
