# 票 #351 · 场景05 全量重跑 ＋ 入仓视觉验收墙 · 实跑证据（v17 · 收口窗）

**本件是什么**：票 #351 机器侧主体的**逐条实跑证据** —— **v17 取代 v16**（`t351-v16-evidence.md`）。

- **取代关系**：本件**取代** `docs/skills/skill-calorie/t351-v16-evidence.md`（v16 原件**保留不删**，不属本件）。
- **取代原因**：三处修法已落地并经编排者核验，v16 的读数**按事实已经过时**，且 v16 记的两条未做项（27 处 `calorie.calorie.` 双前缀、撤销回执「状态」卡）已修：
  - `#435` 撤销回执「状态」卡改成按命令键派生 → `packages/skill-calorie/src/workout/receipt.ts`；
  - `#554` 计划编辑器删掉锁周「参数一律纯文本」覆盖 → `packages/skill-calorie/src/render/planEditorRuntime.ts`；
  - `#550` 新增 `packages/skill-calorie/src/shared/sceneEnvelope.ts` 并在**四处** `buildLogText` 调用点归一（`shared/copyArea.ts`／`render/planCopyBlock.ts`／`render/reviewDocs.ts`／`render/trendDocs.ts`）。
  于是 v17 这一轮：**换掉整张 `scene05-验收墙/`（43 件）**、全量重跑 37 份产物、把双前缀从 **27 → 0**、把撤销回执页从「已写入训练计划 ×1」改成「已删除训练计划 ×1」。
- 跑批件（入仓）：`docs/skills/skill-calorie/t351-v7-run-176-207.mjs`
- 墙生成器（入仓）：`docs/skills/skill-calorie/scene05-验收墙/gen-wall.mjs`
- 产物原批目录（**本窗**）：`D:\ilife\.scratch\t157-close\products`
- 墙目录（发布名副本 ＋ 双墙 ＋ 索引 ＋ 清单 ＋ 生成器 ＋ 逐格缺陷清单）：`D:\ilife\docs\skills\skill-calorie\scene05-验收墙`
- 门禁运行对账：`docs/skills/skill-calorie/t351-v17-gate-runs.md`（**本件声称跑过的每一次运行，在那件里都有 `GATE-RUN runId=<标识> cmd=<命令>` 一行**）
- 本件**不做视觉判断**（不写「版式正常／好看」这类结论）：机器只负责把真渲染跑出来、把每格「该确认什么」写清、把自检退出码交出来；判定归负责人（`逐格缺陷清单.md` 的两条答复列留空待填）。
- **本窗基线挂在哪一次 HEAD 上（如实记漂移）**：跑批与全部读数取自重编后、由 `HEAD = c1f0977884c5301dbcebd841b3321e3ce3bdfa0b` 时的**工作区**（编排者持锁提交 `24fb121`／`a05feda`／`ecb665d`／`d1af159` 之后）。**写回执当刻 HEAD 已漂到 `e3cc0fcf123a2ebbcd1335a7da89d963fee39209`**（别席在继续提交）——本窗**没有**跟到那一次上。核过：场景05 用到的九件源码（`render/reviewDocs.ts`／`render/trendDocs.ts`／`render/planCopyBlock.ts`／`render/planEditorRuntime.ts`／`shared/copyArea.ts`／`shared/sceneEnvelope.ts`／`workout/receipt.ts`／`workout/write.ts`／`workout/planStore.ts`）**最后一改是 21:01:26，早于本窗跑批时刻 21:19:38**；收工再跑 `tsc -b --dry` 仍报各工程最新。⇒ 本窗 37 份产物就是当刻源码的真实渲染。
- **本次重出（D1 返工 · 提交 `9b27549`）**：那一次把 `manifest.json` 的三段 `notShipped[].why` 与顶层 `source` **归位到本轮**（不再指 `t351-v16` 那一轮），并重出了 `总索引.html` 与 `逐格缺陷清单.md`（骨架）。⇒ **本件里凡涉及清单 sha256／索引字节数的读数，一律以本段为准**；本段之前出现的旧值（清单 `086E6975…`、索引 26,103 B）是**该次运行当刻的历史读数**，留作追溯、不再对应当刻盘上。两张墙与 37 份产物副本**不受这次重出影响**（重出后逐字节未变，见 §六.3）。
- **当刻实测（本段写就时量的）**：`manifest.json` sha256 ＝ `2C33EDB3C450599E7FB0A1BA60F6AD13631010599720037514BCFE2E175EDDA1`（**22,609 B**）；`总索引.html` sha256 ＝ `A267DE67D303C292E929B1F3468F733EC8FCC42AA30C1E2F1BD8047FB3E1F58F`（**27,268 B**）。
- **口径句（通篇适用）**：本件所有数字都是**该次运行当刻**的读数。清单与索引是**共享派生件——任何一次重出之后，本件里对应的数字即刻陈化**；要引用请先当刻重量一遍，别照抄本件。

