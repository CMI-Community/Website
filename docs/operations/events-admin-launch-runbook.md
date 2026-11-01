# 活动后台第一版上线与恢复操作单

状态：待负责人确认上线；本文件内 remote 命令仅供审核，未执行。当前实现仅在 `feat/events-admin-2026-11-01` 本地分支。

## 先核对身份与备份

1. 由负责人恢复 Wrangler 登录；不要将验证码、令牌或导出内容粘贴进聊天或 Git。
2. 只读核对域名 `cmi.community` / `www.cmi.community` → 承载流量的 `cmi-community-platform` 版本 → D1/R2 实际绑定。历史 v0.3.4 记录不代表当前流量版本。
3. 核实套餐和 Time Travel 保留期，保存 bookmark、Worker 版本、Git SHA、D1 schema、完整 SQL、媒体清单及 SHA-256。含认证数据的备份只能进入私有目录/私有桶；每次迁移前重新导出。

下面命令仅列出，待批准后使用（在项目根目录，Node 24）：

```sh
npx wrangler deployments list --env production --json
npx wrangler d1 info cmi-community-platform --env production --json
npx wrangler r2 bucket info cmi-community-public-assets --env production
npx wrangler d1 time-travel info DB --env production
# EVENT_BACKUP_DIR 由操作人设置为仓库外的私有、权限700目录。
npx wrangler d1 export DB --remote --env production --output "$EVENT_BACKUP_DIR/pre-migration.sql"
```

`npm run backup:events:local` 应在暂停本地开发服务器及其他写入后执行，以保证模拟器文件副本不会混合并发修改。它仅导出当前本地 D1，复制本地模拟器状态（含 R2），随后将 SQL 导入独立本地 D1 并检查完整性、外键和各表数量。它不等于生产备份，不能据此跳过上面的生产操作。manifest 的 `schemaMigrations` 来自恢复库实际已应用记录，`availableMigrationFiles` 仅是仓库可用文件；`gitHead` 与 `workingTreeDirty` 不冒充已部署的 Worker 版本。

## 资源和身份准备

- 创建独立私有活动桶 `cmi-community-events-private`、独立私有备份桶 `cmi-community-events-backups`；staging 使用各自的 `-staging` 桶。根配置的 `-local` 名称仅供本地模拟器使用。
- 所有私有桶均关闭自定义公开域名和 `r2.dev`；核查没有公开 Worker 或其他绑定绕过。不要关闭承载 180 张历史海报和其他网站资产的共享域名。
- 配置 `EVENT_ADMIN_EMAIL` 为负责人已经确认的唯一邮箱；源码、示例和 Git 不保存该邮箱。保持 `BETTER_AUTH_SECRET` 安全并核对 `BETTER_AUTH_URL`、Resend 发件域名。配置非空随机 `INTEGRATION_KEY_EPOCH` Secret，完整恢复时必须轮换。
- 实际发送并核验 6 位验证码、5 分钟有效期、3 次错误上限和 60 秒重发间隔；验证只有唯一管理员获得活动管理能力，普通账号/OAuth 会话不能签发密钥。
- 首次 OTP 登录完成后，按运行代码的归属迁移流程将存量活动归入管理员。迁移系统身份无登录账户、无角色、未验证邮箱，不作为真人管理员使用。

## 迁移与媒体切换

先在 staging 对同构建、真实媒体副本和隔离数据完成演练，之后才申请 production 切换。以下 production 命令只写不执行：

```sh
npx wrangler d1 migrations list DB --remote --env production
npx wrangler d1 migrations apply DB --remote --env production
```

新增迁移保留 10 个原活动 ID、原文与来源；两个校内活动按已确认规则使用 2026-07-10 补录占位日期，`starts_at` / `ends_at` 为 NULL，原始日期及第二期 13:30 留在内部迁移记录。原静态目录作为证据保留，运行展示改查 D1。

新迁移媒体初始为 `pending`，不进入公开查询。**不能在仅执行 SQL 后立刻切换网站。** 需逐项完成：

1. 导出 `event_migration_records` 的原始与私有对象路径，扩展清单覆盖旧原图、缩略图、历史版本、已知公开别名。Cloudflare 域名、缓存、历史部署和所有存储入口均需人工核对。
2. 将真实图复制至私有桶，逐对象回读验证 SHA-256、字节数、真实类型与尺寸，与源文件一致后再更新 `media_assets` 的校验字段、`status='ready'` 及 `event_media.verified_at`。这一步不能使用 `test:seed:events`；该脚本仅产生本地合成图片。
3. 把旧公开副本先归档到私有备份，保持可恢复；按独立批准的清单撤除旧公开副本或其路由，并清除已有一年缓存。只处理受管活动资源，不影响 180 张历史海报。此操作涉及线上资源，当前未执行。
4. 验证旧 `assets.cmi.community`、`r2.dev`、旧 Worker `/media/activities/...`、历史公开别名均不可取得受管海报。新地址只为 `/media/events/{eventId}/{mediaId}`。
5. 再切换候选 Worker，验证首页、两个海报档案入口、`/api/v1/events`、`/api/v1/posters`、活动详情与图片一致；发布后新请求即生效，下架后以上入口和图片均不可访问，响应禁用缓存。
6. 记录资源和 Worker 版本、权限验收与失败处理结果；上线批准前不 push、不合并、不部署。

