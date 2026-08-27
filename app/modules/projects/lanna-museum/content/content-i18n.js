import {
  archiveSamples,
  filterOptions,
  museums,
  participationSteps,
} from "./base-content";
import {
  productionArchiveTranslations,
  productionTaxonomy,
} from "./production-archive-i18n";
import { archiveProvenanceTranslations } from "./archive-provenance";

const stepTranslations = {
  en: [
    ["Now", "Register & join the group", "Scan the QR code to join, then receive museum visit notes and the activity access code."],
    ["Before July 26", "Choose a museum", "Choose one of the two recommended museums and visit alone or with others."],
    ["During your visit", "Collect a pattern", "Photograph the close-up, complete carrier, and source; then record an observation and question."],
    ["July 26 · 12:30", "Arrive at CMI Studio", "Check in, form groups, and bring your pattern card into the space."],
    ["13:00–14:10", "Opening, sharing & teams", "Join the national opening, share patterns, choose a topic, and pitch before making."],
    ["14:10–15:40", "90-minute AI co-creation", "Turn an observation into a website, moving image, agent, game, or 3D work."],
    ["15:40–16:50", "Showcase, feedback & selection", "Present the works, try one another’s creations, and select representative Chiang Mai content."],
    ["16:50–17:30", "National link-up & archive", "Join the national link-up, take a group photo, and submit works and activity materials."],
    ["After the activity", "Let the archive keep growing", "Works and patterns remain online and can continue to be developed."],
  ],
  th: [
    ["ตอนนี้", "สมัครและเข้ากลุ่มกิจกรรม", "สแกนคิวอาร์โค้ดเพื่อเข้ากลุ่ม รับคำแนะนำการเข้าชมพิพิธภัณฑ์และรหัสส่งลวดลาย"],
    ["ก่อน 26 กรกฎาคม", "เลือกพิพิธภัณฑ์", "เลือกหนึ่งในสองพิพิธภัณฑ์ที่แนะนำ แล้วเดินทางไปเองหรือไปกับเพื่อน"],
    ["ระหว่างเข้าชม", "เก็บลวดลายให้ครบ", "ถ่ายภาพระยะใกล้ วัตถุทั้งหมด และข้อมูลที่มา พร้อมเขียนสิ่งที่สังเกตและคำถาม"],
    ["26 กรกฎาคม · 12:30 น.", "มาถึง CMI Studio", "ลงทะเบียน แบ่งกลุ่ม และนำการ์ดลวดลายเข้าร่วมกิจกรรม"],
    ["13:00–14:10 น.", "เปิดงาน แบ่งปัน และตั้งทีม", "ร่วมเปิดงานทั่วประเทศ แบ่งปันลวดลาย เลือกโจทย์ และ Pitch ก่อนลงมือ"],
    ["14:10–15:40 น.", "ร่วมสร้างสรรค์ด้วย AI 90 นาที", "เปลี่ยนสิ่งที่สังเกตเป็นเว็บไซต์ วิดีโอ เอเจนต์ เกม หรือผลงาน 3D"],
    ["15:40–16:50 น.", "นำเสนอ รับข้อเสนอแนะ และคัดเลือก", "นำเสนอผลงาน ทดลองผลงานของกันและกัน และคัดเลือกเนื้อหาตัวแทนเชียงใหม่"],
    ["16:50–17:30 น.", "เชื่อมต่อทั่วประเทศและจัดเก็บ", "ร่วมเชื่อมต่อ ถ่ายภาพหมู่ และส่งผลงานกับสื่อจากกิจกรรม"],
    ["หลังกิจกรรม", "ให้คลังเติบโตต่อไป", "ผลงานและลวดลายจะจัดแสดงออนไลน์ต่อเนื่องและพัฒนาต่อได้"],
  ],
};

