# #92 台账 · 既有失败用例基线（test 级多重集）

> 判据来源：.scratch/t92/test-full.txt（#92 施工期全量测试输出）。本文件是**入仓的常驻判据**，供后续票判断「新增失败 = 0」时使用：只看**失败用例名多重集**（含次数），不看 suite 级名。
> 总失败次数：22；唯一名：19。

| 失败用例名 | 次数 |
|---|---|
| #48 envelope 契约：SKILL 直执行 calorie.help.center 回执 key/shape/data 全字段 | 1 |
| #50 envelope 契约：SKILL 直执行 bill.help.lookup 回执 key/shape/data 全字段（空库安全） | 1 |
| #50 envelope 契约：SKILL 直执行 chef.help.lookup 回执 key/shape/data 全字段（空库安全） | 1 |
| #50 envelope 契约：SKILL 直执行 home.help.lookup 回执 key/shape/data 全字段（空库安全） | 1 |
| #50 envelope 契约：SKILL 直执行 memo.search 回执 key/skill/shape/data 全字段（空库安全） | 1 |
| #50 envelope 契约：SKILL 直执行 schedule.help.lookup 回执 key/shape/data 全字段（空库安全） | 1 |
| #50 envelope 契约：面板路 readViaCli 同键打通不返空 | 4 |
| dsh-bill-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归） | 1 |
| dsh-bill-ilife client：factory 可物化，导出 apply/inject，无 node 依赖 | 1 |
| dsh-bill-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像） | 1 |
| dsh-chef client：classic 执行并注册自身 id（#48 整批 crash 回归） | 1 |
| dsh-chef client：factory 可物化，导出 apply/inject，无 node 依赖 | 1 |
| dsh-chef client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像） | 1 |
| dsh-home-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归） | 1 |
| dsh-home-ilife client：factory 可物化，导出 apply/inject，无 node 依赖 | 1 |
| dsh-home-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像） | 1 |
| dsh-schedule-ilife client：classic 执行并注册自身 id（#48 整批 crash 回归） | 1 |
| dsh-schedule-ilife client：factory 可物化，导出 apply/inject，无 node 依赖 | 1 |
| dsh-schedule-ilife client：产物无 ESM 语法、无 node: 导入（build 期纯度门镜像） | 1 |

## 归因（见 docs/research/t92-verify-v2-gates.md）

- A 组：Windows 全量并行下 CLI spawn 抖动（单跑 46/46 绿，不可复现）。
- B 组：plugin-{bill,chef,home,schedule}-ilife 缺 uild:client: tsdown（产物无 loader 注册头，单跑可复现）→ 归 #57–#60／打通图 #64。
