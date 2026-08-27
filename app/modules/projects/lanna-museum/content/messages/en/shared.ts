import type { MessageShape } from "../schema";
import type { zhShared } from "../zh/shared";

export const enShared = {
  "close": "Close",
  "optional": "Optional",
  "navLabel": "Main navigation",
  "openNav": "Open navigation",
  "closeNav": "Close navigation",
  "language": "Language",
  "languageMenu": "Choose display language",
  "languageChanged": "Display language changed to English",
  "nav": {
    "works": "Works",
    "about": "About",
    "journey": "Journey",
    "museums": "Museums",
    "collect": "Collect",
    "archive": "Pattern archive",
    "ideas": "Ideas",
    "recap": "Event recap"
  },
  "signup": {
    "action": "Event ended",
    "dialogLabel": "Event ended and CMI contact details",
    "kicker": "FOLLOW / Stay with CMI",
    "title": "This event has ended",
    "description": "Thank you for your support and attention. Follow CMI for future activities, cultural co-creation, and community updates.",
    "confirmTitle": "Thank you for being part of the journey",
    "confirmText": "The event may be over, but the connections between people, patterns, culture, and creativity will continue.",
    "qrAlt": "QR code for the CMI official account",
    "qrUnavailable": "The official account QR code is unavailable",
    "qrUnavailableHelp": "You can also contact LinkLinkGuan on WeChat.",
    "qrNotice": "Scan or press and hold in WeChat to follow the CMI official account.",
    "contactTitle": "Have a related request?",
    "contactDescription": "Reach out directly about events, cultural co-creation, or community collaborations.",
    "wechatLabel": "WeChat",
    "followupLabel": "Follow and contact CMI after the event",
    "followupTitle": "Follow CMI for what comes next"
  }
} satisfies MessageShape<typeof zhShared>;