const museumTranslations = {
  en: {
    lanna_folklife: {
      chineseName: "Lanna Folklife Centre",
      description:
        "Enter Lanna culture through textiles, lacquerware, ceramics, weaving, murals, and scenes of daily life—ideal for observing the relationship between a pattern and its complete carrier.",
      hours: "Wednesday–Sunday · 08:30–16:30",
      ticket: "Admission: under 100 THB",
    },
    fam: {
      chineseName: "FAM Fahlanna Art Museum",
      description:
        "Observe how traditional elements enter contemporary visual expression through space, light, moving images, and current exhibitions—an especially useful place to find clues for reinterpretation.",
      hours: "10:00–19:00 · Closed Wednesday",
      ticket: "Admission: 300–500 THB",
    },
  },
  th: {
    lanna_folklife: {
      chineseName: "พิพิธภัณฑ์พื้นถิ่นล้านนา",
      description:
        "ทำความรู้จักวัฒนธรรมล้านนาผ่านสิ่งทอ เครื่องเขิน เครื่องปั้นดินเผา งานจักสาน จิตรกรรมฝาผนัง และฉากชีวิตประจำวัน เหมาะสำหรับสังเกตความสัมพันธ์ระหว่างลวดลายกับวัตถุหรือบริบททั้งหมด",
      hours: "วันพุธ–อาทิตย์ · 08:30–16:30 น.",
      ticket: "ค่าเข้าชม: ต่ำกว่า 100 บาท",
    },
    fam: {
      chineseName: "พิพิธภัณฑ์ศิลปะฟ้าล้านนา",
      description:
        "สังเกตว่าองค์ประกอบดั้งเดิมเข้าสู่การสื่อสารภาพร่วมสมัยอย่างไร ผ่านพื้นที่ แสง ภาพเคลื่อนไหว และนิทรรศการร่วมสมัย เหมาะอย่างยิ่งสำหรับค้นหาเบาะแสในการตีความใหม่",
      hours: "10:00–19:00 น. · ปิดวันพุธ",
      ticket: "ค่าเข้าชม: 300–500 บาท",
    },
  },
};

const taxonomy = {
  en: {
    织物: "Textile",
    器物: "Object",
    建筑: "Architecture",
    雕塑: "Sculpture",
    壁画: "Mural",
    编织结构: "Woven structure",
    装置: "Installation",
    当代艺术: "Contemporary art",
    服饰: "Clothing",
    漆绘: "Lacquer painting",
    重复: "Repetition",
    对称: "Symmetry",
    交织: "Interlacing",
    环绕: "Encircling",
    放射: "Radiating",
    延伸: "Extension",
    层叠: "Layering",
    竹: "Bamboo",
    织物: "Textile",
    金线: "Gold thread",
    陶: "Ceramic",
    釉: "Glaze",
    颜料: "Pigment",
    灰泥: "Plaster",
    木: "Wood",
    金属: "Metal",
    漆: "Lacquer",
    金: "Gold",
  },
  th: {
    织物: "สิ่งทอ",
    器物: "ภาชนะหรือวัตถุ",
    建筑: "สถาปัตยกรรม",
    雕塑: "ประติมากรรม",
    壁画: "จิตรกรรมฝาผนัง",
    编织结构: "โครงสร้างจักสาน",
    装置: "ศิลปะจัดวาง",
    当代艺术: "ศิลปะร่วมสมัย",
    服饰: "เครื่องแต่งกาย",
    漆绘: "งานเขียนลายรัก",
    重复: "ซ้ำ",
    对称: "สมมาตร",
    交织: "สอดประสาน",
    环绕: "โอบล้อม",
    放射: "แผ่ออกจากศูนย์กลาง",
    延伸: "ต่อเนื่อง",
    层叠: "ซ้อนชั้น",
    竹: "ไม้ไผ่",
    织物: "สิ่งทอ",
    金线: "ดิ้นทอง",
    陶: "เซรามิก",
    釉: "เคลือบ",
    颜料: "สี",
    灰泥: "ปูนฉาบ",
    木: "ไม้",
    金属: "โลหะ",
    漆: "รัก",
    金: "ทอง",
  },
};

