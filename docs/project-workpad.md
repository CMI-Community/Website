# CMI 官网 Project Workpad

Last updated: 2026-08-08 15:22 Asia/Bangkok

这是本项目唯一动态工作台。它只保存可操作的当前状态和链接，不复制 Issue、PR、日志或聊天全文。

## Snapshot

- Status: `In Progress`
- Current milestone: [v0.1.1 — Context Foundation](https://github.com/CMI-Community/Website/milestone/1)
- Current focus: [#11 建立三位一体可追溯协作地基](https://github.com/CMI-Community/Website/issues/11)
- Next step: 完成协作文档、记录模板和 `check:trace`，通过 PR 与 required CI 发布 `v0.1.1`。
- Latest production runtime release: [v0.1.0-foundation](https://github.com/CMI-Community/Website/releases/tag/v0.1.0-foundation)

## Commander View

- 等待决定：无。
- `VERIFIED`：公开仓库、Apache-2.0、Issues、Discussions、required CI 和 production 人工批准均已启用。
- `VERIFIED`：`cmi.community` 当前由 `cmi-community-platform` Worker 提供服务，根路径暂时进入 `/archive/posters`。
- `VERIFIED`：当前公共档案为 180 张海报；新 D1 保留 3 条留言和 2 条投票；首位管理员已建立，一次性 bootstrap Secret 已删除。
- `ASSUMED`：旧 Worker 与旧反馈 D1 继续保留到明确结束稳定观察期；删除前必须另建 Issue 并给出回滚替代方案。

## Project Goal

把 CMI 官网建设成可长期承载社区身份、内容发布、公共档案、反馈和可撤销实验的平台，同时维持公开安全边界和可回滚发布能力。

## Scope

### In Scope

- React Router 全栈、Cloudflare Workers、D1、R2 和 Better Auth 平台地基。
- `identity`、`publishing`、`media`、`poster-wall`、`feedback`、`experiments` 领域模块。
- GitHub Issues、ADR、Experiment、PR、CI 和 Release Record 组成的可追溯协作流程。

### Out of Scope

- 新官网首页、完整 CMS 后台、公开注册、社区关系图谱和完整英文内容。
- 原始海报、5.7GB 私有归档、SQLite、生产数据导出和内部授权材料。
- 完整聊天记录或模型内部推理归档。

## Key Decisions

| Date | Decision | Reason | Status |
| --- | --- | --- | --- |
| 2026-08-07 | [ADR 0001：采用全栈平台地基](./adr/0001-platform-foundation.md) | 官网需要服务端身份、内容、媒体和审计能力 | `Accepted` |
| 2026-08-07 | [ADR 0002：代码许可与 CMI 品牌分离](./adr/0002-open-source-and-brand-boundary.md) | 允许技术复用，同时保护品牌与社区内容 | `Accepted` |
| 2026-08-07 | [ADR 0003：邀请制身份与单一发布源](./adr/0003-identity-and-publishing.md) | 权限、账号关联和运营内容需要服务端唯一真相源 | `Accepted` |
| 2026-08-08 | [ADR 0004：三位一体可追溯协作](./adr/0004-traceability-governance.md) | 防止长期开发、实验和回滚造成上下文断裂 | `Accepted` |

## Options Considered

| Option | Pros | Cons | Current stance |
| --- | --- | --- | --- |
| 工作台 + Issues + Milestones | 一页总览，任务状态仍由 GitHub 管理 | 需要每次交付更新上下文声明 | `Selected` |
| GitHub Project 看板 | 可视化较强 | 增加权限、字段和重复维护 | `Rejected for now` |
| 公私双轨记录 | 可以保留敏感细节 | 容易形成第二真相源 | `Rejected` |
| 保存完整聊天 | 信息最全 | 噪音、隐私和可读性风险高 | `Rejected` |

## Task Board

### Now

- [ ] [#11 建立三位一体可追溯协作地基](https://github.com/CMI-Community/Website/issues/11)

### Next

- 暂无；可执行工作必须先创建 GitHub Issue。

### Later

- 暂无；未收敛想法先进入 [GitHub Discussions](https://github.com/CMI-Community/Website/discussions)。

### Done

- [x] [v0.1.0-foundation：CMI 官网长期技术地基](https://github.com/CMI-Community/Website/releases/tag/v0.1.0-foundation)

## Risks And Open Questions

| Type | Item | Impact | Owner/Next check | Status |
| --- | --- | --- | --- | --- |
| Rollback | 旧 Worker 与旧反馈 D1 仍在稳定观察期 | 提供生产回滚能力，也增加资源识别成本 | 删除前新建 T3 Issue 并重新验证资源 | `OBSERVED` |
| Product | 当前根路径仍是海报档案，不是真正官网首页 | 新访客只看到 demo 模块 | 下一产品阶段由新 Issue 定义 | `VERIFIED` |
| Maintenance | Dependabot 已产生多项待审 PR | 依赖升级可能影响 Node 24 和 Cloudflare 兼容性 | 逐项通过 CI 后合并，不批量猜测兼容性 | `OBSERVED` |

## Implementation Notes

- 中文为默认无前缀路由，英文预留 `/en/*`。
- D1 是身份、角色、内容、审计和反馈的运行数据源；R2 提供版本化公共媒体。
- 仓库 Markdown 只保存固定政策、架构、协作和发布记录，不复制运营内容。
- 公共 API 必须使用字段白名单；权限始终在服务端校验。

## Validation Log

| Date | Check | Result | Notes |
| --- | --- | --- | --- |
| 2026-08-08 | `v0.1.0-foundation` production smoke | `VERIFIED` | 10 passed，2 个共享生产写入探针按设计跳过 |
| 2026-08-08 | R2 公共海报资产 | `VERIFIED` | 180/180 可访问，公共目录不含内部字段 |
| 2026-08-08 | 身份初始化 | `VERIFIED` | 1 位管理员、1 份 profile、1 条身份初始化审计；bootstrap Secret 已删除 |
| 2026-08-08 | 三位一体结构与 PR 合同 | `VERIFIED` | T1/T2/T3、Dependabot、override、坏链接、状态、重复编号和公开边界自动测试通过 |
| 2026-08-08 | `npm run check` | `VERIFIED` | lint、trace、typecheck、18 tests、D1 migration、SSR build 和 Wrangler staging dry-run通过 |

## Recent Updates

- 2026-08-08 15:11 Asia/Bangkok：创建 Milestone、Issue #11 和完整标签体系，开始建立三位一体可追溯协作地基。
- 2026-08-08 15:22 Asia/Bangkok：上下文骨架、记录模板和 CI 门禁完成首轮验证；第一次完整检查暴露并修正了检查器参数的 TypeScript 推断问题。
- 2026-08-08：发布 `v0.1.0-foundation`，新平台接管生产域名，旧 Worker/D1 保留回滚。

## Handoff Notes

- 新会话先读根级 `AGENTS.md`、本工作台、当前 Issue 和被链接的 ADR。
- 运行时资源名称和 GitHub 状态可能变化；执行发布、迁移或删除前必须现场验证。
- Issue 是任务状态权威源，工作台不复制 Issue 正文；若链接状态与本页文字冲突，先以 GitHub 状态为准并在当前 PR 修正本页。
