# #110 趋势/分析域同质 · 证据（map #63）

- 范围：t71「新版已有」趋势/分析域 6 键全文档化（数据→区块→填充器，#104 §4 用法）。
  `calorie.view.combined`（combined_analysis：11 配对×白名单窗口，落差最大：
  旧 6 节→新 1 KPI 壳）／`calorie.view.deficit`（calorie_deficit）／
  `calorie.view.anomaly`（anomaly_report，23 种诊断）／`calorie.view.contraindication`
  （contraindication_report）／`calorie.view.predict`（predict_report 体重预测）／
  `calorie.view.goal-predict`（目标预测达成）。
- 非范围：calorie_trend／long_trend／nutrition_analysis／six_factors 等 18 项需移植
  （→ #111–#113），calorie.history（趋势遗留词「查热量趋势」归宿），饮食域（#108 已关）、
  运动/身体域（#109 已关）。envelope `data.metrics` 逐键不动（零快照 churn）；
  模板闭集（CALORIE_TEMPLATES 6 件）不动；冻结面不动。
- 实施：新增 `packages/skill-calorie/src/render/trendDocs.ts`（6 装配函数）；
  `src/cli/cmd_read.ts` 趋势/分析 6 键只换 `html`（metrics 行逐字保留；html.ts 旧
  6 专属渲染器退役出 import，函数本体保留）；新增
  `packages/skill-calorie/test/trend-homogeneity-110.test.mjs`（12 用例）。

## 1. 逐项对照表（旧模板节 → 新区块，区块级尺）

| # | 旧模板节 | 新装配 | 判定 |
|---|---|---|---|
| combined KPI 四格（r＋解读／A 均值＋Δ／B 均值＋Δ／对齐样本 n） | B-02 KPI（r＋强/中/弱解读逐字旧口径／A＋Δ/天数／B＋Δ/天数／n） | 同质 |
| combined 双轴走势（归一化双线＋图例；运动侧缺日按 0） | B-04 line 双 series（A 实线共享刻度／B 虚线 ownScale 独立刻度；空缺断点不断 0） | 同质（断点 vs 0 归一见 §3 R1） |
| combined 相关性与回归散点 | B-04 scatter（regression 选项开／标题带斜率＋n；样本不足未拟合） | 同质 |
| combined 延迟相关表（滞后天数／r／解读，仅三配对） | B-03 同三列＋解读（节级门控：三配对外不渲染） | 同质 |
| combined 分层对比表（分组／天数／A 净变化／B 均值） | B-03（加备注列；extra 进 caption） | 同质 |
| combined 超标日（weight_calorie 摄入＞130%目标） | B-08 折叠＋B-05 日期列（analyzePair 同源） | 同质 |
| combined 缺口分桶（weight_deficit） | B-03 分桶／天数（节级门控） | 同质 |
| combined insight | 页眉副标题（同 #108 健康盘范式） | 同质 |
| combined 154 词多窗口（7/15/30/60/90/180/365d／本周／本月／自定义） | B-09 参数表单（pair/window/start/end）＋同键不同参单窗直出；11 配对唤醒词全路由命中 | 子集→同质（见 §3 R7） |
| combined 逐日明细（旧无） | B-08 折叠＋B-03（100 条截断明示） | 超集（新增） |
| deficit 4 KPI（日均摄入／消耗／缺口／理论减重） | B-02 KPI（目标／TDEE＋运动／趋势方向／周缺口 detail） | 同质 |
| deficit 每日摄入 vs 消耗＋目标线 | B-04 line 双 series＋markLine 目标摄入 | 同质 |
| deficit 缺口明细（日期／摄入／消耗／缺口／目标／状态＋tfoot） | B-03（加星期列；100 条截断明示；tfoot→caption 工作日/周末计数） | 同质 |
| anomaly 诊断 KPI＋标题 | B-02（诊断／窗口＋有数天／发现数）＋B-09（kind/start/end） | 同质 |
| anomaly 发现列表（旧截断 5） | B-05 全量（原因／证据＋建议／置信度） | 同质（截断 5→全量，超集） |
| anomaly insight | 页眉副标题 | 同质 |
| contra 扫描概览 6 KPI | B-02（状态／会话＋动作／error／warn／info／安全变体跳过）＋B-09（part） | 同质 |
| contra 按 part 分组 hits＋替代（G5 核心，交互已选清单） | B-03 命中表（动作＋出处／部位／规则／级别／原因）＋B-05 替代建议（已选清单归宿主，见 §3 R2） | 同质 |
| contra 复制修改指令 | B-11（stat 投影，标题逐字「复制修改指令」） | 同质 |
| predict 点预测（当前／预测值／速率／区间） | B-02 KPI＋B-09（start/end/horizonDays）＋insight 副标题 | 同质（曲线见 §3 R4） |
| goal-predict（目标／当前／ETA／剩余／速率／可行性） | B-02 KPI＋B-09（start/end，无目标即阻断） | 同质（曲线见 §3 R4） |
| 全页 | B-01 壳＋fillTemplate 全文档（裸标记；图表页加 CHARTS-HELPERS） | 同质（旧 pageShell 片段→单文件自足；零 `<!--` 残留逐字断言） |

