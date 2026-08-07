# ADR 0003：邀请制身份与单一发布源

- 状态：Accepted
- 日期：2026-08-07

## 决策

使用 Better Auth + D1 支持验证邮箱、邮箱密码、Google 和 GitHub。新账号必须匹配有效邀请；相同已验证邮箱可以安全关联登录方式。角色为 member、editor、moderator、admin，并由服务端执行。

运营内容只在 D1 中进入草稿、revision、发布和审计流程。editor 可以写草稿但不能发布，admin 发布时必须生成 revision 和 audit log。

## Bootstrap

第一位管理员的邮箱通过 Cloudflare Secret 提供。该邮箱完成验证并第一次建立 session 时获得 admin；完成后删除 `BOOTSTRAP_ADMIN_EMAIL` Secret。删除 Secret 不撤销已写入数据库的角色。
