# Architecture Decision Records

ADR 保存跨任务仍然有效、影响长期边界或难以回滚的决定。普通实现选择留在 Issue/PR，可撤销实验使用 [Experiments](../experiments/README.md)。

## Registry

| ADR | Status | Decision |
| --- | --- | --- |
| [0001](./0001-platform-foundation.md) | Accepted | 官网采用 React Router 全栈和 Cloudflare 平台地基 |
| [0002](./0002-open-source-and-brand-boundary.md) | Accepted | Apache-2.0 代码许可与 CMI 品牌内容分离 |
| [0003](./0003-identity-and-publishing.md) | Accepted | 邀请制身份、服务端角色和 D1 单一发布源 |
| [0004](./0004-traceability-governance.md) | Accepted | 任务、思考、过程三位一体可追溯协作 |

新增 ADR 时复制 [template.md](./template.md)，使用下一个四位编号。状态只能是 Proposed、Accepted、Rejected 或 Superseded；已接受 ADR 不直接重写结论。
