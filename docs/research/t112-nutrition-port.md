# #112 营养移植 4 键 · 证据（map #63）

- 范围：t71「需移植」营养 4 项（D2 只许追加键、禁改名；#108 R4 记账回收）。
  `calorie.view.nutrition-ratio`（nutrition_ratio：蛋白/碳水/脂肪占比＋实际 vs 目标）／
  `calorie.view.nutrition-detail`（nutrition_detail：纤维/钠/糖 vs 固定推荐）／
  `calorie.view.source-stats`（source_stats：GROUP BY 来源整表）／
  `calorie.view.today-water`（today_water：累计/距目标/每杯时间/进度环）。
- 范围口径：票面括号“批量导入预览、营养六因子、来源／lint 等”为拆分前 loose 表述；
  以 t108 证据＋计数闭合为准：本票＝ratio／detail／source／water，
  #113＝批量导入预览／lint／六因子／nutrition_analysis／calorie_trend／long_trend／
  process_progress／review_template（趋势 2＋其他 6，计数 6＋4＋8＝18 闭合）。
- 非范围：上段 #113 八项／47 页已有（#108–#110 已关）／运动 6（#111 已关）／
  训练计划写键（#86）／HELP（#88）。
- 实施：`src/cli/keys.ts` 追加 4 读键（83→87：读 48→52，写 35 不动）；
  `packages/base-combos/combos.yaml` combos 段同步 4 条（`gen-present.mjs` 重生成
  `present.ts` 93→97，`check-combos` 全过，channels 15 不动）；
  新增 `src/render/nutritionPort.ts`（4 取数 builder）＋`src/render/nutritionPortDocs.ts`
  （4 装配函数，`assemble`＋`copyBlock` 照抄 sportPortDocs 头 90 行）；
  `src/cli/cmd_read.ts` 加 4 分发（只读 start/end／date 窗，metrics 只收确定数字）；
  `src/triggers/routing.ts` 促进 1 词 non-exec→exec（看营养素深度→nutrition-detail）＋
  `NEW_KEY_ROUTES` +4（44 键）；
  `scripts/build-help.mjs` REPR＋example +4；SKILL.md 散文计数 83→87（互联区构建重生成）；
  `docs/calorie-architecture.md:58`＋`.html` 计数同步；8 处 `length===83` 断言→87；
  路由测试数字同步（337/99/89/44/87/233/481/382）；`t81-exec-smoke.md` 重生成；
  `pnpm snapshot` 重写；新增 `test/nutrition-port-112.test.mjs`（12 用例）。

## 1. 逐项对照表（旧模板节 → 新区块，区块级尺）

| # | 旧模板节 | 新装配 | 判定 |
|---|---|---|---|
| ratio KPI3（蛋白/碳水/脂肪 g） | B-02（同 3 格＋总摄入格；extra 给 pct%·目标 g） | 同质（目标无行即“—”，见 §3 R6） |
| ratio 热量来源占比饼 | B-04 donut（蛋白×4／碳水×4／脂肪×9，showPercent） | 同质（饼→donut，冻结层有 donut 接口，见 R2） |
| ratio 推荐范围对比表（实际/下限/上限/距范围/状态） | B-03（同 6 列；下限/上限按总热量占比换算，4/4/9kcal·g 沿旧） | 同质 |
| detail 微量营养素 vs 推荐（纤维/钠/糖 bar＋推荐） | B-03 表（营养素/累计/日均/推荐/占比/状态；百分比＝日均 vs 每日推荐，沿旧 D5.4） | 同质（bar 改表，见 R3） |
| detail 缺数据盒（未命中食物） | B-08 折叠（缺数据食物清单＋「存食品」补录指引） | 同质 |
| source KPI2（来源数/食品总数） | B-02（同 2 格；下架已排除） | 同质 |
| source 按来源分组条 | B-04 bar＋B-03 表（来源/条数/占比；空串来源归“未知”沿旧） | 同质 |
| water 今日进度 ring（累计/目标/还差） | B-02 KPI（今日/目标/进度）＋B-04 donut 单段（已喝/未喝） | 同质（ring→donut＋KPI，见 R4） |
| water 本周 7 天 bar | B-04 bar（MM-DD＋周几标签） | 同质 |
| water 今日每杯（时间/ml） | B-03 表（时间/饮水量；空杯“今天还没有喝水记录”沿旧） | 同质 |
| 全页 | B-01 壳＋fillTemplate 全文档（裸标记；图表页加 CHARTS-HELPERS） | 同质（零 `<!--` 残留逐字断言） |

