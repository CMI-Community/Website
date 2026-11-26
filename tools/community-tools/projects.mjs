/**
 * @typedef {Object} CommunityTool
 * @property {string} id
 * @property {string} [href] Direct HTTPS address for an external project.
 * @property {string} [prefix] Same-origin path for a service-bound project.
 * @property {string} [binding] Existing Cloudflare service binding.
 * @property {string} name
 * @property {string} [tagline]
 * @property {string} description Plain text; newlines render as line breaks.
 * @property {string} [creator] Optional creator display name. Omit to hide the row.
 * @property {string} [image] Same-origin artwork path.
 * @property {string} actionLabel
 */

/** @type {CommunityTool} */
export const SHAODIAN = {
  id: 'shaodian',
  prefix: '/shaodian/',
  binding: 'SHAODIAN',
  name: '捎点',
  tagline: '顺路带',
  creator: '不器@CMI',
  description: '发布行程或帮带需求，\n找同路的朋友，顺路捎点书籍和衣物。',
  actionLabel: '打开捎点',
};

/** @type {CommunityTool[]} */
export const PROJECTS = [
  SHAODIAN,
  {
    id: 'loy-krathong-river',
    href: 'https://linklinkguan.github.io/cmi-loykrathong-cards/#river',
    name: '水灯节灵感卡与水灯河',
    creator: '林可',
    description: '抽一张卡找做水灯的灵感，在线设计自己的水灯，也可以去水灯河看大家的作品。',
    image: '/project-images/loy-krathong-river.webp',
    actionLabel: '打开水灯河',
  },
  {
    id: 'loy-krathong-board',
    href: 'https://linklinkguan.github.io/cmi-loykrathong-2026/',
    name: '2026 水灯庆典任务看板',
    creator: '林可',
    description: '查看庆典的筹备任务，按执行人、日期和进度筛选，点开任务即可查看详情和前后依赖。',
    image: '/project-images/loy-krathong-board.webp',
    actionLabel: '查看任务看板',
  },
  {
    id: 'pdd404',
    href: 'https://pdd404.app/',
    name: 'PDD404 · 拼多多包裹寻回',
    creator: '林可',
    description: '用国内快递单号或收件人姓名查找拼多多包裹线索。找不到包裹或收错了件，都可以登记。',
    image: '/project-images/pdd404.webp',
    actionLabel: '打开 PDD404',
  },
  {
    id: 'cmi-swap',
    href: 'https://cmiswap.com/',
    name: '清迈交换橱窗',
    creator: '林可',
    description: '在清迈社区浏览和发布闲置物品，也可以交流技能、发现本地活动。',
    image: '/project-images/cmi-swap.webp',
    actionLabel: '打开交换橱窗',
  },
  {
    id: 'cmi-map',
    href: 'https://cmimap.com/',
    name: 'CMI Map · 清迈生活地图',
    creator: '子扬',
    description: '在社区共建的地图上找餐馆、咖啡馆、市集等生活地点，查看社区伙伴的推荐。',
    image: '/project-images/cmi-map.webp',
    actionLabel: '打开 CMI Map',
  },
  {
    id: 'dali-trip',
    href: 'https://dalitrip.com/en',
    name: 'DaliTrip · 大理在地旅行',
    creator: '杰森',
    description: '跟大理本地向导去苍山徒步、到森林采集、在夜里观星，或去当地人家做客。',
    image: '/project-images/dali-trip.webp',
    actionLabel: '打开 DaliTrip',
  },
];
