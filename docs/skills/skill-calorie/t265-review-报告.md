# t265 独立对抗审查报告（干净树复跑，不采信实施结论）

结论：**PASS，91/100，无 S1 致命项**。7 条词归位功能成立，18 绿成立，6 红归别域。
证据瑕疵扣 9 分（见 D4），均不推翻功能结论。

## 方法（持锁隔离）

- 被审提交 `8908144e` 系 HEAD（`db329e3`）祖先，merge-base 自证＝其自身，已推。
- 主仓脏树 30＋ 件（他席在途）会污染结论，故建干净 worktree
  `.scratch/t265-review/wt-8908144`（detached @8908144）独立复跑；
  全部运行经 `tooling/run-locked.mjs --ticket 265-review` 持锁，
  主仓 `gate-runs.log` 留 `ticket=265-review` 26 行（13 次运行）。
- 审查约束遵守：禁区 6 类只读未写；新文件仅
  `docs/skills/skill-calorie/t265-review-*` 三件（本报告＋探针＋运行导出）。

## 机器证据（干净树 @8908144，逐条持锁）

| 断言 | 复跑读数 | 判定 |
|---|---|---|
| 主测试 | `exercise-routes-265` tests 3/pass 3/fail 0（`main-test.log`） | 绿 3/3 |
| gen:check | exit 0，**键 117（写46＋读71）**，声明 117，未搬迁 0 | 绿（注1） |
| 构建链 | BUILD1=2 → gen=0 → BUILD2=0 → help:build=0（注2） | 最终绿 |
| 回归 18 | 342×5＋294×7＋295×6，tests 18/pass 18（`regress18.log`） | 绿 18/18 |
| routing-81（受跟踪位 `test/calorie-routing-81.test.mjs`） | tests 8/pass 2/fail 6（`routing81b.log`） | 6 红别域（注3） |
| 自设探针 `t265-review-probe.mjs` | GREEN 32/32，RED 变异 4/4 被咬，exit 0（`probe.log`） | 绿 |

注1：实施证据写“键 118（写46＋读72）”。干净树是 117——多出的 1 读键来自其
脏工作区他席声明。功能无碍，证据计数失真，D4 扣分。
注2： pristine 首 build 必红（`body/routes.ts` 2 处 compare 键＋`exercise/routes.ts`
35–37 `exercise-records` 键不在已提交 `keys.ts`）。三处全是 #265 未碰的行
（#342 先例“声明先行、快照统一重导”遗留的陈旧），#265 自身 7 行 0 报错；
`pnpm gen` 后全绿。可复现序列应为 `gen→build→help:build→gen:check`，
或接受首 build 红。实施证据“均 exit 0”未披露此点，D4 扣分。
注3：6 红＝D2①计数（含“他席在途约7条”）／D2③／D2④（首错 `#13 拍营养表记一餐`，
饮食域）／FX-81-5×2（product.import／exec 数）／A7（营养表×2）。受审测试文件
全文 0 处出现 7 词或 distribution/trend/recap；#265 未改记录总数（19→12＋7）
与键集（3 键早已存在），计数类断言不受其影响；D2④与冻结的逐字关系即主测
试第 3 条（已绿）。故 6 红与本票无关，`routing-81` 别域结论成立。

## 自设探针（红绿两行，禁区零写、内存变异）

- P1 复盘改回 1 条仍绿？→ `RED P1-recap-revert-1 :: 复盘 5/5 条改回旧键后断言变红`；
  真态 `GREEN P1-recap-true`。单条即红，非 5 条齐改才红。
- P2 order 打乱仍绿？→ `RED P2-order-swap :: 170/171 打乱被检出`；
  真态 `GREEN P2-order-true :: order＝167/170-175`（声明层实测，home 零残留）。
- P3 冻结少同步 1 条 D2④咬否？→ `RED P3-frozen-miss-1 :: 7/7 少同步即咬`；
  真态 `GREEN P3-frozen-true :: 7 条逐字一致`。
