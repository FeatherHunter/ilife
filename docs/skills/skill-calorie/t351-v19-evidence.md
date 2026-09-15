# 票 #351 · 场景05 · **收口窗**（T351-v19）：连带红 ＋ 同类陈化三处 ＋ 三处已裁定收口 ＋ 墙重出

**本件是什么**：票 #351 在**收口窗**（v19）里的逐条实跑证据 —— **v19 取代 v18**（`t351-v18-evidence.md`）。

- **取代关系**：本件**取代** `docs/skills/skill-calorie/t351-v18-evidence.md`。**v18／v17／v16 三件一律保留不删**，不属本件；它们记的是各自窗口当刻的读数（v18＝order 186 换装窗），历史事实照旧成立。
- **取代原因（v18 交出去以后又动了四处）**：
  1. **① 前一票改动造成的连带红**：`packages/skill-calorie/test/skill-t11.test.mjs:47` 逐字找 `'当前不可写'`，而 `SKILL.md` 那句已按事实订正 ⇒ 这个测试**必红**。本窗**只重指锚点**（第 5 串换成**只住那一格**的新事实串）＋ `:42` 用例标题口径随动；**不删断言、不放宽判据**（§八 给变异自证：改回旧口径必红、还原必绿）。
  2. **② 同一类陈化的剩余三处**：`src/workout/index.ts:8-10`／`:35`（**只改注释**）、`SKILL.md:33`（写链那一句）、`docs/skills/skill-calorie/scene-inventory.md:81-90`（场景 35–44 十行）。
  3. **③ 三处已裁定的收口**（编排者已定，本窗照办）：命令登记标题 `构建向导` → **`定训练计划`**（**只经生成器**：改声明源 `src/workout/commands.ts` 的 `title`，再跑 `gen-cli.mjs` 重出生成物）；墙里第 11 格的发布名 `定训练计划-预检.html` → **`定训练计划-编辑器.html`**；**`order 27「看构建向导」不动**（词表与键都没改）。
  4. **④ 重出墙 ＋ 出 v19 证据**：37 格照**本轮重跑批**重出；`逐格缺陷清单.md` 只给**空骨架**（「症状」「要不要改」两列 37 行一个字都没填）。
- 跑批件（入仓）：`docs/skills/skill-calorie/t351-v7-run-176-207.mjs`；墙生成器（入仓）：`docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs`。
- 产物原批目录（**本窗**）：`D:\ilife\.scratch\t157-final\products`
- 墙目录（发布名副本 ＋ 双墙 ＋ 索引 ＋ 清单 ＋ 生成器 ＋ 逐格缺陷清单）：`D:\ilife\docs\skills\skill-calorie\scene05-验收墙`
- 门禁运行对账：`docs/skills/skill-calorie/t351-v19-gate-runs.md`（**本件声称跑过的每一次运行，在那件里都有 `GATE-RUN runId=<标识> cmd=<命令>` 一行**）
- 本件**不做视觉判断**：机器只负责把真渲染跑出来、把每格「该确认什么」写清、把自检退出码交出来；判定归负责人（两列一个字都没填）。
- **本窗基线（如实记）**：跑批与全部读数取自**当刻工作区**（`tsc -b` 之后、`gen-cli.mjs` 重出生成物之后）。开工当刻 `HEAD = 393e45a`；工作区里有别席在途的 M 件（`scene01-验收墙/**` 8 件、`t351-v7-run-176-207.mjs` 等），本票**一件未碰**。
- **与 v18 批的逐件差异（如实报，非本票改动）**：同一份 `order186-process.html` 与 v18 批相比只差两处——① 页脚生成时间戳（跑批时刻不同）；② 共享 helpers 脚本块里的一句**注释文本**（`base-render/src/controls.ts:932`，他席已提交的 `59770ff 修复(468): base-render禁用词换词清零` 把「真实help模板」改成「help模板」）。**判据面上零差异**：186 那一格的标记计数与 v18 逐个相同（§七）。

---

## 一、本窗做的四件，逐件读数

### 1.1 ① 连带红：测试锚点重指（`test/skill-t11.test.mjs`）

| 项 | 读数 |
|---|---|
| 旧锚点 / 新锚点 | 旧：`'当前不可写'`（`SKILL.md` 里现在 **0 行** ⇒ 必红）；新：`'**可写**：出计划编辑器（可写页）→ 用户改完确认 → 复制命令 → AI 调 \`calorie.workout.plan-set\` 落库'`（该串在 `SKILL.md` 里命中 **1**，只住第 63 行那一格） |
| 用例标题 | `:42` 由「含前置/映射/**不可写**/违规口径」改成「含前置/映射/**可写**/违规口径」 |
| 改完 | `node --test packages/skill-calorie/test/skill-t11.test.mjs` → **exit 0**、`tests 9／pass 9／fail 0`（`runId=t157-final-t11`） |
| 自证（§八） | 把那一格改回「当前不可写」→ **exit 1**、`pass 8／fail 1`（红点正是新锚点）；逐字节还原 → **exit 0**、`pass 9／fail 0` |

