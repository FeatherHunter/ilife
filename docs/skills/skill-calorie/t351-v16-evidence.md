# 票 #351 · 场景05 全量重跑 ＋ 入仓视觉验收墙 · 实跑证据

**本件是什么**：票 #351 机器侧主体的**逐条实跑证据**。27 条可执行唤醒词逐条从**真出口**跑一遍（37 份产物），5 条外部词按本图 Out of scope 记 `non-exec`——共 **32 条**，逐条给读数。

- 跑批件（入仓）：`docs/skills/skill-calorie/t351-v7-run-176-207.mjs`
- 墙生成器（入仓）：`docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs`（照 `scene01-验收墙/gen-wall.mjs` 改，改动只有一处：`--stage` 复制时读清单 `rows[].src`）
- 产物原批目录：`<批>` ＝ `D:\ilife\.scratch\t351-v16\products`
- 墙目录（发布名副本 ＋ 双墙 ＋ 索引）：`<墙>` ＝ `D:\ilife\docs\skills\skill-calorie\scene05-验收墙`
- 门禁运行对账：`docs/skills/skill-calorie/t351-v16-gate-runs.md`（**本件声称跑过的每一次运行，在那件里都有 `GATE-RUN runId=<标识> cmd=<命令>` 一行**）
- 本件**不做视觉判断**（不写「版式正常／好看」这类结论）：机器只负责把真渲染跑出来、把每格「该确认什么」写清、把自检退出码交出来；判定归负责人（`逐格缺陷清单.md` 的两列留空待填）。

---

## 一、开工前先核的三件事（读数）

### 1.1 编译产物同步面

| 件 | 实测 mtime |
|---|---|
| `packages/skill-calorie/src/render/planEditor.ts` | 2026-09-15 15:26:11 |
| `packages/skill-calorie/src/render/planEditorCss.ts` | 2026-09-15 15:43:52 |
| `packages/skill-calorie/src/render/planEditorDocs.ts` | 2026-09-15 15:43:52 |
| `packages/skill-calorie/src/render/planEditorRuntime.ts` | 2026-09-15 **15:49:33** |
| `packages/skill-calorie/dist/render/planEditor.js` | 2026-09-15 **18:38:29** |
| `packages/skill-calorie/dist/render/planEditorCss.js` | 2026-09-15 **18:38:29** |
| `packages/skill-calorie/dist/render/planEditorDocs.js` | 2026-09-15 **18:38:29** |
| `packages/skill-calorie/dist/render/planEditorRuntime.js` | 2026-09-15 **18:38:29** |

⇒ **同步面成立**：编译产物四件均 18:38:29，晚于源码最晚一件 15:49:33，**不需要重编**（本票也没有重编）。
（口径提醒：`packages/skill-calorie/dist` 这个**目录**的 mtime 是 2026-09-13 23:04，那是目录项增删的时间，不是编译时间——要比的是目录里那些 `.js` 的 mtime。）

生成件同步面：`pnpm gen:check` 跑不起（见 `t351-v16-gate-runs.md` §一 #1：本机 pnpm 先做依赖状态自检、要 `pnpm install`，无 TTY 中止；票面禁跑包管理器安装，故不放行），改跑它底层那条命令 `node packages/skill-calorie/scripts/gen-cli.mjs --check` → **exit 0**（runId `t351-v16-gencheck-node`）。

### 1.2 场景05 三条验收测试（引用编排者读数，本席未重跑）

`node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs` → 摘要 `tests 3 / pass 3 / fail 0`；`gate-runs.log` 里同 runId 的 `RUN` 行 `exit=0`（runId `a4fb4f0e-8921-4f4d-9b52-16ead1e13a28`，票号栏记 `157`）。逐字导出见 `t351-v16-gate-runs.md` §四。

### 1.3 载荷面核查：正文里有没有 `calorie.calorie.` 双前缀

命令（只读检索，未持锁，见 gate-runs 件 §二）：

```powershell
Select-String -Path .scratch/t351-v16/products/*.html -Pattern "calorie\.calorie\." -AllMatches
```

