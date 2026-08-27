import type { MessageShape } from "../schema";
import type { zhMedia } from "../zh/media";

export const enMedia = {
  "video": {
    "title": "One possibility already brought to life",
    "intro": "Starting from a cultural clue, AI can help us turn an idea into moving images.",
    "creditLabel": "Work credit",
    "creditBefore": "Created by",
    "creditName": "AIGC creators from the “Ruitongxue” student group",
    "creditAfter": ".",
    "example": "AI creative example",
    "reimagined": "Creative reinterpretation",
    "nonHistorical": "Not historical footage",
    "unsupported": "Your browser does not support video playback."
  },
  "footer": {
    "title": "Bring a pattern that makes you stop and make something together.",
    "intro": "Create with AI and trace Lanna patterns together.",
    "credits": "Initiated by WaytoAGI · Chiang Mai gathering organized by CMI Community",
    "location": "Venue: CMI Studio · Exact location available in the group"
  }
} satisfies MessageShape<typeof zhMedia>;
