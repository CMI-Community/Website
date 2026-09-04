# Release Records

Release Record 是 production 发布和治理版本的仓库内持久证据。GitHub Release 必须链接对应文件；GitHub Actions 原始日志可能过期，因此关键结论要写回记录。

## Registry

| Release | Runtime impact | Record |
| --- | --- | --- |
| `v0.1.0-foundation` | 新 Worker 接管 production | [Foundation release](./v0.1.0-foundation.md) |
| `v0.1.1` | 文档与治理，不触发 production 发布 | [Context foundation](./v0.1.1.md) |
| `v0.2.0` | 三屏正式首页与 528 张 Photo Museum | [Homepage Museums](./v0.2.0.md) |
| `v0.2.1` | 恢复三屏官网并更新小红书入口 | [Homepage restore and Xiaohongshu](./v0.2.1.md) |
| `v0.3.0` | Projects 原生兰纳站、两级项目菜单与近期活动生命周期 | [Projects and Upcoming Activities](./v0.3.0.md) |
| `v0.3.1` | 近期活动双侧时间线、三态流转与完成后 24 小时保障 | [Recent Activity Timeline](./v0.3.1.md) |
| `v0.3.2` | 9 月 6 日分享会与两场独立 AI+3D 校园工坊 | [September Activities](./v0.3.2.md) |

production 发布前复制 [template.md](./template.md)。回滚时更新原记录并关联新的 Bug/Incident Issue，不删除失败发布历史。
