# 卡路里旧版口径对照与 P1×6 复核（#68）

- 票：#68（母图 #63 卡路里·本体图）；仓库 HEAD `6b0c1e7`（master，工作树含 #56 未提交改动）。
- 本次全程只读：未改/删/改名任何既有文件；未执行 git branch/checkout/switch/commit/push/stash/reset；未运行旧 Python；未碰真实 DB（仅对老家 `.scratch/380-audit/` 备份复制件做只读 PRAGMA/SELECT，先复制到 %TEMP%）。
- 对照源：
  1. `docs/calorie-parity-39.md`（#39 报告，仓内唯一 parity 报告，git 历史仅 `aed6572` 一次收编）；
  2. GitHub：#39 / #40 / #41 / #14 / #1 / #63 / #68 评论，及 `gh api search/issues ... in:comments` 全库评论检索；
  3. 当前树 `packages/skill-calorie`（src + dist + test + 根 `test/calorie-triggers.test.mjs`）；
  4. 老家 `D:/2Study/StudyNotes/SKILLS/卡路里`（scripts / references / 备份 DB 复制件，只读）。

---

## 1 #39 报告基线（逐项摘录，供对照）

### 1.1 总体结论（`docs/calorie-parity-39.md:8`）

> **词层与路由层全覆盖，执行层缺两块 P0**。唤醒词 436 条目 / 434 唯一词新旧逐字一致（onlyOld=0、onlyNew=0），10 场景计数全对齐；但新版 24 个 cmd_read 键全为读，旧写链无可执行键，读链亦有缺口。

### 1.2 P0×2 与去处

| 分级 | 内容（摘） | 去处（文档） | 现状 |
|---|---|---|---|
| P0 | 写链：约 22 个旧写 CLI + 单条 CRUD 唤醒词无可执行键 | 补票 #40 | #40 已 CLOSED（2026-09-06T12:51:09Z 评论：35 写键走唯一出口，旧 22 写 CLI 逐条有去处） |
| P0 | 读链：无 weight 视图、无 profile 视图；render 缺 38 项 | 补票 #41 | #41 已 CLOSED（2026-09-06T16:00:35Z 评论：合流 `2fd747e`，CI 绿） |

当前实测（`dist/cli/keys.js`，`.scratch/research/count-keys.mjs` 输出）：**77 键 = 42 读 + 35 写**，与母图 #63「77 键（42 读 + 35 写）」一致；读键由文档记录的 24 个增至 42 个（+18，即 #41 补齐的 weight 系/body 系/plan 系/goal 三模式/predict/anomaly/contraindication/dedupe/profile）。

### 1.3 P1×6 逐字（`docs/calorie-parity-39.md:14-18`）

| # | 原文（含出处） |
|---|---|
| P1-1 | intensity 中文 4 档→difficulty 英文 3 档，`'极限'`→NULL 边界丢失（出处 db.py:258-268、schema.ts:247-250 M5、migrate.ts:132） → 注明出处，#41 验收时复核 |
| P1-2 | 餐别窗口 15 点=下午茶，加餐=下午茶+夜宵，老家旧口径作废（出处 fetch/diet.ts MEAL_WINDOWS） → 注明出处 |
| P1-3 | GIF 只任务描述不真合成；照片舍弃 base64 内嵌只透文件名 + fileExists 位（出处 photo.ts 注释，有意不对等） → 注明出处，调用方处理 |
| P1-4 | 复盘 9 词并入场景 10；legacy 22 条无 key 原样保留为 LegacyTrigger（出处 types.ts:39、help-lookup.ts:16） → 注明出处 |
| P1-5 | goal progress 11 mode 折叠为 5 盘 + 主视图，expiring/predict/vs_actual 无直接对应 → 并入 #41 |

**计数矛盾（本次新发现）**：#39 票面结论与 §8 均写「P1 口径差异 6 项」，但报告表内只有 **5 行 P1**（`docs/calorie-parity-39.md:14-18`）；第 6 项只能落在 §4 的 DB 差异条目（`:63`，`exercise_log` 删 `intensity`、`'极限'`→NULL），与 P1-1 同源重复计数。故「P1×6」实际是「表内 5 项 + DB 差异 1 项（重复）」。

