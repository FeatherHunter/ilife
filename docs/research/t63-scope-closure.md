# #63 地图收口口径评估（未拆票项 × 影响 × 处置）

- 席位：**#63 地图收口口径评估席**（只读研究／分析；不改代码、不建票、不关票、不改地图）
- 结论口径：**「50/50 子票关闭」≠ Destination 达成**。本报告逐项复算地图 `## Not yet specified` 全部 8 条 ＋ `## Notes` 的「四类边缘能力」，给出**可复算**的影响评估与单一可拍板的收口口径。
- 复算基线：`git HEAD = 5fffe1e`（`fix(83): 返修 R-1 …`）；子票 **50／closed 47／open 3**（#79／#83／#89）。

---

## 1 结论先行（四句话）

1. **四类边缘能力不阻断目标**，但地图原句「**在范围内**」与三份既有裁定（`docs/calorie-architecture.md:90` Out of Scope／`docs/calorie-parity-39.md:21` 非缺口／`docs/research/t71-old-baseline-inventory.md:737-744` §7.2 明确不做）**字面矛盾**——这是本次发现的最重要冲突，必须由收口口径一句话消解。
2. **真正阻断 Destination ①的是一条口径缺口**：Destination 字面要求「旧版全部唤醒词在新版同样命中**并产出对应 HTML**」，而现网 436 条里 **341 条可执行／95 条命中但不执行**（`test/calorie-routing-81.test.mjs:95-105`）——**95 条不产出 HTML**。不给例外条款，Destination ①按字面**永不可达成**。
3. **一条产品侧 parity 缺口**：写路径 `difficulty` 无值域校验（老家 `choices` 会拒、新版会落库）——`docs/research/t68-parity-gaps.md:142` 判「**补**」，至今未补（§3-P1-2）。
4. **一条证据面缺口**：`docs/research/t81-route-evidence.mjs` 硬编码 #81 时代常量（77 键／34 新拟），与 #111–#113／#86 后的现状（99 键／56 新拟）冲突 → **该脚本必红**（静态可证，见 §4）。它**不是主线①的回归**。

---

## 2 证据来源声明（只读；逐条可复算）

| # | 命令／工具 | 结果 | 用途 |
|---|---|---|---|
| 1 | `gh issue view 63` | exit 0 | 地图原文（`Not yet specified`／`Out of scope`／`Notes`） |
| 2 | `gh api repos/FeatherHunter/ilife/issues/63/sub_issues --paginate --jq '.[] \| [.number,.state,.title] \| @tsv'` | exit 0 | 子票 **50／closed 47／open 3**（#79／#83／#89） |
| 3 | `git log --oneline -3`／`git status --short` | exit 0 | 基线 `5fffe1e`；工作区另有他席未提交改动（`.gitignore` 等），**本席未触碰** |
| 4 | read／grep 工具（`docs/calorie-parity-39.md`、`docs/research/t67-key-audit.md`、`docs/research/t68-parity-gaps.md`、`docs/calorie-architecture.md`、`docs/research/t71-old-baseline-inventory.md`、`test/calorie-routing-81.test.mjs`、`packages/skill-calorie/src/**`） | exit 0 | 全部「现状事实」列的出处 |
| 5 | `git grep`／`Get-ChildItem`／`Get-Content` | exit 0 | 残留目录、包名、noChange、值域接线等实测 |

**声明**：本席**未执行任何** `pnpm build`／`node --test`／`node docs/research/*.mjs` 等 build/test／长跑脚本（0 次）；本报告全部数字来自**文件读取**与 `gh` 查询，未据此修改任何文件（唯一新增物＝本文件）。另：`docs/research/*gate-runs*.log` 中 `ticket=63` 命中 **0**（复算：`Get-ChildItem docs/research/*gate-runs*.log | Select-String 'ticket=63'` → 无输出）；若他处看到 ticket=63 下的运行记录，其来源不在本席。

> 关于编排者提到的 `t81-route-evidence.mjs` exit=1：本席**未运行**该脚本；下方 §4 的归因是**静态判定**（对脚本常量与现行活门断言逐条比对），并已给出复算命令。

---

## 3 逐项影响评估表

图例：**处置** = 出 scope／另开票／本图做／登记；**依据强度** = 强（文件行直证）／中（有出处但需再复算）／弱（推断）。

