# 卡路里 HELP 中 py 脚本硬编码扫描

扫描对象：`packages/skill-calorie/src/triggers/scene-*.ts`（436 条＝436 唤醒词，每行一整条 JSON）。
判定串（本文件所有计数共用这一个正则）：`python3?\s|\.py\b|scripts\/|mavis\s|mmx\s`
复算脚本（一次跑出全部数字，`.scratch/` 已被 `.gitignore:5` 忽略）：`.scratch/py-scan/scan.mjs`、`tokens.mjs`、`coverage.mjs`、`buckets.mjs`。
解析复核：10 个场景文件共 436 行逐行 `JSON.parse` 全部成功，零失败（`scan.mjs` 的 `__parseErrors` 为空）。

**一句话结论**：`prompt_template` 与 `main_prompt.text` 各 **0** 条含 py；硬编码全部集中在 `main_prompt.cli`（375 条）与 `data_source`（353 条）。

## 1. 字段级计数

命令：`node .scratch/py-scan/scan.mjs`

| 场景 | 文件 | 条数 | `main_prompt.cli` | `main_prompt.text` | `prompt_template` | `data_source` | `variants[].cli` | 其它文本字段 |
| ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| 01 | scene-01-home.ts | 9 | 9 | 0 | 0 | 9 | 0 | 0 |
| 02 | scene-02-diet.ts | 70 | 55 | 0 | 0 | 54 | 0 | 0 |
| 03 | scene-03-weight.ts | 58 | 49 | 0 | 0 | 49 | 0 | 0 |
| 04 | scene-04-exercise.ts | 39 | 26 | 0 | 0 | 26 | 0 | 0 |
| 05 | scene-05-workout.ts | 32 | 32 | 0 | 0 | 32 | 0 | 0 |
| 06 | scene-06-goal.ts | 25 | 11 | 0 | 0 | 11 | 0 | 0 |
| 07 | scene-07-profile.ts | 4 | 1 | 0 | 0 | 1 | 0 | 0 |
| 08 | scene-08-body.ts | 13 | 6 | 0 | 0 | 6 | 0 | 0 |
| 09 | scene-09-photo.ts | 10 | 10 | 0 | 0 | 10 | 0 | 0 |
| 10 | scene-10-analysis.ts | 176 | 176 | 0 | 0 | 155 | **3**（展开 5 条命令字符串） | 0 |
| **合计** | | **436** | **375** | **0** | **0** | **353** | **3** | **0** |

- 「其它文本字段」＝逐条实测 `html_template`、`desc`、`user_intent`、`name`、`wake_word`、`subfunction`、`category`、`key`、`output_type`、`fill_hints[]`、`aliases[]`、`data_fields[]`、`variants[].label`、`variants[].prompt` —— 全部 **0**。
- 单个判定串的细分（`node .scratch/py-scan/tokens.mjs`）：`python ` **372**／`.py` **372**／`scripts/` **372**（三者同集合）；`mavis ` **3**；`mmx ` **2**（`mmx` 那 2 条同时也含 `python`，是子集）。372＋3＝375。
- 375 条的构成（`node .scratch/py-scan/buckets.mjs`）：`^python scripts/` **370**、`^mavis` **3**、`^mmx` **2**；`^python scripts/render_*.py` **365**。
- 另有 1 条 cli 既非 py 也非唯一出口形态：`scene-06-goal.ts:28`「看目标历史完成」＝`goal_history.list_completed_goals`。所以「cli 不以 `calorie-cmd-read` 开头」＝ **376**（＝375＋1），与 `src/render/helpCenter.ts:25` 注释里的「376/436」一致。
- `data_source` 与 `main_prompt.cli` 的关系：**349** 条逐字相同；**22** 条没有 `data_source` 字段（就是那 22 条 legacy，见第 3 节）；**4** 条两者都含 py 但不相同，且这 4 条 cli 的餐别参数错位（见第 7 节风险）。

## 2. prompt 文本专项

**零。** `prompt_template` 与 `main_prompt.text` 里含脚本命令的条目数都是 **0**（场景 01–10 各场景均为 0）。

