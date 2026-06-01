import './App.css'

const nextSteps = [
  {
    title: '需求从 Linear 开始',
    body: '每个页面、内容模块和上线检查都先写清目标、范围和验收标准。',
  },
  {
    title: '实现进入 GitHub',
    body: '开发分支和 Pull Request 关联 Linear issue，代码记录和需求记录保持同步。',
  },
  {
    title: '先让官网可持续',
    body: '当前仓库先建立工程、文档和协作基线，再进入信息架构与视觉设计。',
  },
]

function App() {
  return (
    <main className="site-shell">
      <nav className="topbar" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="CMI Community home">
          <span className="brand-mark" aria-hidden="true">
            C
          </span>
          <span>CMI Community</span>
        </a>
        <a
          className="repo-link"
          href="https://github.com/CMI-Community/Website"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </nav>

      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">CMI Community</h1>
          <p>
            CMI 社区官方网站的开发起点。我们会用真实的社区需求、内容素材和协作节奏，逐步把它建设成一个可参与、可更新、可连接的公共入口。
          </p>
          <div className="hero-actions" aria-label="Project links">
            <a href="https://linear.app/cmi-community/project/cmi-community-website-官网-32eac175cbd5">
              查看 Linear 项目
            </a>
            <a href="https://github.com/CMI-Community/Website">查看 GitHub 仓库</a>
          </div>
        </div>

        <div className="project-card" aria-label="Current project baseline">
          <span>Current baseline</span>
          <strong>React + Vite + TypeScript</strong>
          <p>Local scripts: dev, lint, typecheck, build, preview.</p>
        </div>
      </section>

      <section className="workflow" aria-label="Project workflow">
        {nextSteps.map((item) => (
          <article key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App