### 3.1 ① 四类边缘能力（定时复盘 cron／飞书发送归档／训记同步／mmx vision）

| 项 | 地图原文（引行） | 现状事实（文件:行 或命令） | 用户可见影响 | 是否已有票覆盖 | 与既有裁定是否冲突 | 建议处置 | 依据强度 |
|---|---|---|---|---|---|---|---|
| ①-1 定时复盘 cron | 「旧版四类边缘能力（定时复盘 cron／飞书发送归档／训记同步／mmx vision）：**在范围内**但排最后处理，处置逐个拍」 | 3 词 `关闭/开启/查定时复盘` 落 `out-of-scope` 桶：`routing.ts:579,582,590`；理由码 `oosCron`＝「明确不做（架构规格 :60：定时复盘）；词只保证命中与文案，执行层不承接」`routing.ts:113`；差异表 O1 `routing.ts:712-718` 判「同项」 | **无**（词命中＋HELP 可查；旧版执行层是 `cron_setup.html`／`render_cron_setup.py` 的 python 链，非新架构唯一出口） | 无（#81 已入桶登记） | **冲突**：地图「在范围内」vs `calorie-architecture.md:90`「Out of Scope」＋`calorie-parity-39.md:21`「非缺口…out of scope（#14 范围）」＋`t71:741` | **出 scope**（本图拍「作废·执行层不承接」） | 强 |
| ①-2 飞书发送归档 | 同上 | **无独立唤醒词**：`T71_DIFFS.O2` `routing.ts:719-725` note＝「436 条无独立唤醒词（飞书只出现在 `scene-10-analysis.ts:161` 的 desc 与 `scene-09-photo.ts:5,6` 的渠道文案）→ 无词可入桶，登记为「无词项」」 | **无** | 无 | 同上（冲突点同上） | **出 scope**（登记为「无词项」） | 强 |
| ①-3 训记同步 | 同上 | 2 词 `同步到训记`／`拉训记实绩` `routing.ts:356-357`；理由码 `oosXunji`＝「明确不做（规格 :60：训记）…（t71 O3 同项）」`routing.ts:114`；O3 `routing.ts:726-732` | **无** | 无 | 冲突同上；**另与地图 Notes D2 自洽**（「键只许追加、**训记不移植**」） | **出 scope**（与 D2 一致） | 强 |
| ①-4 mmx vision 拍营养表 | 同上 | 2 词 `拍营养表记一餐`／`拍营养表补记一餐` `routing.ts:166-167`；O4 `routing.ts:733-739` 判「同项」 | **无** | 无 | 冲突同上 | **出 scope** | 强 |

**口径计数（可复算）**：`out-of-scope` 桶 **10 条**＝cron 3 ＋ 训记 2 ＋ mmx 2 ＋ **落地 3**（`routing.ts:353-355`，属 M8 非四类）＋ 飞书 **0 条**；活门断言 `routingSummary()` = `{total:436, exec:341, nonExec:95, outOfScope:10, legacyChain:85, newEntries:56, repairEntries:1, coveredKeys:99}`（`test/calorie-routing-81.test.mjs:96-105`）。

### 3.2 ② 本体质量剩余项（G6／G9–G11／G13／G14）

