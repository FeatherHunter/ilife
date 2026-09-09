# #108 营养/饮食域同质 · 证据（map #63）

- 范围：t71「新版已有」饮食域 8 键全文档化（数据→区块→填充器，#104 §4 用法）。
  `calorie.today`（today_diet）／`calorie.view.diet`（diet_overview＋meal_distribution＋
  today_meals 子集）／`calorie.view.diet-review`（diet_review）／`calorie.view.ranking`
  单榜＋全榜（food_ranking）／`calorie.view.search`（food_search）／`calorie.view.library`
  （food_library）／`calorie.view.health`（health_dashboard）／`calorie.view.dedupe`
  （dedupe_report）。
- 非范围：nutrition_ratio／nutrition_detail／source_stats／today_water（→ #112，需移植），
  缺口/组合/异常/禁忌（→ #110），运动/体重/身体（→ #109）。envelope `data.metrics`
  逐键不动（零快照 churn）；模板闭集（CALORIE_TEMPLATES 6 件）不动；冻结面不动。
- 实施：新增 `packages/skill-calorie/src/render/dietDocs.ts`（9 装配函数＋2 内联内容页壳）；
  `src/cli/cmd_read.ts` 饮食 8 键只换 `html`（metrics 行逐字保留）；新增
  `packages/skill-calorie/test/diet-homogeneity-108.test.mjs`（12 用例）。

## 1. 逐项对照表（旧模板节 → 新区块，区块级尺）

| # | 旧模板节 | 新装配 | 判定 |
|---|---|---|---|
| today_diet 餐次进度 | KPI（当日摄入/目标/餐数/餐别覆盖） | 同质（数同源，块升级） |
| today_diet 营养配比 | B-04 donut（蛋白/碳水/脂肪 pct，showPercent） | 同质（旧静态占比→冻结图表） |
| today_diet 今日明细表 | B-03 语义表（时间/餐别/食物/克数/热量/蛋白/碳水/脂肪） | 同质（列超集：旧无克数列） |
| diet_overview 本周/月累计 | KPI（累计/日均/目标/趋势）＋B-04 line 每日摄入 | 同质（新架构同键不同参覆盖周/月窗；双累计牌改为范围累计，见 §3 R1） |
| diet_overview 柱图点击 toast | B-04 bar 餐别热量占比（CSS-only 静态图） | 同质（点击 toast 归宿主，B7，见 §3 R2） |
| meal_distribution 占比＋明细表 | B-04 bar＋B-03 按日汇总表＋B-08 窗口明细折叠（100 条截断明示） | 同质 |
| today_meals 按日汇总＋每日明细＋chart | B-03 按日汇总（全窗日，无记录留空不断 0）＋B-08 明细＋B-04 line | 子集→同质（8 词同键不同参；明细 100 条截断，见 §3 R3） |
| diet_review 每日热量趋势 | B-04 line（avgLine=日均） | 同质 |
| diet_review 高频 TOP5 | B-03 表（排名/食物/总热量/次数/餐均，frequent 取数） | 同质（旧 JS 聚合→T5 dietFoodRanking 同源） |
| diet_review 按餐汇总 | B-03 表（餐别/天数/累计） | 同质 |
| food_ranking 5 tab＋表＋复制榜单 | B-03 整表（8 列全 RankItem 字段）＋B-11 复制榜单（list 投影行级）＋全榜 5×B-08 | 同质（tab 切换归宿主，见 §3 R2） |
| food_search 搜索框＋结果网格 | B-09 参数表单（关键词）＋B-03 结果表（每 100g 列）＋B-11 复制 | 同质（实时搜索归宿主） |
| food_library 搜索/分页＋表＋复制 prompt | B-09 分类表单＋B-03 食品表＋库统计 KPI＋B-11 复制 | 同质（分页归宿主；来源统计表归 #112，见 §3 R4） |
| health_dashboard 四维 badge | B-02 KPI（区间/日均摄入/日均缺口/四维 ok-warn 徽章）＋B-05 四维列表 | 同质 |
| health_dashboard 今日该做什么 | B-08 折叠＋B-05 列表（摄入超标/不足、缺口过大/盈余、缺维提示、一切正常；全部数据驱动） | 同质（运动/体重细则见 §3 R5） |
| health_dashboard 复制回 AI | B-11（stat 投影） | 同质 |
| dedupe_report KPI＋重复组表＋advice | B-02 KPI（组/冗余/库内）＋B-03 表（食品/品牌/条数/ID）＋B-08 处理建议＋B-11 复制 | 同质 |
| 全页 | B-01 壳＋fillTemplate 全文档（裸标记；图表页加 CHARTS-HELPERS） | 同质（旧裸 section 片段→单文件自足；零 `<!--` 残留逐字断言） |

