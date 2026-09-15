# 票 #351 · 场景05 · **186 换装**：定训练计划页换成计划编辑器（可写页）· 实跑证据（v18 · 换装窗）

**本件是什么**：票 #351 在**换装窗**（v18）里的逐条实跑证据 —— **v18 取代 v17**（`t351-v17-evidence.md`）。

- **取代关系**：本件**取代** `docs/skills/skill-calorie/t351-v17-evidence.md`。**v17／v16 两件保留不删**，不属本件；它们记的是换装**之前**那一轮的读数（186 还是旧的构建向导预检页），历史事实照旧成立。
- **取代原因（本窗做的事）**：order 186「定训练计划」那一格由**旧的「构建向导预检页」换成「计划编辑器（可写页）」**——这是**图 #157 Destination 的换装**（口径见 `#553` 读法甲：「`calorie.view.plan-wizard`（或新键）出口出编辑器页；墙里 `定训练计划-*.html` 换成编辑器版；机检判据随动」）。落地三件：
  1. **接线条（新件）**：`packages/skill-calorie/src/render/planEditorPort.ts` —— 讨论结果（`plan`）→ 编辑器状态 → 整页；键**沿用** `calorie.view.plan-wizard`（`#553` 原文允许在「或新键」两支里择一，本票取**不动键**的那支，故 `routes.ts` 的键与 `cli` 一字未动、三件生成物零 diff）。
  2. **命令面**：`packages/skill-calorie/src/workout/commands.ts` 里 186 那条读命令的 `run` 由旧 `viewPlanWizard` 换成 `viewPlanEditor`（**那一处**就是变异自证的目标，见 §七）。
  3. **机检随动**：`docs/skills/skill-calorie/t351-v7-run-176-207.mjs` 里 186 那几条按编辑器形状重写（⑱ 新增、⑩ 按三块脚本重写、过程页 prompt 的独有句换成本页文案），判据只加严不放宽（逐条见 §四）。
- 跑批件（入仓）：`docs/skills/skill-calorie/t351-v7-run-176-207.mjs`；墙生成器（入仓）：`docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs`。
- 产物原批目录（**本窗**）：`D:\ilife\.scratch\t157-swap\products`
- 墙目录（发布名副本 ＋ 双墙 ＋ 索引 ＋ 清单 ＋ 生成器 ＋ 逐格缺陷清单）：`D:\ilife\docs\skills\skill-calorie\scene05-验收墙`
- 门禁运行对账：`docs/skills/skill-calorie/t351-v18-gate-runs.md`（**本件声称跑过的每一次运行，在那件里都有 `GATE-RUN runId=<标识> cmd=<命令>` 一行**）
- 本件**不做视觉判断**：机器只负责把真渲染跑出来、把每格「该确认什么」写清、把自检退出码交出来；判定归负责人（`逐格缺陷清单.md` 的两条答复列**一个字都没填**）。
- **本窗基线**：跑批与全部读数取自 `tsc -b` 后的工作区（本窗开工当刻 `HEAD = 2bb647c`，其间别席在继续落盘）。**收工前**用 `tsc -b --force` 强制重编并**认口** `dist/workout/commands.js` 里 186 那条命令指向编辑器实现（`run: viewPlanEditor,` 命中 1／`run: viewPlanWizard,` 命中 0）、`gen:check` exit 0（见 §八）。**台账（`packages/skill-calorie/AGENTS.md`）本窗未动**，理由见 §十 第 2 条。

---

## 一、开工前先核的三件事（读数）

### 1.1 改动面：先查 186 今天走哪条、旧向导谁在引用

| 查证 | 读数 |
|---|---|
| 186（`wake` 列表 order 186）与 new 列表 order 27 的键 | 两条都指 `calorie.view.plan-wizard`（`packages/skill-calorie/src/workout/routes.ts:22`、`:45`）——换装**不动这两行** |
| 换装前这条键的实现 | `src/workout/commands.ts` 的 `run: viewPlanWizard`（旧「构建向导预检页」） |
| `buildPlanEditorDoc` 的调用方（换装前） | **零**（只有 `planEditor*.ts` 四件自己互相引用） |
| 旧向导引用面 | 见 §九 第 1 条（换装后逐件给读数） |

### 1.2 重编 ＋ 重签 ＋ 生成物门

| 步 | 命令 | runId | exit | 读数 |
|---|---|---|---|---|
| 重编 | `node node_modules/typescript/bin/tsc -b` | `t157-swap-build` | **0** | 无输出（`logs/tsc-1.log`） |
| 重签 | `node packages/skill-calorie/scripts/gen-cli.mjs --stamp` | `t157-swap-build` | **0** | `GEN-STAMP ok packages\skill-calorie\dist\.gen-inputs.json：声明源 41 件` |
| 重生成（`pnpm gen` 的等价体） | `node packages/skill-calorie/scripts/gen-cli.mjs` | `t157-swap-build` | **0** | `键 128（写 46 ＋ 读 82）；能力 10 个（…）；未搬迁清单 0 条`——**逐件 sha256 与盘上一致**（`git status` 对 `src/cli/**`、`src/triggers/**`、`packages/base-combos/combos.yaml`、`scripts/build-help.mjs` **零改动**） |
| 生成物门 | `node packages/skill-calorie/scripts/gen-cli.mjs --check` | `t157-swap-build` | **0** | `GEN-CHECK ok` 四件 ＋ `GEN-CHECK PASS：键 128（写 46 ＋ 读 82）；…未搬迁清单 0 条` |

