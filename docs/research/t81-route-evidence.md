# #81 逐条路由证据（可复现快照）

> 本文件由 `docs/research/t81-route-evidence.mjs` 生成（只读脚本：读路由层 ＋ 实跑 CLI 取 exit）：
> `pnpm build && node docs/research/t81-route-evidence.mjs --out docs/research/t81-route-evidence.md`
> （脚本读 `packages/skill-calorie/dist`，故先 build）；复跑后 `git diff` 应为空（输出确定，无时间戳）。
> 实跑用 `docs/research/t81-seed.mjs` 的**标准种子库**（与 `t81-exec-smoke.mjs` 同一份定义）。

口径：唤醒词表 `packages/skill-calorie/src/triggers/scene-*.ts` 为冻结 SoT（parity 证据，本票零改动）；
路由层 `packages/skill-calorie/src/triggers/routing.ts` 承载本票全部新能力。
`exec` 判据（FX-81-7 总架构师裁定）：**一个旧唤醒词，只要存在一条能达成其所述能力的单命令
（同 key ＋ 参数，实跑 `exit 0`），就必须进 `exec` 桶**；唯一例外是语义上必须多步交互的 wizard 词。

## 0. 计数汇总

| 指标 | 值 |
|---|---|
| SoT 唤醒词条数 | 436 |
| 可执行桶（kind exec） | 326 |
| 命中但不执行桶（kind non-exec） | 110 |
| ├ 明确不做（bucket out-of-scope） | 10 |
| └ 旧链未承接（bucket legacy-chain；含 wizard 5 条） | 100 |
| 新拟入口（34 键） | 34 |
| 覆盖修复入口（FX-81-5 降级词失唯一入口的键） | 1 |
| exec 桶记录总数（SoT 326 ＋ 新拟 34 ＋ 修复 1） | 361 |
| 有可执行入口的键 | 77 / 77 |

**判据（FX-81-5 不变量）**：`kind: 'exec'` 的每一条，在「标准种子库 ＋ 真实路径替换」下实跑必须 `exit 0`。
实跑证据＝`docs/research/t81-exec-smoke.md`（可复跑脚本 `docs/research/t81-exec-smoke.mjs`：spawn 真 CLI、逐条报 exit code）。
跑不通的记录已在 non-exec 桶并写明理由（wizard 见 §2.2，其余逐条见 §2.3）。

## 1. S-1 436 条逐条恰一个桶

