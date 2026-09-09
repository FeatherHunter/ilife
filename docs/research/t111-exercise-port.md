# #111 运动移植 6 键 · 证据（map #63）

- 范围：t71「需移植」运动 6 项（D2 只许追加键、禁改名）。`calorie.view.exercise-strength`
  （exercise_strength：按动作聚合＋重量轨迹）／`calorie.view.exercise-cardio`
  （exercise_cardio：按类型聚合＋配速）／`calorie.view.exercise-distribution`
  （exercise_distribution：分类占比＋摄入/TDEE 联动）／`calorie.view.exercise-recap`
  （exercise_recap：多窗复盘＋TOP5＋一句话）／`calorie.view.exercise-review`
  （exercise_review：计划 vs 实绩）／`calorie.view.exercise-trend`
  （exercise_trend：日序列＋周频次＋峰值）。
- 非范围：process_progress（落地/训记二期：O3 `oosXunji`＋M8 `oosLanding` 命中但不执行，
  路由零改动，本票仅 verify 仍命中）／营养 4（→ #112）／趋势 2＋其他 6（→ #113；
  澄清 t110 R8：`long_trend` 归 #113，`查热量趋势→history` 已有归宿）／47 页已有
  （#108–#110 已关）／训练计划写键（#86）／HELP（#88）。
- 实施：`src/cli/keys.ts` 追加 6 读键（77→83：读 42→48，写 35 不动）；
  `packages/base-combos/combos.yaml` combos 段同步 6 条（`gen-present.mjs` 重生成
  `present.ts` 87→93，`check-combos` 全过，channels 15 不动）；
  新增 `src/render/exercisePort.ts`（6 取数 builder）＋`src/render/sportPortDocs.ts`
  （6 装配函数，`assemble`＋`copyBlock` 照抄 trendDocs 头 90 行）；
  `src/cli/cmd_read.ts` 加 6 分发（只读 start/end 窗，metrics 只收确定数字）；
  `src/triggers/routing.ts` 促进 10 词 non-exec→exec（总览×2＋筛选×2→strength/cardio，
  计划复盘系 6 词→review）＋`NEW_KEY_ROUTES` +6（40 键）；
  `scripts/build-help.mjs` REPR＋example +6；SKILL.md 散文计数 77→83（互联区构建重生成）；
  `docs/calorie-architecture.md:58`＋`.html` 计数同步；7 处 `length===77` 断言→83；
  路由测试数字同步（336/100/90/40/83/232/477/377）；`t81-exec-smoke.md` 重生成；
  `pnpm snapshot` 重写；新增 `test/exercise-port-111.test.mjs`（12 用例）。

## 1. 逐项对照表（旧模板节 → 新区块，区块级尺）

| # | 旧模板节 | 新装配 | 判定 |
|---|---|---|---|
| cardio KPI4（次数/时长/距离/平均配速） | B-02（同 4 格；配速＝总分钟/总公里距离加权，沿旧） | 同质 |
| cardio 按类型聚合表（类型/次数/时长/距离/配速） | B-03（同列＋配速列）＋逐条记录表（日期/类型/时长/距离/备注，100 条截断） | 同质（记录表新增，服务筛选词） |
| distribution KPI4（动态） | B-02（会话/总消耗/摄入/缺口固定 4 格） | 同质（动态→固定，见 §3 R2） |
| distribution 双饼（按类型占比/按热量分布） | B-04 双 bar（按分类热量分布＋按分类次数占比） | 同质（饼→bar，冻结层无 pie，见 R2） |
| distribution 明细表（distribution/contribution 双 mode） | B-03 分类明细（＋热量占比/次数占比双列）＋摄入/TDEE 联动折叠（摄入/运动/TDEE/缺口） | 同质 |
| recap KPI4（时长/消耗/频次/类型分布） | B-02（总时长/总消耗/频次/覆盖分类） | 同质 |
| recap 类型分布＋高频 TOP5 | B-03 分类表＋TOP5 表（截断沿袭，明细见运动总览全量表） | 同质 |
| recap 每日消耗趋势＋一句话总结 | B-04 line（空缺断点不断 0）＋页眉副标题一句话 | 同质 |
| recap --period（week/month/90d/year/range） | B-09 start/end（同键不同参单窗直出） | 子集→同质（见 R3） |
| review 每日完成率热力图 | B-03 每日明细完成列（是/否） | 同质（热力图无等价冻结块，见 R4） |
| review 容量 combo＋负荷 line | B-04 计划 vs 实做 bar（会话完成率＋动作完成率 KPI） | 同质（见 R4） |
| review 每日明细表（日期/计划/组数/实做/完成率/异常） | B-03（日期/计划/计划动作/实做/完成）＋未完成折叠 | 同质 |
| review 复制回 AI | B-11（stat 投影，标题逐字「复制数据」） | 同质 |
| strength KPI4（动作数/组数/总重量/平均每组） | B-02（动作数/总组数/总重量/总次数；单侧口径沿旧） | 同质 |
| strength 按动作聚合表＋重量轨迹（近 10 训练日） | B-03＋B-04 line | 同质 |
| trend KPI4（天数/时长/消耗/峰值） | B-02（同 4 格） | 同质 |
| trend 每日消耗双柱（卡＋时长） | B-04 line 双 series（消耗实线＋时长虚线独立刻度） | 同质（柱→线，见 R5） |
| trend 每周频次柱 | B-04 bar | 同质 |
| 全页 | B-01 壳＋fillTemplate 全文档（裸标记；图表页加 CHARTS-HELPERS） | 同质（零 `<!--` 残留逐字断言） |