> 同一数组其余六串**一字未动**（`记体脂（皮褶钳）`5 行／`body_composition_wizard.html`／`body_measurements_wizard.html`／`plan_builder_wizard.html`／`不豁免`／`协议 fail mode` 各 1 行）。
> 判据**只换锚点、不放宽**：新锚点比旧串长得多，钉住的是「可写 ＋ 计划编辑器 ＋ 写键 ＋ 落库」四件。

### 1.2 ② 同类陈化的剩余三处（订正，别扩大）

| 件 | 改前 | 改后 | 事实出处 |
|---|---|---|---|
| `src/workout/index.ts:8-10` ＋ `:35`（**只改注释**） | 「本场景今天**没有写键**（…本仓执行层不承接…）」／「写命令入口：同上（本场景今天无写键，任何键都抛）。」 | 「本场景**有写键**：`commands.ts` 里 `workout.plan-*` 十条 `kind:'write'`…写入口照 `src/weight/` 同款形状——命中即派发，查出不是健身计划（或其实是读键）才抛」／「命中即走它的处理函数；键不属健身计划（或其实是读键）即抛」 | `src/workout/commands.ts:43-52` 十条写声明；`runWorkoutWrite` 的实际行为是查 `kind:'write'` 就派发 |
| `SKILL.md:33`（写链那一句） | `35 写键（diet/water/weight/exercise/photo/product/profile/goal/body）…训练计划/训记同步与 mmx vision 两步向导无独立写键` | `46 写键（diet/water/weight/exercise/photo/product/profile/goal/body/workout）…训记同步与 mmx vision 两步向导无独立写键` | 写键数取自生成物 `src/cli/keys.ts` 的 `CALORIE_WRITE_COMBOS`＝**46** 条（`workout` 域 **10** 条）；训记同步／mmx vision 那半句**属实**（`routes.ts:35-36` 两条 `out-of-scope`），故保留 |
| `docs/skills/skill-calorie/scene-inventory.md:81-90`（场景 35–44 十行） | 十行全写 `❌ 没打通` ＋「95 键无训练计划写键（旧链 --live-plan-* 系列），本仓执行层不承接计划写入。」 | 十行改 `✅ 打通`，`key` 换成真写键（`calorie.workout.plan-set` 等十条），原因换成当刻路由事实（过程页 → 用户确认 → 写键落库） | `src/workout/routes.ts:22-31`（wake 列表 186–195 全 `kind:'exec'`）＋ `:49-58`（`确认X` → 十条写键）；本轮 37 份产物里这十条各有一份过程页与一份回执页 |

### 1.3 ③ 三处收口