const archiveTranslations = {
  en: {
    "CMI-LN-0044": ["Gilt scrollwork and mythical creature · Preview sample", "Lacquerware and Buddhist art gallery", "The vine continues growing after curling around the mythical creature’s outline, making the detail feel like an unbroken narrative line.", "This image is an experience-preview asset. The formal archive will follow on-site source records.", "Are there fixed rules for placing scrollwork and mythical creatures together?"],
    "CMI-LN-0043": ["Mirrored lotus-petal halo · Preview sample", "Contemporary visual gallery", "Lotus petals radiate outward from the center, while the mirrored surface folds both viewer and gallery into the pattern.", "This image is an experience-preview asset.", "Does reflective material change how a traditional lotus motif is viewed?"],
    "CMI-LN-0042": ["Hexagonal star openings in bamboo weave · Preview sample", "Daily objects and weaving gallery", "Where bamboo strips press over one another, star-shaped openings appear; structure and decoration become the same thing.", "This image is an experience-preview asset.", "Do different opening sizes correspond to different object uses?"],
    "CMI-LN-0041": ["Vermilion woven band with gold points · Preview sample", "Clothing and textile gallery", "Saturated vermilion creates a continuous rhythm, while gold flashes only briefly at the diamond-shaped junctions.", "This image is an experience-preview asset.", "Does the position of the gold thread change with the part of the garment?"],
    "CMI-LN-0040": ["Indigo stepped-diamond weave · Preview sample", "Lanna textile gallery", "Each diamond is built from smaller stepped edges. From afar it looks orderly; up close, differences made by hand become visible.", "This image is an experience-preview asset.", "Do the stepped edges come from the loom structure or the pattern design?"],
    "CMI-LN-0039": ["Celadon wave-and-lotus line · Preview sample", "Contemporary Lanna objects gallery", "Shallow incised lines appear and disappear with the vessel’s curve; the complete lotus only becomes visible as the viewer moves.", "This image is an experience-preview asset.", "Is light part of how this shallow-incised pattern works?"],
    "CMI-LN-0038": ["Rows of floral mural borders · Preview sample", "Murals and daily-life scenes gallery", "A continuous floral border frames the human narrative, making the ornament feel like a measure of time within the image.", "This image is an experience-preview asset.", "Does the number of repetitions relate to sections of the story?"],
    "CMI-LN-0037": ["Double-layer teak flame motif · Preview sample", "Woodcarving and architectural elements gallery", "Inner and outer pointed petals rise in the same direction, making the still woodcarving seem to be growing.", "This image is an experience-preview asset.", "Could the flame motif’s direction indicate where the element was originally installed?"],
    "CMI-LN-0036": ["Purple-and-gold floral-center matrix · Preview sample", "Digital and moving-image gallery", "A traditional floral center is separated into evenly spaced units; repetition gives it a pixel-like contemporary rhythm.", "This image is an experience-preview asset.", "Once the unit is digitized, which proportions must remain for it to be recognizable?"],
    "CMI-LN-0035": ["Gold-leaf spiral on black lacquer · Preview sample", "Lacquerware and decorative arts gallery", "Leaves alternate along a curling line, producing a dense arrangement that still keeps a clear direction.", "This image is an experience-preview asset.", "Does the alternating leaf rhythm follow the order in which it was painted?"],
    "CMI-LN-0034": ["Black-and-gold lacquered decorative panel · Preview sample", "Lacquerware and decorative arts gallery", "Golden vines turn continuously across black lacquer; flowers, leaves, and mythical creatures share one path of growth.", "This image is an experience-preview asset. Formal records will retain participants’ label photographs and source information.", "How does this continuous scroll structure relate to the carrier’s edge and use?"],
    "CMI-LN-0033": ["Indigo diamond weave · Preview sample", "Textile gallery", "Diamond units repeat with small variations, leaving a rhythmic irregularity that reveals the handwoven process.", "This image is an experience-preview asset. Formal records follow on-site labels and museum information.", "Do the color and nested diamonds correspond to a specific weaving technique?"],
    "CMI-LN-0032": ["Figure band in a temple mural · Preview sample", "Murals and daily-life scenes gallery", "Figures unfold in a horizontal rhythm while a floral-leaf border wraps the narrative scene.", "This image is an experience-preview asset.", "Does the sequence of figures come from a particular story or ritual order?"],
    "CMI-LN-0031": ["Teak flame-and-lotus motif · Preview sample", "Woodcarving and architectural elements gallery", "Lotus petals and flame-like forms rise in layers; light makes the pattern’s direction more visible than its color.", "This image is an experience-preview asset.", "Where on a building does this form most often appear?"],
    "CMI-LN-0030": ["Incised celadon lotus-cloud motif · Preview sample", "Contemporary Lanna objects gallery", "Shallow lines hover beneath the blue-green glaze; repetition emerges through light rather than strong color.", "This image is an experience-preview asset.", "How does the order of glazing and incising affect the final appearance?"],
    "CMI-LN-0029": ["Vermilion band with gold thread · Preview sample", "Clothing and textile gallery", "The narrow woven band uses high-contrast color to create direction, with gold thread appearing only at its turns.", "This image is an experience-preview asset.", "Which part of a garment did this band originally join or emphasize?"],
    "CMI-LN-0028": ["Star-shaped bamboo weave · Preview sample", "Daily life and weaving gallery", "A single bamboo strip is unremarkable; only after interlacing do continuous star-shaped openings emerge.", "This image is an experience-preview asset.", "Is the weave density determined by the load the object must carry?"],
    "CMI-LN-0027": ["Purple-and-gold mirrored floral motif · Preview sample", "Contemporary visual gallery", "A traditional flower is separated into mirrored units; purple and metallic reflections give it the feel of a digital interface.", "This image is an experience-preview asset.", "After the traditional unit is rearranged, which recognizable features remain?"],
  },
  th: {
    "CMI-LN-0044": ["ลายเครือเถาปิดทองกับสัตว์หิมพานต์ · ตัวอย่างทดลอง", "ส่วนจัดแสดงเครื่องเขินและพุทธศิลป์", "เถาวัลย์เลื้อยอ้อมเส้นรอบรูปของสัตว์หิมพานต์แล้วเติบโตต่อ ทำให้รายละเอียดนี้เหมือนเส้นเรื่องที่ไม่ขาดตอน", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์ คลังฉบับจริงจะยึดบันทึกแหล่งที่มาจากสถานที่จริง", "การวางลายเครือเถากับสัตว์หิมพานต์ในภาพเดียวกันมีกฎตายตัวหรือไม่"],
    "CMI-LN-0043": ["รัศมีกลีบบัวสะท้อนเงา · ตัวอย่างทดลอง", "ส่วนจัดแสดงทัศนศิลป์ร่วมสมัย", "กลีบบัวแผ่ออกจากศูนย์กลาง พื้นผิวกระจกดึงทั้งผู้ชมและห้องจัดแสดงเข้าไปซ้อนอยู่ในลวดลาย", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "วัสดุสะท้อนแสงเปลี่ยนวิธีมองลายบัวดั้งเดิมหรือไม่"],
    "CMI-LN-0042": ["ช่องดาวหกเหลี่ยมในงานจักสานไม้ไผ่ · ตัวอย่างทดลอง", "ส่วนจัดแสดงเครื่องใช้และงานจักสาน", "เมื่อเส้นตอกไม้ไผ่กดทับกัน จะเกิดช่องว่างรูปดาวหกเหลี่ยม โครงสร้างและการตกแต่งจึงเป็นสิ่งเดียวกัน", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "ขนาดช่องว่างที่ต่างกันสัมพันธ์กับการใช้งานของภาชนะต่างชนิดหรือไม่"],
    "CMI-LN-0041": ["แถบผ้าสีชาดแต้มดิ้นทอง · ตัวอย่างทดลอง", "ส่วนจัดแสดงเครื่องแต่งกายและสิ่งทอ", "สีชาดเข้มสร้างจังหวะต่อเนื่อง ส่วนสีทองปรากฏวาบเพียงตรงจุดเชื่อมรูปสี่เหลี่ยมข้าวหลามตัด", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "ตำแหน่งดิ้นทองเปลี่ยนไปตามส่วนต่าง ๆ ของเครื่องแต่งกายหรือไม่"],
    "CMI-LN-0040": ["ลายสี่เหลี่ยมข้าวหลามตัดขั้นบันไดสีคราม · ตัวอย่างทดลอง", "ส่วนจัดแสดงสิ่งทอล้านนา", "สี่เหลี่ยมข้าวหลามตัดแต่ละรูปประกอบจากขอบขั้นบันไดย่อย มองไกลเห็นความเป็นระเบียบ แต่มองใกล้เห็นความแตกต่างจากงานมือ", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "ขอบขั้นบันไดเกิดจากโครงสร้างกี่ทอผ้าหรือจากการออกแบบลวดลาย"],
    "CMI-LN-0039": ["เส้นคลื่นน้ำและบัวบนศิลาดล · ตัวอย่างทดลอง", "ส่วนจัดแสดงเครื่องใช้ล้านนาร่วมสมัย", "เส้นสลักตื้นปรากฏและเลือนหายไปตามความโค้งของภาชนะ ต้องขยับสายตาจึงจะเห็นลายบัวทั้งหมด", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "แสงเป็นส่วนหนึ่งของการรับรู้ลายสลักตื้นประเภทนี้หรือไม่"],
    "CMI-LN-0038": ["แถวกรอบลายดอกไม้ในจิตรกรรมฝาผนัง · ตัวอย่างทดลอง", "ส่วนจัดแสดงจิตรกรรมฝาผนังและวิถีชีวิต", "กรอบดอกไม้ต่อเนื่องล้อมเรื่องราวของผู้คน ทำให้ลายขอบดูเหมือนหน่วยนับเวลาภายในภาพ", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "จำนวนครั้งที่ลายขอบซ้ำสัมพันธ์กับตอนต่าง ๆ ของเรื่องหรือไม่"],
    "CMI-LN-0037": ["ลายเปลวไฟไม้สักสองชั้น · ตัวอย่างทดลอง", "ส่วนจัดแสดงงานแกะไม้และองค์ประกอบสถาปัตยกรรม", "กลีบแหลมชั้นในและชั้นนอกพุ่งขึ้นในทิศเดียวกัน ทำให้งานแกะไม้ที่นิ่งดูเหมือนกำลังเติบโต", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "ทิศทางของลายเปลวไฟอาจบอกตำแหน่งติดตั้งเดิมของชิ้นส่วนได้หรือไม่"],
    "CMI-LN-0036": ["ตารางเกสรดอกไม้สีม่วงทอง · ตัวอย่างทดลอง", "ส่วนจัดแสดงดิจิทัลและภาพเคลื่อนไหว", "เกสรดอกไม้แบบดั้งเดิมถูกแยกเป็นหน่วยที่เว้นระยะเท่ากัน เมื่อทำซ้ำจึงเกิดจังหวะร่วมสมัยคล้ายพิกเซล", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "เมื่อหน่วยถูกแปลงเป็นดิจิทัล สัดส่วนใดต้องคงไว้จึงจะยังจำแนกได้"],
    "CMI-LN-0035": ["ใบไม้ทองหมุนวนบนพื้นรักดำ · ตัวอย่างทดลอง", "ส่วนจัดแสดงเครื่องเขินและมัณฑนศิลป์", "ใบไม้เรียงสลับหน้าหลังตามเส้นโค้งหมุนวน แม้หนาแน่นแต่ยังคงทิศทางที่ชัดเจน", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "จังหวะสลับของใบไม้เกิดจากลำดับการวาดหรือไม่"],
    "CMI-LN-0034": ["แผงตกแต่งรักดำทอง · ตัวอย่างทดลอง", "ส่วนจัดแสดงเครื่องเขินและมัณฑนศิลป์", "เครือเถาสีทองเลี้ยวต่อเนื่องบนพื้นรักดำ ดอก ใบ และสัตว์หิมพานต์ใช้เส้นทางการเติบโตร่วมกัน", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์ บันทึกฉบับจริงจะเก็บภาพป้ายและข้อมูลที่มาจากผู้เข้าร่วมไว้", "โครงสร้างเครือเถาต่อเนื่องนี้สัมพันธ์กับขอบและการใช้งานของวัตถุอย่างไร"],
    "CMI-LN-0033": ["ลายทอสี่เหลี่ยมข้าวหลามตัดสีคราม · ตัวอย่างทดลอง", "ส่วนจัดแสดงสิ่งทอ", "หน่วยสี่เหลี่ยมข้าวหลามตัดซ้ำกันพร้อมความคลาดเล็กน้อย ความไม่สม่ำเสมอที่มีจังหวะเผยให้เห็นกระบวนการทอด้วยมือ", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์ บันทึกฉบับจริงจะยึดป้ายและข้อมูลของพิพิธภัณฑ์", "สีและชั้นของสี่เหลี่ยมข้าวหลามตัดสัมพันธ์กับเทคนิคการทอเฉพาะหรือไม่"],
    "CMI-LN-0032": ["แถบภาพบุคคลในจิตรกรรมฝาผนังวัด · ตัวอย่างทดลอง", "ส่วนจัดแสดงจิตรกรรมฝาผนังและวิถีชีวิต", "ตัวละครเรียงไปตามจังหวะแนวนอน ขณะที่กรอบดอกไม้และใบไม้โอบล้อมฉากเรื่องราว", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "ลำดับตัวละครมาจากเรื่องราวหรือพิธีกรรมใดโดยเฉพาะหรือไม่"],
    "CMI-LN-0031": ["ลายบัวเปลวไฟไม้สัก · ตัวอย่างทดลอง", "ส่วนจัดแสดงงานแกะไม้และองค์ประกอบสถาปัตยกรรม", "กลีบบัวและรูปเปลวไฟยกตัวขึ้นเป็นชั้น แสงทำให้ทิศทางของลวดลายเด่นชัดกว่าสี", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "รูปแบบนี้มักปรากฏในส่วนใดของอาคาร"],
    "CMI-LN-0030": ["ลายสลักบัวเมฆบนศิลาดล · ตัวอย่างทดลอง", "ส่วนจัดแสดงเครื่องใช้ล้านนาร่วมสมัย", "เส้นสลักตื้นปรากฏราง ๆ ใต้เคลือบสีเขียวอมฟ้า โครงสร้างซ้ำเกิดจากแสงมากกว่าสีที่รุนแรง", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "ลำดับการเคลือบและสลักส่งผลต่อภาพสุดท้ายอย่างไร"],
    "CMI-LN-0029": ["แถบผ้าสีชาดกับดิ้นทอง · ตัวอย่างทดลอง", "ส่วนจัดแสดงเครื่องแต่งกายและสิ่งทอ", "แถบผ้าแคบใช้สีตัดกันสูงสร้างทิศทาง และดิ้นทองปรากฏเฉพาะจุดที่ลายเลี้ยว", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "แถบผ้านี้เดิมใช้เชื่อมหรือเน้นส่วนใดของเครื่องแต่งกาย"],
    "CMI-LN-0028": ["ลายดาวจากตอกไม้ไผ่ · ตัวอย่างทดลอง", "ส่วนจัดแสดงวิถีชีวิตและงานจักสาน", "ตอกไม้ไผ่เส้นเดียวไม่โดดเด่น แต่เมื่อสอดประสานกันจึงเกิดช่องรูปดาวต่อเนื่อง", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "ความหนาแน่นของการสานกำหนดจากน้ำหนักที่ภาชนะต้องรับหรือไม่"],
    "CMI-LN-0027": ["ลายดอกไม้กระจกสีม่วงทอง · ตัวอย่างทดลอง", "ส่วนจัดแสดงทัศนศิลป์ร่วมสมัย", "รูปดอกไม้ดั้งเดิมถูกแยกเป็นหน่วยสะท้อนกัน สีม่วงและเงาโลหะทำให้รู้สึกคล้ายส่วนติดต่อดิจิทัล", "ภาพนี้เป็นสื่อสำหรับทดลองประสบการณ์บนเว็บไซต์", "เมื่อจัดหน่วยดั้งเดิมใหม่ ลักษณะใดที่ยังทำให้เราจำแนกมันได้"],
  },
};

const filterLabels = {
  en: {
    全部博物馆: "All museums",
    兰纳民俗博物馆: "Lanna Folklife Centre",
    全部载体: "All carriers",
    编织: "Weaving",
    全部结构: "All structures",
  },
  th: {
    全部博物馆: "พิพิธภัณฑ์ทั้งหมด",
    兰纳民俗博物馆: "พิพิธภัณฑ์พื้นถิ่นล้านนา",
    全部载体: "วัตถุรองรับลวดลายทั้งหมด",
    编织: "งานจักสาน",
    全部结构: "โครงสร้างทั้งหมด",
  },
};

export function getParticipationSteps(language) {
  if (language === "zh") return participationSteps;
  return participationSteps.map((step, index) => {
    const [phase, title, description] = stepTranslations[language][index];
    return { ...step, phase, title, description };
  });
}

export function getMuseums(language) {
  if (language === "zh") return museums;
  return museums.map((museum) => ({
    ...museum,
    ...museumTranslations[language][museum.id],
  }));
}

export function getFilterOptions(language) {
  if (language === "zh") return filterOptions;
  return Object.fromEntries(
    Object.entries(filterOptions).map(([key, options]) => [
      key,
      options.map((option) => ({
        ...option,
        label:
          filterLabels[language][option.label] ||
          taxonomy[language][option.label] ||
          option.label,
      })),
    ]),
  );
}

export function localizePattern(pattern, language) {
  if (!pattern) return pattern;

  const translated =
    archiveProvenanceTranslations[language]?.[pattern.archive_number] ||
    productionArchiveTranslations[language]?.[pattern.archive_number] ||
    archiveTranslations[language]?.[pattern.archive_number];
  if (language === "zh") {
    if (!translated) return pattern;
    return {
      ...pattern,
      source_title: translated[0] || pattern.source_title,
      source_location: translated[1] || pattern.source_location,
      observation: translated[2] || pattern.observation,
      verified_information: translated[3] || pattern.verified_information,
      open_question: translated[4] || pattern.open_question,
    };
  }
  const localizedTaxonomy = {
    ...taxonomy[language],
    ...productionTaxonomy[language],
  };
  const localizedMuseum =
    pattern.museum === "fam"
      ? language === "th"
        ? "พิพิธภัณฑ์ศิลปะฟ้าล้านนา"
        : "FAM Fahlanna Art Museum"
      : language === "th"
        ? "พิพิธภัณฑ์พื้นถิ่นล้านนา"
        : "Lanna Folklife Centre";
  const collectorNames = {
    "CMI-林可": "CMI-Lin Ke",
    林可: "Lin Ke",
    王珅: "Wang Shen",
    紫姀: "Zi He",
  };

  return {
    ...pattern,
    museumLabel: localizedMuseum,
    source_title: translated?.[0] || pattern.source_title,
    source_location: translated?.[1] || pattern.source_location,
    observation: translated?.[2] || pattern.observation,
    verified_information: translated?.[3] || pattern.verified_information,
    open_question: translated?.[4] || pattern.open_question,
    carrier_tags: pattern.carrier_tags?.map(
      (value) => localizedTaxonomy[value] || value,
    ),
    position_tags: pattern.position_tags?.map(
      (value) => localizedTaxonomy[value] || value,
    ),
    structure_tags: pattern.structure_tags?.map(
      (value) => localizedTaxonomy[value] || value,
    ),
    material_tags: pattern.material_tags?.map(
      (value) => localizedTaxonomy[value] || value,
    ),
    collector_name:
      pattern.collector_name === "匿名采集者"
        ? language === "th"
          ? "ผู้เก็บไม่ระบุชื่อ"
          : "Anonymous collector"
        : collectorNames[pattern.collector_name] || pattern.collector_name,
  };
}

export function getArchiveSamples(language) {
  return archiveSamples.map((pattern) => localizePattern(pattern, language));
}