---

## 一、开工前先核的三件事（读数）

### 1.1 台账同步（`packages/skill-calorie/AGENTS.md`）

| 步 | 命令 | runId | 读数 |
|---|---|---|---|
| 演练 | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync --dry` | `t157-ledger-sync-dry` | `SYNC-PLAN mode=dry 行=40 改=6 增=0 删=0`；**exit 1**（脚本口径：计划非空即非 0 退出，末行明说「未落盘」） |
| 落盘 | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync` | `t157-ledger-sync-1` | `SYNC-PLAN mode=write 行=40 改=6 增=0 删=0`；`SYNC-WRITE` ＋ `SYNC-VERIFY ok（回读逐字节等于计划）`；`RESULT: 85/85`；过线判据 `AGENTS.md…（台账 40 行；扫描面 321 件，超线 38 件，剔出生成物 3 件；挂号台账命中 2/2）`；**exit 0** |
| 末次 | `node packages/skill-calorie/scripts/check-warning-line.mjs --sync` | `t157-ledger-sync-final` | `SYNC-PLAN mode=write 行=40 改=5 增=0 删=0`；`SYNC-VERIFY ok`；`RESULT: 85/85`；**exit 0** |

本窗该件被**外部回写两次**（写集争用，不是本窗缺陷）。逐次留痕：

| 次 | 时刻 | AGENTS.md sha256 | 处置 |
|---|---|---|---|
| 落盘后 | 本窗第 1 次 `--sync` 之后 | `0ADE77F8DD0DDCA5661E5B2E4A647AC6236A98241C1E843805371F7783ED8AD8` | — |
| ① 被回写 | 21:22:34（与 `SKILL.md`／`scripts/build-help.mjs` 同一瞬间） | `FF236665859980D03F3BF261B791D25D106A4F5E5BACD60236CD93E559246569`（**≠ HEAD 版**，HEAD 版是 `5D0D26F7…`） | 留证副本 `.scratch/t157-close/AGENTS.md.被外部回写的那一版.md`；按既定步骤幂等重跑 `--sync`（`改=5`，sha 回到 `2AB5AE87C706EC8A4EB70166D851AE1405AB9D364AB5E5D18FFA3F85622BCC62`） |
| ② 再被回写 | 编排者核到台账又成旧数（`trendDocs.ts 1135`／`build-help.mjs 520`／`nutritionPortDocs.ts 645`／`sportPortDocs.ts 666`） | `39AEB1A5A329B8E6E7301C1DE52F57F0EDCA2E9E2C948E555037DD926D10696A` | 照编排者流程修正——**只在最后 `--sync` 一次**：`改=5 增=0 删=0`、`SYNC-VERIFY ok`、`RESULT: 85/85`，**exit 0**，sha `E464E391C99D6EC954BAE71FC0254D64F3290D9E2CF0CDF301A75DE791800AE9` |

> ⇒ 交回执当刻台账**已回绿**（`85/85`）。该表「当场实测」列是**全包共享**的，本窗期间被他席回写 **2** 次；**交回执之后随时可能再次陈化，归他席与收口复核处理**，本窗不再回头补。
> 逐次明细在 `.scratch/t157-close/logs/ledger-sync-dry.log`／`ledger-sync-write.log`／`ledger-resync-2.log`／`ledger-sync-final.log`。

### 1.2 重编 ＋ 重签

| 步 | 命令 | runId | exit | 读数（日志） |
|---|---|---|---|---|
| 重编 | `node node_modules/typescript/bin/tsc -b` | `t157-tsc` | **0** | 先 `-b --dry` 认出「各引用工程均已最新、只有根工程（`noEmit`）要过一遍」；实跑 `exit 0`、无输出（`.scratch/t157-close/logs/tsc-dry.log`／`tsc-build.log`） |
| 重签 | `node packages/skill-calorie/scripts/gen-cli.mjs --stamp` | `t157-gen-stamp` | **0** | `GEN-STAMP ok packages\skill-calorie\dist\.gen-inputs.json：声明源 41 件` |
| 生成件门 | `node packages/skill-calorie/scripts/gen-cli.mjs --check` | `t157-gen-check` | **0** | `GEN-CHECK ok` 四件（`src/cli/registry.ts`／`packages/base-combos/combos.yaml`／`scripts/build-help.mjs`／`src/triggers/routes.generated.ts`）＋ `GEN-CHECK PASS：键 127（写 46 ＋ 读 81）；能力 10 个…未搬迁清单 0 条` |

> `pnpm gen:check` 本窗**未跑**：本机 `pnpm` 会先做依赖状态自检并要求 `pnpm install`，票面禁「包管理器安装／新增命令」；`package.json` 的 `gen:check` 逐字就是上面那条 `node packages/skill-calorie/scripts/gen-cli.mjs --check`，绕开 pnpm 包装层＝同一条判据（v16 同口径）。

