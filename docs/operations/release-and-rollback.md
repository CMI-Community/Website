# 发布、迁移与回滚

## 每次生产发布前

1. 确认 staging 使用正确的 D1/R2/Worker，而不是旧海报 Worker。
2. `npm ci && npm run check && npm run test:e2e`。
3. 对迁移先做本地验证，再应用 staging；迁移必须向前兼容旧 Worker 的回滚窗口。
4. 验证公共目录没有本地路径、哈希、内部证据、授权判断或未发布内容。
5. 在 GitHub production Environment 审批 deployment。

## 生产验收

- `/` 308 到 `/archive/posters`；`www` 308 到裸域且保留 path/query。
- HTML、JS、CSS、`/api/v1/health` 与 R2 资产独立返回正常。
- 180 张海报、LOFI、详情和匿名留言可用；390×844 无横向溢出。
- 两个隔离访客分别留言/投票，刷新后仍能看到一致共享状态。
- 未受邀注册、RBAC、草稿隔离、revision 与 audit log符合测试矩阵。

## 回滚

若任一核心验收失败，把 `cmi.community` 和 `www` 的自定义域名重新绑定旧 `cmi-community-site` Worker。不要删除新 D1、旧 D1 或 R2 对象；记录失败部署版本、数据写入窗口和恢复时间。确认新旧留言数据差异后再决定是否向前迁移。