## 2. 验收证据（本机实测 2026-09-09）

- 新测试 `test/exercise-port-111.test.mjs`：**12／12 绿**（16 词→6 键路由；
  路由 cli 直跑 3 条产全文档；strength 1080kg/18次／cardio 4.78分/公里／
  distribution 1320卡/2689摄入/缺口自洽／recap 6次一句话／review 3场100%＋动作66.67%／
  trend 峰值600；空库 6 case 一律 exit 4＋stdout 空；start>end exit 2；
  力量训练总览 `力量训练总览_<TS>.html` 落点＋回传一致＋落盘为全文档；复制头对齐冻结版本）。
- 包级回归：`node --test packages/skill-calorie/test/*.test.mjs test/calorie-triggers.test.mjs
  test/calorie-routing-81.test.mjs test/scaffold.test.mjs test/combos-42.test.mjs` →
  **tests 253／pass 252／fail 1**（#110 的 241 ＋本票 12；唯一红为 R17 本票外漂移；
  含 #119、#87、#100 空库六键、#93 只读 48 键单跑全绿）。
- 抖动项隔离复跑：`db-readonly-93`（48 键只读/可写全等，本票 html 新增下成立）。
- 路由全链：`t81-exec-smoke.md` 重生成（377 条：SoT 336＋新拟 40＋修复 1；376 绿＋
  1 红为本票外既有日历漂移见 R17，本票 16 条全绿；需参数结构性断言 112 不变——
  6 新键裸跑可跑）；`routingSummary` 436/336/100/10/90/40/1/83。
- 四门：`pnpm build`（tsc＋HELP 注入）／`boundaries`（PASS）／`test:types`（tsc -b exit 0）／
  `snapshot:check`（exit 0，重写后）／`publish:pre`（PASS）。
- 全仓 `pnpm test`：`t101-fail-set.mjs` 比对基线：
  **base=27 after=29（新增 2＋改名 1）**——新增 `#81 唤醒词路由层` suite 行＋`FX-81-5`
  同源（R17 日历漂移）；改名 `#93 ① 42→48` 为断言同步 artifact（行为同基线：
  单跑绿、全量并行跑红，基线 27 内本就有 `#93 ① 42`＋`#93 回归 CLI` 两条同模抖动，
  本票单跑 8/8 绿）。其余 26 条与基线一致（dsh-* 烟囱/client 既有失败，本图不碰插件包）。

## 3. 已知限制／记账（不阻塞，体验等价性声明）

- R1 分类口径：库内实填优先、缺失按名推断（沿旧模板）；`view.exercise` 的纯推断口径不动，
  两处实现差异已在本表声明（实填与推断冲突时本票从实填）。
- R2 双饼→双 bar：冻结图表层无 pie 接口（D8 只做实际用到的接口），数据（双占比）无损。
- R3 复盘 period→start/end：旧 `--period` 必填五档映射为调用方给窗；多窗各直出一页
  （#109/#110 同键不同参范式）；旧 `range --from/--to` 即 start/end。
