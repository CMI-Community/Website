import { PROJECTS } from './projects.mjs';

function escapeHtml(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(value ?? '').replace(/[&<>"']/g, character => entities[character]);
}

export function renderHome(projects = PROJECTS) {
  const cards = projects.map(project => {
    const creator = typeof project.creator === 'string' ? project.creator.trim() : '';
    const artwork = project.image
      ? `<img src="${escapeHtml(project.image)}" alt="" width="320" height="320" decoding="async">`
      : '<div class="art art--placeholder" aria-hidden="true"></div>';
    const tagline = project.tagline ? `<p class="tagline">${escapeHtml(project.tagline)}</p>` : '';
    const creatorLine = creator ? `<p class="creator"><span class="creator-label">创作者</span>${escapeHtml(creator)}</p>` : '';
    const description = escapeHtml(project.description).replace(/\n/g, '<br>');

    return `<article class="project">
      <div class="artwork">${artwork}</div>
      <div class="project-details">
        <h2>${escapeHtml(project.name)}</h2>
        ${tagline}
        <p class="description">${description}</p>
        ${creatorLine}
      </div>
      <div class="project-action">
        <a class="action" href="${escapeHtml(project.href ?? project.prefix)}">${escapeHtml(project.actionLabel)}<span aria-hidden="true">↗</span></a>
      </div>
    </article>`;
  }).join('\n');
  return TEMPLATE.replace('<!--PROJECT_CARDS-->', () => cards);
}

const TEMPLATE = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="description" content="CMI 社区伙伴共建的工具入口。">
  <title>社区工具 · CMI Community</title>
  <style>
    :root {
      color-scheme: light;
      --paper: #f3f1e8;
      --ink: #183c30;
      --muted: #50665b;
      --line: #b7c1af;
      --lime: #d8ef98;
      --white: #fffef9;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", sans-serif;
      font-size: 16px;
      line-height: 1.7;
    }

    a { color: inherit; text-decoration: none; }
    a:focus-visible { outline: 3px solid #52700b; outline-offset: 6px; }

    header, main, footer {
      width: min(1120px, calc(100% - 96px));
      margin-inline: auto;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 30px 0;
      border-bottom: 1px solid var(--line);
    }

    .brand { display: flex; align-items: center; gap: 15px; }
    .wordmark {
      font-family: Georgia, serif;
      font-size: 29px;
      line-height: 1;
      font-weight: 700;
      letter-spacing: -1px;
    }
    .brand-label {
      font-size: 13px;
      border-left: 1px solid var(--line);
      padding-left: 15px;
      letter-spacing: .12em;
    }
    .back { font-size: 13px; }
    .back span { padding-left: 7px; }

    .hero {
      display: grid;
      grid-template-columns: 1.5fr 1fr;
      gap: 65px;
      align-items: end;
      padding: 68px 0 55px;
    }
    .eyebrow {
      font-family: Georgia, serif;
      font-size: 13px;
      letter-spacing: .12em;
      text-transform: uppercase;
      margin: 0 0 22px;
    }
    h1, .project h2 {
      font-family: "Songti SC", "Noto Serif CJK SC", serif;
      font-weight: 600;
    }
    h1 {
      font-size: clamp(40px, 5.5vw, 70px);
      letter-spacing: -.045em;
      line-height: 1.25;
      margin: 0;
    }
    .intro {
      font-size: 15px;
      color: var(--muted);
      margin: 0;
      padding-bottom: 6px;
      max-width: 300px;
    }
    .section-label {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      letter-spacing: .12em;
      padding-bottom: 15px;
      border-bottom: 1px solid var(--ink);
    }
    .project {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr) 178px;
      align-items: center;
      gap: 30px;
      padding: 24px 0;
      border-bottom: 1px solid var(--line);
    }
    .artwork {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 12px;
      background: var(--white);
      overflow: hidden;
    }
    .artwork img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .art--placeholder {
      width: 100%;
      height: 100%;
      background: var(--lime);
      position: relative;
    }
    .art--placeholder::before {
      content: "";
      position: absolute;
      width: 60%;
      height: 43%;
      border: 2px solid var(--ink);
      left: 19%;
      top: 31%;
      transform: rotate(-8deg);
    }
    .art--placeholder::after {
      content: "↗";
      position: absolute;
      top: -5%;
      right: 5%;
      font-family: Georgia, serif;
      font-size: clamp(44px, 6vw, 68px);
      line-height: 1;
    }
    .project h2 {
      font-size: 31px;
      line-height: 1.27;
      margin: 0 0 7px;
      overflow-wrap: anywhere;
    }
    .tagline { margin: 0 0 5px; font-size: 15px; }
    .description {
      margin: 0;
      font-size: 15px;
      color: var(--muted);
      max-width: 44ch;
    }
    .creator {
      margin: 9px 0 0;
      font-size: 13px;
      color: var(--ink);
    }
    .creator-label { margin-right: 8px; color: var(--muted); }
    .action {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      min-height: 44px;
      padding: 10px 15px;
      background: var(--ink);
      color: var(--white);
      font-size: 14px;
      transition: background .15s;
    }
    .action:hover { background: #2f5b40; }
    .note {
      font-size: 13px;
      max-width: 540px;
      color: var(--muted);
      margin: 28px 0 0;
    }
    footer {
      display: flex;
      gap: 20px;
      justify-content: space-between;
      padding: 64px 0 28px;
      font-size: 11px;
      color: var(--muted);
      letter-spacing: .04em;
    }

    @media (max-width: 720px) {
      header, main, footer { width: calc(100% - 40px); }
      header { padding: 23px 0; }
      .wordmark { font-size: 26px; }
      .brand { gap: 11px; }
      .brand-label { font-size: 11px; padding-left: 11px; }
      .back { font-size: 11px; }
      .hero { grid-template-columns: 1fr; gap: 19px; padding: 42px 0 34px; }
      h1 { font-size: clamp(35px, 10.5vw, 42px); }
      .eyebrow { font-size: 11px; margin-bottom: 16px; }
      .intro { font-size: 14px; max-width: 330px; }
      .section-label { font-size: 10px; }
      .project {
        grid-template-columns: 72px minmax(0, 1fr);
        align-items: start;
        gap: 10px 15px;
        padding: 20px 0 22px;
      }
      .artwork { border-radius: 9px; }
      .project h2 { font-size: 23px; }
      .tagline, .description { font-size: 14px; }
      .creator { margin-top: 6px; }
      .project-action { grid-column: 2; }
      .action { font-size: 13px; padding-inline: 12px; gap: 14px; }
      .note { font-size: 12px; }
      footer { padding-top: 43px; flex-direction: column; gap: 6px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .action { transition: none; }
    }
  </style>
  <script src="/legacy-shaodian.js" defer></script>
</head>
<body>
  <header>
    <a class="brand" href="/" aria-label="CMI 社区工具首页"><span class="wordmark">CMI.</span><span class="brand-label">社区工具</span></a>
    <a class="back" href="https://cmi.community/">回到社区<span aria-hidden="true">↗</span></a>
  </header>
  <main>
    <section class="hero">
      <div><p class="eyebrow">Made together, for everyday life.</p><h1>社区里，<br>一起造的小工具。</h1></div>
      <p class="intro">从生活里遇到的小事出发，<br>让伙伴的想法，有一个可以使用的入口。</p>
    </section>
    <section aria-label="社区项目">
      <div class="section-label"><span>社区项目</span><span>持续共建中</span></div>
      <!--PROJECT_CARDS-->
    </section>
    <p class="note">每个项目由对应的社区伙伴独立开发和维护。这里汇集工具入口，方便找到和使用。</p>
  </main>
  <footer><span>CMI COMMUNITY · 社区伙伴共建</span><span>Connect · Make · Impact</span></footer>
</body>
</html>`;

export const HOME = renderHome();
export const NOT_FOUND = "<!doctype html>\n<html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"description\" content=\"CMI 社区伙伴共建的工具入口。\"><title>未找到页面 · CMI 社区工具</title><style>\n:root{color-scheme:light;--paper:#f3f1e8;--ink:#183c30;--muted:#50665b;--line:#b7c1af;--lime:#d8ef98;--white:#fffef9}\n*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:\"PingFang SC\",\"Hiragino Sans GB\",\"Noto Sans CJK SC\",sans-serif;font-size:16px;line-height:1.7}a{color:inherit;text-decoration:none}a:focus-visible{outline:3px solid #52700b;outline-offset:6px}header,main,footer{width:min(1120px,calc(100% - 96px));margin-inline:auto}header{display:flex;align-items:center;justify-content:space-between;padding:30px 0;border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:15px}.wordmark{font-family:Georgia,serif;font-size:29px;line-height:1;font-weight:700;letter-spacing:-1px}.brand-label{font-size:13px;border-left:1px solid var(--line);padding-left:15px;letter-spacing:.12em}.back{font-size:13px}.back span{padding-left:7px}.hero{display:grid;grid-template-columns:1.5fr 1fr;gap:65px;align-items:end;padding:78px 0 65px}.eyebrow{font-family:Georgia,serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 22px}h1{font-family:\"Songti SC\",\"Noto Serif CJK SC\",serif;font-size:clamp(40px,5.5vw,70px);font-weight:600;letter-spacing:-.045em;line-height:1.25;margin:0}.intro{font-size:15px;color:var(--muted);margin:0;padding-bottom:6px;max-width:300px}.section-label{display:flex;justify-content:space-between;font-size:12px;letter-spacing:.12em;padding-bottom:15px;border-bottom:1px solid var(--ink)}.project{display:grid;grid-template-columns:130px 1fr 230px;gap:35px;padding:38px 0 42px;border-bottom:1px solid var(--line);align-items:center}.project-number{align-self:start;font-family:Georgia,serif;font-size:15px}.art{width:110px;height:110px;background:var(--lime);position:relative;margin-top:15px;overflow:hidden}.art:before{content:\"\";display:block;position:absolute;width:68px;height:47px;border:2px solid var(--ink);left:20px;top:34px;transform:rotate(-8deg)}.art:after{content:\"↗\";position:absolute;right:8px;top:-11px;font-family:Georgia,serif;font-size:68px;font-weight:400;line-height:1.1}.project h2{font-family:\"Songti SC\",\"Noto Serif CJK SC\",serif;font-size:36px;font-weight:600;line-height:1.3;margin:0 0 8px}.tagline{margin:0 0 15px;font-size:16px}.description{margin:0;font-size:14px;color:var(--muted);max-width:380px}.project-action{align-self:stretch;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:22px}.status{display:inline-flex;align-items:center;gap:7px;font-size:12px;padding:4px 10px;border:1px solid var(--line);border-radius:20px;background:var(--white)}.status:before{content:\"\";width:6px;height:6px;border-radius:50%;background:#698045}.action{display:inline-flex;align-items:center;justify-content:space-between;gap:40px;padding:12px 17px;background:var(--ink);color:var(--white);font-size:14px;transition:background .15s}.action:hover{background:#2f5b40}.note{font-size:13px;max-width:540px;color:var(--muted);margin:28px 0 0}footer{display:flex;gap:20px;justify-content:space-between;padding:64px 0 28px;font-size:11px;color:var(--muted);letter-spacing:.04em}.status-main{min-height:66vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:60px 0}.status-main h1{max-width:680px;margin:20px 0}.status-main p{max-width:520px;color:var(--muted);margin:0 0 30px}.status-main .eyebrow{margin-bottom:0;color:var(--ink)}.status-main .status{margin-top:20px}.status-links{display:flex;gap:25px;align-items:center}.quiet-link{font-size:13px;text-decoration:underline;text-underline-offset:4px}\n@media(max-width:720px){header,main,footer{width:calc(100% - 40px)}header{padding:23px 0}.wordmark{font-size:26px}.brand{gap:11px}.brand-label{font-size:11px;padding-left:11px}.back{font-size:11px}.hero{grid-template-columns:1fr;gap:25px;padding:49px 0 40px}h1{font-size:44px}.eyebrow{font-size:11px;margin-bottom:18px}.intro{font-size:14px;max-width:330px}.section-label{font-size:10px}.project{grid-template-columns:76px 1fr;gap:18px;padding:27px 0 30px}.art{width:72px;height:78px}.art:before{width:45px;height:33px;left:11px;top:30px}.art:after{font-size:49px;right:0;top:-2px}.project h2{font-size:31px}.tagline{font-size:14px;margin-bottom:10px}.description{font-size:13px}.project-action{grid-column:2;gap:16px}.action{font-size:13px;padding:10px 14px;gap:25px}.note{font-size:12px}footer{padding-top:43px;flex-direction:column;gap:6px}.status-main{min-height:66vh;padding:45px 0}.status-main h1{font-size:38px}.status-main p{font-size:14px}.status-links{gap:20px;flex-wrap:wrap}}\n@media(prefers-reduced-motion:reduce){*{transition:none!important}}\n</style></head>\n<body><header><a class=\"brand\" href=\"/\" aria-label=\"CMI 社区工具首页\"><span class=\"wordmark\">CMI.</span><span class=\"brand-label\">社区工具</span></a><a class=\"back\" href=\"https://cmi.community/\">回到社区<span aria-hidden=\"true\">↗</span></a></header><main><section class=\"status-main\"><p class=\"eyebrow\">404 / Page not found</p><h1>这个入口，<br>暂时没有对应页面。</h1><p>可以回到工具目录，看看已经接入的项目。</p><a class=\"action\" href=\"/\">返回工具目录<span aria-hidden=\"true\">↗</span></a></section></main><footer><span>CMI COMMUNITY · 社区伙伴共建</span><span>Connect · Make · Impact</span></footer></body></html>";
export const UNAVAILABLE = "<!doctype html>\n<html lang=\"zh-CN\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><meta name=\"description\" content=\"CMI 社区伙伴共建的工具入口。\"><title>项目暂时无法打开 · CMI 社区工具</title><style>\n:root{color-scheme:light;--paper:#f3f1e8;--ink:#183c30;--muted:#50665b;--line:#b7c1af;--lime:#d8ef98;--white:#fffef9}\n*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:\"PingFang SC\",\"Hiragino Sans GB\",\"Noto Sans CJK SC\",sans-serif;font-size:16px;line-height:1.7}a{color:inherit;text-decoration:none}a:focus-visible{outline:3px solid #52700b;outline-offset:6px}header,main,footer{width:min(1120px,calc(100% - 96px));margin-inline:auto}header{display:flex;align-items:center;justify-content:space-between;padding:30px 0;border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:15px}.wordmark{font-family:Georgia,serif;font-size:29px;line-height:1;font-weight:700;letter-spacing:-1px}.brand-label{font-size:13px;border-left:1px solid var(--line);padding-left:15px;letter-spacing:.12em}.back{font-size:13px}.back span{padding-left:7px}.hero{display:grid;grid-template-columns:1.5fr 1fr;gap:65px;align-items:end;padding:78px 0 65px}.eyebrow{font-family:Georgia,serif;font-size:13px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 22px}h1{font-family:\"Songti SC\",\"Noto Serif CJK SC\",serif;font-size:clamp(40px,5.5vw,70px);font-weight:600;letter-spacing:-.045em;line-height:1.25;margin:0}.intro{font-size:15px;color:var(--muted);margin:0;padding-bottom:6px;max-width:300px}.section-label{display:flex;justify-content:space-between;font-size:12px;letter-spacing:.12em;padding-bottom:15px;border-bottom:1px solid var(--ink)}.project{display:grid;grid-template-columns:130px 1fr 230px;gap:35px;padding:38px 0 42px;border-bottom:1px solid var(--line);align-items:center}.project-number{align-self:start;font-family:Georgia,serif;font-size:15px}.art{width:110px;height:110px;background:var(--lime);position:relative;margin-top:15px;overflow:hidden}.art:before{content:\"\";display:block;position:absolute;width:68px;height:47px;border:2px solid var(--ink);left:20px;top:34px;transform:rotate(-8deg)}.art:after{content:\"↗\";position:absolute;right:8px;top:-11px;font-family:Georgia,serif;font-size:68px;font-weight:400;line-height:1.1}.project h2{font-family:\"Songti SC\",\"Noto Serif CJK SC\",serif;font-size:36px;font-weight:600;line-height:1.3;margin:0 0 8px}.tagline{margin:0 0 15px;font-size:16px}.description{margin:0;font-size:14px;color:var(--muted);max-width:380px}.project-action{align-self:stretch;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:22px}.status{display:inline-flex;align-items:center;gap:7px;font-size:12px;padding:4px 10px;border:1px solid var(--line);border-radius:20px;background:var(--white)}.status:before{content:\"\";width:6px;height:6px;border-radius:50%;background:#698045}.action{display:inline-flex;align-items:center;justify-content:space-between;gap:40px;padding:12px 17px;background:var(--ink);color:var(--white);font-size:14px;transition:background .15s}.action:hover{background:#2f5b40}.note{font-size:13px;max-width:540px;color:var(--muted);margin:28px 0 0}footer{display:flex;gap:20px;justify-content:space-between;padding:64px 0 28px;font-size:11px;color:var(--muted);letter-spacing:.04em}.status-main{min-height:66vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:60px 0}.status-main h1{max-width:680px;margin:20px 0}.status-main p{max-width:520px;color:var(--muted);margin:0 0 30px}.status-main .eyebrow{margin-bottom:0;color:var(--ink)}.status-main .status{margin-top:20px}.status-links{display:flex;gap:25px;align-items:center}.quiet-link{font-size:13px;text-decoration:underline;text-underline-offset:4px}\n@media(max-width:720px){header,main,footer{width:calc(100% - 40px)}header{padding:23px 0}.wordmark{font-size:26px}.brand{gap:11px}.brand-label{font-size:11px;padding-left:11px}.back{font-size:11px}.hero{grid-template-columns:1fr;gap:25px;padding:49px 0 40px}h1{font-size:44px}.eyebrow{font-size:11px;margin-bottom:18px}.intro{font-size:14px;max-width:330px}.section-label{font-size:10px}.project{grid-template-columns:76px 1fr;gap:18px;padding:27px 0 30px}.art{width:72px;height:78px}.art:before{width:45px;height:33px;left:11px;top:30px}.art:after{font-size:49px;right:0;top:-2px}.project h2{font-size:31px}.tagline{font-size:14px;margin-bottom:10px}.description{font-size:13px}.project-action{grid-column:2;gap:16px}.action{font-size:13px;padding:10px 14px;gap:25px}.note{font-size:12px}footer{padding-top:43px;flex-direction:column;gap:6px}.status-main{min-height:66vh;padding:45px 0}.status-main h1{font-size:38px}.status-main p{font-size:14px}.status-links{gap:20px;flex-wrap:wrap}}\n@media(prefers-reduced-motion:reduce){*{transition:none!important}}\n</style></head>\n<body><header><a class=\"brand\" href=\"/\" aria-label=\"CMI 社区工具首页\"><span class=\"wordmark\">CMI.</span><span class=\"brand-label\">社区工具</span></a><a class=\"back\" href=\"https://cmi.community/\">回到社区<span aria-hidden=\"true\">↗</span></a></header><main><section class=\"status-main\"><p class=\"eyebrow\">CMI Community Tools</p><h1>这个项目，<br>暂时无法打开。</h1><p>请稍后再试，也可以先回到工具目录。</p><a class=\"action\" href=\"/\">返回工具目录<span aria-hidden=\"true\">↗</span></a></section></main><footer><span>CMI COMMUNITY · 社区伙伴共建</span><span>Connect · Make · Impact</span></footer></body></html>";
