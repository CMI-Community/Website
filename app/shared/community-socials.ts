export const COMMUNITY_LINKS = {
  discord: "https://discord.gg/BbaPPTRr9d",
  bilibili: "https://space.bilibili.com/3706956986452842?spm_id_from=333.337.search-card.all.click",
  xiaohongshu: "https://www.xiaohongshu.com/user/profile/5f0eb478000000000000100260e",
  reddit: "https://www.reddit.com/r/CMI_Community/",
  github: "https://github.com/orgs/CMI-Community/repositories",
  wechat: "LinkLinkGuan",
} as const;

export const COMMUNITY_SOCIALS = [
  {
    id: "discord",
    label: "Discord",
    detail: "新的线上阵地",
    href: COMMUNITY_LINKS.discord,
    featured: true,
  },
  {
    id: "bilibili",
    label: "Bilibili",
    detail: "CMI 影像频道",
    href: COMMUNITY_LINKS.bilibili,
  },
  { id: "official", label: "公众号", detail: "C M I", action: "qr" as const },
  {
    id: "xiaohongshu",
    label: "小红书",
    detail: "CMI 清迈数字游民社区",
    href: COMMUNITY_LINKS.xiaohongshu,
  },
  {
    id: "reddit",
    label: "Reddit",
    detail: "r/CMI_Community",
    href: COMMUNITY_LINKS.reddit,
  },
  {
    id: "github",
    label: "GitHub",
    detail: "CMI-Community",
    href: COMMUNITY_LINKS.github,
  },
  {
    id: "wechat",
    label: "微信联系",
    detail: COMMUNITY_LINKS.wechat,
    action: "copy" as const,
  },
] as const;

export type CommunitySocial = (typeof COMMUNITY_SOCIALS)[number];
