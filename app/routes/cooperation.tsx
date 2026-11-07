import "./cooperation.css";

const sections = [
  {
    id: "people-and-questions",
    label: "从人和问题出发",
    title: "请从社区中的人和问题出发",
    paragraphs: [
      "我们希望了解：你想与哪些人交流？他们面对什么具体处境？你的经验能帮助大家讨论什么？活动不必适合所有成员，但需要有明确的交流对象和价值。仅把现成内容换一个标题，并不等于与社区建立了关联。",
    ],
  },
  {
    id: "real-practice",
    label: "真实的实践与分享",
    title: "我们看重真实，而不只是表达",
    paragraphs: [
      "分享应与分享者平时实际做的事情相连，而不是专门为 CMI 准备一个“少推广”的版本。亲历、观察和推测，请尽量区分清楚。我们不要求成功履历，也欢迎失败、困惑和未完成的尝试；涉及保密的信息可以不披露。",
    ],
  },
  {
    id: "purpose",
    label: "提前说明合作目的",
    title: "合作目的请提前说清楚",
    paragraphs: [
      "介绍业务、寻找客户、招募成员或建立后续合作，都可以坦诚讨论，但不能以知识交流为名，隐去实际目的。即使参与者不购买、不加入、不继续联系，活动本身也应有独立价值。若主要需求是曝光或转化，请直接说明，不要包装成共同讨论。",
    ],
  },
  {
    id: "equal-dialogue",
    label: "平等对话与独立判断",
    title: "我们期待平等对话，而不是单向说服",
    paragraphs: [
      "讲者、合作方、主理人和参与者，都以具体的人参与交流。专业经验值得尊重，但身份、资源或组织角色，不意味着谁的判断天然更有分量。参与者的生活经验、疑问和不同意见，同样值得认真回应。",
      "分享者需要愿意倾听、接受追问，也允许自己的观点被补充或修正；主理人同样如此。活动应为参与者之间的交流留出空间。我们不要求最终达成一致，也不把认同某套理念作为参与或建立关系的前提。",
      "平等不意味着每个人的专业知识都一样，而是每个人都保有表达、质疑和独立判断的权利。参与者不是等待被教育或被转化的对象。",
    ],
  },
  {
    id: "invitation",
    label: "邀请交流的边界",
    title: "邀请交流，不等于认可或背书",
    paragraphs: [
      "CMI 举办一场活动，不代表认同合作方的全部观点、产品或业务。参与者出席活动，也不等于同意加入组织、接受推销或被进一步联系。后续连接应由参与者自主选择。",
    ],
  },
  {
    id: "confirming-cooperation",
    label: "沟通与合作确认",
    title: "先了解彼此，再确认合作",
    paragraphs: [
      "提出合作时，请简单说明：谁来分享、实际参与过什么、希望讨论什么问题、面向哪些人，以及你希望从合作中获得什么。",
      "我们会结合内容关联、组织能力和社区当下的安排作出选择，也愿意说明关键考量、听取不同意见。开始沟通不代表已经确认合作；暂时不合适，也不等于否定对方的价值。",
    ],
  },
];

export function meta() {
  const title = "CMI 活动合作须知｜CMI Community";
  const description = "在提出合作之前，了解 CMI 对真实实践、合作目的、平等对话与参与者自主选择的期待。讨论稿，供合作沟通使用。";
  return [
    { title },
    { name: "description", content: description },
    { tagName: "link", rel: "canonical", href: "https://cmi.community/cooperation" },
    { property: "og:type", content: "article" },
    { property: "og:site_name", content: "CMI Community" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: "https://cmi.community/cooperation" },
    { name: "twitter:card", content: "summary" },
  ];
}

export default function Cooperation() {
  return (
    <div className="cooperation-page" id="top">
      <a className="cooperation-skip" href="#cooperation-content">跳到正文</a>
      <header className="cooperation-header">
        <a className="cooperation-brand" href="/" aria-label="CMI Community 首页">
          <img src="/brand/cmi-community-logo.png" alt="" width="40" height="40" />
          <span>CMI COMMUNITY</span>
        </a>
        <a className="cooperation-home" href="/">返回首页 <span aria-hidden="true">↗</span></a>
      </header>

      <main className="cooperation-main">
        <div className="cooperation-intro">
          <p className="cooperation-eyebrow">ACTIVITY COOPERATION</p>
          <h1>CMI 活动合作须知</h1>
          <p className="cooperation-draft">讨论稿 · 供合作沟通使用</p>
          <p className="cooperation-opening">在提出合作之前，我们希望先说清楚几件事。</p>
          <p>我们欢迎不同经验和观点，也欢迎有商业目的的合作。但社区伙伴的时间、注意力和信任，不能被默认当作可供使用的资源。我们更关心：这次相遇，为什么值得发生？</p>
        </div>

        <div className="cooperation-layout">
          <nav className="cooperation-contents" aria-label="合作须知目录">
            <p className="cooperation-eyebrow">阅读目录</p>
            <ol>
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}><span aria-hidden="true">0{index + 1}</span>{section.label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="cooperation-article" id="cooperation-content" tabIndex={-1} aria-label="合作须知正文">
            {sections.map((section, index) => (
              <section className="cooperation-section" id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
                <p className="cooperation-section-number" aria-hidden="true">0{index + 1}</p>
                <h2 id={`${section.id}-title`}>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </section>
            ))}
            <p className="cooperation-closing">我们期待的，不只是把一场活动办完，而是让参与者在真实的交流里，更理解彼此，也更有能力形成自己的判断。</p>
          </article>
        </div>
      </main>

      <footer className="cooperation-footer">
        <span>CMI COMMUNITY · CHIANG MAI</span>
        <a href="#top">返回顶部 <span aria-hidden="true">↑</span></a>
      </footer>
    </div>
  );
}
