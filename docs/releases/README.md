# Release Records

Release Record 是 production 发布和治理版本的仓库内持久证据。GitHub Release 必须链接对应文件；GitHub Actions 原始日志可能过期，因此关键结论要写回记录。

## Registry

| Release | Runtime impact | Record |
| --- | --- | --- |
| `v0.1.0-foundation` | 新 Worker 接管 production | [Foundation release](./v0.1.0-foundation.md) |
| `v0.1.1` | 文档与治理，不触发 production 发布 | [Context foundation](./v0.1.1.md) |
| `v0.2.0` | 三屏正式首页与 528 张 Photo Museum | [Homepage Museums](./v0.2.0.md) |

production 发布前复制 [template.md](./template.md)。回滚时更新原记录并关联新的 Bug/Incident Issue，不删除失败发布历史。
