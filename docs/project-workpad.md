# CMI 官网 Project Workpad

Last updated: 2026-08-11 12:24 Asia/Bangkok

这是本项目唯一动态工作台。它只保存可操作的当前状态和链接，不复制 Issue、PR、日志或聊天全文。

## Snapshot

- Status: `Production patch in progress`
- Current milestone: [v0.2.0 — Homepage Museums](https://github.com/CMI-Community/Website/milestone/2) 已完成。
- Current focus: [#16](https://github.com/CMI-Community/Website/issues/16) 紧急恢复三屏官网并更新全站小红书入口。
- Next step: 完成 v0.2.1 全量检查、PR、production 发布与逐页验收。
- Latest production runtime release: [v0.2.0](https://github.com/CMI-Community/Website/releases/tag/v0.2.0)
- Latest governance release: [v0.1.1](https://github.com/CMI-Community/Website/releases/tag/v0.1.1)

## Commander View

- 等待决定：无；内容负责人已完成手机主观验收，并于 2026-08-10 13:26 Asia/Bangkok 明确批准立即发布 production。
- `VERIFIED`：2026-08-11 旧 `poster-wall` Worker 误覆盖 production 后，已从本仓库 `main` 恢复 `cmi-community-platform` Worker `6cb12718-4630-43b1-8988-7598e6043f8d`；根路径重新直接呈现三屏正式首页。
- `VERIFIED`：公开仓库、Apache-2.0、Issues、Discussions、required CI 和 production 人工批准均已启用。
- `VERIFIED`：`cmi.community` 当前由 `cmi-community-platform` Worker `6cb12718-4630-43b1-8988-7598e6043f8d` 提供服务，根路径直接呈现三屏正式首页。
- `VERIFIED`：当前公共档案为 180 张海报；新 D1 保留 3 条留言和 2 条投票；首位管理员已建立，一次性 bootstrap Secret 已删除。
- `VERIFIED`：三位一体工作台、T1/T2/T3 记录和 required traceability gate 已通过真实 PR CI。
- `ASSUMED`：旧 Worker 与旧反馈 D1 继续保留到明确结束稳定观察期；删除前必须另建 Issue 并给出回滚替代方案。
- `VERIFIED`：Photo Museum v1 输入已锁定为 27 张用户指定照片，原片不进入公开仓库。
- `VERIFIED`：27 张照片的 1280px / 2560px WebP 与公共目录已上传 staging R2；staging Worker 版本 `99d4ddd4-6ccc-4344-8f52-a273f040bd70` 已通过桌面与 390px 验收。
- `VERIFIED`：新增私有目录有 508 个文件，其中 7 个与 v1 原片完全重复；全部可读取的 501 张唯一新素材与 v1 合并为 528 张 v2。
- `VERIFIED`：Photo Museum v2 已生成并核验 1056 个 WebP（322MB），上传 staging R2 后逐项验证两档资产；staging Worker 为 `796915a9-f000-4e8c-b321-411f5b9a1e61`。
- `VERIFIED`：Photo Museum v2 目录与 1056 个 WebP 已上传 production R2，目录最后发布且从远端回读一致。

## Project Goal

把 CMI 官网建设成可长期承载社区身份、内容发布、公共档案、反馈和可撤销实验的平台，同时维持公开安全边界和可回滚发布能力。

## Scope

### In Scope

- React Router 全栈、Cloudflare Workers、D1、R2 和 Better Auth 平台地基。
- `identity`、`publishing`、`media`、`poster-wall`、`feedback`、`experiments` 领域模块。
- Community Hero、Photo Museum、Event Museum 组成的正式根路径首页。
- GitHub Issues、ADR、Experiment、PR、CI 和 Release Record 组成的可追溯协作流程。

### Out of Scope

- 完整 CMS 后台、公开注册、社区关系图谱和完整英文内容。
- 原始海报、5.7GB 私有归档、SQLite、生产数据导出和内部授权材料。
- 完整聊天记录或模型内部推理归档。

## Key Decisions

| Date | Decision | Reason | Status |
| --- | --- | --- | --- |
| 2026-08-07 | [ADR 0001：采用全栈平台地基](./adr/0001-platform-foundation.md) | 官网需要服务端身份、内容、媒体和审计能力 | `Accepted` |
| 2026-08-07 | [ADR 0002：代码许可与 CMI 品牌分离](./adr/0002-open-source-and-brand-boundary.md) | 允许技术复用，同时保护品牌与社区内容 | `Accepted` |
| 2026-08-07 | [ADR 0003：邀请制身份与单一发布源](./adr/0003-identity-and-publishing.md) | 权限、账号关联和运营内容需要服务端唯一真相源 | `Accepted` |
| 2026-08-08 | [ADR 0004：三位一体可追溯协作](./adr/0004-traceability-governance.md) | 防止长期开发、实验和回滚造成上下文断裂 | `Accepted` |
| 2026-08-10 | [ADR 0005：三屏首页与版本化公共照片目录](./adr/0005-homepage-museums-and-public-photo-catalog.md) | 根路径、公共媒体目录和社交入口需要长期兼容及回滚 | `Accepted` |
| 2026-08-10 | [ADR 0006：Photo Museum v2 的高密度布局与规模化目录](./adr/0006-photo-museum-v2-density-and-scale.md) | 528 张规模需要新的缩略图尺寸、七轨分配与独立回滚版本 | `Accepted` |

## Options Considered

| Option | Pros | Cons | Current stance |
| --- | --- | --- | --- |
| 工作台 + Issues + Milestones | 一页总览，任务状态仍由 GitHub 管理 | 需要每次交付更新上下文声明 | `Selected` |
| GitHub Project 看板 | 可视化较强 | 增加权限、字段和重复维护 | `Rejected for now` |
| 公私双轨记录 | 可以保留敏感细节 | 容易形成第二真相源 | `Rejected` |
| 保存完整聊天 | 信息最全 | 噪音、隐私和可读性风险高 | `Rejected` |

## Task Board

### Now

- [ ] [#16 紧急恢复 v0.2.0 三屏官网并更新小红书入口](https://github.com/CMI-Community/Website/issues/16)

### Next

- 暂无；可执行工作必须先创建 GitHub Issue。

### Later

- 暂无；未收敛想法先进入 [GitHub Discussions](https://github.com/CMI-Community/Website/discussions)。

### Done

- [x] [#13 建设 Community / Photo Museum / Event Museum 三屏首页](https://github.com/CMI-Community/Website/issues/13)
- [x] [v0.2.0：三屏首页与 528 张 Photo Museum](https://github.com/CMI-Community/Website/releases/tag/v0.2.0)
- [x] [#11 建立三位一体可追溯协作地基](https://github.com/CMI-Community/Website/issues/11)
- [x] [v0.1.1：任务、思考、过程协作地基](https://github.com/CMI-Community/Website/releases/tag/v0.1.1)
- [x] [v0.1.0-foundation：CMI 官网长期技术地基](https://github.com/CMI-Community/Website/releases/tag/v0.1.0-foundation)

## Risks And Open Questions

| Type | Item | Impact | Owner/Next check | Status |
| --- | --- | --- | --- | --- |
| Rollback | 旧 Worker 与旧反馈 D1 仍在稳定观察期 | 提供生产回滚能力，也增加资源识别成本 | 删除前新建 T3 Issue 并重新验证资源 | `OBSERVED` |
| Product | 正式三屏首页已成为 production 根路径 | 边缘发布后有短暂新旧 Worker 传播窗口 | 传播稳定后连续检查根路径，完整 production 验收已通过 | `VERIFIED` |
| Media | Photo Museum v2 为 528 张、1056 个 WebP | 损坏源图、重复项或漏传会破坏墙面与全屏浏览 | 本地目录完整性和 staging 两档公开入口已逐项通过 | `VERIFIED` |
| Performance | 七条动态轨道会逐步加载 528 张缩略图 | 手机内存、流量和帧率可能上升 | 720px 缩略图、内容负责人真机验收、390×844 production 动画/全屏交互已通过 | `VERIFIED` |
| Maintenance | Dependabot 已产生多项待审 PR | 依赖升级可能影响 Node 24 和 Cloudflare 兼容性 | 逐项通过 CI 后合并，不批量猜测兼容性 | `OBSERVED` |

## Implementation Notes

- 中文为默认无前缀路由，英文预留 `/en/*`。
- D1 是身份、角色、内容、审计和反馈的运行数据源；R2 提供版本化公共媒体。
- 仓库 Markdown 只保存固定政策、架构、协作和发布记录，不复制运营内容。
- 公共 API 必须使用字段白名单；权限始终在服务端校验。
- Photo Museum v1 公共目录只保存展示字段；原始 HEIC/JPEG、本机路径、人物身份和授权材料继续留在私有素材边界。
- Photo Museum v2 按七条轨道分配完整目录，不让每条轨道重复 528 张；v1 保留为不删除的回滚版本。

## Validation Log

| Date | Check | Result | Notes |
| --- | --- | --- | --- |
| 2026-08-08 | `v0.1.0-foundation` production smoke | `VERIFIED` | 10 passed，2 个共享生产写入探针按设计跳过 |
| 2026-08-08 | R2 公共海报资产 | `VERIFIED` | 180/180 可访问，公共目录不含内部字段 |
| 2026-08-08 | 身份初始化 | `VERIFIED` | 1 位管理员、1 份 profile、1 条身份初始化审计；bootstrap Secret 已删除 |
| 2026-08-08 | 三位一体结构与 PR 合同 | `VERIFIED` | T1/T2/T3、Dependabot、override、坏链接、状态、重复编号和公开边界自动测试通过 |
| 2026-08-08 | `npm run check` | `VERIFIED` | lint、trace、typecheck、19 tests、D1 migration、SSR build 和 Wrangler staging dry-run通过 |
| 2026-08-08 | PR #12 required CI | `VERIFIED` | trace gate、构建、dry-run、桌面与 390px smoke 全部通过；7 passed，1 skipped |
| 2026-08-10 | Photo Museum v1 资产处理 | `VERIFIED` | 27 个唯一记录、54 个 WebP、25 横图 + 2 竖图；公共目录无本机路径或内部字段 |
| 2026-08-10 | `npm run check` | `VERIFIED` | lint、trace、typecheck、24 tests、D1 migration、SSR build 和 staging dry-run 通过 |
| 2026-08-10 | staging deploy | `VERIFIED` | Worker `99d4ddd4-6ccc-4344-8f52-a273f040bd70`；根路径 200，production 未改动 |
| 2026-08-10 | staging Playwright | `VERIFIED` | 桌面与 390px 共 15 passed、3 skipped；54 个照片变体、海报/留言/OAuth 回归均通过 |
| 2026-08-10 | staging 视觉检查 | `VERIFIED` | 首屏七个社交入口、Photo 双轨与 Event Museum 在 1440×900 和 390×844 无横向溢出或导航重叠 |
| 2026-08-10 | Photo Museum v2 资产处理 | `VERIFIED` | 528 个唯一记录、1056 个 WebP；298 横图 + 229 竖图 + 1 方图；方向、实际尺寸、比例和公开字段通过 |
| 2026-08-10 | `npm run check` | `VERIFIED` | lint、公开边界、trace、typecheck、25 tests、D1 migration、SSR build 和 staging dry-run 通过 |
| 2026-08-10 | staging deploy | `VERIFIED` | Worker `796915a9-f000-4e8c-b321-411f5b9a1e61`；`photo-museum/v2` 完整目录已上传；production 未改动 |
| 2026-08-10 | staging Playwright | `VERIFIED` | 桌面与 390px 共 15 passed、3 skipped；1056 个照片入口、全屏浏览、导航、Event Museum、海报/留言/OAuth 回归通过 |
| 2026-08-10 | staging 视觉检查 | `VERIFIED` | 1440×900 与 390×844 的字号/字距、Logo 五色模糊色场、七轨密集照片墙、吸顶导航无溢出；控制台 0 errors / 0 warnings |
| 2026-08-10 | production 人工批准 | `VERIFIED` | 内容负责人确认第二版无问题，明确要求立即发布为 `cmi.community` 首页 |
| 2026-08-10 | production R2 | `VERIFIED` | `photo-museum/v2` 的 1056 个 WebP 完整上传，目录最后发布并与本地逐字节一致 |
| 2026-08-10 | production deploy | `VERIFIED` | [GitHub production Environment run](https://github.com/CMI-Community/Website/actions/runs/31362512317) 成功；Worker `bbfff480-23cc-49cc-8ccb-f883cb38983a` |
| 2026-08-10 | production Playwright | `VERIFIED` | 桌面与 390px 共 15 passed、3 skipped；1056 个照片入口、全屏浏览、导航、Event Museum、海报/留言/OAuth 回归通过 |
| 2026-08-10 | production 域名与视觉 | `VERIFIED` | 根路径连续 15 次直接 200；`www` 308 保留 path/query；390×844 首屏/照片墙正常，控制台 0 errors / 0 warnings |

## Recent Updates

- 2026-08-11 12:24 Asia/Bangkok：确认旧 `CMI 海报工程/poster-wall` Worker 误覆盖 production，创建 Issue #16；从官网 `main` 与正确 production 配置恢复三屏首页，Worker 为 `6cb12718-4630-43b1-8988-7598e6043f8d`。
- 2026-08-11 12:24 Asia/Bangkok：开始 v0.2.1 修复，将共享小红书入口更新为用户提供的新短链，并增加固定目标测试。
- 2026-08-11 12:27 Asia/Bangkok：v0.2.1 `npm run check` 全部通过；本地 Playwright 桌面与 390px 为 7 passed、1 skipped，生产依赖审计为 0 个漏洞。
- 2026-08-08 15:11 Asia/Bangkok：创建 Milestone、Issue #11 和完整标签体系，开始建立三位一体可追溯协作地基。
- 2026-08-08 15:22 Asia/Bangkok：上下文骨架、记录模板和 CI 门禁完成首轮验证；第一次完整检查暴露并修正了检查器参数的 TypeScript 推断问题。
- 2026-08-08 15:30 Asia/Bangkok：PR #12 首次 required CI 通过，补齐 `v0.1.1` Release Record，三位一体协作地基进入 Shipped 状态。
- 2026-08-08：发布 `v0.1.0-foundation`，新平台接管生产域名，旧 Worker/D1 保留回滚。
- 2026-08-10 11:43 Asia/Bangkok：创建 Milestone v0.2.0、Issue #13 与 ADR 0005，开始三屏首页和 Photo Museum v1 实施。
- 2026-08-10 12:30 Asia/Bangkok：完成三屏首页、Photo Museum v1、全站社交入口与 Event Museum 嵌入；上传 staging R2、部署 staging 并完成桌面与 390px 自动化和目视验收，进入 review。
- 2026-08-10 12:30 Asia/Bangkok：创建 [PR #14](https://github.com/CMI-Community/Website/pull/14)，提交可审查实现、staging 证据、偏离记录与回滚合同；production 保持未部署。
- 2026-08-10 12:44 Asia/Bangkok：收到首轮 staging review；盘点新照片目录为 508 个文件，识别 7 个 v1 精确重复项，按 [ADR 0006](./adr/0006-photo-museum-v2-density-and-scale.md) 启动 528 张 Photo Museum v2 与首屏可读性调整。
- 2026-08-10 13:18 Asia/Bangkok：完成首屏放大紧字号和 Logo 五色模糊色场；528 张 Photo Museum v2 已以七轨高密度布局发布 staging，通过全部自动化与桌面/手机视口目视验收，进入第二轮 review。
- 2026-08-10 13:26 Asia/Bangkok：内容负责人完成手机验收并明确批准立即发布 production；创建 [v0.2.0 Release Record](./releases/v0.2.0.md)，开始版本化 R2 同步和 production 发布链。
- 2026-08-10 13:42 Asia/Bangkok：[PR #14](https://github.com/CMI-Community/Website/pull/14) 合并并关闭 Issue #13；production R2、Worker、裸域/`www`、桌面/390px 与 1056 个照片入口全部验收通过，发布 [v0.2.0](https://github.com/CMI-Community/Website/releases/tag/v0.2.0) 并进入 Shipped。

## Handoff Notes

- 新会话先读根级 `AGENTS.md`、本工作台、当前 Issue 和被链接的 ADR。
- 运行时资源名称和 GitHub 状态可能变化；执行发布、迁移或删除前必须现场验证。
- Issue 是任务状态权威源，工作台不复制 Issue 正文；若链接状态与本页文字冲突，先以 GitHub 状态为准并在当前 PR 修正本页。
