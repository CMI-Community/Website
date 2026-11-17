# 四种海报排序与同步滚动：v0.6.0 候选验收

- 状态：Candidate verified；未部署
- 日期：2026-11-18，Asia/Bangkok
- Issue / PR：[#60](https://github.com/CMI-Community/Website/issues/60) / [#61](https://github.com/CMI-Community/Website/pull/61)
- 决策：[ADR 0013](../adr/0013-event-museum-time-order-and-motion.md)、[ADR 0014](../adr/0014-poster-spectrum-and-local-glob-safeguard.md)
- 当前 production：v0.5.0，源码 `5dc72cfc9ba0e76be7282121db160a82b238169d`，Worker `9c0c7d50-8381-49ca-bedb-3c4731d080f5`；现场 deployments list 与公开 poster bundle SHA-256 均匹配。
- 候选运行源码：`3fb83dd163e82b2dd27043a4279915a7f5938085`；隔离构建的 157 个应用／Worker／package／vendor 文件与此提交逐字节一致。
- 本轮维护者已明确授权解决截图和依赖问题后按流程上线；当前记录不冒充 production 发布。

## 最终行为

首页与完整海报档案默认未来到过去、同步向上；四种排序按钮支持时间倒序、时间正序、随机、色谱，随机可重新打乱。方向、速度、暂停、同步／差速与排序彼此独立；减少动态效果时停止流动，保留详情与翻转墙。

色彩排序按需读取实际图像像素，提取真实主色、六个主要 RGB 颜色及主要彩色色簇，排列红到紫，再接白／灰／黑；失败项置后并可重试。48×48 采样、六路并发、会话缓存，完整分析后一次排序。公共历史素材通过当前发布目录白名单的同域只读图片入口分析；受管图片复用原媒体权限。不发送给第三方，不新增管理字段，不写媒体与数据库。

## 验证

- VERIFIED：完整 `npm run check` 通过，117 单元、32 表迁移检查、类型、构建、staging dry-run。
- VERIFIED：完整本地 E2E 37 passed / 3 skipped。三项 skipped 是手机端去重的元数据、PNG 导出和共享 D1；桌面已执行。新增两端排序覆盖真实像素顺序、随机稳定性、重新打乱、失败重试入口及发布图片路径边界。
- VERIFIED：[required CI 44178894225](https://github.com/CMI-Community/Website/actions/runs/44178894225) 全部通过。
- VERIFIED：`npm audit --omit=dev` 为 0；所有 picomatch 传递副本使用可审查的本地安全修补。独立进程攻击样例硬超时测试与普通 glob、构建兼容均通过，保留原审计门禁。官方尚无可升级修复，fork 保留 MIT、来源与后续替换条件，不称为官方补丁。
- OBSERVED：首轮旧照片浏览测试把 Playwright 点击前的自动滚动计入关闭恢复；改为 pointerdown 时测量真实开窗位置后完整重跑通过。

## 图集

- baseline：`output/playwright/releases/20261118T025648515428+0700-v0-5-0-5dc72cfc9ba0-baseline-386e36d1/index.html`，440 captured，0 缺口，运行身份仍匹配。
- candidate：`output/playwright/releases/20261118T045104079255+0700-unversioned-3fb83dd163e8-3fb83dd163e8-candidate-f22138d6/index.html`，冻结 520 项；518 captured，2 not_applicable，0 pending／blocked，已逐页目视复核并封存。
- 2 项不适用为旧排序原生菜单：当前构建实际没有该 select，四种真实按钮及其切换、加载、失败、恢复均有独立截图；没有删除冻结条目。旧未发布候选的缺图、黑图与提前封存历史保留。
- 原生事件／系列／照片／历史活动的 required 校验使用真实系统表面截图。对合成像素排序的截图只证明算法与界面，不冒充实际活动主色分布。
- OBSERVED：首轮 520 项包在文件校验封存后发现少量异步图片解码及一张原生照片校验画面不正确；保留原包，新包以实际 `Image.decode()`、字体就绪及原生表面补拍修正 11 项。不能把旧包的文件 complete 标记当作视觉验收。
- 生产图集与实际站点验收将在正式发布记录单独登记。

## 发布与回滚

无数据库／媒体迁移、Secret 或权限变更。按 required CI、staging、受保护 production Environment 上线；保留当前 Worker 为回滚目标。不能在截图及 staging 验收前宣称正式发布。回滚不删除任何活动、图片或私有资料。