| 项 | 改前 | 改后 | 走法 |
|---|---|---|---|
| 命令登记标题 | `calorie.view.plan-wizard` 的展示标题 `构建向导` | **`定训练计划`** | **只经生成器**：改声明源 `packages/skill-calorie/src/workout/commands.ts:37` 的 `title` → `tsc -b` → `gen-cli.mjs --stamp` → `gen-cli.mjs`（重出 `src/cli/keys.ts`／`packages/base-combos/combos.yaml`）；`registry.ts`／`routes.generated.ts`／`scripts/build-help.mjs` **零 diff** |
| 墙里那格发布名 | `定训练计划-预检.html`（sha256 `0CB52DBB…66ECC2`，98433 B） | **`定训练计划-编辑器.html`**（sha256 `B92E5859…84AFD4`，98447 B） | 改 `manifest.json` 第 11 行 `file` ＋ `naming`／`source`／`notShipped` 三处文案 → `gen-wall.mjs --stage` 重出；旧副本**删除**（改名＝移，不留孤儿页） |
| `order 27「看构建向导」` | —— | **不动** | `src/workout/routes.ts:45` 一行未改（它继续指同一张编辑器页）；词表、逐字文案、键**都没碰** |

### 1.4 ④ 重出墙 ＋ 证据

| 项 | 读数 |
|---|---|
| 墙正例 | `37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发` · **exit 0** |
| 墙反例 | `36 格；…；缺失 1 -> 不可发` ＋ `清单点名却没有文件：1 看本周计划 -> 看本周计划-反例-盘上没有.html` · **exit 1** |
| 缺陷清单 | 重出为空骨架：37 行，「症状」「要不要改」两列**已填行数＝0** |

---

## 二、全量重跑（本窗）

