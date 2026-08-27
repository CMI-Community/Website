export const ideaCategories = [
  { value: "any", label: "随便来一个" },
  { value: "writing", label: "写内容" },
  { value: "image", label: "作图" },
  { value: "video", label: "视频" },
  { value: "website", label: "网站" },
  { value: "3d", label: "3D" },
  { value: "game", label: "游戏" },
  { value: "audio", label: "声音" },
  { value: "assistant", label: "AI 助手" },
  { value: "installation", label: "实体装置" },
];

const localizedCategoryLabels = {
  en: {
    any: "Surprise me",
    writing: "Writing",
    image: "Image",
    video: "Video",
    website: "Website",
    "3d": "3D",
    game: "Game",
    audio: "Sound",
    assistant: "AI assistant",
    installation: "Physical installation",
  },
  th: {
    any: "สุ่มให้ฉัน",
    writing: "งานเขียน",
    image: "ภาพ",
    video: "วิดีโอ",
    website: "เว็บไซต์",
    "3d": "3D",
    game: "เกม",
    audio: "เสียง",
    assistant: "ผู้ช่วย AI",
    installation: "ศิลปะจัดวาง",
  },
};

export function getIdeaCategories(language = "zh") {
  if (language === "zh") return ideaCategories;
  return ideaCategories.map((item) => ({
    ...item,
    label: localizedCategoryLabels[language][item.value],
  }));
}

const categoryMeta = {
  writing: { label: "写内容", code: "WORDS", tone: "orange" },
  image: { label: "作图", code: "IMAGE", tone: "pink" },
  video: { label: "视频", code: "MOTION", tone: "cyan" },
  website: { label: "网站", code: "WEB", tone: "green" },
  "3d": { label: "3D", code: "OBJECT", tone: "yellow" },
  game: { label: "游戏", code: "PLAY", tone: "pink" },
  audio: { label: "声音", code: "SOUND", tone: "cyan" },
  assistant: { label: "AI 助手", code: "AGENT", tone: "green" },
  installation: { label: "实体装置", code: "SPACE", tone: "orange" },
};

function first(values, fallback) {
  return values?.find((value) => String(value).trim()) || fallback;
}

