# CMI 官网

CMI Community 的公开官网与社区平台代码库。根路径是由 Community Hero、Photo Museum 与 Event Museum 组成的正式首页；完整海报档案继续保留在 `/archive/posters`。平台建立在可长期维护的全栈架构上，完整管理后台和社区关系功能仍按独立阶段推进。

## 从这里开始协作

- [Project Workpad](./docs/project-workpad.md)：当前状态、正在做什么、风险、待决定事项和下一步。
- [三位一体可追溯协作协议](./docs/collaboration/traceability.md)：任务、思考和过程分别记录在哪里，以及 T1/T2/T3 的升级规则。
- [AGENTS.md](./AGENTS.md)：所有开发者和 AI 在开始、实施和交付任务时共同遵守的公开规则。

工作台是唯一动态总览；GitHub Issues 是任务权威源，ADR/Experiment 保存可复核的决策依据，PR/Release Record 保存实施和发布证据。仓库不保存完整聊天或模型内部推理。

## 这份开源许可允许什么

代码、组件、页面布局、设计系统和架构文档使用 [Apache License 2.0](./LICENSE)。你可以复制、修改和发布这些技术与页面设计，但必须保留许可证和 NOTICE，并替换 CMI 的名称、Logo、口号、域名、账号、社区文字、照片、海报及用户内容。

Apache-2.0 不授予 CMI 品牌或内容的使用权。完整边界见 [BRAND.md](./BRAND.md)。如果你要搭建自己的社区网站，最简单的判断是：**可以复用官网的技术与布局，不可以把 CMI 品牌和社区内容当作模板素材继续使用。**

## 技术地基

- React Router 全栈 SSR + TypeScript
- Cloudflare Workers + D1 + R2
- Better Auth：邀请制邮箱注册、Google/GitHub OAuth、邮箱验证与账号关联
- Resend：验证与密码重置邮件
- Vitest、D1 migration smoke、Playwright、Wrangler dry-run
- GitHub Actions：PR 全量检查，`main` 自动部署 staging，production 环境人工批准

认证邮件复用社区现有的 Resend 账户和已验证发信域名 `auth.cmiswap.com`，发件人为 `CMI Community <community@auth.cmiswap.com>`。这只共享邮件投递通道；CMI 官网仍使用独立的 D1、会话、OAuth 应用和权限数据，不与 CMI Swap 合并用户数据库。

Node.js 版本统一为 24.x LTS。安装与本地运行：

```bash
nvm use
npm ci
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

检查完整地基：

```bash
npm run check
npm run test:e2e
```

## 目录边界

```text
app/modules/        领域模块（identity、publishing、media、poster-wall 等）
app/shared/         设计系统、权限、数据库、可观测性等共享能力
workers/            Worker 入口、认证与服务端 API
migrations/         D1 唯一迁移历史
docs/adr/           不可隐式改写的架构决策
scripts/            公开目录清洗、迁移验证与边界检查
```

运营内容以后以 D1 为唯一发布源；仓库 Markdown/MDX 只保存固定原则、品牌政策、隐私和开发文档。历史海报原图、5.7GB 私有归档、SQLite、后台记录和生成输出永不进入本仓库。

## 参与

公开需求、内容纠错与贡献使用 GitHub Issues / Discussions。提交代码前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)、[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) 和 [SECURITY.md](./SECURITY.md)。内部运营优先级可以在 Linear 管理，但外部贡献者不需要 Linear 账号。每个可执行任务都关联 Issue；分支、决策记录和 PR 合同见协作协议。

## 当前状态

官网地基、三屏首页和两个公共 Museum 已进入持续迭代，但不代表完整社区产品已经完成。生产操作流程见 [docs/operations](./docs/operations/)，每次持久发布证据见 [Release Records](./docs/releases/README.md)；安全问题请不要公开创建 Issue。