- P4 收窄／放宽样例→ `GREEN P4-narrow-true :: 窗口 12/12 仍指旧键、0 越界`；
  `RED P4-widen-1 :: 看最近30天运动改指trend即报警`（7 条外多 1 条就算放宽）。

## 提交范围（只本票）

`8908144` 共 6 件：changeset、证据 doc、exercise/routes.ts（＋7 行改指）、
home/routes.ts（－7 行）、scene-04-exercise.ts（7 条双字段同步）、新测试。
未碰：commands 键集、`routing.ts`、生成物、他票测试；home 余下 12 条、
`order` 值（167／170–175）逐字不动。判据先行红静态佐证：父 `c7a3518` 的
home 含 7 词旧键、冻结旧键 19 行→本票 12 行（差值恰 7）。

## GATE-RUN 一对一（`ticket=265` 48 行＝24 次）

映射上：终链 build→gen→build→help→gen:check→主测（05:26:00–19）与变异轮
（05:25:19–52）可辨；`test/calorie-routing-81.test.mjs` exit=1（05:27:14）
即 8 中 6 红。4 处异常：①判据先行红跑无锁痕（票面强制，日志无 START）；
②`pnpm gen` exit=1 共 3 次（05:24:15／05:24:31／05:25:49）证据未解释；
③`packages/skill-calorie/test/calorie-routing-81.test.mjs`（05:26:22 联测
exit=0 的首参、05:27:04 单跑 exit=1）**不在提交树内**（该路径从未入仓，
现已消失），联测 exit=0 与 36 秒后单跑 exit=1 矛盾且无说明；
④读数 118 取自脏树（见注1）。

## 五维打分（S1：功能错／冻错／回归谁 introduces；有一项或总分<85→FAIL）

- D1 功能正确 30→**30**：7 词各指其页（实跑题面＋eyebrow＋无总览），冻结逐字。
- D2 回归边界 25→**24**：18/18＋12 窗口词不动＋无残留；扣 1（6 红虽别域，
  提交树内 routing-81 仍红，边界风险未清零）。
- D3 测试有效 20→**18**：主测三断言实在；扣 2（未断言 `order` 不动，
  order 互换在其测试下仍绿，已由本审 P2 补位证明可检）。
- D4 证据对账 15→**9**：注1／注2／异常①②③④。
- D5 提交卫生 10→**10**：6 件全在票面路径，禁区干净。
合计 **91**，S1 空 → **PASS**。

## 缺陷归属

本票缺陷 0。pristine 首 build 红归前置陈旧（#342 快照先例＋body 他席，
非本票行）；6 红归别域（饮食／营养表／product／计数口径）；证据瑕疵归本票
（实施席），已扣分，不代改。

## 未做项

父态全量构建对比（证 6 红前置性）未跑——以“测试文件 0 涉＋计数不受影响＋
D2④首错定界饮食域”逻辑链替代，置信高但非机器级；禁区实改类变异（真改
order／真删冻结行）未做——以内存探针等价替代；changeset 未建（本审无产
品变更，建则污染发版注记）；worktree 复跑后移除，复现命令：
`git worktree add .scratch/t265-review/wt-8908144 8908144` 后持锁依次
`pnpm gen && pnpm build && pnpm help:build && pnpm gen:check`、
主测、18 绿（342／294／295）、`node --test test/calorie-routing-81.test.mjs`
（预期 6 红别域）、探针（本目录 `t265-review-probe.mjs` 加 dist 路径）。

路径：报告本文；脚本 `docs/skills/skill-calorie/t265-review-probe.mjs`；
运行导出 `docs/skills/skill-calorie/t265-review-运行导出.log`；
原始日志 `.scratch/t265-review/`（build1/gen1/build2/helpbuild/gencheck/
main-test/regress18/routing81b/probe*.log，未入仓）。
