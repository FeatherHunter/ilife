# #109 运动/身体域同质 · 证据（map #63）

- 范围：t71「新版已有」运动/身体域 9 键全文档化（数据→区块→填充器，#104 §4 用法）。
  `calorie.view.exercise`（exercise_summary 汇总＋趋势＋分布＋力量/有氧筛选子集）／
  `calorie.view.exercise-goal`（exercise_goal_view）／`calorie.view.weight`
  （weight_dashboard）／`calorie.view.weight-history`（weight_history 子集）／
  `calorie.view.weight-compare`（weight_compare 子集）／`calorie.view.weight-review`
  （weight_review）／`calorie.view.volatility`（weight_volatility_v2）／
  `calorie.view.body-composition`（body_composition_view）／`calorie.view.body-measure`
  （body_measurements_view）。
- 非范围：exercise_cardio／distribution／recap／review／strength／trend 6 项需移植（→ #111），
  训练计划/向导（→ #86），体成分/围度两期对比 helpers（无 CLI 键，随组合分析消费），
  缺口/组合/异常/禁忌（→ #110），饮食域（#108 已关）。envelope `data.metrics`
  逐键不动（零快照 churn）；模板闭集不动；冻结面不动。
- 实施：新增 `packages/skill-calorie/src/render/sportDocs.ts`（9 装配函数）；
  `src/cli/cmd_read.ts` 运动/身体 9 键只换 `html`（metrics 行逐字保留；html.ts 旧
  9 专属渲染器退役出 import，函数本体保留）；新增
  `packages/skill-calorie/test/sport-homogeneity-109.test.mjs`（12 用例）。

## 1. 逐项对照表（旧模板节 → 新区块，区块级尺）

| # | 旧模板节 | 新装配 | 判定 |
|---|---|---|---|
| exercise_summary 汇总 KPI（总消耗/总时长/次数/数列＋TOP4 类型） | B-02 KPI（总消耗/总时长/次数/日均＋数列合计） | 同质（数同源，块升级） |
| exercise_summary TOP 类型（截断 4） | B-04 bar 类型消耗分布＋B-03 按类型明细（类型/分类/次数/消耗/时长，全量；分类经 inferCategory 同源） | 同质（截断 4→全量，超集） |
| exercise 按日（隐式数列） | B-04 line 每日消耗（markLine 日均）＋B-03 按日表（全窗日，无记录留空，不断 0） | 同质（旧无按日节→新增，见 §3 R1） |
| exercise 按力量/有氧筛选多视图 | B-03 按类型明细分类列＋B-08 按分类汇总折叠（同窗直出） | 子集→同质（类切换页归宿主，见 §3 R2） |
| exercise_goal_view 4 KPI＋完成率 bar | B-02 KPI（区间/目标/实际/完成度＋达成 ok-warn 态）＋B-04 bar 目标 vs 实际 | 同质 |
| weight_dashboard 5 KPI | B-02 KPI（首末/均值/变化＋趋势/距目标）＋B-04 line 体重曲线＋B-03 记录表（日期/体重/备注） | 同质（旧仅 KPI→表＋图升级） |
| weight_history KPI＋前 10 条 KPI | B-02 KPI＋B-04 line＋B-03 全量表（日期/时间/体重/BMI/备注） | 同质（旧截断 10→全量，超集） |
| weight_compare 4 KPI | B-02 KPI＋B-03 两期表（期别/区间/均值/期首/期末/变化） | 同质 |
| weight_review 5 KPI | B-02 KPI＋B-05 里程碑列表（状态/日均变化/热量调整） | 同质 |
| weight_volatility_v2 4 KPI | B-02 KPI＋B-04 line 偏离基线＋B-03 异常点表（空态明示阈值，不断 0） | 同质 |
| body_composition_view KPI＋前 8 条 | B-09 来源表单＋B-02 KPI＋B-04 line 体脂趋势＋B-03 全量记录表＋B-11 list 复制 | 同质（旧截断 8→全量，超集） |
| body_measurements_view KPI＋前 8 条 | B-09 围度项表单＋B-02 KPI＋B-04 line（单项）＋B-03 表（单项 3 列／全量胸腰腹臀＋备注，全 13 项走复制） | 同质（见 §3 R4） |
| 全页 | B-01 壳＋fillTemplate 全文档（裸标记；图表页加 CHARTS-HELPERS） | 同质（旧 pageShell 片段→单文件自足；零 `<!--` 残留逐字断言） |