怎么判的：
- 判定串同第 1 节正则 `python3?\s|\.py\b|scripts\/|mavis\s|mmx\s`，对 436 条的 `prompt_template` 与 `main_prompt.text` 各跑一遍，命中 0。
- 扩查（`node .scratch/py-scan/promptish.mjs`）另外扫了 9 类可疑写法，结果：`mavis`／`mmx` 0；「脚本」二字 0；`calorie-cmd-read` 0；`.html`／`templates/` 0；`{"` 形式的参数串 0；反引号代码块 0；`chain`／`--chain` 0；「读DB／数据库／DB」**1**（`scene-10-analysis.ts:169`「查卡路里数据」文本写「我要检查数据库的健康性」，是自然语言，不是命令）；`variants[].prompt` 含 py 的 0。
- 反证（说明 prompt 文本本来就是干净的）：`packages/skill-calorie/test/wake-assets-133.test.mjs:68-73` 把 436 条 `prompt_template` 拼起来的长度钉在 `47768`、sha256 钉在 `43a65af8…`；本次扫描的 436 条 prompt 文本没有被这条指纹排除在外，说明「prompt 里没有 py」是现行数据既有的事实，不是扫描口径漏判。

## 3. HELP 的出口是哪几个字段

三条出口，字段各不同：

| 出口 | 显示哪些字段 | 出处 |
| ---- | ---- | ---- |
| `calorie.help.lookup`（查找命令） | `wake_word` / `category` / `key` / `cli` / `desc` | `src/cli/cmd_read.ts:839-852`（`:845-849` 组装五字段）；命中由 `src/triggers/help-lookup.ts:112-175` `searchHelp` 造；其中 `cli` 走 `src/triggers/help-lookup.ts:100-104` `execCliFor(key, t.main_prompt.cli)`——即 `:74-98` 的 `HELP_EXEC_OVERRIDES`（**23 条**）替换，**没有覆盖到的原样回 `main_prompt.cli`**；页面由 `src/render/html.ts:242-246` `renderHelpLookupHtml` 渲染，`h.cli` 落进 `<pre>`（`:223-227` `helpRowHtml`） |
| HELP HTML 速查台（`calorie.help.center`，须显式 `mode`） | 卡面 `id`／`title`／`wake_word`／`prompt_template`／`types`，详情层再加一行 `editable_fields`「可执行命令」 | 投影在 `src/render/helpCenter.ts:220-250`：新场景 `id` 取 `key`（`:222-228`，不含 py）；**22 条 legacy `id` 取 `main_prompt.cli` 原文、`prompt_template` 取 `main_prompt.text`**（`:236-246`，`:242` 与 `:246`）；详情层那一行由 `:112-123` `helpSceneCli`→`cliFields` 从 `triggers/routing.ts` 路由层取，恒 `calorie-cmd-read calorie.*` |
| 交付给用户的 HELP 文件（`calorie.help.center` 不带 `mode`） | 只用 `WAKE_GROUPS` 的 `id`／`title`／`wake_word`／`prompt_template`／`types`，**完全不读任何 cli 字段** | `src/cli/cmd_read.ts:810-818` → `src/render/helpFile.ts:52-72`（`:54` 直取 `WAKE_GROUPS`，`HelpFileData` 五字段见 `:34-40`，没有 cli 位） |

- `packages/skill-calorie/SKILL.md` 的命令表：来自构建期注入，源是 `dist/cli/keys.js` 的 `CALORIE_COMBOS`，由 `packages/skill-calorie/scripts/build-help.mjs` 重写 `<!-- HELP-AUTO-START -->`（`SKILL.md:79`）到 `<!-- HELP-AUTO-END -->`（`SKILL.md:184`）之间。实测该段 101 行表格**全部**是 `calorie-cmd-read calorie.*`，`python|mavis|mmx` 命中 **0**。全文只有 2 处命中，都在正文说明文字里：`SKILL.md:33`、`SKILL.md:190`（「老家 python 原命令备查」）。
- AI 实际执行时读的是 `packages/skill-calorie/SKILL.md`（技能入口文档；`docs/skills/skill-calorie/` 下没有任何命令表，不参与执行）。所以命令表本身是干净的，py 不会从这条路漏给 AI。