## 2. 验收证据（本机实测 2026-09-09）

- 新测试 `test/trend-homogeneity-110.test.mjs`：**12／12 绿**（唤醒词 17 词→6 键路由；
  路由 cli 直跑 3 条产全文档；6 键区块/数值/对照针：combined days=7／aCount=7／
  correlationN=3、deficit avgIntake=863、anomaly findingCount≥1、contra errorCount≥1、
  predict current=70.2、goal-predict targetKg=65；空库 6 case 一律 exit 4＋stdout 空；
  99d 非法窗 exit 2；weight_deficit 分桶节＋custom 窗＋节级门控；
  组合分析 `组合分析_<TS>.html` 落点＋回传一致＋落盘为全文档；复制头对齐冻结版本）。
- 包级回归：`node --test packages/skill-calorie/test/*.test.mjs test/calorie-triggers.test.mjs
  test/calorie-routing-81.test.mjs test/scaffold.test.mjs test/combos-42.test.mjs` →
  **tests 241／pass 241／fail 0**（#109 的 229 ＋本票 12；含 #119、#87、#100 空库三键）。
- 抖动项隔离复跑：`db-readonly-93` **8／8 绿**（readonly/writable data/html 全等，本票 html 变更下成立）。
- 四门：`pnpm build`（tsc＋HELP 注入）／`boundaries`（PASS）／`test:types`（tsc -b exit 0）／
  `snapshot:check`（exit 0）／`publish:pre`（PASS）。
- 全仓 `pnpm test`：`t101-fail-set.mjs` 比对基线：
  **base=27 after=27 新增=0 消失=0**（与 #108/#109 同基线，均为并行抖动/既有失败）。

## 3. 已知限制／记账（不阻塞，体验等价性声明）

- R1 双轴缺日语义：旧运动侧缺日按 0 归一、量型侧跨缺连线；新冻结口径
  `value: null` 视为缺失断点（不断 0、不连线），页内以「空缺断点不断 0」明示。
  口径差异已在本表声明。
- R2 交互归宿主（B7）：配对/窗口切换、禁忌已选清单、复制激活（bindCopyAction）
  一律宿主侧；静态页给 `data-*` 约定＋原生 details。浏览器实测回读归 #89b。
- R3 长窗截断：逐日明细／缺口明细／命中表 100 条截断，页内明示「仅列前 N 条」；
  envelope 不受影响（复制走投影）。
- R4 双预测无曲线：点预测＋区间＋insight；体重/目标趋势曲线需求归 combined
  对应配对（weight_calorie 双轴线即体重趋势），不另造图。
- R5 沿用 #119 残留 R1–R5（contra/缺省/photo 命名补丁）：本票只消费命名底座
  （组合分析动态段），不改落点实现。
- R6 空窗/空库/无目标一律 missing-data（exit 4），不编数；非法窗 exit 2（#103 G4
  白名单：Nd 仅收 7/15/30/60/90/180/365d，99d 等拒收不回退）。
- R7 combined 154 词子集→同质：旧 154 场景 11 配对唤醒词新路由全命中（scene 10
  183 exec 项覆盖，营养交叉/饮水/围度对在内），各 pair×window 同键不同参直出单窗页；
  多指标组合趋势（g1–g11）与目标线/里程碑/异常点复合形态为 #81「命中但不执行」既有桶，
  非本票新缺口。
- R8 趋势遗留词：查热量趋势→calorie.history（非本域）；看整体趋势 MISS→#111
  long_trend（需移植），已在测试外注明、本票不收。

## 4. 交接

- #108–#110 同质三票收官：饮食 8 键（dietDocs）／运动身体 9 键（sportDocs）／
  趋势分析 6 键（trendDocs），合计 23 键裸片段→全文档；envelope、模板闭集、冻结面零改动。
- #111–#113 移植票可照抄本票模式：新建域 `*Docs.ts`（`assemble`＋`copyBlock` 照抄
  `render/trendDocs.ts` 头 90 行）＋dispatch 换 `html`＋`*-homogeneity-11x.test.mjs`，
  envelope 不动；stat 投影 metrics 只收确定数字。
- 并发注意：`cmd_read.ts` 仍是共享文件；禁区 {108,109,110} 随 #108/#109/#110 全关解除，
  后续 #86/#88（wizard/HELP，不同文件）按串行序推进。
