import type { MessageShape } from "../schema";
import type { zhMedia } from "../zh/media";

export const thMedia = {
  "video": {
    "title": "หนึ่งความเป็นไปได้ที่เกิดขึ้นจริงแล้ว",
    "intro": "จากเบาะแสทางวัฒนธรรมหนึ่งจุด AI ช่วยให้เราเปลี่ยนแนวคิดเป็นภาพเคลื่อนไหวได้",
    "creditLabel": "เครดิตผลงาน",
    "creditBefore": "ผลงานนี้สร้างสรรค์โดย",
    "creditName": "นักสร้างสรรค์ AIGC จากกลุ่มนักเรียน “Ruitongxue”",
    "creditAfter": "",
    "example": "ตัวอย่างผลงาน AI",
    "reimagined": "การตีความสร้างสรรค์ใหม่",
    "nonHistorical": "ไม่ใช่ภาพเหตุการณ์ทางประวัติศาสตร์",
    "unsupported": "เบราว์เซอร์ของคุณไม่รองรับการเล่นวิดีโอ"
  },
  "footer": {
    "title": "นำลวดลายที่ทำให้คุณหยุดมองมาสร้างร่วมกัน",
    "intro": "สร้างสรรค์ด้วย AI และร่วมกันตามรอยลวดลายล้านนา",
    "credits": "ริเริ่มโดย WaytoAGI · กิจกรรมเชียงใหม่จัดโดย CMI Community",
    "location": "สถานที่: CMI Studio · รับพิกัดโดยละเอียดในกลุ่ม"
  }
} satisfies MessageShape<typeof zhMedia>;