### 1.4 P2 / 非缺口（`docs/calorie-parity-39.md:19-21`）

- P2：DOM 不兼容（旧 Apple CSS 整页 vs 新 pageShell token 内联）；饼图/明细表舍弃改 KPI 化；图表舍弃 → 二期。
- P2：`_cmd_maps.py` 5 中英映射表被取代；旧 HELP 执行器 `render_help_center` 被取代；aliases 3 词合并 → 被取代，有据。
- 非缺口：定时 cron、飞书发送/归档、训记 sync/push、mmx vision、面板 → out of scope（#14 范围），词保留路由 + HELP，仅执行层不承接。

### 1.5 记录的 DB 差异（`docs/calorie-parity-39.md:63`）

> **唯一字段差异：`exercise_log` 删 `intensity`**（2026-07-12 强度口径统一，中文 4 档→英文 3 档 difficulty，与训记对齐；去向为搬运回填非丢弃：schema.ts M5 WHERE difficulty IS NULL 回填、migrate.ts intensityToDifficulty + 过滤 intensity 列 + 回填；SQLite 不便删列，老库残留保留读路径统一用 difficulty；边界丢失：`'极限'`/其他→NULL，difficulty 已有值不覆盖）。

---

## 2 P1 逐条复核状态（关键结论）

复核方法：全库评论检索 `gh api -X GET search/issues -f q='repo:FeatherHunter/ilife <词> in:comments'`。
- `intensity` → **total_count = 0**
- `极限` → **total_count = 0**
- `P1` → total_count = 3（#39 / #14 / #48）；#48 的「P1→P4 全绿」是优先级分级，与 parity 无关。
- `parity` → total_count = 8（#39 / #30 / #14 / #21 / #15 / #19 / #17 / #50），均为词层/面板层面的泛提，无一处逐条回贴 P1 六项。

| # | P1 项 | 记录出处 | 复核状态 | 证据 |
|---|---|---|---|---|
| P1-1 | intensity `'极限'`→NULL | db.py:258-268（**已失效**）、schema.ts:247-250、migrate.ts:132 | **未复核** | #39 评论 2026-09-06T11:48:51Z 仅「P1×6 注明出处」；#41 评论 2026-09-06T16:00:35Z 全篇合流/CI，零 P1 字样；全库评论检索 intensity/极限 = 0 命中 |
| P1-2 | 餐别窗口 / 加餐 | fetch/diet.ts MEAL_WINDOWS | **未复核** | 同上；无任何评论提及餐别窗口口径 |
| P1-3 | GIF 不真合成 / 弃 base64 | photo.ts 注释（**文件已改名**） | **未复核** | 同上；无评论提及 |
| P1-4 | 复盘 9 词并入场景 10 / legacy 22 | types.ts:39、help-lookup.ts:16 | **未复核** | 同上；无评论提及 |
| P1-5 | goal 11 mode → 5 盘 | 无出处（原文未给出处） | **未复核（但实质已补）** | #41 关票评论（2026-09-06T16:00:35Z）未逐条回贴；代码已落 expiring/predict/vs_actual（见 §5-6） |
| P1-6 | = §1.5 DB intensity 项（与 P1-1 同源） | :63 | **未复核** | 同 P1-1；且该项实为 P1-1 的重复计数 |

**结论**：#39 票面「#40/#41 验收时复核」的承诺**从未执行**——#40、#41 两票各只有 1 条收尾评论，均无 P1 字样；#39 自己的收尾评论（2026-09-06T11:48:51Z）也只是「注明出处」；#14 finale 评论（2026-09-06T16:38:53Z）写的是「docs 收编卡路里 parity 调查报告，**P1/P2 注记**」，即注记而非复核。全库评论对 `intensity` / `极限` 零命中，P1-1 连一次文本回贴都没有。本报告即为首次逐条复核（复核结果见 §2 表 + §5）。

---

## 3 `intensity` 现状（代码级，本次实测）

