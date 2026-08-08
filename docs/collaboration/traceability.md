# 三位一体可追溯协作协议

本协议让维护者可以回答三个问题：现在要做什么、为什么这样做、实际发生了什么。记录必须公开安全、足够复核、容易维护，不依赖完整聊天或某一次 AI 会话。

## Source of Truth

| 留痕 | 权威载体 | 不承担的职责 |
| --- | --- | --- |
| 任务 | GitHub Issue / Milestone | 工作台不复制任务全文；Linear 不替代公开任务 |
| 思考 | Issue 决策段、Experiment、ADR | 不保存模型内部推理或完整聊天 |
| 过程 | PR、CI 证据、Release Record | commit message 不承担完整说明 |
| 当前状态 | Project Workpad | 不成为第二个任务系统 |

## Evidence Vocabulary

- `VERIFIED`：已有测试、数据查询、生产请求或可复核链接支持。
- `OBSERVED`：已经看到或复现，但尚未完成稳定验证。
- `ASSUMED`：为了推进而采用的假设，必须写明下一次核对条件。
- `UNKNOWN`：证据不足或受阻，禁止包装成完成结论。

## Trace Levels

### T1：普通变更

适用于局部、可逆、不会改变长期接口或平台边界的任务。Issue 和 PR 必须记录选择理由、被放弃方案、验证与回滚，不新增独立思考文档。

### T2：实验

适用于需要验证假设、可能被撤销、结果尚不确定的产品或技术尝试。除 T1 记录外，新增 `EXP-YYYY-NNN`，在开始前写明基线、变量、成功条件和停止条件，结束后标记 Concluded 或 Abandoned。

### T3：长期决策

适用于架构、数据库、权限、公共 API、外部平台、许可、安全边界或难回滚变更。除 T1 记录外新增 ADR；如果同时需要探索，可以同时关联 Experiment。已接受 ADR 不静默改写，通过新 ADR 标记 Superseded。

## Lifecycle

1. 未收敛想法进入 Discussions；具备真实场景、范围和验收条件后建立 Issue。
2. 为 Issue 选择 Milestone、优先级、领域和留痕等级，创建 `codex/<issue-number>-<slug>` 分支。
3. 开始修改前建立必要的 Experiment 或 Proposed ADR，并在工作台 Now 中链接 Issue。
4. 实施过程把有意义的偏离、失败和证据写入 PR，不粘贴冗长原始日志。
5. CI 检查代码、公共边界和留痕结构；required check 通过后才能合并。
6. production 发布新增 Release Record；GitHub Release 链接仓库记录并保存 tag。
7. 结束时更新工作台、Experiment/ADR 状态和风险；回滚新增记录，不删除失败历史。

## Required PR Contract

人工 PR 必须：

- 使用 `Closes #N`、`Refs #N` 或关联私密 Security Advisory；
- 恰好选择一个 T1/T2/T3；
- T2 链接一个 Experiment，T3 链接一个 ADR；
- 填写基线与目标、实际改动、偏离与失败、验证、迁移/发布/回滚；
- 声明工作台已更新，或给出无需更新的具体理由；
- 在验证中至少使用一个证据状态词。

Dependabot 不要求 Issue 和工作台更新，但仍须通过代码、安全和构建检查。

## Emergency Override

`trace:override` 只用于检查器误判或紧急修复。维护者添加该标签后，PR 仍必须关联 Issue/Advisory，并填写 `Trace Override` 原因、风险和补录任务。它不能绕过代码测试、公共边界扫描、review 或 production 人工批准。

## Public Safety

- 只记录对决策必要的公开安全事实。敏感约束使用抽象说明，不复制原始材料。
- 禁止 Secret、OAuth code、个人邮箱名单、生产数据库导出、本机绝对路径、私有社区内容和授权证据进入公开仓库。
- GitHub Actions 日志可能过期；关键通过/失败结果要在 PR 或 Release Record 中摘要，UI 证据附桌面与 390px 截图。
- 外部状态会变化；资源、账号、域名和部署目标在任何变更前都要重新验证。

## Maintenance Rules

- `docs/project-workpad.md` 是唯一动态工作台；不要新建第二份项目状态文档。
- ADR、Experiment 和 Release Record 使用各自目录的索引与模板。
- 不使用定时机器人直接修改 main；上下文更新随正常 PR 审核。
- 相对链接、记录编号、状态词和 PR 合同由 `npm run check:trace` 验证。