**读数：27 份命中、每份恰 1 处、合计 27 处**（不是 0——如实记）。明细：

- 命中 27 份＝**结果页 176–185 十份 ＋ 预检页 186–195 十份 ＋ 复盘／扫禁忌 201–207 七份**；**回执页 186–195 十份零命中**。
- **落点不是正文**：逐份取 `IndexOf("calorie.calorie.")` 定位，命中都在 `id="ilife-copy-log"`（「复制日志」按钮）的 `data-t` 载荷里、`场景标识` 那一行——**不上屏**（跑批件的机检口径把 `data-t="…"` 剥掉后判正文，故 ⑪／⑰ 判绿；正文里确实一处也没有）。
- 逐字样例（4 份，UTF-8 读取）：
  - `order176-result.html` → `calorie.calorie.view.plan（list）`
  - `order186-process.html` → `calorie.calorie.view.plan-wizard（stat）`
  - `order201-result.html` → `calorie.calorie.view.exercise-review（stat）` ← 与 `#156` 地图报的那一条同形
  - `order207-result.html` → `calorie.calorie.view.contraindication（stat）`
- 这一条要改源码才能修（在渲染侧拼「场景标识」那一行的地方多拼了一次 `calorie.` 前缀），**不在本票写集**——按遗留出口写进 `.scratch/t351-v16/handoff.md`，本票只如实记读数、不动源码。

---

## 二、全量重跑

