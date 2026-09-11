# t163 · 场景 07 基础信息 4 条唤醒词：老新对账（防幻觉词）

- 票：#163（wayfinder 图 #152 的 frontier 票）· 本文件只做**对账**，不做页面设计、不碰 issue、不写代码
- 老技能（唯一权威基线，只读）：`D:\2Study\StudyNotes\SKILLS\卡路里\`；新仓：`D:\ilife`（分支 `master`，HEAD `057b723`）
- 对账口径：老技能侧以 **prompt 定稿快照 `docs/scene-prompts/07-基础信息.md` 优先**（该文件自述「`_triggers.py` 仅为衍生副本」）；新仓侧以 `src/`、`test/` 为准
- 证据写「文件:行号」；取不到实物证据的写「未证实」
- **本版为返工版**：对抗式复核见 `.scratch/t163/review-reconcile.md`。文中标「红队」的结论出自该报告，其余为本版自取；返工针对 D1–D8（红队缺陷清单）

---

## 一、总表

| 唤醒词 | 老技能当年怎么做 | 新仓今天现状 | 归类 | 差什么 |
|---|---|---|---|---|
| **设置档案** | 写后回执 `templates/crud_receipt.html`；命令 `render_crud_receipt.py --live-profile-set …`；prompt **4 空位** ＋「如果我没说全,请一项一项问我」；老 `SKILL.md:1036` 标「已实现」 | `routing.ts:392`（`kind:'exec'`）／`calorie.profile.set`／`keys.ts:44` `receipt`／`write.ts:760-785` → `receiptHtml()`（`write.ts:196`）／HELP 类型 `['回执']`（`wake-assets.ts:2926`）／`cmd-write-40-persist.test.mjs:442-467` | 写前需收齐并确认（**对话即可达成**）；写前页＝**可选增强**，本图按地图 Destination 出（§三） | 回执缺 **性别／推荐活动量／设置时间**（§2.1）；「日常活动情况」自由文本 → 5 档的规则已定死，只剩系数怎么摆 |
| **设活动量** | 写后回执 `crud_receipt.html`；`render_crud_receipt.py --live-profile-activity <level>`；prompt **1 空位**、**不含**先问；老技能**能跑** | `routing.ts:393`／`calorie.profile.activity`／`keys.ts:45` `receipt`／`write.ts:787-793`／HELP `['回执']`（`wake-assets.ts:2936`）／`cmd-write-40-persist.test.mjs:454-457` | 同上（本图出「选值 ＋ 看系数影响」页） | 回执缺 **活动系数与每日消耗影响**（§2.2） |
| **改档案** | 写后回执 `crud_receipt.html`；`render_crud_receipt.py --live-profile-update --field <X> --value <Y>`；prompt **5 空位** ＋「改之前请先确认我原来的值」 | `routing.ts:394`／`calorie.profile.update`／`keys.ts:46` `receipt`／`write.ts:760-785`（同一 case，也收 `fields:{}` 多字段）／HELP `['回执']`（`wake-assets.ts:2968`） | 同设置档案 | 回执缺 **改前／改后对比与影响提示**（§2.3） |
| **查档案** | 读视图 `templates/crud_view.html`；`render_crud_view.py --entity profile`；prompt **0 空位**、不含先问；有 fixture，**能跑** | `routing.ts:395`／`calorie.view.profile`／`keys.ts:107` `stat`（title 档案视图）／`cmd_read.ts:1014-1021` → `buildProfileView`（`profilePlate.ts:21-33`）＋ `renderProfileHtml`（`html.ts:643-647`）／HELP `['结果']`（`wake-assets.ts:2952`）／`render-t41.test.mjs:222-251` | **读类，无写前页** | 结果页缺 **BMI／BMR／TDEE／活动系数／档案创建·更新时间**（§2.4） |

**新仓公共口径（4 条共用）**：envelope 六形状 `list/detail/stat/receipt/analysis/fallback`，**没有 `process`**（`packages/base-link-core/src/envelope.ts:9-10`）；落盘名 `<title>_<类型中文>_<TS>[_N].html`，写类一律 `_回执_`，读类不加类型段（`output.ts:112-113`、`OUTPUT_TYPE_LABELS:245`、`sceneTypeFor:249-252`）。实测落盘名与之一致（§四）。

**漂移登记（新仓内部，红队 D8）**：`src/triggers/scene-07-profile.ts:8` 里「查档案」的 `main_prompt.cli` 与 `data_source` **仍是老 python 命令** `python scripts/render_crud_view.py --entity profile --chain "1.识别→2.读DB→3.算TDEE"`，而同一条词在 `routing.ts:395` 已是 `calorie-cmd-read calorie.view.profile`（同文件另 3 条已换成本仓新命令）。**后果**：本仓 `calorie.help.lookup` 会把那句老命令回给用户——路径 `cmd_read.ts:842` `searchHelp(TRIGGERS,q)` → `help-lookup.ts:100-104` `execCliFor` 只用 `HELP_EXEC_OVERRIDES`（`help-lookup.ts:74-98`）里登记过的条目替换，**没有 `profile_view`**，故原样返回。本版实跑复现：`查档案 | key=profile_view | cli=python scripts/render_crud_view.py --entity profile --chain …`（另 3 条均回 `calorie-cmd-read …`，红队实跑同结论）。**新仓正确来源是 `routing.ts:392-395`。**

---

## 二、逐条展开（「差什么」一律照定稿快照的「呈现数据」逐项比）

### 2.1 设置档案

- 老技能：`_triggers.py:2491-2500`（`html_template` `crud_receipt.html` `:2498`、`output_type` `receipt`、cli `render_crud_receipt.py --live-profile-set --age <A> --gender <G> --height <H> --activity <L>` `:2494`）；prompt 原文含「如果我没说全,请一项一项问我,并根据我的日常情况推荐合适的活动量」＋ 4 个空位（`:2494`／`:2498`）。三处来源一致：定稿快照 `07-基础信息.md:22-24`、台账 `docs/research/t71-old-trigger-records.csv:234`。落盘 `render_crud_receipt.py:931` `'live_profile_set': ('设置档案','receipt')`。
- 模板实物是**写后**页：`crud_receipt.html:137`「回执型 · 通用 CRUD」、`:155-157`「📋 字段变更」卡、`:444-450` `payload.diff[k]={before,after}` 由写库后记录装配。
- **当年是否真渲染过**：脚本侧齐备、老 `SKILL.md:1036` 标「已实现」，但 `calorie_html/` 只剩 2 个 HELP 产物 ＋ 1 个 json，无 `设置档案_回执_*.html`／`设置档案_过程_*.html` → **未证实**，不再追问（登记即可）。
- **差什么**（照 `07-基础信息.md:23`「呈现数据：身高/年龄/**性别**/活动量 ＋ **自动推荐活动量** ＋ **设置时间**」）：今天回执摘要只拼 身高／年龄／活动量（`write.ts:783`），实测产物**缺性别、推荐活动量、设置时间**三项（红队 D3 实测 245 B，message＝`已设置档案（身高 175 · 年龄 30 · 活动量 moderate）`）。
- **推荐规则已定死，不必裁定**（红队 D2）：逐项询问补齐 ＋ 按日常活动情况推荐档位 ＋ **说明推荐理由** ＋ 系数 `1.2/1.375/1.55/1.725/1.9` **必须展示**——老 `SKILL.md:2103` 逐字；`07-基础信息.md:16` 亦记「采访式引导 = 设置档案 默认交互」。落地细节只剩「5 个系数在页面上怎么摆」。
- 「日常活动情况」是自由文本，而命令只吃 5 档枚举（`fetch/profile.ts:22-35` `ACTIVITY_ALIASES`／`ACTIVITY_LEVELS`，非法值抛错 `:35`）。

### 2.2 设活动量

- 老技能：`_triggers.py:2501-2510`（cli `--live-profile-activity <level>`）；prompt（`:2504`）只有 1 空位「我的活动量(久坐/轻度/中度/活跃/高度活跃):____」，**无先问／先确认措辞**。老 `SKILL.md:669` 写的功能是「只设活动量(5 档)，**显示系数变化与影响**」。测试 `tests/test_profile_activity.py` 覆盖 `profile.set_activity_level()` → **能跑**。
- 新仓：`routing.ts:393`／`calorie.profile.activity`／`write.ts:787-793`（回执句 `:791`「已设活动量：旧→新」）／HELP `['回执']`（`wake-assets.ts:2936`）；测试 `cmd-write-40-persist.test.mjs:454-457`、`cmd-write-40.test.mjs:235`（`activityLevel:'乱填'` → exit 4）。
- **差什么**（照 `07-基础信息.md:38`「呈现数据：活动等级 ＋ **影响(TDEE 系数)**」）：今天回执只有「旧→新」，**缺系数与每日消耗影响**（红队 D3 实测 214 B／`已设活动量：moderate→active`）。最省事落点＝**回执自带**（旧→新 ＋ ×系数 ＋ ΔTDEE），老技能只要求展示、没要求另开页（红队 A 条）。
- 未证实：这条词在老技能里有没有过程型产物——老 `scripts/*.py` 里按「过程」命名的场景产物只有 `render_profile_setup.py:108` 一处（§六），且 `calorie_html/` 无 `设活动量_回执_*.html`。

### 2.3 改档案

- 老技能：`_triggers.py:2511-2520`（cli `--live-profile-update --field <X> --value <Y>`）；prompt（`:2514`）「**改之前请先确认我原来的值**」＋ 5 个空位；`SKILL.md:1040` 要求「逐字段显示改前/改后 ＋ 影响提示」；测试 `tests/test_profile_activity.py:148-186` → **能跑**。
- 新仓：`routing.ts:394`／`calorie.profile.update`／`write.ts:760-785`（同一 case，字段允许清单 `age/gender/heightCm/activityLevel/note` `:777-780`，也接受 `fields:{}` 一次改多个）；HELP `['回执']`（`wake-assets.ts:2968`）。
- **差什么**（照 `07-基础信息.md:50`「呈现数据：**改前/改后** ＋ **影响提示**」）：今天回执是写后摘要（`write.ts:783`），**缺改前／改后对比与影响提示**（实测 237 B／`已改档案（身高 176 · 年龄 30 · 活动量 active）`）；老 `crud_receipt.html:155-157`、`:444-450` 的字段变更卡在本仓无对应物（`write.ts:196-202` 只出摘要 ＋ op ＋ id ＋ items）。
- 档案不存在时报错即可、不做兜底（用户 2026-09-11 裁定，`.scratch/wayfinder-s1/tickets-07.md:12`）；新仓一致：`profilePlate.ts:23` 抛 `missing-data '未设档案…'`。

### 2.4 查档案

- 老技能：`_triggers.py:2521-2530`（`output_type` `result`、cli `render_crud_view.py --entity profile`；`data_fields` `:2529` 列 `bmi/bmr/tdee`）；prompt（`:2524`）**0 空位**、不含先问。渲染器 profile 分支给 **12 个字段**：`render_crud_view.py:91-104`（年龄／性别／身高／活动量／**活动系数**／最近体重／**最近 BMI**／**BMR(Mifflin-St Jeor)**／**TDEE**／**档案创建**／**档案更新**／备注；BMR／BMI／TDEE 算式 `:59-73`）。fixture `tests/fixtures/mock/mock_crud_view_profile.json` 存在 → **能跑**。
- 新仓：`routing.ts:395`／`calorie.view.profile`／`keys.ts:107` `stat`；`cmd_read.ts:1014-1021` → `buildProfileView`（`profilePlate.ts:21-33`：档案 ＋ 营养目标 ＋ 最新体重）→ `renderProfileHtml`（`html.ts:643-647`：**5 张 KPI**＝档案视图／活动量／备注／目标／最新体重）；HELP `['结果']`（`wake-assets.ts:2952`）。
- **差什么**（照 `07-基础信息.md:67`「呈现数据：档案字段(含活动量) ＋ 最新体重 ＋ **BMI/BMR/TDEE(含系数说明)**」；票 4 的 Destination `tickets-07.md:117` 同要求）：实测产物 1286 B／正文 1236 字符，**缺 BMI／BMR／TDEE／活动系数／档案创建·更新时间**共 5 项（老页 12 字段 vs 新页 5 张 KPI）。**这一条会挡票 4**（红队 C 条）。
- 空库态：exit 4「未设档案（user_profile#1 缺失，先设置档案）」＝用户已裁定行为（`tickets-07.md:12`、`:131`）。

---

## 三、写前页是「必需」还是「可选」：规则层依据（红队 D1／D7）

**规则层只说三条写词需要预检确认页，而这 4 条都不在其中。**

- 本仓技能契约 `packages/skill-calorie/SKILL.md:49-75`「Wizard Verify 铁则」**只点名三组**词：`记体脂（皮褶钳）／记体脂（外部测量）／补记体脂`、`记围度／补记围度`、`定训练计划`（`:59-63`）；`:11` 的定义句也只写「记体脂／记围度／定训练计划类」。**设置档案／改档案／设活动量不在这份名单里。**
- 同一节 `:71` 明写：写前页未到位时**改用文字确认**——逐字复述待写字段并请求确认，确认完再调会改数据库的命令。即「先确认」**不需要靠页面承载**。
- 老技能侧三处反证：`SKILL.md:1038`「AI 采访式引导逐项询问(**或** profile_setup.html --live 配置页辅助)」、`:1044`「**或** AI 逐项采访询问」、**`:1045`「AI 解析后直接调 `render_crud_receipt.py --live-profile-set`，无需配置页」**。
- `t81` 的需多步交互名单只有 5 条（批量导入食品／校验批量导入／定营养目标(自动算)／定饮水目标(自动算)／一键定全套目标），**不含**设置档案（`docs/research/t81-route-evidence.md:907-911`）；本仓也把 4 条都标 `kind:'exec'`（`routing.ts:392-395`）。

**所以：三条写词的写前页是可选增强，不是「跑得通」的前提。** 真正必需的是 ①写前把字段收齐并确认（对话即可达成）②产物把老场景规格要呈现的东西摆出来（§二各条）。

**但本图仍要做它**，因为地图 Destination 把「写类流程先出过程型 HTML」写进了目标本身（`.scratch/wayfinder-s1/maps/map-07-基础信息.md:3`：「说唤醒词 →（写类流程先出过程型 HTML）→ 复制 prompt → AI 用命令执行 → 拿到结果型 HTML 落盘」），票面也逐条要求写前页（`tickets-07.md:45` 设置档案／`:48` 改档案／`:71-106` 票 3 设活动量）。**这是用户裁定的目标，不是我们自选。**

**现成先例（本仓已有，形态可直接复用）**
- `src/render/wizardPort.ts`（文件头 `:1-21` 写明「prompt 复刻口径：旧模板 buildPrompt/generatePrompt 逐字结构，新 CLI 形态」——即**红队 D7 问的「复制给 AI 的文本用哪一种」已有口径**：参数段 ＋ 命令段，命令段译成 `calorie-cmd-read` 同形）。
- `src/render/wizardPortDocs.ts:41` `DOC_SHELL`（整页文档骨架）。
- 四条已登记命令：`calorie.view.measure-wizard`／`calorie.view.composition-wizard`／`calorie.view.photo-log-wizard`／`calorie.view.gif-planner`（`routing.ts:671-674`）。
- 测试 `test/wizard-86.test.mjs`（红队：9 用例，含命令段新 CLI／复制属性／空库照开）。
- **边界**：那 4 张页服务的是 M6 点名的场景，设置档案／改档案／设活动量**不在其中**——本图若复用，是**新开一组**，不是接 M6。
- **落成什么类型**：本仓 `sceneTypeFor`（`output.ts:249-252`）今天只会返回 `receipt` 或 `null`，`OUTPUT_TYPE_LABELS` 虽含 `process:'过程'`（`:245`）但**今天没有任何命令走到它**。所以写前页今天**拿不到 `_过程_` 落盘名**，要按本仓口径另定。

---

## 四、产物实跑（红队 D3／D4；临时库，真库未触碰）

| 唤醒词 | 命令 | exit | 产物 | 大小 | message |
|---|---|---|---|---|---|
| 设置档案 | `calorie.profile.set` | 0 | `设置档案_回执_20260911_211716.html` | 245 B | `已设置档案（身高 175 · 年龄 30 · 活动量 moderate）` |
| 设活动量 | `calorie.profile.activity` | 0 | `设活动量_回执_20260911_211716.html` | 214 B | `已设活动量：moderate→active` |
| 改档案 | `calorie.profile.update` | 0 | `改档案_回执_20260911_211716.html` | 237 B | `已改档案（身高 176 · 年龄 30 · 活动量 active）` |
| 查档案（有档案） | `calorie.view.profile` | 0 | `档案视图_20260911_211716.html` | 1286 B | （无） |
| 查档案（空库） | `calorie.view.profile` | 4 | 无 | — | stderr `未设档案（user_profile#1 缺失，先设置档案）` |

出处 `.scratch/t163/e2e-log.txt`（红队实跑；落盘名与 `output.ts:112-113`／`:249-252` 口径一致：3 条写词带 `_回执_`，查档案不加类型段）。

**产物族（红队 D4）**：4 份产物首段都是 `<section class="ilife-page" …`，`<!doctype` = **false**、`charset` = **false**（`e2e-log.txt`）。`render/html.ts:38-45` `pageShell()` 产出的本来就是 `<section>`；`render/envelope.ts:157-167` 判族规则：含 `<!DOCTYPE` → `doc-shell`，否则 → `fragment`；今天 3 条写词自报 `receipt`，查档案自报 `fragment`。对照 `test/delivery-83.test.mjs:138` 只对 HELP 断言整页 `<!DOCTYPE html>`。片段在浏览器里能被补全显示，**未证实是挡点**。

> **本图第一个待拍板项**：用户肉眼验收是否接受片段。若要求双击即开的整页，4 条都要改成整页文档（先例 `wizardPortDocs.ts:41` `DOC_SHELL`）。

---

## 五、数字口径（会被别人引用，逐条写清）

- **数据源**：`D:\2Study\StudyNotes\SKILLS\卡路里\scripts\_triggers.py`（只读）。**条目数（`TRIGGERS` 长度）= 436 条**，其中 **`prompt_template` 非空的只有 414 条**（其余为空），另 5 个附加说法在 `variants` 里 → 唤醒词总数 441。**436 是条目数／唤醒词数，不是模板数**——上一版写「436 条 `prompt_template`」有误（红队 D5）。
- **匹配词表（逐字，可复现）**：窄 = `一项一项问|逐项问|先问|先确认`；中 = 窄 ＋ `请问我|问我补齐|请先问我`；宽 = 中 ＋ `请先|确认后|确认一下|问我|询问`。
- **命中：窄 10 ／ 中 15 ／ 宽 34**（本版自跑 `.scratch/t163/scan-prompts.py` 复现，红队同值）。场景 07 的 设置档案／改档案 在三种口径下**全部命中**且模板确为写后回执 `crud_receipt.html`；设活动量／查档案**不命中**（`_triggers.py:2504`／`:2524` 无先问／先确认措辞）。
- **「12 条写后回执」改为 9 条**：存档那 14 条（`docs/skills/skill-calorie/core-approach.md:167`、`.scratch/wayfinder-s1/wizgap.txt:6`）逐条按模板族拆＝2 条写前页（`plan_builder_wizard.html`／`body_composition_wizard.html`）＋ 2 条读类（`exercise_goal_view.html`）＋ 1 条**结果型**（生成身材照GIF，`body_photo_gif_result.html:59` 自述「结果型 · 生成身材照 GIF」）＋ **9 条写后回执**（`crud_receipt.html` 6 条：记一餐／记一餐（含备注）／补记饮食／记喝水／设置档案／改档案；`body_photo_receipt.html` 3 条：记身材照 ×2／改照片标签）。
- **两个「10」不是一个集合**：上一版 §四结论一用「10」指窄口径命中，§四结论三又用「10」指写类写后回执——后者应为 **9**。本版改用「窄口径命中 10 条」与「写类写后回执至多 9 条」两个名字。
- 存档的 14 条**任何一个口径都复现不出**（它收了只有「问我补齐」的记一餐，却漏了命中「先确认」的下架食品；两个口径混着写）→ 只当线索用，别当事实引用。

---

## 六、`profile_setup.html` 与 `crud_receipt.html`：「一页还是两页」

**结论：同一场景、两张产物；唤醒词表侧登记的是「回执页」，写前配置页只在旁路存在（「或」的备选）。**

1. 三处独立来源一致把「设置档案」挂在回执页：`_triggers.py:2498`、定稿快照 `07-基础信息.md:22-24`、台账 `t71-old-trigger-records.csv:234`。台账 `t71-old-baseline-inventory.md:204` 说「设置档案 → `render_profile_setup.py`」不是唤醒词表的说法。
2. `profile_setup.html` 确实是「设置档案」的写前配置页：`:74` `<h1>👤 设置档案</h1>`、`:79` `<form id="configForm"></form>`、`:83-88` 复制 prompt 按钮；渲染器 `render_profile_setup.py:34-85`（live 预填 ＋「当前值已预填,改完复制 prompt 给 AI」`:51`）、`:108` 落盘 `html_scene_path(..., '设置档案','process')` → `设置档案_过程_<TS>.html`。
3. **没有任何唤醒词引用它**：`_triggers.py` 内 `render_profile_setup|profile_setup\.html` 命中 **0 次**；全旧树递归里该脚本名除自身 docstring 外只出现在 `.scratch` 内部文档。
4. **唯一把它写进操作说明的是 `SKILL.md` 三处散文，且都是「或」**：`:187`／`:1038`／`:1044`。
5. **换点**：`git log -S 'live-profile-set'` → `1c354a52`（2026-08-02）把 `cli`／`html_template`／`data_source` 从 `render_profile_setup.py`／`profile_setup.html` 改指 `render_crud_receipt.py --live-profile-set`／`crud_receipt.html`。
6. **类型命名扫描**：老 `scripts/*.py` 里按「过程」命名的场景产物**只有 `render_profile_setup.py:108` 一处**；其余场景命名全是 `result`／`receipt`。

**动作意义**：那张页字段＝年龄／性别／身高／活动量／备注，**可以当写前页的复用来源**；但**不能说**「老技能当年交付的就是这张页」——表里登记的是回执页。照搬要改两处：①它的 prompt 生成物是命令行 `calorie_tracker.py profile set {age} …`（`render_profile_setup.py:77`），要换成本仓 `calorie-cmd-read calorie.profile.set --params '{…}'`；②它的类型段是「过程」，而本仓 envelope 六形状没有 `process`，且 `sceneTypeFor` 今天不返回 `process`（§三末条），落成什么命令＋什么 HELP 类型要按本仓口径定。

---

## 七、结论

**A. 4 条词各自最省事的跑通路径**

| 唤醒词 | 最省事跑通路径 | 写前页 |
|---|---|---|
| 设置档案 | AI 逐项问补齐（老 `SKILL.md:2103` 规则）→ `calorie-cmd-read calorie.profile.set --params '{…}'` → 回执落盘（实测 exit 0）＋ **把性别／推荐活动量／设置时间补进回执** | 可选；本图按 Destination 要做 |
| 设活动量 | 直接 `calorie.profile.activity`（实测 exit 0）＋ **把系数与影响补进回执**（旧→新 ＋ ×系数 ＋ ΔTDEE，不必另开页） | 可选，最弱 |
| 改档案 | 先 `calorie.view.profile` 取当前值 → 文字复述「改前→改后」请确认（`SKILL.md:71` 先例）→ `calorie.profile.update --params '{"fields":{…}}'` | 可选；本图按 Destination 要做 |
| 查档案 | 直接 `calorie.view.profile`（实测 exit 0；空库 exit 4 是已裁定行为）＋ **补齐 5 项字段** | 不适用（读类） |

**B. 是否真需要 3 类产物**：最少可压到 **2 类**——1 类写前页（同一骨架换配置）＋ 1 类查档案结果页。三条写词的差异只在数据（字段集合 4／5／1 项、要不要「改前值」块、要不要「5 档 ＋ 系数」块），骨架同形；**设活动量那一张是最该并进去的**（它的影响展示可落在回执上）。
**C. 没有挡住「AI 跑得下去」的硬问题**：4 条命令在临时库全部 exit 0（§四）。挡住「用户肉眼验收」的是 §2.4 的 5 项字段缺失，以及 §四的片段／整页未定。

**仍待裁定（3 条）**
1. **片段还是整页**（§四）：决定 4 条产物要不要改整页文档。
2. **设活动量那一张页做不做**：地图把它单列一张（`tickets-07.md:71-106` 票 3），但影响展示也可直接落在回执上（B 条）。
3. **场景 06 同类情形是否一起做**：`定营养目标(自动算)`／`定饮水目标(自动算)`／`一键定全套目标` 是同一形态（`t81-route-evidence.md:907-911`），不在 #163／#175 范围。
