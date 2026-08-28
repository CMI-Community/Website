import { describe, expect, it } from "vitest";
import { COMMUNITY_LINKS, COMMUNITY_SOCIALS } from "../app/shared/community-socials";

describe("CMI community social entries", () => {
  it("includes all seven public entries without emphasizing Discord", () => {
    expect(COMMUNITY_SOCIALS).toHaveLength(7);
    expect(COMMUNITY_SOCIALS.map((entry) => entry.id)).toEqual([
      "official",
      "xiaohongshu",
      "bilibili",
      "wechat",
      "github",
      "reddit",
      "discord",
    ]);
    expect(COMMUNITY_SOCIALS.at(-1)).toMatchObject({
      id: "discord",
      detail: "社区群聊",
    });
    expect(COMMUNITY_SOCIALS.every((entry) => !("featured" in entry))).toBe(true);
  });

  it("uses the approved Discord, Bilibili, and Xiaohongshu destinations", () => {
    expect(COMMUNITY_LINKS.discord).toBe("https://discord.gg/BbaPPTRr9d");
    expect(COMMUNITY_LINKS.bilibili).toBe(
      "https://space.bilibili.com/3706956986452842?spm_id_from=333.337.search-card.all.click",
    );
    expect(COMMUNITY_LINKS.xiaohongshu).toBe("https://xhslink.cn/m/3C1MCJgpWq6");
  });
});