## 2. 验收证据（本机实测 2026-09-09）

- 新测试 `test/nutrition-port-112.test.mjs`：**12／12 绿**（5 词→4 键路由；
  路由 cli 直跑 3 条产全文档；ratio 870 卡 p10/c75/f13＋目标 300/400/100／
  detail 匹配 3 餐缺 2 种（纤维 2.4／钠 66.5／糖 6.9）／source 3 条 2 来源／
  water 800/2000＝40% 还差 1200＋2 杯；空库 4 case 一律 exit 4＋stdout 空；
  start>end exit 2；date 非 ISO exit 2；
  营养配比 `营养配比_<TS>.html` 落点＋回传一致＋落盘为全文档；复制头对齐冻结版本）。
- 包级回归：`node --test packages/skill-calorie/test/*.test.mjs test/calorie-triggers.test.mjs
  test/calorie-routing-81.test.mjs test/scaffold.test.mjs test/combos-42.test.mjs` →
  **tests 265／pass 264／fail 1**（#111 的 253 ＋本票 12；唯一红为 R17 本票外漂移；
  含 #119、#87、#100 空库四键、#93 只读 52 键单跑全绿）。
- 抖动项隔离复跑：`db-readonly-93`（52 键只读/可写全等，本票 html 新增下成立）。
- 路由全链：`t81-exec-smoke.md` 重生成（382 条：SoT 337＋新拟 44＋修复 1；381 绿＋
  1 红为本票外既有日历漂移见 R17，本票 5 条全绿；4 新键裸跑可跑——默认窗回填，
  结构性断言覆盖面本票前后均为 106，见 R18）；`routingSummary` 436/337/99/10/89/44/1/87。
- 四门：`pnpm build`（tsc＋HELP 注入）／`boundaries`（PASS）／`test:types`（tsc -b exit 0）／
  `snapshot:check`（exit 0，重写后）／`publish:pre`（PASS）。
- 全仓 `pnpm test`：`t101-fail-set.mjs` 比对基线：
  **base=27 after=29（新增 3 消失 1）**——新增 `#81 唤醒词路由层` suite 行＋`FX-81-5`
  同源（R17 日历漂移）＋`#93 ① 52 读键`改名行，消失 `#93 ① 42 读键`旧名（相对 #111
  即 48→52 断言同步 artifact；行为同基线：单跑 8/8 绿、全量并行跑红，基线 27 内
  本就有 `#93 ① 42`＋`#93 回归 CLI` 两条同模抖动）。其余 26 条与基线一致
  （dsh-* 烟囱/client 既有失败，本图不碰插件包）。

## 3. 已知限制／记账（不阻塞，体验等价性声明）

- R1 分类口径收敛（#111 T2 记账）：本域无分类推断——食物名原样使用；
  nutrition_detail 库匹配为精确名匹配（沿旧 `food not in lib`），R12 双向子串
  不扩散到本域（证据：`米饭团`不吃`米饭`子串红利，测例钉死）。
- R2 饼→donut：冻结图表层有 donut 接口（D8 只做实际用到的接口），数据（热量贡献占比）无损。
- R3 detail bar→表：旧横向占比条无等价冻结块，改明细表（累计/日均/推荐/占比/状态全保留）。
- R4 water ring→donut＋KPI：进度环语义（已喝/未喝/百分比/还差）全保留，中心数值由 KPI 承担。
- R5 占比舍入实现差异：旧 Python `round` 为银行家舍入，本层 `Math.round` 半值上入；
  pct 整数差至多 1（balance 阈值判定不受影响：阈值皆非 .5 边界）。
- R6 目标回退口径：旧脚本无目标行时回退 (120,200,60,1800) 硬编码；本层沿新侧约定
  （无 daily_goal 行即 null 展示“—”，不编数；G5 诚实口径优先于旧回退）。
- R7 纤维状态口径沿旧：三项一律 pct<=100 即 ok（含纤维≥推荐仍 ok，旧模板未反转）；
  如需“纤维越多越好”语义，归 #113 nutrition_analysis 或另票。