| 项 | 地图原文（引行） | 现状事实（文件:行 或命令） | 用户可见影响 | 是否已有票覆盖 | 与既有裁定是否冲突 | 建议处置 | 依据强度 |
|---|---|---|---|---|---|---|---|
| ②-1 G6 错误码误分类 | 「本体质量剩余项（G6 错误码误分类、G9–G11 参数矩阵与边界、G13 探针目录卫生、G14 `noChange` 口径）**尚未拆票**」 | 现网口径**已冻结并写明**：`write.ts:8-10`「退出码沿 T11 冻结：缺参/坏参 `fail(2)`；未知键上游拦（exit 3）；缺失阻断 `fail(4)`；envelope/落盘 `fail(5)`。**库函数 FetchError 透传（main 映射 exit 4）**；`body.ts` ValidationError 在此转 bad-input（exit 2）」；未知围度项走 FetchError：`fetch/body.ts:134`；`profile.activity` 非法值经 `normalizeActivityLevel` 归一落库（`fetch/profile.ts:78`、`:107`），缺参才 `fail(2)`（`write.ts:789-790`）。原实证 exit 4 与测试钉死见 `t67-key-audit.md:216-220`（`cmd-write-40.test.mjs:234` 钉住该 4） | **有**（调用方无法区分「参数错」与「没数据」，重试策略会错——`t67:219`） | 无 | **不冲突**；改则**破 T11 冻结退出码**（`write.ts:8`）＋须改 `cmd-write-40.test.mjs:234` | **登记**（记为「已知口径·有意不改」）；若维护者要改 → **另开票**（含测试同步） | 强 |
| ②-2 G9–G11 参数矩阵与边界 | 同上 | 原判据 `t67-key-audit.md:232-242`（18 读键参数分支零覆盖／39 键无非法参数单测／极端值只测下界）。**已补部分**：#103 落地 G2–G4（缺省窗／23 kind／window 白名单）`packages/skill-calorie/test/g2g4-103.test.mjs:40-85`。**G9–G11 仍无专项**：`packages/skill-calorie/test/` 实测 35 个 `.mjs`，无参数矩阵类文件（`Get-ChildItem packages/skill-calorie/test -Filter *.mjs`） | **无**（属回归保护强度，不改变当前可见行为） | 无 | **不冲突**（#103 只做 G2–G4，未声明覆盖 G9–G11） | **登记**（测试强度债）；若要补 → 最小范围＝每读键 ≥1 正 ≥1 负 ＋ 上界 1 例 | 中（「零覆盖」是 t67 一次性 sim 结论，未在最终树复算） |
| ②-3 G13 探针目录卫生 | 同上 | 建议原文 `t67-key-audit.md:249-252`（photo 类探针必须独立目录）；**实践已遵守**：`cmd-write-40-persist.test.mjs:609` 每例 `mkdtempSync(...'w40p-dd-photos-')`；`cmd-read-t11.test.mjs:171`／`cmd-write-40.test.mjs:193`／`m5-receipt-97.test.mjs:55` 各自独立 `photosDir`。**规范未落文档**（全仓「独立目录」仅 1 命中，即 t67 该行） | **无** | 无 | 不冲突 | **登记**（文档债：把规范写进测试规范） | 中 |
| ②-4 G14 `noChange` 口径 | 同上 | `write.ts` 现 11 处 `noChange`（`:214,336,363,390,404,464,548,561,785,793,819`）；**`weight.batch` 已补**（`:548 noChange: r.wrote === 0`）；**`goal.pause`／`goal.resume` 仍无**（`write.ts:833-838`／`:839-844`，回执只给 `recordId/ids/idSource/writtenFields`）——正是 `t67-key-audit.md:255` 举的两例之一 | **有**（未暂停时 `goal.resume` 仍回「已重启所有目标（恢复正常）」，库无变化 → 调用方／用户误判已生效） | 无 | 不冲突 | **本图做**（最小范围：两处按 `daily_goal.goal_paused` 前后值比较补 `noChange`）或**另开小票** | 强 |

### 3.3 ③ P1 残项与文档债

