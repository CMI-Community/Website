import { describe, expect, it } from "vitest";
import { COMMUNITY_LINKS, COMMUNITY_SOCIALS } from "../app/shared/community-socials";

describe("CMI community social entries", () => {
  it("includes all seven public entries with Discord first and featured", () => {
    expect(COMMUNITY_SOCIALS).toHaveLength(7);
    expect(COMMUNITY_SOCIALS.map((entry) => entry.id)).toEqual([
      "discord",
      "bilibili",
      "official",
      "xiaohongshu",
      "reddit",
      "github",
      "wechat",
    ]);
    expect(COMMUNITY_SOCIALS[0]).toMatchObject({ id: "discord", featured: true });
  });

  it("uses the approved Discord and Bilibili destinations", () => {
    expect(COMMUNITY_LINKS.discord).toBe("https://discord.gg/BbaPPTRr9d");
    expect(COMMUNITY_LINKS.bilibili).toBe(
      "https://space.bilibili.com/3706956986452842?spm_id_from=333.337.search-card.all.click",
    );
  });
});