| 项 | 值 |
|---|---|
| 命令（照票面） | `node tooling/run-locked.mjs --ticket 157 --run-id t157-final-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-final/products` |
| runId | `t157-final-run`（`waitedMs=20010`） |
| 退出码 | **0** |
| 摘要行 | `RESULT: 66/66（产物 37 ＋ 判据 29）` ＋ `PROBE: PASS（29/29 判据全绿）` |
| 产物 | `D:\ilife\.scratch\t157-final\products` 下 **37 份 HTML**（＋ `detail.json` 逐条读数 ＋ `dbs` 隔离库） |
| 库隔离 | 全部读写落在 `D:\ilife\.scratch\t157-final\products\dbs\`（`SKILLS_DB_PATH`），**未碰生产库** |
| 覆盖面 | 只写 `.scratch/t157-final/`；既有批次（`.scratch/t157-swap/`／`.scratch/t157-close/`／`.scratch/t351-v16/` 等）**一件未覆盖** |
| 重编＋重签＋生成物门 | `tsc -b` 0；`gen-cli --stamp` 0；`gen-cli`（＝`pnpm gen` 等价体）0；`gen-cli --check` 0 ——`GEN-CHECK PASS：键 128（写 46 ＋ 读 82）`。生成物 sha256：`keys.ts c2e30bb8…53c80`／`registry.ts 5c81bfbd…7b47b`／`combos.yaml 99cba1b9…16aa9`／`build-help.mjs e16d18c6…1de8a`／`routes.generated.ts 71364217…b5e5e6` |
| 日志 | `.scratch/t157-final/logs/tsc-1.log`／`gen-stamp-1.log`／`gen-1.log`／`gen-check-1.log`；跑批 `.scratch/t157-final/logs-batch.log` |

## 三、表一 · 27 条可执行唤醒词（37 份产物，逐条实跑）

| # | order | 唤醒词 | 命令（真出口 `dist/cli/cmd_read.js`，key ＋ 参数） | exit | 产物（绝对路径；括号里是发布名副本） | 机检读数 |
|---|---|---|---|---|---|---|
| 1 | 176 | 看本周计划 | `calorie.view.plan` `{"weekOffset":0,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-final\products\order176-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看本周计划.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 2 | 177 | 看下周计划 | `calorie.view.plan` `{"weekOffset":1,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-final\products\order177-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看下周计划.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 3 | 178 | 看上周计划 | `calorie.view.plan` `{"weekOffset":-1,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-final\products\order178-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看上周计划.html`） | ④`none`→本页无表（符合声明）；复制数据标题=【calorie · 训练计划查看】 |
| 4 | 179 | 看指定周计划 | `calorie.view.plan` `{"week":1}` | 0 | `D:\ilife\.scratch\t157-final\products\order179-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看指定周计划.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 5 | 180 | 看今天练什么 | `calorie.view.plan` `{"date":"今日","today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-final\products\order180-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看今天练什么.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 6 | 181 | 看某动作安排 | `calorie.view.plan` `{"movement":"硬拉"}` | 0 | `D:\ilife\.scratch\t157-final\products\order181-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看某动作安排.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 7 | 182 | 看某天练什么 | `calorie.view.plan` `{"date":"2026-09-09"}` | 0 | `D:\ilife\.scratch\t157-final\products\order182-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看某天练什么.html`） | ④`four`→四列逐字按序（行 1）；复制数据标题=【calorie · 训练计划查看】 |
| 8 | 183 | 看计划概览 | `calorie.view.plan` `{}` | 0 | `D:\ilife\.scratch\t157-final\products\order183-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划概览.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 9 | 184 | 看完整计划 | `calorie.view.plan` `{}` | 0 | `D:\ilife\.scratch\t157-final\products\order184-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看完整计划.html`） | ④`four`→四列逐字按序（行 2）；复制数据标题=【calorie · 训练计划查看】 |
| 10 | 185 | 看计划 vs 实际 | `calorie.view.plan-vs-actual` `{"window":"custom","start":"2026-09-07","end":"2026-09-09"}` | 0 | `D:\ilife\.scratch\t157-final\products\order185-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划 vs 实际.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 计划对比实际】 |
| 11 | 186 | 定训练计划（过程） | `calorie.view.plan-wizard` `{"plan":{"config":{"title":"减脂4周","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}` | 0 | `D:\ilife\.scratch\t157-final\products\order186-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-编辑器.html`） | ④`none`→本页无表（符合声明）；复制数据标题=【calorie · 定训练计划】 |
| 12 | 187 | 复制训练计划（过程） | `calorie.view.plan-write-preview` `{"op":"copy"}` | 0 | `D:\ilife\.scratch\t157-final\products\order187-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\复制训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 13 | 188 | 定休息日（过程） | `calorie.view.plan-write-preview` `{"op":"set-rest","week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-final\products\order188-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定休息日-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 14 | 189 | 加训练动作（过程） | `calorie.view.plan-write-preview` `{"op":"add-movement","week":1,"dayOfWeek":1,"movement":{"name":"硬拉"}}` | 0 | `D:\ilife\.scratch\t157-final\products\order189-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\加训练动作-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 15 | 190 | 定一周计划（过程） | `calorie.view.plan-write-preview` `{"op":"set-week","week":1}` | 0 | `D:\ilife\.scratch\t157-final\products\order190-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定一周计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 16 | 191 | 改训练计划（过程） | `calorie.view.plan-write-preview` `{"op":"update","title":"示例改名"}` | 0 | `D:\ilife\.scratch\t157-final\products\order191-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 17 | 192 | 改某天训练（过程） | `calorie.view.plan-write-preview` `{"op":"update-day","week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}` | 0 | `D:\ilife\.scratch\t157-final\products\order192-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改某天训练-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 18 | 193 | 删某天训练（过程） | `calorie.view.plan-write-preview` `{"op":"delete-day","week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-final\products\order193-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\删某天训练-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 19 | 194 | 改动作（过程） | `calorie.view.plan-write-preview` `{"op":"update-movement","oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}` | 0 | `D:\ilife\.scratch\t157-final\products\order194-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改动作-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 20 | 195 | 撤销训练计划（过程） | `calorie.view.plan-write-preview` `{"op":"delete"}` | 0 | `D:\ilife\.scratch\t157-final\products\order195-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\撤销训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」）；复制数据标题=【calorie · 写前预览】 |
| 21 | 186 | 定训练计划（回执） | `calorie.workout.plan-set` `{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}` | 0 | `D:\ilife\.scratch\t157-final\products\order186-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 定训练计划】 |
| 22 | 187 | 复制训练计划（回执） | `calorie.workout.plan-copy` `{"newTitle":"示例副本"}` | 0 | `D:\ilife\.scratch\t157-final\products\order187-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\复制训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 复制训练计划】 |
| 23 | 188 | 定休息日（回执） | `calorie.workout.plan-set-rest` `{"week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-final\products\order188-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定休息日-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 定休息日】 |
| 24 | 189 | 加训练动作（回执） | `calorie.workout.plan-add-movement` `{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}` | 0 | `D:\ilife\.scratch\t157-final\products\order189-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\加训练动作-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 加训练动作】 |
| 25 | 190 | 定一周计划（回执） | `calorie.workout.plan-set-week` `{"week":2,"days":[{"dayOfWeek":2,"sessionLabel":"背","movements":[{"name":"硬拉"}]}]}` | 0 | `D:\ilife\.scratch\t157-final\products\order190-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定一周计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 定一周计划】 |
| 26 | 191 | 改训练计划（回执） | `calorie.workout.plan-update` `{"title":"示例改名"}` | 0 | `D:\ilife\.scratch\t157-final\products\order191-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 改训练计划】 |
| 27 | 192 | 改某天训练（回执） | `calorie.workout.plan-update-day` `{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}` | 0 | `D:\ilife\.scratch\t157-final\products\order192-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改某天训练-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 改某天训练】 |
| 28 | 193 | 删某天训练（回执） | `calorie.workout.plan-delete-day` `{"week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-final\products\order193-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\删某天训练-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 删某天训练】 |
| 29 | 194 | 改动作（回执） | `calorie.workout.plan-update-movement` `{"oldMovement":"俯卧撑","newMovement":{"name":"钻石俯卧撑"}}` | 0 | `D:\ilife\.scratch\t157-final\products\order194-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改动作-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 改动作】 |
| 30 | 195 | 撤销训练计划（回执） | `calorie.workout.plan-delete` `{"confirm":true}` | 0 | `D:\ilife\.scratch\t157-final\products\order195-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\撤销训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；复制数据标题=【calorie · 撤销训练计划】 |
| 31 | 201 | 计划复盘（本周） | `calorie.view.exercise-review` `{"window":"本周"}` | 0 | `D:\ilife\.scratch\t157-final\products\order201-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（本周）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 32 | 202 | 计划复盘（本月） | `calorie.view.exercise-review` `{"window":"本月"}` | 0 | `D:\ilife\.scratch\t157-final\products\order202-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（本月）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 33 | 203 | 计划复盘（全部） | `calorie.view.exercise-review` `{"window":"custom","start":"2026-09-07","end":"2026-09-20"}` | 0 | `D:\ilife\.scratch\t157-final\products\order203-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（全部）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 34 | 204 | 看计划完成率 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-final\products\order204-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划完成率.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 35 | 205 | 看未完成训练 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-final\products\order205-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看未完成训练.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 36 | 206 | 看动作完成率 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-final\products\order206-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看动作完成率.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」）；复制数据标题=【calorie · 计划复盘】 |
| 37 | 207 | 扫禁忌 | `calorie.view.contraindication` `{}` | 0 | `D:\ilife\.scratch\t157-final\products\order207-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\扫禁忌.html`） | ④`own1`→自有表（按序 5 列，无「组数×次数」）；复制数据标题=【calorie · 禁忌扫描】 |

## 四、口径两条（读表须知）

- 「唤醒词」列的 186–195 出现两次不是重复：同一条词有两份产物——**过程页**与**写后回执页**（各自独占一个隔离库 `dbs/receipt-<order>`，免互相污染）。发布名照 `-预检`／`-回执` 后缀；**唯一例外是 186**：它出的是**计划编辑器（可写页）**，发布名取 `定训练计划-编辑器.html`（本窗改名，见 §七）。
- 195 另有一条**撤销后读验证**（`calorie.view.plan` 再读一次）：**它不是页面**，故不在这 37 份里（清单 `notShipped` 的一条）。


**另两条不是页面的读数**（照 v17／v18 的记法）：

- 撤销后读验证（195）：exit=4 stderr 命中「无训练计划」=true
- 外部五条 196–200：5 条如实记 `non-exec`（无产物）：196 落地训练／197 落地到本周末／198 落地到本月底／199 同步到训记／200 拉训记实绩

## 五、判据 29 条（逐条读数，取自 products/detail.json 的 checks 段）

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
  - 读数：红=0 共享helpers指纹=d2f6aadec8fb（命中 37 份；缺=0） 普通块数不符=0 JSON块数不符=0 全量块数分布=[1,3]｜编辑器：普通 2＝helpers d2f6aadec8fb ＋ 自配运行时 bcf118c18b30；JSON 1；旧口径「首块指纹数」=2（仅作对照，v18 起不再拿它当判据）
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
## 六、t554 编辑器契约门（票面验收命令 ⑥）

| 项 | 值 |
|---|---|
| 命令 | `PE_OUT=.scratch/t157-final/gate node docs/skills/skill-calorie/t554-plan-editor-gate.mjs --phase=gate`（持锁：`runId=t157-final-gate`；`PE_OUT` 只改**产物落点**，不改判据，也不覆盖 `.scratch/t554/`） |
| 退出码 | **0** |
| 摘要行 | `RESULT: 18/18` |
| 说明 | 本门判的是 `buildPlanEditorDoc` 出来的那一页（需求正件 `t351-v14-plan-editor-design.md` §1 四条 ＋ 两条自设探针），与 186 走哪条键无关；本窗没有改 `planEditor*.ts` 的任何一行，故读数与 v18 窗逐条一致。 |

## 七、186 那一格：标记前后对照 ＋ 改名前后对照

### 7.1 标记计数（v18 批 ↔ 本窗批，同一口径、同一个计数器）

| 标记 | v18 批 `.scratch/t157-swap/products/order186-process.html` | 本窗批 `.scratch/t157-final/products/order186-process.html` |
|---|---|---|
| `ilw-`（旧向导标记） | **0** | **0** |
| `pe-tabs` ／ `pe-daytabs` ／ `pe-day` | 4 ／ 4 ／ 17 | 4 ／ 4 ／ 17 |
| `data-act`（页内可点可写动作） | 31 | 31 |
| 正文里的产物表挂载点 `id="pe-out-body"` | 1 | 1 |
| `<script>` 块（含 `#pe-state` JSON） | 3（1） | 3（1） |
| 整页字符数 | 93908 | 93918 |

> 逐项相同 ⇒ **186 仍是那张计划编辑器（可写页）**，本窗的四处改动没有碰它的产出。整页字符数差 10 来自顶栏「时间戳版本」那行的时刻文本（跑批时刻不同），**与页面结构无关**；与 v18 批的另两处差异见件头最后一条（他席已提交的共享 helpers 注释换词）。

### 7.2 改名前后（发布名在 `manifest.json` 一处算）

| 项 | 改前 | 改后 |
|---|---|---|
| 发布名 | `定训练计划-预检.html` | **`定训练计划-编辑器.html`** |
| 绝对路径 | `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-预检.html` | `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-编辑器.html` |
| sha256 | `0CB52DBB4157A7B0A4533DD8DEE9C12B3EBF4BE37F72DE0A4C9C95073066ECC2`（＝v18 批产物） | `B92E58599CC7DDA02E04FCB667BF5346CB96F372425FF61E9A7EE96F7484AFD4` |
| 字节数 | 98433 | 98447 |
| 与原批产物关系 | —— | **逐字节同一份**：`B92E585999…84AFD4` ＝ `.scratch/t157-final/products/order186-process.html`（副本 ≡ 原批） |
| 旧副本 | 删除（改名＝移，不留孤儿页；`--check` 只判「清单点名」与「页上引用」，多出来的孤儿页它不判，故这一步是本窗手工做实的） |

### 7.3 契约门／链接面随动

- `manifest.json`：第 11 行 `file` 改名；`naming` 补一句「order 186 是唯一例外」；`source` 与 `notShipped` 三条的批目录（`.scratch/t157-final/products/`）与证据件名（`t351-v19-evidence.md`／`t351-v19-gate-runs.md`）随动。
- `gen-wall.mjs` 件头的「本批重跑方式」改成收口窗这条命令，命名规则那段补上 186 这个例外（**例外只在 `manifest.json` 那一行算，生成器不特判**）。
- 两张墙与 `总索引.html` 由 `--stage` 重出：格数 37 ＝ 索引卡片 37 ＝ 清单 `rows` 37 ＝ 原批 `.html` 37。

## 八、① 的自证：把 `SKILL.md` 那一格改回「当前不可写」

| 步 | 命令（持锁） | runId | 读数 |
|---|---|---|---|
| 留底 | `node .scratch/t157-final/mutate-skill.mjs backup packages/skill-calorie/SKILL.md .scratch/t157-final/SKILL.md.bak` | `t157-final-mut-skill` | 备份 sha256 `ff9f2bfd1cb4d4ae3745dd94377419ba5a4ef1c3a55aa9ffd0479b2eff92104c` |
| 变异（**一处**） | `… mutate-skill.mjs break <件>` | `t157-final-mut-skill` | 第 63 行那一格 `**可写**：出计划编辑器（可写页）→ …AI 调 \`calorie.workout.plan-set\` 落库（见下）` → **`**当前不可写**：95 键无训练计划写键（见下）`**；变异件 sha256 `a305c191539856a8609e5bb8cbbf2028eca320048614f2258e023d91a29cbdec` |
| 跑 t11（**必红**） | `node --test packages/skill-calorie/test/skill-t11.test.mjs` | `t157-final-mut-skill` | **exit 1**、`tests 9／pass 8／fail 1`；红点逐字：`AssertionError [ERR_ASSERTION]: M6 正文缺：**可写**：出计划编辑器（可写页）→ 用户改完确认 → 复制命令 → AI 调 \`calorie.workout.plan-set\` 落库` |
| 还原 | `… mutate-skill.mjs restore <件> <备份>` | `t157-final-mut-skill` | `RESTORE sha256 备份=ff9f2bfd…92104c 盘上=ff9f2bfd…92104c IDENTICAL=true`（逐字节回写） |
| 复跑 t11（**必绿**） | `node --test packages/skill-calorie/test/skill-t11.test.mjs` | `t157-final-restore-skill` | **exit 0**、`tests 9／pass 9／fail 0` |

> 两行读数（票面要的那两行）：**变异 exit=1（fail 1，红点是新锚点）／还原 exit=0（pass 9）**。
> 还原只回写了那一件、没有整目录还原、没有 `git checkout -- `；凭据是上面那条 sha256 相等。

## 九、回归（票面验收命令 ②）

| 组 | 命令（持锁 `runId=t157-final-scene05`） | 读数 |
|---|---|---|
| 场景05 四条 | `node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs` | **exit 0**；`tests 4／pass 4／fail 0／cancelled 0／skipped 0／todo 0`（`waitedMs=10011`，日志 `.scratch/t157-final/logs-scene05.log`） |

### 9.1 另两条只读读数（不属票面四条，本窗自己量的）

| 面 | 命令 | 读数 |
|---|---|---|
| 告警线台账（包内规矩） | `node packages/skill-calorie/scripts/check-warning-line.mjs`（**只读、无参**） | **exit 0**、`RESULT: 87/87`、`PASS: 告警线台账齐全且与实况一致`（台账 42 行；扫描面 327 件，超线 38 件，剔出生成物 3 件）。本窗改过的三件（`src/workout/index.ts` 43 LF／`src/workout/commands.ts` 53 LF／`test/skill-t11.test.mjs` 不在扫描面）**都在线内**，故 `AGENTS.md` 未动、`--sync` 一次都没跑 |
| 外部五条三处命中 | `node .scratch/t157-final/probe-non-exec.mjs` | 路由表 5/5、场景词表（真 `TRIGGERS` 数组）5/5、HELP 资产 5/5，`reason` 首句逐字在 5/5，`probe non-exec PASS` |

## 十、未做项（如实交代）

1. **`scene-inventory.md` 的两处聚合格没有随动**（本票写集只给那十行）：十行由 `❌ 没打通` 改成 `✅ 打通` 之后，同一文件的**总览**（`✅ 打通 340`／`❌ 没打通 86`）与**分组表**（健身计划 `9 ／ 18`）仍是改前的数——按本窗订正的正确值应是 **350 ／ 76** 与 **19 ／ 8**；`三、三处必须说清的口径` 第 1 条的「legacy-chain（85 条）」同样要减 10。**本窗未改这三处**（不在写集，且该条口径的 85 与总览的 86 改前就已不等、属旧账）。下一手：一并订正这三处计数即可。
2. **`SKILL.md:39` 的「读 64 键 + 写 35 键共 99 键」未动**：它说的是「组合键 registry」口径，与生成物 `CALORIE_COMBOS` 的现状（128 ＝ 写 46 ＋ 读 82）**改前就已不等**；本票写集只给 `:33` 那一句。**如实登记**：本窗把 `:33` 的写键数改成 46 之后，`:33` 与 `:39` 的写键数**不再同值**（46 vs 35）——两处都是手写散文，生成物（AUTO 块）才是权威。
3. **`src/triggers/routing.ts:70-71` 的 `planWriteMissing` 死常量本票不动**：实测 `packages/skill-calorie/src/**` 零引用、`routes.generated.ts` 零命中；代码件、另票处理。`SKILL.md:73` 已就地写了防呆句（明说它是零引用死常量、其词与事实相反、不得据此拒绝出页或落库）。**没有删它。**
4. **`order 27「看构建向导」仍指同一张编辑器页**（编排者已裁定不动）：它拿到的页现在叫 `定训练计划-编辑器.html`、内容是计划编辑器，词面留批改；本窗**没有**改词表、没有新建键。
5. **台账（`packages/skill-calorie/AGENTS.md`）本窗未动**：`check-warning-line.mjs` exit 0／87/87（见 §9.1），本窗没有新增件、没有把任何件撑过 350、也没有改台账在册件的当场值 ⇒ 不触发陈化，`--sync`／`--sync --dry` **一次都没跑**。台账里在陈化的是他席的件，未管。
6. **人用真实浏览器滚两张墙、逐格记缺陷**：本席未做、也不代做（仓规 §4 的负责人动作）。`逐格缺陷清单.md` 只给骨架，「症状」「要不要改」两列 37 行**全是 `—（待填）`**（机器核过：已填行数 0）。
7. **像素／截图比对未做**：本票不做视觉判断；墙只保证「真渲染、点得开、引用都落得到」。
8. **`v18`／`v17`／`v16` 三件证据一律未删**（票面要求保留）；`t351-v18-evidence.md` 与本件**并存**，各记各的窗口。