> 键数 128 不是本票加的：本票**一个键都没加**（沿用 `calorie.view.plan-wizard`）。128 是别的窗在 v17 的 127 之后落进来的读命令，与换装无关——`gen:check` 逐件 sha256 证明本票对生成物**零改动**。
> `pnpm gen:check` 本窗未跑（本机 `pnpm` 会先做依赖自检并要求 `pnpm install`，票面禁包管理器安装）；`package.json` 的 `gen:check` 逐字就是上面那条 `node …/gen-cli.mjs --check`。

### 1.3 换代前的基线（**改前基数**，本窗自己量的）

| 面 | 命令 | 读数 |
|---|---|---|
| 仓内旧墙第 11 格（`定训练计划-预检.html`，旧向导页） | `node .scratch/t157-swap/count-marks.mjs`（整页计数） | `ilw-` **119**；`pe-tabs`／`pe-daytabs`／`pe-day` **0／0／0**；`#pe-out-body` 0；`<script>` **1** 块；73484 B |
| 换装后同格（新批产物 `order186-process.html`） | 同上 | `ilw-` **0**；`pe-tabs` 4／`pe-daytabs` 4／`pe-day` 17／`data-act` 31；正文里 `#pe-out-body` **1**；`<script>` **3** 块（含 1 块 `#pe-state` 的 JSON）；93908 B |
| 同一条键的旧批量（对照） | — | 旧页底部复制数据标题＝`【calorie · 构建向导】`；新页＝`【calorie · 定训练计划】` |

---

## 二、全量重跑（本窗）