- R8 空窗/空库/库空一律 missing-data（exit 4），不编数；非法窗／非法 date exit 2
  （start 晚于 end；date 走 assertISO；#103 G4 白名单仅约束 window 具名参数）。
- R9 source 空库 missing：库空（total 0）即 missing-data（旧渲染 0 来源页；G5 不返空优先）。
- R10 water 缺水窗 missing：当日＋7 天全无饮水行即 missing（旧渲染 0 页；G5 不返空优先）；
  当日 0 但窗内有水仍渲染（“还差 xml”数据驱动）。
- R11 周一口径收敛：today-water 7 天窗＝date 当天往前 6 个自然日（沿旧“含今天，
  最早 6 天前”）；周一派生是计划会话域口径，不扩散到本域（测例钉死 09-01 起点）。
- R12 子串收敛：见 R1（精确名匹配；运动 review 域双向子串不动）。
- R13 钠糖纤维趋势／综合两词仍 non-exec（`noNutrientDetail` 理由已按本票现实重述，
  指向趋势／综合报告形态缺失）：归 #113 nutrition_analysis；营养建议／六因子／lint
  同理归 #113（理由常量零引用改动，仅数字 83→87）。
- R14 查营养结构／看营养结构／看今日营养／看食品来源统计／看今日喝水 5 词维持既有
  指向（diet-review／library／home 孪生承载，#109 测试钉死＋FX-81-7 既有判定）：
  本票未重指，新 4 键经新拟词可达（Q1 式维持，见 #111 Q1）。
- R15 水行排除声明：ratio／detail 查询排除 WATER_NAME 行；水行宏量全 0，
  排除与否数值无差（与 diet.ts getDailySummary 同约定）。
- R16 t81-route-evidence.md §2.3 旧表保留为历史记录（#111 R16 同例，本票不改旧表）。
- R17 本票外既有红（不阻塞本票，待总控裁决）：`复制昨日运动`
  （`calorie.exercise.add` `copyFrom:yesterday`，#40 链条目，本票零改动）在
  2026-09-09 重跑 smoke 时 exit 4（昨日 09-08 在标准种子内无行；种子最大日期
  09-07）。机制＝相对日期词＋固定种子随日历漂移：在 09-08（含）前重跑为绿，
  09-09 起恒红，与本票 diff 无关（三文件 routing/cmd/write 均不在本票 diff 内，
  本票 smoke 增量 5 条全绿）。处置建议（另票）：种子补相对日期行或该词转固定
  示例窗；本票不断言、不碰。
- R18 结构性断言覆盖面 112→106（本票校准，非本票漂移）：112 为 #81 初值；
  #111 regen 后实测已为 106（HEAD md 复算 rows1=377／bareFailKeys=41／checked=106），
  系 #81→#111 间 6 条记录的键转为裸跑可跑，被 R17 零检掩盖而 #111 作“112 不变”记账。
  本票 regen 前后均为 106（本票 5 条增量键全裸跑可跑，delta 中性），故测试断言取真值
  106 并附注；待 R17 修复票解零检后本行即生效。本票不追溯 6 条之源（#81 旧码已不可考，
  且与本票 diff 无关）。

## 4. 交接

- #112 移植之次席收官：营养 4 键（nutritionPort＋nutritionPortDocs，envelope 新增
  4 stat；模板闭集 CALORIE_TEMPLATES 6 件不动；冻结面 base-paint 不动；
  SKILL.md 互联区构建重生成）。
- #113 照抄本票模式：① `keys.ts` 追加（禁改名）→ ② combos.yaml 同步（title 逐字同值，
  `gen-present`＋`check-combos`）→ ③ 取数 builder＋`*Docs.ts`（assemble＋copyBlock 照抄
  本票头 90 行）→ ④ dispatch 换 `html`（metrics 只收确定数字）→ ⑤ 路由促进／
  新拟＋REPR/example → ⑥ `*-port-113.test.mjs` 12 用例 → ⑦ 全链数字同步
  （各 `length` 断言＋`t81-exec-smoke.md` 重生成＋`pnpm snapshot` 重写）→ ⑧ 四门＋t101。
- 并发注意：`cmd_read.ts`／`keys.ts`／`routing.ts`／`combos.yaml` 仍是共享文件；
  #113 与本票同文件，必须串行（#112 关票后再开工）；#86/#88 不同文件按串行序推进。