| 项 | 地图原文（引行） | 现状事实（文件:行 或命令） | 用户可见影响 | 是否已有票覆盖 | 与既有裁定是否冲突 | 建议处置 | 依据强度 |
|---|---|---|---|---|---|---|---|
| ③-1 写路径值域校验 | 「P1 残项与文档债尚未拆票：写路径值域校验、迁移审计计数、parity 报告出处行号订正、`cmd-read-t11.test.mjs:185` 弱断言收紧」 | **仍未接线**：`write.ts:284` `difficulty: strOrUndef('difficulty') ?? null` 无值域校验；值域 `EXERCISE_DIFFICULTIES = ['easy','normal','hard']` 定义于 `src/kcal.ts:32`、导出 `src/index.ts:6`，`write.ts` **零引用**。裁定见 `t68-parity-gaps.md:142`：「**补**（老家会拒，新版会落库，属口径放宽）」 | **有**（可写入 `'极限'`／任意串 → 数据脏；老家 `choices` 会拒——`t68:83`） | 无 | **不冲突**；与 #39 parity「唯一字段差异 intensity」直接相关 | **本图做**（最小范围：`write.ts` 加值域校验 ＋ 1 条负例测试）**或**口径上明确「有意放宽」并登记 | 强 |
| ③-2 迁移审计计数 | 同上 | **仍无计数**：`migrate/migrate.ts:320-326` 只映射（`intensityToDifficulty(r.intensity)`）不计数；全文件无「丢弃/回填 N 行」回执（`git grep -n "审计\|audit\|discarded" migrate.ts` → 0）。裁定 `t68-parity-gaps.md:143`：「**补**（一行审计计数即可）」 | **无**（可观测性） | 无 | 不冲突 | **登记**（或本图做，成本≈1 行） | 强 |
| ③-3 parity 报告出处行号订正 | 同上 | **仍未订正**：`docs/calorie-parity-39.md:14` 仍引 `db.py:258-268`；`t68-parity-gaps.md:144` 实测该行号在老家中现为 food_log 钠糖纤维迁移，正确出处为 `db.py:396-406` | **无** | 无 | 不冲突 | **登记**（注意「历史只追加不改写」→ **追加订正行**，不改原行） | 强 |
| ③-4 「P1×6」计数不符 | 同上（关联） | `docs/calorie-parity-39.md:14-18` 表内**仅 5 行 P1**（第 6 项＝§4 DB intensity，与 P1-1 同源重复）；`t68-parity-gaps.md:149` 判「**补**（订正为 5 项或注明 6=5+1 重复）」 | **无** | 无 | 不冲突 | **登记**（追加注记） | 强 |
| ③-5 弱断言收紧 | 同上（地图引 `cmd-read-t11.test.mjs:185`，**行号已漂移**） | 现位于 `packages/skill-calorie/test/cmd-read-t11.test.mjs:196`：`assert.ok(TRIGGERS.length >= 436)`；权威等值断言在 `test/calorie-triggers.test.mjs:31`，且包内 `pnpm test` 已引用该文件（`t68-parity-gaps.md:133`）→ **不构成漏检** | **无** | 无 | 不冲突 | **登记**（顺手收紧为 `===`，成本≈0；可与 ②-4 同票） | 强 |

### 3.4 ④ 双包命名不一致 ＋ 残留目录

| 项 | 地图原文（引行） | 现状事实（文件:行 或命令） | 用户可见影响 | 是否已有票覆盖 | 与既有裁定是否冲突 | 建议处置 | 依据强度 |
|---|---|---|---|---|---|---|---|
| ④-1 双包命名不一致 | 「双包命名不一致（calorie/chef 无后缀 vs memo/schedule/home/bill 带 -ilife）**是否属本体收口**」 | 包名实测（`Get-ChildItem packages` ＋ 各 `package.json`）：**插件侧** `dsh-calorie`／`dsh-chef`（无后缀）vs `dsh-bill-ilife`／`dsh-home-ilife`／`dsh-memo-ilife`／`dsh-schedule-ilife`；**技能侧** `skill-bill`／`skill-calorie`／`skill-chef`／`skill-home`／`skill-schedule`（无后缀）vs `skill-memo-ilife`（带后缀）。映射表见 `docs/p10-scaffold.md:10-13` | **无**（纯内部命名） | 无 | **冲突**：与地图 `## Out of scope`「本图**不碰插件包**」＋ Notes 分界（「本图动技能包、CLI 出口与 base-* 包，不碰插件包」）——改名必然跨图 | **出 scope**（归框架图 #1／各技能图） | 强 |
| ④-2 5 个只剩 tsbuildinfo 的残留目录 | 「5 个只剩 tsbuildinfo 的残留目录**是否清理**」 | 实测**恰 5 个**：`packages/plugin-bill`／`plugin-home`／`plugin-memo`／`plugin-schedule`／`skill-memo`——各目录只有 `dist`／`node_modules`／`tsconfig.tsbuildinfo`，**无 `package.json`**（`Test-Path package.json` 全 False）。`git ls-files <dir>` 5 个**全为 0 条**（未跟踪）；`dist`／`tsbuildinfo` 已被忽略（`.gitignore:2 packages/*/dist/`、`:3 *.tsbuildinfo`）。关联出处 `t72-shared-layer-gap.md:491`（「`skill-memo`（无 -ilife）目录无 package.json…与母图 #63『5 个只剩 tsbuildinfo 的残留目录』待判项相关」） | **无** | 无 | 不冲突 | **本图做**（清理；最小范围＝删 5 个目录，**对 git 零影响**，非 git 操作）或**登记** | 强 |

### 3.5 ⑤ 其余地图项（含整图验收）