- R4 review 图形降级：热力图/容量 combo/负荷曲线无等价冻结块，改明细表＋完成率 KPI＋
  计划vs实做 bar；完成语义（会话完成率/动作完成率/未完成清单）全保留。
- R5 趋势双柱→双线：同数据（消耗＋时长）双 series，空缺断点不断 0（沿 t110 R1）。
- R6 TOP5 截断沿袭旧模板；全量明细见运动总览按类型表（超集）。
- R7 空窗/空库/窗内无计划会话一律 missing-data（exit 4），不编数；非法窗 exit 2
  （start 晚于 end；#103 G4 白名单仅约束 window 具名参数，本票 start/end 走 assertISO）。
- R8 逐条记录/逐日明细 100 条截断，页内明示；envelope 不受影响（复制走投影）。
- R9 process_progress＋训记词：O3/M8 命中但不执行零改动（`oosXunji` 2 词＋`oosLanding` 3 词
  仍 non-exec/out-of-scope，A7 断言 10 词不变）；`exercise_log.xunji_*` 列只读不写。
- R10 备注仅展示：逐条表备注列不做筛选维度；`看运动记录（有备注）` 仍 non-exec
  （`noNoteFilter` 有效，A7 外其余 legacy-chain：100→90 仅本票 10 词翻转）。
- R11 会话日期周一口径：`day_of_week` Monday=1（老家 weekday 同源），由 `start_date`
  派生；休息日不计；`start_date` 缺失即 missing（无计划）。
- R12 动作命中双向子串（计划名含实做或反之，中文原样）；会话完成＝当日有任意运动记录。
- R13 重量单侧口径（Σload×reps）沿旧模板；无 load/reps 即“—”，不估算（不用 MET 反推）。
- R14 配速总分钟/总公里（距离加权）沿旧模板；无距离不算配速。
- R15 多指标整体趋势（g1–g11）仍 non-exec（`multiTrendMissing` 有效）→ #113 long_trend；
  t110 R8「→#111」注记以本票澄清为准（#111 只收运动 6，计数 6＋4＋8＝18 闭合）。
- R16 `categoryOverviewMissing`／`planReviewMissing`／`recordFilterMissing` 三理由常量保留
  （冻结文案，零引用不断言；t81 证据表 §2.3 对应 10 行已由本票翻转，旧表保留为历史记录）。
- R17 本票外既有红（不阻塞本票，待总控裁决）：`复制昨日运动`（`calorie.exercise.add`
  `copyFrom:yesterday`，#40 链条目，本票零改动）在 2026-09-09 重跑 smoke 时 exit 4
  （昨日 09-08 在标准种子内无行；种子最大日期 09-07）。机制＝相对日期词＋固定种子随日历漂移：
  在 09-08（含）前重跑为绿，09-09 起恒红，与本票 diff 无关（三文件 routing/cmd/write 均不在
  本票 diff 内）。处置建议（另票）：种子补相对日期行或该词转固定示例窗；本票不断言、不碰。
  严格复盘窗同理：`计划复盘（本周）` 示例窗取 09-01~07（覆盖标准种子计划会话，
  调用方按自然周传参；09-07 单日窗在无 wk2 会话的种子上正确 missing，本票示例从可跑性取整窗）。

## 4. 交接

- #111 移植之首收官：运动 6 键（exercisePort＋sportPortDocs，envelope 新增 6 stat；
  模板闭集 CALORIE_TEMPLATES 6 件不动；冻结面 base-paint 不动；SKILL.md 互联区构建重生成）。
- #112/#113 照抄本票模式：① `keys.ts` 追加（禁改名）→ ② combos.yaml 同步（title 逐字同值，
  `gen-present`＋`check-combos`）→ ③ 取数 builder＋`*Docs.ts`（assemble＋copyBlock 照抄
  sportPortDocs 头 90 行）→ ④ dispatch 换 `html`（metrics 只收确定数字）→ ⑤ 路由促进／
  新拟＋REPR/example → ⑥ `*-port-11x.test.mjs` 12 用例 → ⑦ 全链数字同步
  （各 `length` 断言＋`t81-exec-smoke.md` 重生成＋`pnpm snapshot` 重写）→ ⑧ 四门＋t101。
- 并发注意：`cmd_read.ts`／`keys.ts`／`routing.ts`／`combos.yaml` 仍是共享文件；
  #112/#113 与本票同文件，必须串行（#111 关票后再开工）；#86/#88 不同文件按串行序推进。
