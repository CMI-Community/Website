# CMI 官网 Project Workpad

Last updated: 2026-08-27 20:17 Asia/Bangkok

这是本项目唯一动态工作台。它只保存可操作的当前状态和链接，不复制 Issue、PR、日志或聊天全文。

## Snapshot

- Status: `In Progress`
- Current milestone: [v0.3.0 — Projects 原生发布框架](https://github.com/CMI-Community/Website/milestone/3)。
- Current focus: [#22](https://github.com/CMI-Community/Website/issues/22) 正在建立 Projects 原生路由、D1/R2 档案边界，并迁移 WaytoAGI 清迈场第 26 期兰纳博物馆站。
- Next step: [PR #24](https://github.com/CMI-Community/Website/pull/24) required CI 通过后导入 staging D1/R2 并部署 Worker，完成三语桌面与手机验收。22 条待权利复核记录与 6 个孤立源对象继续阻止 production 切换。
- Latest production runtime release: [v0.2.1](https://github.com/CMI-Community/Website/releases/tag/v0.2.1)
- Latest governance release: [v0.1.1](https://github.com/CMI-Community/Website/releases/tag/v0.1.1)

## Commander View

- 等待决定：无实施前产品决策；CMI production 与旧 Vercel 308 继续等待迁移完成后的单独批准。
- `VERIFIED`：[PR #21](https://github.com/CMI-Community/Website/pull/21) 已通过验收并合并，[#20](https://github.com/CMI-Community/Website/issues/20) 已关闭；production 未发布该 T1。
- `VERIFIED`：[PR #23](https://github.com/CMI-Community/Website/pull/23) 已合并项目路由、审核式目录、D1 模型与幂等导入器；第二组迁移从该 `main` 基线独立实施。
- `VERIFIED`：旧 Supabase 已恢复并冻结：36 条档案均为公开状态；`pattern-submissions` 有 160 个对象、150,120,950 字节；档案表三类运行角色只保留读取权限，提交函数固定返回 410。
- `VERIFIED`：160 个 Storage 对象已完整下载到仓库外受控目录；对象数、总字节和 160/160 ETag/MD5 均一致，并生成逐对象 SHA-256 manifest。
- `VERIFIED`：Vercel 当前 production 部署为 `dpl_3ZTaLWQoe9xWdEAcwwnt3mQ1FFok`，对应已提交版本 `8714afac`；迁移基线已从较早的 `65d4918` 切换为该线上版本。
- `VERIFIED`：兰纳站已拆为项目壳、体验模块、回顾、三语字典、档案投影、Canvas 导出和局部样式；首页不加载兰纳代码或媒体，项目页不再包含 Supabase 浏览器客户端、提交表单或旧 Vercel 资产请求。
- `VERIFIED`：本地 D1 导入为 36 条档案、158 个去重媒体对象、174 个角色关联；14 条 `cleared` 对外可见，22 条 `research_only` 由服务端隔离。CMI-LN-0046/0047 的未经核验生成式叙述已转换为明确 `UNKNOWN`，原始导出保持不改且不入 Git。
- `VERIFIED`：本地 R2 迁移清单包含 158 个档案对象与 59 个线上基线站点资产，共 217 个对象、217,384,137 字节；217/217 已逐对象回读并核对 SHA-256。
- `VERIFIED`：2026-08-11 旧 `poster-wall` Worker 误覆盖 production 后，已从本仓库 `main` 恢复 `cmi-community-platform` Worker `6cb12718-4630-43b1-8988-7598e6043f8d`；根路径重新直接呈现三屏正式首页。
- `VERIFIED`：公开仓库、Apache-2.0、Issues、Discussions、required CI 和 production 人工批准均已启用。
- `VERIFIED`：`cmi.community` 当前由 `cmi-community-platform` Worker `d5703143-aeb3-4676-9f07-6c42e860fe92` 提供服务，根路径直接呈现三屏正式首页。
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
- 顶部与吸顶导航共用的 Projects 系列与期次入口。
- Projects 原生路由、代码审核式项目模块、三语地址与只读文化档案投影。
- WaytoAGI 清迈场第 26 期兰纳博物馆站及其 D1/R2 数据媒体迁移。
- GitHub Issues、ADR、Experiment、PR、CI 和 Release Record 组成的可追溯协作流程。

### Out of Scope

- 完整 CMS 后台、公开注册、社区关系图谱和完整英文内容。
- Projects 的 D1/CMS 自助发布、项目封面和首屏项目展示卡。
- Pattern Garden 代码/数据迁移与未经审核的本地 FAM 新增内容。
- 未经内容负责人明确批准的 production 发布和旧 Vercel 永久跳转。
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
| 2026-08-27 | [#20：Projects 项目系列下拉菜单](https://github.com/CMI-Community/Website/issues/20) | 导航入口比首屏展示卡更克制，并可用同一审核式目录持续增加期次 | `Accepted / T1` |
| 2026-08-27 | [ADR 0007：Projects 原生路由与兰纳档案迁移](./adr/0007-project-native-routing-and-lanna-migration.md) | 后续活动需要同域发布、模块隔离、D1/R2 单一运行边界和独立切换回滚 | `Accepted / T3` |

## Options Considered

| Option | Pros | Cons | Current stance |
| --- | --- | --- | --- |
| 工作台 + Issues + Milestones | 一页总览，任务状态仍由 GitHub 管理 | 需要每次交付更新上下文声明 | `Selected` |
| GitHub Project 看板 | 可视化较强 | 增加权限、字段和重复维护 | `Rejected for now` |
| 公私双轨记录 | 可以保留敏感细节 | 容易形成第二真相源 | `Rejected` |
| 保存完整聊天 | 信息最全 | 噪音、隐私和可读性风险高 | `Rejected` |
| 首屏项目年鉴横带 | 系列与期次可同时获得高曝光 | 挤压现有 CMI 主叙事、Museum 与手机首屏 | `Rejected for #20` |
| 两处导航共用 Projects 下拉菜单 | 不改变首屏内容层级，随滚动始终可达 | 需要处理两个导航状态与移动端越界 | `Selected for #20` |

## Task Board

### Now

- [ ] [#22 建立 Projects 原生发布框架并迁移兰纳博物馆第 26 期](https://github.com/CMI-Community/Website/issues/22)

### Next

- [x] 合并项目路由、D1 模型、幂等导入器与第一组 PR。
- [x] 从已冻结 Supabase 完成数据库/Storage 受控导出与逐项校验。
- [x] 拆分兰纳模块、迁移三语页面、只读档案与媒体工具。
- [ ] 完成第二组 PR required CI、staging D1/R2/Worker 和桌面/手机验收。

### Later

- 暂无；未收敛想法先进入 [GitHub Discussions](https://github.com/CMI-Community/Website/discussions)。

### Done

- [x] [#20 在两处导航增加 Projects 系列与期次菜单](https://github.com/CMI-Community/Website/issues/20)
- [x] [#16 恢复三屏官网并发布 v0.2.1 小红书入口](https://github.com/CMI-Community/Website/issues/16)
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
| Navigation | Projects 菜单在顶部与吸顶导航各有一个实例 | 可能造成手机拥挤、隐藏焦点或下拉越界 | 共用目录与组件；本地自动化与真实浏览器验证 Escape、外部点击、390px 和隐藏导航焦点 | `VERIFIED (LOCAL)` |
| Migration | 兰纳旧 Supabase 已恢复、冻结并完成受控导出 | 36 条记录、160 个对象、总字节、ETag/MD5 与 SHA-256 已锁定；仍需完成 D1/R2 目标核验 | 先导入本地与 staging；目标记录、关联、对象和哈希任何差异都停止切换 | `VERIFIED / IN PROGRESS` |
| Rights | 36 条在线档案中 22 条仍标记需要权利复核 | 不能把源端 `rights_review=true` 误标为已授权；会阻止这些记录进入公共投影 | staging 保留为 `research_only`；production 切换前由内容负责人完成权利审核 | `BLOCKS CUTOVER` |
| Integrity | 源 Storage 有 6 个对象未被任何档案引用 | 直接删除会破坏原始证据，直接公开会制造孤立媒体；源 Storage 与公共 R2 对象数不能虚假宣称一一相等 | 完整保留在非公开迁移证据；目标公共档案不建立虚假关联，production 切换记录必须先获得明确处置决定 | `VERIFIED EXCEPTION / BLOCKS CUTOVER` |
| Source | 兰纳旧仓库存在未提交 FAM 扩充 | 直接复制会把未审核内容混入线上基线 | 不改脏工作区；线上行为为基线，新增内容走独立审核 | `OBSERVED` |
| Release | Projects T3 涉及 Worker、D1、R2 与旧 Vercel | 错序切换会失去回滚入口 | staging 先行；CMI production 验收后才执行旧站 308 | `PLANNED` |

## Implementation Notes

- 中文为默认无前缀路由，英文预留 `/en/*`。
- D1 是身份、角色、内容、审计和反馈的运行数据源；R2 提供版本化公共媒体。
- 仓库 Markdown 只保存固定政策、架构、协作和发布记录，不复制运营内容。
- 公共 API 必须使用字段白名单；权限始终在服务端校验。
- Photo Museum v1 公共目录只保存展示字段；原始 HEIC/JPEG、本机路径、人物身份和授权材料继续留在私有素材边界。
- Photo Museum v2 按七条轨道分配完整目录，不让每条轨道重复 528 张；v1 保留为不删除的回滚版本。
- Projects v1 使用仓库内类型化公开目录；不新增 D1、公共 API、图片资产或兰纳项目站改动。
- Projects v0.3 使用显式模块注册和路由级延迟加载；中文无前缀，英文 `/en`，泰文 `/th`。
- 第 26 期迁移后只读；D1 保存完整记录与内部权利状态，公共客户端只收到 `published + cleared` 白名单投影。
- 原始 Supabase 导出、Storage、Secret、个人信息和授权材料必须留在仓库外受控目录。
- 154 个被档案引用的 Storage 路径按 SHA-256 去重为 148 个对象；20 个重复引用的线上站点档案图片去重为 10 个对象，D1 仍保留全部 174 个图片角色与顺序关联。6 个源端孤立对象不进入公共 R2 投影。

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
| 2026-08-11 | v0.2.1 完整检查与 PR CI | `VERIFIED` | 本地 `npm run check`、7 passed / 1 skipped E2E、0 production 漏洞；PR #17 required CI 通过并合并 |
| 2026-08-11 | v0.2.1 production 发布 | `VERIFIED` | Worker `d5703143-aeb3-4676-9f07-6c42e860fe92`；首页和档案均为新小红书短链，production Playwright 15 passed / 3 skipped |
| 2026-08-27 | #20 本地完整检查 | `VERIFIED` | `npm run check` 通过：lint、公开边界、trace、typecheck、28 tests、D1 migration、SSR build 与 staging dry-run |
| 2026-08-27 | #20 本地 Playwright | `VERIFIED` | 桌面与 390×844 共 9 passed、1 skipped；两处 Projects 菜单、键盘焦点、外部点击、Museum 与社交入口回归通过 |
| 2026-08-27 | #20 本地视觉检查 | `VERIFIED` | 1440×900 与 390×844 的首屏/吸顶面板均在视口内，字体、纸张色与细边框一致；控制台 0 errors / 0 warnings |
| 2026-08-27 | [PR #21 required CI](https://github.com/CMI-Community/Website/actions/runs/33056144969) | `VERIFIED` | 首次被新增 nanoid 公告拦下；补丁更新后 foundation 1m39s 通过，production dependency audit 为 0 vulnerabilities |
| 2026-08-27 | [#20 staging deploy](https://github.com/CMI-Community/Website/actions/runs/33056362208) | `VERIFIED` | staging Worker `1e15bae5-6bdf-4755-b7ea-bc50584badc5`；production job 未运行；上一 staging 版本 `c1d868da-f541-4bb8-9cf4-11a3c99c65a2` 可回滚 |
| 2026-08-27 | #20 staging Playwright | `VERIFIED` | 桌面与 390×844 共 17 passed、3 skipped；1056 个 Photo Museum WebP、Projects、Museum、社交、海报、OAuth 与反馈路径通过 |
| 2026-08-27 | #20 staging 视觉检查 | `VERIFIED` | 1440×900 首屏与 390×844 首屏/吸顶菜单无越界；新浏览器会话控制台 0 errors / 0 warnings |
| 2026-08-27 | #22 Supabase 迁移基线 | `VERIFIED` | 源项目恢复健康；36 条公开档案、160 个 Storage 对象、150,120,950 字节；表写权限撤销且旧提交函数返回 410，Pattern Garden 未改动 |
| 2026-08-27 | #22 源媒体受控导出 | `VERIFIED` | 160/160 对象完整下载；总字节 150,120,950；全部 ETag 与本地 MD5 一致并生成 SHA-256；识别 6 个源端孤立对象，未删除或公开 |
| 2026-08-27 | #22 线上代码基线 | `VERIFIED` | Vercel production 别名指向部署 `dpl_3ZTaLWQoe9xWdEAcwwnt3mQ1FFok`，提交为 `8714afac`；独立快照共 59 个站点媒体文件、约 68MB |
| 2026-08-27 | #22 平台 PR 本地完整检查 | `VERIFIED` | `npm run check` 通过：公开边界、trace、typecheck、38 tests、16 表 D1 smoke、SSR build 和 staging dry-run |
| 2026-08-27 | #22 兰纳本地 D1/R2 迁移 | `VERIFIED` | 36 条档案、158 个媒体对象、174 个关联；14 cleared / 22 research_only；R2 217/217 对象、217,384,137 字节回读 SHA-256 一致 |
| 2026-08-27 | #22 兰纳本地 Playwright | `VERIFIED` | 桌面与 390×844 共 13 passed、3 skipped；规范路由、三语、回顾、只读档案、焦点、无溢出与 1080×1350 PNG 导出通过 |
| 2026-08-27 | #22 兰纳本地视觉对照 | `VERIFIED` | 1440×900 首屏与线上基线布局一致；390×844 档案和泰文回顾无横向溢出，局部样式未污染官网首页 |
| 2026-08-27 | [PR #24 前三次 CI](https://github.com/CMI-Community/Website/actions/runs/33075153499) | `OBSERVED / CORRECTED` | 首次正文未采用 T3 模板；第二次 Linux 类型检查发现 `archive/` 忽略规则漏源文件；第三次进入浏览器阶段后发现空库 SVG 测试图可展示但不能稳定触发 Canvas 下载，且共享负载下手机流程撞到 30 秒。功能目录已更名，测试图改为确定性 PNG，三语流程上限统一为 60 秒 |
| 2026-08-27 | [PR #24 第四次 CI](https://github.com/CMI-Community/Website/actions/runs/33075641076) | `VERIFIED / STABILIZING` | required CI 全部通过：46 tests、D1、SSR、dry-run 与双视口浏览器成功；桌面三语流程有 1 次重试，定位为整页切换后点击早于客户端挂载。测试改为等待 `html[data-language]` 挂载信号后再操作 |

## Recent Updates

- 2026-08-27 20:17 Asia/Bangkok：PR #24 required CI 首次完整通过；CI 空库 PNG 成功完成 1080×1350 Canvas 下载。桌面三语流程出现一次自动重试，原因是英文整页导航后测试早于客户端挂载点击泰文菜单；增加 `html[data-language]` 挂载断言以消除时序波动，再运行最终 required CI。
- 2026-08-27 20:12 Asia/Bangkok：PR #24 第三次 CI 的依赖、追踪、Linux 类型、D1、构建和 dry-run 均通过；浏览器阶段发现 CI 空库 SVG fixture 无法完成 Canvas 下载，390px 三语流程在共享负载下达到 30 秒。改为脚本生成可被 Chromium 解码和重绘的标准 PNG，并增加确定性单元测试；三语流程使用 60 秒完整路径上限。
- 2026-08-27 20:06 Asia/Bangkok：PR #24 第二次 CI 已通过 T3 追踪门禁；Linux 类型检查发现 `archive/` 通用私有归档忽略规则使六个兰纳功能源文件未进入提交。将功能目录更名为不冲突的 `pattern-archive/`，本地 TypeScript 与 45 项单元测试通过，触发第三次 CI。
- 2026-08-27 20:04 Asia/Bangkok：[PR #24](https://github.com/CMI-Community/Website/pull/24) 已创建。首次 CI 在实现测试前被 PR 正文格式门禁拦截；补为标准 T3 模板并把失败原因写回工作台，以新提交触发使用最新 PR 上下文的 required CI。
- 2026-08-27 19:59 Asia/Bangkok：完成线上 `8714afac` 视觉与功能的原生模块化迁移、三语规范地址、Event metadata、只读 D1 白名单档案和 R2 迁移工具。真实浏览器首次暴露并修复语言/回顾跨路由点击无效；完整双视口 E2E 为 13 passed / 3 skipped。源端 6 个孤立对象与 22 条待权利复核记录继续明确阻止 production 切换。
- 2026-08-27 19:15 Asia/Bangkok：Vercel CLI 核得当前线上基线为 production 部署 `dpl_3ZTaLWQoe9xWdEAcwwnt3mQ1FFok` / 提交 `8714afac`，不再使用较早的 `65d4918`；从提交对象建立独立只读快照，旧脏工作区未改动。160 个 Supabase Storage 对象完成受控下载、ETag/MD5 和 SHA-256 核验；识别 6 个孤立源对象及 22 条待权利复核记录，作为 production 切换门禁保留。
- 2026-08-27 19:03 Asia/Bangkok：恢复并冻结兰纳 Supabase 源项目；核得 36 条公开档案（CMI-LN-0027 至 CMI-LN-0071）和 160 个媒体对象（150,120,950 字节）。撤销档案表写权限、将 `submit-pattern` 固定为 410 只读响应，Pattern Garden 独立函数保持不变；ADR 0007 接受。
- 2026-08-27 18:56 Asia/Bangkok：内容负责人接受 #20 并要求进入原生迁移；PR #21 合并、Issue #20 关闭，production 仍未发布。创建 [Milestone v0.3.0](https://github.com/CMI-Community/Website/milestone/3)、[#22](https://github.com/CMI-Community/Website/issues/22) 与 Proposed ADR 0007，开始项目路由、D1 模型和幂等迁移工具。
- 2026-08-27 15:32 Asia/Bangkok：创建 [#20](https://github.com/CMI-Community/Website/issues/20) 并开始 T1 实施；确认两处导航共用 `Projects` 单层分组菜单，首个系列为 WaytoAGI 切磋大会清迈场，production 仍保持未授权。
- 2026-08-27 15:50 Asia/Bangkok：完成类型化目录、共用菜单、目录单元测试与双视口 E2E；两次移动端目视检查分别暴露并修复首屏左越界和吸顶右越界，完整 E2E 固定为 3 workers 后稳定通过，进入 PR / staging review。
- 2026-08-27 15:53 Asia/Bangkok：[PR #21](https://github.com/CMI-Community/Website/pull/21) 首次 CI 被当日新增的 `nanoid < 3.3.18` 高危公告拦下；确认其为 Vite → PostCSS 间接依赖，只将锁文件从 3.3.17 补丁升级至 3.3.18，`npm audit --omit=dev` 恢复为 0 vulnerabilities。
- 2026-08-27 16:44 Asia/Bangkok：PR required CI 通过并从提交 `22db021` 部署 staging；远端完整套件首次因 Photo Museum 并发加载下的 5 秒滚动时序失败 1 项，截图显示吸顶导航随后已出现，单独复跑通过；改为先确认目标进入视口并使用 15 秒远端上限后，完整套件稳定为 17 passed / 3 skipped，双视口目视与控制台复核完成，等待内容负责人验收。
- 2026-08-11 12:24 Asia/Bangkok：确认旧 `CMI 海报工程/poster-wall` Worker 误覆盖 production，创建 Issue #16；从官网 `main` 与正确 production 配置恢复三屏首页，Worker 为 `6cb12718-4630-43b1-8988-7598e6043f8d`。
- 2026-08-11 12:24 Asia/Bangkok：开始 v0.2.1 修复，将共享小红书入口更新为用户提供的新短链，并增加固定目标测试。
- 2026-08-11 12:27 Asia/Bangkok：v0.2.1 `npm run check` 全部通过；本地 Playwright 桌面与 390px 为 7 passed、1 skipped，生产依赖审计为 0 个漏洞。
- 2026-08-11 12:35 Asia/Bangkok：PR #17 required CI 通过并合并；从 `main` 发布 v0.2.1 Worker `d5703143-aeb3-4676-9f07-6c42e860fe92`，production 桌面与 390px 为 15 passed、3 skipped，三屏官网和新小红书入口验收完成。
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
