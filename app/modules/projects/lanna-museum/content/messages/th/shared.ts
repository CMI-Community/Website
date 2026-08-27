import type { MessageShape } from "../schema";
import type { zhShared } from "../zh/shared";

export const thShared = {
  "close": "ปิด",
  "optional": "ไม่บังคับ",
  "navLabel": "เมนูหลัก",
  "openNav": "เปิดเมนู",
  "closeNav": "ปิดเมนู",
  "language": "ภาษา",
  "languageMenu": "เลือกภาษาที่แสดง",
  "languageChanged": "เปลี่ยนภาษาเป็นภาษาไทยแล้ว",
  "nav": {
    "works": "ผลงาน",
    "about": "กิจกรรม",
    "journey": "กำหนดการ",
    "museums": "พิพิธภัณฑ์",
    "collect": "เก็บลวดลาย",
    "archive": "คลังลวดลาย",
    "ideas": "ไอเดีย",
    "recap": "บันทึกกิจกรรม"
  },
  "signup": {
    "action": "กิจกรรมสิ้นสุดแล้ว",
    "dialogLabel": "กิจกรรมสิ้นสุดแล้วและช่องทางติดต่อ CMI",
    "kicker": "FOLLOW / ติดตาม CMI ต่อไป",
    "title": "กิจกรรมครั้งนี้สิ้นสุดแล้ว",
    "description": "ขอบคุณสำหรับการสนับสนุนและความสนใจ ติดตาม CMI ต่อเพื่อรับข่าวกิจกรรม การสร้างสรรค์ทางวัฒนธรรม และความเคลื่อนไหวของชุมชน",
    "confirmTitle": "ขอบคุณที่ร่วมเดินทางด้วยกัน",
    "confirmText": "แม้กิจกรรมจะจบลงแล้ว แต่ความเชื่อมโยงระหว่างผู้คน ลวดลาย วัฒนธรรม และการสร้างสรรค์ยังคงดำเนินต่อไป",
    "qrAlt": "คิวอาร์โค้ดบัญชีทางการ CMI",
    "qrUnavailable": "ไม่สามารถแสดงคิวอาร์โค้ดได้ในขณะนี้",
    "qrUnavailableHelp": "คุณสามารถติดต่อทาง WeChat ได้ที่ LinkLinkGuan",
    "qrNotice": "สแกนหรือกดค้างด้วย WeChat เพื่อติดตามบัญชีทางการ CMI",
    "contactTitle": "มีความต้องการที่เกี่ยวข้องหรือไม่",
    "contactDescription": "ติดต่อเราได้โดยตรงสำหรับกิจกรรม การสร้างสรรค์ทางวัฒนธรรม หรือความร่วมมือกับชุมชน",
    "wechatLabel": "WeChat",
    "followupLabel": "ข้อมูลติดตามและติดต่อ CMI หลังจบกิจกรรม",
    "followupTitle": "ติดตาม CMI เพื่อรับข่าวสารครั้งต่อไป"
  }
} satisfies MessageShape<typeof zhShared>;
