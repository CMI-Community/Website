const unverifiedChatGptNote = {
  zh: "UNKNOWN / 未经核验的记录：原提交中包含一段由 ChatGPT 生成的长篇解释，将该织物与靛蓝蜡染、苗族工艺、迁徙、星形、菱形和天然染料相联系。这些说法没有得到展签或可靠来源的核验，不应作为博物馆事实引用。",
  en: "UNKNOWN / Unverified note: the stored submission contains a long ChatGPT-generated interpretation linking the textile to indigo batik, Hmong craft, migration, stars, diamonds, and natural dyes. These claims were not verified from a museum label or reliable source and must not be treated as museum facts.",
  th: "UNKNOWN / บันทึกที่ยังไม่ยืนยัน: ข้อมูลเดิมมีคำอธิบายยาวจาก ChatGPT ที่เชื่อมโยงผ้านี้กับบาติกคราม งานหัตถกรรมม้ง การย้ายถิ่น ดาว สี่เหลี่ยมข้าวหลามตัด และสีย้อมธรรมชาติ ข้อความเหล่านี้ไม่ได้ยืนยันจากป้ายพิพิธภัณฑ์หรือแหล่งข้อมูลที่น่าเชื่อถือ จึงห้ามใช้เป็นข้อเท็จจริงของพิพิธภัณฑ์",
};

export const archiveProvenanceTranslations = {
  zh: {
    "CMI-LN-0047": ["手工布艺桌垫", "大厅", "因为售价 1,050 泰铢而注意到它。图案有内在的秩序感，也让我想到符号性纹样作为工艺品的可能。", unverifiedChatGptNote.zh, "这个蜡染的过程到底是怎样的？"],
    "CMI-LN-0046": ["蜡染枕套", "大厅", "因为售价 1,050 泰铢而注意到它。图案有内在的秩序感，也让我想到符号性纹样作为工艺品的可能。", unverifiedChatGptNote.zh, "这个蜡染的过程到底是怎样的？"],
  },
  en: {
    "CMI-LN-0047": ["Handmade textile table mat", "Lobby", "The price—1,050 THB—caught my attention. The pattern is attractive and has an internal sense of order; I think symbolic patterns work well as craft objects.", unverifiedChatGptNote.en, "What exactly is the process used to make this batik?"],
    "CMI-LN-0046": ["Batik cushion cover", "Lobby", "The price—1,050 THB—caught my attention. The pattern is attractive and has an internal sense of order; I think symbolic patterns work well as craft objects.", unverifiedChatGptNote.en, "What exactly is the process used to make this batik?"],
  },
  th: {
    "CMI-LN-0047": ["แผ่นรองโต๊ะผ้าทำมือ", "โถง", "ราคาที่ 1,050 บาทดึงดูดความสนใจ ลวดลายสวยและมีระเบียบภายใน ฉันคิดว่าลายเชิงสัญลักษณ์เหมาะกับการทำเป็นงานหัตถกรรม", unverifiedChatGptNote.th, "กระบวนการทำบาติกชิ้นนี้เป็นอย่างไรแน่"],
    "CMI-LN-0046": ["ปลอกหมอนบาติก", "โถง", "ราคาที่ 1,050 บาทดึงดูดความสนใจ ลวดลายสวยและมีระเบียบภายใน ฉันคิดว่าลายเชิงสัญลักษณ์เหมาะกับการทำเป็นงานหัตถกรรม", unverifiedChatGptNote.th, "กระบวนการทำบาติกชิ้นนี้เป็นอย่างไรแน่"],
  },
};

export function publicVerifiedInformation(archiveNumber, sourceValue) {
  return archiveProvenanceTranslations.zh[archiveNumber]?.[3] ?? sourceValue;
}