| 项 | 地图原文（引行） | 现状事实（文件:行 或命令） | 用户可见影响 | 是否已有票覆盖 | 与既有裁定是否冲突 | 建议处置 | 依据强度 |
|---|---|---|---|---|---|---|---|
| ⑤-1 旧链 95 条唤醒词 | 「旧链 95 条唤醒词：其能力需**给键新增参数**才能承接…属**新能力**，未拆票（#81 已登记）」 | 现状＝非执行 **95 条**（`out-of-scope` 10 ＋ `legacy-chain` 85），`test/calorie-routing-81.test.mjs:95-105` 钉死；#111–#113 已促进 15 词（326→341，`test/calorie-routing-81.test.mjs:26-28`）。SoT 436 条 sha 冻结、词零废弃（`calorie-architecture.md:58`） | **有**（95 条词命中但不产出能力；旧版这 95 条走 python 链）——但**词层零废弃**已达成 | 无（#81 已登记） | **不冲突**：与「新能力」定性一致 | **出 scope**（本图收口为「命中但不执行」，新能力另图） | 强 |
| ⑤-2 交付信号（方案 A） | 「交付信号**已拍**（2026-09-08）：方案 A——扩 envelope 加 `delivery{mode,path?,template?,bytes?}`」 | **已实现**：`render/envelope.ts:139 DELIVERY_MODES = ['file','inline','text']`、`:135` 方案 A 注记；`cli/cmd_read.ts:1029-1030`（`delivery` 顶层追加、既有五字段不改、P9 不变）；测试 `packages/skill-calorie/test/delivery-83.test.mjs:37` 断言六字段序 `['version','skill','shape','key','data','delivery']`、`:113-121` 文件态同值同源 | **无缺口** | **#83**（open） | 不冲突（与 `calorie-architecture.md:55` 逐字一致） | **本图做**（随 #83 关闭收口，无需另票） | 强 |
| ⑤-3 回传态（第 4 态） | 「回传态（第 4 态）：中间态 HTML 的『复制 prompt → 粘贴给 AI → 再调 CLI』回路是否纳入，**依赖 #76／#77／#98**」 | 定义 `calorie-architecture.md:57`；**依赖三票均已 CLOSED**（#76／#77／#98）；冻结契约**零命中**「回传态」（`docs/research/t92-verify-v3-spec.md:82`）；已交付的相邻能力：wizard 页 prompt 预览＋复制（#86）、HELP 页复制按钮（#90）、copied 态（#121）；三态交付已含 `text`（`envelope.ts:139`） | **不确定**（取决于是否把「页面填字段→回传 AI」视为旧版体验的一部分） | 无 | 不冲突 | **出 scope**（登记为「第 4 态未纳入」）或**另开票**——建议前者：三态已覆盖旧版可见交付行为 | 中 |
| ⑤-4 整图验收 | 「整图验收：三条主线全绿后，用什么一次性的端到端证据判定『体验与旧版一样』」 | **另有席在做**（本席不评估其内容） | — | 另席 | — | **已有席在做**（依赖见 §5） | 强 |

---

## 4 专项：`t81-route-evidence.mjs` exit=1 归因（静态判定，未运行）

**结论：exit=1 属「证据脚本陈旧」，不是主线①的产品回归。**

| 断言（`docs/research/t81-route-evidence.mjs`） | 脚本硬编码值 | 现行事实（活门 `test/calorie-routing-81.test.mjs`） | 判定 |
|---|---|---|---|
| `:430` `check(covered.size === 77)` | 77 键 | `coveredKeys: 99`（`:104`）、`covered.size === 99`（`:121`） | **必红** |
| `:434` `check(NEW_KEY_ROUTES.length === 34)` | 新拟 34 | `newEntries: 56`（`:102`） | **必红** |
| `:349` `check(twinFlips === 26)`／`:388` `check(paramFlips === 222)` | 26／222 | #111–#113 促进 15 词后逐词重算 | 随促进词变化**可能亦红** |
| `:444` `check(frozenExecKeys.size === 43)` | 43 | 冻结表未动（sha 冻结） | 可能仍成立 |