| 环节 | 现状 | 证据（file:line） |
|---|---|---|
| 终态 schema | 终态表**不建** `intensity` 列；老库残留列**不删**（SQLite 不便删列），读路径统一用 `difficulty` | `packages/skill-calorie/src/schema.ts:8-9`、`:40` |
| 迁移回填（M5） | `CASE intensity WHEN '低'→'easy' WHEN '中'→'normal' WHEN '高'→'hard' **ELSE NULL**`，仅 `difficulty IS NULL` 时回填 | `src/schema.ts:247-251` |
| 迁移搬运 | 通用列复制**过滤掉** `intensity`；exercise 特殊分支用 `intensityToDifficulty()` 一次性回填 | `src/migrate/migrate.ts:316`、`:320-324`；映射函数 `src/migrate/migrate.ts:132-137`（`低/中/高` 之外 **return null**） |
| 写路径 | 接受任意字符串，**未按值域校验**（`EXERCISE_DIFFICULTIES` 仅定义与导出，未被写入校验引用） | `src/cli/write.ts:191`；值域定义 `src/kcal.ts:31-32`；导出 `src/index.ts:6` |
| 读路径 | `LIVE_COLS` **不含** `intensity`（静默不出现在任何读输出）；仅 `difficulty` 进 record | `src/fetch/exercise.ts:167`、`:263` |
| 渲染 | `src/render/*.ts` **零** `difficulty`/`难度` 命中 → difficulty 不进 HTML | grep `src/render` 无命中 |
| 老家侧对照 | 老家 `db.py` 当前版本的映射与新版**逐字同构**（同样 ELSE NULL）；老家写 CLI 曾用 `choices=['easy','normal','hard']` 校验 | 老家 `scripts/db.py:396-406`、`scripts/exercise_tracker.py:791`、`:811`；4 档值域出处 老家 `references/database_schema.md:112` |
| 真实数据（备份复制件，只读） | 备份 `calorie_data_backup_20260814_232217.db` 的 `exercise_log` 共 8297 行：`intensity` = NULL 8277 / 中 12 / 高 6 / **极限 2**；`difficulty` = NULL 8278 / normal 13 / hard 6 | 本次只读 SELECT（`.scratch/research/probe-old-bak.mjs`） |

**判定**：
1. 「`'极限'`→NULL 边界丢失」**不是新旧 parity 差异**——老家的迁移脚本本身就是 `ELSE NULL`，`'极限'` 在**老口径下同样已是 NULL**（备份里 2 行 `极限` 的 `difficulty` 就是 NULL）。新版只是**忠实复刻**了老家口径。
2. 真实丢失规模可量化：备份 8297 行里 2 行（0.024%）。信息并未因移植而新增丢失，而是在 2026-07-12 老口径统一时即已丢弃；`intensity` 原值仍残留在老库列中（新旧都不读）。
3. 真正的新缺口是**写路径缺值域校验**（`write.ts:191` 可写入 `'极限'`/任意串，老家 `choices` 会拒绝），以及**迁移无审计计数**（丢了多少行不可观测）。

---

## 4 「词层与路由层已全覆盖」是否仍成立（复核，本次实测）

### 4.1 复现结果（当前树，`node` 只读读 `dist/triggers`）

| 指标 | #39 报告值 | 本次实测 | 结论 |
|---|---|---|---|
| 条目总数 | 436 | **436** | 一致 |
| 唯一唤醒词 | 434 | **434** | 一致 |
| 重复词 | 记身材照 ×3 | **记身材照 ×3**（唯一重复项） | 一致 |
| 场景 01 主页 | 9 | **9** | 一致 |
| 场景 02 饮食 | 70 | **70** | 一致 |
| 场景 03 体重 | 58 | **58** | 一致 |
| 场景 04 运动 | 39 | **39** | 一致 |
| 场景 05 健身计划 | 32 | **32** | 一致 |
| 场景 06 目标管理 | 25 | **25** | 一致 |
| 场景 07 基础信息 | 4 | **4** | 一致 |
| 场景 08 身体细节 | 13 | **13** | 一致 |
| 场景 09 身材照片 | 10 条目 / 8 唯一词 | **10 / 8** | 一致 |
| 场景 10 分析+复盘 | 176 | **176** | 一致 |
| CATEGORIES | 13 | **13** | 一致 |