## 4. 用户会看到什么

用临时库实跑（命令与回显，`node .scratch/py-scan/run-lookup.mjs "查档案"` ；`SKILLS_DB_PATH=$env:TEMP\py-scan-db`）：

```
$ calorie-cmd-read calorie.help.lookup --params '{"q":"查档案"}'      # exit=0
{"data":{"items":[{"wake_word":"查档案","category":"基础信息","key":"profile_view",
 "cli":"python scripts/render_crud_view.py --entity profile --chain \"1.识别→2.读DB→3.算TDEE\"",
 "desc":"查看档案及最新体重与身体指标"}],"total":1,
 "output":"…\\calorie_html\\唤醒词HELP_20260911_225614.html"}}
```

这份 `唤醒词HELP_*.html` 里，该条渲染成（`Select-String` 命中片段，实际是单行 HTML）：

```
…<div class="ilife-item"><b>查档案</b> <span …>profile_view</span><div>查看档案及最新体重与身体指标</div>
<pre>python scripts/render_crud_view.py --entity profile --chain &quot;1.识别→2.读DB→3.算TDEE&quot;</pre>
<div class="ilife-action-bar">…</div></div>…
```

即**用户肉眼看到一行 py 命令，旁边还有按钮照着这条命令原样复制**（`src/render/html.ts:223-227`，`copyActionHtml(cli)`）。同一份 HTML 里 `看高热量榜` 一次出现 4 条 py 命令（4 个唤醒词各一行）。

三份产物的实测条数（各跑一次，`node .scratch/py-scan/run-helpcenter.mjs`）：

| 产物 | 大小 | `python` 出现 | `mavis` 出现 | 用户看得见吗 |
| ---- | ---- | ---- | ---- | ---- |
| `calorie.help.center` 缺省 → `卡路里_HELP_*.html` | 297185 B | **0** | **0** | 干净 |
| `calorie.help.center --params '{"mode":"file"}'` → `卡路里_速查台_*.html` | 1264952 B | **58** | **12** | 22 条 legacy 卡面上是 py／mavis，`data-scene-id`、`<code class="ilife-help-shell-cli">`、复制按钮的 `data-t` 三处都是它 |
| `calorie.help.center --params '{"mode":"text"}'` → `卡路里_速查台_*.html`（文本态） | 24989 B | **19** | **3** | 纯文本索引里写成「今日复盘 · python scripts/render_review.py --type day」 |

速查台那 58／12／19 的来源就是 `src/render/helpCenter.ts:242` 把 22 条 legacy 的 `id` 直接设成 `main_prompt.cli`（22 条卡 × 每卡 2–3 处出现）。缺省 HELP 文件是 0，因为它走 `helpFile.ts` 那条不读 cli 的路。

## 5. 例子清单