| 项 | 值 |
|---|---|
| 命令（照票面） | `node tooling/run-locked.mjs --ticket 157 --run-id t157-swap-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-swap/products` |
| runId | `t157-swap-run`（`waitedMs=220179`，即等锁 220s 后开跑） |
| 退出码 | **0** |
| 摘要行 | `RESULT: 66/66（产物 37 ＋ 判据 29）` ＋ `PROBE: PASS（29/29 判据全绿）` |
| 产物 | `D:\ilife\.scratch\t157-swap\products` 下 **37 份 HTML**（＋ `detail.json` 逐条读数 ＋ `dbs` 隔离库） |
| 库隔离 | 全部读写落在 `D:\ilife\.scratch\t157-swap\products\dbs\`（`SKILLS_DB_PATH`），**未碰生产库** |
| 覆盖面 | 只写 `.scratch/t157-swap/`；既有批次（`.scratch/t157-close/`／`.scratch/t351-v16/`／`.scratch/t550/` 等）**一件未覆盖**（`--out` 是必填参数，跑批件自己就挡原地重跑） |
| 日志 | `.scratch/t157-swap/logs/batch-products.log` |

> 判据条数仍是 **29**（换装窗没有加条也没有减条）：新增的 ⑱ 顶掉的是原来「过程页 10 份复制数据标题全中文」那一条独立判据，后者的断言**并入**了过程页 prompt 那条检查——判据总数与 `66/66` 这个总数都保持不变，能逐条对上上一轮的读数口径。

## 三、表一 · 27 条可执行唤醒词（37 份产物，逐条实跑）

| # | order | 唤醒词 | 命令（真出口 `dist/cli/cmd_read.js`，key ＋ 参数） | exit | 产物（绝对路径；括号里是发布名副本） | 机检读数 |
|---|---|---|---|---|---|---|
| 1 | 176 | 看本周计划 | `calorie.view.plan` `{"weekOffset":0,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order176-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看本周计划.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 2 | 177 | 看下周计划 | `calorie.view.plan` `{"weekOffset":1,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order177-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看下周计划.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 3 | 178 | 看上周计划 | `calorie.view.plan` `{"weekOffset":-1,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order178-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看上周计划.html`） | ④`none`→本页无表（符合声明）；复制数据标题=【calorie · 训练计划查看】 |
| 4 | 179 | 看指定周计划 | `calorie.view.plan` `{"week":1}` | 0 | `D:\ilife\.scratch\t157-swap\products\order179-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看指定周计划.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 5 | 180 | 看今天练什么 | `calorie.view.plan` `{"date":"今日","today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order180-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看今天练什么.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 6 | 181 | 看某动作安排 | `calorie.view.plan` `{"movement":"硬拉"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order181-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看某动作安排.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 7 | 182 | 看某天练什么 | `calorie.view.plan` `{"date":"2026-09-09"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order182-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看某天练什么.html`） | ④`four`→四列逐字按序（行 1）；复制数据标题=【calorie · 训练计划查看】 |
| 8 | 183 | 看计划概览 | `calorie.view.plan` `{}` | 0 | `D:\ilife\.scratch\t157-swap\products\order183-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划概览.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 9 | 184 | 看完整计划 | `calorie.view.plan` `{}` | 0 | `D:\ilife\.scratch\t157-swap\products\order184-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看完整计划.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 10 | 185 | 看计划 vs 实际 | `calorie.view.plan-vs-actual` `{"window":"custom","start":"2026-09-07","end":"2026-09-09"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order185-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划 vs 实际.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 计划对比实际】 |
| 11 | 186 | 定训练计划（过程） | `calorie.view.plan-wizard` `{"plan":{"config":{"title":"减脂4周","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}` | 0 | `D:\ilife\.scratch\t157-swap\products\order186-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-预检.html`） | ④`none`→本页无表（符合声明）；复制数据标题=【calorie · 定训练计划】 |
| 12 | 187 | 复制训练计划（过程） | `calorie.view.plan-write-preview` `{"op":"copy"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order187-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\复制训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 13 | 188 | 定休息日（过程） | `calorie.view.plan-write-preview` `{"op":"set-rest","week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-swap\products\order188-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定休息日-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 14 | 189 | 加训练动作（过程） | `calorie.view.plan-write-preview` `{"op":"add-movement","week":1,"dayOfWeek":1,"movement":{"name":"硬拉"}}` | 0 | `D:\ilife\.scratch\t157-swap\products\order189-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\加训练动作-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 15 | 190 | 定一周计划（过程） | `calorie.view.plan-write-preview` `{"op":"set-week","week":1}` | 0 | `D:\ilife\.scratch\t157-swap\products\order190-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定一周计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 16 | 191 | 改训练计划（过程） | `calorie.view.plan-write-preview` `{"op":"update","title":"示例改名"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order191-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 17 | 192 | 改某天训练（过程） | `calorie.view.plan-write-preview` `{"op":"update-day","week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order192-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改某天训练-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 18 | 193 | 删某天训练（过程） | `calorie.view.plan-write-preview` `{"op":"delete-day","week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-swap\products\order193-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\删某天训练-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 19 | 194 | 改动作（过程） | `calorie.view.plan-write-preview` `{"op":"update-movement","oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}` | 0 | `D:\ilife\.scratch\t157-swap\products\order194-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改动作-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 20 | 195 | 撤销训练计划（过程） | `calorie.view.plan-write-preview` `{"op":"delete"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order195-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\撤销训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 21 | 186 | 定训练计划（回执） | `calorie.workout.plan-set` `{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}` | 0 | `D:\ilife\.scratch\t157-swap\products\order186-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 定训练计划】 |
| 22 | 187 | 复制训练计划（回执） | `calorie.workout.plan-copy` `{"newTitle":"示例副本"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order187-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\复制训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 复制训练计划】 |
| 23 | 188 | 定休息日（回执） | `calorie.workout.plan-set-rest` `{"week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-swap\products\order188-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定休息日-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 定休息日】 |
| 24 | 189 | 加训练动作（回执） | `calorie.workout.plan-add-movement` `{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}` | 0 | `D:\ilife\.scratch\t157-swap\products\order189-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\加训练动作-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 加训练动作】 |
| 25 | 190 | 定一周计划（回执） | `calorie.workout.plan-set-week` `{"week":2,"days":[{"dayOfWeek":2,"sessionLabel":"背","movements":[{"name":"硬拉"}]}]}` | 0 | `D:\ilife\.scratch\t157-swap\products\order190-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定一周计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 定一周计划】 |
| 26 | 191 | 改训练计划（回执） | `calorie.workout.plan-update` `{"title":"示例改名"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order191-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 改训练计划】 |
| 27 | 192 | 改某天训练（回执） | `calorie.workout.plan-update-day` `{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order192-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改某天训练-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 改某天训练】 |
| 28 | 193 | 删某天训练（回执） | `calorie.workout.plan-delete-day` `{"week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-swap\products\order193-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\删某天训练-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 删某天训练】 |
| 29 | 194 | 改动作（回执） | `calorie.workout.plan-update-movement` `{"oldMovement":"俯卧撑","newMovement":{"name":"钻石俯卧撑"}}` | 0 | `D:\ilife\.scratch\t157-swap\products\order194-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改动作-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 改动作】 |
| 30 | 195 | 撤销训练计划（回执） | `calorie.workout.plan-delete` `{"confirm":true}` | 0 | `D:\ilife\.scratch\t157-swap\products\order195-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\撤销训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 撤销训练计划】 |
| 31 | 201 | 计划复盘（本周） | `calorie.view.exercise-review` `{"window":"本周"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order201-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（本周）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 32 | 202 | 计划复盘（本月） | `calorie.view.exercise-review` `{"window":"本月"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order202-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（本月）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 33 | 203 | 计划复盘（全部） | `calorie.view.exercise-review` `{"window":"custom","start":"2026-09-07","end":"2026-09-20"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order203-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（全部）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 34 | 204 | 看计划完成率 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order204-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划完成率.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 35 | 205 | 看未完成训练 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order205-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看未完成训练.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 36 | 206 | 看动作完成率 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-swap\products\order206-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看动作完成率.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 37 | 207 | 扫禁忌 | `calorie.view.contraindication` `{}` | 0 | `D:\ilife\.scratch\t157-swap\products\order207-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\扫禁忌.html`） | ④`own1`→自有表（按序 5 列，无「组数×次数」）；复制数据标题=【calorie · 禁忌扫描】 |
**口径两条（读表须知）**：

- 「唤醒词」列的 186–195 出现两次不是重复：同一条词有两份产物——**过程页**与**写后回执页**（各自独占一个隔离库 `dbs/receipt-<order>`，免互相污染）。发布名照 `-预检`／`-回执` 后缀。**本轮 186 的过程页已换成计划编辑器（可写页）**：命令键与参数一字未改（仍 `calorie.view.plan-wizard` ＋ `{"plan":…}`），变的是这条命令的**产出**。
- 195 另有一条**撤销后读验证**（`calorie.view.plan` 再读一次）：**它不是页面**，故不在这 37 份里（清单 `notShipped` 的一条）。

**另两条不是页面的读数**（照 v17 的记法）：

- 撤销后读验证（195）：exit=4 stderr 命中「无训练计划」=true
- 外部五条 196–200：5 条如实记 `non-exec`（无产物）：196 落地训练／197 落地到本周末／198 落地到本月底／199 同步到训记／200 拉训记实绩

## 四、判据 29 条（逐条读数，取自 products/detail.json 的 checks 段）

| # | 判 | 判据名 |
|---|---|---|
| 1 | PASS | 37 份产物全部落盘（176–185 结果 10 ＋ 186 编辑器 1 ＋ 187–195 过程 9 ＋ 186–19… |
| 2 | PASS | 机检① 每份有 <!doctype html>… |
| 3 | PASS | 机检② 真 id="ilife-copy-data"／id="ilife-copy-log" 各恰好一次（排除 `dat… |
| 4 | PASS | 机检③ 正文无 op=／# 成功／三格式菜单文本／英文命令键标题（`【calorie · calorie.`）… |
| 5 | PASS | 机检④ 表头按逐份声明对照（four 逐字四列且必须量到表头／own1 自有表也须量到且无「组数×次数」列／none 无… |
| 6 | PASS | 机检⑥ 动作格＝加粗名＋块级副行小字（两颗标签：细化词＋类型），副行逐格齐且以「主要／孤立」收尾（只判有动作表的 8 份… |
| 7 | PASS | 机检⑦ 正文不出现 `main`／`iso` 裸词（类型只以中文出现在副行里；`data-t` 载荷不算正文）… |
| 8 | PASS | 机检⑧ 节奏上场次卡头行（两面）：逐页日级标题（场次卡头行）带节奏的条数＝夹具真值（177／181 各 1 场带、184… |
| 9 | PASS | 机检⑨ 两条删减确实丢掉：正文不出现「reps×」与「W<n> 」这类只在方括号内逗号前那截才有的记号… |
| 10 | PASS | 机检⑤ 每份 `data-action-id="ilife-copy-log"` 恰好一颗，且无 `… disabled… |
| 11 | PASS | 机检⑱ 编辑器形状自证（186 换装）：两层页签（`pe-tabs`／`pe-daytabs`）＋ 一次只显示一天（`p… |
| 12 | PASS | 过程页 10 份各含本写词的逐字 prompt（`执行唤醒词「<词>」`＋该词独有句）＋ 10 份复制数据标题全中文（9… |
| 13 | PASS | 结果页 17 份 ＋ 回执页 10 份不含「复制 prompt」那一段（只有预检确认页该有）… |
| 14 | PASS | 夹具① 休息日标题不重复：order184 的休息日标题＝星期 chip ＋「休息日」两件（不再用 `·` 串），且十份… |
| 15 | PASS | 夹具② 多组不同次数紧凑写法：3组×10／8次 ＋ 35／40kg… |
| 16 | PASS | 夹具③ 空 sets 出「—」占位… |
| 17 | PASS | 页头信息条含计划说明（config.description 按 `·` 拆成胶囊，逐段上页）… |
| 18 | PASS | 指标卡 总周数＝4（配置 totalWeeks）＋副行「其中 2 周有安排」… |
| 19 | PASS | 195 撤销后读恢复缺失阻断：exit=4 ＋ stderr 命中「无训练计划」… |
| 20 | PASS | 195 撤销状态不丢：回执页「写后现值」写「计划已撤销（配置与训练安排均为空）」… |
| 21 | PASS | 196–200 外部五条如实记 non-exec（无产物）… |
| 22 | PASS | 机检⑩ 零 JS 自证（全量 37 份）：每份都带**同一份**共享 helpers（逐块 sha256 相同）；36 … |
| 23 | PASS | 机检⑪ 用词自证（176–185 十份）：正文不出现「会话」／`main`／`iso`／`calorie.`（`data… |
| 24 | PASS | 机检⑫ 两级页签是零脚本手法：有动作表的 8 份同时命中 `ilw-tabs`／`ilw-day-tabs`／`.ilw… |
| 25 | PASS | 机检⑬ 副标题不含「版本 …」与「共 N 周」（负责人裁定砍掉的冗余两项）… |
| 26 | PASS | 机检⑭ 两级页签不含「全部周次」「全部」两枚（负责人裁定去掉）… |
| 27 | PASS | 机检⑮ 两层各钉默认选中：选中数 ≡ 周数＋1、总选钮 ≡ 8×周数（否则那一层内容全不可见）；且有动作表的份必须真有页… |
| 28 | PASS | 机检⑯ 列对齐（有动作明细表的 8 份）：右对齐列表头与表体同用 `…-cell-right` 类，且页内样式不再把表头… |
| 29 | PASS | 机检⑰ 用词自证（全量 37 份）：正文不出现内部词「会话」（剔 `data-t` 载荷）… |

- **PASS** 37 份产物全部落盘（176–185 结果 10 ＋ 186 编辑器 1 ＋ 187–195 过程 9 ＋ 186–195 回执 10 ＋ 201–207 结果 7）
  - 读数：份数=37 缺=0
- **PASS** 机检① 每份有 <!doctype html>
  - 读数：红=
- **PASS** 机检② 真 id="ilife-copy-data"／id="ilife-copy-log" 各恰好一次（排除 `data-action-id=` 里的子串）
  - 读数：红=
- **PASS** 机检③ 正文无 op=／# 成功／三格式菜单文本／英文命令键标题（`【calorie · calorie.`）
  - 读数：红=
- **PASS** 机检④ 表头按逐份声明对照（four 逐字四列且必须量到表头／own1 自有表也须量到且无「组数×次数」列／none 无表），且无一份落在兜底 other
  - 读数：红=0 兜底other=0
- **PASS** 机检⑥ 动作格＝加粗名＋块级副行小字（两颗标签：细化词＋类型），副行逐格齐且以「主要／孤立」收尾（只判有动作表的 8 份）；细化词里混类型裸词的生产形状须读作「背 主／孤立」
  - 读数：红=0 生产形状命中=true 副行样例=["<span class=\"ilw-sub-detail\">胸整体</span><span class=\"ilw-sub-type\">主要</span>","<span class=\"ilw-sub-type\">孤立</span>","<span class=\"ilw-sub-detail\">背阔</span><span class=\"ilw-sub-type\">主要</span>","<span class=\"ilw-sub-detail\">背 主</span><span class=\"ilw-sub-type\">孤立</span>","<span class=\"ilw-sub-detail\">股四头</span><span class=\"ilw-sub-type\">主要</span>"]
- **PASS** 机检⑦ 正文不出现 `main`／`iso` 裸词（类型只以中文出现在副行里；`data-t` 载荷不算正文）
  - 读数：红=
- **PASS** 机检⑧ 节奏上场次卡头行（两面）：逐页日级标题（场次卡头行）带节奏的条数＝夹具真值（177／181 各 1 场带、184 恰三条且逐字等于夹具原文），且休息日标题一律不带、周级标题不带、页面上的节奏原文只许是夹具那三种
  - 读数：184节奏=["20-30 RPM(2-2.5秒/次)","18-25 RPM(2.5-3秒/次)","15-20 RPM(3-4秒/次)"] 逐页条数不符=0 休息日带节奏=0 周级带节奏=0 未知节奏=0
- **PASS** 机检⑨ 两条删减确实丢掉：正文不出现「reps×」与「W<n> 」这类只在方括号内逗号前那截才有的记号
  - 读数：红=0
- **PASS** 机检⑤ 每份 `data-action-id="ilife-copy-log"` 恰好一颗，且无 `… disabled` 禁用态
  - 读数：红=
- **PASS** 机检⑱ 编辑器形状自证（186 换装）：两层页签（`pe-tabs`／`pe-daytabs`）＋ 一次只显示一天（`pe-day` ＋ `go-week`／`go-day`）＋ 参数可改（`set-sets`／`set-reps`／`set-load`／`set-min`／`toggle-mode`）＋ 产物表（挂载点 ＋ 8 列表头 ＋ 行标题）＋ 复制指令（钩子 ＋ 运行时回写 `data-t`）＋ 旧向导标记 `ilw-` 命中 0 ＋ `#pe-state` 里 CLI 参数真被预填
  - 读数：红=0；标记计数={"pe-tabs":4,"pe-daytabs":4,"pe-day":17,"data-act":31,"pe-out-body":2,"ilw-":0}；页内动作=["go-week","go-day","set-sets","set-reps","set-load","set-min","toggle-mode"]；产物表列=["周次","星期","时段","动作","部位","类型","量","负重"]；#pe-state：周数=1 标题=减脂4周 起日=2026-09-07 每天段数上限=4 第1周第1天第1动作=俯卧撑 动作库件数=1
- **PASS** 过程页 10 份各含本写词的逐字 prompt（`执行唤醒词「<词>」`＋该词独有句）＋ 10 份复制数据标题全中文（9 份写前预览 ＋ 186 编辑器）、无英文命令键
  - 读数：红=0；标题=【calorie · 定训练计划】／【calorie · 写前预览】
- **PASS** 结果页 17 份 ＋ 回执页 10 份不含「复制 prompt」那一段（只有预检确认页该有）
  - 读数：泄漏=0
- **PASS** 夹具① 休息日标题不重复：order184 的休息日标题＝星期 chip ＋「休息日」两件（不再用 `·` 串），且十份均无「休息日（休息日）」
  - 读数：命中=true 重复份数=0
- **PASS** 夹具② 多组不同次数紧凑写法：3组×10／8次 ＋ 35／40kg
  - 读数：3组×10／8次=true 35／40kg=true
- **PASS** 夹具③ 空 sets 出「—」占位
  - 读数：哑铃飞鸟行双短横线=true
- **PASS** 页头信息条含计划说明（config.description 按 `·` 拆成胶囊，逐段上页）
  - 读数：科学定制=true 6天/周=true 270组=true
- **PASS** 指标卡 总周数＝4（配置 totalWeeks）＋副行「其中 2 周有安排」
  - 读数：读数=总周数 4 周 其中 2 周有安排
- **PASS** 195 撤销后读恢复缺失阻断：exit=4 ＋ stderr 命中「无训练计划」
  - 读数：exit=4 stderr命中=true
- **PASS** 195 撤销状态不丢：回执页「写后现值」写「计划已撤销（配置与训练安排均为空）」
  - 读数：命中=true
- **PASS** 196–200 外部五条如实记 non-exec（无产物）
  - 读数：条数=5
- **PASS** 机检⑩ 零 JS 自证（全量 37 份）：每份都带**同一份**共享 helpers（逐块 sha256 相同）；36 份非编辑器页恰 1 块普通 `<script>`，编辑器页（order186-process.html）恰 2 块普通 ＋ 恰 1 块 `#pe-state` 的 JSON；全量正文无内联事件处理器、无 `javascript:` 伪协议
  - 读数：红=0 共享helpers指纹=d232b27c5a30（命中 37 份；缺=0） 普通块数不符=0 JSON块数不符=0 全量块数分布=[1,3]｜编辑器：普通 2＝helpers d232b27c5a30 ＋ 自配运行时 bcf118c18b30；JSON 1；旧口径「首块指纹数」=2（仅作对照，v18 起不再拿它当判据）
- **PASS** 机检⑪ 用词自证（176–185 十份）：正文不出现「会话」／`main`／`iso`／`calorie.`（`data-t` 载荷不算正文）
  - 读数：判份数=10 红=0
- **PASS** 机检⑫ 两级页签是零脚本手法：有动作表的 8 份同时命中 `ilw-tabs`／`ilw-day-tabs`／`.ilw-wkr:checked`／`type="radio"` 四条（标记＋规则两半都在）
  - 读数：红=0 徽章数=3／3／3／2／2／1／6／6
- **PASS** 机检⑬ 副标题不含「版本 …」与「共 N 周」（负责人裁定砍掉的冗余两项）
  - 读数：判份数=10 红=0
- **PASS** 机检⑭ 两级页签不含「全部周次」「全部」两枚（负责人裁定去掉）
  - 读数：红=0
- **PASS** 机检⑮ 两层各钉默认选中：选中数 ≡ 周数＋1、总选钮 ≡ 8×周数（否则那一层内容全不可见）；且有动作表的份必须真有页签（无周区块的份钮=0 是正确态）
  - 读数：有页签份数=8 无页签份数=2 红=0 逐份选钮／选中=176:8／2 177:8／2 178:0／0 179:8／2 180:8／2 181:8／2 182:8／2 183:16／3 184:16／3 185:0／0
- **PASS** 机检⑯ 列对齐（有动作明细表的 8 份）：右对齐列表头与表体同用 `…-cell-right` 类，且页内样式不再把表头摁回左对齐
  - 读数：红=0 逐份 cell-right 命中=176:13 177:13 179:13 180:9 181:9 182:7 183:23 184:23
- **PASS** 机检⑰ 用词自证（全量 37 份）：正文不出现内部词「会话」（剔 `data-t` 载荷）
  - 读数：判份数=37 红=0
---

## 五、t554 编辑器契约门（票面验收命令 ①）

| 项 | 值 |
|---|---|
| 命令 | `PE_OUT=.scratch/t157-swap/gate node docs/skills/skill-calorie/t554-plan-editor-gate.mjs --phase=gate`（持锁：`runId=t157-swap-gate`；`PE_OUT` 只改**产物落点**，不改判据——落到本窗草稿目录，不覆盖 `.scratch/t554/`） |
| 退出码 | **0** |
| 摘要行 | `RESULT: 18/18` |
| 说明 | 本门判的是 `buildPlanEditorDoc` 出来的那一页（需求正件 §1 四条 ＋ 两条自设探针），与 186 走哪条键**无关**；换装窗没有改 `planEditor*.ts` 四件里除「新入口件」之外的任何一行，故读数与复核席当时逐条一致（开工前基线读数留在 `.scratch/t157-swap/logs/gate-before.txt`）。 |

## 六、墙的机器读数

### ① 正例（票面验收命令 ③）

命令（在 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\` 内跑，持锁 `runId=t157-swap-wall`）：`node gen-wall.mjs --check .`
**exit 0** · 摘要行：

```text
37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发
```

### ② 反例（必跑）

命令：`node .scratch/t157-swap/mutate-manifest.mjs backup <墙>/manifest.json .scratch/t157-swap/manifest.bak.json` → `… break <墙>/manifest.json 1`（把清单第 1 行 `file` 改成 `看本周计划-反例-盘上没有.html`）→ `node gen-wall.mjs --check .`
**exit 1** · 读数：

```text
36 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 1 -> 不可发
  清单点名却没有文件：1 看本周计划 -> 看本周计划-反例-盘上没有.html
不可发（产物目录 D:\ilife\docs\skills\skill-calorie\scene05-验收墙）
```

### ③ 改回

命令：`… mutate-manifest.mjs restore <墙>/manifest.json .scratch/t157-swap/manifest.bak.json` 后再跑 `--check`
**exit 0** · 读数回 `缺失 0 -> 可发`；**清单 sha256 改前改后逐字一致** ＝ `B34406E5E849F90BFE19F069DC67F00C6CC432B32DA23ACE38DE2E59CA5C30BD`（`IDENTICAL=true`）。

> 本窗是在**盘上那一份**清单上做反例、再**逐字节还原**（不做整目录还原、不 `git checkout -- `）；还原的完整性凭据就是上面那条 sha256 相等。自检把 `dropped`（清单点名却没有文件）与 `dead`（页上引用却落不到）**一起判**——只查后者是仓规 §6.2／§7 点名的假绿灯。

## 七、换代后的三条关键读数（本窗存在的理由）

### 7.1 第 11 格：旧向导页 → 计划编辑器（**改前／改后逐项对照**）

| 项 | 改前（仓内旧墙那一格） | 改后（新批 ＋ 换代后的墙） |
|---|---|---|
| `ilw-`（旧向导标记）命中 | **119** | **0** |
| `pe-tabs`／`pe-daytabs`／`pe-day` | 0／0／0 | **4／4／17** |
| `data-act`（页内可点可写动作） | 6 | **31** |
| 正文里的产物表挂载点 `#pe-out-body` | 0 | **1** |
| `<script>` 块（含 `#pe-state` JSON） | 1（0） | **3（1）** |
| 复制数据标题 | `【calorie · 构建向导】` | `【calorie · 定训练计划】` |
| 字节数 | 73,484 B | 93,908 B |

### 7.2 墙目录结构读数（不是视觉判断）

| 项 | 读数 |
|---|---|
| 墙目录件数 | **43** ＝ 37 份产物发布名副本 ＋ `手机墙-390.html` ＋ `桌面墙-1280.html` ＋ `总索引.html` ＋ `manifest.json` ＋ `gen-wall.mjs` ＋ `逐格缺陷清单.md` |
| 第 11 格副本 ≡ 原批产物 | 逐字节同：`0CB52DBB4157A7B0A4533DD8DEE9C12B3EBF4BE37F72DE0A4C9C95073066ECC2`（两边逐字相等） |
| 格数对账 | 墙格数 37 ＝ 索引卡片数 37 ＝ 清单 `rows` 条数 37 ＝ 原批产物 `.html` 份数 37 |
| `manifest.json` 本轮的改动 | 第 11 行 `title`／`kind`／`check` 换成编辑器口径（发布名 `定训练计划-预检.html` **不动**）；该行并入新族 `计划编辑器 · 可写页（order 186）`，原族改名 `预检确认页 · 写前预览（order 187–195）`；`source`／`notShipped[].why` 三段里的批目录与证据件名换成本轮（`.scratch/t157-swap/products/`、`t351-v18-evidence.md`） |
| `逐格缺陷清单.md` | 重出为**空骨架**：37 行，「症状」「要不要改」两列 **37 行全是 `—（待填）`**（脚本核过：两列已填行数＝**0**） |

## 八、变异自证（票面验收命令 ⑥）：把「186 指向编辑器」那一处改回旧向导

| 步 | 命令（全部持锁） | runId | 读数 |
|---|---|---|---|
| 留底 | `node .scratch/t157-swap/mutate-commands.mjs backup packages/skill-calorie/src/workout/commands.ts .scratch/t157-swap/commands.ts.bak` | `t157-swap-mut` | 备份 sha256 `e85c37a9d298a2ee01cdf2c83c059abaf5de949b55454da701f81b95bd3837b8` |
| 变异（**一处**） | `… break <件>` | `t157-swap-mut` | `run: viewPlanEditor,` → `run: viewPlanWizard,`（连带它的 import 行）；变异件 sha256 `b54e8b090604983f5de501be5ec571293a90a78b4f69bba98c6a0feebbfb5a01` |
| 重编 | `node node_modules/typescript/bin/tsc -b` | `t157-swap-mut` | **exit 0**（变异编得过，红得才有意义） |
| 重跑批（变异批） | `… --out .scratch/t157-swap/mut` | `t157-swap-mut` | **exit 1**、`RESULT: 63/66`、`PROBE: RED（FAIL 3／29…）`——**RED: 机检⑱（编辑器形状）／过程页 prompt 判据／机检⑩（脚本块形状）三条同时红**；186 那份实测 `ilw-` 回到 **119**、`pe-tabs` 0、复制数据标题回到 `【calorie · 构建向导】` |
| 还原 | `… restore <件> .scratch/t157-swap/commands.ts.bak` | `t157-swap-restore` | **`RESTORE sha256 备份=e85c37a9…3837b8 盘上=e85c37a9…3837b8 IDENTICAL=true`**（逐字节回写） |
| 复跑批（还原批） | `… --out .scratch/t157-swap/products-restore` | `t157-swap-restore2` | **exit 0**、`RESULT: 66/66`、`PROBE: PASS（29/29）` |
| 还原一致 | `node .scratch/t157-swap/cmp-products.mjs .scratch/t157-swap/products .scratch/t157-swap/products-restore` | `t157-swap-restore2` | `CMP 文件=37 原始sha相等=0 归一化后sha相等=**37**` · **PASS**（只把页脚 `YYYY-MM-DD HH:MM:SS` 那一处换成占位符，其余字节一律不放宽） |

> **如实记一处坑（第一次还原没回绿）**：第一次还原（`runId=t157-swap-restore`）里源文件被逐字节写回，但 **Windows 的 `CopyFile` 保留了备份文件的旧时间戳** ⇒ 源比 `dist`「旧」，`tsc -b` 的增量判定认为工程最新、**跳过 emit**，`dist/workout/commands.js` 里仍是变异实现 ⇒ 复跑批照旧 `63/66` 红、逐件比对点名 `order186-process.html` 不等。处置：加跑 `t157-swap-restore2`，把重编换成 `tsc -b --force`（强制重编）并**认口**：`dist/workout/commands.js` 里 `run: viewPlanEditor,` 命中 **1**、`run: viewPlanWizard,` 命中 **0**；随后重签 ＋ `gen:check` exit 0、复跑批 `66/66`、逐件比对 37/37 全等。**还原只回写了那一件源码，没有整目录还原、没有 `git checkout -- `**。

## 九、回归

| 组 | 命令（持锁 `runId=t157-swap-regress`） | 读数 |
|---|---|---|
| **票面四条（场景05）** | `node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs` | **exit 0**（票面那条命令**逐字单跑一次**，`runId=t157-swap-regress-scene05`，`waitedMs=0`）；`ℹ tests 4 ／ pass 4 ／ fail 0 ／ cancelled 0 ／ skipped 0 ／ todo 0`（`logs/regress-scene05-standalone.log`；同一组在本窗的「三组一包」里也跑过一次，读数相同，`logs/regress-scene05.log`） |
| 相邻三条（拿这条键真跑过的既有测试） | `node --test packages/skill-calorie/test/render-t41.test.mjs packages/skill-calorie/test/cli-smoke-t41.test.mjs packages/skill-calorie/test/db-readonly-93.test.mjs` | `tests 19 ／ pass 18 ／ fail 1`。**唯一红**＝`db-readonly-93` 的「68 读键只读／可写句柄全等」，点名的是 **`calorie.today`**（`actual: ['calorie.today']`）——**与本票无关**（另一窗在途改动，见下「红的归谁」）。`render-t41`（149／168 行直接调旧页 `renderPlanWizardHtml` 做单元断言）与 `cli-smoke-t41`（真 CLI 跑这条键）**全过**——换装没有把旧页的单元面打断。 |
| 登记类四条 | `node --test packages/skill-calorie/test/cmd-registry-294.test.mjs packages/skill-calorie/test/legacy-ratchet-295.test.mjs packages/skill-calorie/test/legacy-partition-313.test.mjs test/calorie-routing-81.test.mjs` | `tests 24 ／ pass 17 ／ fail 7`。**七条全是他席已落盘的现状**：`#320 终态` 点名 `src/cli/readArgs.ts:63` 里 `calorie.view.composition-wizard`／`calorie.view.measure-wizard` 两条按键分派字面量（该件 `git diff` 为空＝已在盘上，不是本窗改的）；`calorie-routing-81` 的六条是路由表/冻结表漂移（`exec 427／non-exec 9 ≠ 419／17`、缺 `calorie.view.label-precheck`）。**七条里没有一条点名 `plan-wizard`、186、或本票的任一文件。** |

> **「红的归谁」怎么判的（本窗口径）**：① 逐条读断言正文，看它点的是哪个键／哪个文件（上表已列）；② 对本票改过的两件做 `git diff` 与 `git status`，确认这些红点名的文件**不在本票写集里、也不由本票改动**；③ 两组红的机器读数在**换装前的同一条命令**下同样成立（它们与 186 的产出无关：一组查分派层字面量，一组查路由表与冻结表）。本窗**不动**它们（不在写集内），如实报给编排者。

## 十、未做项（如实交代）

1. **旧向导的引用面（票面点名要报的那一段）**——换装后逐件读数：
   - **命令／路由面**：`calorie.view.plan-wizard` 这条**键仍在**，两条路由（`wake` 列表 order 186「定训练计划」、`new` 列表 order 27「看构建向导」）都还指它；**变的是这条命令的产出**（编辑器页），键与 `cli` 一字未动。**⇒ 副作用如实报**：order 27「看构建向导」现在拿到的也是编辑器页（同一个键）。要不要给它留一条旧页或另开一条词，**归负责人／编排者裁**（本票不自行改路由）。
   - **旧入口函数 `viewPlanWizard`**（`src/workout/wizard.ts:19`）：换装前唯一调用方是本票改的那一行命令声明；换装后**零调用方**（全仓搜 `viewPlanWizard` 只剩它自己的定义与 `precheckPrompt.ts:4` 的一句注释）。
   - **旧页装配 `planWizardDocs.ts`**：仍被 `src/render/html.ts:28` 引用（`renderPlanWizardHtml`，经 `src/render/index.ts:72` 薄转出）；而它现在**唯一的调用方**是 `wizard.ts:29`（即上面那个零调用方的函数）。
   - **测试面**：`packages/skill-calorie/test/render-t41.test.mjs:149／168` 仍直接调 `renderPlanWizardHtml` 做单元断言；`test/combos-42.test.mjs:130` 与 `test/scene05-write-create.test.mjs:72` 仍按这条键跑／断言。**三处一律保留、照旧跑**（后两条走的就是换装后的编辑器页）。
   - **结论**：**旧向导在命令／路由面已不可达（退场完成），源码与单测按票面「不许顺手删」原样保留**；186 这条链上**没有暗路径**（没有任何分支回落到旧页）。`dist/render/planWizardPort`… 之外的 stale dist 残留本仓另有 30 余件先例，本票不清理。
2. **台账（`packages/skill-calorie/AGENTS.md`）本窗未同步**：本窗开工当刻跑 `node packages/skill-calorie/scripts/check-warning-line.mjs` 是 **exit 1**，四条 `台账陈化` 全部点名**他席的件**（`scripts/build-help.mjs 553→554`、`src/render/trendMiscPort.ts 456→404`、`scripts/gen-photo-baseline.mjs 429→283`、`src/diet/receipt.ts 379→383`）；**没有一条点名本票的件**。收工前再跑一次：他席已 `--sync`，当刻 **exit 0、`RESULT: 85/85`、`PASS: 告警线台账齐全且与实况一致`**（两次读数都在 `logs/ledger-check.log`／`ledger-check2.log`）。本票新增的 `src/render/planEditorPort.ts` **254 LF**（线内 350）、改过的 `src/workout/commands.ts` **52 LF**（线内），**不触发「漏报／陈化」任何一档，也不需要台账行**；`--sync` 会写 `AGENTS.md`（**不在本票写集内**），本窗**一次都没跑**。
3. **人用真实浏览器滚两张墙、逐格记缺陷**：本席未做、也不代做（仓规 §4 的负责人动作）。`逐格缺陷清单.md` 只给骨架，「症状」「要不要改」两列 37 行**全是 `—（待填）`**。
4. **发布名仍是 `定训练计划-预检.html`**（后缀按清单既有命名规则 `-预检／-回执`；那一格现在是编辑器、不再有「预检确认」这一步）。要不要改名成 `定训练计划-编辑器.html`，**归负责人／编排者裁**：改法＝`manifest.json` 一行 ＋ 重跑 `gen-wall.mjs --stage`。本票取**不动名**（改名的另一面是负责人手上的旧链接／对照物会断）。
5. **`scripts/build-help.mjs` 与 `SKILL.md` 未重出**：本票没加键、没改标题与示例，`REPR`／`EXAMPLE`／`FLOW` 三张表与 `SKILL.md` 速查表的内容都不受影响（`gen:check` 逐件 sha256 已证零 diff）。**命令表里这条键的标题仍是 `构建向导`**——本票取「不动登记事实」的最小改法，要不要把它改成人话（如「定训练计划页」），**归负责人／编排者裁**。
6. **键的选法留了退路**：本票取 `#553` 读法甲里的**不动键**那一支。若裁定要**新键**（读法甲括号里的「或新键」），改法已勘明：`src/workout/commands.ts` 加一条 `key: 'calorie.view.plan-editor'` 的读命令（`run: viewPlanEditor`）＋ `src/workout/routes.ts` 的 order 186 改键与 `cli` ＋ `pnpm gen`，其余（端口、机检 ⑱、墙）不用动。
7. **像素／截图比对未做**：本票不做视觉判断；墙只保证「真渲染、点得开、引用都落得到」。