已经下载的图片不可能远程撤回。保证范围是下架完成后的新请求。旧公开资源或缓存未撤除时，不能报告“下架海报完全不可访问”。

## 每日备份与独立副本

代码 `workers/event-backup-workflow.ts` 提供独立 Workflow：D1 导出轮询与重试、SQL 回读哈希、所有已校验媒体版本（包括不再公开的旧版本）按哈希归档与回读、结构版本和数量观察值、完整标记以及失败标记。没有在官网绑定定时器，也未部署该 Worker。SQL 单次处理有 32 MiB 上限，超过即失败；首次演练需确认真实规模，若超限先实现流式哈希再启用。

上线前应从 `wrangler.events-backup.example.jsonc` 复制独立配置并核对占位值（该模板未被主构建引用、未部署），绑定 `DB`、`EVENT_MEDIA`、`EVENT_BACKUPS`，提供 `ACCOUNT_ID`、`DATABASE_ID`、被备份的 `WORKER_VERSION`，以及最小导出权限的 `D1_REST_API_TOKEN` Secret。设每天清迈 04:00（UTC 前一天 21:00，即 `0 21 * * *`）由独立 Cron handler 创建 `EventBackupWorkflow` 实例；配置模板已给出该时间。初次先手动运行并回读验证，随后配置 Workflow 失败通知和超过 24 小时无成功备份的告警。

按 `event-backup-policy.ts` 的保留计划保留至少 35 个日点、12 个月点；它只生成待清理清单，不自动删除备份。首次核查恢复链完整后再配置保留策略，失败证据和下架恢复记录不随日备份清理。媒体版本与 manifest 引用需要联合保留，不能仅按对象年龄删除。每月另导出一份加密离线副本并核对哈希，密钥与备份分开保管。每日完整 manifest 的 `observedCounts` 是查询时观察值，严格的一致性验证以隔离恢复后的 SQL 为准。SQL 使用导出 bookmark，媒体清单在导出后观察；运行期间必须保持版本化对象和媒体校验元数据不可变，不删除旧版本。恢复演练须从 SQL 中核对每个媒体引用在 manifest/私有桶有对应哈希，不能只根据 `complete` 标记宣称完成恢复。

本地可验证部分已通过单独脚本和测试时才在实施报告登记；云端调度、邮件投递、告警投递、套餐和真实恢复耗时仍需线上演练确认。官方流程依据：[Cloudflare Workflows D1 备份示例](https://developers.cloudflare.com/workflows/examples/backup-d1/)及[当前 D1 导出 REST 协议](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/export/)。响应解析同时支持当前嵌套 `result.result.signed_url` 与旧示例的扁平结构，轮询始终发送 `output_format: "polling"`。

## 恢复演练与回滚

1. 暂停活动写入与外部同步，保留现场、当前 bookmark、部署身份和最新独立下架记录。优先用单条修订生成一个新版本恢复；不要改写旧修订。
2. 将完整 SQL 导入新的隔离 D1，不能直接覆盖生产库。检查结构、外键、活动计数、外部 ID 唯一性、版本和海报哈希。保留原库。
3. 从独立备份桶重放备份后下架记录；状态冲突、记录不完整时默认隐藏。核查媒体已存在且仍私有。
4. 清除恢复库旧会话和验证码，重新核验管理员；轮换独立 Worker Secret `INTEGRATION_KEY_EPOCH` 使所有旧 Agent 密钥失效，重新签发需要近期 OTP 验证。
5. 将兼容 Worker 与验证通过的新库配套切换，验证公开页面、权限、发布、下架、恢复记录及真实海报，再开放写入。保存旧库作为撤回切换依据。
6. 每月重复隔离恢复和加密离线副本检查，记录实际恢复耗时。只有 SQL 无法覆盖必要时点才考虑在维护状态下使用 Time Travel 原位恢复。

回滚 Worker 不会回滚 D1/R2。恢复旧 Worker 可能重新启用静态活动和旧公开海报路径，因此本次发布后不能把“直接回滚旧 Worker”作为可靠下架保护；应选择兼容本次权限和私有媒体边界的修复版本。