## 2. 验收证据（本机实测 2026-09-09）

- 新测试 `test/sport-homogeneity-109.test.mjs`：**12／12 绿**（唤醒词 20 词→9 键路由；
  路由 cli 直跑 3 条产全文档；9 键区块/数值/对照针；空库 10 case 一律 exit 4＋stdout 空；
  运动总览 `运动总览_<TS>.html` 落点＋回传一致＋落盘全文档；复制头对齐冻结版本）。
- 包级回归：`node --test packages/skill-calorie/test/*.test.mjs test/calorie-triggers.test.mjs
  test/calorie-routing-81.test.mjs test/scaffold.test.mjs test/combos-42.test.mjs` →
  **tests 229／pass 229／fail 0**（#108 的 217 ＋本票 12；含 #119、#87、#100 空库三键）。
- 抖动项隔离复跑：`db-readonly-93` **8／8 绿**（readonly/writable data/html 全等，本票 html 变更下成立）。
- 四门：`pnpm build`（tsc＋HELP 注入）／`boundaries`（PASS）／`test:types`（tsc -b exit 0）／
  `snapshot:check`（exit 0）／`publish:pre`（PASS）。
- 全仓 `pnpm test`：`t101-fail-set.mjs` 比对基线：
  **base=27 after=27 新增=0 消失=0**（与 #108 同基线，均为并行抖动/既有失败）。

## 3. 已知限制／记账（不阻塞，体验等价性声明）

- R1 多 mode 子集：exercise 15 词／weight-history 18 词／weight-compare 18 词旧多视图
  （降采样行、备注筛选、目标/里程碑/异常点叠加层）新架构同键不同参覆盖，页内单窗直出；
  口径差异已在本表声明（随 #108 Q1 同类刻度：子集→同质闭合）。
- R2 交互归宿主（B7）：类型/分类筛选、目标周期切换、曲线采样、表单实时行为、复制激活
  （bindCopyAction）一律宿主侧；静态页给 `data-*` 约定＋原生 details。浏览器实测回读归 #89b。
- R3 两期对比 helpers 无 CLI 键：`compareCompositions`／`compareMeasurements` 仅组合分析
  消费，本票不新造键（D2 键只许追加，且属新能力未拆票）。
- R4 围度全量表只列胸腰腹臀 4 项＋备注（页内明示「全量 13 项见复制数据」）；
  体成分来源显示原始值（gym 等），中文标签（SOURCE_LABELS）归宿主侧。
- R5 沿用 #119 残留 R1–R5（contra/缺省/photo 命名补丁）：本票只消费命名底座（运动总览
  落点），不改落点实现。
- R6 空窗/空库/无目标一律 missing-data（exit 4），不编数：exercise-goal 无目标、
  weight-compare 对比期无记录、volatility 记录不足均已由空库 10 case 覆盖。

## 4. 交接

- #110 照抄本票＋#108 模式：新建域 `*Docs.ts`（`assemble`＋`copyBlock` 照抄
  `render/sportDocs.ts` 头 90 行）＋dispatch 换 `html`＋`*-homogeneity-11x.test.mjs`，
  envelope 不动；stat 投影 metrics 只收确定数字（`metricsOf` 掉 null/undefined，
  冻结 `Record<string, number>` 口径）。
- 并发注意：`cmd_read.ts`／`render/html.ts` 仍是三票共享文件，须串行（禁区 {108,109,110}；
  本票已关 108，无并行冲突）。
