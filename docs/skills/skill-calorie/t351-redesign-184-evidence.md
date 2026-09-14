# T351 重做「看完整计划」证据：order176–185 计划查看页版式（实施兵）

范围：计划查看页（176–185 共用装配件）按规格 `docs/skills/skill-calorie/t351-redesign-184-spec.md` 重做；
动作字段形状按票面在唯一出处补类型。issue 未动；201–207 与 195 相关件一字未动；186–190（写前预览／
构建向导）不动；无新增公共层件、无新增样式。

## 一、做法

- 页头：大标题「健身计划」＋眉标「训练计划查看」＋副标题（计划名 · 版本 · 共 N 周 · 起日）。
  版本与起日取自 `workout_plan_config.version`／`start_date`，库列为空则整段不印（缺项不占位）。
- 指标卡：总场次／总动作／总周数（总周数 detail 写计划总周数；窗内无安排写「周有安排 0」）。
- 明细区：每周一个原生 `<details open>`（`renderDisclosure`，纯 HTML、零内联脚本，替代老页 JS 页签）→
  周内每场一张会话卡（`<details open>`，标题「周X · 时段 · 会话名 · N 组」；休息日卡标题写「休息日」，
  卡内一句话不出表）→ 卡内六列动作明细表（动作／部位／类型／组数×次数／重量／备注，数值列右对齐）。
  组数＝`sets.length`，次数＝`sets[].reps`，同重复数写「3组×12次」、逐组不同写「3组×10／8次」；
  重量＝`sets[].weight` ＋ `unit`（逐组同一写「35kg」，逐组不同写「30／35kg」）；部位／类型／备注为
  纯文本（部位色块与混排单元格公共层无接口，本轮降级为纯文本）。老页的「休息」列库中无此字段，不印，
  列位让给备注。
- 空态：窗内零场时出完整空页（页头＋指标卡＋空态区块＋复制区），沿用 order178 空窗语义，不返白页。
- 复制区：「复制数据／复制日志」冻结双按钮（`renderCopyBlock` 单格式数据文本直挂，与 201–207 同形；
  无三格式菜单、无 text／json／csv 英文菜单项），按钮补冻结 id `ilife-copy-data`／`ilife-copy-log`。
  载荷不照抄老页 `scene.snapshot`：计划数据投影成信封 `list` 形（`items` 逐周一行「第 N 周 · X 场 ·
  周X 会话名 N 个动作」、`total` 记会话数），日志用 `CopyLogFields` 五键（命令原文取自回执命令行）。

## 二、写集合对账（必报五步第五步）

| 文件（LF） | 改动 | 事先清单 | 着落 |
|---|---|---|---|
| `packages/skill-calorie/src/render/workoutPlanDocs.ts`（346） | 计划查看页结果装配重写（页头／指标卡／周折叠／会话卡／六列明细／空态／双按钮复制区）；过程两页不动 | `src/render/` 重写装配 | 对上 |
| `packages/skill-calorie/src/render/planPlate.ts`（231） | `PlanView` 补 `version`／`startDate` 两字段并在 `buildPlanView` 取数（同一处 config 取值，不加取数路径） | 同在 `src/render/` 内（装配链的取数面） | 对上（清单写在目录级，此处为同目录第三件） |
| `packages/skill-calorie/src/workout/planStore.ts`（369） | `PlanMovement` 补 `note?: string` 与 `sets?: { reps; weight; unit }[]`（只补类型形状，不加字段、不建表、不改库） | `src/workout/` 仅补类型形状 | 对上 |

未碰：`packages/skill-calorie/test/**`、`src/render/{html.ts,planPlate 之外件}`、201–207 两件、195 各件、
`base-paint`、issue。

**超线报警（第五步第四步）**：`planStore.ts` 现 369 行（本次 ＋3 行，改前 366 行已超线），
**已超线，需要根据规则进行重构。** 超因：取数＋写数＋周操作同处一件；本次先不拆（票面限定只补类型形状，
且基线已超线、本包台账未挂号），拆法待后续票定。`workoutPlanDocs.ts` 346 行、`planPlate.ts` 231 行，
均在本包 350 行告警线内，不需要拆分。

## 三、机器证据

1. 类型检查：`pnpm exec tsc -b packages/skill-calorie` → exit 0（重写后与还原后各一次）。
2. 变异探针（`.scratch/t351-fix/redesign/probe-redesign-184.mjs`，12 条判据：六列表头逐字按序／
   紧凑写法／双按钮 id 与中文名／doctype／页头三行／details 计数／零英文菜单项／零内联事件／空窗页）：
   - 变异红：把明细列临时去掉（部位／类型／组数×次数／重量 四列）→ `PROBE: RED（FAIL 2／12：
     六列表头逐字按序、紧凑写法）` exit 1，摘要 `8e3d1e3dd9a3452b3d07de01ad3229632ecee63f53625df842640432ccf6d1bc`。
   - 还原一致：还原源件（sha256 与备份一致 `601599105BB5FA0563F29A6A400AD12F619DCD13F29B4C12C28B38B0F0857D43`）
     重新构建 → `PROBE: PASS（12/12）` exit 0，摘要 `356a5c3db9fe34633f9b3f774e7bde29ac79387bbcffbdbe568f27a33202d3b6`
     ——与变异前基线逐字节一致（摘要把页内渲染时刻抹平成 `TS` 后计算）。
     （还原后需触碰源件更新时间再构建：`tsc -b` 按时间戳判增量，只覆盖文件会让 dist 仍停在被变异的那版。）