- 脚本自身退出语义：`bad.length > 0` → `process.exit(1)`（脚本末段）。**至少 2 条硬断言必红**，故 exit=1 **静态可证**。
- 复算命令（不触发实跑，仅比对常量）：`Get-Content docs/research/t81-route-evidence.mjs | Select-String "covered.size === 77|NEW_KEY_ROUTES.length === 34"`；`Get-Content test/calorie-routing-81.test.mjs | Select-String "coveredKeys: 99|newEntries: 56"`。
- **归属建议**：不要在本图改代码。把「逐条路由证据」的**权威**明确为活门 `test/calorie-routing-81.test.mjs`（现行 341／95／99），并把 `docs/research/t81-route-evidence.md` **标注为 #81 时点快照**（只追加说明行，不改历史）；或把脚本常量改为取 `routingSummary()`／`Object.keys(CALORIE_COMBOS)` 动态值。**归「整图验收口径」席**（正在做的席）或新开一张文档债小票。

---

## 5 依赖与并席关系

| 关系 | 说明 |
|---|---|
| ⑤-4 整图验收 | **另有席在做**。本报告只提供输入：① §4 的「证据脚本陈旧」必须被该席纳入验收证据清单，否则端到端证据会出现一条 exit=1；② 主线①的「产出 HTML」口径需例外条款（§1-2、§6）。 |
| #83／#89／#79（open 三票） | #83＝HTML-First／渲染失败回执（**含交付信号，已实现**）；#89＝视觉锁 B1 逐值验收；#79＝base- 组件契约重写与三包统一版本。三者是主线①②③的**票级收口点**，本报告不改变其边界。 |
| 地图 Notes「串行序」 | 本报告**不申请**任何新票位；所有「本图做」项均标注最小范围，可与既有串行序并轨。 |

---

## 6 阻断级清单（不做就不能说 Destination 达成）

| # | 项 | 为什么阻断 | **最小可做范围** | 归属 |
|---|---|---|---|---|
| B1 | **「产出对应 HTML」的例外条款缺失** | Destination ①字面要求「**旧版全部唤醒词**…同样命中并产出对应 HTML」；现网 341／436 可执行、**95 条 non-exec 不产出 HTML**（`test/calorie-routing-81.test.mjs:95-105`）。不给例外，Destination ①**按字面永不可达成** | 地图追加 1 段口径（§7 原文），**零代码** | 本图（地图收口） |
| B2 | **写路径 `difficulty` 值域校验** | `t68-parity-gaps.md:142` 判「**补**」：老家会拒、新版落库 → 与「体验与旧版一样」**实质偏离**（`write.ts:284` 未接线） | `write.ts` 加值域校验（复用 `kcal.ts:32`）＋ 1 条负例测试 | 本图做 或 另开小票 |
| B3 | **`t81-route-evidence.mjs` 陈旧（exit=1）** | 若整图验收把「一次性端到端证据」定为该脚本，则**必红**（§4 静态可证）→ 收口证据链自相矛盾 | 权威改为活门 `test/calorie-routing-81.test.mjs`；快照文件追加「#81 时点」说明行；或脚本常量改动态取值 | 整图验收席 或 新开文档债小票 |

> 注：**#83／#89／#79 三张 open 票本身**亦是收口前置，但属票级边界，不在本席处置范围。

---

## 7 可登记清单（不影响目标，只需记账）

**共 12 条**（下表）＋ 2 条建议并入 B 项同票（②-4 G14、③-5 弱断言）。

