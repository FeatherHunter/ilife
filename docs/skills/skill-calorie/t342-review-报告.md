# #342 独立对抗审查报告（不采信实施结论，全部持锁独立复跑）

> 被审提交：b443838／5d159c0／df2e07f（HEAD==df2e07f）。票面以 `gh issue view 342` 为准。
> 审查者只写：`docs/skills/skill-calorie/t342-review-*`、`.scratch/t342-review/`；未碰实施件／被审测试／冻结表／路由／home／生成物（`git status` 示被审 8 件自 HEAD 起零改动）。
> 可复跑脚本：`docs/skills/skill-calorie/t342-review-probe.mjs`（用法见文件头；前置 `pnpm build`）。
> 运行导出：`docs/skills/skill-calorie/t342-review-runs.md`（GATE-RUN 一对一）。

## 1. 独立复跑（§5.1）

- 主测试：`node packages/skill-calorie/test/exercise-records-342.test.mjs` → 5/5 绿（pass 5 fail 0），runId=68565826 exit=0。
- 生成链：`pnpm build` exit=0（runId=483fa7be，日志 grep 无 error，exercise 仅出现在 GEN-STAMP 声明源清单）；`pnpm gen:check` exit=0（runId=324b3b86，PASS 键 118＝写 46＋读 72）。`pnpm gen`／`help:build` 未重跑（写共享生成物，树上有他人在途脏改，防误写；等价覆盖：新命令 example 即主测试第 1 条直跑 exit 0；声明计数 10 键／118 键一致）。
- 判据红→绿复核：`b443838^` 的 `routes.ts:161` 为 `non-exec`（`legacy-chain`，无 key），现为 `exec calorie.view.exercise-records`；门禁日志 fda7962d（红，无 exec）与现 `routesFor`（有备注→exec 新命令）对照一致。

## 2. 自设新探针（盲区，7 项，独立种子 4 行：深蹲·力量·有备注／骑行·有氧·无备注／硬拉·力量·无备注／八段锦·日常·有备注）

- 红：`hasNote:"yes"`（字符串）→ exit=2 用法错被拒（PROBE-P1-bad-hasNote: PASS）。
- 绿：`category:""` → exit=0 且 4 行全在（PROBE-P2-empty-category: PASS）。
- 另：未知分类 exit=4 阻断（P3）；今日窗只含今日两行（P4）；3 词路由 cli==冻结 cli==data_source（P5）；力量／有氧／备注三子集抓排均对（P6 真权威样例）。
- 探针敏感度（负对照，未碰实施件，断言翻转副本）：RESULT 6/7，P6 FAIL，exit=1（runId=b380ea95）。证探针会咬，非空断言。
- 全绿：RESULT 7/7 exit=0（runId=4107b551）。

## 3. 收窄变放宽（自造真权威样例，P6）

- 力量 filter 含深蹲／硬拉、不含骑行；有氧 filter 含骑行、不含深蹲／硬拉；备注 filter 含深蹲／八段锦、不含骑行／硬拉。应抓仍被抓，应排仍被排。

## 4. 对账

- GATE-RUN 一对一：被审证据 11 个 runId 在门禁日志中 START/RUN 成对、退出码与声称一致；审查者 5 有效＋2 作废行见运行导出。
- 提交范围：3 提交共 8 件（commands／records／routes／scene-04-exercise／测试／证据／changeset），只本票件，无 home／分派层／生成物手改。
- 等待量：落盘（10002／20002／0…），活锁未抢（WAIT-OWNER-ALIVE ticket 378），释放归属一致。

## 5. 缺陷归属（范围外不单独 FAIL）

- S3-1（本票范围·已知①）：`看今日运动`／`看昨日运动`（order 150/151）仍指 `calorie.view.exercise`（home 地盘，禁写，冻结两侧一致 D2④ 绿）；命令侧已就绪（主测试第 5 条＋P4）。下一手：与场景 01 图（#162）串行抢锁搬迁。
- S3-2（本票范围·已知②）：parity 三件未落盘（help-center-106 367→368、routing-81、t81 snapshot，他人在途脏改，按口径未碰）。下一手：待树干净后手跟。
- 范围外发现（S3，不 FAIL）：工作区现 13 件他人在途改动（analysis／weight／cli／triggers 等，#335／#376 等）＋ 6 个未跟踪件；本审查未碰。
- 本票引入缺陷：0。S1：0。

## 6. 五维打分（96/100）→ PASS

- 契约一致 27/30（3 词改指＋2 词命令就绪，差 3 分系已知 S3-1）；
- 证据真实可复现 24/25（门禁一对一全对，扣 1 分系中间态 TYPE 门叙事依赖自述行）；
- 新旧对照 20/20（红 non-exec→绿 exec 三重验证：源码／dist／routesFor）；
- 工程红线 15/15（范围纯粹，records 199 行＜350，对外 3 件≤5，example 实跑）；
- 文档同步 10/10（证据＋changeset UTF-8 齐，parity 缺口已留痕）。
- 任一 S1→FAIL：无；＜85→FAIL：96。**结论 PASS**。

## 7. 未做项与下一手

1. 跨图搬迁 `看今日／昨日运动`（#162 串行＋抢 `gate.lock`＋广播），由编排者协调。
2. 树干净后手跟 parity（help-center-106 场景数 367→368、routing-81 登记 DATA_DEPENDENT_FAILURES、t81-exec-smoke 快照），需先与 #335／#376 等在途票串行。
3. 不要 close／comment／edit issue（本审查未动票面）。
