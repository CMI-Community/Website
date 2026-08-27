# ADR 0007：Projects 原生路由与兰纳档案迁移

- 状态：Accepted
- 日期：2026-08-27
- 关联 Issue：[#22](https://github.com/CMI-Community/Website/issues/22)
- Supersedes：无

## 上下文

- `VERIFIED`：官网使用 React Router SSR、Cloudflare Worker、D1、R2 与受保护的 production 环境；Projects v1 只有类型化导航目录。
- `VERIFIED`：第 26 期兰纳博物馆站当前是独立 Vite/Vercel 应用，主体实现集中在大型页面与样式文件中，并直接读取 Supabase。
- `VERIFIED`：旧 Supabase 项目 `cmi-lanna-pattern-archive` 已在 2026-08-27 恢复；恢复后核得 36 条公开记录和 `pattern-submissions` 中 160 个对象。
- `OBSERVED`：兰纳旧仓库存在未提交的 FAM 扩充内容，且线上部署不包含该批改动。
- `VERIFIED`：恢复后已撤销 `anon`、`authenticated` 与 `service_role` 对档案表的写权限，并将原提交函数固定为只读 410 响应；Pattern Garden 独立函数未改动。

## 决策驱动因素

- 后续活动需要稳定、可分享、可索引的 `cmi.community` 子路径。
- 官网首页不能为单个项目承担额外脚本、样式或媒体成本。
- 文化档案需要保留来源、上下文、署名、权利状态和可验证导出。
- 数据恢复、staging、production 与旧站跳转必须可以分别停止和回滚。
- 第 26 期活动已经结束，不再需要匿名写入面。

## 备选方案

### 独立应用挂载到子路径

- 优点：初次改动少，旧站代码几乎不需要拆分。
- 代价：形成第二套构建、路由、依赖和发布体系；首页与项目难以共享长期治理。

### 代理或 iframe 旧 Vercel 站

- 优点：可以很快获得同域表面入口。
- 代价：域名只是外壳，运行、数据、可访问性、SEO 和回滚仍然分裂，不构成迁移。

### 官网原生模块

- 优点：复用同一 Worker、SSR、D1/R2、CI、staging 和人工 production 批准；可形成后续期次的稳定框架。
- 代价：需要拆分旧页面、迁移媒体和转换 PostgreSQL 数据。

## 决策

1. 项目身份和路由由仓库内类型化目录管理；运营档案以 D1 为唯一运行数据源，公共媒体进入版本化 R2 前缀。
2. 规范中文地址为 `/project/waytoagi/26-lanna-museum`；英文和泰文分别增加 `/en`、`/th` 前缀；回顾追加 `/recap`。
3. 每个原生项目通过显式模块注册表延迟加载，不允许变量路径任意导入；官网首页只加载项目目录和菜单。
4. 兰纳模块在同一 React Router SSR 构建中运行，按活动头部、作品、旅程、博物馆、档案、导出、创意、视频、回顾和页尾拆分。
5. 第 26 期档案只读。删除 Supabase 浏览器客户端、活动码和公共写入函数，不新增替代写 API。
6. D1 保存全部恢复记录与内部权利状态；只有 `published + cleared` 记录和 `ready + cleared` 媒体能进入显式公共投影。
7. Pattern Garden 保持外部项目；旧仓库未提交内容在独立审核通过前不进入公开迁移基线。

## 后果

- 正面：后续期次获得统一 URL、模块边界、三语规则、数据投影、媒体前缀与发布链。
- 正面：项目故障不会要求首页加载或依赖旧 Supabase；production 切换可以晚于代码和数据准备。
- 负面：迁移需要跨仓库核对、Supabase 恢复、PostgreSQL 到 SQLite 转换和媒体校验。
- 负面：固定的互动视觉仍然需要代码 PR；本 ADR 不提供运营后台或无代码页面生成器。

## 迁移与回滚

1. 记录线上部署和已提交源码基线；不改动旧仓库脏工作区。
2. 恢复旧 Supabase 后立即冻结写入，导出数据库与 Storage 到仓库外受控目录。
3. 使用幂等转换器生成 D1 SQL 与 R2 manifest；按本地、staging、production 顺序验证记录、对象、字节和 SHA-256。
4. 先在 staging 验收原生项目；production 由内容负责人另行批准。
5. CMI production 验收通过后才把旧 Vercel 路径永久 308 到新地址。
6. 失败时恢复上一 Worker 与旧 Vercel 部署；新表、R2 对象、源项目和失败证据保留，不执行破坏性逆迁移。

## 推翻条件

- 项目数量或运营频率证明代码审核发布无法满足时，以新 ADR 评估受权 CMS 或项目搭建器。
- 单个项目需要独立运行时、安全隔离或扩缩容边界，且同一 Worker 无法满足时，以新 ADR 评估受控微前端或独立服务。
- D1/R2 无法满足经量化验证的数据、事务或媒体需求时，以新 ADR 重新选择存储平台，不静默恢复浏览器直连数据库。
