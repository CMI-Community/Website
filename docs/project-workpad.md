# CMI 官网 Project Workpad

Last updated: 2026-08-28 12:10 Asia/Bangkok

这是本项目唯一动态工作台。它只保存可操作的当前状态和链接，不复制 Issue、PR、日志或聊天全文。

## Snapshot

- Status: `Shipped`
- Current task：[Issue #29：将近期活动改为双侧连续时间线](https://github.com/CMI-Community/Website/issues/29) 已随 v0.3.1 发布；[production evidence PR #31](https://github.com/CMI-Community/Website/pull/31) 正在合并归档 Release Record。
- Current focus：观察 v0.3.1 production；活动将在各自 `endsAt` 后进入右侧“已完成”和 Event Museum。
- Next step：完成 48 小时观察；若无生产异常，不再改动本版本。后续活动继续通过统一审核目录发布。
- Latest production runtime release: [v0.3.1](https://github.com/CMI-Community/Website/releases/tag/v0.3.1)
- Latest governance release: [v0.1.1](https://github.com/CMI-Community/Website/releases/tag/v0.1.1)

## Commander View

- 等待决定：无；v0.3.1 已完成 production 发布与验收。
- `SHIPPED`：[PR #30](https://github.com/CMI-Community/Website/pull/30) 合并为 `main@fd0c945e`；受保护 [production run 33143337095](https://github.com/CMI-Community/Website/actions/runs/33143337095) 发布 Worker `b072eaae-fb4a-457e-ba63-5420f799ee7f`。健康接口为 production，`www` 308 保留 path/query；本轮无 D1 migration、R2 写入或公共 API 变化。
- `VERIFIED`：production 完整单 worker 套件为 21 passed / 5 skipped / 2 冷加载超时；两条超时路径随后各连续复测 3 次，共 6/6 通过。1440×900 与 390×844 目视确认连续时间带、三期顺序、NOW、空的已完成分组和无页面横向溢出；控制台 0 errors / 0 warnings。
- `VERIFIED`：[v0.3.1 Release Record](./releases/v0.3.1.md) 固定发布源、运行版本、验收证据和回滚点；上一 Worker `07a64070-bf94-4d55-96c1-493a1c9aaec4` 保留为直接回滚版本。
- `DECIDED`：[ADR 0009](./adr/0009-recent-activity-timeline.md) 替代 ADR 0008 的“开始即移出”规则；活动在 `endsAt` 后立即进入右侧和 Event Museum，首页默认保留最近 5 场且为每场提供至少 24 小时可见保障。
- `VERIFIED`：#29 本地实现完成：左侧按进行中→即将举行排列，右侧展示已完成，NOW 分隔、两组快捷定位、三态文字、空状态、3D、放大层、详情新窗口与焦点恢复均由同一目录投影；Event Museum 只接收 `now >= endsAt` 的活动。
- `VERIFIED`：#29 本地 `npm run check` 全绿（52 unit tests、16 表 D1 smoke、SSR 与 staging dry-run）；干净临时服务下 Playwright 桌面/390px 为 17 passed / 3 skipped。1440×900 与 390×844 目视确认连续时间带、已完成定位和放大层无页面横向溢出，控制台无 errors / warnings。
- `VERIFIED`：[Draft PR #30 required CI](https://github.com/CMI-Community/Website/actions/runs/33141442712) 从 `314169bb` 全绿；foundation 覆盖依赖审计、公开边界、trace、52 tests、D1、SSR、staging dry-run 与双视口浏览器。
- `VERIFIED`：[staging run 33141592425](https://github.com/CMI-Community/Website/actions/runs/33141592425) 发布 Worker `260d52a9-a7a9-494a-8cdb-288b0639f28a`；D1 无待执行迁移，production job 明确未运行。
- `VERIFIED`：staging 远端完整套件在单 worker 下为 23 passed / 5 skipped，覆盖 1056 个 Photo Museum WebP、三语兰纳、Projects、时间线、Event Museum、海报、身份与反馈；1440×900 和 390×844 目视通过，页面控制台 0 errors / 0 warnings。
- `VERIFIED`：production D1 为 36 entries / 158 media / 174 associations / 1 import，14 cleared 对外可见、22 research_only 服务端隐藏；production R2 217/217 双重回读验证通过，三张活动海报公开回读哈希一致。
- `VERIFIED`：[production run 33132639117](https://github.com/CMI-Community/Website/actions/runs/33132639117) 从 `main@6cdff7dd` 发布 Worker `07a64070-bf94-4d55-96c1-493a1c9aaec4`；最终远端 Playwright 23 passed / 5 skipped，1440×900 与 390×844 真实浏览器无横向溢出或持续控制台告警。
- `VERIFIED`：[旧站 PR #1](https://github.com/CMI-Community/lanna-museum-day-chiang-mai/pull/1) 已合并；Vercel `dpl_9TgfGckPLhTSnieL5XVioePGNLNd` 提升后，9 条中英泰首页/回顾规则均为 308，静态资产保持 200，六个用户入口最终均落到 CMI 200。
- `VERIFIED`：[PR #21](https://github.com/CMI-Community/Website/pull/21) 已通过验收并合并，[#20](https://github.com/CMI-Community/Website/issues/20) 已关闭；该 T1 随 v0.3.0 进入 production。
- `VERIFIED`：[PR #23](https://github.com/CMI-Community/Website/pull/23) 已合并项目路由、审核式目录、D1 模型与幂等导入器；第二组迁移从该 `main` 基线独立实施。
- `VERIFIED`：旧 Supabase 已恢复并冻结：36 条档案均为公开状态；`pattern-submissions` 有 160 个对象、150,120,950 字节；档案表三类运行角色只保留读取权限，提交函数固定返回 410。
- `VERIFIED`：160 个 Storage 对象已完整下载到仓库外受控目录；对象数、总字节和 160/160 ETag/MD5 均一致，并生成逐对象 SHA-256 manifest。
- `VERIFIED`：旧站迁移基线为 Vercel 部署 `dpl_3ZTaLWQoe9xWdEAcwwnt3mQ1FFok` / 提交 `8714afac`；当前旧域名由 `dpl_9TgfGckPLhTSnieL5XVioePGNLNd` 执行 308，原部署保留回滚。
- `VERIFIED`：兰纳站已拆为项目壳、体验模块、回顾、三语字典、档案投影、Canvas 导出和局部样式；首页不加载兰纳代码或媒体，项目页不再包含 Supabase 浏览器客户端、提交表单或旧 Vercel 资产请求。
- `VERIFIED`：本地 D1 导入为 36 条档案、158 个去重媒体对象、174 个角色关联；14 条 `cleared` 对外可见，22 条 `research_only` 由服务端隔离。CMI-LN-0046/0047 的未经核验生成式叙述已转换为明确 `UNKNOWN`，原始导出保持不改且不入 Git。
- `VERIFIED`：本地 R2 迁移清单包含 158 个档案对象与 59 个线上基线站点资产，共 217 个对象、217,384,137 字节；217/217 已逐对象回读并核对 SHA-256。
- `VERIFIED`：staging D1 已导入 36 条公开档案、158 个媒体对象与 174 个角色关联；14 cleared / 22 research_only、1 个导入批次、零缺失详情图、零外键异常。同一修正后 SQL 连续重放两次成功。
- `VERIFIED`：staging R2 已写入版本前缀内 217 个对象、217,384,137 字节；上传回读与独立 `verify-only` 均为 217/217，清单 SHA-256 为 `d7889bf9…`。
- `CORRECTED`：首次 staging 重放发现导入器的固定批次审计日志仍使用随机 ID，导致第二次执行冲突；现改为由批次清单派生稳定 ID 并 `ON CONFLICT DO NOTHING`。旧生成器产生的 1 条重复 staging 审计已精确删除，保留 1 条稳定审计；档案数据未删除。
- `VERIFIED`：[PR #24](https://github.com/CMI-Community/Website/pull/24) 已合并到 `main` 提交 `72b1b586`；staging Worker `ffea982c-584e-4983-8d55-2b52d201d98b` 部署成功，当次 production job 明确跳过；#22 已在最终 cutover 后关闭。
- `VERIFIED`：首次 staging 导出用例点击早于客户端挂载的问题已用明确挂载信号修正；导出专项连续 3/3 通过，完整远端套件最终为 21 passed / 5 skipped，覆盖三语、14 条 cleared 档案、首页两处菜单、Museum、社交、海报、权限和 1080×1350 PNG。
- `VERIFIED`：staging 目视检查覆盖 1440×900 中文项目、390×844 中文档案、泰文回顾和首页 Projects 面板；四个视图均无横向溢出，泰文头部原图和元素边界确认菜单完整可点。
- `VERIFIED`：[PR #25](https://github.com/CMI-Community/Website/pull/25) 与 [PR #27](https://github.com/CMI-Community/Website/pull/27) 已依次合并；旧站 [PR #1](https://github.com/CMI-Community/lanna-museum-day-chiang-mai/pull/1) 从已部署提交 `8714afac` 的独立干净 worktree 完成三语与 `/recap` 永久跳转。
- `VERIFIED`：[Draft PR #25 required CI](https://github.com/CMI-Community/Website/actions/runs/33080710778) 全部通过：依赖审计、公开边界、T3 追踪、类型、46 tests、D1、SSR、staging dry-run 与桌面/390px 浏览器 13 passed / 3 skipped。
- `VERIFIED`：[#26](https://github.com/CMI-Community/Website/issues/26) 已建立；第 27 期公众号原文核实活动为 2026-08-30 12:30–17:30（清迈时间），标题、公开海报与详情链接齐全。实现使用 [ADR 0008](./adr/0008-upcoming-activity-lifecycle.md) 的代码审核式目录，不建设活动 CMS。
- `VERIFIED`：第 27 期海报已优化为 864×1821 WebP，并写入 staging R2 版本化路径；回读后的 361,972 字节与 SHA-256 `37f8b7ac…e71e42c` 一致。原始公众号抓取、临时导出与源文件均未进入 Git，production R2 未改变。
- `VERIFIED`：#26 本地实现已完成：Projects 面板明确显示一级系列和二级期次，第 27 期外链与第 26 期内链并列；Discord 降为普通末位入口；首页近期区支持最多 5 条、横向滚动、指针 3D、放大层、焦点恢复和减少动画，开始时刻后自动投影到 Event Museum。
- `VERIFIED`：#26 本地 `npm run check` 全绿（50 unit tests、16 表 D1 smoke、SSR 与 staging dry-run）；Playwright 桌面/390px 为 17 passed / 3 skipped。真实浏览器复核两级菜单、手机放大层与横向布局，控制台无 errors / warnings。
- `VERIFIED`：[PR #27](https://github.com/CMI-Community/Website/pull/27) 以 stacked review 完成并合并；#26 在 production 证据 PR 中关闭。
- `VERIFIED`：[Draft PR #27 required CI](https://github.com/CMI-Community/Website/actions/runs/33084658539) 全绿：依赖审计、公开边界、T3 追踪、类型、50 tests、D1、SSR、dry-run 与桌面/390px 浏览器 17 passed / 3 skipped。
- `VERIFIED`：staging Worker `b90d343c-3ea8-49fc-8ef5-e321188bdea7` 已从提交 `8b48a06` 发布；production 与旧 Vercel 均保持 200 且未切换。海报同域入口为 200 `image/webp`、immutable，远端 SHA-256 与上传前一致。
- `VERIFIED`：staging 完整远端 Playwright 为 23 passed / 5 skipped，覆盖三语兰纳、第 26/27 期、Photo Museum 1056 个变体、Event Museum 180 条公共目录、身份与反馈。1440×900 与 390×844 的首页、两级面板和放大层目视通过，控制台 0 errors / 0 warnings。
- `VERIFIED`：[《牛来》公众号原文](https://mp.weixin.qq.com/s/0Z1DTbX93zrAfwlCVxjzGg) 经真实浏览器核实：标题“CMI 吃饭俱乐部 #1 · 周五《牛来》观影”，2026-08-28 16:00–20:00（清迈时间），CMI Studio，限 10 人，每人带一份愿意分享的食物；文章发布时间为 2026-08-27 19:57:21。
- `VERIFIED`：用户提供的 941×1672 PNG 已在仓库外优化为 337,210 字节 WebP，并写入 staging R2 `activities/cmi-dinner-club/01-niulai-screening/v1/poster.webp`；回读 SHA-256 `4d022246…af6dfc` 一致，production R2 未写入。
- `VERIFIED`：《牛来》已进入同一审核式活动目录；2026-08-28 16:00 前，首页按开始时刻从近到远显示《牛来》在左、第 27 期在右，达到各自开始时刻后按同一目录自动进入 Event Museum。新增两张卡片暴露的 390px 网格固有宽度外溢已通过活动区 `min-width: 0` 和手机头部收束修正。
- `VERIFIED`：本轮 `npm run check` 全绿（50 unit tests、16 表 D1 smoke、SSR 与 staging dry-run）；本地 Playwright 桌面/390px 为 17 passed / 3 skipped，覆盖两张卡片顺序、真实外链、放大层、焦点、减少动画、Event Museum 流转、Projects 面板与无横向溢出。
- `VERIFIED`：[Draft PR #27 本轮 required CI](https://github.com/CMI-Community/Website/actions/runs/33126046778) 通过；从提交 `c1ecb17` 发布 staging Worker `8aee0ea9-97b5-42d5-8c8f-03be02a2bc5e`。production 与旧 Vercel 未改变。
- `VERIFIED`：staging 远端 Playwright 为 23 passed / 5 skipped；桌面与 390px 均显示《牛来》在左、第 27 期在右，文案、两条公众号地址、真实尺寸、放大层和生命周期准确。390px `scrollWidth === clientWidth === 390`，Projects 面板在视口内，控制台 0 errors / 0 warnings；《牛来》同域海报回读哈希继续为 `4d022246…af6dfc`。
- `VERIFIED`：[新云南市场公众号原文](https://mp.weixin.qq.com/s/SW_BaQ3eFgWgsYBxWoftlQ) 经真实浏览器核实：标题“8月29日｜ 清迈新云南市场 CMI 社区义卖 #1”，2026-08-29 周六 07:00–12:00（清迈时间），地点为清迈新云南市场，内容为二手书籍与 3D 打印玩具社区义卖；文章发布时间为 2026-08-28 06:30:31。
- `VERIFIED`：用户提供的义卖 PNG 为 1024×1535、2,487,213 字节，SHA-256 `4d78f162…e962cf`；原图不进入 Git。
- `VERIFIED`：义卖海报已在仓库外优化为 1024×1535、337,432 字节 WebP，并写入 staging R2 `activities/cmi-community-sale/01-new-yunnan-market/v1/poster.webp`；回读 SHA-256 `ef9a2aae…b2a6d2` 与上传前一致，production R2 未写入。
- `VERIFIED`：义卖活动已进入统一审核式目录；8 月 28 日 16:00 前首页顺序为《牛来》→ 新云南市场义卖 → 第 27 期，达到各自开始时刻后逐期进入 Event Museum。`npm run check` 全绿；本地 Playwright 桌面/390px 为 17 passed / 3 skipped，三期标题、详情、生命周期、放大层、焦点和无横向溢出通过。
- `VERIFIED`：[Draft PR #27 本轮 required CI](https://github.com/CMI-Community/Website/actions/runs/33129773926) 全绿；从提交 `e62a612` 发布 staging Worker `8c62debd-80bc-458f-874a-49c7bd5efcfd`。义卖同域 WebP 为 337,432 字节，SHA-256 `ef9a2aae…b2a6d2` 与上传前一致；远端 Playwright 为 23 passed / 5 skipped。
- `VERIFIED`：staging 1440×900 与 390×844 目视确认三张海报顺序、手机横向滑动、新义卖放大层、日期时间、详情链接和 Escape 焦点恢复；真实尺寸为 941 / 1024 / 864，页面无横向溢出，Projects 面板在手机视口内，控制台 0 errors / 0 warnings。
- `SHIPPED`：内容负责人于 2026-08-28 明确要求把已验收 staging 推送到正式版；production 已按 D1/R2 → Worker → 双视口验收 → Release Record/GitHub Release 的门禁执行。22 条 `research_only` 继续隐藏，6 个孤立源对象继续不公开。
- `VERIFIED`：2026-08-11 旧 `poster-wall` Worker 误覆盖 production 后，已从本仓库 `main` 恢复 `cmi-community-platform` Worker `6cb12718-4630-43b1-8988-7598e6043f8d`；根路径重新直接呈现三屏正式首页。
- `VERIFIED`：公开仓库、Apache-2.0、Issues、Discussions、required CI 和 production 人工批准均已启用。
- `VERIFIED`：`cmi.community` 当前由 `cmi-community-platform` Worker `07a64070-bf94-4d55-96c1-493a1c9aaec4` 提供服务；上一 Worker `d5703143-aeb3-4676-9f07-6c42e860fe92` 保留为回滚点。
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
- 首页近期活动连续时间带、代码审核式活动目录和按开始/结束时刻形成三态并进入 Event Museum 的公共投影。
- Projects 原生路由、代码审核式项目模块、三语地址与只读文化档案投影。
- WaytoAGI 清迈场第 26 期兰纳博物馆站及其 D1/R2 数据媒体迁移。
- GitHub Issues、ADR、Experiment、PR、CI 和 Release Record 组成的可追溯协作流程。

### Out of Scope

- 完整 CMS 后台、公开注册、社区关系图谱和完整英文内容。
- Projects 与活动的 D1/CMS 自助发布、草稿审核和无代码页面搭建器。
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
| 2026-08-27 | [ADR 0008：近期活动目录与 Event Museum 自动流转](./adr/0008-upcoming-activity-lifecycle.md) | 尚未开始与历史活动需要共享日期、海报和详情真相源，并在请求时自动切换 | `Superseded / T3` |
| 2026-08-28 | [ADR 0009：近期活动使用双侧连续时间线](./adr/0009-recent-activity-timeline.md) | 首页需要同时显示未来、进行中与最近完成活动，并保留 24 小时最短回看窗口 | `Accepted / T3` |

## Options Considered

| Option | Pros | Cons | Current stance |
| --- | --- | --- | --- |
| 工作台 + Issues + Milestones | 一页总览，任务状态仍由 GitHub 管理 | 需要每次交付更新上下文声明 | `Selected` |
| GitHub Project 看板 | 可视化较强 | 增加权限、字段和重复维护 | `Rejected for now` |
| 公私双轨记录 | 可以保留敏感细节 | 容易形成第二真相源 | `Rejected` |
| 保存完整聊天 | 信息最全 | 噪音、隐私和可读性风险高 | `Rejected` |
| 首屏项目年鉴横带 | 系列与期次可同时获得高曝光 | 挤压现有 CMI 主叙事、Museum 与手机首屏 | `Rejected for #20` |
| 两处导航共用 Projects 下拉菜单 | 不改变首屏内容层级，随滚动始终可达 | 需要处理两个导航状态与移动端越界 | `Selected for #20` |
| 代码审核式活动目录 | 无后台成本即可统一近期区与 Event Museum 生命周期 | 新增活动仍需 PR 与 R2 上传 | `Selected for #26` |
| 立即建设 D1 活动 CMS | 运营可自助上传与发布 | 需要权限、草稿、审核、媒体与审计完整项目 | `Rejected for #26` |

## Task Board

### Now

- [x] [#29](https://github.com/CMI-Community/Website/issues/29) 完成三态活动投影与连续时间带组件。
- [x] 完成 `npm run check`、桌面/390px Playwright 与真实浏览器目视验收。
- [x] 创建 Draft PR、通过 required CI 并只部署 staging。
- [x] 内容负责人验收 staging 并明确批准 production。
- [ ] 将版本提升为 `0.3.1`，完成最终 CI / staging、合并与受保护 production 发布。
- [ ] 完成 production 双视口验收、Release Record、GitHub Release 与 Issue #29 关闭。

### Next

- [x] 合并项目路由、D1 模型、幂等导入器与第一组 PR。
- [x] 从已冻结 Supabase 完成数据库/Storage 受控导出与逐项校验。
- [x] 拆分兰纳模块、迁移三语页面、只读档案与媒体工具。
- [x] 完成第二组 PR required CI、staging D1/R2/Worker 和桌面/手机验收。
- [x] 内容负责人确认公开边界并批准后，完成 production cutover、旧站跳转与 Release Record。

### Later

- 暂无；未收敛想法先进入 [GitHub Discussions](https://github.com/CMI-Community/Website/discussions)。

### Done

- [x] [v0.3.0：Projects、兰纳原生迁移与近期活动](https://github.com/CMI-Community/Website/releases/tag/v0.3.0)
- [x] [#26 建立近期活动自动流转与 Projects 层级展示](https://github.com/CMI-Community/Website/issues/26)
- [x] [#22 建立 Projects 原生发布框架并迁移兰纳第 26 期](https://github.com/CMI-Community/Website/issues/22)
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
| Navigation | Projects 菜单在顶部与吸顶导航各有一个实例 | 可能造成手机拥挤、隐藏焦点或下拉越界 | 共用目录与组件；production 自动化与真实浏览器验证 Escape、外部点击、390px 和隐藏导航焦点 | `VERIFIED` |
| Migration | 兰纳旧 Supabase 已恢复、冻结并完成受控导出 | 36 条记录、160 个源对象和哈希已锁定；目标需保持公开边界 | production 为 36 entries / 158 media / 174 associations；217 个 R2 对象上传回读和独立验证一致 | `VERIFIED` |
| Rights | 36 条在线档案中 22 条仍标记需要权利复核 | 不能把源端 `rights_review=true` 误标为已授权 | production 保留为 `research_only` 并由服务端隔离；只有 14 cleared 对外投影 | `VERIFIED / OPEN` |
| Integrity | 源 Storage 有 6 个对象未被任何档案引用 | 直接删除会破坏原始证据，直接公开会制造孤立媒体 | 保留为非公开迁移证据；production 未删除、未公开且未建立虚假关联 | `VERIFIED EXCEPTION` |
| Source | 兰纳旧仓库存在未提交 FAM 扩充 | 直接复制会把未审核内容混入线上基线 | 不改脏工作区；线上行为为基线，新增内容走独立审核 | `OBSERVED` |
| Release | Projects T3 涉及 Worker、D1、R2 与旧 Vercel | 错序切换会失去回滚入口 | D1/R2 → Worker → production 验收 → 旧 Vercel 308 已按序完成；两个旧运行版本保留 | `VERIFIED` |
| Time | 近期活动在结束时刻转入右侧时间线和 Event Museum | 错误时区会提前或延后状态切换 | 目录强制 ISO offset；开始、结束、结束后 24 小时固定测试时钟和实时 production 招募态均通过 | `VERIFIED` |
| Media | 三张近期活动海报进入版本化 R2 | 原始抓取进 Git 或路径过宽会破坏内容与公开边界 | production 同域路由逐张回读大小与 SHA-256；只开放目录精确白名单 GET/HEAD | `VERIFIED` |
| Time | 《牛来》活动于 2026-08-28 16:00 开始、20:00 结束 | 发布后状态验收窗口较短；需区分进行中与已完成 | production 发布时仍按 8 月 28 / 29 / 30 顺序展示；固定时钟覆盖开始、结束与 24 小时保障边界 | `VERIFIED` |

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
- 近期活动由 `ActivityDefinition` 审核目录驱动；请求时按 `startsAt` / `endsAt` 投影为即将、进行中、已完成三态。完成后立即进入右侧时间带与 Event Museum；右侧默认最近 5 场，并保证结束未满 24 小时的活动继续可见。
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
| 2026-08-27 | [PR #24 第五次 CI](https://github.com/CMI-Community/Website/actions/runs/33075982451) | `OBSERVED / CORRECTED` | 非浏览器阶段全部通过；媒体密集项目页的 metadata 测试在共享负载下等待所有图片/视频 `load` 超过 30 秒，功能断言尚未开始。项目测试改为以 SSR `domcontentloaded` 为导航完成条件，媒体本身由独立自然尺寸、下载和 R2 哈希断言覆盖 |
| 2026-08-27 | [PR #24 第六次 CI](https://github.com/CMI-Community/Website/actions/runs/33076829409) | `OBSERVED / CORRECTED` | 非浏览器阶段全部通过；13 项浏览器中 12 项通过。390px 英文切换已开始导航，但 URL 断言仍使用默认 5 秒并在 `DOMContentLoaded` 前超时，首次与重试一致；语言切换现与其它项目导航使用同一 15 秒 SSR 完成条件 |
| 2026-08-27 | [PR #24 第七次 CI](https://github.com/CMI-Community/Website/actions/runs/33077262715) | `VERIFIED` | required CI 全部通过，浏览器为 13 passed / 3 skipped、无重试；依赖审计、追踪、46 tests、D1、SSR 与 staging dry-run 均通过 |
| 2026-08-27 | #22 staging D1 导入 | `VERIFIED / CORRECTED` | 36 entries、158 media、174 associations、14 cleared / 22 research_only、1 import、零缺图和外键异常；真实重放发现并修复审计 ID 幂等缺口，同一新 SQL 连续两次成功 |
| 2026-08-27 | #22 staging R2 同步 | `VERIFIED` | 217 objects、217,384,137 bytes；上传后回读及独立 verify-only 均为 217/217，manifest `d7889bf9…` |
| 2026-08-27 | [PR #24 合并与 staging 部署](https://github.com/CMI-Community/Website/actions/runs/33079144985) | `VERIFIED` | merge `72b1b586`；staging Worker `ffea982c-584e-4983-8d55-2b52d201d98b`，production job skipped，Issue #22 open |
| 2026-08-27 | #22 staging 首轮远端全套 | `OBSERVED / CORRECTING` | 20 passed / 5 skipped / 1 failed；唯一失败为导出点击早于客户端挂载，其余项目与官网回归通过；已增加挂载信号等待 |
| 2026-08-27 | #22 staging 最终远端全套 | `VERIFIED` | 导出专项 3/3；完整套件 21 passed / 5 skipped，桌面与 390px 项目、官网和 R2 路径无回归 |
| 2026-08-27 | #22 staging 目视验收 | `VERIFIED` | 1440×900 项目首屏、390×844 档案、泰文回顾和首页 Projects 面板均正确；四视图 `scrollWidth === clientWidth` |
| 2026-08-27 | [旧站 Draft PR #1](https://github.com/CMI-Community/lanna-museum-day-chiang-mai/pull/1) | `VERIFIED / NOT DEPLOYED` | 从线上提交 `8714afac` 建立干净分支；9 条三语与回顾永久跳转规则、cutover tests 2/2、Sites tests 4/4、production build 与 diff check 通过；旧 Vercel production 未改变 |
| 2026-08-27 | [Draft PR #25 required CI](https://github.com/CMI-Community/Website/actions/runs/33080710778) | `VERIFIED` | foundation 3m09s 全绿；46 tests、D1、SSR、staging dry-run 与桌面/390px 浏览器 13 passed / 3 skipped |
| 2026-08-27 | #26 staging R2 海报 | `VERIFIED` | `activities/waytoagi/27-improv-ai-shortfilm/v1/poster.webp` 回读为 361,972 字节，SHA-256 `37f8b7ac…e71e42c`；production R2 未写入 |
| 2026-08-27 | #26 本地完整检查 | `VERIFIED` | `npm run check` 通过：lint、公开边界、trace、typecheck、50 tests、16 表 D1 smoke、SSR build 与 staging dry-run |
| 2026-08-27 | #26 本地 Playwright 与目视 | `VERIFIED` | 桌面与 390×844 为 17 passed / 3 skipped；两级 Projects、27/26 期次、近期海报、3D、放大、焦点、减少动画、Event Museum 和无横向溢出通过；控制台无 errors / warnings |
| 2026-08-27 | [Draft PR #27 required CI](https://github.com/CMI-Community/Website/actions/runs/33084658539) | `VERIFIED` | foundation 2m50s 全绿；50 tests、D1、SSR、staging dry-run 与桌面/390px浏览器 17 passed / 3 skipped |
| 2026-08-27 | #26 staging Worker 与媒体 | `VERIFIED` | Worker `b90d343c-3ea8-49fc-8ef5-e321188bdea7`；海报入口 200 `image/webp`、immutable、SHA-256 `37f8b7ac…e71e42c`；production 与旧站保持 200 |
| 2026-08-27 | #26 staging Playwright 与目视 | `VERIFIED` | 23 passed / 5 skipped；桌面/390px 两级菜单、真实海报、放大层、三语兰纳、Photo 1056 变体、Event 180 条、身份和反馈通过；控制台 0 errors / 0 warnings |
| 2026-08-28 | 《牛来》公众号与 staging R2 | `VERIFIED` | 真实浏览器核实 8 月 28 日 16:00–20:00；941×1672 WebP 为 337,210 字节，staging R2 上传回读 SHA-256 `4d022246…af6dfc` 一致，production 未写入 |
| 2026-08-28 | 《牛来》本地目录与双视口 | `VERIFIED` | `npm run check` 全绿；Playwright 桌面/390px 为 17 passed / 3 skipped；8 月 28 日在左、8 月 30 日在右，手机 Projects 与页面均无横向溢出 |
| 2026-08-28 | [《牛来》PR CI 与 staging](https://github.com/CMI-Community/Website/actions/runs/33126046778) | `VERIFIED` | required CI 通过；Worker `8aee0ea9…`；远端 23 passed / 5 skipped，同域海报哈希、双视口顺序、放大层、390px 和零控制台告警通过 |
| 2026-08-28 | 新云南市场义卖本地目录与媒体 | `VERIFIED` | 公众号原文、1024×1535 WebP、staging R2 回读哈希、`npm run check` 与桌面/390px 17 passed / 3 skipped 均通过；production 未改变 |
| 2026-08-28 | [新云南市场义卖 PR CI 与 staging](https://github.com/CMI-Community/Website/actions/runs/33129773926) | `VERIFIED` | required CI 通过；Worker `8c62debd…`；远端 23 passed / 5 skipped，三期排序、义卖同域海报哈希、桌面/390px 滑动与放大层、焦点、无溢出和零控制台告警通过 |
| 2026-08-28 | v0.3.0 production D1/R2 | `VERIFIED` | D1 为 36 entries / 158 media / 174 associations / 1 import，14 cleared / 22 research_only，重复导入幂等且外键正常；R2 217/217 双重回读，三张活动海报公开哈希一致 |
| 2026-08-28 | [v0.3.0 production deploy](https://github.com/CMI-Community/Website/actions/runs/33132639117) | `VERIFIED` | `main@6cdff7dd` 经 protected Environment 发布 Worker `07a64070-bf94-4d55-96c1-493a1c9aaec4`，健康接口为 production |
| 2026-08-28 | v0.3.0 production Playwright 与目视 | `VERIFIED` | 最终 23 passed / 5 skipped；1440×900 与 390×844 的三期顺序、3D、放大、焦点、Projects、三语兰纳、14 条公开档案、Museum 与无溢出通过，新会话控制台 0 errors / 0 warnings |
| 2026-08-28 | [#29 required CI](https://github.com/CMI-Community/Website/actions/runs/33141442712) | `VERIFIED` | foundation 2m00s 全绿；52 tests、D1、SSR、staging dry-run 与桌面/390px 浏览器 17 passed / 3 skipped |
| 2026-08-28 | [#29 staging deploy](https://github.com/CMI-Community/Website/actions/runs/33141592425) | `VERIFIED` | Worker `260d52a9-a7a9-494a-8cdb-288b0639f28a`；无 D1 migration，production job 未运行 |
| 2026-08-28 | #29 staging 首轮远端套件 | `OBSERVED / RETRIED` | 三 worker 并发同时回读 Photo Museum 大量媒体时出现 socket hang up、hydration 和导航超时；SSR 与真实页面可返回，失败跨兰纳、Projects、Photo 与时间线，不作为通过证据 |
| 2026-08-28 | #29 staging 最终远端套件与目视 | `VERIFIED` | 单 worker 顺序运行 23 passed / 5 skipped；1440×900 与 390×844 连续时间带、空的已完成分组、Projects 和 Museum 正常，控制台 0 errors / 0 warnings |
| 2026-08-28 | [#29 final CI 与 staging](https://github.com/CMI-Community/Website/actions/runs/33143044968) | `VERIFIED` | package 0.3.1 的 required CI 全绿；branch staging Worker `8bf8424d…`、目标用例 6/6，合并后 main staging 继续成功；D1 均无迁移 |
| 2026-08-28 | [v0.3.1 production deploy](https://github.com/CMI-Community/Website/actions/runs/33143337095) | `VERIFIED` | `main@fd0c945e` 经 protected Environment 发布 Worker `b072eaae-fb4a-457e-ba63-5420f799ee7f`；健康接口为 production，上一 Worker `07a64070…` 为回滚点 |
| 2026-08-28 | v0.3.1 production Playwright 与目视 | `VERIFIED / RETRIED` | 完整套件 21 passed / 5 skipped / 2 桌面冷加载超时；相同两项随后连续 6/6 通过。1440×900 与 390×844 时间线、三期顺序、Museum、Projects 和无溢出通过，控制台 0 errors / 0 warnings |
| 2026-08-28 | [旧站 PR #1 与 Vercel cutover](https://github.com/CMI-Community/lanna-museum-day-chiang-mai/pull/1) | `VERIFIED` | merge `3f37b25b`；候选版先验证 9 条 308 与静态资产 200，再提升 `dpl_9TgfGckPLhTSnieL5XVioePGNLNd`；中英泰首页/回顾最终均为 CMI 200 |

## Recent Updates

- 2026-08-28 12:10 Asia/Bangkok：v0.3.1 已正式上线。PR #30 合并为 `main@fd0c945e`，受保护 [production run 33143337095](https://github.com/CMI-Community/Website/actions/runs/33143337095) 发布 Worker `b072eaae-fb4a-457e-ba63-5420f799ee7f`；D1 无迁移、R2 无写入。production 健康与 `www` 308 正常；完整远端套件 21 passed / 5 skipped，2 条桌面冷加载超时随后各 3/3 通过。1440×900 与 390×844 目视确认三期位于左侧、NOW 和右侧空状态正确、无横向溢出，控制台 0 errors / 0 warnings。回滚点为上一 Worker `07a64070…`，进入 48 小时观察。
- 2026-08-28 11:48 Asia/Bangkok：内容负责人明确要求发布到正式环境。当前仓库只有一个 worktree；PR #30 头提交 `569439bf` 相对最新 `main@086178fe` 仅前进两条本轮提交，工作区干净、required CI 全绿、staging 远端 23 passed / 5 skipped。production 当前健康且 Worker 为 `07a64070-bf94-4d55-96c1-493a1c9aaec4`，锁定为直接回滚点；本轮不迁移 D1、不写 R2。package 版本升至 0.3.1，准备重新通过最终 CI / staging 后合并并走受保护 production 发布。
- 2026-08-28 11:35 Asia/Bangkok：[Draft PR #30](https://github.com/CMI-Community/Website/pull/30) required CI 全绿；staging Worker `260d52a9-a7a9-494a-8cdb-288b0639f28a` 从 `314169bb` 发布，D1 无迁移、production 未运行。首轮三 worker 远端套件因并发回读 Photo Museum 发生跨页面网络超时；改用单 worker 顺序重跑后完整 23 passed / 5 skipped。staging 1440×900 与 390×844 目视确认三张即将活动、NOW、已完成空状态、无页面溢出和控制台 0 errors / 0 warnings。等待用户验收，production 尚未获批准。
- 2026-08-28 11:18 Asia/Bangkok：#29 本地实现与验收完成。新增三态活动投影和双侧连续时间带，Event Museum 归档边界从开始时刻改为结束时刻；桌面短轨道居中，390px 保持同一分组顺序与快捷定位。`npm run check` 全绿；Playwright 在清理 15 小时旧开发服务后由干净临时服务运行，结果为 17 passed / 3 skipped；真实浏览器桌面、手机、已完成放大层和控制台目视通过。下一步为 Draft PR、required CI 与 staging，production 未改变。
- 2026-08-28 10:54 Asia/Bangkok：用户确认把近期活动改为连续时间带，左侧为即将/进行中，右侧为已完成，中间以 NOW 分隔；两组由近到远，左侧最多 5 场，右侧默认 5 场并优先保证每场结束后至少 24 小时可见。创建 [#29](https://github.com/CMI-Community/Website/issues/29) 与 [ADR 0009](./adr/0009-recent-activity-timeline.md)，ADR 0008 标记为 Superseded；分支为 `codex/29-recent-activity-timeline`。本轮不改 D1/R2/公共 API，production 尚未获发布批准。
- 2026-08-28 08:49 Asia/Bangkok：v0.3.0 已正式上线。production D1/R2 依序完成幂等导入与双重回读；受保护 [run 33132639117](https://github.com/CMI-Community/Website/actions/runs/33132639117) 从 `main@6cdff7dd` 发布 Worker `07a64070-bf94-4d55-96c1-493a1c9aaec4`。最终 production Playwright 23 passed / 5 skipped，桌面与 390px 真实浏览器确认三期顺序、横向滑动、3D、放大层、焦点、两级 Projects、三语兰纳、Museum 和 14 条公开档案，无横向溢出或持续控制台告警。旧站 PR #1 合并后先验证候选部署，再提升 Vercel `dpl_9TgfGckPLhTSnieL5XVioePGNLNd`；六个旧入口最终均落到 CMI 200，旧静态资产保持 200。CMI 回滚 Worker 为 `d5703143…`，旧站回滚部署为 `dpl_3ZTa…`，进入 48 小时观察。
- 2026-08-28 07:54 Asia/Bangkok：内容负责人明确确认 staging 可以推送正式版。发布源锁定为当前 stacked PR #25 / #27；production Worker 回滚点为 `d5703143-aeb3-4676-9f07-6c42e860fe92`，package 版本升至 0.3.0。22 条 `research_only` 继续服务端隐藏、6 个孤立源对象继续排除，production 发布不会扩大公开范围。Release Record 只能在真实发布后标记 `Released`，将在 production 验收后补齐；下一步完成最终 CI/合并，再同步 production D1/R2 和三张活动海报。
- 2026-08-28 07:38 Asia/Bangkok：提交 `e62a612` 的 required CI 全绿后，仅发布 staging Worker `8c62debd-80bc-458f-874a-49c7bd5efcfd`。义卖同域海报回读为 337,432 字节，SHA-256 `ef9a2aae…b2a6d2`；远端 Playwright 最终 23 passed / 5 skipped。1440×900 与 390×844 真实浏览器确认《牛来》→ 新云南市场义卖 → 第 27 期从左到右，手机可横向滚到三张海报；义卖放大层、日期时间、详情外链、Escape 焦点恢复、Projects 面板、390/390 无溢出和控制台 0 errors / 0 warnings 均通过。production 与旧 Vercel 未改变，进入内容负责人 staging 验收。
- 2026-08-28 07:27 Asia/Bangkok：公众号自动提取触发验证码，按技能要求改用真实浏览器核实“8月29日｜ 清迈新云南市场 CMI 社区义卖 #1”、07:00–12:00、清迈新云南市场、二手书籍与 3D 打印玩具。用户原图在仓库外优化为 337,432 字节 WebP，上传 staging R2 后回读 SHA-256 `ef9a2aae…b2a6d2` 一致。统一目录和 E2E 已扩展为三期动态期望，当前按 8 月 28/29/30 日从左到右，并逐期在开始时刻进入 Event Museum；`npm run check` 全绿，本地 Playwright 为 17 passed / 3 skipped，准备提交现有 Draft PR #27。
- 2026-08-28 06:29 Asia/Bangkok：提交 `c1ecb17` 推送 Draft PR #27，required CI 2m06s 全绿后仅发布 staging Worker `8aee0ea9-97b5-42d5-8c8f-03be02a2bc5e`。同域《牛来》海报返回 200 `image/webp`、immutable，SHA-256 `4d022246…af6dfc`；远端 Playwright 23 passed / 5 skipped。1440×900 与 390×844 目视确认《牛来》在左、第 27 期在右；手机可横向看到第二张，Projects 完整在视口内，页面 390/390 无溢出，放大层 Escape 焦点恢复，控制台 0 errors / 0 warnings。production 与旧 Vercel 未改变，进入内容负责人 staging 验收。
- 2026-08-28 06:21 Asia/Bangkok：《牛来》进入统一活动目录与本地 R2 fixture；单元测试固定两期按开始时刻从近到远，E2E 覆盖活动开始瞬间转入 Event Museum。两张手机卡片首次暴露活动区网格固有宽度把页面撑到 464px，已通过活动容器允许收缩并在窄屏隐藏重复地点标签修正；最终 `npm run check` 全绿，本地 Playwright 桌面/390px 为 17 passed / 3 skipped，准备提交 Draft PR #27 并等待 required CI 后仅更新 staging。
- 2026-08-28 06:12 Asia/Bangkok：用户要求加入 [CMI 吃饭俱乐部 #1 ·《牛来》观影](https://mp.weixin.qq.com/s/0Z1DTbX93zrAfwlCVxjzGg)，并明确近期活动按开始时间从近到远、从左到右。公众号自动提取触发验证码，按流程改用真实浏览器核实标题、2026-08-28 16:00–20:00、CMI Studio、限 10 人和共享食物机制。附图在仓库外优化为 337,210 字节 WebP，上传 staging R2 后回读哈希一致；开始更新审核目录和排序测试，production 不动。
- 2026-08-27 22:00 Asia/Bangkok：[Draft PR #27 required CI](https://github.com/CMI-Community/Website/actions/runs/33084658539) 全绿后，从提交 `8b48a06` 发布 staging Worker `b90d343c-3ea8-49fc-8ef5-e321188bdea7`。第 27 期同域 WebP 返回 200、immutable，远端 SHA-256 与源一致；完整远端 Playwright 23 passed / 5 skipped。1440×900 和 390×844 的首页、两级 Projects、真实海报与放大层目视通过，控制台 0 errors / 0 warnings。production 和旧 Vercel 保持原状，进入内容负责人 staging 验收。
- 2026-08-27 21:52 Asia/Bangkok：提交 `d9dec3a` 并创建 stacked [Draft PR #27](https://github.com/CMI-Community/Website/pull/27)，base 为 `codex/22-lanna-cutover`，使用 `Refs #26`；本地最终门禁仍为 50 tests、D1、SSR、dry-run 与 17 passed / 3 skipped。等待 required CI 后只发布 staging，production 和旧 Vercel 继续不动。
- 2026-08-27 21:49 Asia/Bangkok：完成 #26 本地实现与验收。第 27 期公开海报以版本化路径上传 staging R2 并回读核对 361,972 字节和 SHA-256；Projects 面板形成“一级系列 → 二级期次”单面板层级，第 27 期外链、第 26 期内链并列，Discord 降为普通末位入口。首页近期活动支持最多 5 条横向浏览、动态 3D、手机放大详情、焦点恢复和减少动画，达到开始时刻后请求级自动进入 Event Museum。`npm run check` 全绿，桌面/390px Playwright 17 passed / 3 skipped；production 未改变。
- 2026-08-27 21:31 Asia/Bangkok：用户要求弱化 Discord、明确 Projects“系列 → 期次”层级、新增第 27 期外链，并在首页增加最多 5 条可横向滑动、3D hover、点击放大的近期活动。公众号原文核实第 27 期为 2026-08-30 12:30–17:30（清迈时间）并取得公开海报；创建 [#26](https://github.com/CMI-Community/Website/issues/26) 与 [ADR 0008](./adr/0008-upcoming-activity-lifecycle.md)，采用代码审核式目录和请求时钟自动流转，不建设 CMS，production 门禁不变。
- 2026-08-27 21:13 Asia/Bangkok：Draft PR #25 的 [required CI](https://github.com/CMI-Community/Website/actions/runs/33080710778) 全绿；依赖审计、公开边界、T3 追踪、类型、46 tests、D1、SSR、staging dry-run 与桌面/390px 浏览器 13 passed / 3 skipped。PR 继续保持 Draft，Issue #22、CMI production 和旧 Vercel production 均保持未切换。
- 2026-08-27 21:09 Asia/Bangkok：[Draft PR #25](https://github.com/CMI-Community/Website/pull/25) 已建立并保持未合并；首次 CI 只因正文未使用固定 T3 标题被 traceability gate 拦截，现已按模板修正。在旧站线上提交 `8714afac` 的独立干净 worktree 创建 [Draft PR #1](https://github.com/CMI-Community/lanna-museum-day-chiang-mai/pull/1)，9 条三语与 `/recap` 永久跳转规则通过 2/2 cutover tests、4/4 Sites tests、production build 与 diff check；旧站脏工作区、CMI production、旧 Vercel production 均未改变。
- 2026-08-27 21:01 Asia/Bangkok：staging 导出专项连续 3/3 通过，完整远端套件最终为 21 passed / 5 skipped；三语、14 条公开档案、两处 Projects 菜单、Museum、社交、海报、权限、网络边界和 1080×1350 PNG 均通过。1440×900 中文项目及 390×844 档案、泰文回顾、首页菜单完成目视验收，四视图无横向溢出；泰文头部经原图放大和元素边界确认完整可点，无需修改视觉 CSS。
- 2026-08-27 20:56 Asia/Bangkok：PR #24 合并为 `72b1b586`，staging Worker `ffea982c-584e-4983-8d55-2b52d201d98b` 发布成功，production job 跳过。远端全套首轮 20 passed / 5 skipped / 1 failed；唯一失败是导出用例的 SSR 卡片已可见但客户端尚未接管，点击没有打开详情框。第三组 `codex/22-lanna-cutover` 从最新 main 建立，导出用例增加与三语流程相同的客户端挂载等待后复验。
- 2026-08-27 20:47 Asia/Bangkok：staging D1 完成 36/158/174 导入与全量结构校验；同一 SQL 重放时发现末尾审计 INSERT 使用随机 ID。改为按导入批次派生稳定审计 ID 并冲突忽略，新增逐字确定性 SQL 测试；修正 SQL 在本地与 staging 均连续重放两次成功，`npm run check` 全绿，并精确清理 1 条旧重复 staging 审计。staging R2 上传回读和独立 verify-only 均为 217/217、217,384,137 字节、清单 `d7889bf9…`。
- 2026-08-27 20:34 Asia/Bangkok：PR #24 第七次 required CI 全绿，浏览器为 13 passed / 3 skipped、无重试；前置依赖、追踪、46 tests、D1、SSR 与 dry-run 全部通过，开始 staging 数据与媒体迁移。
- 2026-08-27 20:31 Asia/Bangkok：PR #24 第六次 CI 的依赖审计、公共边界、T3 追踪、类型、46 tests、D1、SSR 和 dry-run 全部通过；浏览器为 12 passed / 3 skipped、1 failed。唯一失败是 390px 英文整页切换仍以默认 5 秒等待 URL；改为明确等待该路由 `DOMContentLoaded`，不等待媒体全量加载。
- 2026-08-27 20:25 Asia/Bangkok：三轮并发稳定性复跑最终为 9 passed / 3 skipped，无重试；`npm run check` 全部通过（46 tests、D1、SSR、staging dry-run）。390px 在共享负载下 SSR 已显示、但客户端挂载信号可能超过默认 5 秒；将明确的可交互挂载等待设为 15 秒，仍在后续语言菜单点击前强制确认客户端接管。
- 2026-08-27 20:24 Asia/Bangkok：重复浏览器测试确认泰文回顾页在 SSR `DOMContentLoaded` 与路由级样式注入之间存在约 250ms 的暂态原图宽度；最终布局没有溢出。无溢出断言改为轮询稳定布局，仍严格限制最终误差不超过 1px。
- 2026-08-27 20:21 Asia/Bangkok：PR #24 第五次 CI 在媒体密集项目页的 `page.goto` 等待全量 `load` 时超时，未进入 metadata 断言；其他 12 项浏览器测试通过。将项目导航统一改为等待 SSR `domcontentloaded`，语言链接以 URL 和客户端挂载信号确认，图片与导出继续由独立断言覆盖。
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