| # | 唤醒词 | 场景 | 字段 | 原文（截断） | 位置 |
| ---- | ---- | ---- | ---- | ---- | ---- |
| 1 | 看今日主页 | 01 | `main_prompt.cli`＋`data_source` | `python scripts/render_home.py --chain "1.识别→2.读DB聚合→3.渲染"` | `scene-01-home.ts:5` |
| 2 | 看高热量榜 | 02 | `main_prompt.cli`＋`data_source` | `python scripts/render_food_ranking.py --category high_calorie --top-n 10 --days 7 --chain "1.识别→2.读DB→3.渲染"` | `scene-02-diet.ts:43` |
| 3 | 拍营养表记一餐 | 02 | `main_prompt.cli`＋`data_source`（多步串，含 `mmx`） | `mmx vision describe <图片> → python scripts/render_nutrition_label.py --ai-json <json> → 确认后 python scripts/calorie_tracker.py add` | `scene-02-diet.ts:9` |
| 4 | 对比体重：最近 30 天 vs 之前 30 天 | 03 | `main_prompt.cli`＋`data_source` | `python scripts/render_weight_compare.py --scenario a1 --chain "1.识别→2.读DB→3.对比→4.渲染"` | `scene-03-weight.ts:38` |
| 5 | 看今日运动 | 04 | `main_prompt.cli`＋`data_source` | `python scripts/render_exercise_summary.py --mode records --today` | `scene-04-exercise.ts:18` |
| 6 | 定训练计划 | 05 | `main_prompt.cli`＋`data_source` | `python scripts/render_plan_receipt.py --live-plan-set --plan-json <JSON> --chain "1.采访→2.预览确认→3.写库→4.回执"` | `scene-05-workout.ts:15` |
| 7 | 查档案 | 07 | `main_prompt.cli`＋`data_source` | `python scripts/render_crud_view.py --entity profile --chain "1.识别→2.读DB→3.算TDEE"` | `scene-07-profile.ts:8` |
| 8 | 看体脂 | 08 | `main_prompt.cli`＋`data_source` | `python scripts/render_body_composition_view.py --mode list --source <皮褶钳/健身房/医院/全部> --chain "1.识别→2.读DB→3.渲染"` | `scene-08-body.ts:10` |
| 9 | 生成身材照GIF | 09 | `main_prompt.cli`＋`data_source` | `python scripts/render_body_photo_gif_result.py --tag <标签> [--start <D> …] --chain "1.识别→2.选照片→3.合成→4.渲染"` | `scene-09-photo.ts:10` |
| 10 | 查热量趋势（变体 0/1/2） | 10 | `variants[].cli` | `python scripts/render_calorie_trend.py --days 7`／`--start 2026-07-01 --end 2026-07-31`／`--days 30` | `scene-10-analysis.ts:172` |
| 11 | 看「有备注」的饮食记录 | 02 | `main_prompt.cli`（legacy，会显示在速查台卡面） | `python scripts/render_today_meals.py --with-note --days <N> --chain "1.识别→2.读DB→3.渲染"` | `scene-02-diet.ts:74` |
| 12 | 关闭定时复盘 | 10 | `main_prompt.cli`（legacy，`mavis`，不是 python） | `mavis cron delete ...` | `scene-10-analysis.ts:160` |

## 6. 修法面

只列会动的：

**a) 数据源（必须改）**
- `packages/skill-calorie/src/triggers/scene-01-home.ts` … `scene-10-analysis.ts`：375 条 `main_prompt.cli`（＋对应 `data_source` 353 条）改成 `calorie-cmd-read calorie.*`。10 个文件全动。
- `packages/skill-calorie/src/triggers/help-lookup.ts:74-98`：`HELP_EXEC_OVERRIDES` 里那 22 条 py 触发词改干净后，这张补偿表就没有存在理由，可一并清掉（连同 `:100-104` `execCliFor` 的分支）。
- `packages/skill-calorie/src/triggers/routing.ts`：**不动**也为零风险（该文件本来就 `python` 命中 0；`routing.ts:737` 那一处命中是注释里的文档路径）。但如果新的 cli 文本与路由层 cli 要逐字相等，就得同步这 341 条 exec 记录。

**b) 会被钉死的测试挡住或必须同步改（6 个文件）**
- `test/calorie-triggers.test.mjs:13-24, 41-48`：`canon()` 把 `main_prompt.cli` 与 `data_source` 原文算进 sha256，与 `test/calorie-sot.snapshot.json` 的 `entry_sha` 逐条比对（436 条）。**必红**，须重算快照。仓里没有生成脚本（`.tmp` 为空），快照得手改或另写生成命令。
- `packages/skill-calorie/test/help-center-106.test.mjs:78-84`：断言「SoT 原文里确实有 353 条死命令」写作 `assert.ok(dead.length > 300, …)`，其中 `dead` ＝ cli 以 `python|mavis|mmx` 开头的条数。清干净后 `dead.length` 变 0，**必红**，须删掉这段鉴别力断言。
- `test/calorie-routing-81.test.mjs`：整条路由表按 cli 原文反推，**必红**，且是最大的一处。
  - `:143-150` `WIZARD_WORDS` 由「cli 含 ` → `」反推，实测 7 条多步串（`buckets.mjs` 输出全量）。
  - `:151-155` 要求 `"source":"home_caliper"` 恰好只出现在 1 条 cli。
  - `:164-186` 若新 cli 以 `calorie-cmd-read calorie.` 开头，就进 `:176-180` 分支，要求路由层 `r.cli` 与冻结 cli **逐字相同**（341 条里的大部分都要同步）。
  - `:230-238` `frozenExecKeys.size === 43`；`:227` `NEW_KEY_ROUTES.length === 56`；`:259-278` `COVERAGE_REPAIR_ROUTES` 由 cli 反推。