| # | 场景 | 唤醒词 | 桶 | 键／桶细分 | 理由码 |
|---|---|---|---|---|---|
| 0 | 01 | 看今日主页 | 可执行 | `calorie.view.home` | — |
| 1 | 01 | 看今日饮食概览 | 可执行 | `calorie.view.diet` | — |
| 2 | 01 | 看今日运动概览 | 可执行 | `calorie.view.exercise` | — |
| 3 | 01 | 看今日体重概览 | 可执行 | `calorie.view.weight` | — |
| 4 | 01 | 看今日目标进度 | 可执行 | `calorie.view.goal-progress` | — |
| 5 | 01 | 看本周主页 | 可执行 | `calorie.view.home` | — |
| 6 | 01 | 看本月主页 | 可执行 | `calorie.view.home` | — |
| 7 | 01 | 看连续记录天数 | 可执行 | `calorie.view.home` | — |
| 8 | 01 | 看今日热量预算 | 可执行 | `calorie.view.home` | — |
| 9 | 02 | 记一餐 | 可执行 | `calorie.diet.add` | — |
| 10 | 02 | 记一餐（含备注） | 可执行 | `calorie.diet.add` | — |
| 11 | 02 | 补记饮食 | 可执行 | `calorie.diet.add` | — |
| 12 | 02 | 批量补记饮食 | 可执行 | `calorie.diet.batch` | — |
| 13 | 02 | 拍营养表记一餐 | 命中但不执行 | out-of-scope | oosLabel |
| 14 | 02 | 拍营养表补记一餐 | 命中但不执行 | out-of-scope | oosLabel |
| 15 | 02 | 记喝水 | 可执行 | `calorie.water.log` | — |
| 16 | 02 | 复制昨日饮食 | 可执行 | `calorie.diet.copy` | — |
| 17 | 02 | 改饮食记录 | 可执行 | `calorie.diet.update` | — |
| 18 | 02 | 改某日饮食 | 可执行 | `calorie.diet.update-by-date` | — |
| 19 | 02 | 删饮食记录 | 可执行 | `calorie.diet.remove` | — |
| 20 | 02 | 删一餐 | 可执行 | `calorie.diet.remove-by-type` | — |
| 21 | 02 | 删某日饮食 | 可执行 | `calorie.diet.remove-by-date` | — |
| 22 | 02 | 批量删饮食 | 可执行 | `calorie.diet.remove-by-range` | — |
| 23 | 02 | 看今日饮食 | 可执行 | `calorie.today` | — |
| 24 | 02 | 看昨日饮食 | 可执行 | `calorie.view.diet` | — |
| 25 | 02 | 看本周饮食 | 可执行 | `calorie.view.diet` | — |
| 26 | 02 | 看上周饮食 | 可执行 | `calorie.view.diet` | — |
| 27 | 02 | 看本月饮食 | 可执行 | `calorie.view.diet` | — |
| 28 | 02 | 看上月饮食 | 可执行 | `calorie.view.diet` | — |
| 29 | 02 | 看最近 7 天饮食 | 可执行 | `calorie.view.diet` | — |
| 30 | 02 | 看最近 30 天饮食 | 可执行 | `calorie.view.diet` | — |
| 31 | 02 | 看某段时间饮食 | 可执行 | `calorie.view.diet` | — |
| 32 | 02 | 看今日喝水 | 可执行 | `calorie.view.home` | — |
| 33 | 02 | 看有备注的饮食记录 | 命中但不执行 | legacy-chain | noNoteFilter |
| 34 | 02 | 查食品 | 可执行 | `calorie.view.search` | — |
| 35 | 02 | 查食品（按分类） | 可执行 | `calorie.view.library` | — |
| 36 | 02 | 存食品 | 可执行 | `calorie.product.add` | — |
| 37 | 02 | 改食品 | 可执行 | `calorie.product.update` | — |
| 38 | 02 | 下架食品 | 可执行 | `calorie.product.deprecate` | — |
| 39 | 02 | 看食品库（去重） | 可执行 | `calorie.view.dedupe` | — |
| 40 | 02 | 批量导入食品 | 命中但不执行 | legacy-chain | wizard |
| 41 | 02 | 校验批量导入 | 命中但不执行 | legacy-chain | wizard |
| 42 | 02 | 看食品来源统计 | 可执行 | `calorie.view.library` | — |
| 43 | 02 | 看营养结构 | 可执行 | `calorie.view.diet-review` | — |
| 44 | 02 | 看今日营养 | 可执行 | `calorie.view.diet-review` | — |
| 45 | 02 | 看饮食总览 | 可执行 | `calorie.view.diet` | — |
| 46 | 02 | 看营养素深度 | 命中但不执行 | legacy-chain | noNutrientDetail |
| 47 | 02 | 看高热量榜 | 可执行 | `calorie.view.ranking` | — |
| 48 | 02 | 看低热量榜 | 可执行 | `calorie.view.ranking` | — |
| 49 | 02 | 看频繁吃榜 | 可执行 | `calorie.view.ranking` | — |
| 50 | 02 | 看高碳水榜 | 可执行 | `calorie.view.ranking` | — |
| 51 | 02 | 看高蛋白榜 | 可执行 | `calorie.view.ranking` | — |
| 52 | 02 | 看全部排行榜 | 可执行 | `calorie.view.ranking` | — |
| 53 | 02 | 看高热量榜（最近 30 天） | 可执行 | `calorie.view.ranking` | — |
| 54 | 02 | 看高热量榜（本月） | 可执行 | `calorie.view.ranking` | — |
| 55 | 02 | 看高热量榜（自定义） | 可执行 | `calorie.view.ranking` | — |
| 56 | 02 | 看低热量榜（最近 30 天） | 可执行 | `calorie.view.ranking` | — |
| 57 | 02 | 看低热量榜（本月） | 可执行 | `calorie.view.ranking` | — |
| 58 | 02 | 看低热量榜（自定义） | 可执行 | `calorie.view.ranking` | — |
| 59 | 02 | 看频繁吃榜（最近 30 天） | 可执行 | `calorie.view.ranking` | — |
| 60 | 02 | 看频繁吃榜（本月） | 可执行 | `calorie.view.ranking` | — |
| 61 | 02 | 看频繁吃榜（自定义） | 可执行 | `calorie.view.ranking` | — |
| 62 | 02 | 看高碳水榜（最近 30 天） | 可执行 | `calorie.view.ranking` | — |
| 63 | 02 | 看高碳水榜（本月） | 可执行 | `calorie.view.ranking` | — |
| 64 | 02 | 看高碳水榜（自定义） | 可执行 | `calorie.view.ranking` | — |
| 65 | 02 | 看高蛋白榜（最近 30 天） | 可执行 | `calorie.view.ranking` | — |
| 66 | 02 | 看高蛋白榜（本月） | 可执行 | `calorie.view.ranking` | — |
| 67 | 02 | 看高蛋白榜（自定义） | 可执行 | `calorie.view.ranking` | — |
| 68 | 02 | 饮食复盘（本周） | 可执行 | `calorie.view.diet-review` | — |
| 69 | 02 | 饮食复盘（本月） | 可执行 | `calorie.view.diet-review` | — |
| 70 | 02 | 饮食复盘（最近 90 天） | 可执行 | `calorie.view.diet-review` | — |
| 71 | 02 | 饮食复盘（今年） | 可执行 | `calorie.view.diet-review` | — |
| 72 | 02 | 饮食复盘（自定义时间） | 可执行 | `calorie.view.diet-review` | — |
| 73 | 02 | 看早餐（最近 7 天） | 可执行 | `calorie.view.diet` | — |
| 74 | 02 | 看午餐（最近 7 天） | 可执行 | `calorie.view.diet` | — |
| 75 | 02 | 看晚餐（最近 7 天） | 可执行 | `calorie.view.diet` | — |
| 76 | 02 | 看加餐（最近 7 天） | 可执行 | `calorie.view.diet` | — |
| 77 | 02 | 看全部餐别分布（最近 7 天） | 可执行 | `calorie.view.diet` | — |
| 78 | 02 | 看「有备注」的饮食记录 | 命中但不执行 | legacy-chain | noNoteFilter |
| 79 | 03 | 记体重 | 可执行 | `calorie.weight.log` | — |
| 80 | 03 | 记体重（含备注） | 可执行 | `calorie.weight.log` | — |
| 81 | 03 | 补录体重 | 可执行 | `calorie.weight.log` | — |
| 82 | 03 | 批量补录体重 | 可执行 | `calorie.weight.batch` | — |
| 83 | 03 | 看今日体重 | 可执行 | `calorie.view.weight` | — |
| 84 | 03 | 改体重记录 | 可执行 | `calorie.weight.update` | — |
| 85 | 03 | 改某日体重 | 可执行 | `calorie.weight.update` | — |
| 86 | 03 | 删体重记录 | 可执行 | `calorie.weight.remove` | — |
| 87 | 03 | 删某日体重 | 可执行 | `calorie.weight.remove` | — |
| 88 | 03 | 批量删体重 | 可执行 | `calorie.weight.remove` | — |
| 89 | 03 | 看本周体重 | 可执行 | `calorie.view.weight-history` | — |
| 90 | 03 | 看上周体重 | 可执行 | `calorie.view.weight-history` | — |
| 91 | 03 | 看本月体重 | 可执行 | `calorie.view.weight-history` | — |
| 92 | 03 | 看上月体重 | 可执行 | `calorie.view.weight-history` | — |
| 93 | 03 | 看最近 7 天体重 | 可执行 | `calorie.view.weight-history` | — |
| 94 | 03 | 看最近 90 天体重 | 可执行 | `calorie.view.weight-history` | — |
| 95 | 03 | 看某段时间体重 | 可执行 | `calorie.view.weight-history` | — |
| 96 | 03 | 看体重曲线 | 可执行 | `calorie.view.weight-history` | — |
| 97 | 03 | 看体重曲线（带目标） | 命中但不执行 | legacy-chain | compoundCurve |
| 98 | 03 | 看体重曲线（带里程碑） | 命中但不执行 | legacy-chain | compoundCurve |
| 99 | 03 | 看体重曲线（带异常点） | 命中但不执行 | legacy-chain | compoundCurve |
| 100 | 03 | 看本月体重曲线 | 可执行 | `calorie.view.weight-history` | — |
| 101 | 03 | 看上月体重曲线 | 可执行 | `calorie.view.weight-history` | — |
| 102 | 03 | 看最近 90 天体重曲线 | 可执行 | `calorie.view.weight-history` | — |
| 103 | 03 | 看最近 180 天体重曲线 | 可执行 | `calorie.view.weight-history` | — |
| 104 | 03 | 看最近 365 天体重曲线 | 可执行 | `calorie.view.weight-history` | — |
| 105 | 03 | 看某段时间体重曲线 | 可执行 | `calorie.view.weight-history` | — |
| 106 | 03 | 看体重稳不稳（增强版） | 可执行 | `calorie.view.volatility` | — |
| 107 | 03 | 看本月波动 | 可执行 | `calorie.view.volatility` | — |
| 108 | 03 | 看最近 90 天波动 | 可执行 | `calorie.view.volatility` | — |
| 109 | 03 | 看最近 180 天波动 | 可执行 | `calorie.view.volatility` | — |
| 110 | 03 | 看波动异常点 | 可执行 | `calorie.view.volatility` | — |
| 111 | 03 | 看「有备注」的体重记录 | 命中但不执行 | legacy-chain | noNoteFilter |
| 112 | 03 | 对比体重：最近 30 天 vs 之前 30 天 | 可执行 | `calorie.view.weight-compare` | — |
| 113 | 03 | 对比体重：自定义两段时间 | 可执行 | `calorie.view.weight-compare` | — |
| 114 | 03 | 对比体重：本周 vs 上周 | 可执行 | `calorie.view.weight-compare` | — |
| 115 | 03 | 对比体重：本月 vs 上月 | 可执行 | `calorie.view.weight-compare` | — |
| 116 | 03 | 对比体重：近 N 天 vs 上一个 N 天 | 可执行 | `calorie.view.weight-compare` | — |
| 117 | 03 | 对比体重：今天 vs 一年前今天 | 可执行 | `calorie.view.weight-compare` | — |
| 118 | 03 | 对比体重：今天 vs 半年前今天 | 可执行 | `calorie.view.weight-compare` | — |
| 119 | 03 | 对比体重：今天 vs 三月前今天 | 可执行 | `calorie.view.weight-compare` | — |
| 120 | 03 | 对比体重：当前 vs 目标体重 | 可执行 | `calorie.view.goal-weight` | — |
| 121 | 03 | 对比体重：当前 vs 平台期首日 | 命中但不执行 | legacy-chain | anchorCompare |
| 122 | 03 | 对比体重：当前 vs 历史最低 | 命中但不执行 | legacy-chain | anchorCompare |
| 123 | 03 | 对比体重：当前 vs 历史最高 | 命中但不执行 | legacy-chain | anchorCompare |
| 124 | 03 | 对比体重：减重 5kg 那天 vs 今天 | 命中但不执行 | legacy-chain | anchorCompare |
| 125 | 03 | 对比体重：减重 10kg 那天 vs 今天 | 命中但不执行 | legacy-chain | anchorCompare |
| 126 | 03 | 对比体重：当前 vs 入夏最低 | 命中但不执行 | legacy-chain | anchorCompare |
| 127 | 03 | 对比体重：当前 vs 入冬最低 | 命中但不执行 | legacy-chain | anchorCompare |
| 128 | 03 | 对比体重：运动多 vs 运动少的两个月 | 命中但不执行 | legacy-chain | anchorCompare |
| 129 | 03 | 对比体重：工作日 vs 周末 | 可执行 | `calorie.view.weight-compare` | — |
| 130 | 03 | 看体重总览 | 可执行 | `calorie.view.weight` | — |
| 131 | 03 | 体重复盘（本周） | 命中但不执行 | legacy-chain | reviewWindowOnly |
| 132 | 03 | 体重复盘（本月） | 命中但不执行 | legacy-chain | reviewWindowOnly |
| 133 | 03 | 体重复盘（最近 90 天） | 命中但不执行 | legacy-chain | reviewWindowOnly |
| 134 | 03 | 体重复盘（今年） | 命中但不执行 | legacy-chain | reviewWindowOnly |
| 135 | 03 | 体重复盘（自定义时间） | 命中但不执行 | legacy-chain | reviewWindowOnly |
| 136 | 03 | 看里程碑回溯 | 命中但不执行 | legacy-chain | milestoneForwardOnly |
| 137 | 04 | 记运动 | 可执行 | `calorie.exercise.add` | — |
| 138 | 04 | 记运动（含备注） | 可执行 | `calorie.exercise.add` | — |
| 139 | 04 | 记力量训练 | 可执行 | `calorie.exercise.add` | — |
| 140 | 04 | 记有氧运动 | 可执行 | `calorie.exercise.add` | — |
| 141 | 04 | 记日常活动 | 可执行 | `calorie.exercise.add` | — |
| 142 | 04 | 补记运动 | 可执行 | `calorie.exercise.add` | — |
| 143 | 04 | 批量补记运动 | 可执行 | `calorie.exercise.add` | — |
| 144 | 04 | 复制昨日运动 | 可执行 | `calorie.exercise.add` | — |
| 145 | 04 | 改运动记录 | 可执行 | `calorie.exercise.update` | — |
| 146 | 04 | 改某日运动 | 可执行 | `calorie.exercise.update` | — |
| 147 | 04 | 删运动记录 | 可执行 | `calorie.exercise.remove` | — |
| 148 | 04 | 删某日运动 | 可执行 | `calorie.exercise.remove` | — |
| 149 | 04 | 批量删运动 | 可执行 | `calorie.exercise.remove` | — |
| 150 | 04 | 看今日运动 | 可执行 | `calorie.view.exercise` | — |
| 151 | 04 | 看昨日运动 | 可执行 | `calorie.view.exercise` | — |
| 152 | 04 | 看本周运动 | 可执行 | `calorie.view.exercise` | — |
| 153 | 04 | 看上周运动 | 可执行 | `calorie.view.exercise` | — |
| 154 | 04 | 看本月运动 | 可执行 | `calorie.view.exercise` | — |
| 155 | 04 | 看上月运动 | 可执行 | `calorie.view.exercise` | — |
| 156 | 04 | 看最近 7 天运动 | 可执行 | `calorie.view.exercise` | — |
| 157 | 04 | 看最近 30 天运动 | 可执行 | `calorie.view.exercise` | — |
| 158 | 04 | 看某段时间运动 | 可执行 | `calorie.view.exercise` | — |
| 159 | 04 | 看今日运动（vs 目标） | 可执行 | `calorie.view.exercise-goal` | — |
| 160 | 04 | 看本周运动（vs 目标） | 可执行 | `calorie.view.exercise-goal` | — |
| 161 | 04 | 看运动记录（有备注） | 命中但不执行 | legacy-chain | noNoteFilter |
| 162 | 04 | 看运动记录（按力量筛选） | 命中但不执行 | legacy-chain | recordFilterMissing |
| 163 | 04 | 看运动记录（按有氧筛选） | 命中但不执行 | legacy-chain | recordFilterMissing |
| 164 | 04 | 看最近 60 天运动 | 可执行 | `calorie.view.exercise` | — |
| 165 | 04 | 看最近 180 天运动 | 可执行 | `calorie.view.exercise` | — |
| 166 | 04 | 看最近 365 天运动 | 可执行 | `calorie.view.exercise` | — |
| 167 | 04 | 看运动类型分布 | 可执行 | `calorie.view.exercise` | — |
| 168 | 04 | 看力量训练总览 | 命中但不执行 | legacy-chain | categoryOverviewMissing |
| 169 | 04 | 看有氧训练总览 | 命中但不执行 | legacy-chain | categoryOverviewMissing |
| 170 | 04 | 看运动趋势 | 可执行 | `calorie.view.exercise` | — |
| 171 | 04 | 运动复盘（本周） | 可执行 | `calorie.view.exercise` | — |
| 172 | 04 | 运动复盘（本月） | 可执行 | `calorie.view.exercise` | — |
| 173 | 04 | 运动复盘（最近 90 天） | 可执行 | `calorie.view.exercise` | — |
| 174 | 04 | 运动复盘（今年） | 可执行 | `calorie.view.exercise` | — |
| 175 | 04 | 运动复盘（自定义时间） | 可执行 | `calorie.view.exercise` | — |
| 176 | 05 | 看本周计划 | 命中但不执行 | legacy-chain | planFilterMissing |
| 177 | 05 | 看下周计划 | 命中但不执行 | legacy-chain | planFilterMissing |
| 178 | 05 | 看上周计划 | 命中但不执行 | legacy-chain | planFilterMissing |
| 179 | 05 | 看指定周计划 | 命中但不执行 | legacy-chain | planFilterMissing |
| 180 | 05 | 看今天练什么 | 命中但不执行 | legacy-chain | planFilterMissing |
| 181 | 05 | 看某动作安排 | 命中但不执行 | legacy-chain | planFilterMissing |
| 182 | 05 | 看某天练什么 | 命中但不执行 | legacy-chain | planFilterMissing |
| 183 | 05 | 看计划概览 | 可执行 | `calorie.view.plan` | — |
| 184 | 05 | 看完整计划 | 可执行 | `calorie.view.plan` | — |
| 185 | 05 | 看计划 vs 实际 | 命中但不执行 | legacy-chain | planFilterMissing |
| 186 | 05 | 定训练计划 | 命中但不执行 | legacy-chain | planWriteMissing |
| 187 | 05 | 复制训练计划 | 命中但不执行 | legacy-chain | planWriteMissing |
| 188 | 05 | 定休息日 | 命中但不执行 | legacy-chain | planWriteMissing |
| 189 | 05 | 加训练动作 | 命中但不执行 | legacy-chain | planWriteMissing |
| 190 | 05 | 定一周计划 | 命中但不执行 | legacy-chain | planWriteMissing |
| 191 | 05 | 改训练计划 | 命中但不执行 | legacy-chain | planWriteMissing |
| 192 | 05 | 改某天训练 | 命中但不执行 | legacy-chain | planWriteMissing |
| 193 | 05 | 删某天训练 | 命中但不执行 | legacy-chain | planWriteMissing |
| 194 | 05 | 改动作 | 命中但不执行 | legacy-chain | planWriteMissing |
| 195 | 05 | 撤销训练计划 | 命中但不执行 | legacy-chain | planWriteMissing |
| 196 | 05 | 落地训练 | 命中但不执行 | out-of-scope | oosLanding |
| 197 | 05 | 落地到本周末 | 命中但不执行 | out-of-scope | oosLanding |
| 198 | 05 | 落地到本月底 | 命中但不执行 | out-of-scope | oosLanding |
| 199 | 05 | 同步到训记 | 命中但不执行 | out-of-scope | oosXunji |
| 200 | 05 | 拉训记实绩 | 命中但不执行 | out-of-scope | oosXunji |
| 201 | 05 | 计划复盘（本周） | 命中但不执行 | legacy-chain | planReviewMissing |
| 202 | 05 | 计划复盘（本月） | 命中但不执行 | legacy-chain | planReviewMissing |
| 203 | 05 | 计划复盘（全部） | 命中但不执行 | legacy-chain | planReviewMissing |
| 204 | 05 | 看计划完成率 | 命中但不执行 | legacy-chain | planReviewMissing |
| 205 | 05 | 看未完成训练 | 命中但不执行 | legacy-chain | planReviewMissing |
| 206 | 05 | 看动作完成率 | 命中但不执行 | legacy-chain | planReviewMissing |
| 207 | 05 | 扫禁忌 | 可执行 | `calorie.view.contraindication` | — |
| 208 | 06 | 定营养目标 | 可执行 | `calorie.goal.set` | — |
| 209 | 06 | 定营养目标(自动算) | 命中但不执行 | legacy-chain | wizard |
| 210 | 06 | 定体重目标 | 可执行 | `calorie.goal.weight` | — |
| 211 | 06 | 定体重目标(自动算截止) | 可执行 | `calorie.goal.weight` | — |
| 212 | 06 | 定体重目标(含起始日) | 可执行 | `calorie.goal.weight` | — |
| 213 | 06 | 定饮水目标 | 可执行 | `calorie.goal.water` | — |
| 214 | 06 | 定饮水目标(自动算) | 命中但不执行 | legacy-chain | wizard |
| 215 | 06 | 一键定全套目标 | 命中但不执行 | legacy-chain | wizard |
| 216 | 06 | 看今日目标 | 可执行 | `calorie.view.goal-progress` | — |
| 217 | 06 | 看本周目标 | 可执行 | `calorie.view.goal-progress` | — |
| 218 | 06 | 看营养目标进度 | 可执行 | `calorie.view.goal-progress` | — |
| 219 | 06 | 看体重目标进度 | 可执行 | `calorie.view.goal-weight` | — |
| 220 | 06 | 看饮水目标进度 | 可执行 | `calorie.view.goal-progress` | — |
| 221 | 06 | 看目标对比实际 | 可执行 | `calorie.view.goal-vs-actual` | — |
| 222 | 06 | 看目标完成度 | 可执行 | `calorie.view.goal` | — |
| 223 | 06 | 看即将到期的目标 | 可执行 | `calorie.view.goal-expiring` | — |
| 224 | 06 | 看目标完成率(按周) | 可执行 | `calorie.view.goal-progress` | — |
| 225 | 06 | 看目标完成率(按月) | 可执行 | `calorie.view.goal-progress` | — |
| 226 | 06 | 改营养目标 | 可执行 | `calorie.goal.set` | — |
| 227 | 06 | 改体重目标 | 可执行 | `calorie.goal.weight` | — |
| 228 | 06 | 改饮水目标 | 可执行 | `calorie.goal.water` | — |
| 229 | 06 | 暂停所有目标 | 可执行 | `calorie.goal.pause` | — |
| 230 | 06 | 重启所有目标 | 可执行 | `calorie.goal.resume` | — |
| 231 | 06 | 看目标历史完成 | 可执行 | `calorie.view.goal` | — |
| 232 | 06 | 看目标预测达成 | 可执行 | `calorie.view.goal-predict` | — |
| 233 | 07 | 设置档案 | 可执行 | `calorie.profile.set` | — |
| 234 | 07 | 设活动量 | 可执行 | `calorie.profile.activity` | — |
| 235 | 07 | 改档案 | 可执行 | `calorie.profile.update` | — |
| 236 | 07 | 查档案 | 可执行 | `calorie.view.profile` | — |
| 237 | 08 | 记体脂（皮褶钳） | 可执行 | `calorie.body.composition-add` | — |
| 238 | 08 | 记体脂（外部测量） | 可执行 | `calorie.body.composition-add` | — |
| 239 | 08 | 记围度 | 可执行 | `calorie.body.measure-add` | — |
| 240 | 08 | 补记体脂 | 可执行 | `calorie.body.composition-add` | — |
| 241 | 08 | 补记围度 | 可执行 | `calorie.body.measure-add` | — |
| 242 | 08 | 看体脂 | 可执行 | `calorie.view.body-composition` | — |
| 243 | 08 | 看体脂趋势 | 可执行 | `calorie.view.body-composition` | — |
| 244 | 08 | 看围度 | 可执行 | `calorie.view.body-measure` | — |
| 245 | 08 | 看围度趋势 | 可执行 | `calorie.view.body-measure` | — |
| 246 | 08 | 对比体脂 | 命中但不执行 | legacy-chain | bodyCompareMissing |
| 247 | 08 | 对比围度 | 命中但不执行 | legacy-chain | bodyCompareMissing |
| 248 | 08 | 删体脂 | 可执行 | `calorie.body.composition-remove` | — |
| 249 | 08 | 删围度 | 可执行 | `calorie.body.measure-remove` | — |
| 250 | 09 | 记身材照 | 可执行 | `calorie.photo.add` | — |
| 251 | 09 | 记身材照 | 可执行 | `calorie.photo.add` | — |
| 252 | 09 | 记身材照 | 可执行 | `calorie.photo.add` | — |
| 253 | 09 | 查身材照 | 可执行 | `calorie.photo.list` | — |
| 254 | 09 | 对比两张照片 | 可执行 | `calorie.photo.compare` | — |
| 255 | 09 | 生成身材照GIF | 可执行 | `calorie.photo.gif` | — |
| 256 | 09 | 删身材照 | 可执行 | `calorie.photo.remove` | — |
| 257 | 09 | 改照片标签 | 可执行 | `calorie.photo.tag` | — |
| 258 | 09 | 加照片标签 | 可执行 | `calorie.photo.tag` | — |
| 259 | 09 | 删照片标签 | 可执行 | `calorie.photo.tag` | — |
| 260 | 10 | 看体重 vs 摄入(最近 7 天) | 可执行 | `calorie.view.combined` | — |
| 261 | 10 | 看体重 vs 摄入(最近 15 天) | 可执行 | `calorie.view.combined` | — |
| 262 | 10 | 看体重 vs 摄入(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 263 | 10 | 看体重 vs 摄入(最近 60 天) | 可执行 | `calorie.view.combined` | — |
| 264 | 10 | 看体重 vs 摄入(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 265 | 10 | 看体重 vs 摄入(最近 180 天) | 可执行 | `calorie.view.combined` | — |
| 266 | 10 | 看体重 vs 摄入(最近 365 天) | 可执行 | `calorie.view.combined` | — |
| 267 | 10 | 看体重 vs 摄入(本周) | 可执行 | `calorie.view.combined` | — |
| 268 | 10 | 看体重 vs 摄入(本月) | 可执行 | `calorie.view.combined` | — |
| 269 | 10 | 看体重 vs 摄入(自定义) | 可执行 | `calorie.view.combined` | — |
| 270 | 10 | 看体重 vs 运动(最近 7 天) | 可执行 | `calorie.view.combined` | — |
| 271 | 10 | 看体重 vs 运动(最近 15 天) | 可执行 | `calorie.view.combined` | — |
| 272 | 10 | 看体重 vs 运动(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 273 | 10 | 看体重 vs 运动(最近 60 天) | 可执行 | `calorie.view.combined` | — |
| 274 | 10 | 看体重 vs 运动(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 275 | 10 | 看体重 vs 运动(最近 180 天) | 可执行 | `calorie.view.combined` | — |
| 276 | 10 | 看体重 vs 运动(最近 365 天) | 可执行 | `calorie.view.combined` | — |
| 277 | 10 | 看体重 vs 运动(本周) | 可执行 | `calorie.view.combined` | — |
| 278 | 10 | 看体重 vs 运动(本月) | 可执行 | `calorie.view.combined` | — |
| 279 | 10 | 看体重 vs 运动(自定义) | 可执行 | `calorie.view.combined` | — |
| 280 | 10 | 看体重 vs 蛋白(最近 7 天) | 可执行 | `calorie.view.combined` | — |
| 281 | 10 | 看体重 vs 蛋白(最近 15 天) | 可执行 | `calorie.view.combined` | — |
| 282 | 10 | 看体重 vs 蛋白(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 283 | 10 | 看体重 vs 蛋白(最近 60 天) | 可执行 | `calorie.view.combined` | — |
| 284 | 10 | 看体重 vs 蛋白(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 285 | 10 | 看体重 vs 蛋白(最近 180 天) | 可执行 | `calorie.view.combined` | — |
| 286 | 10 | 看体重 vs 蛋白(最近 365 天) | 可执行 | `calorie.view.combined` | — |
| 287 | 10 | 看体重 vs 蛋白(本周) | 可执行 | `calorie.view.combined` | — |
| 288 | 10 | 看体重 vs 蛋白(本月) | 可执行 | `calorie.view.combined` | — |
| 289 | 10 | 看体重 vs 蛋白(自定义) | 可执行 | `calorie.view.combined` | — |
| 290 | 10 | 看体重 vs 缺口(最近 7 天) | 可执行 | `calorie.view.combined` | — |
| 291 | 10 | 看体重 vs 缺口(最近 15 天) | 可执行 | `calorie.view.combined` | — |
| 292 | 10 | 看体重 vs 缺口(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 293 | 10 | 看体重 vs 缺口(最近 60 天) | 可执行 | `calorie.view.combined` | — |
| 294 | 10 | 看体重 vs 缺口(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 295 | 10 | 看体重 vs 缺口(最近 180 天) | 可执行 | `calorie.view.combined` | — |
| 296 | 10 | 看体重 vs 缺口(最近 365 天) | 可执行 | `calorie.view.combined` | — |
| 297 | 10 | 看体重 vs 缺口(本周) | 可执行 | `calorie.view.combined` | — |
| 298 | 10 | 看体重 vs 缺口(本月) | 可执行 | `calorie.view.combined` | — |
| 299 | 10 | 看体重 vs 缺口(自定义) | 可执行 | `calorie.view.combined` | — |
| 300 | 10 | 看摄入 vs 运动(最近 7 天) | 可执行 | `calorie.view.combined` | — |
| 301 | 10 | 看摄入 vs 运动(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 302 | 10 | 看摄入 vs 运动(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 303 | 10 | 看摄入 vs 运动(最近 180 天) | 可执行 | `calorie.view.combined` | — |
| 304 | 10 | 看摄入 vs 运动(最近 365 天) | 可执行 | `calorie.view.combined` | — |
| 305 | 10 | 看摄入 vs 运动(自定义) | 可执行 | `calorie.view.combined` | — |
| 306 | 10 | 看体重 vs 体脂(最近 7 天) | 可执行 | `calorie.view.combined` | — |
| 307 | 10 | 看体重 vs 体脂(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 308 | 10 | 看体重 vs 体脂(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 309 | 10 | 看体重 vs 体脂(最近 180 天) | 可执行 | `calorie.view.combined` | — |
| 310 | 10 | 看体重 vs 体脂(最近 365 天) | 可执行 | `calorie.view.combined` | — |
| 311 | 10 | 看体重 vs 体脂(自定义) | 可执行 | `calorie.view.combined` | — |
| 312 | 10 | 看体重 vs 围度(最近 7 天) | 可执行 | `calorie.view.combined` | — |
| 313 | 10 | 看体重 vs 围度(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 314 | 10 | 看体重 vs 围度(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 315 | 10 | 看体重 vs 围度(最近 180 天) | 可执行 | `calorie.view.combined` | — |
| 316 | 10 | 看体重 vs 围度(最近 365 天) | 可执行 | `calorie.view.combined` | — |
| 317 | 10 | 看体重 vs 围度(自定义) | 可执行 | `calorie.view.combined` | — |
| 318 | 10 | 看饮水 vs 体重(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 319 | 10 | 看饮水 vs 体重(自定义) | 可执行 | `calorie.view.combined` | — |
| 320 | 10 | 看健康报告(本周) | 可执行 | `calorie.view.health` | — |
| 321 | 10 | 看健康报告(上周) | 可执行 | `calorie.view.health` | — |
| 322 | 10 | 看健康报告(最近 7 天) | 可执行 | `calorie.view.health` | — |
| 323 | 10 | 看健康报告(最近 30 天) | 可执行 | `calorie.view.health` | — |
| 324 | 10 | 看健康报告(最近 90 天) | 可执行 | `calorie.view.health` | — |
| 325 | 10 | 看健康报告(最近 180 天) | 可执行 | `calorie.view.health` | — |
| 326 | 10 | 看健康报告(最近 365 天) | 可执行 | `calorie.view.health` | — |
| 327 | 10 | 看健康报告(本月) | 可执行 | `calorie.view.health` | — |
| 328 | 10 | 看健康报告(上月) | 可执行 | `calorie.view.health` | — |
| 329 | 10 | 看健康报告(今年) | 可执行 | `calorie.view.health` | — |
| 330 | 10 | 看健康报告(自定义) | 可执行 | `calorie.view.health` | — |
| 331 | 10 | 看BMI报告 | 命中但不执行 | legacy-chain | reportKindMissing |
| 332 | 10 | 看TDEE报告 | 命中但不执行 | legacy-chain | reportKindMissing |
| 333 | 10 | 看BMR报告 | 命中但不执行 | legacy-chain | reportKindMissing |
| 334 | 10 | 看蛋白质摄入报告 | 命中但不执行 | legacy-chain | reportKindMissing |
| 335 | 10 | 看水分摄入报告 | 命中但不执行 | legacy-chain | reportKindMissing |
| 336 | 10 | 看综合评分 | 命中但不执行 | legacy-chain | reportKindMissing |
| 337 | 10 | 看健康趋势 | 命中但不执行 | legacy-chain | reportKindMissing |
| 338 | 10 | 看健康报告(含对比) | 命中但不执行 | legacy-chain | reportKindMissing |
| 339 | 10 | 看整体趋势(体重+摄入+运动) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 340 | 10 | 看整体趋势(体重+体脂+围度) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 341 | 10 | 看整体趋势(饮食+蛋白+纤维) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 342 | 10 | 看整体趋势(运动+力量+有氧) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 343 | 10 | 看整体趋势(BMI+体脂+肌肉量) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 344 | 10 | 看整体趋势(摄入+蛋白+运动) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 345 | 10 | 看整体趋势(体重+蛋白+缺口) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 346 | 10 | 看整体趋势(体重+摄入+缺口) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 347 | 10 | 看整体趋势(体重+摄入+运动+缺口) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 348 | 10 | 看整体趋势(蛋白+运动) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 349 | 10 | 看整体趋势(综合多指标) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 350 | 10 | 看整体趋势(含月度对比) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 351 | 10 | 看整体趋势(含季度对比) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 352 | 10 | 看整体趋势(含年度对比) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 353 | 10 | 看整体趋势(含目标对比) | 命中但不执行 | legacy-chain | multiTrendMissing |
| 354 | 10 | 诊断体重波动原因 | 可执行 | `calorie.view.anomaly` | — |
| 355 | 10 | 诊断体重停滞(含平台期判断) | 可执行 | `calorie.view.anomaly` | — |
| 356 | 10 | 诊断体重反弹 | 可执行 | `calorie.view.anomaly` | — |
| 357 | 10 | 诊断体重下降原因 | 可执行 | `calorie.view.anomaly` | — |
| 358 | 10 | 诊断体重异常点 | 可执行 | `calorie.view.anomaly` | — |
| 359 | 10 | 诊断体重vs体脂围度背离 | 可执行 | `calorie.view.anomaly` | — |
| 360 | 10 | 诊断饮食超标 | 可执行 | `calorie.view.anomaly` | — |
| 361 | 10 | 诊断饮食不足 | 可执行 | `calorie.view.anomaly` | — |
| 362 | 10 | 诊断营养不均衡(含均衡判断) | 可执行 | `calorie.view.anomaly` | — |
| 363 | 10 | 诊断饮食结构问题 | 可执行 | `calorie.view.anomaly` | — |
| 364 | 10 | 诊断运动不足 | 可执行 | `calorie.view.anomaly` | — |
| 365 | 10 | 诊断运动过量 | 可执行 | `calorie.view.anomaly` | — |
| 366 | 10 | 诊断运动类型失衡 | 可执行 | `calorie.view.anomaly` | — |
| 367 | 10 | 诊断运动效率(含有效判断) | 可执行 | `calorie.view.anomaly` | — |
| 368 | 10 | 诊断运动建议(含类型推荐) | 可执行 | `calorie.view.anomaly` | — |
| 369 | 10 | 为什么我没瘦 | 可执行 | `calorie.view.anomaly` | — |
| 370 | 10 | 为什么我瘦太快 | 可执行 | `calorie.view.anomaly` | — |
| 371 | 10 | 我的减重速度合理吗 | 可执行 | `calorie.view.anomaly` | — |
| 372 | 10 | 我的减肥策略对吗 | 可执行 | `calorie.view.goal-progress` | — |
| 373 | 10 | 我距离目标还差什么 | 可执行 | `calorie.view.goal-weight` | — |
| 374 | 10 | 我这个月做得好的 | 可执行 | `calorie.view.anomaly` | — |
| 375 | 10 | 我这个月需要改的 | 可执行 | `calorie.view.anomaly` | — |
| 376 | 10 | 综合健康评估 | 可执行 | `calorie.view.anomaly` | — |
| 377 | 10 | 看蛋白 vs 碳水(最近 7 天) | 可执行 | `calorie.view.combined` | — |
| 378 | 10 | 看蛋白 vs 碳水(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 379 | 10 | 看蛋白 vs 碳水(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 380 | 10 | 看蛋白 vs 碳水(自定义) | 可执行 | `calorie.view.combined` | — |
| 381 | 10 | 看蛋白 vs 脂肪(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 382 | 10 | 看蛋白 vs 脂肪(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 383 | 10 | 看蛋白 vs 脂肪(自定义) | 可执行 | `calorie.view.combined` | — |
| 384 | 10 | 看碳水 vs 脂肪(最近 30 天) | 可执行 | `calorie.view.combined` | — |
| 385 | 10 | 看碳水 vs 脂肪(最近 90 天) | 可执行 | `calorie.view.combined` | — |
| 386 | 10 | 看碳水 vs 脂肪(自定义) | 可执行 | `calorie.view.combined` | — |
| 387 | 10 | 看钠糖纤维趋势 | 命中但不执行 | legacy-chain | noNutrientDetail |
| 388 | 10 | 看钠糖纤维综合 | 命中但不执行 | legacy-chain | noNutrientDetail |
| 389 | 10 | 看营养建议 | 命中但不执行 | legacy-chain | noNutritionAdvice |
| 390 | 10 | 看三大营养交叉(最近 30 天) | 可执行 | `calorie.view.diet-review` | — |
| 391 | 10 | 看三大营养交叉(最近 90 天) | 可执行 | `calorie.view.diet-review` | — |
| 392 | 10 | 看三大营养交叉(自定义) | 可执行 | `calorie.view.diet-review` | — |
| 393 | 10 | 预测体重(1 周后) | 可执行 | `calorie.view.predict` | — |
| 394 | 10 | 预测体重(1 月后) | 可执行 | `calorie.view.predict` | — |
| 395 | 10 | 预测体重(3 月后) | 可执行 | `calorie.view.predict` | — |
| 396 | 10 | 预测体重(6 月后) | 可执行 | `calorie.view.predict` | — |
| 397 | 10 | 预测体重(自定义时间) | 可执行 | `calorie.view.predict` | — |
| 398 | 10 | 预测体重(自定义目标) | 命中但不执行 | legacy-chain | predictParamMissing |
| 399 | 10 | 模拟减重(每天-300卡) | 命中但不执行 | legacy-chain | predictParamMissing |
| 400 | 10 | 模拟减重(每天-500卡) | 命中但不执行 | legacy-chain | predictParamMissing |
| 401 | 10 | 模拟减重(每天-700卡) | 命中但不执行 | legacy-chain | predictParamMissing |
| 402 | 10 | 模拟减重(30天减Xkg) | 命中但不执行 | legacy-chain | predictParamMissing |
| 403 | 10 | 模拟减重(60天减Xkg) | 命中但不执行 | legacy-chain | predictParamMissing |
| 404 | 10 | 模拟减重(90天减Xkg) | 命中但不执行 | legacy-chain | predictParamMissing |
| 405 | 10 | 模拟减重(自定义天数减Xkg) | 命中但不执行 | legacy-chain | predictParamMissing |
| 406 | 10 | 摄入预测(按当前速率 1 周) | 命中但不执行 | legacy-chain | predictParamMissing |
| 407 | 10 | 摄入预测(按当前速率 1 月) | 命中但不执行 | legacy-chain | predictParamMissing |
| 408 | 10 | 摄入预测(按当前速率 3 月) | 命中但不执行 | legacy-chain | predictParamMissing |
| 409 | 10 | 摄入预测(自定义) | 命中但不执行 | legacy-chain | predictParamMissing |
| 410 | 10 | 摄入预测(营养目标达成预测) | 命中但不执行 | legacy-chain | predictParamMissing |
| 411 | 10 | 摄入预测(卡路里缺口预测) | 命中但不执行 | legacy-chain | predictParamMissing |
| 412 | 10 | 摄入预测(摄入稳定性预测) | 命中但不执行 | legacy-chain | predictParamMissing |
| 413 | 10 | 看每日 6 因素综合 | 命中但不执行 | legacy-chain | sixFactorsMissing |
| 414 | 10 | 今日复盘 | 可执行 | `calorie.view.diet-review` | — |
| 415 | 10 | 关闭定时复盘 | 命中但不执行 | out-of-scope | oosCron |
| 416 | 10 | 复盘 | 可执行 | `calorie.view.diet-review` | — |
| 417 | 10 | 复盘日期范围 | 可执行 | `calorie.view.diet-review` | — |
| 418 | 10 | 开启定时复盘 | 命中但不执行 | out-of-scope | oosCron |
| 419 | 10 | 本周复盘 | 可执行 | `calorie.view.diet-review` | — |
| 420 | 10 | 本年复盘 | 可执行 | `calorie.view.diet-review` | — |
| 421 | 10 | 本月复盘 | 可执行 | `calorie.view.diet-review` | — |
| 422 | 10 | 查低热量榜 | 可执行 | `calorie.view.ranking` | — |
| 423 | 10 | 查健康报告 | 可执行 | `calorie.view.health` | — |
| 424 | 10 | 查卡路里数据 | 命中但不执行 | legacy-chain | lintMissing |
| 425 | 10 | 查定时复盘 | 命中但不执行 | out-of-scope | oosCron |
| 426 | 10 | 查热量缺口 | 可执行 | `calorie.view.deficit` | — |
| 427 | 10 | 查热量趋势 | 可执行 | `calorie.history` | — |
| 428 | 10 | 查营养结构 | 可执行 | `calorie.view.diet-review` | — |
| 429 | 10 | 查运动分布 | 可执行 | `calorie.view.exercise` | — |
| 430 | 10 | 查运动贡献 | 可执行 | `calorie.view.exercise` | — |
| 431 | 10 | 查频繁吃榜 | 可执行 | `calorie.view.ranking` | — |
| 432 | 10 | 查食物排行 | 可执行 | `calorie.view.ranking` | — |
| 433 | 10 | 查高热量榜 | 可执行 | `calorie.view.ranking` | — |
| 434 | 10 | 查高碳水榜 | 可执行 | `calorie.view.ranking` | — |
| 435 | 10 | 查高蛋白榜 | 可执行 | `calorie.view.ranking` | — |

### 1.1 理由码逐字

- `wizard`：命中但不执行：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。
- `noNoteFilter`：命中但不执行：77 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。
- `noNutrientDetail`：命中但不执行：77 键无钠／糖／纤维等营养素明细维度（view.diet-review 的 macro 只有蛋白／碳水／脂肪配比），单命令不可达成。
- `noNutritionAdvice`：命中但不执行：77 键无营养建议形态（view.diet-review／view.health 给数据盘，不给建议条目）。
- `compoundCurve`：命中但不执行：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。
- `anchorCompare`：命中但不执行：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。
- `reviewWindowOnly`：命中但不执行：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。
- `milestoneForwardOnly`：命中但不执行：view.weight-review 的 milestone 是「目标达成预测」（estDays／estDate 前向），不是里程碑回溯列表 → 无单命令同形。
- `recordFilterMissing`：命中但不执行：77 键无运动记录级列表／筛选参数（view.exercise 是汇总盘：byType／byCategory 为分项统计，不含逐条记录与备注筛选）。
- `categoryOverviewMissing`：命中但不执行：view.exercise 无 category 参数（分项统计按运动类型 byType 渲染 TOP4，byCategory 未渲染，力量／有氧非独立形态），无单命令同形。
- `planFilterMissing`：命中但不执行：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。
- `planWriteMissing`：命中但不执行：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。
- `planReviewMissing`：命中但不执行：77 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。
- `bodyCompareMissing`：命中但不执行：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。
- `reportKindMissing`：命中但不执行：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。
- `multiTrendMissing`：命中但不执行：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。
- `predictParamMissing`：命中但不执行：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。
- `sixFactorsMissing`：命中但不执行：77 键无「每日 6 因素综合」形态（view.home 为当日总览，不含旧链 six 的 6 因素评分）。
- `lintMissing`：命中但不执行：77 键无数据质量／lint 形态（旧链 render_lint_health.py 为数据体检）。
- `oosCron`：明确不做（架构规格 docs/calorie-architecture.md:60：定时复盘）；词只保证命中与文案，执行层不承接（t71 O1 同项）。
- `oosXunji`：明确不做（架构规格 docs/calorie-architecture.md:60：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项）。
- `oosLabel`：明确不做（架构规格 docs/calorie-architecture.md:60：营养表）；词只保证命中与文案，执行层不承接（t71 O4 同项）。
- `oosLanding`：明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。

## 2. 可执行面明细（SoT 326 条 ＋ 新拟 34 条 ＋ 覆盖修复 1 条）

| 来源 | 记录 id | 场景 | 唤醒词 | key | cli |
|---|---|---|---|---|---|
| SoT | 看今日主页#S0 | 01 | 看今日主页 | `calorie.view.home` | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| SoT | 看今日饮食概览#S1 | 01 | 看今日饮食概览 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 看今日运动概览#S2 | 01 | 看今日运动概览 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-06","end":"2026-09-07"}'` |
| SoT | 看今日体重概览#S3 | 01 | 看今日体重概览 | `calorie.view.weight` | `calorie-cmd-read calorie.view.weight` |
| SoT | 看今日目标进度#S4 | 01 | 看今日目标进度 | `calorie.view.goal-progress` | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 看本周主页#S5 | 01 | 看本周主页 | `calorie.view.home` | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07","windowDays":7}'` |
| SoT | 看本月主页#S6 | 01 | 看本月主页 | `calorie.view.home` | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07","windowDays":30}'` |
| SoT | 看连续记录天数#S7 | 01 | 看连续记录天数 | `calorie.view.home` | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| SoT | 看今日热量预算#S8 | 01 | 看今日热量预算 | `calorie.view.home` | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| SoT | 记一餐#S9 | 02 | 记一餐 | `calorie.diet.add` | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35}'` |
| SoT | 记一餐（含备注）#S10 | 02 | 记一餐（含备注） | `calorie.diet.add` | `calorie-cmd-read calorie.diet.add --params '{"foodName":"鸡胸","calories":200,"protein":35,"note":"加了辣酱"}'` |
| SoT | 补记饮食#S11 | 02 | 补记饮食 | `calorie.diet.add` | `calorie-cmd-read calorie.diet.add --params '{"foodName":"米饭","calories":500,"protein":10,"date":"2026-09-06","time":"12:30:00"}'` |
| SoT | 批量补记饮食#S12 | 02 | 批量补记饮食 | `calorie.diet.batch` | `calorie-cmd-read calorie.diet.batch --params '{"items":[{"foodName":"粥","calories":150,"protein":3,"date":"2026-09-06"}]}'` |
| SoT | 记喝水#S15 | 02 | 记喝水 | `calorie.water.log` | `calorie-cmd-read calorie.water.log --params '{"ml":300}'` |
| SoT | 复制昨日饮食#S16 | 02 | 复制昨日饮食 | `calorie.diet.copy` | `calorie-cmd-read calorie.diet.copy --params '{"from":"2026-09-06"}'` |
| SoT | 改饮食记录#S17 | 02 | 改饮食记录 | `calorie.diet.update` | `calorie-cmd-read calorie.diet.update --params '{"id":1,"grams":150}'` |
| SoT | 改某日饮食#S18 | 02 | 改某日饮食 | `calorie.diet.update-by-date` | `calorie-cmd-read calorie.diet.update-by-date --params '{"date":"2026-09-06","note":"食堂"}'` |
| SoT | 删饮食记录#S19 | 02 | 删饮食记录 | `calorie.diet.remove` | `calorie-cmd-read calorie.diet.remove --params '{"id":1}'` |
| SoT | 删一餐#S20 | 02 | 删一餐 | `calorie.diet.remove-by-type` | `calorie-cmd-read calorie.diet.remove-by-type --params '{"date":"2026-09-06","mealType":"早餐"}'` |
| SoT | 删某日饮食#S21 | 02 | 删某日饮食 | `calorie.diet.remove-by-date` | `calorie-cmd-read calorie.diet.remove-by-date --params '{"date":"2026-09-06"}'` |
| SoT | 批量删饮食#S22 | 02 | 批量删饮食 | `calorie.diet.remove-by-range` | `calorie-cmd-read calorie.diet.remove-by-range --params '{"start":"2026-09-01","end":"2026-09-02"}'` |
| SoT | 看今日饮食#S23 | 02 | 看今日饮食 | `calorie.today` | `calorie-cmd-read calorie.today --params '{"date":"2026-09-07"}'` |
| SoT | 看昨日饮食#S24 | 02 | 看昨日饮食 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-06","end":"2026-09-06"}'` |
| SoT | 看本周饮食#S25 | 02 | 看本周饮食 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 看上周饮食#S26 | 02 | 看上周饮食 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-31","end":"2026-09-06"}'` |
| SoT | 看本月饮食#S27 | 02 | 看本月饮食 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看上月饮食#S28 | 02 | 看上月饮食 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| SoT | 看最近 7 天饮食#S29 | 02 | 看最近 7 天饮食 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看最近 30 天饮食#S30 | 02 | 看最近 30 天饮食 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 看某段时间饮食#S31 | 02 | 看某段时间饮食 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看今日喝水#S32 | 02 | 看今日喝水 | `calorie.view.home` | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` |
| SoT | 查食品#S34 | 02 | 查食品 | `calorie.view.search` | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| SoT | 查食品（按分类）#S35 | 02 | 查食品（按分类） | `calorie.view.library` | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` |
| SoT | 存食品#S36 | 02 | 存食品 | `calorie.product.add` | `calorie-cmd-read calorie.product.add --params '{"productName":"鸡胸肉","calories":165,"protein":31,"fat":3.6,"carbohydrates":0,"sodium":70}'` |
| SoT | 改食品#S37 | 02 | 改食品 | `calorie.product.update` | `calorie-cmd-read calorie.product.update --params '{"id":1,"note":"新版"}'` |
| SoT | 下架食品#S38 | 02 | 下架食品 | `calorie.product.deprecate` | `calorie-cmd-read calorie.product.deprecate --params '{"id":1}'` |
| SoT | 看食品库（去重）#S39 | 02 | 看食品库（去重） | `calorie.view.dedupe` | `calorie-cmd-read calorie.view.dedupe` |
| SoT | 看食品来源统计#S42 | 02 | 看食品来源统计 | `calorie.view.library` | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` |
| SoT | 看营养结构#S43 | 02 | 看营养结构 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看今日营养#S44 | 02 | 看今日营养 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 看饮食总览#S45 | 02 | 看饮食总览 | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看高热量榜#S47 | 02 | 看高热量榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看低热量榜#S48 | 02 | 看低热量榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看频繁吃榜#S49 | 02 | 看频繁吃榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看高碳水榜#S50 | 02 | 看高碳水榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看高蛋白榜#S51 | 02 | 看高蛋白榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看全部排行榜#S52 | 02 | 看全部排行榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看高热量榜（最近 30 天）#S53 | 02 | 看高热量榜（最近 30 天） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| SoT | 看高热量榜（本月）#S54 | 02 | 看高热量榜（本月） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看高热量榜（自定义）#S55 | 02 | 看高热量榜（自定义） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看低热量榜（最近 30 天）#S56 | 02 | 看低热量榜（最近 30 天） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| SoT | 看低热量榜（本月）#S57 | 02 | 看低热量榜（本月） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看低热量榜（自定义）#S58 | 02 | 看低热量榜（自定义） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看频繁吃榜（最近 30 天）#S59 | 02 | 看频繁吃榜（最近 30 天） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| SoT | 看频繁吃榜（本月）#S60 | 02 | 看频繁吃榜（本月） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看频繁吃榜（自定义）#S61 | 02 | 看频繁吃榜（自定义） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看高碳水榜（最近 30 天）#S62 | 02 | 看高碳水榜（最近 30 天） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| SoT | 看高碳水榜（本月）#S63 | 02 | 看高碳水榜（本月） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看高碳水榜（自定义）#S64 | 02 | 看高碳水榜（自定义） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看高蛋白榜（最近 30 天）#S65 | 02 | 看高蛋白榜（最近 30 天） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-08-09","end":"2026-09-07","topN":10}'` |
| SoT | 看高蛋白榜（本月）#S66 | 02 | 看高蛋白榜（本月） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 看高蛋白榜（自定义）#S67 | 02 | 看高蛋白榜（自定义） | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 饮食复盘（本周）#S68 | 02 | 饮食复盘（本周） | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 饮食复盘（本月）#S69 | 02 | 饮食复盘（本月） | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 饮食复盘（最近 90 天）#S70 | 02 | 饮食复盘（最近 90 天） | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 饮食复盘（今年）#S71 | 02 | 饮食复盘（今年） | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-01-01","end":"2026-09-07"}'` |
| SoT | 饮食复盘（自定义时间）#S72 | 02 | 饮食复盘（自定义时间） | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看早餐（最近 7 天）#S73 | 02 | 看早餐（最近 7 天） | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看午餐（最近 7 天）#S74 | 02 | 看午餐（最近 7 天） | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看晚餐（最近 7 天）#S75 | 02 | 看晚餐（最近 7 天） | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看加餐（最近 7 天）#S76 | 02 | 看加餐（最近 7 天） | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看全部餐别分布（最近 7 天）#S77 | 02 | 看全部餐别分布（最近 7 天） | `calorie.view.diet` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 记体重#S79 | 03 | 记体重 | `calorie.weight.log` | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5}'` |
| SoT | 记体重（含备注）#S80 | 03 | 记体重（含备注） | `calorie.weight.log` | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5,"note":"晨起空腹"}'` |
| SoT | 补录体重#S81 | 03 | 补录体重 | `calorie.weight.log` | `calorie-cmd-read calorie.weight.log --params '{"kg":70.5,"date":"2026-09-06"}'` |
| SoT | 批量补录体重#S82 | 03 | 批量补录体重 | `calorie.weight.batch` | `calorie-cmd-read calorie.weight.batch --params '{"items":[{"date":"2026-09-06","kg":70.5}]}'` |
| SoT | 看今日体重#S83 | 03 | 看今日体重 | `calorie.view.weight` | `calorie-cmd-read calorie.view.weight --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 改体重记录#S84 | 03 | 改体重记录 | `calorie.weight.update` | `calorie-cmd-read calorie.weight.update --params '{"id":1,"kg":70.2}'` |
| SoT | 改某日体重#S85 | 03 | 改某日体重 | `calorie.weight.update` | `calorie-cmd-read calorie.weight.update --params '{"date":"2026-09-06","kg":70.2}'` |
| SoT | 删体重记录#S86 | 03 | 删体重记录 | `calorie.weight.remove` | `calorie-cmd-read calorie.weight.remove --params '{"id":1}'` |
| SoT | 删某日体重#S87 | 03 | 删某日体重 | `calorie.weight.remove` | `calorie-cmd-read calorie.weight.remove --params '{"date":"2026-09-06"}'` |
| SoT | 批量删体重#S88 | 03 | 批量删体重 | `calorie.weight.remove` | `calorie-cmd-read calorie.weight.remove --params '{"start":"2026-09-01","end":"2026-09-02"}'` |
| SoT | 看本周体重#S89 | 03 | 看本周体重 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 看上周体重#S90 | 03 | 看上周体重 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-31","end":"2026-09-06"}'` |
| SoT | 看本月体重#S91 | 03 | 看本月体重 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看上月体重#S92 | 03 | 看上月体重 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| SoT | 看最近 7 天体重#S93 | 03 | 看最近 7 天体重 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看最近 90 天体重#S94 | 03 | 看最近 90 天体重 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 看某段时间体重#S95 | 03 | 看某段时间体重 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看体重曲线#S96 | 03 | 看体重曲线 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 看本月体重曲线#S100 | 03 | 看本月体重曲线 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看上月体重曲线#S101 | 03 | 看上月体重曲线 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| SoT | 看最近 90 天体重曲线#S102 | 03 | 看最近 90 天体重曲线 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 看最近 180 天体重曲线#S103 | 03 | 看最近 180 天体重曲线 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-03-12","end":"2026-09-07"}'` |
| SoT | 看最近 365 天体重曲线#S104 | 03 | 看最近 365 天体重曲线 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2025-09-08","end":"2026-09-07"}'` |
| SoT | 看某段时间体重曲线#S105 | 03 | 看某段时间体重曲线 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看体重稳不稳（增强版）#S106 | 03 | 看体重稳不稳（增强版） | `calorie.view.volatility` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看本月波动#S107 | 03 | 看本月波动 | `calorie.view.volatility` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看最近 90 天波动#S108 | 03 | 看最近 90 天波动 | `calorie.view.volatility` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 看最近 180 天波动#S109 | 03 | 看最近 180 天波动 | `calorie.view.volatility` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-03-12","end":"2026-09-07"}'` |
| SoT | 看波动异常点#S110 | 03 | 看波动异常点 | `calorie.view.volatility` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 对比体重：最近 30 天 vs 之前 30 天#S112 | 03 | 对比体重：最近 30 天 vs 之前 30 天 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-08-09","end":"2026-09-07","compareStart":"2026-07-10","compareEnd":"2026-08-08"}'` |
| SoT | 对比体重：自定义两段时间#S113 | 03 | 对比体重：自定义两段时间 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-01","compareEnd":"2026-08-31"}'` |
| SoT | 对比体重：本周 vs 上周#S114 | 03 | 对比体重：本周 vs 上周 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-08-31","compareEnd":"2026-09-06"}'` |
| SoT | 对比体重：本月 vs 上月#S115 | 03 | 对比体重：本月 vs 上月 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-01","compareEnd":"2026-08-31"}'` |
| SoT | 对比体重：近 N 天 vs 上一个 N 天#S116 | 03 | 对比体重：近 N 天 vs 上一个 N 天 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-25","compareEnd":"2026-08-31"}'` |
| SoT | 对比体重：今天 vs 一年前今天#S117 | 03 | 对比体重：今天 vs 一年前今天 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2025-09-07","compareEnd":"2025-09-07"}'` |
| SoT | 对比体重：今天 vs 半年前今天#S118 | 03 | 对比体重：今天 vs 半年前今天 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-03-07","compareEnd":"2026-03-07"}'` |
| SoT | 对比体重：今天 vs 三月前今天#S119 | 03 | 对比体重：今天 vs 三月前今天 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-06-07","compareEnd":"2026-06-07"}'` |
| SoT | 对比体重：当前 vs 目标体重#S120 | 03 | 对比体重：当前 vs 目标体重 | `calorie.view.goal-weight` | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 对比体重：工作日 vs 周末#S129 | 03 | 对比体重：工作日 vs 周末 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-08-31","end":"2026-09-04","compareStart":"2026-09-05","compareEnd":"2026-09-07"}'` |
| SoT | 看体重总览#S130 | 03 | 看体重总览 | `calorie.view.weight` | `calorie-cmd-read calorie.view.weight --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 记运动#S137 | 04 | 记运动 | `calorie.exercise.add` | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30}'` |
| SoT | 记运动（含备注）#S138 | 04 | 记运动（含备注） | `calorie.exercise.add` | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30,"note":"夜跑"}'` |
| SoT | 记力量训练#S139 | 04 | 记力量训练 | `calorie.exercise.add` | `calorie-cmd-read calorie.exercise.add --params '{"type":"卧推","calories":150,"category":"力量","loadKg":60,"reps":10}'` |
| SoT | 记有氧运动#S140 | 04 | 记有氧运动 | `calorie.exercise.add` | `calorie-cmd-read calorie.exercise.add --params '{"type":"户外跑","calories":300,"minutes":30,"category":"有氧","distance":5}'` |
| SoT | 记日常活动#S141 | 04 | 记日常活动 | `calorie.exercise.add` | `calorie-cmd-read calorie.exercise.add --params '{"type":"步行","calories":80,"minutes":20,"category":"日常","steps":3000}'` |
| SoT | 补记运动#S142 | 04 | 补记运动 | `calorie.exercise.add` | `calorie-cmd-read calorie.exercise.add --params '{"type":"慢跑","calories":320,"minutes":30,"date":"2026-09-06"}'` |
| SoT | 批量补记运动#S143 | 04 | 批量补记运动 | `calorie.exercise.add` | `calorie-cmd-read calorie.exercise.add --params '{"items":[{"type":"慢跑","calories":320,"minutes":30,"date":"2026-09-06"}]}'` |
| SoT | 复制昨日运动#S144 | 04 | 复制昨日运动 | `calorie.exercise.add` | `calorie-cmd-read calorie.exercise.add --params '{"copyFrom":"yesterday"}'` |
| SoT | 改运动记录#S145 | 04 | 改运动记录 | `calorie.exercise.update` | `calorie-cmd-read calorie.exercise.update --params '{"id":1,"minutes":40}'` |
| SoT | 改某日运动#S146 | 04 | 改某日运动 | `calorie.exercise.update` | `calorie-cmd-read calorie.exercise.update --params '{"date":"2026-09-06","note":"补记"}'` |
| SoT | 删运动记录#S147 | 04 | 删运动记录 | `calorie.exercise.remove` | `calorie-cmd-read calorie.exercise.remove --params '{"id":1}'` |
| SoT | 删某日运动#S148 | 04 | 删某日运动 | `calorie.exercise.remove` | `calorie-cmd-read calorie.exercise.remove --params '{"date":"2026-09-06"}'` |
| SoT | 批量删运动#S149 | 04 | 批量删运动 | `calorie.exercise.remove` | `calorie-cmd-read calorie.exercise.remove --params '{"from":"2026-09-01","to":"2026-09-02"}'` |
| SoT | 看今日运动#S150 | 04 | 看今日运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 看昨日运动#S151 | 04 | 看昨日运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-06","end":"2026-09-06"}'` |
| SoT | 看本周运动#S152 | 04 | 看本周运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 看上周运动#S153 | 04 | 看上周运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-31","end":"2026-09-06"}'` |
| SoT | 看本月运动#S154 | 04 | 看本月运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看上月运动#S155 | 04 | 看上月运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| SoT | 看最近 7 天运动#S156 | 04 | 看最近 7 天运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看最近 30 天运动#S157 | 04 | 看最近 30 天运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 看某段时间运动#S158 | 04 | 看某段时间运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看今日运动（vs 目标）#S159 | 04 | 看今日运动（vs 目标） | `calorie.view.exercise-goal` | `calorie-cmd-read calorie.view.exercise-goal --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 看本周运动（vs 目标）#S160 | 04 | 看本周运动（vs 目标） | `calorie.view.exercise-goal` | `calorie-cmd-read calorie.view.exercise-goal --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 看最近 60 天运动#S164 | 04 | 看最近 60 天运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-07-10","end":"2026-09-07"}'` |
| SoT | 看最近 180 天运动#S165 | 04 | 看最近 180 天运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-03-12","end":"2026-09-07"}'` |
| SoT | 看最近 365 天运动#S166 | 04 | 看最近 365 天运动 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2025-09-08","end":"2026-09-07"}'` |
| SoT | 看运动类型分布#S167 | 04 | 看运动类型分布 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看运动趋势#S170 | 04 | 看运动趋势 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 运动复盘（本周）#S171 | 04 | 运动复盘（本周） | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 运动复盘（本月）#S172 | 04 | 运动复盘（本月） | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 运动复盘（最近 90 天）#S173 | 04 | 运动复盘（最近 90 天） | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 运动复盘（今年）#S174 | 04 | 运动复盘（今年） | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-01-01","end":"2026-09-07"}'` |
| SoT | 运动复盘（自定义时间）#S175 | 04 | 运动复盘（自定义时间） | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看计划概览#S183 | 05 | 看计划概览 | `calorie.view.plan` | `calorie-cmd-read calorie.view.plan` |
| SoT | 看完整计划#S184 | 05 | 看完整计划 | `calorie.view.plan` | `calorie-cmd-read calorie.view.plan` |
| SoT | 扫禁忌#S207 | 05 | 扫禁忌 | `calorie.view.contraindication` | `calorie-cmd-read calorie.view.contraindication` |
| SoT | 定营养目标#S208 | 06 | 定营养目标 | `calorie.goal.set` | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50,"water":2000}'` |
| SoT | 定体重目标#S210 | 06 | 定体重目标 | `calorie.goal.weight` | `calorie-cmd-read calorie.goal.weight --params '{"kg":68}'` |
| SoT | 定体重目标(自动算截止)#S211 | 06 | 定体重目标(自动算截止) | `calorie.goal.weight` | `calorie-cmd-read calorie.goal.weight --params '{"kg":68,"deadline":"2026-12-31"}'` |
| SoT | 定体重目标(含起始日)#S212 | 06 | 定体重目标(含起始日) | `calorie.goal.weight` | `calorie-cmd-read calorie.goal.weight --params '{"kg":68,"deadline":"2026-12-31","startKg":72,"startDate":"2026-09-01"}'` |
| SoT | 定饮水目标#S213 | 06 | 定饮水目标 | `calorie.goal.water` | `calorie-cmd-read calorie.goal.water --params '{"water":2000}'` |
| SoT | 看今日目标#S216 | 06 | 看今日目标 | `calorie.view.goal-progress` | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 看本周目标#S217 | 06 | 看本周目标 | `calorie.view.goal-progress` | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看营养目标进度#S218 | 06 | 看营养目标进度 | `calorie.view.goal-progress` | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 看体重目标进度#S219 | 06 | 看体重目标进度 | `calorie.view.goal-weight` | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看饮水目标进度#S220 | 06 | 看饮水目标进度 | `calorie.view.goal-progress` | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 看目标对比实际#S221 | 06 | 看目标对比实际 | `calorie.view.goal-vs-actual` | `calorie-cmd-read calorie.view.goal-vs-actual --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 看目标完成度#S222 | 06 | 看目标完成度 | `calorie.view.goal` | `calorie-cmd-read calorie.view.goal --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 看即将到期的目标#S223 | 06 | 看即将到期的目标 | `calorie.view.goal-expiring` | `calorie-cmd-read calorie.view.goal-expiring` |
| SoT | 看目标完成率(按周)#S224 | 06 | 看目标完成率(按周) | `calorie.view.goal-progress` | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看目标完成率(按月)#S225 | 06 | 看目标完成率(按月) | `calorie.view.goal-progress` | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 改营养目标#S226 | 06 | 改营养目标 | `calorie.goal.set` | `calorie-cmd-read calorie.goal.set --params '{"calorie":1800,"protein":150,"carbs":200,"fat":50}'` |
| SoT | 改体重目标#S227 | 06 | 改体重目标 | `calorie.goal.weight` | `calorie-cmd-read calorie.goal.weight --params '{"kg":67.5}'` |
| SoT | 改饮水目标#S228 | 06 | 改饮水目标 | `calorie.goal.water` | `calorie-cmd-read calorie.goal.water --params '{"water":2200}'` |
| SoT | 暂停所有目标#S229 | 06 | 暂停所有目标 | `calorie.goal.pause` | `calorie-cmd-read calorie.goal.pause` |
| SoT | 重启所有目标#S230 | 06 | 重启所有目标 | `calorie.goal.resume` | `calorie-cmd-read calorie.goal.resume` |
| SoT | 看目标历史完成#S231 | 06 | 看目标历史完成 | `calorie.view.goal` | `calorie-cmd-read calorie.view.goal --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 看目标预测达成#S232 | 06 | 看目标预测达成 | `calorie.view.goal-predict` | `calorie-cmd-read calorie.view.goal-predict --params '{"start":"2026-08-25","end":"2026-09-07"}'` |
| SoT | 设置档案#S233 | 07 | 设置档案 | `calorie.profile.set` | `calorie-cmd-read calorie.profile.set --params '{"heightCm":175,"age":30,"gender":"male","activityLevel":"moderate"}'` |
| SoT | 设活动量#S234 | 07 | 设活动量 | `calorie.profile.activity` | `calorie-cmd-read calorie.profile.activity --params '{"activityLevel":"active"}'` |
| SoT | 改档案#S235 | 07 | 改档案 | `calorie.profile.update` | `calorie-cmd-read calorie.profile.update --params '{"field":"heightCm","value":176}'` |
| SoT | 查档案#S236 | 07 | 查档案 | `calorie.view.profile` | `calorie-cmd-read calorie.view.profile` |
| SoT | 记体脂（皮褶钳）#S237 | 08 | 记体脂（皮褶钳） | `calorie.body.composition-add` | `calorie-cmd-read calorie.body.composition-add --params '{"source":"home_caliper","bodyFatPct":18.5,"date":"2026-09-06","caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10}'` |
| SoT | 记体脂（外部测量）#S238 | 08 | 记体脂（外部测量） | `calorie.body.composition-add` | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":18.5,"date":"2026-09-06"}'` |
| SoT | 记围度#S239 | 08 | 记围度 | `calorie.body.measure-add` | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":85,"hipCm":95}'` |
| SoT | 补记体脂#S240 | 08 | 补记体脂 | `calorie.body.composition-add` | `calorie-cmd-read calorie.body.composition-add --params '{"source":"gym","bodyFatPct":19,"date":"2026-09-01"}'` |
| SoT | 补记围度#S241 | 08 | 补记围度 | `calorie.body.measure-add` | `calorie-cmd-read calorie.body.measure-add --params '{"waistCm":86,"date":"2026-09-01"}'` |
| SoT | 看体脂#S242 | 08 | 看体脂 | `calorie.view.body-composition` | `calorie-cmd-read calorie.view.body-composition` |
| SoT | 看体脂趋势#S243 | 08 | 看体脂趋势 | `calorie.view.body-composition` | `calorie-cmd-read calorie.view.body-composition --params '{"days":90}'` |
| SoT | 看围度#S244 | 08 | 看围度 | `calorie.view.body-measure` | `calorie-cmd-read calorie.view.body-measure` |
| SoT | 看围度趋势#S245 | 08 | 看围度趋势 | `calorie.view.body-measure` | `calorie-cmd-read calorie.view.body-measure --params '{"days":90}'` |
| SoT | 删体脂#S248 | 08 | 删体脂 | `calorie.body.composition-remove` | `calorie-cmd-read calorie.body.composition-remove --params '{"id":1}'` |
| SoT | 删围度#S249 | 08 | 删围度 | `calorie.body.measure-remove` | `calorie-cmd-read calorie.body.measure-remove --params '{"id":1}'` |
| SoT | 记身材照#S250 | 09 | 记身材照 | `calorie.photo.add` | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| SoT | 记身材照#S251 | 09 | 记身材照 | `calorie.photo.add` | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| SoT | 记身材照#S252 | 09 | 记身材照 | `calorie.photo.add` | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| SoT | 查身材照#S253 | 09 | 查身材照 | `calorie.photo.list` | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| SoT | 对比两张照片#S254 | 09 | 对比两张照片 | `calorie.photo.compare` | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| SoT | 生成身材照GIF#S255 | 09 | 生成身材照GIF | `calorie.photo.gif` | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| SoT | 删身材照#S256 | 09 | 删身材照 | `calorie.photo.remove` | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| SoT | 改照片标签#S257 | 09 | 改照片标签 | `calorie.photo.tag` | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"set","tag":"晨起"}'` |
| SoT | 加照片标签#S258 | 09 | 加照片标签 | `calorie.photo.tag` | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| SoT | 删照片标签#S259 | 09 | 删照片标签 | `calorie.photo.tag` | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"remove","tag":"晨起"}'` |
| SoT | 看体重 vs 摄入(最近 7 天)#S260 | 10 | 看体重 vs 摄入(最近 7 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| SoT | 看体重 vs 摄入(最近 15 天)#S261 | 10 | 看体重 vs 摄入(最近 15 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"15d"}'` |
| SoT | 看体重 vs 摄入(最近 30 天)#S262 | 10 | 看体重 vs 摄入(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"30d"}'` |
| SoT | 看体重 vs 摄入(最近 60 天)#S263 | 10 | 看体重 vs 摄入(最近 60 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"60d"}'` |
| SoT | 看体重 vs 摄入(最近 90 天)#S264 | 10 | 看体重 vs 摄入(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"90d"}'` |
| SoT | 看体重 vs 摄入(最近 180 天)#S265 | 10 | 看体重 vs 摄入(最近 180 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"180d"}'` |
| SoT | 看体重 vs 摄入(最近 365 天)#S266 | 10 | 看体重 vs 摄入(最近 365 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"365d"}'` |
| SoT | 看体重 vs 摄入(本周)#S267 | 10 | 看体重 vs 摄入(本周) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"week_cur"}'` |
| SoT | 看体重 vs 摄入(本月)#S268 | 10 | 看体重 vs 摄入(本月) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"month_cur"}'` |
| SoT | 看体重 vs 摄入(自定义)#S269 | 10 | 看体重 vs 摄入(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看体重 vs 运动(最近 7 天)#S270 | 10 | 看体重 vs 运动(最近 7 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"7d"}'` |
| SoT | 看体重 vs 运动(最近 15 天)#S271 | 10 | 看体重 vs 运动(最近 15 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"15d"}'` |
| SoT | 看体重 vs 运动(最近 30 天)#S272 | 10 | 看体重 vs 运动(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"30d"}'` |
| SoT | 看体重 vs 运动(最近 60 天)#S273 | 10 | 看体重 vs 运动(最近 60 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"60d"}'` |
| SoT | 看体重 vs 运动(最近 90 天)#S274 | 10 | 看体重 vs 运动(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"90d"}'` |
| SoT | 看体重 vs 运动(最近 180 天)#S275 | 10 | 看体重 vs 运动(最近 180 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"180d"}'` |
| SoT | 看体重 vs 运动(最近 365 天)#S276 | 10 | 看体重 vs 运动(最近 365 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"365d"}'` |
| SoT | 看体重 vs 运动(本周)#S277 | 10 | 看体重 vs 运动(本周) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"week_cur"}'` |
| SoT | 看体重 vs 运动(本月)#S278 | 10 | 看体重 vs 运动(本月) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"month_cur"}'` |
| SoT | 看体重 vs 运动(自定义)#S279 | 10 | 看体重 vs 运动(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看体重 vs 蛋白(最近 7 天)#S280 | 10 | 看体重 vs 蛋白(最近 7 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"7d"}'` |
| SoT | 看体重 vs 蛋白(最近 15 天)#S281 | 10 | 看体重 vs 蛋白(最近 15 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"15d"}'` |
| SoT | 看体重 vs 蛋白(最近 30 天)#S282 | 10 | 看体重 vs 蛋白(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"30d"}'` |
| SoT | 看体重 vs 蛋白(最近 60 天)#S283 | 10 | 看体重 vs 蛋白(最近 60 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"60d"}'` |
| SoT | 看体重 vs 蛋白(最近 90 天)#S284 | 10 | 看体重 vs 蛋白(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"90d"}'` |
| SoT | 看体重 vs 蛋白(最近 180 天)#S285 | 10 | 看体重 vs 蛋白(最近 180 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"180d"}'` |
| SoT | 看体重 vs 蛋白(最近 365 天)#S286 | 10 | 看体重 vs 蛋白(最近 365 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"365d"}'` |
| SoT | 看体重 vs 蛋白(本周)#S287 | 10 | 看体重 vs 蛋白(本周) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"week_cur"}'` |
| SoT | 看体重 vs 蛋白(本月)#S288 | 10 | 看体重 vs 蛋白(本月) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"month_cur"}'` |
| SoT | 看体重 vs 蛋白(自定义)#S289 | 10 | 看体重 vs 蛋白(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看体重 vs 缺口(最近 7 天)#S290 | 10 | 看体重 vs 缺口(最近 7 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"7d"}'` |
| SoT | 看体重 vs 缺口(最近 15 天)#S291 | 10 | 看体重 vs 缺口(最近 15 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"15d"}'` |
| SoT | 看体重 vs 缺口(最近 30 天)#S292 | 10 | 看体重 vs 缺口(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"30d"}'` |
| SoT | 看体重 vs 缺口(最近 60 天)#S293 | 10 | 看体重 vs 缺口(最近 60 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"60d"}'` |
| SoT | 看体重 vs 缺口(最近 90 天)#S294 | 10 | 看体重 vs 缺口(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"90d"}'` |
| SoT | 看体重 vs 缺口(最近 180 天)#S295 | 10 | 看体重 vs 缺口(最近 180 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"180d"}'` |
| SoT | 看体重 vs 缺口(最近 365 天)#S296 | 10 | 看体重 vs 缺口(最近 365 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"365d"}'` |
| SoT | 看体重 vs 缺口(本周)#S297 | 10 | 看体重 vs 缺口(本周) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"week_cur"}'` |
| SoT | 看体重 vs 缺口(本月)#S298 | 10 | 看体重 vs 缺口(本月) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"month_cur"}'` |
| SoT | 看体重 vs 缺口(自定义)#S299 | 10 | 看体重 vs 缺口(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看摄入 vs 运动(最近 7 天)#S300 | 10 | 看摄入 vs 运动(最近 7 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"7d"}'` |
| SoT | 看摄入 vs 运动(最近 30 天)#S301 | 10 | 看摄入 vs 运动(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"30d"}'` |
| SoT | 看摄入 vs 运动(最近 90 天)#S302 | 10 | 看摄入 vs 运动(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"90d"}'` |
| SoT | 看摄入 vs 运动(最近 180 天)#S303 | 10 | 看摄入 vs 运动(最近 180 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"180d"}'` |
| SoT | 看摄入 vs 运动(最近 365 天)#S304 | 10 | 看摄入 vs 运动(最近 365 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"365d"}'` |
| SoT | 看摄入 vs 运动(自定义)#S305 | 10 | 看摄入 vs 运动(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看体重 vs 体脂(最近 7 天)#S306 | 10 | 看体重 vs 体脂(最近 7 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"7d"}'` |
| SoT | 看体重 vs 体脂(最近 30 天)#S307 | 10 | 看体重 vs 体脂(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"30d"}'` |
| SoT | 看体重 vs 体脂(最近 90 天)#S308 | 10 | 看体重 vs 体脂(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"90d"}'` |
| SoT | 看体重 vs 体脂(最近 180 天)#S309 | 10 | 看体重 vs 体脂(最近 180 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"180d"}'` |
| SoT | 看体重 vs 体脂(最近 365 天)#S310 | 10 | 看体重 vs 体脂(最近 365 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"365d"}'` |
| SoT | 看体重 vs 体脂(自定义)#S311 | 10 | 看体重 vs 体脂(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看体重 vs 围度(最近 7 天)#S312 | 10 | 看体重 vs 围度(最近 7 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"7d"}'` |
| SoT | 看体重 vs 围度(最近 30 天)#S313 | 10 | 看体重 vs 围度(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"30d"}'` |
| SoT | 看体重 vs 围度(最近 90 天)#S314 | 10 | 看体重 vs 围度(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"90d"}'` |
| SoT | 看体重 vs 围度(最近 180 天)#S315 | 10 | 看体重 vs 围度(最近 180 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"180d"}'` |
| SoT | 看体重 vs 围度(最近 365 天)#S316 | 10 | 看体重 vs 围度(最近 365 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"365d"}'` |
| SoT | 看体重 vs 围度(自定义)#S317 | 10 | 看体重 vs 围度(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看饮水 vs 体重(最近 30 天)#S318 | 10 | 看饮水 vs 体重(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"30d"}'` |
| SoT | 看饮水 vs 体重(自定义)#S319 | 10 | 看饮水 vs 体重(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看健康报告(本周)#S320 | 10 | 看健康报告(本周) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 看健康报告(上周)#S321 | 10 | 看健康报告(上周) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-31","end":"2026-09-06"}'` |
| SoT | 看健康报告(最近 7 天)#S322 | 10 | 看健康报告(最近 7 天) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看健康报告(最近 30 天)#S323 | 10 | 看健康报告(最近 30 天) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 看健康报告(最近 90 天)#S324 | 10 | 看健康报告(最近 90 天) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 看健康报告(最近 180 天)#S325 | 10 | 看健康报告(最近 180 天) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-03-12","end":"2026-09-07"}'` |
| SoT | 看健康报告(最近 365 天)#S326 | 10 | 看健康报告(最近 365 天) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2025-09-08","end":"2026-09-07"}'` |
| SoT | 看健康报告(本月)#S327 | 10 | 看健康报告(本月) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看健康报告(上月)#S328 | 10 | 看健康报告(上月) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-01","end":"2026-08-31"}'` |
| SoT | 看健康报告(今年)#S329 | 10 | 看健康报告(今年) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-01-01","end":"2026-09-07"}'` |
| SoT | 看健康报告(自定义)#S330 | 10 | 看健康报告(自定义) | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 诊断体重波动原因#S354 | 10 | 诊断体重波动原因 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_volatility","start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 诊断体重停滞(含平台期判断)#S355 | 10 | 诊断体重停滞(含平台期判断) | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_plateau","start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 诊断体重反弹#S356 | 10 | 诊断体重反弹 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_rebound","start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 诊断体重下降原因#S357 | 10 | 诊断体重下降原因 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_loss_cause","start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 诊断体重异常点#S358 | 10 | 诊断体重异常点 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_anomaly","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 诊断体重vs体脂围度背离#S359 | 10 | 诊断体重vs体脂围度背离 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_divergence","start":"2026-03-12","end":"2026-09-07"}'` |
| SoT | 诊断饮食超标#S360 | 10 | 诊断饮食超标 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 诊断饮食不足#S361 | 10 | 诊断饮食不足 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_under","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 诊断营养不均衡(含均衡判断)#S362 | 10 | 诊断营养不均衡(含均衡判断) | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_unbalanced","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 诊断饮食结构问题#S363 | 10 | 诊断饮食结构问题 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_structure","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 诊断运动不足#S364 | 10 | 诊断运动不足 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_insufficient","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 诊断运动过量#S365 | 10 | 诊断运动过量 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_overload","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 诊断运动类型失衡#S366 | 10 | 诊断运动类型失衡 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_type_imbalance","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 诊断运动效率(含有效判断)#S367 | 10 | 诊断运动效率(含有效判断) | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_efficiency","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 诊断运动建议(含类型推荐)#S368 | 10 | 诊断运动建议(含类型推荐) | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_advice","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 为什么我没瘦#S369 | 10 | 为什么我没瘦 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_not_losing","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 为什么我瘦太快#S370 | 10 | 为什么我瘦太快 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_losing_fast","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 我的减重速度合理吗#S371 | 10 | 我的减重速度合理吗 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"rate_reasonable","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 我的减肥策略对吗#S372 | 10 | 我的减肥策略对吗 | `calorie.view.goal-progress` | `calorie-cmd-read calorie.view.goal-progress --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 我距离目标还差什么#S373 | 10 | 我距离目标还差什么 | `calorie.view.goal-weight` | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 我这个月做得好的#S374 | 10 | 我这个月做得好的 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_highlights","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 我这个月需要改的#S375 | 10 | 我这个月需要改的 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_improve","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 综合健康评估#S376 | 10 | 综合健康评估 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"overall","start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 看蛋白 vs 碳水(最近 7 天)#S377 | 10 | 看蛋白 vs 碳水(最近 7 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"7d"}'` |
| SoT | 看蛋白 vs 碳水(最近 30 天)#S378 | 10 | 看蛋白 vs 碳水(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"30d"}'` |
| SoT | 看蛋白 vs 碳水(最近 90 天)#S379 | 10 | 看蛋白 vs 碳水(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"90d"}'` |
| SoT | 看蛋白 vs 碳水(自定义)#S380 | 10 | 看蛋白 vs 碳水(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看蛋白 vs 脂肪(最近 30 天)#S381 | 10 | 看蛋白 vs 脂肪(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"30d"}'` |
| SoT | 看蛋白 vs 脂肪(最近 90 天)#S382 | 10 | 看蛋白 vs 脂肪(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"90d"}'` |
| SoT | 看蛋白 vs 脂肪(自定义)#S383 | 10 | 看蛋白 vs 脂肪(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看碳水 vs 脂肪(最近 30 天)#S384 | 10 | 看碳水 vs 脂肪(最近 30 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"30d"}'` |
| SoT | 看碳水 vs 脂肪(最近 90 天)#S385 | 10 | 看碳水 vs 脂肪(最近 90 天) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"90d"}'` |
| SoT | 看碳水 vs 脂肪(自定义)#S386 | 10 | 看碳水 vs 脂肪(自定义) | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 看三大营养交叉(最近 30 天)#S390 | 10 | 看三大营养交叉(最近 30 天) | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-08-09","end":"2026-09-07"}'` |
| SoT | 看三大营养交叉(最近 90 天)#S391 | 10 | 看三大营养交叉(最近 90 天) | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-06-10","end":"2026-09-07"}'` |
| SoT | 看三大营养交叉(自定义)#S392 | 10 | 看三大营养交叉(自定义) | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 预测体重(1 周后)#S393 | 10 | 预测体重(1 周后) | `calorie.view.predict` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":7}'` |
| SoT | 预测体重(1 月后)#S394 | 10 | 预测体重(1 月后) | `calorie.view.predict` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":30}'` |
| SoT | 预测体重(3 月后)#S395 | 10 | 预测体重(3 月后) | `calorie.view.predict` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":90}'` |
| SoT | 预测体重(6 月后)#S396 | 10 | 预测体重(6 月后) | `calorie.view.predict` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":180}'` |
| SoT | 预测体重(自定义时间)#S397 | 10 | 预测体重(自定义时间) | `calorie.view.predict` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":60}'` |
| SoT | 今日复盘#S414 | 10 | 今日复盘 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 复盘#S416 | 10 | 复盘 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 复盘日期范围#S417 | 10 | 复盘日期范围 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 本周复盘#S419 | 10 | 本周复盘 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| SoT | 本年复盘#S420 | 10 | 本年复盘 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-01-01","end":"2026-09-07"}'` |
| SoT | 本月复盘#S421 | 10 | 本月复盘 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 查低热量榜#S422 | 10 | 查低热量榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 查健康报告#S423 | 10 | 查健康报告 | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 查热量缺口#S426 | 10 | 查热量缺口 | `calorie.view.deficit` | `calorie-cmd-read calorie.view.deficit --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 查热量趋势#S427 | 10 | 查热量趋势 | `calorie.history` | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| SoT | 查营养结构#S428 | 10 | 查营养结构 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 查运动分布#S429 | 10 | 查运动分布 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 查运动贡献#S430 | 10 | 查运动贡献 | `calorie.view.exercise` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` |
| SoT | 查频繁吃榜#S431 | 10 | 查频繁吃榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 查食物排行#S432 | 10 | 查食物排行 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 查高热量榜#S433 | 10 | 查高热量榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| SoT | 查高碳水榜#S434 | 10 | 查高碳水榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| SoT | 查高蛋白榜#S435 | 10 | 查高蛋白榜 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` |
| 新拟 | 存身材照#N0 | 09 | 存身材照 | `calorie.photo.add` | `calorie-cmd-read calorie.photo.add --params '{"srcPaths":["<照片路径>"],"tag":"正面"}'` |
| 新拟 | 移除身材照#N1 | 09 | 移除身材照 | `calorie.photo.remove` | `calorie-cmd-read calorie.photo.remove --params '{"id":1}'` |
| 新拟 | 设置照片标签#N2 | 09 | 设置照片标签 | `calorie.photo.tag` | `calorie-cmd-read calorie.photo.tag --params '{"id":1,"op":"add","tag":"晨起"}'` |
| 新拟 | 看今日饮食记录#N3 | 02 | 看今日饮食记录 | `calorie.today` | `calorie-cmd-read calorie.today --params '{"date":"2026-09-07"}'` |
| 新拟 | 看目标配置#N4 | 06 | 看目标配置 | `calorie.view.goal-config` | `calorie-cmd-read calorie.view.goal-config` |
| 新拟 | 看目标状态#N5 | 06 | 看目标状态 | `calorie.view.goal-status` | `calorie-cmd-read calorie.view.goal-status` |
| 新拟 | 看组合分析#N6 | 10 | 看组合分析 | `calorie.view.combined` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"7d"}'` |
| 新拟 | 看热量缺口#N7 | 10 | 看热量缺口 | `calorie.view.deficit` | `calorie-cmd-read calorie.view.deficit --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 新拟 | 看饮食复盘#N8 | 02 | 看饮食复盘 | `calorie.view.diet-review` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 新拟 | 看健康盘#N9 | 10 | 看健康盘 | `calorie.view.health` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-07","end":"2026-09-07"}'` |
| 新拟 | 查高热量排行#N10 | 02 | 查高热量排行 | `calorie.view.ranking` | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-05","end":"2026-09-07"}'` |
| 新拟 | 查食品库#N11 | 02 | 查食品库 | `calorie.view.library` | `calorie-cmd-read calorie.view.library` |
| 新拟 | 搜食品#N12 | 02 | 搜食品 | `calorie.view.search` | `calorie-cmd-read calorie.view.search --params '{"keyword":"鸡胸"}'` |
| 新拟 | 看身材照#N13 | 09 | 看身材照 | `calorie.photo.list` | `calorie-cmd-read calorie.photo.list --params '{"tag":"正面"}'` |
| 新拟 | 查身材照详情#N14 | 09 | 查身材照详情 | `calorie.photo.detail` | `calorie-cmd-read calorie.photo.detail --params '{"id":1}'` |
| 新拟 | 对比身材照#N15 | 09 | 对比身材照 | `calorie.photo.compare` | `calorie-cmd-read calorie.photo.compare --params '{"id1":1,"id2":2}'` |
| 新拟 | 做身材照GIF#N16 | 09 | 做身材照GIF | `calorie.photo.gif` | `calorie-cmd-read calorie.photo.gif --params '{"tag":"正面"}'` |
| 新拟 | 看身材照HELP#N17 | 09 | 看身材照HELP | `calorie.help.center` | `calorie-cmd-read calorie.help.center --params '{"q":"记身材照"}'` |
| 新拟 | 查唤醒词#N18 | 10 | 查唤醒词 | `calorie.help.lookup` | `calorie-cmd-read calorie.help.lookup --params '{"q":"看今日主页"}'` |
| 新拟 | 查热量历史#N19 | 10 | 查热量历史 | `calorie.history` | `calorie-cmd-read calorie.history --params '{"days":7}'` |
| 新拟 | 看体重历史#N20 | 03 | 看体重历史 | `calorie.view.weight-history` | `calorie-cmd-read calorie.view.weight-history` |
| 新拟 | 看体重对比#N21 | 03 | 看体重对比 | `calorie.view.weight-compare` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-23","compareEnd":"2026-08-29"}'` |
| 新拟 | 看体重复核#N22 | 03 | 看体重复核 | `calorie.view.weight-review` | `calorie-cmd-read calorie.view.weight-review` |
| 新拟 | 看波动分析#N23 | 03 | 看波动分析 | `calorie.view.volatility` | `calorie-cmd-read calorie.view.volatility` |
| 新拟 | 看体成分#N24 | 08 | 看体成分 | `calorie.view.body-composition` | `calorie-cmd-read calorie.view.body-composition` |
| 新拟 | 看围度记录#N25 | 08 | 看围度记录 | `calorie.view.body-measure` | `calorie-cmd-read calorie.view.body-measure` |
| 新拟 | 看训练计划#N26 | 05 | 看训练计划 | `calorie.view.plan` | `calorie-cmd-read calorie.view.plan` |
| 新拟 | 看构建向导#N27 | 05 | 看构建向导 | `calorie.view.plan-wizard` | `calorie-cmd-read calorie.view.plan-wizard --params '{"plan":{"config":{"title":"减脂4周","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}'` |
| 新拟 | 看运动目标#N28 | 04 | 看运动目标 | `calorie.view.exercise-goal` | `calorie-cmd-read calorie.view.exercise-goal` |
| 新拟 | 看体重预测#N29 | 10 | 看体重预测 | `calorie.view.predict` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":7}'` |
| 新拟 | 看异常诊断#N30 | 10 | 看异常诊断 | `calorie.view.anomaly` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","start":"2026-09-01","end":"2026-09-07"}'` |
| 新拟 | 看禁忌扫描#N31 | 05 | 看禁忌扫描 | `calorie.view.contraindication` | `calorie-cmd-read calorie.view.contraindication` |
| 新拟 | 看去重报告#N32 | 02 | 看去重报告 | `calorie.view.dedupe` | `calorie-cmd-read calorie.view.dedupe` |
| 新拟 | 看档案视图#N33 | 07 | 看档案视图 | `calorie.view.profile` | `calorie-cmd-read calorie.view.profile` |
| 修复 | 看目标推荐#R0 | 06 | 看目标推荐 | `calorie.view.goal-recommend` | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}'` |

### 2.1 FX-81-2 同能力孪生词转 exec（冻结词 → 新拟入口同 key，26 条记录／24 个词）

口径：冻结词的旧链能力已由某条新拟入口承载（同一 key）→ 旧词一并入 `exec` 桶并指向同一 key；
避免「能做的事被说成做不到」（架构规格 `docs/calorie-architecture.md:32`／:60 的目的）。冻结表零改动。
「孪生词场景」列为孪生新拟词自身的 scene（FX-81-6 · E-5）：`今日复盘`(10) ↔ `看饮食复盘`(02)、`查高热量榜`(10) ↔ `查高热量排行`(02) 两对同 key 但 scene 取自各自本词的 SoT 场景，**不构成矛盾**。

| 冻结词 | 场景 | 桶 | key | 孪生新拟词 | 孪生词场景 | 证据 |
|---|---|---|---|---|---|---|
| 看今日饮食 | 02 | 可执行 | `calorie.today` | 看今日饮食记录 | 02 | V1 N3「近名同义不同桶」＋ 旧链 internal `diet_view_today` |
| 查食品 | 02 | 可执行 | `calorie.view.search` | 搜食品 | 02 | V1 N12 ＋ 旧链 `food_search` |
| 看食品库（去重） | 02 | 可执行 | `calorie.view.dedupe` | 看去重报告 | 02 | 旧链 internal `food_dedupe`（render_dedupe_report.py）→ 更正 V1 N11 的按名配对（能力＝去重，非食品库列表） |
| 饮食复盘（本周） | 02 | 可执行 | `calorie.view.diet-review` | 看饮食复盘 | 02 | V1 N8 ＋ 旧链 `diet_review_week` |
| 看完整计划 | 05 | 可执行 | `calorie.view.plan` | 看训练计划 | 05 | V1 N26 ＋ 旧链 `plan_view_full`（同项 `定训练计划` 为写能力、77 键无对应写键 → 不并入） |
| 扫禁忌 | 05 | 可执行 | `calorie.view.contraindication` | 看禁忌扫描 | 05 | V1 N31 ＋ 旧链 `plan_contraindication` |
| 查档案 | 07 | 可执行 | `calorie.view.profile` | 看档案视图 | 07 | V1 N33 ＋ 旧链 `profile_view` |
| 看体脂 | 08 | 可执行 | `calorie.view.body-composition` | 看体成分 | 08 | V1 N24 ＋ 旧链 `body_comp_list` |
| 看围度 | 08 | 可执行 | `calorie.view.body-measure` | 看围度记录 | 08 | V1 N25 ＋ 旧链 `body_meas_list` |
| 记身材照 | 09 | 可执行 | `calorie.photo.add` | 存身材照 | 09 | 新拟词 basis 自陈撞冻结词（keys.ts:38 title「记身材照」）＋ 旧链 `body_photo_add_single/note/batch` |
| 记身材照 | 09 | 可执行 | `calorie.photo.add` | 存身材照 | 09 | 新拟词 basis 自陈撞冻结词（keys.ts:38 title「记身材照」）＋ 旧链 `body_photo_add_single/note/batch` |
| 记身材照 | 09 | 可执行 | `calorie.photo.add` | 存身材照 | 09 | 新拟词 basis 自陈撞冻结词（keys.ts:38 title「记身材照」）＋ 旧链 `body_photo_add_single/note/batch` |
| 查身材照 | 09 | 可执行 | `calorie.photo.list` | 看身材照 | 09 | V1 N13 ＋ 旧链 `body_photo_list`（render_body_photo_gallery.py） |
| 对比两张照片 | 09 | 可执行 | `calorie.photo.compare` | 对比身材照 | 09 | V1 N15 ＋ 旧链 `body_photo_compare` |
| 生成身材照GIF | 09 | 可执行 | `calorie.photo.gif` | 做身材照GIF | 09 | 新拟词 basis 自陈（SKILL.md:76 REPR「生成身材照GIF」）＋ 旧链 `body_photo_gif` |
| 删身材照 | 09 | 可执行 | `calorie.photo.remove` | 移除身材照 | 09 | 新拟词 basis 自陈（keys.ts:39 title「删身材照」）＋ 旧链 `--live-delete` |
| 改照片标签 | 09 | 可执行 | `calorie.photo.tag` | 设置照片标签 | 09 | 新拟词 basis 自陈（keys.ts:40 title「改照片标签」）＋ 旧链 `--live-tag-set`（op set） |
| 加照片标签 | 09 | 可执行 | `calorie.photo.tag` | 设置照片标签 | 09 | 旧链 `--live-tag-add`（op add）＋ write.ts:570 scene 枚举「加照片标签」 |
| 删照片标签 | 09 | 可执行 | `calorie.photo.tag` | 设置照片标签 | 09 | 旧链 `--live-tag-remove`（op remove）＋ write.ts:570 scene 枚举「删照片标签」 |
| 看体重 vs 摄入(最近 7 天) | 10 | 可执行 | `calorie.view.combined` | 看组合分析 | 10 | 新拟词 basis 自陈（SKILL.md:90 REPR）＋ 旧链 `cross_weight_calorie_7d`（参数与孪生词逐字同） |
| 看健康报告(本周) | 10 | 可执行 | `calorie.view.health` | 看健康盘 | 10 | V1 N9 ＋ 旧链 `report_full_week_cur` |
| 诊断体重异常点 | 10 | 可执行 | `calorie.view.anomaly` | 看异常诊断 | 10 | V1 N30 ＋ 旧链 `diag_weight_anomaly` |
| 预测体重(1 周后) | 10 | 可执行 | `calorie.view.predict` | 看体重预测 | 10 | V1 N29 ＋ 旧链 `pred_weight_week` |
| 今日复盘 | 10 | 可执行 | `calorie.view.diet-review` | 看饮食复盘 | 02 | 新拟词 basis 自陈（SKILL.md:95 REPR「今日复盘」）＋ 旧链 render_review.py --type day |
| 查热量缺口 | 10 | 可执行 | `calorie.view.deficit` | 看热量缺口 | 10 | V1 N7 ＋ 旧链 `deficit_analysis` |
| 查高热量榜 | 10 | 可执行 | `calorie.view.ranking` | 查高热量排行 | 02 | V1 N10 ＋ 旧链 render_food_ranking.py --category high_calorie |

### 2.2 FX-81-5／FX-81-7 仍需多步交互的 wizard 词（non-exec）与同 key 承接入口

判据（FX-81-7 唯一例外）：该词在语义上**必须多步交互**（先预览／确认再写库，归 #86）→ 保留 `non-exec`，
理由码 `wizard`（逐字：「需多步交互（wizard）——先预览／确认再写库，非单条命令可达成」）。
「原样实跑」列＝把冻结 `main_prompt.cli` 原样交给 CLI 的实测退出码（链式串的 `→` 被当作参数）。

| 旧词（non-exec） | 场景 | 理由码 | 原样实跑 | 冻结 cli 形态 | key | 同 key 的 exec 入口 |
|---|---|---|---|---|---|---|
| 批量导入食品 | 02 | `wizard` | exit 2 | 多步链式串（含「→」） | —（无键） | — |
| 校验批量导入 | 02 | `wizard` | exit 2 | 多步链式串（含「→」） | —（无键） | — |
| 定营养目标(自动算) | 06 | `wizard` | exit 2 | 多步链式串（含「→」） | `calorie.view.goal-recommend` | 看目标推荐（`calorie.view.goal-recommend`） |
| 定饮水目标(自动算) | 06 | `wizard` | exit 2 | 多步链式串（含「→」） | `calorie.view.goal-recommend` | 看目标推荐（`calorie.view.goal-recommend`） |
| 一键定全套目标 | 06 | `wizard` | exit 2 | 多步链式串（含「→」） | `calorie.view.goal-recommend` | 看目标推荐（`calorie.view.goal-recommend`） |

### 2.3 FX-81-7 完整映射表：旧词 → 等价单命令（key ＋ 参数）→ 实跑 exit

口径：按冻结 `main_prompt.cli` 的脚本／模式／参数**机械派生**（家族级，不是逐词手写）：
`render_food_ranking.py --category X [--days N|--start/--end]` → `view.ranking`；
`render_analysis.py --view combined --pair X --window W` → `view.combined`；`--view anomaly --diagnose K` → `view.anomaly`；
`render_weight_history.py` → `view.weight-history`；`render_weight_compare.py --scenario aN` → `view.weight-compare`；
`render_exercise_summary/recap/trend/distribution` → `view.exercise`；`render_diet_review/review/nutrition_ratio` → `view.diet-review`；
`render_analysis.py --view report --kind full` → `view.health`；`render_weight_volatility_v2.py` → `view.volatility`；
`render_meal_distribution/diet_overview/today_meals` → `view.diet`；`render_body_*_view.py --mode trend` → `view.body-composition/measure`；
`render_analysis.py --view predict --kind weight_*` → `view.predict`；`render_weight_dashboard.py` → `view.weight` 等。
未映射的词逐条给「为何不可执行」（理由码 ＋ 逐字理由；理由码全文见 §1.1）。

| # | 旧词 | 旧链 cli（摘要） | 等价单命令（key ＋ 参数） | 实跑 exit | 未映射理由 |
|---|---|---|---|---|---|
| 13 | 拍营养表记一餐 | `mmx vision describe <图片> → python scripts/render_nutrition_label.py --ai-json <json> → 确认后 pytho` | — | — | `oosLabel`：明确不做（架构规格 docs/calorie-architecture.md:60：营养表）；词只保证命中与文案，执行层不承接（t71 O4 同项）。 |
| 14 | 拍营养表补记一餐 | `mmx vision describe <图片> → python scripts/render_nutrition_label.py --ai-json <json> --date <日期>` | — | — | `oosLabel`：明确不做（架构规格 docs/calorie-architecture.md:60：营养表）；词只保证命中与文案，执行层不承接（t71 O4 同项）。 |
| 24 | 看昨日饮食 | `python scripts/render_today_diet.py --date <昨天> --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-06","end":"2026-09-06"}'` | 0 | — |
| 25 | 看本周饮食 | `python scripts/render_today_meals.py --week current --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 26 | 看上周饮食 | `python scripts/render_today_meals.py --week last --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-31","end":"2026-09-06"}'` | 0 | — |
| 27 | 看本月饮食 | `python scripts/render_today_meals.py --month current --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 28 | 看上月饮食 | `python scripts/render_today_meals.py --month last --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-01","end":"2026-08-31"}'` | 0 | — |
| 29 | 看最近 7 天饮食 | `python scripts/render_today_meals.py --days 7 --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 30 | 看最近 30 天饮食 | `python scripts/render_today_meals.py --days 30 --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 31 | 看某段时间饮食 | `python scripts/render_today_meals.py --start <开始> --end <结束> --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 32 | 看今日喝水 | `python scripts/render_today_water.py --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.home --params '{"date":"2026-09-07"}'` | 0 | — |
| 33 | 看有备注的饮食记录 | `python scripts/render_today_meals.py --with-note --days <N> --chain "1.识别→2.读DB→3.渲染"` | — | — | `noNoteFilter`：77 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。 |
| 35 | 查食品（按分类） | `python scripts/render_food_search.py --category <分类>` | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` | 0 | — |
| 40 | 批量导入食品 | `python scripts/render_batch_import.py --input <preview.json> → 确认后 python scripts/batch_import.p` | — | — | `wizard`：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 41 | 校验批量导入 | `python scripts/batch_import.py validate <file.jsonl> --json-output <out.json> → python scripts/r` | — | — | `wizard`：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 42 | 看食品来源统计 | `python scripts/render_source_stats.py` | `calorie-cmd-read calorie.view.library --params '{"category":"蛋白类"}'` | 0 | — |
| 43 | 看营养结构 | `python scripts/render_nutrition_ratio.py --days 7 --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 44 | 看今日营养 | `python scripts/render_today_diet.py --mode nutrition --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 45 | 看饮食总览 | `python scripts/render_diet_overview.py --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 46 | 看营养素深度 | `python scripts/render_nutrition_detail.py --days 7 --chain "1.识别→2.读DB→3.渲染"` | — | — | `noNutrientDetail`：77 键无钠／糖／纤维等营养素明细维度（view.diet-review 的 macro 只有蛋白／碳水／脂肪配比），单命令不可达成。 |
| 47 | 看高热量榜 | `python scripts/render_food_ranking.py --category high_calorie --top-n 10 --days 7 --chain "1.识别→` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 48 | 看低热量榜 | `python scripts/render_food_ranking.py --category low_calorie --top-n 10 --days 7 --chain "1.识别→2` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 49 | 看频繁吃榜 | `python scripts/render_food_ranking.py --category frequent --top-n 10 --days 7 --chain "1.识别→2.读D` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 50 | 看高碳水榜 | `python scripts/render_food_ranking.py --category high_carb --top-n 10 --days 7 --chain "1.识别→2.读` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 51 | 看高蛋白榜 | `python scripts/render_food_ranking.py --category high_protein --top-n 10 --days 7 --chain "1.识别→` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 52 | 看全部排行榜 | `python scripts/render_food_ranking.py --all --top-n 10 --days <N> --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 53 | 看高热量榜（最近 30 天） | `python scripts/render_food_ranking.py --category high_calorie --top-n 10 --days 30 --chain "1.识别` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-08-09","end":"2026-09-07","topN":10}'` | 0 | — |
| 54 | 看高热量榜（本月） | `python scripts/render_food_ranking.py --category high_calorie --top-n 10 --start <月初> --end <月末>` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 55 | 看高热量榜（自定义） | `python scripts/render_food_ranking.py --category high_calorie --top-n 10 --start <开始> --end <结束>` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 56 | 看低热量榜（最近 30 天） | `python scripts/render_food_ranking.py --category low_calorie --top-n 10 --days 30 --chain "1.识别→` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-08-09","end":"2026-09-07","topN":10}'` | 0 | — |
| 57 | 看低热量榜（本月） | `python scripts/render_food_ranking.py --category low_calorie --top-n 10 --start <月初> --end <月末> ` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 58 | 看低热量榜（自定义） | `python scripts/render_food_ranking.py --category low_calorie --top-n 10 --start <开始> --end <结束> ` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 59 | 看频繁吃榜（最近 30 天） | `python scripts/render_food_ranking.py --category frequent --top-n 10 --days 30 --chain "1.识别→2.读` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-08-09","end":"2026-09-07","topN":10}'` | 0 | — |
| 60 | 看频繁吃榜（本月） | `python scripts/render_food_ranking.py --category frequent --top-n 10 --start <月初> --end <月末> --c` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 61 | 看频繁吃榜（自定义） | `python scripts/render_food_ranking.py --category frequent --top-n 10 --start <开始> --end <结束> --c` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 62 | 看高碳水榜（最近 30 天） | `python scripts/render_food_ranking.py --category high_carb --top-n 10 --days 30 --chain "1.识别→2.` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-08-09","end":"2026-09-07","topN":10}'` | 0 | — |
| 63 | 看高碳水榜（本月） | `python scripts/render_food_ranking.py --category high_carb --top-n 10 --start <月初> --end <月末> --` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 64 | 看高碳水榜（自定义） | `python scripts/render_food_ranking.py --category high_carb --top-n 10 --start <开始> --end <结束> --` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 65 | 看高蛋白榜（最近 30 天） | `python scripts/render_food_ranking.py --category high_protein --top-n 10 --days 30 --chain "1.识别` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-08-09","end":"2026-09-07","topN":10}'` | 0 | — |
| 66 | 看高蛋白榜（本月） | `python scripts/render_food_ranking.py --category high_protein --top-n 10 --start <月初> --end <月末>` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 67 | 看高蛋白榜（自定义） | `python scripts/render_food_ranking.py --category high_protein --top-n 10 --start <开始> --end <结束>` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 69 | 饮食复盘（本月） | `python scripts/render_diet_review.py --type month --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 70 | 饮食复盘（最近 90 天） | `python scripts/render_diet_review.py --type quarter --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 71 | 饮食复盘（今年） | `python scripts/render_diet_review.py --type year --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-01-01","end":"2026-09-07"}'` | 0 | — |
| 72 | 饮食复盘（自定义时间） | `python scripts/render_diet_review.py --type range --start <开始> --end <结束> --chain "1.识别→2.读DB→3.` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 73 | 看早餐（最近 7 天） | `python scripts/render_meal_distribution.py --meal breakfast --days 7 --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 74 | 看午餐（最近 7 天） | `python scripts/render_meal_distribution.py --meal breakfast --days 7 --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 75 | 看晚餐（最近 7 天） | `python scripts/render_meal_distribution.py --meal lunch --days 7 --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 76 | 看加餐（最近 7 天） | `python scripts/render_meal_distribution.py --meal dinner --days 7 --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 77 | 看全部餐别分布（最近 7 天） | `python scripts/render_meal_distribution.py --meal snack --days 7 --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.diet --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 78 | 看「有备注」的饮食记录 | `python scripts/render_today_meals.py --with-note --days <N> --chain "1.识别→2.读DB→3.渲染"` | — | — | `noNoteFilter`：77 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。 |
| 83 | 看今日体重 | `python scripts/render_weight_dashboard.py --view today --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.weight --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 89 | 看本周体重 | `python scripts/render_weight_history.py --mode history --week current` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 90 | 看上周体重 | `python scripts/render_weight_history.py --mode history --week last` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-31","end":"2026-09-06"}'` | 0 | — |
| 91 | 看本月体重 | `python scripts/render_weight_history.py --mode history --month current` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 92 | 看上月体重 | `python scripts/render_weight_history.py --mode history --month last` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-01","end":"2026-08-31"}'` | 0 | — |
| 93 | 看最近 7 天体重 | `python scripts/render_weight_history.py --mode history --days 7` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 94 | 看最近 90 天体重 | `python scripts/render_weight_history.py --mode history --days 90` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 95 | 看某段时间体重 | `python scripts/render_weight_history.py --mode history --start <S> --end <E>` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 96 | 看体重曲线 | `python scripts/render_weight_history.py --mode trend --days 30` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 97 | 看体重曲线（带目标） | `python scripts/render_weight_history.py --mode trend --days 30 --show-target` | — | — | `compoundCurve`：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。 |
| 98 | 看体重曲线（带里程碑） | `python scripts/render_weight_history.py --mode trend --days 30 --show-milestones` | — | — | `compoundCurve`：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。 |
| 99 | 看体重曲线（带异常点） | `python scripts/render_weight_history.py --mode trend --days 30 --show-anomalies` | — | — | `compoundCurve`：该词要的是「曲线＋标注」（目标线／里程碑／异常点）复合形态；view.weight-history 只给历史点与变化量，view.anomaly 只给异常点，无单键同形。 |
| 100 | 看本月体重曲线 | `python scripts/render_weight_history.py --mode trend --month current` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 101 | 看上月体重曲线 | `python scripts/render_weight_history.py --mode trend --month last` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-08-01","end":"2026-08-31"}'` | 0 | — |
| 102 | 看最近 90 天体重曲线 | `python scripts/render_weight_history.py --mode trend --days 90` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 103 | 看最近 180 天体重曲线 | `python scripts/render_weight_history.py --mode trend --days 180` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-03-12","end":"2026-09-07"}'` | 0 | — |
| 104 | 看最近 365 天体重曲线 | `python scripts/render_weight_history.py --mode trend --days 365` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2025-09-08","end":"2026-09-07"}'` | 0 | — |
| 105 | 看某段时间体重曲线 | `python scripts/render_weight_history.py --mode trend --start <S> --end <E>` | `calorie-cmd-read calorie.view.weight-history --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 106 | 看体重稳不稳（增强版） | `python scripts/render_weight_volatility_v2.py` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 107 | 看本月波动 | `python scripts/render_weight_volatility_v2.py --start <月初> --end <月末>` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 108 | 看最近 90 天波动 | `python scripts/render_weight_volatility_v2.py --days 90` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 109 | 看最近 180 天波动 | `python scripts/render_weight_volatility_v2.py --days 180` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-03-12","end":"2026-09-07"}'` | 0 | — |
| 110 | 看波动异常点 | `python scripts/render_weight_volatility_v2.py --view anomalies-only` | `calorie-cmd-read calorie.view.volatility --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 111 | 看「有备注」的体重记录 | `python scripts/render_weight_history.py --mode notes --days 30` | — | — | `noNoteFilter`：77 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。 |
| 112 | 对比体重：最近 30 天 vs 之前 30 天 | `python scripts/render_weight_compare.py --scenario a1 --chain "1.识别→2.读DB→3.对比→4.渲染"` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-08-09","end":"2026-09-07","compareStart":"2026-07-10","compareEnd":"2026-08-08"}'` | 0 | — |
| 113 | 对比体重：自定义两段时间 | `python scripts/render_weight_compare.py --scenario a2 --start-a <S1> --end-a <E1> --start-b <S2>` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-01","compareEnd":"2026-08-31"}'` | 0 | — |
| 114 | 对比体重：本周 vs 上周 | `python scripts/render_weight_compare.py --scenario a3 --chain "1.识别→2.读DB→3.对比→4.渲染"` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-08-31","compareEnd":"2026-09-06"}'` | 0 | — |
| 115 | 对比体重：本月 vs 上月 | `python scripts/render_weight_compare.py --scenario a4 --chain "1.识别→2.读DB→3.对比→4.渲染"` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-01","compareEnd":"2026-08-31"}'` | 0 | — |
| 116 | 对比体重：近 N 天 vs 上一个 N 天 | `python scripts/render_weight_compare.py --scenario a5 --n <N> --chain "1.识别→2.读DB→3.对比→4.渲染"` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-01","end":"2026-09-07","compareStart":"2026-08-25","compareEnd":"2026-08-31"}'` | 0 | — |
| 117 | 对比体重：今天 vs 一年前今天 | `python scripts/render_weight_compare.py --scenario a6 --chain "1.识别→2.读DB→3.对比→4.渲染"` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2025-09-07","compareEnd":"2025-09-07"}'` | 0 | — |
| 118 | 对比体重：今天 vs 半年前今天 | `python scripts/render_weight_compare.py --scenario a7 --chain "1.识别→2.读DB→3.对比→4.渲染"` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-03-07","compareEnd":"2026-03-07"}'` | 0 | — |
| 119 | 对比体重：今天 vs 三月前今天 | `python scripts/render_weight_compare.py --scenario a8 --chain "1.识别→2.读DB→3.对比→4.渲染"` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-09-07","end":"2026-09-07","compareStart":"2026-06-07","compareEnd":"2026-06-07"}'` | 0 | — |
| 120 | 对比体重：当前 vs 目标体重 | `python scripts/render_weight_compare.py --scenario b1 --chain "1.识别→2.读DB→3.对比→4.渲染"` | `calorie-cmd-read calorie.view.goal-weight --params '{"start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 121 | 对比体重：当前 vs 平台期首日 | `python scripts/render_weight_compare.py --scenario b8 --chain "1.识别→2.读DB→3.平台期识别→4.渲染"` | — | — | `anchorCompare`：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 122 | 对比体重：当前 vs 历史最低 | `python scripts/render_weight_compare.py --scenario e1 --chain "1.识别→2.读DB→3.对比→4.渲染"` | — | — | `anchorCompare`：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 123 | 对比体重：当前 vs 历史最高 | `python scripts/render_weight_compare.py --scenario e2 --chain "1.识别→2.读DB→3.对比→4.渲染"` | — | — | `anchorCompare`：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 124 | 对比体重：减重 5kg 那天 vs 今天 | `python scripts/render_weight_compare.py --scenario e3 --delta 5 --chain "1.识别→2.读DB→3.反查里程碑→4.渲染` | — | — | `anchorCompare`：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 125 | 对比体重：减重 10kg 那天 vs 今天 | `python scripts/render_weight_compare.py --scenario e3 --delta 10 --chain "1.识别→2.读DB→3.反查里程碑→4.渲` | — | — | `anchorCompare`：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 126 | 对比体重：当前 vs 入夏最低 | `python scripts/render_weight_compare.py --scenario e5 --chain "1.识别→2.读DB→3.季节定位→4.渲染"` | — | — | `anchorCompare`：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 127 | 对比体重：当前 vs 入冬最低 | `python scripts/render_weight_compare.py --scenario e6 --chain "1.识别→2.读DB→3.季节定位→4.渲染"` | — | — | `anchorCompare`：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 128 | 对比体重：运动多 vs 运动少的两个月 | `python scripts/render_weight_compare.py --scenario c5 --chain "1.识别→2.读DB→3.选极端月→4.渲染"` | — | — | `anchorCompare`：该词需先派生锚点日期（平台期首日／历史最低／历史最高／里程碑日／季节最低／极端月）再对比；view.weight-compare 的四个参数皆为调用方给出的日期段，无锚点派生参数，单命令不可达成。 |
| 129 | 对比体重：工作日 vs 周末 | `python scripts/render_weight_compare.py --scenario d4 --chain "1.识别→2.读DB→3.周内聚合→4.渲染"` | `calorie-cmd-read calorie.view.weight-compare --params '{"start":"2026-08-31","end":"2026-09-04","compareStart":"2026-09-05","compareEnd":"2026-09-07"}'` | 0 | — |
| 130 | 看体重总览 | `python scripts/render_weight_dashboard.py --view overview --chain "1.识别→2.读DB→3.渲染"` | `calorie-cmd-read calorie.view.weight --params '{"start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 131 | 体重复盘（本周） | `python scripts/render_weight_review.py --type week --chain "1.识别→2.读DB→3.复盘→4.渲染"` | — | — | `reviewWindowOnly`：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 132 | 体重复盘（本月） | `python scripts/render_weight_review.py --type month --chain "1.识别→2.读DB→3.复盘→4.渲染"` | — | — | `reviewWindowOnly`：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 133 | 体重复盘（最近 90 天） | `python scripts/render_weight_review.py --type 90d --chain "1.识别→2.读DB→3.复盘→4.渲染"` | — | — | `reviewWindowOnly`：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 134 | 体重复盘（今年） | `python scripts/render_weight_review.py --type year --chain "1.识别→2.读DB→3.复盘→4.渲染"` | — | — | `reviewWindowOnly`：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 135 | 体重复盘（自定义时间） | `python scripts/render_weight_review.py --start <S> --end <E> --chain "1.识别→2.读DB→3.复盘→4.渲染"` | — | — | `reviewWindowOnly`：view.weight-review 只吃 today／date（复核形态），无期间窗口参数；view.weight-history 为历史点＋变化量，非复盘形态 → 期间复盘无单命令同形。 |
| 136 | 看里程碑回溯 | `python scripts/render_weight_review.py --type milestones --chain "1.识别→2.读DB→3.回溯→4.渲染"` | — | — | `milestoneForwardOnly`：view.weight-review 的 milestone 是「目标达成预测」（estDays／estDate 前向），不是里程碑回溯列表 → 无单命令同形。 |
| 150 | 看今日运动 | `python scripts/render_exercise_summary.py --mode records --today` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 151 | 看昨日运动 | `python scripts/render_exercise_summary.py --mode records --yesterday` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-06","end":"2026-09-06"}'` | 0 | — |
| 152 | 看本周运动 | `python scripts/render_exercise_summary.py --mode summary --week` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 153 | 看上周运动 | `python scripts/render_exercise_summary.py --mode summary --last-week` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-31","end":"2026-09-06"}'` | 0 | — |
| 154 | 看本月运动 | `python scripts/render_exercise_summary.py --mode summary --month` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 155 | 看上月运动 | `python scripts/render_exercise_summary.py --mode summary --last-month` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-01","end":"2026-08-31"}'` | 0 | — |
| 156 | 看最近 7 天运动 | `python scripts/render_exercise_summary.py --mode summary --days 7` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 157 | 看最近 30 天运动 | `python scripts/render_exercise_summary.py --mode summary --days 30` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 158 | 看某段时间运动 | `python scripts/render_exercise_summary.py --mode summary --from <F> --to <T>` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 159 | 看今日运动（vs 目标） | `python scripts/render_exercise_goal_view.py --period today` | `calorie-cmd-read calorie.view.exercise-goal --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 160 | 看本周运动（vs 目标） | `python scripts/render_exercise_goal_view.py --period week` | `calorie-cmd-read calorie.view.exercise-goal --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 161 | 看运动记录（有备注） | `python scripts/render_exercise_summary.py --mode records --has-note` | — | — | `noNoteFilter`：77 键无「备注」筛选参数（饮食／体重／运动三面的备注均非任何键的筛选维度），单命令不可达成（逐条见 docs/research/t81-route-evidence.md §2.3）。 |
| 162 | 看运动记录（按力量筛选） | `python scripts/render_exercise_summary.py --mode records --category 力量` | — | — | `recordFilterMissing`：77 键无运动记录级列表／筛选参数（view.exercise 是汇总盘：byType／byCategory 为分项统计，不含逐条记录与备注筛选）。 |
| 163 | 看运动记录（按有氧筛选） | `python scripts/render_exercise_summary.py --mode records --category 有氧` | — | — | `recordFilterMissing`：77 键无运动记录级列表／筛选参数（view.exercise 是汇总盘：byType／byCategory 为分项统计，不含逐条记录与备注筛选）。 |
| 164 | 看最近 60 天运动 | `python scripts/render_exercise_summary.py --mode summary --days 60` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-07-10","end":"2026-09-07"}'` | 0 | — |
| 165 | 看最近 180 天运动 | `python scripts/render_exercise_summary.py --mode summary --days 180 --downsample 3` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-03-12","end":"2026-09-07"}'` | 0 | — |
| 166 | 看最近 365 天运动 | `python scripts/render_exercise_summary.py --mode summary --days 365 --downsample week` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2025-09-08","end":"2026-09-07"}'` | 0 | — |
| 167 | 看运动类型分布 | `python scripts/render_exercise_distribution.py --mode distribution` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 168 | 看力量训练总览 | `python scripts/render_exercise_strength.py` | — | — | `categoryOverviewMissing`：view.exercise 无 category 参数（分项统计按运动类型 byType 渲染 TOP4，byCategory 未渲染，力量／有氧非独立形态），无单命令同形。 |
| 169 | 看有氧训练总览 | `python scripts/render_exercise_cardio.py` | — | — | `categoryOverviewMissing`：view.exercise 无 category 参数（分项统计按运动类型 byType 渲染 TOP4，byCategory 未渲染，力量／有氧非独立形态），无单命令同形。 |
| 170 | 看运动趋势 | `python scripts/render_exercise_trend.py [--days 30]` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 171 | 运动复盘（本周） | `python scripts/render_exercise_recap.py --period week` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 172 | 运动复盘（本月） | `python scripts/render_exercise_recap.py --period month` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 173 | 运动复盘（最近 90 天） | `python scripts/render_exercise_recap.py --period 90d` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 174 | 运动复盘（今年） | `python scripts/render_exercise_recap.py --period year` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-01-01","end":"2026-09-07"}'` | 0 | — |
| 175 | 运动复盘（自定义时间） | `python scripts/render_exercise_recap.py --period range --from <F> --to <T>` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 176 | 看本周计划 | `python scripts/render_workout_plan.py --week <N>` | — | — | `planFilterMissing`：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 177 | 看下周计划 | `python scripts/render_workout_plan.py --week <N+1>` | — | — | `planFilterMissing`：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 178 | 看上周计划 | `python scripts/render_workout_plan.py --week <N-1>` | — | — | `planFilterMissing`：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 179 | 看指定周计划 | `python scripts/render_workout_plan.py --week <N>` | — | — | `planFilterMissing`：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 180 | 看今天练什么 | `python scripts/render_workout_plan.py --today` | — | — | `planFilterMissing`：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 181 | 看某动作安排 | `python scripts/render_workout_plan.py --mode action --name <动作>` | — | — | `planFilterMissing`：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 182 | 看某天练什么 | `python scripts/render_workout_plan.py --mode day --start <D>` | — | — | `planFilterMissing`：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 183 | 看计划概览 | `python scripts/render_workout_plan.py --overview` | `calorie-cmd-read calorie.view.plan` | 0 | — |
| 185 | 看计划 vs 实际 | `python scripts/render_workout_plan.py --vs-actual --start <D1> --end <D2>` | — | — | `planFilterMissing`：view.plan 无周／日／动作筛选参数（返回全计划），与词的周／日／动作粒度不同 → 无单命令同形。 |
| 186 | 定训练计划 | `python scripts/render_plan_receipt.py --live-plan-set --plan-json <JSON> --chain "1.采访→2.预览确认→3.` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 187 | 复制训练计划 | `python scripts/render_plan_receipt.py --live-plan-copy [--new-title <T>] --chain "1.读当前计划→2.复制→3` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 188 | 定休息日 | `python scripts/render_plan_receipt.py --live-plan-rest --week <W> --day <D> --rest <1\|0> --chain` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 189 | 加训练动作 | `python scripts/render_plan_receipt.py --live-plan-add --week <W> --day <D> --name <动作> --sets <N` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 190 | 定一周计划 | `python scripts/render_plan_receipt.py --live-plan-set-week --week <W> --days-json <JSON> --chain` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 191 | 改训练计划 | `python scripts/render_plan_receipt.py --live-plan-update --field <X> --value <Y> --chain "1.读旧值→` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 192 | 改某天训练 | `python scripts/render_plan_receipt.py --live-plan-update-day --week <W> --day <D> --session <S> ` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 193 | 删某天训练 | `python scripts/render_plan_receipt.py --live-plan-delete-day --week <W> --day <D> --chain "1.快照→` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 194 | 改动作 | `python scripts/render_plan_receipt.py --live-plan-update-movement --week <W> --day <D> --session` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 195 | 撤销训练计划 | `python scripts/render_plan_receipt.py --live-plan-delete --chain "1.概要→2.确认→3.删除→4.回执"` | — | — | `planWriteMissing`：77 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。 |
| 196 | 落地训练 | `python scripts/sync_plan.py --days 1` | — | — | `oosLanding`：明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。 |
| 197 | 落地到本周末 | `python scripts/sync_plan.py --days <N>` | — | — | `oosLanding`：明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。 |
| 198 | 落地到本月底 | `python scripts/sync_plan.py --days <N>` | — | — | `oosLanding`：明确不做（架构规格 docs/calorie-architecture.md:60：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4，差异见 T71_DIFFS）。 |
| 199 | 同步到训记 | `python scripts/render_plan_receipt.py --live-plan-sync --date <D> --chain "1.审计动作名→2.推送→3.回执"` | — | — | `oosXunji`：明确不做（架构规格 docs/calorie-architecture.md:60：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项）。 |
| 200 | 拉训记实绩 | `python scripts/render_plan_receipt.py --live-plan-backfill --date <D> --chain "1.拉取→2.回写→3.回执"` | — | — | `oosXunji`：明确不做（架构规格 docs/calorie-architecture.md:60：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项）。 |
| 201 | 计划复盘（本周） | `python scripts/render_exercise_review_html.py --days 7` | — | — | `planReviewMissing`：77 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。 |
| 202 | 计划复盘（本月） | `python scripts/render_exercise_review_html.py --start <D1> --end <D2>` | — | — | `planReviewMissing`：77 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。 |
| 203 | 计划复盘（全部） | `python scripts/render_exercise_review_html.py --start <D1> --end <D2>` | — | — | `planReviewMissing`：77 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。 |
| 204 | 看计划完成率 | `python scripts/render_workout_plan.py --completion` | — | — | `planReviewMissing`：77 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。 |
| 205 | 看未完成训练 | `python scripts/render_workout_plan.py --missed --days <N>` | — | — | `planReviewMissing`：77 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。 |
| 206 | 看动作完成率 | `python scripts/render_workout_plan.py --movement-rate --days <N>` | — | — | `planReviewMissing`：77 键无计划完成率／未完成训练／动作完成率入口（view.exercise-goal 只对照运动目标，不对照训练计划）→ 无单命令同形。 |
| 209 | 定营养目标(自动算) | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}' → 确认后 calorie-cmd-read` | — | — | `wizard`：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 214 | 定饮水目标(自动算) | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}' → 确认后 calorie-cmd-read` | — | — | `wizard`：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 215 | 一键定全套目标 | `calorie-cmd-read calorie.view.goal-recommend --params '{"profile":"cut"}' → 确认后依次 calorie-cmd-re` | — | — | `wizard`：需多步交互（wizard）——先预览／确认再写库，非单条命令可达成（归 #86）。 |
| 232 | 看目标预测达成 | `python scripts/render_goal_progress.py --mode predict` | `calorie-cmd-read calorie.view.goal-predict --params '{"start":"2026-08-25","end":"2026-09-07"}'` | 0 | — |
| 237 | 记体脂（皮褶钳） | `calorie-cmd-read calorie.body.composition-add --params '{"source":"home_caliper","bodyFatPct":18` | `calorie-cmd-read calorie.body.composition-add --params '{"source":"home_caliper","bodyFatPct":18.5,"date":"2026-09-06","caliper_chest_mm":10,"caliper_abdominal_mm":12,"caliper_thigh_mm":14,"caliper_tricep_mm":11,"caliper_subscapular_mm":13,"caliper_suprailiac_mm":12,"caliper_midaxillary_mm":10}'` | 0 | — |
| 243 | 看体脂趋势 | `python scripts/render_body_composition_view.py --mode trend --source <默认最近来源> --days 90 --chain ` | `calorie-cmd-read calorie.view.body-composition --params '{"days":90}'` | 0 | — |
| 245 | 看围度趋势 | `python scripts/render_body_measurements_view.py --mode trend --metric <部位> --days 90 --chain "1.` | `calorie-cmd-read calorie.view.body-measure --params '{"days":90}'` | 0 | — |
| 246 | 对比体脂 | `python scripts/render_body_composition_view.py --mode compare --start1 <D1> --end1 <D2> --start2` | — | — | `bodyCompareMissing`：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。 |
| 247 | 对比围度 | `python scripts/render_body_measurements_view.py --mode compare --date1 <D1> --date2 <D2> --chain` | — | — | `bodyCompareMissing`：view.body-composition／view.body-measure 只有 days／source／limit／metric 等参数，无两期对比参数 → 无单命令同形（渲染层已有 buildBodyCompositionCompare／buildBodyMeasureCompare：render/bodyPlate.ts:49／:112，经 render/index.ts:25 导出，但 CLI 侧未接线）。 |
| 261 | 看体重 vs 摄入(最近 15 天) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window 15d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"15d"}'` | 0 | — |
| 262 | 看体重 vs 摄入(最近 30 天) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"30d"}'` | 0 | — |
| 263 | 看体重 vs 摄入(最近 60 天) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window 60d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"60d"}'` | 0 | — |
| 264 | 看体重 vs 摄入(最近 90 天) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"90d"}'` | 0 | — |
| 265 | 看体重 vs 摄入(最近 180 天) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window 180d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"180d"}'` | 0 | — |
| 266 | 看体重 vs 摄入(最近 365 天) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window 365d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"365d"}'` | 0 | — |
| 267 | 看体重 vs 摄入(本周) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window week_cur` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"week_cur"}'` | 0 | — |
| 268 | 看体重 vs 摄入(本月) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window month_cur` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"month_cur"}'` | 0 | — |
| 269 | 看体重 vs 摄入(自定义) | `python scripts/render_analysis.py --view combined --pair weight_calorie --window custom --start ` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_calorie","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 270 | 看体重 vs 运动(最近 7 天) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window 7d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"7d"}'` | 0 | — |
| 271 | 看体重 vs 运动(最近 15 天) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window 15d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"15d"}'` | 0 | — |
| 272 | 看体重 vs 运动(最近 30 天) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"30d"}'` | 0 | — |
| 273 | 看体重 vs 运动(最近 60 天) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window 60d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"60d"}'` | 0 | — |
| 274 | 看体重 vs 运动(最近 90 天) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"90d"}'` | 0 | — |
| 275 | 看体重 vs 运动(最近 180 天) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window 180d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"180d"}'` | 0 | — |
| 276 | 看体重 vs 运动(最近 365 天) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window 365d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"365d"}'` | 0 | — |
| 277 | 看体重 vs 运动(本周) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window week_cur` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"week_cur"}'` | 0 | — |
| 278 | 看体重 vs 运动(本月) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window month_cur` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"month_cur"}'` | 0 | — |
| 279 | 看体重 vs 运动(自定义) | `python scripts/render_analysis.py --view combined --pair weight_exercise --window custom --start` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_exercise","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 280 | 看体重 vs 蛋白(最近 7 天) | `python scripts/render_analysis.py --view combined --pair weight_protein --window 7d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"7d"}'` | 0 | — |
| 281 | 看体重 vs 蛋白(最近 15 天) | `python scripts/render_analysis.py --view combined --pair weight_protein --window 15d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"15d"}'` | 0 | — |
| 282 | 看体重 vs 蛋白(最近 30 天) | `python scripts/render_analysis.py --view combined --pair weight_protein --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"30d"}'` | 0 | — |
| 283 | 看体重 vs 蛋白(最近 60 天) | `python scripts/render_analysis.py --view combined --pair weight_protein --window 60d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"60d"}'` | 0 | — |
| 284 | 看体重 vs 蛋白(最近 90 天) | `python scripts/render_analysis.py --view combined --pair weight_protein --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"90d"}'` | 0 | — |
| 285 | 看体重 vs 蛋白(最近 180 天) | `python scripts/render_analysis.py --view combined --pair weight_protein --window 180d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"180d"}'` | 0 | — |
| 286 | 看体重 vs 蛋白(最近 365 天) | `python scripts/render_analysis.py --view combined --pair weight_protein --window 365d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"365d"}'` | 0 | — |
| 287 | 看体重 vs 蛋白(本周) | `python scripts/render_analysis.py --view combined --pair weight_protein --window week_cur` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"week_cur"}'` | 0 | — |
| 288 | 看体重 vs 蛋白(本月) | `python scripts/render_analysis.py --view combined --pair weight_protein --window month_cur` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"month_cur"}'` | 0 | — |
| 289 | 看体重 vs 蛋白(自定义) | `python scripts/render_analysis.py --view combined --pair weight_protein --window custom --start ` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_protein","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 290 | 看体重 vs 缺口(最近 7 天) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window 7d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"7d"}'` | 0 | — |
| 291 | 看体重 vs 缺口(最近 15 天) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window 15d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"15d"}'` | 0 | — |
| 292 | 看体重 vs 缺口(最近 30 天) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"30d"}'` | 0 | — |
| 293 | 看体重 vs 缺口(最近 60 天) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window 60d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"60d"}'` | 0 | — |
| 294 | 看体重 vs 缺口(最近 90 天) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"90d"}'` | 0 | — |
| 295 | 看体重 vs 缺口(最近 180 天) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window 180d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"180d"}'` | 0 | — |
| 296 | 看体重 vs 缺口(最近 365 天) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window 365d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"365d"}'` | 0 | — |
| 297 | 看体重 vs 缺口(本周) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window week_cur` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"week_cur"}'` | 0 | — |
| 298 | 看体重 vs 缺口(本月) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window month_cur` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"month_cur"}'` | 0 | — |
| 299 | 看体重 vs 缺口(自定义) | `python scripts/render_analysis.py --view combined --pair weight_deficit --window custom --start ` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_deficit","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 300 | 看摄入 vs 运动(最近 7 天) | `python scripts/render_analysis.py --view combined --pair calorie_exercise --window 7d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"7d"}'` | 0 | — |
| 301 | 看摄入 vs 运动(最近 30 天) | `python scripts/render_analysis.py --view combined --pair calorie_exercise --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"30d"}'` | 0 | — |
| 302 | 看摄入 vs 运动(最近 90 天) | `python scripts/render_analysis.py --view combined --pair calorie_exercise --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"90d"}'` | 0 | — |
| 303 | 看摄入 vs 运动(最近 180 天) | `python scripts/render_analysis.py --view combined --pair calorie_exercise --window 180d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"180d"}'` | 0 | — |
| 304 | 看摄入 vs 运动(最近 365 天) | `python scripts/render_analysis.py --view combined --pair calorie_exercise --window 365d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"365d"}'` | 0 | — |
| 305 | 看摄入 vs 运动(自定义) | `python scripts/render_analysis.py --view combined --pair calorie_exercise --window custom --star` | `calorie-cmd-read calorie.view.combined --params '{"pair":"calorie_exercise","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 306 | 看体重 vs 体脂(最近 7 天) | `python scripts/render_analysis.py --view combined --pair weight_bodyfat --window 7d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"7d"}'` | 0 | — |
| 307 | 看体重 vs 体脂(最近 30 天) | `python scripts/render_analysis.py --view combined --pair weight_bodyfat --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"30d"}'` | 0 | — |
| 308 | 看体重 vs 体脂(最近 90 天) | `python scripts/render_analysis.py --view combined --pair weight_bodyfat --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"90d"}'` | 0 | — |
| 309 | 看体重 vs 体脂(最近 180 天) | `python scripts/render_analysis.py --view combined --pair weight_bodyfat --window 180d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"180d"}'` | 0 | — |
| 310 | 看体重 vs 体脂(最近 365 天) | `python scripts/render_analysis.py --view combined --pair weight_bodyfat --window 365d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"365d"}'` | 0 | — |
| 311 | 看体重 vs 体脂(自定义) | `python scripts/render_analysis.py --view combined --pair weight_bodyfat --window custom --start ` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_bodyfat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 312 | 看体重 vs 围度(最近 7 天) | `python scripts/render_analysis.py --view combined --pair weight_waist --window 7d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"7d"}'` | 0 | — |
| 313 | 看体重 vs 围度(最近 30 天) | `python scripts/render_analysis.py --view combined --pair weight_waist --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"30d"}'` | 0 | — |
| 314 | 看体重 vs 围度(最近 90 天) | `python scripts/render_analysis.py --view combined --pair weight_waist --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"90d"}'` | 0 | — |
| 315 | 看体重 vs 围度(最近 180 天) | `python scripts/render_analysis.py --view combined --pair weight_waist --window 180d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"180d"}'` | 0 | — |
| 316 | 看体重 vs 围度(最近 365 天) | `python scripts/render_analysis.py --view combined --pair weight_waist --window 365d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"365d"}'` | 0 | — |
| 317 | 看体重 vs 围度(自定义) | `python scripts/render_analysis.py --view combined --pair weight_waist --window custom --start <开` | `calorie-cmd-read calorie.view.combined --params '{"pair":"weight_waist","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 318 | 看饮水 vs 体重(最近 30 天) | `python scripts/render_analysis.py --view combined --pair water_weight --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"30d"}'` | 0 | — |
| 319 | 看饮水 vs 体重(自定义) | `python scripts/render_analysis.py --view combined --pair water_weight --window custom --start <开` | `calorie-cmd-read calorie.view.combined --params '{"pair":"water_weight","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 321 | 看健康报告(上周) | `python scripts/render_analysis.py --view report --kind full --window week_prev` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-31","end":"2026-09-06"}'` | 0 | — |
| 322 | 看健康报告(最近 7 天) | `python scripts/render_analysis.py --view report --kind full --window 7d` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 323 | 看健康报告(最近 30 天) | `python scripts/render_analysis.py --view report --kind full --window 30d` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 324 | 看健康报告(最近 90 天) | `python scripts/render_analysis.py --view report --kind full --window 90d` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 325 | 看健康报告(最近 180 天) | `python scripts/render_analysis.py --view report --kind full --window 180d` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-03-12","end":"2026-09-07"}'` | 0 | — |
| 326 | 看健康报告(最近 365 天) | `python scripts/render_analysis.py --view report --kind full --window 365d` | `calorie-cmd-read calorie.view.health --params '{"start":"2025-09-08","end":"2026-09-07"}'` | 0 | — |
| 327 | 看健康报告(本月) | `python scripts/render_analysis.py --view report --kind full --window month_cur` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 328 | 看健康报告(上月) | `python scripts/render_analysis.py --view report --kind full --window month_prev` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-08-01","end":"2026-08-31"}'` | 0 | — |
| 329 | 看健康报告(今年) | `python scripts/render_analysis.py --view report --kind full --window year_cur` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-01-01","end":"2026-09-07"}'` | 0 | — |
| 330 | 看健康报告(自定义) | `python scripts/render_analysis.py --view report --kind full --window custom --start <开始日期> --end` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 331 | 看BMI报告 | `python scripts/render_analysis.py --view report --kind bmi --window 90d` | — | — | `reportKindMissing`：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 332 | 看TDEE报告 | `python scripts/render_analysis.py --view report --kind tdee --window 30d` | — | — | `reportKindMissing`：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 333 | 看BMR报告 | `python scripts/render_analysis.py --view report --kind bmr --window 30d` | — | — | `reportKindMissing`：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 334 | 看蛋白质摄入报告 | `python scripts/render_analysis.py --view report --kind protein --window 30d` | — | — | `reportKindMissing`：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 335 | 看水分摄入报告 | `python scripts/render_analysis.py --view report --kind water --window 30d` | — | — | `reportKindMissing`：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 336 | 看综合评分 | `python scripts/render_analysis.py --view report --kind score --window 30d` | — | — | `reportKindMissing`：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 337 | 看健康趋势 | `python scripts/render_analysis.py --view report --kind trend --window 90d` | — | — | `reportKindMissing`：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 338 | 看健康报告(含对比) | `python scripts/render_analysis.py --view report --kind compare --window 本周` | — | — | `reportKindMissing`：旧链 report --kind 的 BMI／TDEE／BMR／蛋白／水分／评分／趋势／对比属「报告子形态」，77 键内无同形报告键（view.health 只有 full 健康盘；TDEE／BMR 仅作为 view.goal-recommend 推荐盘的依据字段出现，非报告产物）。 |
| 339 | 看整体趋势(体重+摄入+运动) | `python scripts/render_analysis.py --view trend --group g1 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 340 | 看整体趋势(体重+体脂+围度) | `python scripts/render_analysis.py --view trend --group g2 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 341 | 看整体趋势(饮食+蛋白+纤维) | `python scripts/render_analysis.py --view trend --group g3 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 342 | 看整体趋势(运动+力量+有氧) | `python scripts/render_analysis.py --view trend --group g4 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 343 | 看整体趋势(BMI+体脂+肌肉量) | `python scripts/render_analysis.py --view trend --group g5 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 344 | 看整体趋势(摄入+蛋白+运动) | `python scripts/render_analysis.py --view trend --group g6 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 345 | 看整体趋势(体重+蛋白+缺口) | `python scripts/render_analysis.py --view trend --group g7 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 346 | 看整体趋势(体重+摄入+缺口) | `python scripts/render_analysis.py --view trend --group g8 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 347 | 看整体趋势(体重+摄入+运动+缺口) | `python scripts/render_analysis.py --view trend --group g9 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 348 | 看整体趋势(蛋白+运动) | `python scripts/render_analysis.py --view trend --group g10 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 349 | 看整体趋势(综合多指标) | `python scripts/render_analysis.py --view trend --group g11 --window 90d` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 350 | 看整体趋势(含月度对比) | `python scripts/render_analysis.py --view trend --group g11 --window 60d --period monthly` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 351 | 看整体趋势(含季度对比) | `python scripts/render_analysis.py --view trend --group g11 --window 180d --period quarterly` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 352 | 看整体趋势(含年度对比) | `python scripts/render_analysis.py --view trend --group g11 --window 730d --period yearly` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 353 | 看整体趋势(含目标对比) | `python scripts/render_analysis.py --view trend --group g11 --window 90d --period target` | — | — | `multiTrendMissing`：77 键无多指标趋势键（view.combined 只吃两指标配对，旧链 trend --group g1–g11 为 2–4 指标组合）→ 无单命令同形。 |
| 354 | 诊断体重波动原因 | `python scripts/render_analysis.py --view anomaly --diagnose weight_volatility --window 90d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_volatility","start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 355 | 诊断体重停滞(含平台期判断) | `python scripts/render_analysis.py --view anomaly --diagnose weight_plateau --window 90d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_plateau","start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 356 | 诊断体重反弹 | `python scripts/render_analysis.py --view anomaly --diagnose weight_rebound --window 90d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_rebound","start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 357 | 诊断体重下降原因 | `python scripts/render_analysis.py --view anomaly --diagnose weight_loss_cause --window 90d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_loss_cause","start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 359 | 诊断体重vs体脂围度背离 | `python scripts/render_analysis.py --view anomaly --diagnose weight_divergence --window 180d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"weight_divergence","start":"2026-03-12","end":"2026-09-07"}'` | 0 | — |
| 360 | 诊断饮食超标 | `python scripts/render_analysis.py --view anomaly --diagnose diet_over --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_over","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 361 | 诊断饮食不足 | `python scripts/render_analysis.py --view anomaly --diagnose diet_under --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_under","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 362 | 诊断营养不均衡(含均衡判断) | `python scripts/render_analysis.py --view anomaly --diagnose diet_unbalanced --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_unbalanced","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 363 | 诊断饮食结构问题 | `python scripts/render_analysis.py --view anomaly --diagnose diet_structure --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"diet_structure","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 364 | 诊断运动不足 | `python scripts/render_analysis.py --view anomaly --diagnose exercise_insufficient --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_insufficient","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 365 | 诊断运动过量 | `python scripts/render_analysis.py --view anomaly --diagnose exercise_overload --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_overload","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 366 | 诊断运动类型失衡 | `python scripts/render_analysis.py --view anomaly --diagnose exercise_type_imbalance --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_type_imbalance","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 367 | 诊断运动效率(含有效判断) | `python scripts/render_analysis.py --view anomaly --diagnose exercise_efficiency --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_efficiency","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 368 | 诊断运动建议(含类型推荐) | `python scripts/render_analysis.py --view anomaly --diagnose exercise_advice --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"exercise_advice","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 369 | 为什么我没瘦 | `python scripts/render_analysis.py --view anomaly --diagnose why_not_losing --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_not_losing","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 370 | 为什么我瘦太快 | `python scripts/render_analysis.py --view anomaly --diagnose why_losing_fast --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"why_losing_fast","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 371 | 我的减重速度合理吗 | `python scripts/render_analysis.py --view anomaly --diagnose rate_reasonable --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"rate_reasonable","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 374 | 我这个月做得好的 | `python scripts/render_analysis.py --view anomaly --diagnose month_highlights --window 本月` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_highlights","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 375 | 我这个月需要改的 | `python scripts/render_analysis.py --view anomaly --diagnose month_improve --window 本月` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"month_improve","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 376 | 综合健康评估 | `python scripts/render_analysis.py --view anomaly --diagnose overall --window 30d` | `calorie-cmd-read calorie.view.anomaly --params '{"kind":"overall","start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 377 | 看蛋白 vs 碳水(最近 7 天) | `python scripts/render_analysis.py --view combined --pair protein_carbs --window 7d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"7d"}'` | 0 | — |
| 378 | 看蛋白 vs 碳水(最近 30 天) | `python scripts/render_analysis.py --view combined --pair protein_carbs --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"30d"}'` | 0 | — |
| 379 | 看蛋白 vs 碳水(最近 90 天) | `python scripts/render_analysis.py --view combined --pair protein_carbs --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"90d"}'` | 0 | — |
| 380 | 看蛋白 vs 碳水(自定义) | `python scripts/render_analysis.py --view combined --pair protein_carbs --window custom --start <` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_carbs","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 381 | 看蛋白 vs 脂肪(最近 30 天) | `python scripts/render_analysis.py --view combined --pair protein_fat --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"30d"}'` | 0 | — |
| 382 | 看蛋白 vs 脂肪(最近 90 天) | `python scripts/render_analysis.py --view combined --pair protein_fat --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"90d"}'` | 0 | — |
| 383 | 看蛋白 vs 脂肪(自定义) | `python scripts/render_analysis.py --view combined --pair protein_fat --window custom --start <开始` | `calorie-cmd-read calorie.view.combined --params '{"pair":"protein_fat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 384 | 看碳水 vs 脂肪(最近 30 天) | `python scripts/render_analysis.py --view combined --pair carbs_fat --window 30d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"30d"}'` | 0 | — |
| 385 | 看碳水 vs 脂肪(最近 90 天) | `python scripts/render_analysis.py --view combined --pair carbs_fat --window 90d` | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"90d"}'` | 0 | — |
| 386 | 看碳水 vs 脂肪(自定义) | `python scripts/render_analysis.py --view combined --pair carbs_fat --window custom --start <开始日期` | `calorie-cmd-read calorie.view.combined --params '{"pair":"carbs_fat","window":"custom","start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 387 | 看钠糖纤维趋势 | `python scripts/render_analysis.py --view nutrition --group sodium_fiber --window 90d` | — | — | `noNutrientDetail`：77 键无钠／糖／纤维等营养素明细维度（view.diet-review 的 macro 只有蛋白／碳水／脂肪配比），单命令不可达成。 |
| 388 | 看钠糖纤维综合 | `python scripts/render_analysis.py --view nutrition --group sodium_combined --window 90d` | — | — | `noNutrientDetail`：77 键无钠／糖／纤维等营养素明细维度（view.diet-review 的 macro 只有蛋白／碳水／脂肪配比），单命令不可达成。 |
| 389 | 看营养建议 | `python scripts/render_analysis.py --view nutrition --group advice --window 30d` | — | — | `noNutritionAdvice`：77 键无营养建议形态（view.diet-review／view.health 给数据盘，不给建议条目）。 |
| 390 | 看三大营养交叉(最近 30 天) | `python scripts/render_analysis.py --view nutrition --group macro3 --window 30d` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-08-09","end":"2026-09-07"}'` | 0 | — |
| 391 | 看三大营养交叉(最近 90 天) | `python scripts/render_analysis.py --view nutrition --group macro3 --window 90d` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-06-10","end":"2026-09-07"}'` | 0 | — |
| 392 | 看三大营养交叉(自定义) | `python scripts/render_analysis.py --view nutrition --group macro3 --window custom --start <开始日期>` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 394 | 预测体重(1 月后) | `python scripts/render_analysis.py --view predict --kind weight_month` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":30}'` | 0 | — |
| 395 | 预测体重(3 月后) | `python scripts/render_analysis.py --view predict --kind weight_3m` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":90}'` | 0 | — |
| 396 | 预测体重(6 月后) | `python scripts/render_analysis.py --view predict --kind weight_6m` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":180}'` | 0 | — |
| 397 | 预测体重(自定义时间) | `python scripts/render_analysis.py --view predict --kind weight_custom_t --days <天数>` | `calorie-cmd-read calorie.view.predict --params '{"start":"2026-08-25","end":"2026-09-07","horizonDays":60}'` | 0 | — |
| 398 | 预测体重(自定义目标) | `python scripts/render_analysis.py --view predict --kind weight_target --target <目标kg>` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 399 | 模拟减重(每天-300卡) | `python scripts/render_analysis.py --view predict --kind sim_cut_300` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 400 | 模拟减重(每天-500卡) | `python scripts/render_analysis.py --view predict --kind sim_cut_500` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 401 | 模拟减重(每天-700卡) | `python scripts/render_analysis.py --view predict --kind sim_cut_700` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 402 | 模拟减重(30天减Xkg) | `python scripts/render_analysis.py --view predict --kind sim_target_30 --target <Xkg>` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 403 | 模拟减重(60天减Xkg) | `python scripts/render_analysis.py --view predict --kind sim_target_60 --target <Xkg>` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 404 | 模拟减重(90天减Xkg) | `python scripts/render_analysis.py --view predict --kind sim_target_90 --target <Xkg>` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 405 | 模拟减重(自定义天数减Xkg) | `python scripts/render_analysis.py --view predict --kind sim_target_custom --target <Xkg> --days ` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 406 | 摄入预测(按当前速率 1 周) | `python scripts/render_analysis.py --view predict --kind cal_week` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 407 | 摄入预测(按当前速率 1 月) | `python scripts/render_analysis.py --view predict --kind cal_month` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 408 | 摄入预测(按当前速率 3 月) | `python scripts/render_analysis.py --view predict --kind cal_3m` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 409 | 摄入预测(自定义) | `python scripts/render_analysis.py --view predict --kind cal_custom --days <天数>` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 410 | 摄入预测(营养目标达成预测) | `python scripts/render_analysis.py --view predict --kind cal_goal` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 411 | 摄入预测(卡路里缺口预测) | `python scripts/render_analysis.py --view predict --kind cal_deficit` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 412 | 摄入预测(摄入稳定性预测) | `python scripts/render_analysis.py --view predict --kind cal_stability` | — | — | `predictParamMissing`：view.predict 只有 start／end／horizonDays（体重外推），无 target（目标体重）／deficit（每日缺口）／摄入速率参数 → 无单命令同形。 |
| 413 | 看每日 6 因素综合 | `python scripts/render_analysis.py --view six --date <YYYY-MM-DD>` | — | — | `sixFactorsMissing`：77 键无「每日 6 因素综合」形态（view.home 为当日总览，不含旧链 six 的 6 因素评分）。 |
| 415 | 关闭定时复盘 | `mavis cron delete ...` | — | — | `oosCron`：明确不做（架构规格 docs/calorie-architecture.md:60：定时复盘）；词只保证命中与文案，执行层不承接（t71 O1 同项）。 |
| 416 | 复盘 | `python scripts/render_review.py` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 417 | 复盘日期范围 | `python scripts/render_review.py --range 2026-07-01:2026-07-14` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 418 | 开启定时复盘 | `mavis cron create ...` | — | — | `oosCron`：明确不做（架构规格 docs/calorie-architecture.md:60：定时复盘）；词只保证命中与文案，执行层不承接（t71 O1 同项）。 |
| 419 | 本周复盘 | `python scripts/render_review.py --type week` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-07","end":"2026-09-07"}'` | 0 | — |
| 420 | 本年复盘 | `python scripts/render_review.py --type year` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-01-01","end":"2026-09-07"}'` | 0 | — |
| 421 | 本月复盘 | `python scripts/render_review.py --type month` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 422 | 查低热量榜 | `python scripts/render_food_ranking.py --days 7 --category low_calorie` | `calorie-cmd-read calorie.view.ranking --params '{"category":"low_calorie","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 423 | 查健康报告 | `python scripts/render_health_dashboard.py --days 7` | `calorie-cmd-read calorie.view.health --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 424 | 查卡路里数据 | `python scripts/render_lint_health.py` | — | — | `lintMissing`：77 键无数据质量／lint 形态（旧链 render_lint_health.py 为数据体检）。 |
| 425 | 查定时复盘 | `mavis cron list` | — | — | `oosCron`：明确不做（架构规格 docs/calorie-architecture.md:60：定时复盘）；词只保证命中与文案，执行层不承接（t71 O1 同项）。 |
| 427 | 查热量趋势 | `python scripts/render_calorie_trend.py --days 7` | `calorie-cmd-read calorie.history --params '{"days":7}'` | 0 | — |
| 428 | 查营养结构 | `python scripts/render_nutrition_ratio.py --days 7` | `calorie-cmd-read calorie.view.diet-review --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 429 | 查运动分布 | `python scripts/render_exercise_distribution.py --days 7` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 430 | 查运动贡献 | `python scripts/render_exercise_distribution.py --days 7 --mode contribution` | `calorie-cmd-read calorie.view.exercise --params '{"start":"2026-09-01","end":"2026-09-07"}'` | 0 | — |
| 431 | 查频繁吃榜 | `python scripts/render_food_ranking.py --days 7 --category frequent` | `calorie-cmd-read calorie.view.ranking --params '{"category":"frequent","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 432 | 查食物排行 | `python scripts/render_food_ranking.py --days 7` | `calorie-cmd-read calorie.view.ranking --params '{"start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 434 | 查高碳水榜 | `python scripts/render_food_ranking.py --days 7 --category high_carb` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_carb","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |
| 435 | 查高蛋白榜 | `python scripts/render_food_ranking.py --days 7 --category high_protein` | `calorie-cmd-read calorie.view.ranking --params '{"category":"high_protein","start":"2026-09-01","end":"2026-09-07","topN":10}'` | 0 | — |

> 「实跑 exit」＝把该行「等价单命令」在标准种子库上跑真 CLI 的退出码（与 envelope `key` 一致才计 0；
> 全部 0 与非 0 逐条见本表，桶内一致性由 `t81-exec-smoke.md` §1 复核）。

## 3. S-3 77 键逐键对照表（键 → 入口记录 id）

| key | 读写 | 入口记录 id | 来源 |
|---|---|---|---|
| `calorie.diet.add` | 写 | 记一餐#S9 | SoT 直连 |
| `calorie.diet.update` | 写 | 改饮食记录#S17 | SoT 直连 |
| `calorie.diet.remove` | 写 | 删饮食记录#S19 | SoT 直连 |
| `calorie.diet.batch` | 写 | 批量补记饮食#S12 | SoT 直连 |
| `calorie.diet.copy` | 写 | 复制昨日饮食#S16 | SoT 直连 |
| `calorie.diet.update-by-date` | 写 | 改某日饮食#S18 | SoT 直连 |
| `calorie.diet.remove-by-date` | 写 | 删某日饮食#S21 | SoT 直连 |
| `calorie.diet.remove-by-range` | 写 | 批量删饮食#S22 | SoT 直连 |
| `calorie.diet.remove-by-type` | 写 | 删一餐#S20 | SoT 直连 |
| `calorie.water.log` | 写 | 记喝水#S15 | SoT 直连 |
| `calorie.weight.log` | 写 | 记体重#S79 | SoT 直连 |
| `calorie.weight.update` | 写 | 改体重记录#S84 | SoT 直连 |
| `calorie.weight.remove` | 写 | 删体重记录#S86 | SoT 直连 |
| `calorie.weight.batch` | 写 | 批量补录体重#S82 | SoT 直连 |
| `calorie.exercise.add` | 写 | 记运动#S137 | SoT 直连 |
| `calorie.exercise.update` | 写 | 改运动记录#S145 | SoT 直连 |
| `calorie.exercise.remove` | 写 | 删运动记录#S147 | SoT 直连 |
| `calorie.photo.add` | 写 | 存身材照#N0 | 新拟入口 |
| `calorie.photo.remove` | 写 | 移除身材照#N1 | 新拟入口 |
| `calorie.photo.tag` | 写 | 设置照片标签#N2 | 新拟入口 |
| `calorie.product.add` | 写 | 存食品#S36 | SoT 直连 |
| `calorie.product.update` | 写 | 改食品#S37 | SoT 直连 |
| `calorie.product.deprecate` | 写 | 下架食品#S38 | SoT 直连 |
| `calorie.profile.set` | 写 | 设置档案#S233 | SoT 直连 |
| `calorie.profile.activity` | 写 | 设活动量#S234 | SoT 直连 |
| `calorie.profile.update` | 写 | 改档案#S235 | SoT 直连 |
| `calorie.goal.set` | 写 | 定营养目标#S208 | SoT 直连 |
| `calorie.goal.water` | 写 | 定饮水目标#S213 | SoT 直连 |
| `calorie.goal.weight` | 写 | 定体重目标#S210 | SoT 直连 |
| `calorie.goal.pause` | 写 | 暂停所有目标#S229 | SoT 直连 |
| `calorie.goal.resume` | 写 | 重启所有目标#S230 | SoT 直连 |
| `calorie.body.composition-add` | 写 | 记体脂（皮褶钳）#S237 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.body.composition-remove` | 写 | 删体脂#S248 | SoT 直连 |
| `calorie.body.measure-add` | 写 | 记围度#S239 | SoT 直连 |
| `calorie.body.measure-remove` | 写 | 删围度#S249 | SoT 直连 |
| `calorie.today` | 读 | 看今日饮食记录#N3 | 新拟入口 |
| `calorie.view.home` | 读 | 看今日主页#S0 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.diet` | 读 | 看今日饮食概览#S1 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.exercise` | 读 | 看今日运动概览#S2 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.goal` | 读 | 看目标完成度#S222 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.goal-config` | 读 | 看目标配置#N4 | 新拟入口 |
| `calorie.view.goal-recommend` | 读 | 看目标推荐#R0 | 覆盖修复入口 |
| `calorie.view.goal-weight` | 读 | 对比体重：当前 vs 目标体重#S120 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.goal-progress` | 读 | 看今日目标进度#S4 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.goal-status` | 读 | 看目标状态#N5 | 新拟入口 |
| `calorie.view.combined` | 读 | 看组合分析#N6 | 新拟入口 |
| `calorie.view.deficit` | 读 | 看热量缺口#N7 | 新拟入口 |
| `calorie.view.diet-review` | 读 | 看饮食复盘#N8 | 新拟入口 |
| `calorie.view.health` | 读 | 看健康盘#N9 | 新拟入口 |
| `calorie.view.ranking` | 读 | 查高热量排行#N10 | 新拟入口 |
| `calorie.view.library` | 读 | 查食品库#N11 | 新拟入口 |
| `calorie.view.search` | 读 | 搜食品#N12 | 新拟入口 |
| `calorie.photo.list` | 读 | 看身材照#N13 | 新拟入口 |
| `calorie.photo.detail` | 读 | 查身材照详情#N14 | 新拟入口 |
| `calorie.photo.compare` | 读 | 对比身材照#N15 | 新拟入口 |
| `calorie.photo.gif` | 读 | 做身材照GIF#N16 | 新拟入口 |
| `calorie.help.center` | 读 | 看身材照HELP#N17 | 新拟入口 |
| `calorie.help.lookup` | 读 | 查唤醒词#N18 | 新拟入口 |
| `calorie.history` | 读 | 查热量历史#N19 | 新拟入口 |
| `calorie.view.weight` | 读 | 看今日体重概览#S3 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.weight-history` | 读 | 看体重历史#N20 | 新拟入口 |
| `calorie.view.weight-compare` | 读 | 看体重对比#N21 | 新拟入口 |
| `calorie.view.weight-review` | 读 | 看体重复核#N22 | 新拟入口 |
| `calorie.view.volatility` | 读 | 看波动分析#N23 | 新拟入口 |
| `calorie.view.body-composition` | 读 | 看体成分#N24 | 新拟入口 |
| `calorie.view.body-measure` | 读 | 看围度记录#N25 | 新拟入口 |
| `calorie.view.plan` | 读 | 看训练计划#N26 | 新拟入口 |
| `calorie.view.plan-wizard` | 读 | 看构建向导#N27 | 新拟入口 |
| `calorie.view.exercise-goal` | 读 | 看运动目标#N28 | 新拟入口 |
| `calorie.view.goal-expiring` | 读 | 看即将到期的目标#S223 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.goal-predict` | 读 | 看目标预测达成#S232 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.goal-vs-actual` | 读 | 看目标对比实际#S221 | SoT ＋ HELP_EXEC_OVERRIDES |
| `calorie.view.predict` | 读 | 看体重预测#N29 | 新拟入口 |
| `calorie.view.anomaly` | 读 | 看异常诊断#N30 | 新拟入口 |
| `calorie.view.contraindication` | 读 | 看禁忌扫描#N31 | 新拟入口 |
| `calorie.view.dedupe` | 读 | 看去重报告#N32 | 新拟入口 |
| `calorie.view.profile` | 读 | 看档案视图#N33 | 新拟入口 |

## 4. 新拟唤醒词清单（D-4／A-6，34 键，待总架构师过目定稿）

| key | 新拟唤醒词 | 场景 | 依据 |
|---|---|---|---|
| `calorie.photo.add` | 存身材照 | 09 | keys.ts:38 title「记身材照」与 SKILL.md:73 REPR 均撞冻结词「记身材照」×3；写键命名族对齐「存食品」(product.add) |
| `calorie.photo.remove` | 移除身材照 | 09 | keys.ts:39 title「删身材照」撞冻结词 scene-09；用「移除」与旧链词区分 |
| `calorie.photo.tag` | 设置照片标签 | 09 | keys.ts:40 title「改照片标签」撞冻结词；photo.tag 支持 op add/remove/set |
| `calorie.today` | 看今日饮食记录 | 02 | keys.ts:66 title「今日饮食」(list 形)；SKILL.md:86 REPR「看今日饮食概览」撞 scene-01 冻结词 |
| `calorie.view.goal-config` | 看目标配置 | 06 | keys.ts:71 title「目标配置」；SKILL.md:99 REPR「定营养目标」撞冻结词 |
| `calorie.view.goal-status` | 看目标状态 | 06 | SKILL.md:104 REPR 原样；冻结表零命中 |
| `calorie.view.combined` | 看组合分析 | 10 | keys.ts:76 title「组合分析」；SKILL.md:90 REPR「看体重 vs 摄入(最近 7 天)」撞冻结词 |
| `calorie.view.deficit` | 看热量缺口 | 10 | SKILL.md:93 REPR；docs/research/t67-key-audit.md:76 零命中清单 |
| `calorie.view.diet-review` | 看饮食复盘 | 02 | keys.ts:78 title「饮食复盘」；SKILL.md:95 REPR「今日复盘」撞冻结词 |
| `calorie.view.health` | 看健康盘 | 10 | SKILL.md:107 REPR；t67 零命中清单 |
| `calorie.view.ranking` | 查高热量排行 | 02 | SKILL.md:114 REPR；t67 零命中清单 |
| `calorie.view.library` | 查食品库 | 02 | SKILL.md:109 REPR；t67 零命中清单 |
| `calorie.view.search` | 搜食品 | 02 | keys.ts:82 title「查食品」；SKILL.md:115 REPR「查食品」撞冻结词 |
| `calorie.photo.list` | 看身材照 | 09 | SKILL.md:77 REPR；t67 零命中清单 |
| `calorie.photo.detail` | 查身材照详情 | 09 | keys.ts:84 title「查身材照」撞冻结词；detail 形单条详情 |
| `calorie.photo.compare` | 对比身材照 | 09 | keys.ts:85 title「对比照片」；SKILL.md:74 REPR「对比两张照片」撞冻结词 |
| `calorie.photo.gif` | 做身材照GIF | 09 | SKILL.md:76 REPR；t67 零命中清单（冻结词为「生成身材照GIF」） |
| `calorie.help.center` | 看身材照HELP | 09 | keys.ts:87 title「身材照HELP」；SKILL.md:70 REPR「记身材照」撞冻结词 |
| `calorie.help.lookup` | 查唤醒词 | 10 | keys.ts:88 title「唤醒词HELP」；SKILL.md:71 REPR「看今日主页」撞冻结词 |
| `calorie.history` | 查热量历史 | 10 | SKILL.md:72 REPR；t67 零命中清单 |
| `calorie.view.weight-history` | 看体重历史 | 03 | keys.ts:91 title「体重历史」；冻结表零命中 |
| `calorie.view.weight-compare` | 看体重对比 | 03 | keys.ts:92 title「体重对比」；冻结表零命中 |
| `calorie.view.weight-review` | 看体重复核 | 03 | keys.ts:93 title「体重复核」；冻结表零命中 |
| `calorie.view.volatility` | 看波动分析 | 03 | keys.ts:94 title「波动分析」；冻结表零命中 |
| `calorie.view.body-composition` | 看体成分 | 08 | keys.ts:95 title「体成分看」；冻结表零命中 |
| `calorie.view.body-measure` | 看围度记录 | 08 | keys.ts:96 title「围度看」；冻结词已有「看围度」(scene-08) |
| `calorie.view.plan` | 看训练计划 | 05 | keys.ts:97 title「训练计划看」；冻结表零命中 |
| `calorie.view.plan-wizard` | 看构建向导 | 05 | keys.ts:98 title「构建向导」；冻结表零命中 |
| `calorie.view.exercise-goal` | 看运动目标 | 04 | keys.ts:99 title「运动目标视图」；冻结表零命中 |
| `calorie.view.predict` | 看体重预测 | 10 | keys.ts:103 title「体重预测」；冻结表零命中 |
| `calorie.view.anomaly` | 看异常诊断 | 10 | keys.ts:104 title「异常诊断」；冻结表零命中 |
| `calorie.view.contraindication` | 看禁忌扫描 | 05 | keys.ts:105 title「禁忌扫描」；冻结词「扫禁忌」在 scene-05 |
| `calorie.view.dedupe` | 看去重报告 | 02 | keys.ts:106 title「去重报告」；冻结表零命中 |
| `calorie.view.profile` | 看档案视图 | 07 | keys.ts:107 title「档案视图」；冻结词「查档案」在 scene-07 |

### 4.1 FX-81-5 覆盖修复唤醒词（1 键；总架构师 FX-81-5 返修裁定定稿）

| key | 唤醒词 | 场景 | 依据 |
|---|---|---|---|
| `calorie.view.goal-recommend` | 看目标推荐 | 06 | 承接 `定营养目标(自动算)`／`定饮水目标(自动算)`／`一键定全套目标` 三词的键（其冻结 cli 是多步链式串，恒 exit 2；FX-81-7 判为 wizard、保留 non-exec） |

> FX-81-7 变更：`看目标预测达成` 已改 exec（`view.goal-predict`，≥14 天窗口实跑 exit 0）→ 该键由旧词自身承接，
> 原修复入口 `看目标达成预测` 删除（不再需要），故覆盖修复入口由 2 条降为 1 条。

> nit（FX-81-3 · 3）：新拟词「看身材照」与冻结表 `scene-09-photo.ts:8` 的 `name` 字段字面相同（该条 `wake_word` 为「查身材照」）——**唤醒词空间无冲突**：冻结 `name` 非路由键，本路由层只以 `wake_word` 为键，故不构成碰撞；此处登记以免后人误判。

## 5. 明确不做桶（架构规格 :60）与 t71 O1–O6 差异逐条登记

| # | 唤醒词 | 场景 | 规格出处 | t71 出处 | 差异 |
|---|---|---|---|---|---|
| O1 | 关闭定时复盘、开启定时复盘、查定时复盘 | 10 | docs/calorie-architecture.md:60「定时复盘」 | docs/research/t71-old-baseline-inventory.md:741 O1（定时复盘 / cron） | 同项：规格与 t71 都判明确不做。 |
| O2 | （无独立唤醒词） | — | docs/calorie-architecture.md:60 未列「飞书发送归档」（:90 Out of Scope 列） | docs/research/t71-old-baseline-inventory.md:742 O2（飞书发送/归档） | 差异：436 条无独立唤醒词（飞书只出现在 scene-10-analysis.ts:161 的 desc 与 scene-09-photo.ts:5,6 的渠道文案）→ 无词可入桶，登记为「无词项」。 |
| O3 | 同步到训记、拉训记实绩 | 05 | docs/calorie-architecture.md:60「训记」 | docs/research/t71-old-baseline-inventory.md:743 O3（训记同步） | 同项。 |
| O4 | 拍营养表记一餐、拍营养表补记一餐 | 02 | docs/calorie-architecture.md:60「营养表」 | docs/research/t71-old-baseline-inventory.md:744 O4（mmx vision 拍营养表） | 同项。 |
| O5 | （无独立唤醒词） | — | docs/calorie-architecture.md:60 未列「DSH 面板」 | docs/research/t71-old-baseline-inventory.md:745 O5（DSH 面板 · plugin-calorie 取数） | 无词项：436 条无「面板」独立唤醒词（面板取数归插件包，本票不碰 packages/plugin-*），登记为「无词项」。 |
| O6 | （无独立唤醒词） | — | docs/calorie-architecture.md:60 未列「跨技能联动执行」 | docs/research/t71-old-baseline-inventory.md:746 O6（跨技能联动 · cross_skill_sleep） | 无词项：436 条无跨技能联动独立唤醒词（外联动 out of scope，本票只动技能包与 CLI 出口），登记为「无词项」。 |
| M8 | 落地训练、落地到本周末、落地到本月底 | 05 | docs/calorie-architecture.md:60「落地」 | docs/research/t71-old-baseline-inventory.md:203 M8 需移植项（process_progress.html） | 差异：按规格 :60 入「明确不做」；按 t71 属 M8「需移植」，不在 O1–O4 之内。 |

## 6. S-2 路由层零 py 取证

```text
routing.ts 字节数：104876
routing.ts 行数：781
/python/i 命中：0
exec cli 总数：361
非唯一出口形态的 cli（前缀口径 ^calorie-cmd-read calorie\.）：0
单条命令形态的 cli（口径：^calorie-cmd-read calorie\.[a-z0-9.-]+( --params '\{…\}')?$，不含「→」多步链）：361 / 361
```

> 口径说明（FX-81-6 · E-7）：`非唯一出口形态` 只判**前缀**（是否 `calorie-cmd-read calorie.` 起头），
> 故「多步链式串」在原口径下仍计为 0 异常。上表新增**单条命令形态**口径补全：
> 链式串（`A → 确认后 B`）与占位符 cli 在该口径下会被排除；本轮 5 条 wizard 词已转 non-exec，
> 故当前 exec 桶的单条命令形态 ＝ 全部 361 条（占位符 4 条经 smoke §2 替换后仍为单条命令）。
> 占位符（FX-81-6 · E-4）：`记身材照`×3／`存身材照` 的 `srcPaths:["<照片路径>"]` **需真实路径**（原样跑 exit 4「照片源文件均不存在」，换真实路径 exit 0）——
> 冻结 SoT 同风格（`<图片>`／`<昨天>`），故保留 exec，由 smoke 的占位符替换（§2）证明可跑。

### 6.1 上下文：冻结表内的旧链 cli 仍在（按 D-1 保持 SoT 原文，不属路由层）

```text
SoT 436 条里 main_prompt.cli 以 py 起头：370；含 py：372；可执行：60
路由层口径：exec 326 ＝ 直连 56 ＋ HELP_EXEC_OVERRIDES 22 ＋ FX-81-2 孪生词转 exec 26 ＋ FX-81-7 同 key 可参数化 222；non-exec 110 ＝ 明确不做 10 ＋ 该词自身未承接 100（含 wizard 5 条）；新拟 34 ＋ 覆盖修复 1。
残留暴露点（本票不改，收口见报告「新洞」）：help-lookup.ts:38 buildHelpLookup / index.ts:81 getHelpCards / render/help.ts:61 legacyCli
```

## 7. S-4 冻结面零改动

```text
$ git diff --stat -- packages/skill-calorie/src/triggers/scene-01-home.ts packages/skill-calorie/src/triggers/scene-02-diet.ts packages/skill-calorie/src/triggers/scene-03-weight.ts packages/skill-calorie/src/triggers/scene-04-exercise.ts packages/skill-calorie/src/triggers/scene-05-workout.ts packages/skill-calorie/src/triggers/scene-06-goal.ts packages/skill-calorie/src/triggers/scene-07-profile.ts packages/skill-calorie/src/triggers/scene-08-body.ts packages/skill-calorie/src/triggers/scene-09-photo.ts packages/skill-calorie/src/triggers/scene-10-analysis.ts test/calorie-sot.snapshot.json test/calorie-triggers.test.mjs packages/skill-calorie/test/render-t10.test.mjs packages/skill-calorie/test/skill-t11.test.mjs
（空输出）
```

## 8. 核对结论

全部核对通过（漂移 0、缺入口 0、py 引用 0；222 条家族翻转 ＋ 26 条孪生翻转逐条实跑 exit 0）。