证据文件：`packages/skill-calorie/src/triggers/scene-01-home.ts` … `scene-10-analysis.ts`、`src/triggers/index.ts`（`SCENES`/`CATEGORIES`）、计数脚本 `.scratch/research/count-triggers.mjs`（输出 `total=436 unique=434 perScene={"01":9,"02":70,"03":58,"04":39,"05":32,"06":25,"07":4,"08":13,"09":10,"10":176}`）。

**独立对照老家（只读静态计数，未运行 Python）**：`D:/2Study/StudyNotes/SKILLS/卡路里/scripts/_triggers.py`（4468 行）中 `wake_word` 条目 **436** 条、唯一词 **434**，分类分布 `{主页9, 饮食70, 体重58, 运动39, 健身计划32, 目标管理25, 基础信息4, 身体细节13, 身材照片10, 分析167, 复盘9}` —— 与新版场景计数**逐项一致**。脚本 `.scratch/research/count-old-sot.mjs`。

**抽查两场景明细（新旧逐条对齐）**：
- 场景 07（4 条）：设置档案 / 设活动量 / 改档案 / 查档案 —— 老家同名同序（`_triggers.py` 基础信息 4 条），新 `scene-07-profile.ts` key = profile_setup / profile_set_activity / profile_update / profile_view。
- 场景 09（10 条 / 8 唯一）：记身材照 ×3（单张/备注/批量）、查身材照、对比两张照片、生成身材照GIF、删身材照、改照片标签、加照片标签、删照片标签 —— 与老家 10 条同名同序，`记身材照` 三 key 保留（body_photo_add_single/note/batch）。

### 4.2 路由层与回归门

- 全票 parity 测试**实跑通过**（本次执行 `node --test test/calorie-triggers.test.mjs`）：总数 436 无增删、10 场景计数全对齐、wake 多重集一致、逐条 sha 一致、getSummary 与 SoT 一致、HELP 速查覆盖全部唤醒词与别名、CATEGORIES 13 → **7 pass / 0 fail**（`test/calorie-triggers.test.mjs:30-61`）。
- 复盘 9 词并入场景 10：`src/triggers/help-lookup.ts:16`（`'复盘': '10'`）。
- legacy 22 条无 key：实测 **22**（饮食 1 + 复盘 9 + 分析 12），分布 scene 02 = 1、scene 10 = 21（`src/triggers/types.ts:39-40` 注释同口径）。

### 4.3 复核结论（两处注记，不推翻结论）

1. **结论仍成立**：436 条目 / 434 唯一词 / 10 场景计数 / 13 分类 / 词零废弃，对当前树与老家源码双向复现一致。
2. 注记 A（文档方法表述有误）：报告 `:41` 称「旧 `'wake_word':` 436 行去重 412 + 双引号复盘/分析 22 = 436 条目」，实测老家文件 `'wake_word':` 单引号 **436 行、双引号 0 行**（`:41` 的 412/22 拆分无法复现）；但**总数/唯一数结论正确**，属算术叙述瑕疵。
3. 注记 B（SoT 保真的内部不自洽）：`getSummary()` 的 `by_category` 分析=**172**（实际条目 167）、合计 181 ≠ 436，`total_prompts` = 441；该值与 `test/calorie-sot.snapshot.json` 冻结快照逐字一致（SoT 原样），改动会破坏 parity 断言 → 仅注记。
4. 注记 C（测试强度）：`packages/skill-calorie/test/cmd-read-t11.test.mjs:185` 用 `assert.ok(TRIGGERS.length >= 436)`（弱断言）；权威等值断言在 `test/calorie-triggers.test.mjs:31`，且包内 `pnpm test` 已引用该文件（`packages/skill-calorie/package.json` scripts.test），故不构成漏检，但建议顺手收紧为 `===`。

---

## 5 差异清单（差异项 | 现状 | 证据 | 处置建议 | 归属）

