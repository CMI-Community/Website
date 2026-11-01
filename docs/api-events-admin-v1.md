# 活动管理与 Agent 接口 v1

状态：本地已实现；部署和云端资源准备见[上线操作单](./operations/events-admin-launch-runbook.md)。

## 人工后台

`/admin/login` 使用唯一配置邮箱的验证码登录；`/admin/events` 管理活动，`/admin/events/new` 新增，`/admin/events/{id}` 编辑。`/admin/api-keys` 签发和撤销外部密钥，签发前要求 10 分钟内的验证码验证。后台无 AI 识别、填充或生成。

新活动必填标题、真实起止时间、地点、分类、简介、海报。时间填写采用清迈 UTC+7，接口接受带偏移的 ISO 时间。详情外链和报名链接选填，仅 HTTPS；没有外链时仍有 `/events/{id}` 公开详情。两条历史补录记录保留 NULL 时刻和专用补录标记，不能把此例外用于新增活动。

会话写接口要求同源 Origin。通用 `/api/v1/content` 不能创建、修改、转换或发布 event；通用媒体接口不能上传受管海报。

## 授权接口

| 方法与路径 | 行为 |
| --- | --- |
| GET /api/v1/admin/api-keys | 列出授权安全元数据，不返回完整密钥 |
| POST /api/v1/admin/api-keys | 签发，完整 token 只在本响应显示一次 |
| POST /api/v1/admin/api-keys/{keyId}/revoke | 撤销后立即拒绝新请求和重放 |
| POST /api/v1/integrations/{source}/media | multipart/form-data 的 file，私有上传 |
| GET /api/v1/integrations/{source}/events/{externalId} | 读取范围内活动与 ETag |
| PUT /api/v1/integrations/{source}/events/{externalId} | 完整替换，新增或修改 |
| PATCH /api/v1/integrations/{source}/events/{externalId} | 仅下架 |

默认权限为 `events:write` 与 `media:write`，7 天到期。可选 `events:read`、`events:publish`、`events:unpublish`。修改任何已公开活动必须同时有写入和发布权限；已发布活动不能通过改成草稿隐式下架。

来源范围可在绑定来源中创建。指定活动范围不能新增；没有外部映射时用被授权的活动 ID 作为 externalId。两种范围均要求 URL 的 source 与密钥一致。密钥不能管理其他密钥、提升权限或访问人工会话接口。

请求头示例（占位值）：

```http
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
Idempotency-Key: request-unique-uuid
If-None-Match: *
```

新增使用 `If-None-Match: *`，更新/下架使用 `If-Match: "v1"`（当前返回的版本）。同一个来源的 externalId 长期唯一；每次新操作的 sourceVersion 必须递增。

```json
{
  "sourceVersion": 1,
  "event": {
    "title": "合成接口示例",
    "startsAt": "2026-11-20T14:00:00+07:00",
    "endsAt": "2026-11-20T16:00:00+07:00",
    "location": "测试场地",
    "category": "测试",
    "summary": "这是接口示例，不是真实活动。",
    "posterMediaId": "此前上传响应的媒体ID",
    "posterAlt": null,
    "detailUrl": null,
    "registrationUrl": null,
    "initiator": "CMI Community",
    "series": null,
    "sourcePublishedAt": null,
    "status": "draft"
  }
}
```

完整 PUT 会替换可编辑字段；可选字段显式传 null 可清空。status 省略时为 draft。未知字段拒绝。海报最大 10 MiB，校验 PNG/JPEG/WebP 签名、结构、长度及尺寸；不抓取外部图片 URL，不返回公开桶直链。一张受管海报仅关联一场活动。

下架请求体：

```json
{"sourceVersion": 2, "status": "unpublished"}
```

成功响应含 event、etag、result，新增 HTTP 201、更新 HTTP 200。数据持久化状态 archived 对外映射为 unpublished。相同幂等键和规范化请求返回原结果；同键不同请求为 409。先核验当前授权再重放；并发写入在同一 D1 事务复核授权和版本，失败不留下部分内容、修订、外部映射或幂等成功记录。旧 ETag 为 412，缺少必要前提为 428。

下架先使页面及受管图片不可见，再写独立私有恢复记录。独立记录暂失败返回 503 `BACKUP_PENDING`，不能当作完整成功；同一幂等请求可重试补记录。人工后台刷新后仍能核验/重试。未完成独立记录前不能重新发布。

## 修订和公开读取

- `GET /api/v1/admin/events/{id}/revisions` 返回修订；`POST /api/v1/admin/events/{id}/restore` 携带 `{"revisionNumber":1}` 与当前 If-Match，生成新草稿。已发布活动须先下架，旧修订不覆盖。
- `/api/v1/events`、`/api/v1/events/{id}` 只公开已发布且私有媒体已经校验的活动。
- `/api/v1/posters` 与首页和独立档案共用同一投影：只读历史海报加已完成的受管活动，下架记录不会从旧目录重新出现。
- `/media/events/{eventId}/{mediaId}` 每次核对发布状态与绑定关系，禁止缓存；原 Worker `/media/activities/...` 关闭。旧存储域名与历史缓存撤除仍是部署前必须完成的独立操作。

错误响应包含 `error.code`、中文 `error.message`、`requestId`；表单校验可带 `fields`。不要自动读取新 ETag 后强行覆盖人工修改，409/412 应交由调用方核对内容。