function clip(value, fallback, maxLength = 44) {
  const normalized = String(value || fallback).trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength)}…`;
}

function describe(pattern) {
  return {
    title: clip(pattern?.source_title, "这枚纹样", 30),
    location: clip(pattern?.source_location, "它的原始展陈位置", 32),
    observation: clip(pattern?.observation, "采集者对纹样的现场观察", 54),
    question: clip(pattern?.open_question, "它为什么出现在这里？", 52),
    carrier: first(pattern?.carrier_tags, "完整载体"),
    structure: first(pattern?.structure_tags, "组织结构"),
    material: first(pattern?.material_tags, "原有材料"),
  };
}

function describeLocalized(pattern, language) {
  const fallback =
    language === "th"
      ? {
          title: "ลวดลายนี้",
          location: "ตำแหน่งจัดแสดงเดิม",
          observation: "สิ่งที่ผู้เก็บสังเกต ณ สถานที่จริง",
          question: "เหตุใดลวดลายนี้จึงปรากฏอยู่ตรงนี้",
          carrier: "วัตถุหรือบริบททั้งหมด",
          structure: "โครงสร้างการจัดวาง",
          material: "วัสดุเดิม",
        }
      : {
          title: "this pattern",
          location: "its original display location",
          observation: "the collector’s on-site observation",
          question: "Why does it appear here?",
          carrier: "the complete carrier",
          structure: "its organizing structure",
          material: "the original material",
        };

  return {
    title: clip(pattern?.source_title, fallback.title, 80),
    location: clip(pattern?.source_location, fallback.location, 80),
    observation: clip(pattern?.observation, fallback.observation, 120),
    question: clip(pattern?.open_question, fallback.question, 120),
    carrier: first(pattern?.carrier_tags, fallback.carrier),
    structure: first(pattern?.structure_tags, fallback.structure),
    material: first(pattern?.material_tags, fallback.material),
  };
}

const localizedBuilders = {
  en: {
    writing: (p) => ({
      look: `Begin with the still-unanswered question: “${p.question}”`,
      use: `Work with the label, close-up and complete images of ${p.title}, and the observation “${p.observation}”`,
      make:
        "Write a visual pattern story that leads readers from one detail back to the complete work and its source",
      ai:
        "Use AI to organize clues, propose interview questions, structure the story, and draft multiple language versions; keep every factual claim tied to a recorded source",
    }),
    image: (p) => ({
      look: `Explore how ${p.structure} can move, repeat, or pause across an image`,
      use: `Use the pattern close-up, the complete ${p.carrier}, the texture of ${p.material}, and the archive number`,
      make:
        "Create a “pattern migration” poster in which the motif travels from its original carrier into a present-day setting",
      ai:
        "Use AI to extract color and rhythm and test several compositions; always retain the original image and source information",
    }),
    video: (p) => ({
      look: `Start from the direction and viewing rhythm created by ${p.structure}`,
      use: `Use the close-up, complete ${p.carrier}, ambient sound, and source text`,
      make:
        "Create a 15-second loop in which the pattern emerges from the original object, moves, and returns to its source",
      ai:
        "Use AI for storyboards, in-between frames, motion tests, and a voiceover draft; label the result as a creative reinterpretation",
    }),
    website: (p) => ({
      look: `Begin with what visitors still do not understand: “${p.question}”`,
      use: `Use the label, close-up and complete images, the observation “${p.observation},” and the source location`,
      make:
        "Build an exploratory one-page story where each interaction reveals one new piece of evidence or one new question",
      ai:
        "Use AI to plan the information hierarchy, draft interaction copy, and prototype the frontend; verify facts and viewing order yourself",
    }),
    "3d": (p) => ({
      look: `Study the thickness, relief, and ${p.structure} of ${p.material}`,
      use: `Use multiple viewing angles, scale observations, the complete ${p.carrier}, and the pattern’s position`,
      make:
        "Create a hand-held educational 3D concept model and display it beside photographs of the original object",
      ai:
        "Use AI to extract outlines, generate a base mesh, and test fabrication; state clearly that this is neither a restoration nor an official replica",
    }),
    game: (p) => ({
      look: `Turn the open question “${p.question}” into an investigation rather than a guessed cultural answer`,
      use: `Use a map of ${p.location}, pattern photos, verified clues, and questions still awaiting confirmation`,
      make:
        "Design a ten-minute pattern detective game where observation—not guessing—unlocks each clue",
      ai:
        "Use AI to sequence missions, create character prompts, scoring, and a playable prototype; every answer must return to a real source",
    }),
    audio: (p) => ({
      look: `Begin with the rhythm, texture, and spatial associations of ${p.material}`,
      use: `Use ambient sound, material taps or friction, the collector’s voice, and source information for ${p.title}`,
      make:
        "Produce a 30-second “sound portrait of an object” that lets listeners sense the pattern’s rhythm with their eyes closed",
      ai:
        "Use AI to clean recordings, plan sound layers, test music, and prepare accessible multilingual narration",
    }),
    assistant: (p) => ({
      look: `Ask what a visitor is most likely to wonder after seeing ${p.title}`,
      use: `Use label text, verified references, on-site observations, open questions, and complete images`,
      make:
        "Build a pattern inquiry assistant that can say “I don’t know” and clearly separates facts, observations, and imagination",
      ai:
        "Use AI to retrieve and organize permitted sources, turning low-evidence answers into concrete next research steps",
    }),
    installation: (p) => ({
      look: `Explore how movement through space can reveal ${p.structure} in a new way`,
      use: `Use the pattern outline, the texture of ${p.material}, projection, and simple camera or distance input`,
      make:
        "Create a responsive pattern-and-shadow wall: approach to see the detail, step back to see the complete carrier",
      ai:
        "Use AI to generate real-time visual behaviors and interaction code while keeping source information and a REIMAGINED label visible",
    }),
  },
  th: {
    writing: (p) => ({
      look: `เริ่มจากคำถามที่ยังไม่มีคำตอบว่า “${p.question}”`,
      use: `ใช้ป้าย ภาพระยะใกล้และภาพรวมของ ${p.title} พร้อมสิ่งที่สังเกตว่า “${p.observation}”`,
      make:
        "เขียนเรื่องเล่าลวดลายที่อ่านควบคู่กับภาพ พาผู้อ่านจากรายละเอียดกลับไปสู่วัตถุทั้งหมดและที่มา",
      ai:
        "ให้ AI ช่วยจัดเบาะแส ตั้งคำถามสัมภาษณ์ วางโครงเรื่อง และร่างหลายภาษา แต่ข้อมูลข้อเท็จจริงต้องอ้างกลับไปยังแหล่งที่มาที่บันทึกไว้",
    }),
    image: (p) => ({
      look: `สำรวจว่า ${p.structure} เคลื่อนที่ ซ้ำ หรือหยุดพักในภาพได้อย่างไร`,
      use: `ใช้ภาพลวดลายระยะใกล้ ภาพรวมของ ${p.carrier} พื้นผิวแบบ ${p.material} และหมายเลขคลัง`,
      make:
        "สร้างโปสเตอร์ “การเดินทางของลวดลาย” ให้ลายออกจากวัตถุดั้งเดิมแล้วค่อย ๆ เข้าสู่ชีวิตปัจจุบัน",
      ai:
        "ให้ AI ช่วยสกัดสีและจังหวะ ทดลองหลายองค์ประกอบ โดยเก็บภาพต้นฉบับและข้อมูลที่มาไว้เสมอ",
    }),
    video: (p) => ({
      look: `เริ่มจากทิศทางการเคลื่อนไหวและจังหวะการมองที่เกิดจาก ${p.structure}`,
      use: `ใช้ภาพระยะใกล้ ภาพรวมของ ${p.carrier} เสียงแวดล้อม และข้อความที่มา`,
      make:
        "สร้างวิดีโอวนซ้ำ 15 วินาที ให้ลวดลายปรากฏจากวัตถุ เคลื่อนไหว แล้วกลับไปยังที่มา",
      ai:
        "ให้ AI ช่วยทำสตอรีบอร์ด ภาพเชื่อม การทดสอบการเคลื่อนไหว และร่างเสียงบรรยาย พร้อมกำกับว่าเป็นการตีความสร้างสรรค์ใหม่",
    }),
    website: (p) => ({
      look: `เริ่มจากสิ่งที่ผู้ชมยังไม่เข้าใจว่า “${p.question}”`,
      use: `ใช้ป้าย ภาพระยะใกล้และภาพรวม สิ่งที่สังเกตว่า “${p.observation}” และตำแหน่งที่มา`,
      make:
        "สร้างเรื่องเล่าหน้าเดียวแบบกดสำรวจ ทุกการโต้ตอบเผยหลักฐานหรือคำถามใหม่ทีละข้อ",
      ai:
        "ให้ AI ช่วยวางลำดับข้อมูล ร่างข้อความโต้ตอบ และสร้างต้นแบบหน้าเว็บ ส่วนคุณตรวจสอบข้อเท็จจริงและลำดับการรับชม",
    }),
    "3d": (p) => ({
      look: `ศึกษาความหนา ผิวสูงต่ำ และ ${p.structure} ของวัสดุ ${p.material}`,
      use: `ใช้ภาพหลายมุม การสังเกตขนาด ภาพรวมของ ${p.carrier} และตำแหน่งลวดลาย`,
      make:
        "สร้างแบบจำลองแนวคิด 3D เพื่อการเรียนรู้ที่หยิบถือได้ แล้วจัดแสดงคู่กับภาพวัตถุต้นฉบับ",
      ai:
        "ให้ AI ช่วยสกัดเส้นรอบรูป สร้างโมเดลพื้นฐาน และทดสอบการผลิต พร้อมระบุชัดว่าไม่ใช่การบูรณะหรือสำเนาทางการ",
    }),
    game: (p) => ({
      look: `เปลี่ยนคำถาม “${p.question}” ให้เป็นภารกิจสืบค้น แทนการเดาความหมายทางวัฒนธรรม`,
      use: `ใช้แผนที่ ${p.location} ภาพลวดลาย เบาะแสที่ยืนยันแล้ว และคำถามที่ยังรอตรวจสอบ`,
      make:
        "ออกแบบเกมนักสืบลวดลาย 10 นาที ให้ผู้เล่นปลดล็อกเบาะแสด้วยการสังเกต ไม่ใช่การคาดเดา",
      ai:
        "ให้ AI ช่วยเรียงภารกิจ สร้างคำใบ้ ตัวละคร ระบบคะแนน และต้นแบบที่เล่นได้ แต่ทุกคำตอบต้องกลับไปยังแหล่งจริง",
    }),
    audio: (p) => ({
      look: `เริ่มจากจังหวะ สัมผัส และความรู้สึกเชิงพื้นที่ของวัสดุ ${p.material}`,
      use: `ใช้เสียงแวดล้อม เสียงเคาะหรือเสียดสีวัสดุ เสียงอ่านของผู้เก็บ และข้อมูลที่มาของ ${p.title}`,
      make:
        "ผลิต “ภาพเหมือนเสียงของวัตถุ” 30 วินาที ให้ผู้ฟังหลับตาแล้วยังสัมผัสจังหวะของลวดลายได้",
      ai:
        "ให้ AI ช่วยทำความสะอาดเสียง วางชั้นเสียง ทดลองดนตรี และจัดทำคำบรรยายหลายภาษาที่เข้าถึงได้",
    }),
    assistant: (p) => ({
      look: `ถามว่าผู้ชมอยากรู้อะไรมากที่สุดหลังเห็น ${p.title}`,
      use: "ใช้ข้อความป้าย เอกสารที่ยืนยันแล้ว สิ่งที่สังเกต คำถามเปิด และภาพรวมทั้งหมด",
      make:
        "สร้างผู้ช่วยถามตอบเรื่องลวดลายที่ยอมรับว่า “ยังไม่ทราบ” และแยกข้อเท็จจริง การสังเกต และจินตนาการอย่างชัดเจน",
      ai:
        "ให้ AI ค้นและจัดระเบียบแหล่งข้อมูลที่ได้รับอนุญาต และเปลี่ยนคำตอบที่หลักฐานไม่พอให้เป็นขั้นตอนค้นคว้าต่อ",
    }),
    installation: (p) => ({
      look: `สำรวจว่าการเคลื่อนที่ของผู้ชมทำให้มองเห็น ${p.structure} ในแบบใหม่ได้อย่างไร`,
      use: `ใช้เส้นรอบรูปลวดลาย พื้นผิวแบบ ${p.material} การฉายภาพ และกล้องหรือเซนเซอร์ระยะอย่างง่าย`,
      make:
        "สร้างผนังแสงเงาลวดลายที่ตอบสนองต่อร่างกาย เดินเข้าใกล้เพื่อเห็นรายละเอียด ถอยออกเพื่อเห็นวัตถุทั้งหมด",
      ai:
        "ให้ AI สร้างภาพแบบเรียลไทม์และโค้ดโต้ตอบ พร้อมแสดงข้อมูลที่มาและป้าย REIMAGINED ตลอดเวลา",
    }),
  },
};

const templates = [
  {
    id: "writing-question-essay",
    category: "writing",
    build: (p) => ({
      look: `从“${p.question}”这个尚未回答的问题出发`,
      use: `使用展签、${p.title}的局部与完整载体照片，以及“${p.observation}”这条现场观察`,
      make: "写一篇可以边看图边读的纹样小故事，让读者从细节走回完整作品",
      ai: "让 AI 整理线索、提出采访问题、搭建文章结构并生成中英双语初稿；事实部分仍以来源记录为准",
    }),
  },
  {
    id: "writing-object-letter",
    category: "writing",
    build: (p) => ({
      look: `从纹样与${p.carrier}彼此依存的关系出发`,
      use: `使用${p.material}的视觉细节、纹样所在位置、来源记录和采集者的问题`,
      make: `以“如果${p.title}会说话”为题，写一封来自器物的信或一组社交媒体连载`,
      ai: "让 AI 帮你转换叙述视角、压缩不同篇幅并生成多语言版本，同时明确标记想象段落",
    }),
  },
  {
    id: "image-migration-poster",
    category: "image",
    build: (p) => ({
      look: `从${p.structure}如何在画面中移动、重复或停顿的角度出发`,
      use: `使用纹样局部、${p.carrier}全景、${p.material}质感和来源编号`,
      make: "做一张“纹样迁徙”海报：让图案从原始载体出发，逐步进入今天的生活场景",
      ai: "让 AI 提取配色与视觉节奏、尝试多版构图并生成概念背景；原始照片和来源始终保留",
    }),
  },
  {
    id: "image-visual-system",
    category: "image",
    build: (p) => ({
      look: `从${p.title}最容易被记住的轮廓、色彩和间隔出发`,
      use: `使用局部照片、${p.material}颜色、重复单元和一张完整载体图`,
      make: "做一套当代视觉小系统：头像、贴纸、活动票和一张来源说明页",
      ai: "让 AI 批量探索比例、色彩与版式，再由你挑选哪些变化仍然保留原纹样的识别特征",
    }),
  },
  {
    id: "video-pattern-migration",
    category: "video",
    build: (p) => ({
      look: `从${p.structure}带来的运动方向和观看节奏出发`,
      use: `使用纹样局部、${p.carrier}全景、现场环境声和来源文字`,
      make: "制作一支 15 秒“纹样迁移”短片，让图案从原物中浮现、移动，再回到它的来处",
      ai: "让 AI 生成分镜、补间画面、运动测试与配音草稿；成片标注为创意再表达",
    }),
  },
  {
    id: "video-question-loop",
    category: "video",
    build: (p) => ({
      look: `从“${p.question}”这个问题如何被看见而不是被直接回答出发`,
      use: `使用三张关键照片、采集者的观察、${p.location}的空间声和一行问题字幕`,
      make: "做一支可以无限循环的微电影，让每次循环多出现一条观察线索",
      ai: "让 AI 把材料整理成三镜头结构、生成转场和声音氛围，但不替你编造历史答案",
    }),
  },
  {
    id: "website-layered-story",
    category: "website",
    build: (p) => ({
      look: `从观众还没理解的“${p.question}”出发`,
      use: `使用展签、局部与完整照片、${p.observation}以及来源位置`,
      make: "做一个可点击探索的单页故事：每点开一层，才看见一条新的证据或问题",
      ai: "让 AI 规划信息层级、生成交互文案并编写网页原型，你负责核对事实和选择观看顺序",
    }),
  },
  {
    id: "website-pattern-lens",
    category: "website",
    build: (p) => ({
      look: `从“靠近看纹样、退后看${p.carrier}”两种观看尺度出发`,
      use: "使用高清局部、完整载体、采集者标注、来源编号和一段简短观察",
      make: "做一个拖动式网页放大镜，让访客在局部与完整语境之间来回穿梭",
      ai: "让 AI 帮你生成交互逻辑、无障碍说明和前端代码，再用真实图片完成测试",
    }),
  },
  {
    id: "3d-learning-model",
    category: "3d",
    build: (p) => ({
      look: `从${p.material}的厚度、起伏和${p.structure}关系出发`,
      use: `使用多角度照片、尺寸观察、完整载体图和纹样位置说明`,
      make: "制作一个可以拿在手里观察的教育性 3D 概念模型，并与原物照片并列展示",
      ai: "让 AI 辅助提取轮廓、生成基础网格和打印测试；明确说明它不是文物复原或官方复制品",
    }),
  },
  {
    id: "3d-light-shadow",
    category: "3d",
    build: (p) => ({
      look: `从${p.structure}在光线下可能产生的阴影变化出发`,
      use: `使用纹样轮廓、${p.material}质感、透明或半透明材料和现场光线照片`,
      make: "做一件小型光影装置，让纹样不印在表面，而是投射到空间里",
      ai: "让 AI 模拟不同厚度与光源角度、生成结构草模并帮助规划低成本制作尺寸",
    }),
  },
  {
    id: "game-match-origin",
    category: "game",
    build: (p) => ({
      look: `从纹样局部与${p.carrier}完整语境的对应关系出发`,
      use: "使用局部图、完整图、展签线索、采集者问题和几张容易混淆的照片",
      make: "做一个“它原来在哪里？”配对游戏，让玩家把局部纹样送回正确载体",
      ai: "让 AI 帮你生成关卡难度、提示语、计分规则和可试玩的网页版本",
    }),
  },
  {
    id: "game-pattern-detective",
    category: "game",
    build: (p) => ({
      look: `从“${p.question}”出发，把未知变成调查任务`,
      use: `使用${p.location}地图、纹样照片、已核验线索和仍待确认的问题`,
      make: "设计一场 10 分钟纹样侦探游戏，让玩家通过观察而不是猜文化含义来解锁线索",
      ai: "让 AI 编排任务顺序、生成角色提示和快速原型，但所有答案必须回到真实来源",
    }),
  },
  {
    id: "audio-object-portrait",
    category: "audio",
    build: (p) => ({
      look: `从${p.material}给人的节奏、触感和空间联想出发`,
      use: `使用环境声、材料敲击或摩擦声、采集者朗读和${p.title}的来源信息`,
      make: "制作一段 30 秒“器物声音肖像”，让听众闭上眼也能感到纹样的节奏",
      ai: "让 AI 帮你清理录音、生成声音分层方案、尝试配乐与多语言旁白",
    }),
  },
  {
    id: "audio-question-guide",
    category: "audio",
    build: (p) => ({
      look: `从“${p.question}”如何引导观众继续观察出发`,
      use: "使用一段真人提问、三处视觉细节、现场环境声和可核验的来源说明",
      make: "做一段不急着给答案的声音导览，在每个停顿处邀请听众再看一眼",
      ai: "让 AI 整理口播节奏、制作多语言版本并生成可访问的文字稿",
    }),
  },
  {
    id: "assistant-curious-guide",
    category: "assistant",
    build: (p) => ({
      look: `从访客看到${p.title}时最可能继续追问什么出发`,
      use: "使用展签文字、已核验资料、现场观察、开放问题和完整图像",
      make: "做一个“会承认不知道”的纹样提问助手，回答时主动区分事实、观察与想象",
      ai: "让 AI 检索和组织被允许使用的资料，并在证据不足时把答案变成下一步研究建议",
    }),
  },
  {
    id: "assistant-creative-coach",
    category: "assistant",
    build: (p) => ({
      look: `从${p.structure}、${p.material}和${p.carrier}三条创作约束出发`,
      use: "使用这枚纹样的完整档案、参与者擅长的工具和现场剩余时间",
      make: "做一个现场创作教练，每次只给团队一个能在十分钟内完成的下一步",
      ai: "让 AI 根据进度拆任务、提供工具提示和准备 Pitch，但把最后的创作选择留给人",
    }),
  },
  {
    id: "installation-community-map",
    category: "installation",
    build: (p) => ({
      look: `从${p.title}如何连接一个地点与一段个人观察出发`,
      use: "使用纹样卡、清迈地图、线绳、投影和参与者写下的新问题",
      make: "做一面会继续生长的“纹样路线图”，让每个新发现都连回真实地点与载体",
      ai: "让 AI 聚类主题、生成地图说明和投影动画，但不替代参与者留下的原始记录",
    }),
  },
  {
    id: "installation-responsive-shadow",
    category: "installation",
    build: (p) => ({
      look: `从观众移动时如何重新看见${p.structure}出发`,
      use: `使用纹样轮廓、${p.material}质感、投影、摄像头或简单距离感应器`,
      make: "做一个会回应身体移动的纹样光影墙：走近看局部，退后看完整载体",
      ai: "让 AI 生成实时视觉变化和交互代码，并持续显示来源与“创意再表达”说明",
    }),
  },
];

export function generateIdea(
  pattern,
  category = "any",
  previousIdeaId = "",
  language = "zh",
) {
  let candidates = templates.filter(
    (template) => category === "any" || template.category === category,
  );

  const withoutPrevious = candidates.filter(
    (template) => template.id !== previousIdeaId,
  );
  if (withoutPrevious.length) {
    candidates = withoutPrevious;
  }

  const template =
    candidates[Math.floor(Math.random() * candidates.length)] || templates[0];
  const meta = categoryMeta[template.category];
  const localizedBuild =
    language === "zh"
      ? template.build(describe(pattern))
      : localizedBuilders[language][template.category](
          describeLocalized(pattern, language),
        );

  return {
    id: template.id,
    category: template.category,
    categoryLabel:
      language === "zh"
        ? meta.label
        : localizedCategoryLabels[language][template.category],
    code: meta.code,
    tone: meta.tone,
    ...localizedBuild,
  };
}