| # | 项 | 现状（本次实测） | 证据（file / issue） | 处置建议 | 归属 |
|---|---|---|---|---|---|
| 1 | P1-1 intensity `'极限'`→NULL | 新版映射与老家**逐字同构**（ELSE NULL）；备份真库 2 行 `极限` 在老侧 `difficulty` 亦为 NULL → **不构成新旧差异** | `src/schema.ts:247-251`、`src/migrate/migrate.ts:132-137`、`:316-324`；老家 `scripts/db.py:396-406`、`references/database_schema.md:112`；备份只读 SELECT | **不补**（口径一致，无差异可补）；若要留痕，改为「审计计数」而非改口径 | 本体图 #63（口径结论） |
| 2 | 写路径缺 difficulty 值域校验 | `difficulty` 接受任意字符串，`'极限'`/`'低'` 可写入，与老家 `choices=['easy','normal','hard']` 不对等（**新缺口**） | `src/cli/write.ts:191`；值域定义未接线 `src/kcal.ts:31-32`；老家 `scripts/exercise_tracker.py:791`、`:811` | **补**（老家会拒，新版会落库，属口径放宽） | 本体图 #63（新票或并入逐键审计） |
| 3 | 迁移丢弃行不可观测 | 迁移只静默置 NULL，无「多少行 intensity 非低中高被丢」的计数/回执 | `src/migrate/migrate.ts:320-324`；备份数据 2 行 `极限` | **补**（一行审计计数即可，成本低、可观测性收益高） | 本体图 #63（或迁移专项） |
| 4 | P1-1 出处失效 | 报告引 `db.py:258-268`，该行号在老家中现为 food_log 钠糖纤维迁移；intensity 映射现位于 `db.py:396-406`（老家文件已漂移） | 老家 `scripts/db.py:262-271` vs `:396-406`；报告 `:14` | **补**（订正注记，避免下次复核再踩空） | 本体图 #63（文档收编） |
| 5 | P1-2 餐别窗口 / 加餐 | 新版 `早餐[6,10) 午餐[10,14) 下午茶[14,18) 晚餐[18,22) 夜宵[0,6)`，15 点→下午茶；`加餐=[14,22,0,6]`（下午茶+夜宵）；无法解析→`'其他'` —— 与老家 `diet.py` **逐字一致**；老家 `render_meal_distribution.py` 的 `(14,17,21,24)` 变体才是被作废的旧口径 | `src/fetch/diet.ts:16-18`、`:21-29`、`src/render/analysisPlate.ts:124`；老家 `scripts/diet.py:32-48`、`:474-489`、`scripts/render_meal_distribution.py:29` | **不补**（新口径=老家主口径；旧变体本就是老侧内部不一致） | 无需票（文档注记即可） |
| 6 | P1-3 GIF 不真合成 / 弃 base64 | `planGif` 只出任务描述（不跑图像处理）；照片渲染只 `<img src=文件名>` + `data-file-exists`，不嵌 base64 | `src/fetch/photos.ts:228-232`、`src/render/html.ts:12`、`:151-152`、`src/render/photo.ts:4`、`src/cli/cmd_read.ts:407`、`:427-434` | **不补**（老家 PIL 缩放/合成属图像处理链，超出技能读链；报告已标「有意不对等，调用方处理」） | 另行（若要做，归打通图/面板图） |
| 7 | P1-4 复盘 9 词并入场景 10 / legacy 22 | 复盘 9 条 category 映射到场景 10；legacy 22 条（饮食1+复盘9+分析12）无 key 原样保留；`记身材照` ×3 重复保留 | `src/triggers/help-lookup.ts:16`、`src/triggers/types.ts:39-40`；计数 `.scratch/research/count-legacy.mjs` | **不补**（SoT 原样、词零废弃；legacy 是老家运行态条目，非缺口） | 本体图 #63（若「极致」要求清 legacy，另立口径票） |
| 8 | P1-5 goal 11 mode（expiring/predict/vs_actual） | **已补**：三模式各有读键 + handler + HTML + HELP 可执行 CLI | `src/cli/keys.ts:100-102`、`src/cli/cmd_read.ts:568-586`、`src/render/html.ts:540-562`、`src/triggers/help-lookup.ts:89-95`；老家模式表 `scripts/render_goal_progress.py:12-22` | **不补**（已落地，仅需回贴验收） | 本体图 #63（验收回贴） |
| 9 | 「P1×6」计数与表内 5 行不符 | 表内仅 5 行 P1；第 6 项=§4 DB intensity 项，与 P1-1 同源重复 | 报告 `:14-18`、`:63`；#39 票面结论「P1 口径差异 6 项」 | **补**（订正为 5 项或注明 6=5+1 重复） | 本体图 #63（文档） |
| 10 | getSummary 分类合计不自洽 | `分析=172`（实际 167），合计 181≠436；与 SoT 快照一致 | `.scratch/research/count-triggers.mjs` 输出；`test/calorie-sot.snapshot.json` `summary` | **不补**（SoT 保真，改动即破 parity 断言），仅注记 | 本体图 #63（注记） |
| 11 | 包内弱断言 | `TRIGGERS.length >= 436` | `packages/skill-calorie/test/cmd-read-t11.test.mjs:185` vs 权威 `test/calorie-triggers.test.mjs:31` | **补**（顺手收紧 `===`，防增删漏检） | 本体图 #63（测试卫生） |
| 12 | difficulty 不进读输出 | 无任何读键返回逐条运动记录（`view.exercise` 只出聚合 metrics），`render/*.ts` 零 difficulty；老家 CLI 文本会打 `强度=` | `src/cli/cmd_read.ts:256-265`、`src/fetch/exercise.ts:167`、`:263`；老家 `scripts/exercise_tracker.py:335-336` | **不补**（数据在库、写回执可达；逐条明细属 P2 展示），若「极致」刻度要求逐条运动明细则另行立票 | 另行 / 本体图待刻度 |
| 13 | P2（DOM/图表/映射表/HELP 执行器） | 维持二期，无变化 | 报告 `:19-20` | **不补**（本次口径复核不涉及） | 全面面板图 |
| 14 | 定时/飞书/训记/mmx/面板 | 词保留路由 + HELP，执行层不承接（out of scope #14） | 报告 `:21`；#14 范围 | **不补** | 打通图 / 框架图 #1 |