| 项 | 值 |
|---|---|
| 命令 | `node tooling/run-locked.mjs --ticket 351 --run-id t351-v16-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t351-v16/products` |
| runId | `t351-v16-run` |
| 退出码 | **0** |
| 摘要行 | `RESULT: 66/66（产物 37 ＋ 判据 29）` ＋ `PROBE: PASS（29/29 判据全绿）` |
| 产物 | `D:\ilife\.scratch\t351-v16\products\` 下 **37 份 HTML**（＋ `detail.json` 逐条读数 ＋ `dbs/` 隔离库） |
| 库隔离 | 全部读写落在 `D:\ilife\.scratch\t351-v16\products\dbs\` 下（`SKILLS_DB_PATH`），**未碰生产库** |
| 覆盖面 | 只写 `.scratch/t351-v16/products/`；既有批次目录 `final-v3…final-v12` **一件未覆盖**（`--out` 是必填参数，跑批件自己就挡原地重跑） |
| 日志 | `.scratch/t351-v16/logs/run-176-207.log`（长输出重定向；只读末尾 5 行确认退出码，全绿故未检索错误行） |

**29 条判据的关键读数**（逐字摘自 `.scratch/t351-v16/logs/run-176-207.log`，全绿）：

| 判据 | 读数 |
|---|---|
| 份数 | `37 份产物全部落盘（176–185 结果 10 ＋ 186 预检 1 ＋ 187–195 过程 9 ＋ 186–195 回执 10 ＋ 201–207 结果 7） ＝ 份数=37 缺=0` |
| 机检④（表头声明） | `红=0 兜底other=0`——37 份全部落到 `four`／`own1`／`none`，**没有一份落在兜底 `other`**（那正是旧口径的后门） |
| 机检⑤（日志钮） | 每份 `data-action-id="ilife-copy-log"` 恰好一颗、无禁用态 |
| 机检⑩（零 JS，**全量 37 份**） | `红=0 全量脚本块指纹数=1 指纹=21908:(function () {`——每份恰一块共享 helpers，逐字同长同头；正文无内联事件处理器、无 `javascript:` |
| 机检⑪（用词，176–185 十份） | `判份数=10 红=0`——正文不出现「会话」／`main`／`iso`／`calorie.`（`data-t` 载荷不算正文） |
| 机检⑰（用词，**全量 37 份**） | `判份数=37 红=0`——正文不出现内部词「会话」 |
| 过程页 prompt | `过程页 10 份各含本写词的逐字 prompt（执行唤醒词「<词>」＋该词独有句）` 全绿；复制数据标题全中文：`【calorie · 构建向导】／【calorie · 写前预览】` |
| 结果页／回执页不夹 prompt 段 | `结果页 17 份 ＋ 回执页 10 份不含「复制 prompt」那一段` → 泄漏 0 |
| 195 撤销后读 | `exit=4 stderr命中=true`（恢复缺失阻断） |
| 195 回执文案 | 「写后现值＝计划已撤销（配置与训练安排均为空）」命中 |
| 外部五条 | `196–200 外部五条如实记 non-exec（无产物） ＝ 条数=5` |

「机检读数」列的读法（下表逐格照此）：`①`＝ `<!doctype html>`；`②`＝ 真 `id="ilife-copy-data"`／`id="ilife-copy-log"` 各恰好一次（已排除 `data-action-id=` 里的子串）；`③`＝正文禁词（`op=`／`# 成功`／三格式菜单文本／英文命令键标题）；`④`＝表头按**逐份预先声明**对照（`four`／`own1`／`none`，落兜底 `other` 即红）；`⑤`＝日志钮一颗且无禁用态。**全表 37 份：①②③⑤ 逐份合格**（即 `①true ②1/1 ③无 ⑤1`），故下面只写有差别的那几项。

---

## 三、表一 · 27 条可执行唤醒词（37 份产物，逐条实跑）

| # | order | 唤醒词 | 命令（真出口 `dist/cli/cmd_read.js`，key ＋ 参数） | exit | 产物（绝对路径；括号里是发布名副本） | 机检读数 |
|---|---|---|---|---|---|---|
| 1 | 176 | 看本周计划 | `calorie.view.plan` `{"weekOffset":0,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order176-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看本周计划.html`） | ④`four`→四列逐字按序（行 2） |
| 2 | 177 | 看下周计划 | `calorie.view.plan` `{"weekOffset":1,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order177-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看下周计划.html`） | ④`four`→四列逐字按序（行 2） |
| 3 | 178 | 看上周计划 | `calorie.view.plan` `{"weekOffset":-1,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order178-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看上周计划.html`） | ④`none`→本页无表（符合声明，第 0 周空窗） |
| 4 | 179 | 看指定周计划 | `calorie.view.plan` `{"week":1}` | 0 | `D:\ilife\.scratch\t351-v16\products\order179-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看指定周计划.html`） | ④`four`→四列逐字按序（行 2） |
| 5 | 180 | 看今天练什么 | `calorie.view.plan` `{"date":"今日","today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order180-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看今天练什么.html`） | ④`four`→四列逐字按序（行 2） |
| 6 | 181 | 看某动作安排 | `calorie.view.plan` `{"movement":"硬拉"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order181-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看某动作安排.html`） | ④`four`→四列逐字按序（行 2） |
| 7 | 182 | 看某天练什么 | `calorie.view.plan` `{"date":"2026-09-09"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order182-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看某天练什么.html`） | ④`four`→四列逐字按序（行 1） |
| 8 | 183 | 看计划概览 | `calorie.view.plan` `{}` | 0 | `D:\ilife\.scratch\t351-v16\products\order183-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划概览.html`） | ④`four`→四列逐字按序（行 2） |
| 9 | 184 | 看完整计划 | `calorie.view.plan` `{}` | 0 | `D:\ilife\.scratch\t351-v16\products\order184-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看完整计划.html`） | ④`four`→四列逐字按序（行 2） |
| 10 | 185 | 看计划 vs 实际 | `calorie.view.plan-vs-actual` `{"window":"custom","start":"2026-09-07","end":"2026-09-09"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order185-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划 vs 实际.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 11 | 186 | 定训练计划 | `calorie.view.plan-wizard` `{"plan":{…WIZARD_PLAN…}}` | 0 | `D:\ilife\.scratch\t351-v16\products\order186-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-预检.html`） | ④`none`→本页无表（符合声明）；复制数据标题 `【calorie · 构建向导】` |
| 12 | 187 | 复制训练计划 | `calorie.view.plan-write-preview` `{"op":"copy"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order187-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\复制训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 13 | 188 | 定休息日 | `calorie.view.plan-write-preview` `{"op":"set-rest","week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t351-v16\products\order188-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定休息日-预检.html`） | ④`own1`→自有表（4 列） |
| 14 | 189 | 加训练动作 | `calorie.view.plan-write-preview` `{"op":"add-movement","week":1,"dayOfWeek":1,"movement":{"name":"硬拉"}}` | 0 | `D:\ilife\.scratch\t351-v16\products\order189-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\加训练动作-预检.html`） | ④`own1`→自有表（4 列） |
| 15 | 190 | 定一周计划 | `calorie.view.plan-write-preview` `{"op":"set-week","week":1}` | 0 | `D:\ilife\.scratch\t351-v16\products\order190-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定一周计划-预检.html`） | ④`own1`→自有表（4 列） |
| 16 | 191 | 改训练计划 | `calorie.view.plan-write-preview` `{"op":"update","title":"示例改名"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order191-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改训练计划-预检.html`） | ④`own1`→自有表（4 列） |
| 17 | 192 | 改某天训练 | `calorie.view.plan-write-preview` `{"op":"update-day","week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order192-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改某天训练-预检.html`） | ④`own1`→自有表（4 列） |
| 18 | 193 | 删某天训练 | `calorie.view.plan-write-preview` `{"op":"delete-day","week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t351-v16\products\order193-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\删某天训练-预检.html`） | ④`own1`→自有表（4 列） |
| 19 | 194 | 改动作 | `calorie.view.plan-write-preview` `{"op":"update-movement","oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}` | 0 | `D:\ilife\.scratch\t351-v16\products\order194-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改动作-预检.html`） | ④`own1`→自有表（4 列） |
| 20 | 195 | 撤销训练计划 | `calorie.view.plan-write-preview` `{"op":"delete"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order195-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\撤销训练计划-预检.html`） | ④`own1`→自有表（4 列） |
| 21 | 186 | 定训练计划（写后回执） | `calorie.workout.plan-set` `{"plan":{…}}`（独占库 `dbs/receipt-186`） | 0 | `D:\ilife\.scratch\t351-v16\products\order186-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-回执.html`） | ④`own1`→自有表（按序 2 列） |
| 22 | 187 | 复制训练计划（写后回执） | `calorie.workout.plan-copy` `{"newTitle":"示例副本"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order187-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\复制训练计划-回执.html`） | ④`own1`→自有表（2 列） |
| 23 | 188 | 定休息日（写后回执） | `calorie.workout.plan-set-rest` `{"week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t351-v16\products\order188-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定休息日-回执.html`） | ④`own1`→自有表（2 列） |
| 24 | 189 | 加训练动作（写后回执） | `calorie.workout.plan-add-movement` `{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}` | 0 | `D:\ilife\.scratch\t351-v16\products\order189-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\加训练动作-回执.html`） | ④`own1`→自有表（2 列） |
| 25 | 190 | 定一周计划（写后回执） | `calorie.workout.plan-set-week` `{"week":2,"days":[{"dayOfWeek":2,"sessionLabel":"背","movements":[{"name":"硬拉"}]}]}` | 0 | `D:\ilife\.scratch\t351-v16\products\order190-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定一周计划-回执.html`） | ④`own1`→自有表（2 列） |
| 26 | 191 | 改训练计划（写后回执） | `calorie.workout.plan-update` `{"title":"示例改名"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order191-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改训练计划-回执.html`） | ④`own1`→自有表（2 列） |
| 27 | 192 | 改某天训练（写后回执） | `calorie.workout.plan-update-day` `{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order192-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改某天训练-回执.html`） | ④`own1`→自有表（2 列） |
| 28 | 193 | 删某天训练（写后回执） | `calorie.workout.plan-delete-day` `{"week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t351-v16\products\order193-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\删某天训练-回执.html`） | ④`own1`→自有表（2 列） |
| 29 | 194 | 改动作（写后回执） | `calorie.workout.plan-update-movement` `{"oldMovement":"俯卧撑","newMovement":{"name":"钻石俯卧撑"}}` | 0 | `D:\ilife\.scratch\t351-v16\products\order194-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改动作-回执.html`） | ④`own1`→自有表（2 列） |
| 30 | 195 | 撤销训练计划（写后回执） | `calorie.workout.plan-delete` `{"confirm":true}` | 0 | `D:\ilife\.scratch\t351-v16\products\order195-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\撤销训练计划-回执.html`） | ④`own1`→自有表（2 列）；另判「写后现值＝计划已撤销（配置与训练安排均为空）」命中 |
| 31 | 201 | 计划复盘（本周） | `calorie.view.exercise-review` `{"window":"本周"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order201-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（本周）.html`） | ④`own1`→自有表（按序 6 列） |
| 32 | 202 | 计划复盘（本月） | `calorie.view.exercise-review` `{"window":"本月"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order202-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（本月）.html`） | ④`own1`→自有表（6 列） |
| 33 | 203 | 计划复盘（全部） | `calorie.view.exercise-review` `{"window":"custom","start":"2026-09-07","end":"2026-09-20"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order203-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（全部）.html`） | ④`own1`→自有表（6 列） |
| 34 | 204 | 看计划完成率 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order204-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划完成率.html`） | ④`own1`→自有表（6 列） |
| 35 | 205 | 看未完成训练 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order205-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看未完成训练.html`） | ④`own1`→自有表（6 列） |
| 36 | 206 | 看动作完成率 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t351-v16\products\order206-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看动作完成率.html`） | ④`own1`→自有表（6 列） |
| 37 | 207 | 扫禁忌 | `calorie.view.contraindication` `{}` | 0 | `D:\ilife\.scratch\t351-v16\products\order207-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\扫禁忌.html`） | ④`own1`→自有表（按序 5 列） |

**口径两条（读表须知）**：

- 表中「唤醒词」列的 186–195 出现两次不是重复：同一条词有两份产物——**预检页**（写前预览／构建向导）与**写后回执页**（各自独占一个隔离库 `dbs/receipt-<order>`，免互相污染）。发布名照 `-预检`／`-回执` 后缀，与 `scene06-验收墙` 的既有样子一致。
- 195 另有一条**撤销后读验证**（`calorie.view.plan` 再读一次）：`exit=4` ＋ stderr 命中「无训练计划」——**它不是页面**，故不在这 37 份里（这也是清单 `notShipped` 的一条）。

---

## 四、表二 · 外部五条（order 196–200）：唤醒词命中 ＋ HELP 文案

**定性**：`packages/skill-calorie/src/workout/routes.ts:32-36` 把这五条记为 `kind:'non-exec'`、`bucket:'out-of-scope'`（生成物镜像在 `src/triggers/routes.generated.ts:208-212`，逐字同）。按本图 **Out of scope**，本票**不承接、不造产物**——下表给的是「词命中 ＋ 文案在」的读数，不是产物。

**唤醒词命中读数**（在**编译产物**里数，不只数源码）：

| 件 | 五条词命中合计 |
|---|---|
| `packages/skill-calorie/dist/triggers/routes.generated.js` | 6（落地训练 2 ＋ 落地到本周末 1 ＋ 落地到本月底 1 ＋ 同步到训记 1 ＋ 拉训记实绩 1） |
| `packages/skill-calorie/dist/triggers/scene-05-workout.js` | 32（9／7／7／4／5） |
| `packages/skill-calorie/dist/triggers/wake-assets.js` | 16（4／3／3／3／3） |

⇒ 五条词在**路由表、场景词表、HELP 资产**三处都命中，**5/5**。

**HELP 文案验收读数**（文案唯一出处 ＝ 场景词表 `src/triggers/scene-05-workout.ts:25-29`，与 HELP 资产 `src/triggers/wake-assets.ts:2204-2257` 的 `workout_4`「落地训练」卡片下五个子项逐字同源）：

| order | 唤醒词 | 类型（老实物口径） | HELP 文案首句（逐字，取 `prompt_template`） | 原因逐字（`routes.ts` 的 `reason`） |
|---|---|---|---|---|
| 196 | 落地训练 | 过程（`templates/process_progress.html`） | 「我想把某天的训练计划真正落地执行:补计划到日历、记心愿、推送到训记、拉取训记实绩 4 步全流程,逐动作确认实际做的重量和组数。给我看 4 步进度和每步结果(已补计划/已记心愿/已推送/已回写),以及完成度。」 | 明确不做（架构规格 `docs/calorie-architecture.md:60`：落地）；词只保证命中与文案，执行层不承接（t71 属 M8 需移植项、非 O1–O4） |
| 197 | 落地到本周末 | 过程 | 「我想把从今天到周日所有训练日一次落地执行(补计划/记心愿/推训记/回写),如果今天已是周日就只落地今天。请给我看跨天列表、每一步的汇总…」 | 同上（落地） |
| 198 | 落地到本月底 | 过程 | 「我想把从今天到本月底所有训练日一次落地执行(补计划/记心愿/推训记/回写),如果今天已是月底就只落地今天。…」 | 同上（落地） |
| 199 | 同步到训记 | 回执（`templates/crud_receipt.html`） | 「我想把某天的训练计划推送到训记 App(落地流程里的训记推送这一步单独做)。推送前先检查计划里的动作名训记能否识别,有识别不了的先告诉我。」 | 明确不做（架构规格 `docs/calorie-architecture.md:60`：训记）；词只保证命中与文案，执行层不承接（t71 O3 同项） |
| 200 | 拉训记实绩 | 回执（`templates/crud_receipt.html`） | 「我想把训记 App 里的实际训练数据拉回来,写进卡路里的运动记录(落地流程里的回写这一步单独做)。如有冲突请提示我处理。」 | 同上（训记） |

⇒ **5/5 记 `non-exec`、无产物**，理由与文案都还在，页面入口在「健身计划」HELP 卡片下（`src/photo/helpCenter.ts:93` 把「落地训练」列为「健身计划」的一级卡片；后四条是同一卡片 `workout_4` 下的子项）。**本票不为这五条出任何 HTML**——它们是产物册子 `manifest.json` 里 `notShipped` 的头一条。

---

## 五、墙的机器读数（票面四段验收命令）

### ① 正例（票面验收命令 ①）

命令（在 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\` 内跑）：`node gen-wall.mjs --check .`
runId `t351-v16-check` · **exit 0** · 摘要行：

```text
37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发
```

### ② 反例（票面验收命令 ②，必跑）

命令：先 `node .scratch/t351-v16/mutate.mjs backup manifest.json …` 备份，再 `node … mutate.mjs break manifest.json 1`（把清单第 1 行的 `file` 改成 `看本周计划-反例-盘上没有.html`），再跑 `node gen-wall.mjs --check .`
runId `t351-v16-check-red` · **exit 1** · 读数：

```text
36 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 1 -> 不可发
  清单点名却没有文件：1 看本周计划 -> 看本周计划-反例-盘上没有.html
不可发（产物目录 D:\ilife\docs\skills\skill-calorie\scene05-验收墙）
```

### ③ 改回

命令：`node … mutate.mjs restore manifest.json …` 后再跑 `node gen-wall.mjs --check .`
runId `t351-v16-check-restore` · **exit 0** · 读数：

```text
37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发
```

**改回的完整性凭据**：`manifest.json` 的 SHA256 改前改后**逐字一致** = `086E69755733BDD3D1150B442C945EF6C076D0AEFDA7CDB0913E826700371E78`。

### ④ `dropped` ＋ `dead` **两条腿一起判**（反假绿灯）

口径出处：仓规 `docs/agents/视觉验收墙.md` §6.2／§7 第一坑族——清单点名却没有文件（`dropped`）与页上引用却落不到（`dead`）**必须一起判**；只查后者＝缺件被静默剔掉、自检照样报「缺失 0」的假绿灯。

- `--check` 模式读的是**盘上已出的墙页**，所以把它那行的 `file` 改坏时，只有 `dropped` 那一条腿响（`缺失 1`）——墙页上写的还是旧名字，那个名字在盘上还在。
- 为把 `dead` 那条腿也量出来，另在**草稿副本**里做了一遍（`<草稿>` ＝ `D:\ilife\.scratch\t351-v16\counter`，**不碰交付目录**）：先 `--stage` 铺成（runId `t351-v16-counter-stage`，exit 0），再把清单第 1 行改坏后**重出手机墙**（runId `t351-v16-counter-dead`，**exit 1**）——新墙页于是引用一个盘上没有的名字：

```text
36 格；链接 114 条（手机墙-390.html 75 ＋ 总索引.html 39）；缺失 2 -> 不可发
  清单点名却没有文件：1 看本周计划 -> 看本周计划-反例-盘上没有.html
  页上引用却落不到：看本周计划-反例-盘上没有.html
不可发（产物目录 D:\ilife\.scratch\t351-v16\counter）
```

⇒ **两条腿都活着**：`缺失 2` 里一条是 `dropped`、一条是 `dead`，各自点名到件。（本条就是票面「自证：改坏必红／改回必绿」的两行机器读数——②③ 是同一张清单的一红一绿，本条第 ④ 项是同一处判据的另一条腿。）

---

## 六、墙目录的结构读数（不是视觉判断）

| 项 | 读数 |
|---|---|
| `.html` 件数 | **40** ＝ 37 份产物发布名副本 ＋ `手机墙-390.html` ＋ `桌面墙-1280.html` ＋ `总索引.html` |
| 非 `.html` 件 | `gen-wall.mjs`（16,276 B，入仓生成器）、`manifest.json`（21,309 B，清单）、`逐格缺陷清单.md`（骨架） |
| `手机墙-390.html` | 13,740 B；`<iframe` **37** 个；`loading="lazy"` **0** 处；格子宽＝视口宽（1:1，无缩放） |
| `桌面墙-1280.html` | 18,365 B；`<iframe` **37** 个；`loading="lazy"` **0** 处；`transform:scale(` **37** 处（`SCALE = min(0.5, 600/1280) = 0.469`，缩的是显示不是视口） |
| `总索引.html` | 18,224 B；卡片 **37** 张（按页面族分 4 组）；末尾有「有意不出产物及其原因」一节，3 条 |
| 清单不带 BOM | `manifest.json` 首 3 字节 = `123,10,32`（`{`＋换行＋空格）⇒ **无 BOM** |
| 格数对账 | 墙格数 37 ＝ 索引卡片数 37 ＝ 清单 `rows` 条数 37 ＝ 原批产物 `.html` 份数 37 |
| 命名规则 | 发布名 ＝ 唤醒词 ＋ `.html`（同词两页加 `-预检`／`-回执`），**只在 `manifest.json` 一处算**；`rows[].src` 只是「从哪个原名复制过来」 |
| 同目录 | 两张墙、索引、37 份产物全在 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\` 同一层（iframe 走相对路径，点标题开整页也落得到） |

---

## 七、未做项（如实交代）

1. **「人用真实浏览器滚一遍两张墙、逐格记缺陷」本席未做、也不代做**：那是仓规 §4 的负责人动作。`逐格缺陷清单.md` 只给骨架——前三列机器照清单抄，**「症状」「要不要改」两列留空待负责人看图后逐格填**。
2. **滚动截图／像素比对未做**：本票不做视觉判断；墙页只保证「真渲染、点得开、引用都落得到」（§五、§六 的读数）。
3. **`pnpm gen:check` 没跑成**（跑了另一条等价命令，见 §1.1 与 gate-runs 件 §一 #1）；按票面禁「包管理器安装／新增命令」，未按 pnpm 的提示设 `CI=true` 放行它去动 `node_modules`。
4. **载荷面 27 处 `calorie.calorie.` 双前缀未修**：要改源码才修得掉，不在本票写集；已记进 `.scratch/t351-v16/handoff.md` 待编排者处置。
