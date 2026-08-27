import { zhShared } from "./zh/shared";
import { zhExperience } from "./zh/experience";
import { zhArchive } from "./zh/archive";
import { zhMedia } from "./zh/media";
import { enShared } from "./en/shared";
import { enExperience } from "./en/experience";
import { enArchive } from "./en/archive";
import { enMedia } from "./en/media";
import { thShared } from "./th/shared";
import { thExperience } from "./th/experience";
import { thArchive } from "./th/archive";
import { thMedia } from "./th/media";

export const lannaMessages = {
  zh: { ...zhShared, ...zhExperience, ...zhArchive, ...zhMedia },
  en: { ...enShared, ...enExperience, ...enArchive, ...enMedia },
  th: { ...thShared, ...thExperience, ...thArchive, ...thMedia },
} as const;

export type LannaLanguage = keyof typeof lannaMessages;
