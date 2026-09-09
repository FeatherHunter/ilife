# #113 趋势 2＋其他 6 移植 8 键 · 证据（map #63）

- 范围：t71「需移植」趋势 2＋其他 6（D2 只许追加键、禁改名；计数 6＋4＋8＝18 闭合）。
  `calorie.view.batch-import-preview`（batch_import_preview：库匹配＋合计试算，只预览不写库）／
  `calorie.view.calorie-trend`（calorie_trend：T7 口径日序列＋达标统计）／
  `calorie.view.lint-health`（lint_health：未匹配库/零负热量/未来日期/疑似重复四项体检，只读）／
  `calorie.view.long-trend`（long_trend：体重＋热量双序列，window 如 30d）／
  `calorie.view.nutrition-analysis`（nutrition_analysis：宏量占比＋微量 vs 推荐＋规则建议）／
  `calorie.view.process-progress`（process_progress：计划配置＋近 7 天执行）／
  `calorie.view.review-template`（review_template：饮食/运动/体重三面小结＋派生要点）／
  `calorie.view.six-factors`（six_factors：热量/蛋白/饮水/运动/称重/三餐六因素评分）。
- 非范围：47 页已有（#108–#112 已关）／运动 6（#111）／营养 4（#112）／训练计划写键（#86）／HELP（#88）。
- 实施：`src/cli/keys.ts` 追加 8 读键（87→95：读 52→60，写 35 不动）；
  `packages/base-combos/combos.yaml` combos 段同步 8 条（`gen-present.mjs` 重生成
  `present.ts`，`check-combos` 全过）；
  新增 `src/render/trendMiscPort.ts`（8 取数 builder）＋`src/render/trendMiscPortDocs.ts`
  （8 装配函数，`assemble`＋`copyBlock` 照抄 nutritionPortDocs 头 100 行）；
  `src/cli/cmd_read.ts` 加 8 分发（metrics 只收确定数字；calorie-trend 空窗守卫补 missing-data）；
  `src/triggers/routing.ts` 促进 4 词 non-exec→exec（钠糖纤维趋势/综合→nutrition-analysis，
  每日 6 因素综合→six-factors，查卡路里数据→lint-health）＋`NEW_KEY_ROUTES` +8（52 键）；
  `scripts/build-help.mjs` REPR＋example +8（残留会话已做，本会话沿用）；SKILL.md 散文计数 87→95；
  `docs/calorie-architecture.md:58`＋`.html` 计数同步；7 处键数断言→95/60；
  路由测试数字同步（341/95/85/52/95/237/489/394/107）；`t81-exec-smoke.md` 重生成；
  `pnpm snapshot` 重写；新增 `test/trend-misc-port-113.test.mjs`（13 用例）。

## 1. 逐项对照表（旧模板 → 新区块，区块级尺）

| 旧模板节 | 新装配 | 判定 |
|---|---|---|
| calorie_trend 日序列＋达标 | B-02 KPI（日均/趋势/达标天数/周末差）＋B-04 line | 同质（复用 T7 buildTrendData；空窗守卫见 R1） |
| long_trend 体重＋热量双序列 | B-02 KPI（日均/体重变化/窗口）＋双 line＋B-03 逐日表 | 同质（window `Nd` 缺省 30d；称重不足 2 次明示缺失） |
| nutrition_analysis 配比＋微量＋建议 | B-02 KPI＋B-03 微量表＋donut＋B-08 建议折叠 | 同质（建议为阈值规则派生，非编造结论） |
| six_factors 六因素评分 | B-02 KPI（✓/✗＋依据）＋B-03 明细表 | 同质（无目标项明示，不编数） |
| lint_health 数据体检 | B-02 KPI（问题总数）＋B-03 四项表 | 同质（只读体检，不写库；空库 0 问题 exit 0） |
| batch_import_preview 试算 | B-02 KPI（总数/匹配/缺库/合计）＋B-03 逐条表＋B-08 缺库折叠 | 同质（仅预览；确认后走 diet.batch 写入） |
| process_progress 计划＋执行 | B-02 KPI（计划/训练日/次数/时长） | 同质（无计划且无执行即阻断） |
| review_template 三面小结 | B-02 KPI＋windowForm＋B-08 要点折叠 | 同质（要点为规则输出；记餐偏疏明示参考性） |
| 全页 | B-01 壳＋fillTemplate 全文档（裸标记；图表页加 CHARTS-HELPERS） | 同质（零 `<!--` 残留逐字断言） |

## 2. 收敛记录

- R1（空窗）：analysis/trend.buildTrendData 空窗不抛（实测 exit 0），数据层补 food_log 缺行守卫，
  空库→missing-data exit 4（G5 #100 口径；新测覆盖）。
- R2（口径复用）：占比/目标/DRI/水行排除沿 #112（4/4/9kcal·g、DRI 纤维 25g/钠 2000mg/糖 50g、
  WATER_NAME 排除、daily_goal id=1 无行即 null），不另立口径。
- R3（路由）：multiTrend 4 词（2–4 指标任意组合）long-trend 不承接（仅 weight_calorie），留 non-exec；
  reportKind 8 词（BMI/TDEE 等报告子形态）review-template 不承接，留 non-exec。最小集只翻转 4 词。

## 3. 验收证据（本机实测 2026-09-09）

- 新测试 `test/trend-misc-port-113.test.mjs`：**13／13 绿**（12 词→8 键路由；每键 1 用例；
  空库 6 阻断＋lint/batch 2 通过；非法 6 拒收；命名底座；envelope 对齐）。
- 包级：`packages/skill-calorie/test/*.test.mjs` **259／259 绿**（含只读 60 键全等）；
  `test/combos-42.test.mjs` 2／2 绿；`pnpm --filter skill-calorie build` 绿；
  `pnpm --filter base-combos build` 绿（present 重生成无 diff）；`pnpm snapshot` 重写
  `0.1.0@75397f34cd81a4ba`。
- `test/calorie-routing-81.test.mjs` 7／8：唯一红为 FX-81-5 快照非零断言，命中的是
  SoT `复制昨日运动（calorie.exercise.add copyFrom yesterday）`——固定种子运动日止于
  09-07，昨日无记录即 exit 4，属日期相关他票 flake（HEAD 快照 `t81-exec-smoke.md:510`
  同记录非零，基线 `t101-baseline-failures.txt` 无此条；本票 12 条新记录全 exit 0，
  §1 394 行／§3 95 键／覆盖面 107 均与路由层一致）。t101 delta：本票范围内新增失败 0。
- 待总控关：issue #113 进度 100%（flake 定夺归总控：修种子相对化或路由降级均属他票，不在本票动）。