---

## 6 结论（回答 #68 三问）

1. **与旧版逐字段对照还剩哪些差异？** 口径层面**已无实质差异**：唯一记录的 DB 字段差异（`intensity`）在老侧是同一 `ELSE NULL` 口径，`'极限'` 2 行在老家也早已是 NULL；餐别窗口/加餐、GIF/base64、复盘 9 词/legacy 22 均为**有意不对等或 SoT 原样**。真正剩余的是 3 处**新发现的非口径类缺口**：写路径 difficulty 值域未校验（#2）、迁移丢弃行不可观测（#3）、以及 3 处文档/测试瑕疵（#4 出处失效、#9 计数不符、#11 弱断言）。P0×2 已由 #40/#41 关闭，当前 77 键（42 读 + 35 写）齐备。
2. **P1×6 是否已逐条复核、结论落在哪？** **未复核**。全库评论检索 `intensity` / `极限` = 0 命中；#39、#40、#41、#14 的相关评论均无逐条回贴（时间戳见 §2）。其中 P1-5 的**实质内容**已由 #41 落地（代码可证），但**复核记录缺失**；本报告（#68）为首次逐条复核，结论落在本文 §2/§3/§5。
3. **`exercise_log.intensity` 如何处置？** 见 §3：口径不补（老新同构、非差异），建议补「写路径值域校验」+「迁移审计计数」两项；出处注记订正为老家 `db.py:396-406`（+ `references/database_schema.md:112`）。
4. **「词层与路由层已全覆盖」是否仍成立？** **成立**。436/434、10 场景计数、13 分类、词零废弃对当前树与老家源码双向复现一致，parity 回归测试 7/7 通过（§4）。

---

## 7 本次产生的证据文件（均在 `.scratch/research/`，不属既有文件改动）

- `t68-parity-gaps.md`（本报告）
- `count-triggers.mjs` / `count-out.txt`：当前树触发器计数
- `count-old-sot.mjs` / `count-old-out.txt`：老家 `_triggers.py` 只读计数
- `count-legacy.mjs` / `count-legacy-out.txt`：legacy 22 条与重复词
- `count-keys.mjs` / `count-keys-out.txt`：77 键 = 42 读 + 35 写
- `probe-old-bak.mjs` / `probe-old-out.txt`：老家备份复制件只读 intensity/difficulty 分布
- `i39.json` / `i40.json` / `i41.json` / `i14.json` / `i63.json` / `i68.json` / `i1.json`：相关票评论快照
- `s-parity.json` / `s-p1.json` / `s-intensity.json` / `s-jixian.json`：全库评论检索结果