- `packages/skill-calorie/test/help-center-88.test.mjs:113-121`：`legacy id = main_prompt.cli 原文`。这条**是自洽断言**（`scene.id` 与 `main_prompt.cli` 比对，不含字面量），只要改完后 `id` 仍取 cli 就**不会红**；但 `:132-136` 那三条 prompt 断言不受影响。
- `packages/skill-calorie/test/wake-assets-133.test.mjs:68-73`（47768 字＋sha256）：`prompt_template` 不动就**不会红**。只有顺带改 prompt 文本才会。
- `packages/skill-calorie/src/triggers/wake-assets.ts`（255 KB，机器生成的 436 条实物资产）：字段只有 `id/title/wake_word/status/prompt_template/types`，**没有 cli 位**，改 cli 不用动它。全文件 `python|mavis|mmx` 只在 `:6`、`:13` 两行注释里（提老家 `_triggers.py`）。

**c) 不用动**
- `packages/skill-calorie/SKILL.md`（自动注入段实测 0 处 py，由 `scripts/build-help.mjs` 重写，源是 `dist/cli/keys.js`）。
- `src/render/helpCenter.ts`、`src/render/helpFile.ts`、`src/render/html.ts`、`src/cli/cmd_read.ts`：这几处都已经是「取路由层／取 WAKE_GROUPS」，不读 `main_prompt.cli` 原文（除 `helpCenter.ts:242/246` 那两行 legacy 投影，改不改都能自洽）。唯一要顺带改的是 `helpCenter.ts:25-29` 的注释数字（现在写「376/436」）。

## 7. 例外与风险

- **必须保留脚本的条目：无。** 436 条里没有一条的语义是「跑这条 py」。`mavis cron create/delete/list`（`scene-10-analysis.ts:160/163/170`）看起来最像运维命令，但本仓 `routing.ts` 已经把它们判成「没有命令可执行的唤醒词」（`NON_EXEC_REASONS` 里的 legacy-chain），并不依赖 py。
- **风险 1（口径冲突，须裁决）**：`help-center-106.test.mjs:78-84` 现在**明确要求** SoT 里保留 300 条以上的死命令，用来证明「路由层没有照抄原文」这件事有鉴别力。清干净 cli 就等于删掉这条测试的前提——是「改测试」还是「改成断言等于 0」，需要人来定。
- **风险 2（连带面大）**：`calorie-routing-81.test.mjs` 用 cli 原文反推 5 组常量（多步串 7 条、皮褶钳 1 条、既有入口 43 条、新拟入口 56 条、覆盖修复 1 条）。把 375 条 cli 改写成唯一出口形态后，这 5 组都要重新推导，工作量比改数据本身大。
- **风险 3（数据本身有错，顺手记一笔）**：`scene-02-diet.ts:70-73`「看午餐／看晚餐／看加餐／看全部餐别分布（最近 7 天）」4 条的 `main_prompt.cli` 餐别参数整体错位一拍——「看午餐」的 cli 写的是 `--meal breakfast`、「看晚餐」写 `--meal lunch`、「看加餐」写 `--meal dinner`、「看全部」写 `--meal snack`；而同一 4 条的 `data_source` 是对的（`lunch/dinner/snack/all`）。参照 `:69`「看早餐」＝`--meal breakfast` 可确认是 cli 侧错位。这 4 条本来就在要改的 375 条里，改的时候别把 `data_source` 的正确值丢掉。
- **风险 4（不确定，标推测）**：`data_source` 是否还有别的读者（例如交付管线按它挑模板），本次只扫了 `triggers/`、`render/`、`cli/` 三处，**推测**没有更多。另外，这批数据的历史决策还散在别处文档（代码注释里频繁引用 `docs/research/t8*.md`、`t10*.md` 以及台账条目 L-18／L-19），改之前值得先读那几份，本次没读。