| # | 条目 | 登记内容（一句话） | 出处 |
|---|---|---|---|
| R1 | 四类边缘能力 O1–O4 | 作废·执行层不承接；飞书为「无词项」 | `routing.ts:113-114,166-167,356-357,579,582,590,712-739`；`t71:741-744`；`parity-39:21`；`calorie-architecture.md:90` |
| R2 | 95 条 non-exec | 10 `out-of-scope` ＋ 85 `legacy-chain`，词零废弃、不承接 | `test/calorie-routing-81.test.mjs:95-105` |
| R3 | G6 错误码 | 「已知口径·有意不改」（FetchError→exit 4；改即破 T11 冻结） | `write.ts:8-10`；`fetch/body.ts:134`；`t67:216-220` |
| R4 | G9–G11 | 测试强度债（参数矩阵／非法参数／上界）；#103 仅覆盖 G2–G4 | `t67:232-242`；`test/g2g4-103.test.mjs:40-85` |
| R5 | G13 | 探针目录卫生已实践、**规范未落文档** | `t67:249-252`；`cmd-write-40-persist.test.mjs:609` |
| R6 | P1-3 迁移审计计数 | 未补（一行计数即可，用户不可见） | `migrate.ts:320-326`；`t68:143` |
| R7 | P1-4 出处行号 | `parity-39.md:14` 引 `db.py:258-268` 失效 → 追加订正行（`db.py:396-406`） | `t68:144` |
| R8 | 「P1×6」计数 | 表内 5 行；6＝5＋1 重复 → 追加注记 | `parity-39.md:14-18`；`t68:149` |
| R9 | 双包命名不一致 | **出 scope**（跨图；本图不碰插件包） | 包名实测；`p10-scaffold.md:10-13`；地图 `Out of scope` |
| R10 | 5 个残留目录 | `plugin-{bill,home,memo,schedule}`／`skill-memo`：无 `package.json`、`git ls-files`=0、`dist`／`tsbuildinfo` 已忽略 → 可清理 | 实测；`t72:491`；`.gitignore:2-3` |
| R11 | 回传态（第 4 态） | 依赖 #76／#77／#98 **均已关闭**；建议**出 scope**（三态已覆盖旧版可见交付） | `calorie-architecture.md:57`；`t92-verify-v3-spec.md:82` |
| R12 | 交付信号方案 A | **已实现**，随 #83 关闭收口（非缺口） | `envelope.ts:135,139`；`cmd_read.ts:1029-1030`；`delivery-83.test.mjs:37,113-121` |

---

## 8 建议的地图收口口径（可直接贴进地图 · 只追加不改写）

> **【收口口径（#63 · 建议，待维护者拍板）】** Destination 的判定只认三条主线的**可复算证据**，与子票关闭数**解耦**：**50/50 不等于达成**。`## Not yet specified` 各项按 `docs/research/t63-scope-closure.md` 逐项处置，其中：**①「命中并产出对应 HTML」限定为 exec 桶 341／436**（`test/calorie-routing-81.test.mjs:95-105`），**non-exec 95 条（out-of-scope 10 ＋ legacy-chain 85）以「命中但不执行」为终态、不产出 HTML、不计入本图缺口**——此为 Destination ①的字面例外条款；**②四类边缘能力（定时复盘／飞书归档／训记同步／mmx vision）在本图内以「作废·执行层不承接」收口**，本句与 `docs/calorie-architecture.md:90`（Out of Scope）、`docs/calorie-parity-39.md:21`（非缺口）及 `docs/research/t71-old-baseline-inventory.md:737-744`（§7.2 明确不做）一致；地图原句「在范围内」仅指**处置权在本图**，不含执行层交付；**③双包命名不一致与 5 个残留目录属仓库卫生／跨图**，前者出 scope 归框架图 #1、后者本图可清；**④G6／G9–G11／G13 与 P1 文档债（出处行号、P1×6 计数、弱断言）登记不改判**；**⑤阻断级仅三项**：HTML 例外条款（本段 ①）、写路径 `difficulty` 值域校验、`t81-route-evidence.mjs` 陈旧归因（见该报告 §6）；**⑥历史结论一律只追加、不改写**。

---

## 9 附：本报告用到的复算命令（只读）

```powershell
# 子票口径
gh api repos/FeatherHunter/ilife/issues/63/sub_issues --paginate --jq '.[] | [.number,.state,.title] | @tsv'

# 四类边缘能力入桶
git grep -n "bucket: 'out-of-scope'" -- packages/skill-calorie/src/triggers/routing.ts

# 活门口径（341／95／99）
Get-Content test/calorie-routing-81.test.mjs | Select-String "exec: 341|nonExec: 95|coveredKeys: 99|newEntries: 56"

# 写路径值域未接线
git grep -n "EXERCISE_DIFFICULTIES" -- packages/skill-calorie/src/

# 迁移审计计数缺失
git grep -n "intensityToDifficulty" -- packages/skill-calorie/src/migrate/migrate.ts

# 弱断言现址
git grep -n "TRIGGERS.length" -- packages/skill-calorie/test/

# G14 缺口
git grep -n "case 'calorie.goal.(resume|pause)'|noChange" -- packages/skill-calorie/src/cli/write.ts

# 残留目录（5 个）
Get-ChildItem packages -Directory | ForEach-Object { $p = Join-Path $_.FullName 'package.json'; if (-not (Test-Path $p)) { $_.Name } }
git ls-files packages/plugin-bill packages/plugin-home packages/plugin-memo packages/plugin-schedule packages/skill-memo
```
