/**
 * @typedef {Object} CommunityTool
 * @property {string} id
 * @property {string} prefix Public project path, ending in a slash.
 * @property {string} binding Existing Cloudflare service binding.
 * @property {string} name
 * @property {string} tagline
 * @property {string} description Plain text; newlines render as line breaks.
 * @property {string} [creator] Optional creator display name. Omit to hide the row.
 * @property {string} status
 * @property {string} actionLabel
 */

/** @type {CommunityTool[]} */
export const PROJECTS = [
  {
    id: 'shaodian',
    prefix: '/shaodian/',
    binding: 'SHAODIAN',
    name: '捎点',
    tagline: '跨境顺路带',
    creator: '不器@CMI',
    description: '发布跨境行程或帮带需求，\n找同路的朋友，顺路捎点书籍和衣物。',
    status: '已接入',
    actionLabel: '打开捎点',
  },
];