### 1.3 换代前的基线三条（**改前基数**，本窗自己量的）

| 面 | 命令 | 读数 |
|---|---|---|
| 旧批产物双前缀 | `node docs/skills/skill-calorie/t550-check-copy-log-scene.mjs --out .scratch/t351-v16/products` | `hitFiles=27 hitOccurrences=27`（37 份里 27 份各 1 处） |
| **仓内旧墙**副本双前缀 | 对墙目录 37 份发布名副本逐个全文数 `calorie.calorie.` | `hitFiles=27 hitOccurrences=27` |
| 仓内旧墙撤销回执页 | 数 `撤销训练计划-回执.html` | 「已写入训练计划」**1**、「已删除训练计划」**0**（`已删除` 命中 1，是同一行里另一处「已删除（硬，不可恢复）」，与本卡片无关） |

---

## 二、全量重跑（本窗）

| 项 | 值 |
|---|---|
| 命令 | `node tooling/run-locked.mjs --ticket 157 --run-id t157-close-run -- node docs/skills/skill-calorie/t351-v7-run-176-207.mjs --out .scratch/t157-close/products` |
| runId | `t157-close-run`（`waitedMs=70085`，即等锁 70s 后开跑） |
| 退出码 | **0** |
| 摘要行 | `RESULT: 66/66（产物 37 ＋ 判据 29）` ＋ `PROBE: PASS（29/29 判据全绿）` |
| 产物 | `D:\ilife\.scratch\t157-close\products` 下 **37 份 HTML**（＋ `detail.json` 逐条读数 ＋ `dbs` 隔离库） |
| 库隔离 | 全部读写落在 `D:\ilife\.scratch\t157-close\products\dbs\`（`SKILLS_DB_PATH`），**未碰生产库** |
| 覆盖面 | 只写 `.scratch/t157-close/products/`；既有批次（`.scratch/t351-fix/final-*`／`.scratch/t550/products*`／`.scratch/t351-v16/products` 等）**一件未覆盖**（`--out` 是必填参数，跑批件自己就挡原地重跑） |
| 日志 | `.scratch/t157-close/logs/batch-176-207.log`（长输出重定向；只读末尾确认退出码，全绿故未检索错误行） |

**29 条判据全绿**（`detail.json` 的 `checks` ＝ 29 条、`ok=true` 29 条）。要点读数（逐字摘自 `checks[].reading`）：

| 判据 | 读数 |
|---|---|
| 份数 | `份数=37 缺=0`（176–185 结果 10 ＋ 186 预检 1 ＋ 187–195 过程 9 ＋ 186–195 回执 10 ＋ 201–207 结果 7） |
| 机检④ 表头声明 | `红=0 兜底other=0`——37 份全部落到 `four`／`own1`／`none`，**没有一份落在兜底 `other`** |
| 机检⑤ 日志钮 | 每份 `data-action-id="ilife-copy-log"` 恰好一颗、无禁用态 |
| 机检⑩ 零 JS（全量 37 份） | `红=0 全量脚本块指纹数=1 指纹=21908:(function () {`；正文无内联事件处理器、无 `javascript:` |
| 机检⑪ 用词（176–185 十份） | `判份数=10 红=0`——正文不出现「会话」／`main`／`iso`／`calorie.`（`data-t` 载荷不算正文） |
| 机检⑰ 用词（全量 37 份） | `判份数=37 红=0` |
| 过程页 prompt | `红=0`；复制数据标题 `【calorie · 构建向导】／【calorie · 写前预览】` |
| 结果／回执页不夹 prompt 段 | `泄漏=0` |
| 195 撤销后读 | `exit=4 stderr命中=true`（恢复缺失阻断） |
| 195 回执文案 | 「写后现值＝计划已撤销（配置与训练安排均为空）」命中 |
| 外部五条 | `条数=5` 如实记 `non-exec`（无产物） |

「机检读数」列的读法（下表逐格照此）：`①`＝`<!doctype html>`；`②`＝真 `id="ilife-copy-data"`／`id="ilife-copy-log"` 各恰好一次；`③`＝正文禁词；`④`＝表头按**逐份预先声明**对照（`four`／`own1`／`none`，落兜底 `other` 即红）；`⑤`＝日志钮一颗且无禁用态。**全表 37 份 ①②③⑤ 逐份合格**，故下面只写有差别的那一项。

---

## 三、表一 · 27 条可执行唤醒词（37 份产物，逐条实跑）

| # | order | 唤醒词 | 命令（真出口 `dist/cli/cmd_read.js`，key ＋ 参数） | exit | 产物（绝对路径；括号里是发布名副本） | 机检读数 |
|---|---|---|---|---|---|---|
| 1 | 176 | 看本周计划 | `calorie.view.plan` `{"weekOffset":0,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-close\products\order176-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看本周计划.html`） | ④`four`→四列逐字按序（行 2） |
| 2 | 177 | 看下周计划 | `calorie.view.plan` `{"weekOffset":1,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-close\products\order177-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看下周计划.html`） | ④`four`→四列逐字按序（行 2） |
| 3 | 178 | 看上周计划 | `calorie.view.plan` `{"weekOffset":-1,"today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-close\products\order178-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看上周计划.html`） | ④`none`→本页无表（符合声明） |
| 4 | 179 | 看指定周计划 | `calorie.view.plan` `{"week":1}` | 0 | `D:\ilife\.scratch\t157-close\products\order179-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看指定周计划.html`） | ④`four`→四列逐字按序（行 2） |
| 5 | 180 | 看今天练什么 | `calorie.view.plan` `{"date":"今日","today":"2026-09-07"}` | 0 | `D:\ilife\.scratch\t157-close\products\order180-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看今天练什么.html`） | ④`four`→四列逐字按序（行 2） |
| 6 | 181 | 看某动作安排 | `calorie.view.plan` `{"movement":"硬拉"}` | 0 | `D:\ilife\.scratch\t157-close\products\order181-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看某动作安排.html`） | ④`four`→四列逐字按序（行 2） |
| 7 | 182 | 看某天练什么 | `calorie.view.plan` `{"date":"2026-09-09"}` | 0 | `D:\ilife\.scratch\t157-close\products\order182-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看某天练什么.html`） | ④`four`→四列逐字按序（行 1） |
| 8 | 183 | 看计划概览 | `calorie.view.plan` `{}` | 0 | `D:\ilife\.scratch\t157-close\products\order183-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划概览.html`） | ④`four`→四列逐字按序（行 2） |
| 9 | 184 | 看完整计划 | `calorie.view.plan` `{}` | 0 | `D:\ilife\.scratch\t157-close\products\order184-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看完整计划.html`） | ④`four`→四列逐字按序（行 2） |
| 10 | 185 | 看计划 vs 实际 | `calorie.view.plan-vs-actual` `{"window":"custom","start":"2026-09-07","end":"2026-09-09"}` | 0 | `D:\ilife\.scratch\t157-close\products\order185-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划 vs 实际.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 11 | 186 | 定训练计划（预检） | `calorie.view.plan-wizard` `{"plan":{"config":{"title":"减脂4周","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑","part":"胸","type":"力量","sets":[]}]}]}]}]}}` | 0 | `D:\ilife\.scratch\t157-close\products\order186-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-预检.html`） | ④`none`→本页无表（符合声明） |
| 12 | 187 | 复制训练计划（预检） | `calorie.view.plan-write-preview` `{"op":"copy"}` | 0 | `D:\ilife\.scratch\t157-close\products\order187-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\复制训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 13 | 188 | 定休息日（预检） | `calorie.view.plan-write-preview` `{"op":"set-rest","week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-close\products\order188-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定休息日-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 14 | 189 | 加训练动作（预检） | `calorie.view.plan-write-preview` `{"op":"add-movement","week":1,"dayOfWeek":1,"movement":{"name":"硬拉"}}` | 0 | `D:\ilife\.scratch\t157-close\products\order189-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\加训练动作-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 15 | 190 | 定一周计划（预检） | `calorie.view.plan-write-preview` `{"op":"set-week","week":1}` | 0 | `D:\ilife\.scratch\t157-close\products\order190-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定一周计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 16 | 191 | 改训练计划（预检） | `calorie.view.plan-write-preview` `{"op":"update","title":"示例改名"}` | 0 | `D:\ilife\.scratch\t157-close\products\order191-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 17 | 192 | 改某天训练（预检） | `calorie.view.plan-write-preview` `{"op":"update-day","week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}` | 0 | `D:\ilife\.scratch\t157-close\products\order192-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改某天训练-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 18 | 193 | 删某天训练（预检） | `calorie.view.plan-write-preview` `{"op":"delete-day","week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-close\products\order193-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\删某天训练-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 19 | 194 | 改动作（预检） | `calorie.view.plan-write-preview` `{"op":"update-movement","oldMovement":"硬拉","newMovement":{"name":"杠铃划船"}}` | 0 | `D:\ilife\.scratch\t157-close\products\order194-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改动作-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 20 | 195 | 撤销训练计划（预检） | `calorie.view.plan-write-preview` `{"op":"delete"}` | 0 | `D:\ilife\.scratch\t157-close\products\order195-process.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\撤销训练计划-预检.html`） | ④`own1`→自有表（按序 4 列，无「组数×次数」） |
| 21 | 186 | 定训练计划（写后回执） | `calorie.workout.plan-set` `{"plan":{"config":{"title":"示例计划","start_date":"2026-09-07","user_level":"中手","available_equipment":["瑜伽垫"]},"weeks":[{"week_number":1,"days":[{"day_of_week":1,"sessions":[{"session_label":"上肢","movements":[{"name":"俯卧撑"}]}]}]}]}}` | 0 | `D:\ilife\.scratch\t157-close\products\order186-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 22 | 187 | 复制训练计划（写后回执） | `calorie.workout.plan-copy` `{"newTitle":"示例副本"}` | 0 | `D:\ilife\.scratch\t157-close\products\order187-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\复制训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 23 | 188 | 定休息日（写后回执） | `calorie.workout.plan-set-rest` `{"week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-close\products\order188-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定休息日-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 24 | 189 | 加训练动作（写后回执） | `calorie.workout.plan-add-movement` `{"week":1,"dayOfWeek":1,"movement":{"name":"深蹲"}}` | 0 | `D:\ilife\.scratch\t157-close\products\order189-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\加训练动作-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 25 | 190 | 定一周计划（写后回执） | `calorie.workout.plan-set-week` `{"week":2,"days":[{"dayOfWeek":2,"sessionLabel":"背","movements":[{"name":"硬拉"}]}]}` | 0 | `D:\ilife\.scratch\t157-close\products\order190-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\定一周计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 26 | 191 | 改训练计划（写后回执） | `calorie.workout.plan-update` `{"title":"示例改名"}` | 0 | `D:\ilife\.scratch\t157-close\products\order191-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 27 | 192 | 改某天训练（写后回执） | `calorie.workout.plan-update-day` `{"week":1,"dayOfWeek":3,"newLabel":"下肢＋核心"}` | 0 | `D:\ilife\.scratch\t157-close\products\order192-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改某天训练-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 28 | 193 | 删某天训练（写后回执） | `calorie.workout.plan-delete-day` `{"week":1,"dayOfWeek":3}` | 0 | `D:\ilife\.scratch\t157-close\products\order193-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\删某天训练-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 29 | 194 | 改动作（写后回执） | `calorie.workout.plan-update-movement` `{"oldMovement":"俯卧撑","newMovement":{"name":"钻石俯卧撑"}}` | 0 | `D:\ilife\.scratch\t157-close\products\order194-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\改动作-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」） |
| 30 | 195 | 撤销训练计划（写后回执） | `calorie.workout.plan-delete` `{"confirm":true}` | 0 | `D:\ilife\.scratch\t157-close\products\order195-receipt.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\撤销训练计划-回执.html`） | ④`own1`→自有表（按序 2 列，无「组数×次数」）；另判「已删除训练计划」命中 **1**、「已写入训练计划」命中 **0**（#435 换代） |
| 31 | 201 | 计划复盘（本周） | `calorie.view.exercise-review` `{"window":"本周"}` | 0 | `D:\ilife\.scratch\t157-close\products\order201-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（本周）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」） |
| 32 | 202 | 计划复盘（本月） | `calorie.view.exercise-review` `{"window":"本月"}` | 0 | `D:\ilife\.scratch\t157-close\products\order202-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（本月）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」） |
| 33 | 203 | 计划复盘（全部） | `calorie.view.exercise-review` `{"window":"custom","start":"2026-09-07","end":"2026-09-20"}` | 0 | `D:\ilife\.scratch\t157-close\products\order203-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\计划复盘（全部）.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」） |
| 34 | 204 | 看计划完成率 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-close\products\order204-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看计划完成率.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」） |
| 35 | 205 | 看未完成训练 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-close\products\order205-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看未完成训练.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」） |
| 36 | 206 | 看动作完成率 | `calorie.view.exercise-review` `{"window":"7d"}` | 0 | `D:\ilife\.scratch\t157-close\products\order206-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\看动作完成率.html`） | ④`own1`→自有表（按序 6 列，无「组数×次数」） |
| 37 | 207 | 扫禁忌 | `calorie.view.contraindication` `{}` | 0 | `D:\ilife\.scratch\t157-close\products\order207-result.html`（发布名副本 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\扫禁忌.html`） | ④`own1`→自有表（按序 5 列，无「组数×次数」） |

**口径两条（读表须知）**：

- 表中「唤醒词」列的 186–195 出现两次不是重复：同一条词有两份产物——**预检页**（写前预览／构建向导）与**写后回执页**（各自独占一个隔离库 `dbs/receipt-<order>`，免互相污染）。发布名照 `-预检`／`-回执` 后缀，与 `scene06-验收墙` 的既有样子一致。
- 195 另有一条**撤销后读验证**（`calorie.view.plan` 再读一次，本窗读数 `exit=4` ＋ stderr 命中「无训练计划」）：**它不是页面**，故不在这 37 份里（这也是清单 `notShipped` 的一条）。

---

## 四、表二 · 外部五条（order 196–200）：唤醒词命中 ＋ HELP 文案

**定性**：`packages/skill-calorie/src/workout/routes.ts` 把这五条记为 `kind:'non-exec'`、`bucket:'out-of-scope'`。按本图 **Out of scope**，本票**不承接、不造产物**——下表给的是「词命中 ＋ 文案在」的读数，不是产物。

**唤醒词命中读数**（在**编译产物**里数，不只数源码；本窗重新量的数）：

| 件 | 五条词命中合计（逐词） |
|---|---|
| `packages/skill-calorie/dist/triggers/routes.generated.js` | **6**（落地训练 2 ＋ 落地到本周末 1 ＋ 落地到本月底 1 ＋ 同步到训记 1 ＋ 拉训记实绩 1） |
| `packages/skill-calorie/dist/triggers/scene-05-workout.js` | **32**（9／7／7／4／5） |
| `packages/skill-calorie/dist/triggers/wake-assets.js` | **16**（4／3／3／3／3） |

⇒ 五条词在**路由表、场景词表、HELP 资产**三处都命中，**5/5**。

**HELP 文案读数**（文案唯一出处 ＝ 场景词表 `src/triggers/scene-05-workout.ts` 各条的 `prompt_template`）：

| order | 唤醒词 | 类型（老实物口径） | 命中（routes.generated.js／scene-05-workout.js／wake-assets.js） | 判据 |
|---|---|---|---|---|
| 196 | 落地训练 | non-exec | 见下「命中读数」 | 记 `non-exec`，无产物 |
| 197 | 落地到本周末 | non-exec | 见下「命中读数」 | 记 `non-exec`，无产物 |
| 198 | 落地到本月底 | non-exec | 见下「命中读数」 | 记 `non-exec`，无产物 |
| 199 | 同步到训记 | non-exec | 见下「命中读数」 | 记 `non-exec`，无产物 |
| 200 | 拉训记实绩 | non-exec | 见下「命中读数」 | 记 `non-exec`，无产物 |

| order | 唤醒词 | HELP 文案首句（逐字，取 `prompt_template`） |
|---|---|---|
| 196 | 落地训练 | 「我想把某天的训练计划真正落地执行:补计划到日历、记心愿、推送到训记、拉取训记实绩 4 步全流程,逐动作确认实际做的重量和组数。给我看 4 步进度和每步结果(已补计划/已记心愿/已推送/已回写),以及完成度。」 |
| 197 | 落地到本周末 | 「我想把从今天到周日所有训练日一次落地执行(补计划/记心愿/推训记/回写),如果今天已是周日就只落地今天。请给我看跨天列表、每一步的汇总(已补计划/已记心愿/已推送/已回写)和总完成度。」 |
| 198 | 落地到本月底 | 「我想把从今天到本月底所有训练日一次落地执行(补计划/记心愿/推训记/回写),如果今天已是月底就只落地今天。请给我看跨天列表、每一步的汇总(已补计划/已记心愿/已推送/已回写)和总完成度。」 |
| 199 | 同步到训记 | 「我想把某天的训练计划推送到训记 App(落地流程里的训记推送这一步单独做)。推送前先检查计划里的动作名训记能否识别,有识别不了的先告诉我。」 |
| 200 | 拉训记实绩 | 「我想把训记 App 里的实际训练数据拉回来,写进卡路里的运动记录(落地流程里的回写这一步单独做)。如有冲突请提示我处理。」 |

⇒ **5/5 记 `non-exec`、无产物**，页面入口在「健身计划」HELP 卡片下。**本票不为这五条出任何 HTML**——它们是产物册子 `manifest.json` 里 `notShipped` 的头一条。

---

## 五、墙的机器读数（票面四段验收命令）

### ① 正例

命令（在 `D:\ilife\docs\skills\skill-calorie\scene05-验收墙\` 内跑）：`node gen-wall.mjs --check .`
runId `t157-wall-check` · **exit 0** · 摘要行：

```text
37 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 0 -> 可发
```

### ② 反例（必跑）

命令：先 `node .scratch/t157-close/mutate-manifest.mjs backup manifest.json .scratch/t157-close/manifest.bak.json`，再 `… break manifest.json 1`（把清单第 1 行的 `file` 改成 `看本周计划-反例-盘上没有.html`），再跑 `node gen-wall.mjs --check .`
runId `t157-wall-check-red` · **exit 1** · 读数：

```text
36 格；链接 189 条（手机墙-390.html 75 ＋ 桌面墙-1280.html 75 ＋ 总索引.html 39）；缺失 1 -> 不可发
  清单点名却没有文件：1 看本周计划 -> 看本周计划-反例-盘上没有.html
不可发（产物目录 D:\ilife\docs\skills\skill-calorie\scene05-验收墙）
```

### ③ 改回

命令：`node … mutate-manifest.mjs restore manifest.json .scratch/t157-close/manifest.bak.json` 后再跑 `node gen-wall.mjs --check .`
runId `t157-wall-check-restore` · **exit 0** · 读数回 `缺失 0 -> 可发`。

**改回的完整性凭据**：该次运行里 `manifest.json` 的 SHA256 改前改后**逐字一致** ＝ `086E69755733BDD3D1150B442C945EF6C076D0AEFDA7CDB0913E826700371E78`（**历史读数**：那是**本次重出之前**的清单，见件头「本次重出」段；当刻 sha256 ＝ `2C33EDB3C450599E7FB0A1BA60F6AD13631010599720037514BCFE2E175EDDA1`）。

### ④ `dropped` ＋ `dead` 两条腿一起判（反假绿灯）

口径出处：仓规 `docs/agents/视觉验收墙.md` §6.2／§7——「清单点名却没有文件」（`dropped`）与「页上引用却落不到」（`dead`）**必须一起判**；只查后者＝缺件被静默剔掉、自检照样报「缺失 0」的假绿灯。`--check` 模式读盘上已出的墙页，所以把清单某行改坏时只有 `dropped` 那条腿响（上文 ② 的 `缺失 1`）——两条腿都在生成器里，见 `gen-wall.mjs` 的 `selfCheck()`。

---

## 六、换代后的三条关键读数（本窗存在的理由）

### 6.1 `calorie.calorie.` 双前缀：**改前 27 → 改后 0**

| 面 | 命令 | 读数 |
|---|---|---|
| 新批 37 份产物 | `node docs/skills/skill-calorie/t550-check-copy-log-scene.mjs --out .scratch/t157-close/products` | `products=37 hitFiles=0 hitOccurrences=0` · **PASS** · exit 0 |
| 墙目录 37 份发布名副本 | 逐个全文数 | `hitFiles=0 hitOccurrences=0` |
| 对照（改前基数） | 见 §1.3 | 旧批 **27／27**，仓内旧墙 **27／27** |

### 6.2 撤销回执页（`#435` 的换代证据）

| 面 | 「已写入训练计划」 | 「已删除训练计划」 | 「已删除」（含前者的子串） | 「计划已撤销」 |
|---|---|---|---|---|
| 仓内旧墙 `撤销训练计划-回执.html`（改前） | **1** | 0 | 1 | 1 |
| 新批 `order195-receipt.html` | **0** | **1** | 2 | 1 |
| 墙内 `撤销训练计划-回执.html`（换代后） | **0** | **1** | 2 | 1 |

### 6.3 墙目录结构读数（不是视觉判断）

| 项 | 读数 |
|---|---|
| 墙目录件数 | **43** ＝ 37 份产物发布名副本 ＋ `手机墙-390.html` ＋ `桌面墙-1280.html` ＋ `总索引.html` ＋ `manifest.json` ＋ `gen-wall.mjs` ＋ `逐格缺陷清单.md` |
| 发布名副本 ≡ 原批 | 逐件 sha256 比对 **不等数 0／37**（`copyFileSync` 逐字节同） |
| 首字符 | 三关键件与任一产物均 `<!doctype html>` |
| BOM | 五件全 **无 BOM**（首 3 字节不是 `EF BB BF`） |
| `手机墙-390.html` | 20,637 B；`<iframe ` **37** 个；`loading="lazy"` **0** 处；1:1 无缩放 |
| `桌面墙-1280.html` | 25,296 B；`<iframe ` **37** 个；`loading="lazy"` **0** 处；`SCALE=min(0.5,600/1280)=0.469`（缩的是显示不是视口） |
| `总索引.html` | **27,268 B**（sha256 `A267DE67D303C292E929B1F3468F733EC8FCC42AA30C1E2F1BD8047FB3E1F58F`）——**重出前是 26,103 B**，见件头「本次重出」段；`iframe` 0 个（索引不发 iframe，39 条链接指向 37 份产物 ＋ 两张墙） |
| 格数对账 | 墙格数 37 ＝ 索引卡片数 37 ＝ 清单 `rows` 条数 37 ＝ 原批产物 `.html` 份数 37 |

---

## 七、变异自证（`sceneEnvelope.ts` 的剥离那步改回去 → 命中回弹 → 逐字节还原 → 回 0）

| 步 | 命令 | runId | 读数 |
|---|---|---|---|
| 留底 | `node .scratch/t157-close/tree-hash.mjs packages/skill-calorie/src` ＋ `mutate-scene-envelope.mjs backup` | `t157-mut-baseline` | 源码树 `files=314 digest=25E6BFE62946C105EAD9119C74EEDD2D257B30DCC30607530CEEEFA51845B778`；`sceneEnvelope.ts` sha256 `A4C66F497A297105C6EED5C8C1BFB9D05FEFE6A806F1C25D934C17DC1830F863` |
| 变异 | `node .scratch/t157-close/mutate-scene-envelope.mjs break packages/skill-calorie/src/shared/sceneEnvelope.ts` | `t157-mut-break` | `return { ...envelope, key: key.slice(prefix.length) };` → `return envelope;`（函数成恒等）；该件 sha256 `FFA63AB2589D1C7ADDFDF1BD4EA176CECF3222A49C79694C4337396F98129D8E` |
| 重编 | `node node_modules/typescript/bin/tsc -b` | `t157-tsc-mut` | **exit 0**；`dist/shared/sceneEnvelope.js` 三处 `return envelope;`（确认变异已进 dist） |
| 重跑 | `node tooling/run-locked.mjs --ticket 157 --run-id t157-close-mut-run -- node … --out .scratch/t157-close/mut` | `t157-close-mut-run` | **exit 0**、`RESULT: 66/66`、`PROBE: PASS`（**跑批件自身 29 条判据照样全绿**——正是双前缀原先的盲区） |
| **变异红** | `node docs/skills/skill-calorie/t550-check-copy-log-scene.mjs --out .scratch/t157-close/mut --expect any` | — | `CALORIE-DOUBLE-PREFIX products=37 **hitFiles=27 hitOccurrences=27**`（**命中回弹到改前基数**）；落点逐条同旧批：`data-t="场景标识 calorie.calorie.view.plan（list）…` |
| 变异批逐件 | `node .scratch/t157-close/cmp-products.mjs .scratch/t157-close/products .scratch/t157-close/mut` | — | `CMP 文件=37 原始sha相等=0 归一化后sha相等=10`，**27 份不等** · **exit 1** |
| 还原 | `node .scratch/t157-close/mutate-scene-envelope.mjs restore packages/skill-calorie/src/shared/sceneEnvelope.ts .scratch/t157-close/baseline-sceneEnvelope.ts` | `t157-mut-restore` | `RESTORE sha256 备份=A4C66F49…1830F863 盘上=A4C66F49…1830F863 **IDENTICAL=true**`（逐字节回写，**不是**整目录还原、**没有** `git checkout -- .`） |
| 源码树比对 | `node .scratch/t157-close/tree-hash.mjs packages/skill-calorie/src` | — | 还原后 `files=314 digest=25E6BFE6…45B778` **≡ 基线**（`SRC-TREE IDENTICAL=True`） |
| 复跑 | `… --run-id t157-close-restore-run -- node … --out .scratch/t157-close/products-restore` | `t157-close-restore-run` | **exit 0**、`RESULT: 66/66` |
| **还原一致** | 复跑批数双前缀 ＋ 逐件比对基线批 | — | `products=37 hitFiles=0 hitOccurrences=0`（**回 0**）；`cmp-products` → `归一化后sha相等=**37**` · **PASS** · exit 0 |

> **比对口径（这条要读清）**：产物页脚写着**本次渲染时刻**（形如 `2026-09-15 21:19:17 · 版本 0.1.0`），所以任意两次跑批的**原始** sha256 必然不同（本窗实测：两批 37 份原始 sha 相等数＝0，差异**恰好只有那一行**，样例 `order176-result.html` 79057 B／2525 行、只有第 1945 行不同）。`cmp-products.mjs` 因此**只把 `YYYY-MM-DD HH:MM:SS` 这一处换成占位符 `<TS>`**，其余字节一律不放宽（不做 trim、不做换行归一、不忽略任何其它行）。在这一口径下：**变异批 27 份不等（红）／还原批 37 份全等（绿）**。

---

## 八、回归

| 项 | 值 |
|---|---|
| 命令 | `node tooling/run-locked.mjs --ticket 157 --run-id t157-close-regress -- node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs test/scene05-write-status-435.test.mjs` |
| runId | `t157-close-regress`（`waitedMs=1`） |
| 退出码 | **0** |
| 摘要行 | `ℹ tests 4` ／ `ℹ pass 4` ／ `ℹ fail 0` ／ `ℹ cancelled 0` ／ `ℹ skipped 0` ／ `ℹ todo 0` |
| 四个用例名 | `✔` ×4，含 `#435 撤销类回执页「状态」卡副行与同页口径一致，其余 9 条取值照旧`（3351ms） |
| 日志 | `.scratch/t157-close/logs/regress-scene05.log` |

---

## 九、未做项（如实交代）

1. **「人用真实浏览器滚一遍两张墙、逐格记缺陷」本席未做、也不代做**：那是仓规 §4 的负责人动作。`逐格缺陷清单.md` 只给骨架——前三列机器照清单抄，**「症状」「要不要改」两列留空待负责人看图后逐格填**（本窗重出为骨架：该两列**至今无人填过**，故重出无损）。
2. **滚动截图／像素比对未做**：本票不做视觉判断；墙页只保证「真渲染、点得开、引用都落得到」（§五、§六 的读数）。
3. **`pnpm gen:check` 没跑成**（跑了另一条等价命令，见 §1.2）；按票面禁「包管理器安装／新增命令」，未按 pnpm 的提示设 `CI=true` 放行它去动 `node_modules`。
4. **台账是共享件**：本窗期间被外部回写 2 次（§1.1），末次 `--sync` 已回绿；**交回执之后可能再次陈化，归他席与收口复核处理**。
5. **`逐格缺陷清单.md` 的「该确认什么」列本轮改为照 `manifest.json` 的 `check` 字段逐字抄**（前一版是手写节本）；改前的旧骨架逐字留底在 `.scratch/t157-close/逐格缺陷清单.改前骨架.bak.md`。