## 2. 验收证据（本机实测 2026-09-09）

- 新测试 `test/diet-homogeneity-108.test.mjs`：**12／12 绿**（唤醒词 15 词→8 键路由；
  路由 cli 直跑 3 条产全文档；8 页区块/数值/对照针；空库 9 case 一律 exit 4＋stdout 空；
  排行 `食物排行_高热量_<TS>.html` 落点＋回传一致＋落盘为全文档；复制头对齐冻结版本）。
- 包级回归：`node --test packages/skill-calorie/test/*.test.mjs test/calorie-triggers.test.mjs
  test/calorie-routing-81.test.mjs test/scaffold.test.mjs test/combos-42.test.mjs` →
  **tests 217／pass 217／fail 0**（含 #119 9／9、#87 14／14、#100 空库三键）。
- 抖动项隔离复跑：`db-readonly-93` **8／8 绿**（readonly/writable data/html 全等，本票 html 变更下成立）。
- 四门：`pnpm build`（tsc＋HELP 注入）／`boundaries`（PASS）／`test:types`（tsc -b exit 0）／
  `snapshot:check`（exit 0）／`publish:pre`（PASS）。
- 全仓 `pnpm test`：947 tests，fail 24；`t101-fail-set.mjs` 比对基线：
  **base=27 after=27 新增=0 消失=0**（6 烟囱 suite＋21 测试级逐名吻合，均为并行抖动/既有失败）。

## 3. 已知限制／记账（不阻塞，体验等价性声明）

- R1 周/月双累计牌：旧 diet_overview 同页双牌是多 mode 行为；新架构「看本周/月饮食」同键
  不同参（start/end 周/月窗）覆盖，页内单范围累计＋按日表可互验。口径差异已在本表声明。
- R2 交互归宿主（B7）：图表点击 toast、榜单 tab 切换、搜索/分页实时行为、复制激活
  （bindCopyAction）一律宿主侧；静态页给 `data-*` 约定＋原生 details。浏览器实测回读归 #89b。
- R3 窗口明细 100 条截断：页内明示「仅列前 N 条」；envelope 不受影响（复制走投影）。
- R4 来源统计表：`view.library` 只给库总数 KPI，GROUP BY 来源整表归 #112（source_stats 需移植）。
- R5 健康建议细则：运动不足/连续未运动/体重上升三条需类型化 exercise/weight 维
  （现 dims 为 unknown，只读 presence），本票只落地摄入/缺口/缺维/全正常四类；
  深规则待 dims 类型化后补（可随 #109/#110 认领，不属本域）。
- R6 沿用 #119 残留 R1–R5（contra/缺省/photo 命名补丁）：本票只消费命名底座（排行动态段），
  不改落点实现。

## 4. 交接

- #109／#110 可照抄本票模式：`render/dietDocs.ts` 内 `assemble`＋`copyBlock` 通用，
  各域新建 `*Docs.ts`＋dispatch 换 `html`＋`*-homogeneity-11x.test.mjs`，envelope 不动。
- 并发注意：`cmd_read.ts`／`render/html.ts` 仍是三票共享文件，须串行（禁区 {108,109,110}）。