3. 持锁复跑 176–185：`node tooling/run-locked.mjs --ticket 351 -- node .scratch/t351-fix/final-v2/run-176-185-v2.mjs`
   → `{"total":10,"fails":[]}` exit 0（runId `3f64e74e-21f8-4cc6-8555-6190289ea35f`，waitedMs=120015，
   同口径种子、库隔离在 `.scratch/t351-fix/final-v2/176-185/dbs/`，不碰真库）。
4. 十份产物批检（`.scratch/t351-fix/redesign/check-176-185-v2.mjs`）：`ALL10 PASS`（doctype＋页面壳、
   双按钮 id 与中文名、正文区无三格式菜单；176–184 六列表头逐字按序；178 出空态句）。
   真机 184 探针：`PROBE: PASS（4/4）`。
5. 抽查 order184 四项读数（`.scratch/t351-fix/redesign/spotcheck-184.mjs`）：
   - ① doctype＝true（页面壳 `ilife-page`＝true，61721 字节）
   - ② 标题：h1＝健身计划；眉标含「训练计划查看」＝true；副标题＝`t1计划 · 版本 v1 · 共 4 周 · 起日 2026-09-07`
   - ③ 六列明细表头＝`动作／部位／类型／组数×次数／重量／备注`（表数＝4，逐场一张）
   - ④ 双按钮：id＝true/true；中文名＝true/true；正文区无三格式菜单＝true
   - `detail.json`：exit=0、hasShell=true、hasKeyword=true、
     metrics=`{"totalSessions":4,"totalMovements":4,"totalWeeks":4}`（与旧口径逐键一致）
6. 靶向单测（`node --test --test-concurrency=1`）：`render-t41` 10/10 绿（含「训练计划查看」与「test计划」断言）、
   `cli-smoke-t41` 1/1 绿。既有红与本票无关且已在册：`exercise-port-111` 1 条（唤醒词「看运动记录（按力量筛选）」
   路由漂移）、`copy-component-179`＋`render-copy-90` 6 条（#239 复制区台账在册红，见 `t276-证据.md:142`）。

## 四、逐份路径（双击可打开）

| order | 路径 | 字节 | h1 |
|---|---|---|---|
| 176 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order176-result.html` | 59359 | 健身计划 |
| 177 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order177-result.html` | 59344 | 健身计划 |
| 178 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order178-result.html` | 57167 | 健身计划（空窗页） |
| 179 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order179-result.html` | 59312 | 健身计划 |
| 180 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order180-result.html` | 58255 | 健身计划 |
| 181 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order181-result.html` | 58209 | 健身计划 |
| 182 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order182-result.html` | 58215 | 健身计划 |
| 183 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order183-result.html` | 61721 | 健身计划 |
| 184 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order184-result.html` | 61721 | 健身计划 |
| 185 | `D:\ilife\.scratch\t351-fix\final-v2\176-185\order185-result.html` | 58122 | 计划对比实际 |

复跑脚本：`.scratch/t351-fix/final-v2/run-176-185-v2.mjs`（口径同 `run-176-185.mjs`，只换产物目录）；
探针与批检脚本：`.scratch/t351-fix/redesign/`（探针／批检／抽查三件＋夹具页 `order184-fixture.html`＋源件备份）。

## 五、未做＋下一手

- 未做：186–190（写前预览／构建向导）复制区仍是三格式菜单（本票范围只到 185，未动）。
- 未做：部位色块与混排单元格（老页 `.part-tag` 与 `note ＋ · type` 副行）本轮降级为纯文本；
  若要复原，须另立公共层票给共享区块加接口（建议：`renderDataTable` 支持受信 HTML 单元格，
  或新增部位色块区块），本轮不新增公共层件。
- 未做：`planStore.ts` 369 行超线拆分（另票）、本包台账未挂号该件（另票）。
- 已知风险（另记，不在本票）：写回路径 `workout/write.ts` 的 `asMovement` 不认 `note`／`sets` 元素字段，
  经写命令回填的动作会丢备注（渲染层已按真形状消费，写链归另票）。
- 下一手：用户逐份双击上表 HTML 肉眼终审（页头、每周折叠、会话卡、六列明细、双按钮）；
  通过即收，未通过按判据逐条回修。
