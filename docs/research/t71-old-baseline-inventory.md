# #71 旧版能力全量盘点：唤醒词／模板／HTML 对照清单

- 票：#71（Question）· 图：#63 卡路里·本体图（1/3）parity 极致重做
- 新侧（被验收）：`D:\ilife\packages\skill-calorie`（branch master，HEAD `6b0c1e7`，工作树含 #56 未提交改动）
- 旧侧（唯一权威基线，**只读**）：`D:\2Study\StudyNotes\SKILLS\卡路里`
- 盘点日期：2026-09-08
- 方法：只读文本解析（PowerShell 正则 + `read`/`grep` 工具），**未运行旧 Python、未写入旧树任何文件**；新侧只读 `src/` 与 `SKILL.md`
- 禁读声明：本报告**从未**读取、列举、引用或概括 `D:\2Study\StudyNotes\SKILLS\卡路里\.个人笔记不允许参考`（维护者自标）；所有针对旧树的列目录/检索均显式排除该目录
- 产物文件（本次新建，均在 `D:\ilife\.scratch\`）：本报告 + `research\t71-old-trigger-records.csv`（436 条旧 SoT 逐条解析：行号／分类／唤醒词／模板／key）

---

## 0. 结论速览

| 项 | 实测值 | 出处 |
|---|---|---|
| 旧 `SKILL.md` 行数 | **2195** | `卡路里/SKILL.md` |
| 旧 SoT 唤醒词条目 | **436 条 / 434 唯一词**（`记身材照` ×3） | `scripts/_triggers.py` `TRIGGERS`（L109 起） |
| 旧 SoT 分类（实际有词） | **11 类**（`CATEGORIES` 定义 13 项，`食品库`/`综合` 为空） | `_triggers.py:91-105` |
| 旧 frontmatter 触发词列表 | **69 项**（L6 `触发词:` 后以 `、` 分隔）＋ 正文另注册 `卡路里HELP` | `SKILL.md:3-7` |
| §触发词速查表 表格行 | **142 行**（22 个表格；另 4 个分类用散文列举） | `SKILL.md:289-691` |
| §已实现模板 表 | **6 行** | `SKILL.md:116-125` |
| §完整 HTML 模板清单 | **66 行**（65 模板行 + 1 退役行），**61 个唯一模板名** | `SKILL.md:147-219` |
| 票面声称的「71 行」 | **无法从 `SKILL.md` 复现**（见 §1.5） | 差异登记，维护者裁决 |
| `templates/*.html` | **73 个**（全部含 `<!--INJECT-DATA-->` 恰好 1 次，`设计审查报告.html` 除外=0） | `templates/` |
| SoT 引用模板 | **51 个路径**（其中 `templates/goal_config.html` 文件已不存在） | `_triggers.py` `html_template` |
| `scripts/render_*.py` | **67 个** | `scripts/` |
| 旧权威源文件是否仍在 | **在**：`scripts/_triggers.py`（4467 行，存在） | `SKILL.md:7` 声明的权威 |
| 新版对应物 | **77 键（42 读 + 35 写）／42 个 `render*Html` 渲染器／6 个未被引用的 `templates/*.html`** | `skill-calorie/src/cli/keys.ts`、`src/render/index.ts` |
| 模板判定合计 | **新版已有 47／需移植 18／新架构不适用 5／明确不做 3**（=73） | §2 |
| 渲染脚本映射 | **已映射 46／未映射需移植 16／明确不做 3／helper 1／部分映射 1**（=67） | §3 |

**一句话结论**：**词层与键层已对齐，HTML 层未对齐**。旧版 436 条唤醒词在新版 SoT 中逐条存在（10 场景计数一致），77 键覆盖了旧版读写主干；但旧版「模板即产品」的 73 个 HTML 页在新版只剩 42 个通用 KPI 壳（`pageShell + section + grid`），**旧版 HELP 速查台（436 场景 / 3 层目录 / 一键复制 prompt）在新版没有对应实现**——新版 `templates/help.html` 是 40 行占位壳且**不在 `package.json.files`、运行时零引用**。

---

## 1. 旧版唤醒词表

### 1.1 frontmatter description 触发词（`SKILL.md:3-7`）

```
3: description: >
4:   饮食热量、饮水、体重、运动、营养追踪与分析技能(11 分类 446 场景)。
5:   说「卡路里HELP」打开完整能力速查台(一键复制 prompt)。
6:   触发词:看今日主页、看今日热量预算、记一餐、…、本月复盘
7:   完整触发词见 SKILL.md §触发词速查表(权威:scripts/_triggers.py)。
```

| 计数项 | 值 | 说明 |
|---|---|---|
| L6 `触发词:` 后条目数 | **69** | 按 `、` 切分、去空 |
| L6 字符数 | 442 | |
| 正文另注册的唤醒词 | **1**（`卡路里HELP`，L5） | 不在 69 项列表内 |
| 分类数声明 | 11（L4） | 与实际有词的 11 类一致；`CATEGORIES` 列表 13 项 |
| 场景数声明 | 446（L4） | **实测 SoT 为 436**，见 §1.5 |

- **权威源声明**：`SKILL.md:7` 明确「权威:`scripts/_triggers.py`」；`docs/adr/0012-trigger-authority-migration.md` 把权威从 frontmatter 迁到该文件（#235 根因：description 9855 字符超 1024 上限、HELP 埋在 92.9% 位置）。
- **该文件仍然存在**：`scripts/_triggers.py`，**4467 行**，`CATEGORIES` 在 L91、`TRIGGERS` 在 L109、`get_summary()` 在 L4448。

### 1.2 §触发词速查表（`SKILL.md:289-691`）

标题段：`## 🤝 触发词速查表`（L289）→ `### 📚 速查台(v2.4.10 起)`（L295）。

| 分段 | 行号 | 表格行数 | 声明场景数 |
|---|---|---|---|
| 📚 速查台 | 295-308 | 1 | 1（`卡路里HELP`） |
| 🏠 主页 | 309-328 | 9 | 9 |
| 🍚 饮食（含 7 个子表） | 329-424 | 8+6+11+9+4+4+1+2 = **45** | 68 |
| ⚖️ 体重（散文列举，无表） | 425-459 | 0 | 58 |
| 🎯 目标管理（4 个子表） | 460-520 | 8+10+5+2 = **25** | 25 |
| 🏃 运动（5 个子表） | 521-597 | 8+5+17+4+5 = **39** | 39 |
| 🏋️ 健身计划（散文 6 组 + 1 表） | 598-635 | **26** | 29 |
| 📊 分析（散文 7 组，无表） | 636-664 | 0 | 155 |
| 🛠 基础信息 | 665-673 | 4 | 4 |
| 📋 复盘 | 674-691 | 10 | 10 |
| **合计** | 289-691 | **142** | 声称 446 |

- 表格统一列：`唤醒词 | 功能 | CLI`；`复盘` 段多一列 `默认参数`（L679）。
- CLI 列规则（L301-307）：原子 trigger 写 `python scripts/<file>.py <subcommand>`；组合 trigger 写 `组合:<t1> + <t2>`；分析类写 `AI 路由(Python API)`；占位符统一 `<X>` 尖括号。
- **体重／分析两段用散文列举，不落表**：体重 L427-434 六组（量体重5/改体重记录5/看体重明细7/看体重曲线10/看体重稳不稳5/看体重备注1/对比体重18/体重复盘7），分析 L641-648 七组（A1 60／A2 19／A3 15／A4 23／A5 16／A6 20／缺口1／单点1）。**这两段的词不在 §速查表表格里，只存在散文和 `_triggers.py`**——「逐条可勾选」必须直接以 `_triggers.py` 为准。

### 1.3 §已实现模板（`SKILL.md:116-125`）与 §完整 HTML 模板清单（`SKILL.md:147-219`）

**§已实现模板（2026-07-23）**：6 行，列 = `模板 | 唤醒词 | 数据源 | 渲染器`（L118 表头）：

| 模板 | 唤醒词 | 数据源 | 渲染器 |
|---|---|---|---|
| `templates/contraindication_report.html` | 扫禁忌 | `scan_contraindications.py --format json` | `scripts/render_contraindication.py` |
| `templates/review_template.html` | 复盘（含今日/本周/本月/本年/日期范围） | `review_cli.py gen` enriched JSON | `scripts/render_review.py --range / --type` |
| `templates/workout_plan_view.html` | 看完整计划 等（多模式） | DB 直接 query workout_plans + exercise_log | `python scripts/render_workout_plan.py --mode {...}` |
| `templates/health_dashboard.html` | 查健康报告 | `analysis.dashboard(as_dict=True)` 4 维 | `python scripts/render_health_dashboard.py` |
| `templates/food_ranking.html` | 5 个食物排行（1 模板 5 榜单） | `analysis.diet_food_ranking(as_dict=True)` × 5 | `python scripts/render_food_ranking.py` |
| `templates/exercise_review.html` | 计划复盘（本周/本月/全部） | `exercise_review.py --format json` | `python scripts/render_exercise_review_html.py` |

**§完整 HTML 模板清单（V1.3 原则 11）**：`SKILL.md:147-219`，表头 L151 = `模板 | 强制 trigger(走 HTML) | 数据源 | 渲染器`。

| 计数项 | 实测值 |
|---|---|
| 数据行 | **66**（含 1 行 `-`(自研模板已退役 #316)） |
| 模板行 | 65（其中 L154 一行含两个模板：`today_diet.html` / `today_meals.html`） |
| 表内唯一模板名 | **61** |
| 表内出现但文件不存在 | 0 |
| `templates/` 中未被本表提及 | **12**（见 §2 标注） |
| 表尾强制规则 | L221：「表中"强制 trigger"列出的所有 trigger 词命中后，**AI 必须** invoke 对应 HTML（渲染 → 打开），**严禁文字答**」 |

**§trigger 一致性检查脚本（L225-251）** 自报的旧状态（v2.2.2）：frontmatter trigger 73／HTML 模板表 trigger 63／render docstring trigger 64；并规定 3 边单向对照（HTML 表 ⊆ frontmatter、render docstring ⊆ frontmatter），命令 `python scripts/check_trigger_consistency.py`（exit 0 一致 / 1 有 drift）。**这些数字与当前文件已不一致**（frontmatter 实测 69 项），属文档漂移。

### 1.4 权威源链（旧版自称）

1. `scripts/_triggers.py`（运行时 SoT，`SKILL.md:7` + ADR-0012）
2. `SKILL.md` frontmatter description（路由摘要，≤1024 字符）
3. `SKILL.md §触发词速查表`（人读全表）
4. `render_*.py` docstring 声明的 trigger
5. `templates/help_center.html`（已退役）→ `公共组件/assets/help_template.html`

`_triggers.py` 每条 TRIGGER 字段（文件头 L5-16）：`wake_word / aliases / category / desc / main_prompt{cli,text} / variants[{label,cli,prompt}] / fill_hints`，新版 13 字段场景格式另含 `key / name / subfunction / output_type / html_template / data_source / prompt_template / user_intent / data_fields / depends_on_external / order`。

### 1.5 计数对账（票面 vs 实测，全部需维护者裁决）

| 项 | 票面／map 说法 | 实测 | 判定 |
|---|---|---|---|
| 场景数 | 446（`SKILL.md:4`）、map 亦写 446 | **436 条 SoT / 434 唯一词** | 文档漂移；SoT 为真 |
| 分类数 | 11 分类（`SKILL.md:4`）；`_triggers.py:8` docstring 写「12 分类之一」；`CATEGORIES` 定义 **13** 项 | 有词分类 **11**；`食品库`/`综合` 空 | 三处口径不一 |
| 「已实现模板」表行数 | **71 行**（map Notes + 票面） | §完整清单 **66 行 / 61 唯一名**；§已实现模板 **6 行** | **无法复现 71**（见下） |
| `templates/*.html` | 73 | **73** | ✅ |
| `scripts/render_*.py` | 67 | **67** | ✅ |
| HELP 实例 | 2 个（0730 / 0731） | ✅ 存在；根 `卡路里.html` 为第三种形态 | ✅ |

「71」的可能来源（均不能确证，**留给维护者裁决**）：
- 73 − 2 = 71（若排除 `设计审查报告.html` 与某个非运行页）；
- 61（§完整清单唯一名）+ 6（§已实现模板）+ 4（散文提及）= 71；
- 旧版 HELP 速查台里的 `total_wake_words` 曾为 80/81，与 71 无关。

> **建议**：把「71 行」这一验收数字改为「`_triggers.py` 436 条 + `templates/` 73 个文件」两个可直接跑脚本复现的数字，否则验收无法闭环。

---

## 2. 模板清单与逐条判定（73 + 2 + 2）

判定口径：
- **新版已有** = 新侧存在对应 key 且 `src/render/html.ts` 有对应 `render*Html`（数据面与 HTML 面都在）；
- **需移植** = 数据面可能已在，但新侧无 key 或**无对应 HTML 渲染器**；
- **新架构不适用** = 该模板的**机制**（wizard 填表页 / cropper 框选器 / 静态文档 / 渲染产物样例）在 CLI+envelope 架构下没有位置；
- **明确不做** = #39 判定 out of scope（见 §7 理由列）。

| # | 文件名 | 用途（一句） | 对应唤醒词 | 对应 render 脚本 | 新版对应物 | 判定 |
|---|---|---|---|---|---|---|
| 1 | `anomaly_report.html` | 自动分析诊断报告（A4 类 23 种诊断） | 见 `combined_analysis.html` 的 154 词（诊断子集） | `render_analysis.py` | `calorie.view.anomaly` → `render/insightPlate.ts` + `renderAnomalyHtml` | 新版已有 |
| 2 | `batch_import_preview.html` | 批量导入食品 JSONL 的预览/校验页 | 批量导入食品 / 校验批量导入 | `render_batch_import.py` | 无键（仅 `skill-calorie-fetch import\|validate` 运维 CLI，无 HTML） | 需移植 |
| 3 | `body_composition_view.html` | 体脂查看/趋势/对比 | 看体脂 / 看体脂趋势 / 对比体脂 | `render_body_composition_view.py` | `calorie.view.body-composition` → `render/bodyPlate.ts` + `renderBodyCompositionHtml` | 新版已有 |
| 4 | `body_composition_wizard.html` | 记体脂配置向导（填表→复制 prompt→AI 写库） | 记体脂（皮褶钳）/（外部测量）/ 补记体脂 | `render_body_composition_wizard.py` | `calorie.body.composition-add`（argv 直传，无向导页） | 新架构不适用 |
| 5 | `body_measurements_view.html` | 围度查看/趋势/对比（13 项） | 看围度 / 看围度趋势 / 对比围度 | `render_body_measurements_view.py` | `calorie.view.body-measure` → `renderBodyMeasureHtml` | 新版已有 |
| 6 | `body_measurements_wizard.html` | 记围度配置向导（13 围度 3 分组） | 记围度 / 补记围度 | `render_body_measurements_wizard.py` | `calorie.body.measure-add` | 新架构不适用 |
| 7 | `body_photo_compare.html` | 两张照片并排对比 | 对比两张照片 | `render_body_photo_compare.py` | `calorie.photo.compare` → `renderCompareHtml` | 新版已有 |
| 8 | `body_photo_gallery.html` | 身材照浏览网格 + 计数 | 查身材照 | `render_body_photo_gallery.py` | `calorie.photo.list` → `renderGalleryHtml` | 新版已有 |
| 9 | `body_photo_gif_planner.html` | GIF 规划器（cropper.js 框选裁剪 → 4 数字裁剪输入） | 查身材照 / 生成身材照GIF | `render_body_photo_gif_planner.py` | `calorie.photo.gif` 只出任务描述（`planGif`），无框选 UI | 新架构不适用 |
| 10 | `body_photo_gif_result.html` | GIF 合成结果页 | 生成身材照GIF | `render_body_photo_gif_result.py` | `calorie.photo.gif` → `renderGifHtml` | 新版已有 |
| 11 | `body_photo_log_wizard.html` | 记身材照配置向导（纯配置，飞书交互用） | 记身材照 | `render_body_photo_log_wizard.py` | `calorie.photo.add`（`srcPaths` argv） | 新架构不适用 |
| 12 | `body_photo_receipt.html` | 身材照写库回执（缩略图/diff） | 记身材照 / 删身材照 / 改·加·删照片标签 | `render_body_photo_receipt.py` | `calorie.photo.add\|remove\|tag` → `renderPhotoReceiptHtml` | 新版已有 |
| 13 | `body_photo_viewer.html` | 单张照片查看（子页） | 查身材照（单图子路径） | `render_body_photo_viewer.py` | `calorie.photo.detail` → `renderViewerHtml` | 新版已有 |
| 14 | `calorie_deficit.html` | 热量缺口（摄入 vs 运动 vs TDEE） | 查热量缺口 | `render_calorie_deficit.py` | `calorie.view.deficit` → `render/analysisPlate.ts` + `renderDeficitHtml` | 新版已有 |
| 15 | `calorie_trend.html` | 热量摄入趋势折线 | 查热量趋势（legacy 词） | `render_calorie_trend.py` | 无专键（`view.combined`/`view.predict` 间接） | 需移植 |
| 16 | `combined_analysis.html` | 组合分析（154 场景共用 1 模板） | 看体重 vs 摄入/运动/蛋白/缺口、看健康报告、看整体趋势、诊断、营养、预测、6 因素 | `render_analysis.py` | `calorie.view.combined` → `render/analysisPlate.ts` + `renderCombinedHtml`（仅 pair×window 子集） | 新版已有（子集） |
| 17 | `contraindication_report.html` | 禁忌动作扫描（腰/膝/肩）+ 替代建议 | 扫禁忌 | `render_contraindication.py` | `calorie.view.contraindication` → `renderContraHtml` | 新版已有 |
| 18 | `cron_setup.html` | 定时复盘配置（mavis cron 增删查） | 开启定时复盘 / 关闭定时复盘 | `render_cron_setup.py` | 无（#39 出 scope） | 明确不做 |
| 19 | `cross_skill_sleep.html` | 睡眠时长 vs 减重（跨技能） | 无（跨技能只读） | `render_cross_skill_cs02.py` | 无（#39 出 scope） | 明确不做 |
| 20 | `crud_receipt.html` | 通用写库回执（25.7KB，49 个写词共用） | 记一餐…删围度（49 词） | `render_crud_receipt.py` + 3 个 receipt 脚本 | 35 写键 → `render/receipt.ts` + `renderCrudReceipt` | 新版已有 |
| 21 | `crud_view.html` | 状态查看（档案 / 定时复盘） | 查档案 / 查定时复盘 | `render_crud_view.py` | `calorie.view.profile` → `renderProfileHtml`（定时复盘出 scope） | 新版已有 |
| 22 | `dedupe_report.html` | 食品库重复组检查 + 处理建议 | 看食品库（去重） | `render_dedupe_report.py` | `calorie.view.dedupe` → `renderDedupeHtml` | 新版已有 |
| 23 | `diet_overview.html` | 饮食总览（本周/本月累计 + 趋势） | 看饮食总览 | `render_diet_overview.py` | `calorie.view.diet` → `render/diet.ts` + `renderDietHtml` | 新版已有 |
| 24 | `diet_review.html` | 饮食复盘（周/月/90 天/年/自定义） | 饮食复盘（5 词） | `render_diet_review.py` | `calorie.view.diet-review` → `renderDietReviewHtml` | 新版已有 |
| 25 | `error_receipt.html` | 操作失败回执页 | 无（失败态） | `render_error_receipt.py` | `render/errors.ts` + `renderErrorHtml` + `CalorieRenderError` | 新版已有 |
| 26 | `exercise_cardio.html` | 有氧训练总览（按类型聚合） | 看有氧训练总览 | `render_exercise_cardio.py` | 无 | 需移植 |
| 27 | `exercise_distribution.html` | 运动类型分布饼图 + 占比 | 看运动类型分布 / 查运动贡献 | `render_exercise_distribution.py` | 无（`view.exercise` 只有 TOP 类型 KPI） | 需移植 |
| 28 | `exercise_goal_view.html` | 运动目标达成（大进度环 + 差额） | 看今日运动（vs 目标）/ 看本周运动（vs 目标） | `render_exercise_goal_view.py` | `calorie.view.exercise-goal` → `renderExerciseGoalHtml` | 新版已有 |
| 29 | `exercise_recap.html` | 运动复盘（周/月/90 天/年/自定义） | 运动复盘（5 词） | `render_exercise_recap.py` | 无 | 需移植 |
| 30 | `exercise_review.html` | 计划复盘（完成率/训练日/消耗 + 趋势） | 计划复盘（本周/本月/全部） | `render_exercise_review_html.py` | 无专键（`analysis/exerciseReview.ts` 有计算，无键/无 HTML） | 需移植 |
| 31 | `exercise_strength.html` | 力量训练总览（按动作聚合 + 轨迹） | 看力量训练总览 | `render_exercise_strength.py` | 无 | 需移植 |
| 32 | `exercise_summary.html` | 运动报表（15 词共用 1 模板） | 看今日/昨日/本周/上周/本月/上月/最近 7·30·60·180·365 天运动、按备注/力量/有氧筛选 | `render_exercise_summary.py` | `calorie.view.exercise` → `render/exercise.ts` + `renderExerciseHtml` | 新版已有（子集） |
| 33 | `exercise_trend.html` | 运动趋势折线（时长/消耗/频次） | 看运动趋势 | `render_exercise_trend.py` | 无 | 需移植 |
| 34 | `food_library.html` | 食品库列表 + 客户端搜索/分页 | 查食品（按分类） | `render_food_library.py` | `calorie.view.library` → `renderProductLibraryHtml` | 新版已有 |
| 35 | `food_ranking.html` | 食物排行榜（5 榜 × 4 窗口 = 21 词） | 看高热量/低热量/频繁吃/高碳水/高蛋白榜（+窗口变体） | `render_food_ranking.py` | `calorie.view.ranking` → `render/ranking.ts` + `renderRankingHtml` / `renderAllRankingsHtml` | 新版已有 |
| 36 | `food_search.html` | 食物热量查询（名称/品牌/营养/来源） | 查食品 / 查食品（按分类） | `render_food_search.py` | `calorie.view.search` → `renderProductSearchHtml` | 新版已有 |
| 37 | `goal_config_nutrition.html` | 营养目标配置（4 宏量 + 饮水） | 定营养目标 / 改营养目标 | `render_goal_config.py` | `calorie.view.goal-config` → `render/goalPlate.ts` + `renderGoalConfigHtml` | 新版已有 |
| 38 | `goal_config_water.html` | 饮水目标配置 | 定饮水目标 / 改饮水目标 | `render_goal_config.py` | 同上（`--water-only` 同键） | 新版已有 |
| 39 | `goal_progress.html` | 目标进度（12 词共用） | 看今日/本周/营养/体重/饮水目标进度、对比实际、完成度、到期、完成率、历史、预测 | `render_goal_progress.py` | `calorie.view.goal-progress` + `view.goal`/`goal-expiring`/`goal-vs-actual`/`goal-predict` → `renderGoalProgressHtml` 等 | 新版已有（子集） |
| 40 | `goal_recommend.html` | 目标自动推荐（营养/饮水/一键全套） | 定营养目标(自动算) / 定饮水目标(自动算) / 一键定全套目标 | `render_goal_recommend.py` | `calorie.view.goal-recommend` → `renderGoalRecommendHtml` | 新版已有 |
| 41 | `goal_status.html` | 目标暂停/重启 | 暂停所有目标 / 重启所有目标 | `render_goal_status.py` | `calorie.view.goal-status` + `calorie.goal.pause\|resume` → `renderGoalStatusHtml` | 新版已有 |
| 42 | `goal_weight.html` | 体重目标设定（4 词，含速率预计算） | 定体重目标 / (自动算截止) / (含起始日) / 改体重目标 | `render_goal_weight.py` | `calorie.view.goal-weight` → `renderGoalWeightHtml` | 新版已有 |
| 43 | `goal_weight_result.html` | 体重目标写库后结果回执 | 同上（写库后） | `render_goal_weight.py --live` | `calorie.goal.weight` → receipt | 新版已有 |
| 44 | `health_dashboard.html` | 综合健康仪表盘（4 维） | 查健康报告 | `render_health_dashboard.py` | `calorie.view.health` → `render/health.ts` + `renderHealthHtml` | 新版已有 |
| 45 | `health_report.html` | 健康报告（A2 类 19 场景） | 看健康报告（窗口变体）/看BMI/TDEE/BMR/蛋白/水分/评分/趋势/含对比 | `render_analysis.py` | `calorie.view.health` → `renderHealthHtml` | 新版已有（子集） |
| 46 | `home_dashboard.html` | 今日主页仪表盘（6 KPI + 趋势 + 一句话） | 看今日主页 / 饮食·运动·体重概览 / 目标进度 / 本周·本月主页 / 连续记录 / 热量预算（9 词） | `render_home.py` | `calorie.view.home` → `render/home.ts` + `renderHomeHtml` | 新版已有 |
| 47 | `lint_health.html` | 数据健康检查（lint_health） | 查卡路里数据 | `render_lint_health.py` | 无键（`skill-calorie-fetch audit` 仅运维） | 需移植 |
| 48 | `long_trend.html` | 整体趋势（A3 类 15 场景） | 看整体趋势（11 组）+ 周期对比 4 | `render_analysis.py` | 无专键（`view.combined` 部分） | 需移植 |
| 49 | `meal_distribution.html` | 餐别分布（早/午/晚/加餐/全部） | 看早餐/午餐/晚餐/加餐（最近 7 天）/ 看全部餐别分布 | `render_meal_distribution.py` | `calorie.view.diet` 含「餐别分布」section → `buildMealDistribution` | 新版已有 |
| 50 | `nutrition_analysis.html` | 营养分析（A5 类 16 场景） | 看蛋白 vs 碳水/脂肪、碳水 vs 脂肪、三大营养交叉、钠糖纤维趋势/综合、营养建议 | `render_analysis.py` | 无专键 | 需移植 |
| 51 | `nutrition_detail.html` | 营养素深度（纤维/钠/糖 vs 推荐） | 看营养素深度 | `render_nutrition_detail.py` | 无 | 需移植 |
| 52 | `nutrition_label_wizard.html` | 拍营养表识别确认向导 | 拍营养表记一餐 / 拍营养表补记一餐 | `render_nutrition_label.py` | 无（#39：mmx vision 出 scope） | 明确不做 |
| 53 | `nutrition_ratio.html` | 营养配比（蛋白/碳水/脂肪占比 + 实际 vs 目标） | 查营养结构 | `render_nutrition_ratio.py` | 无专键（`view.diet` 有 macro 占比 KPI） | 需移植 |
| 54 | `plan_builder_wizard.html` | 训练计划预览/生成向导（38KB） | 定训练计划 | `render_plan_builder.py` | `calorie.view.plan-wizard` → `render/planPlate.ts` + `renderPlanWizardHtml`（只校验，`insertedCount` 恒 0） | 新版已有 |
| 55 | `predict_report.html` | 预测模拟（A6 类 20 场景） | 预测体重 / 模拟减重 / 摄入预测 | `render_analysis.py` | `calorie.view.predict` → `render/insightPlate.ts` + `renderPredictHtml` | 新版已有（子集） |
| 56 | `process_progress.html` | 落地训练 4 步流程进度 | 落地训练 / 落地到本周末 / 落地到本月底 | `render_process_progress.py` | 无（落地/训记二期） | 需移植 |
| 57 | `profile_setup.html` | 设置档案（采访式引导配置页） | 设置档案 | `render_profile_setup.py` | `calorie.view.profile` + `calorie.profile.set` → `renderProfileHtml` | 新版已有 |
| 58 | `review_template.html` | 复盘报告（8 维 + 70 个 data-field 由 agent 装填） | 复盘 / 今日 / 本周 / 本月 / 本年 / 日期范围 | `render_review.py` | `calorie.view.diet-review` 仅饮食复盘子集 | 需移植 |
| 59 | `six_factors.html` | 每日 6 因素综合 | 看每日 6 因素综合 | `render_analysis.py` | 无专键 | 需移植 |
| 60 | `source_stats.html` | 食品来源统计（GROUP BY source） | 看食品来源统计 | `render_source_stats.py` | `view.library` 只回 `statsTotal` 指标，无 HTML | 需移植 |
| 61 | `today_diet.html` | 今日饮食（按餐别分组明细 + 累计 vs 目标） | 看今日饮食 / 看昨日饮食 / 看今日营养 | `render_today_diet.py` | `calorie.view.diet` → `renderDietHtml` | 新版已有 |
| 62 | `today_meals.html` | 吃的记录（8 词共用：周/月/滚动窗/自定义/有备注） | 看本周/上周/本月/上月/最近 7·30 天/某段时间饮食、看有备注的记录 | `render_today_meals.py` | `calorie.view.diet`（同键不同参） | 新版已有（子集） |
| 63 | `today_water.html` | 今日饮水（累计/距目标/每杯时间/进度环） | 看今日喝水 | `render_today_water.py` | 无专键（水只有 `view.home`/`goal-progress` 指标） | 需移植 |
| 64 | `weight_batch_delete.html` | 批量删除体重（确认页） | 批量删体重 | `render_crud_receipt.py` | `calorie.weight.remove` → receipt | 新版已有 |
| 65 | `weight_batch_receipt.html` | 批量补录体重回执 | 批量补录体重 | `render_weight_receipt.py --live-batch` | `calorie.weight.batch` → receipt | 新版已有 |
| 66 | `weight_compare.html` | 对比体重（18 场景） | 对比体重：…（18 词） | `render_weight_compare.py` | `calorie.view.weight-compare` → `renderWeightCompareHtml` | 新版已有（子集） |
| 67 | `weight_dashboard.html` | 体重总览/今日体重 | 看体重总览 / 看今日体重 | `render_weight_dashboard.py` | `calorie.view.weight` → `renderWeightHtml` | 新版已有 |
| 68 | `weight_history.html` | 体重历史/曲线（18 词） | 看本周/上周/本月/上月/最近 7·90 天体重、看体重曲线（带目标/里程碑/异常点）、各窗口曲线、有备注记录 | `render_weight_history.py` | `calorie.view.weight-history` → `renderWeightHistoryHtml` | 新版已有（子集） |
| 69 | `weight_log_receipt.html` | 记体重回执 + 趋势图 | 记体重 / 记体重（含备注）/ 补录体重 | `render_weight_receipt.py --live` | `calorie.weight.log` → receipt | 新版已有 |
| 70 | `weight_review.html` | 体重复盘（5 窗口 + 里程碑回溯） | 体重复盘（本周/本月/90 天/今年/自定义）/ 看里程碑回溯 | `render_weight_review.py` | `calorie.view.weight-review` → `renderWeightReviewHtml` | 新版已有 |
| 71 | `weight_volatility_v2.html` | 体重稳不稳（增强版）+ 波动异常点 | 看体重稳不稳（增强版）/看本月·90·180 天波动/看波动异常点 | `render_weight_volatility_v2.py` | `calorie.view.volatility` → `renderVolatilityHtml` | 新版已有 |
| 72 | `workout_plan_view.html` | 训练计划视图（13 词，8 种 mode） | 看完整/本周/下周/上周/指定周计划、看今天练什么、看某天练什么、看某动作安排、看计划概览、看计划 vs 实际、看计划完成率、看未完成训练、看动作完成率 | `render_workout_plan.py` | `calorie.view.plan` → `renderPlanHtml` | 新版已有（子集） |
| 73 | `设计审查报告.html` | 模板对抗式设计审查报告（静态文档，无注入点） | 无 | 无 | 无 | 新架构不适用 |
| 74 | `html/tm_db.html` | `today_meals` 真实库渲染产物样例（13.3KB，无注入点） | — | 产物，非模板 | 无 | 新架构不适用 |
| 75 | `html/tm_mock.html` | `today_meals` mock 渲染产物样例（11.0KB） | — | 产物，非模板 | 无 | 新架构不适用 |
| 76 | `templates/临时样例/统一主面板_视觉标杆.html` | 视觉标杆 A（浅色统一主面板，23.4KB） | 无（视觉基准） | 无 | 无（**新版 HELP 的验收目标**） | 新架构不适用（作规格用，见 §5） |
| 77 | `templates/临时样例/沉浸主面板_视觉标杆v2.html` | 视觉标杆 B（深色沉浸主面板，29.6KB） | 无（视觉基准） | 无 | 无（同上） | 新架构不适用（作规格用，见 §5） |

### 2.1 判定计数

| 判定 | 数量 | 说明 |
|---|---|---|
| 新版已有 | **47** | 有 key + 有 `render*Html` |
| 需移植 | **18** | 数据面部分已在，缺键或缺 HTML |
| 新架构不适用 | **5** | wizard 配置页 ×3（#4/#6/#11）+ GIF 框选器（#9）+ 静态文档（#73）；`html/` 2 个产物样例与 2 个视觉标杆另计 |
| 明确不做 | **3** | #18 cron、#19 跨技能、#52 mmx vision（#39 出 scope） |
| **合计** | **73** | ✅ 与 `templates/*.html` 文件数一致 |

需移植的 18 项（= 复刻缺口清单）：`batch_import_preview`、`calorie_trend`、`exercise_cardio`、`exercise_distribution`、`exercise_recap`、`exercise_review`、`exercise_strength`、`exercise_trend`、`lint_health`、`long_trend`、`nutrition_analysis`、`nutrition_detail`、`nutrition_ratio`、`process_progress`、`review_template`、`six_factors`、`source_stats`、`today_water`。

### 2.2 新版已有但只是「子集」的 8 项（判定需维护者拍板「完全一样」的刻度）

`combined_analysis`(154 词)、`exercise_summary`(15 词)、`goal_progress`(12 词)、`health_report`(19 词)、`predict_report`(20 词)、`today_meals`(8 词)、`weight_compare`(18 词)、`weight_history`(18 词)、`workout_plan_view`(13 词) —— 新版只有 1 个 key + 1 个通用 KPI 壳，旧版是同模板多 mode 的**多视图页**（含明细表、饼图、折线、折叠分组）。判定为「新版已有」，但**体验不等价**；是否算「完全一样」需维护者定刻度。

---

## 3. 渲染脚本映射（67 个 `scripts/render_*.py`）

分组按域；「新版对应」= key / 渲染器；`—` = 未映射。

| 组 | 脚本（个数） | 新版对应 | 未映射 |
|---|---|---|---|
| A 主页 | `render_home.py`(1) | `calorie.view.home` → `render/home.ts`+`renderHomeHtml` | — |
| B 饮食（10） | `render_today_diet.py`、`render_today_meals.py`、`render_diet_overview.py`、`render_diet_review.py`、`render_meal_distribution.py`、`render_calorie_deficit.py` | `view.diet`/`view.diet-review`/`view.deficit` | — |
| | `render_today_water.py` | — | ❌ 水专页 |
| | `render_calorie_trend.py` | — | ❌ 热量趋势 |
| | `render_nutrition_ratio.py` | — | ❌ 营养配比 |
| | `render_nutrition_detail.py` | — | ❌ 营养素深度 |
| C 食品库（7） | `render_food_search.py`、`render_food_library.py`、`render_food_ranking.py`、`render_dedupe_report.py` | `view.search`/`view.library`/`view.ranking`/`view.dedupe` | — |
| | `render_source_stats.py` | — | ❌ 来源统计（只回 `statsTotal`） |
| | `render_batch_import.py` | — | ❌ 批量导入预览 |
| | `render_nutrition_label.py` | — | ⛔ 明确不做（mmx vision） |
| D 体重（6） | `render_weight_history.py`、`render_weight_compare.py`、`render_weight_dashboard.py`、`render_weight_review.py`、`render_weight_volatility_v2.py`、`render_weight_receipt.py` | `view.weight*`(5) + `weight.log`/`weight.batch` | — |
| E 运动（9） | `render_exercise_summary.py`、`render_exercise_goal_view.py`、`render_exercise_receipt.py` | `view.exercise`/`view.exercise-goal`/`exercise.*` | — |
| | `render_exercise_strength.py`、`render_exercise_cardio.py`、`render_exercise_trend.py`、`render_exercise_recap.py`、`render_exercise_distribution.py`、`render_exercise_review_html.py` | — | ❌ ×6 |
| F 健身计划（4） | `render_workout_plan.py`、`render_plan_builder.py` | `view.plan`/`view.plan-wizard` | — |
| | `render_plan_receipt.py` | — | ❌ 计划写键（二期） |
| | `render_process_progress.py` | — | ❌ 落地进度 |
| G 目标（6） | `render_goal_config.py`、`render_goal_recommend.py`、`render_goal_weight.py`、`render_goal_status.py`、`render_goal_progress.py` | `view.goal-*`(5) + `goal.*` | — |
| | `render_goal_common.py` | — | ➖ helper（无渲染职责） |
| H 分析（1） | `render_analysis.py` | `view.combined`/`deficit`/`diet-review`/`health`/`predict`/`anomaly`（154 场景→6 键） | — |
| I 健康（2） | `render_health_dashboard.py` | `view.health` | — |
| | `render_lint_health.py` | — | ❌ lint |
| J 身体（5） | `render_body_composition_view.py`、`render_body_measurements_view.py`、`render_body_delete_receipt.py` | `view.body-composition`/`view.body-measure`/`body.*-remove` | — |
| | `render_body_composition_wizard.py`、`render_body_measurements_wizard.py` | 同键（无向导页） | ⚙️ 机制不适用 |
| K 照片（7） | `render_body_photo_gallery.py`、`render_body_photo_viewer.py`、`render_body_photo_compare.py`、`render_body_photo_gif_result.py`、`render_body_photo_receipt.py` | `photo.list`/`detail`/`compare`/`gif`/`add`·`remove`·`tag` | — |
| | `render_body_photo_gif_planner.py`、`render_body_photo_log_wizard.py` | 同键（无框选/无向导） | ⚙️ 机制不适用 |
| L CRUD 回执（2） | `render_crud_receipt.py`、`render_crud_view.py` | 35 写键 + `view.profile`/`history` | — |
| M 复盘（1） | `render_review.py` | `view.diet-review` | ⚠️ 部分映射（8 维复盘未承接） |
| N 档案（1） | `render_profile_setup.py` | `view.profile` | — |
| O 禁忌（1） | `render_contraindication.py` | `view.contraindication` | — |
| P 定时/跨技能（2） | `render_cron_setup.py`、`render_cross_skill_cs02.py` | — | ⛔ 明确不做 |
| Q HELP（1） | `render_help_center.py` | — | ❌ 速查台（新版只有极简 `<h1>唤醒词 HELP 速查</h1>` + 条目） |
| R 错误（1） | `render_error_receipt.py` | `render/errors.ts`+`renderErrorHtml` | — |

### 3.1 映射计数

| 判定 | 数量 |
|---|---|
| 已映射（NEW 键／渲染器） | **46** |
| 未映射·需移植 | **16** |
| 明确不做（#39） | **3** |
| 机制不适用（wizard/cropper） | **4**（含在 46 的键内，单列提示） |
| helper（无渲染职责） | **1** |
| 部分映射 | **1** |
| **合计** | **67** |

**未映射数 = 16（需移植）+ 3（明确不做）= 19 个脚本无新版对应**；其中 16 个是「必须补键/补渲染器」的真实缺口。

---

## 4. HELP 机制拆解

### 4.1 三个真实产物 + 一个模板源

三件产物是**同一产品概念的三代实现，互不兼容**（F1/F2/F3 编号沿用子报告 `t71-help-dissect.md`）：

| 产物 | 大小 | 形态 | 数据摘要 | 关键结构 |
|---|---|---|---|---|
| **F1** `calorie_html/卡路里_HELP_20260730_130429.html` | 65,366 B / **492 行** | 自研模板 v2.4.12，**2 层折叠**（分类 → 唤醒词；唤醒词内嵌变体折叠） | `total_wake_words=81 / total_prompts=112 / total_categories=12`；31 个变体；payload 30,529 字符 | `hero` + `cat-block`(L1) + `word-card`(L2) + `variant-block`(L3) + `toast`；**无搜索**（v2.4.10 已删，`:487`） |
| **F2** `calorie_html/卡路里_HELP_20260731_201530.html` | 73,811 B / **596 行** | 自研渲染器 v3.0 merged，**4 层折叠**（分类 → 子功能 → 场景 → 详情） | `total_categories=9 / total_scenes=80 / total_prompts=80`；`meta.source="merged(scene_data + _triggers.py)"`；payload 36,843 字符 | 同上 + **sticky 搜索区**（`.search-wrap` > `input.search#searchInput`，`:330-336`，5 字段匹配 + 自动展开 + 计数）+ `renderScene/renderSceneDetail/renderSubBlock` |
| **F3** 根 `卡路里.html` | 302,820 B / **2048 行** | **换架构**：`公共组件` 参数化 `help_template.html`（611 行）+ `base.js`（+948 行）+ `base.css`（+489 行）三处注入 | `10 分组 / 54 子功能 / 436 场景`；payload 110,207 字符；副标题「10 分类 · 436 场景 · 更新于 2026-08-14 11:38」 | 手机壳 + 底部 Tab（11 个：10 分组 + 关于）+ 横向 ViewPager 页 + `subgroup` 折叠 + 2 列 `mini` 卡 + 底部 Sheet + 全局搜索（`<mark>` 高亮 + 自动跳页） |
| `公共组件/assets/help_template.html` | 40,927 B / 611 行 | **参数化模板源**（正式版契约 v1.2） | 由 `injector.py --help-template` 注入 `scene_data.json` | 见 §4.5；同目录另有 `docs/help-template-contract.md`、`docs/scene-data-contract.md`、`docs/component-contract.md`、`injector.py`、`assets/base.css`、`assets/base.js`、`assets/charts.js` |

> 深度证据（逐行）另见本次盘点的子报告：`D:\ilife\.scratch\research\t71-help-dissect.md`（420 行，F1/F2/F3 全量解剖）。

> `templates/help_center.html` **已不存在**（`SKILL.md:219` 标注 `-`(自研模板已退役 #316)）；现存备份 `templates/help_center_v2_4_12.html.bak`（17,696 B）。

### 4.2 页面骨架

**A. F1 `卡路里_HELP_20260730_130429.html`（492 行，**2 层折叠**）** —— 行号取自该文件：

```
body                                                        L299
└── .hero > .container                                      L301-305
    ├── h1「📚 卡路里 · 唤醒词速查台」                          L302
    ├── .sub「💡 点 ▸ 类别 → 选唤醒词 → 复制 prompt → 贴给 AI」   L303
    └── .stats#heroStats（3 个 <b>：类别 / 唤醒词 / prompt）      L304, L393-396
└── .container > main#mainContent（初始 .empty「加载中…」）    L307-308
    └── details.cat-block[id=cat-<key>][data-cat-name]      L407-410  ← L1 分类
        ├── summary: span(icon) + span(name) + span.count-pill
        └── div.cat-content
            └── details.word-card                           L445-456  ← L2 唤醒词
                ├── summary: .ww-name + .ww-aliases>span* + .ww-count
                │            + button.copy-btn.copy-main（📋 复制，onclick=copyMainPrompt(i)）  L446-449
                └── div.word-content: .ww-desc + .prompt-cli + .prompt-main + .variants-section
                    └── details.variant-block               L459-466  ← L3 变体
└── footer（**硬编码**「卡路里技能 · 唤醒词速查台 · v2.4.12 · 2026-07-26」）  L309
└── div#toast.toast[role=status][aria-live=polite]          L313-320
    ├── .toast-icon 📋 / .toast-body(.toast-title 已复制 <em id=toastWake> / .toast-detail)
    └── button.toast-close「✓ 知道了」
```

F1 **没有**：搜索框、分类导航条、展开/收起全部、复制全部、关于/联系、深色模式（`/search /expandAll /collapseAll /copyAll 已删除（v2.4.10）`明写于 L487）。

**B. F2 `卡路里_HELP_20260731_201530.html`（596 行，**4 层折叠**）** —— 比 F1 多一层子功能 + sticky 搜索：

```
.hero > .container（.sub 改为「类别 → 子功能 → 场景 → 详情 → 复制 prompt」L325）+ .stats#heroStats  L323-327
.search-wrap > input.search#searchInput + .search-meta(#searchCount + #dataSource)   L330-336  ← **sticky 搜索**
main#mainContent（L337）
└── details.cat-block[id=cat-<key>][data-cat]              ← L1（无 open = 默认折叠）
    └── details.sub-block[data-sub][open]                  ← L2（默认展开，.sub-count「N 场景」）
        └── details.scene-card[data-key][data-cat][data-sub]  ← L3
            ├── summary: .scene-name + .scene-wake + .scene-output.{process|result|receipt}
            │            + .scene-ext（🔗 依赖外部）+ button.copy-btn.copy-main[data-prompt-index][data-wake]
            └── div.scene-content > div.scene-detail       ← L4
                ├── .intent（user_intent）/ .cli（data_source）/ pre.prompt-pre（prompt 全文）
                └── .meta（📦 data_source / 🎨 html_template / 🔗 依赖外部 / 📋 data_fields）
footer#footer（**数据驱动**，L475-478 写入「渲染时间:2026-07-31 20:15:30」/「源:merged(...)」）  L338
#toast.toast（同 F1 结构）  L342-349
```

**C. F3 根 `卡路里.html`（2048 行，底部 Tab + ViewPager + Sheet）**：

```
.stage > .stage-title + .stage-sub（原型遗留文案，≤500px 才隐藏）  L170-174
.phone > .notch + .screen#screen（680px 宽；≤500px 变 100vw/100vh）  L176
.sheet-mask#sheetMask  L178
.sheet#sheet > .grip + .s-close#sheetClose + .s-scroll(#shHead + #shBody) + .s-actions>button.copy-btn#shCopy  L179-189
#toast（**死元素**，被 base.js 的 .hm-toast-stack 取代）  L191
.screen > .app > .app-inner  L1766-1768
├── header.hero：.h-left(.eyebrow 技能名 / h1 标题 / .lead「436 场景 · 点卡片看详情」)
│                + .h-badge「436 场景」+ .hero-steps(.step→.arrow→.step→.arrow→.step)  L1767-1769
├── .init-banner#initBanner（可选，本产物未注入）  L1770-1772
├── .search-wrap > .search-box(.s-icon + input#sB[type=search] + button.s-clear#sClear)  L1988-1989
├── .hitcount#hitC + .search-empty#emptyC
├── .pages#pages（横向 ViewPager，scroll-snap: x proximity）  L1776-1792
│   └── .page[data-page=<group.id>] ×10
│       └── details.subgroup[open] > summary(子功能名 + span.sg-count) + .sg-body > .grid（2 列）
│           └── .mini[data-key] → .m-top(.chip + .type-badge*) + .m-bottom(.m-name + button.copy-btn[data-c])
│   └── .page[data-page="about"]（关于 Tab：联系作者 / 版本 / 其他技能）  L1796-1820
└── .tab-bar#tabBar > button.tab[data-nav] ×11（10 分组 + 关于）  L1823-1828, L1844-1900
```

**F3 = `公共组件/assets/help_template.html`（611 行）逐行对账**：模板 `:195` `<!--INJECT-DATA-->` → F3 同行 JSON；`:197` `<!--SHARED-HELPERS-->` → F3 `:197-1145`（base.js，+948 行）；`:200` `<!--SHARED-CSS-->` → F3 `:1148-1637`（base.css，+489 行）；`:203-609` 控制脚本 → F3 `:1640-2045`。611 + 948 + 489 = 2048 ✅ 与文件行数一致。

数据来源：F3 用 `<script id="help-data" type="application/json">`（L195）+ `var HELP = JSON.parse(document.getElementById('help-data').textContent)`（L1642），随后 `SKILL_NAME/TITLE/SUBTITLE/META_BLOCKS/INIT_BANNER/CONTACT/SKILL_VERSION/RECOMMENDATIONS`（L1643-1651）、`GROUPS`（L1670）、`ALL/SCENE` 扁平索引（L1680-1681）。顶层键：`skill_name, title, subtitle, contact, groups`；`groups[i] = {id, icon, label, subgroups[{id,label,scenes[{id,title,wake_word,status,prompt_template,types}]}]}`。**F3 的 `editable_fields` 为 0**（参数表单是通用能力、当前数据未用），且 **F3 无逐场景 CLI 展示**（契约里没有 `data_source` 字段，违反自家 `docs/adr/0008:36-39`）。

### 4.3 一键复制 prompt 交互（精确机制）

**数据来源**：prompt 文本**不写在按钮属性里**，而是运行期从 `window.__DATA__` 索引取。

1. 注入点（0730 L323）：`<script>window.__DATA__ = {"status":"ok","data":{"summary":{…},"categories":[…],"triggers":[{…"main_prompt":{"cli","text"},"variants":[{"label","cli","prompt"}]…}]}};</script>` —— **单行 JSON，`</` 已转义**（见 §4.4）。
2. 主 prompt 复制：`button.copy-btn.copy-main` 的 `onclick="event.preventDefault(); event.stopPropagation(); copyMainPrompt(${i})"`（L449）→ `copyMainPrompt(i)`（L480-485）读 `DATA.data.triggers[i].main_prompt.text` → 调 `copyText(text, btn)`。
3. 变体复制：`button.copy-btn[data-prompt="<escaped prompt>"]`（L465），`bindCopyButtons()` 给所有非 `.copy-main` 的按钮绑 `copyText(btn.dataset.prompt, btn)`（L469-477）。**注意**：变体走 `data-prompt` 属性，主 prompt 走索引——两条路径。
4. `copyText(text, btn)`（L334-356）：
   - 先用 `btn.closest('.word-card, .variant-block')` 找 `.ww-name` / `.v-label` 拼出 toast 标题（确认复制对了哪条）；
   - 立刻 `showToast(wake)`；
   - 优先 `navigator.clipboard.writeText(text).then(after).catch(()=>{fallback(text);after();})`，无 clipboard API 直接 `fallback`；
   - `after()`：按钮文案 → `✓ 已复制` + `.copied` 类，2000ms 后还原。
5. 降级 `fallback(text)`（L376-382）：创建 `position:fixed;opacity:0` 的 `<textarea>` → `focus()/select()` → `document.execCommand('copy')` → 移除。
6. Toast（L358-375, 313-320）：`showToast` 写 `#toastWake` 文本 + 加 `.show`，4500ms 自动隐藏；点「✓ 知道了」立即隐藏。文案固定为「已复制 X / 粘贴给 AI(微信/飞书/任何 AI 工具),卡路里技能会自动执行这个流程,完成后你会在飞书收到 HTML」。
7. **F1 已删除**搜索/展开全部/收起全部/复制全部（L487 注释）；**F2 反而新增 sticky 搜索**（`.search-wrap` L330-336 + `updateSearchCount()` L582-591：5 字段匹配 + 自动展开 + 「匹配 M / N」）；**F3 搜索最强**（`#sB` L1991-2037：跨 Tab + `<mark>` 高亮 + 自动跳页）。

**F2 的差异（索引制，不落 DOM）**：按钮带 `data-prompt-index="${i}"` + `data-wake`（L444），`bindCopyButtons()`（L536-548）读 `DATA.data.scenes[idx].prompt_template || .prompt`；toast 文案取 `btn.dataset.wake`（L366-368）；剪贴板同 F1（L378-380 + fallback L391-397）。**缺陷**：L393 写成 `ta.style.csssheet`（应为 `cssText`），隐藏样式未生效。

**F3 的差异（序列化进属性 + 仅 execCommand）**：渲染时 `'<button class="copy-btn" data-c="' + esc(buildPrompt(s, {})) + '">复制</button>'`（L1785）；全局事件委托 `document.addEventListener('click', …[data-c]…)`（L1970-1985）；`doCopy(text)`（L1961-1967）**只走 `document.execCommand('copy')`，没有 `navigator.clipboard`**——同文件注入的 base.js 有完整 `copyText(s,opts)`（L224-255）+ `_fbCopy()`（L215）却未被调用，与 `公共组件/docs/help-template-contract.md:98`「复制指令交互复用 Base P0（copyText/toast）」不一致，属**回归**。反馈走 Base 堆叠 toast（`.hm-toast-stack`，base.js L265-390，最多 5 条 / ≤820px 收窄 3 条）；**复制后不关 Sheet**（L1984）。Sheet 内 `#shCopy` 用 `dataset.pid`（L1926）+ `dataset.c`（L1927）；参数输入 `input` 事件实时重写 `[data-prev]`（L1929-1933）；参数拼接 `buildPrompt`（L1748-1759）= `prompt_template` + 空行 + 每行 `label + ': ' + value`。

**复制文本样例（逐字）**：

```
请你加载技能 卡路里,执行唤醒词「看今日主页」。

我想看今天的主页 dashboard。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

```
请你加载技能 卡路里,执行唤醒词「看今日体重概览」。

我想看今天体重 widget。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。
```

（骨架由 `_triggers.py::_prompt_skeleton()` 统一包裹：`head` + `body` + 固定 `tail`，`tail` 见 `_triggers.py:86`「交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。」。**F1/F2 的 tail 是旧版**「完成后给 1 句话总结,不需要过多文字解释。」——F3 中 `1 句话总结` 出现 0 次、`三句话` 出现 436/436 次，即**新版 prompt 口径以 F3 为准**。）

**已知缺陷清单（复刻时不要照抄）**：F1 `copyMainPrompt` 用 `.word-card:nth-of-type(${i+1})` 定位按钮（L483），按父元素计数 → i>0 时视觉反馈常落错按钮（复制文本本身正确）；F2 `csssheet` 拼写错（L393）；F3 复制路径缺 `navigator.clipboard` 主通道、`JSON.parse` 无 try/catch（L1642，数据坏即白屏）、`HELP.version` 未注入导致关于 Tab 显示「v · HELP 模板 v4」（L1812）、`SUBTITLE`/`META_BLOCKS` 读了不渲染（L1645-1646）。

### 4.4 数据注入点

| 产物 | 注入方式 / 信封 | 实测计数（抽出 JSON 后 `json.loads`） |
|---|---|---|
| **F1** | 模板 `<!--INJECT-DATA-->` 被替换为 `<script>window.__DATA__ = {payload};</script>`（L323，单行，`</` 转义为 `<\/`，占位符残留 0）；信封 `{status, data:{summary,categories,triggers}, message:"已加载 81 唤醒词 / 112 prompt"}`，**无 meta** | payload 30,529 字符；`triggers=81`、变体 31、`main_prompt.text` 81/81、`main_prompt.cli` 81/81、重复唤醒词 0、categories 12；`fill_hints` 字面出现 82 次但**渲染函数从不引用 → 死数据** |
| **F2** | 同 F1（L351）；信封 `{status, meta, data:{summary,categories,scenes}, message}`，条目改 **13 字段** | payload 36,843 字符；`scenes=80`、变体 0；`meta={source:"merged(scene_data + _triggers.py)", mode:"merged", rendered_at:"2026-07-31 20:15:30", scene_data_count:1, triggers_count:80}`；categories 数组声明 11 项但 `total_categories=9`（`目标管理`/`技能协同` 0 场景被 L498 跳过） |
| **F3** | `<script id="help-data" type="application/json">{payload}</script>`（L195）+ `JSON.parse`（L1642），**无信封**，直接是契约对象 | payload 110,207 字符；groups 10 / subgroups 54 / scenes 436、id 436/436 唯一；`types={结果329, 回执79, 过程6}`，无 types 22 条（全 legacy）；130 条含 `____`；重复唤醒词仅 `记身材照`；prompt 70–288 字符（均值 109.6） |
| `公共组件` 模板 | `injector.py --help-template` 注入 `scene_data.json`，校验 `validate_help_data`（必填 + 分组/场景规则 + editable_fields + status 二态 + id 唯一） | 占位符 `<!--INJECT-DATA-->` / `<!--SHARED-HELPERS-->` / `<!--SHARED-CSS-->` 各恰好 1 次，缺失或重复硬拦截（`injector.py:5-7,26-28`） |

**权威链闭环**：`_triggers.py` 436 条 → `render_help_center.py::build_contract()`（`:96-194`）把 `复盘 9` 映射进 `分析`（`CATEGORY_LEGACY_NAME` `:56-58`）→ 分析 `167+9=176`，**正好等于 F3 的 `analysis` 176 场景**；10 分组 / 54 子功能 / 436 场景全部对上，测试亦断言 `tests/test_base_pipeline.py:84-90`（`len(groups)==10`、`total==436`、id 唯一）。

**产物来源定位（git 只读）**：F1 ← 提交 `d54aa9f3`（2026-07-26「help_center 复制反馈 v2.4.12」）的渲染器+模板；F2 ← 提交 `587b5013`（2026-07-31「渲染器升级到 v3.0，支持场景数据合并」）；F3 ← `render_help_center.py` v4.0（`:1-22`，2026-08-13 #316）+ `公共组件/injector.py` + `help_template.html`，`mirror_to_root()`（`:211-234`）实现 ADR-0001 根镜像。**两件 HELP 产物本身不入库**，故无法证明是哪一次渲染调用产生的（子报告 §F 已声明为未确定项）。

**通用注入协议**（`references/html_templates.md:95-110` 的官方写法）：

```python
template = TEMPLATE_PATH.read_text(encoding='utf-8')
if template.count('<!--INJECT-DATA-->') != 1:
    raise ValueError('占位符必须唯一')
payload = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')   # 防断标签
injected = template.replace('<!--INJECT-DATA-->',
    f'<script>window.__DATA__ = {payload};</script>', 1)
out_path.write_text(injected, encoding='utf-8')                          # 原模板不动
```

**数据契约**（`SKILL.md:137-145`）：`{"status": "ok"|"warn"|"fail", "data": {...}, "message": "..."}`；`references/html_templates.md:81-89` 写的是 `ok|warn|error`（**两处不一致**）。

### 4.5 什么让它成为「完整能力速查台」

| 能力 | F1 (0730) | F2 (0731) | F3 (根) | 新版现状 |
|---|---|---|---|---|
| 全量唤醒词清单 | ✅ 81 词 | ✅ 80 场景 | ✅ **436 场景** | ⚠️ `calorie.help.lookup` 需给 `q`，**无「全量」入口** |
| 分类分组 | ✅ 12 类 | ✅ 9 类 × 子功能 | ✅ 10 Tab × 54 子功能 | ❌ 无 |
| 折叠层数 | 2 层（分类→唤醒词→变体） | 4 层（分类→子功能→场景→详情） | Tab→subgroup→mini→Sheet | ❌ 无 |
| 分类导航 | ❌ | ❌ | ✅ 底部 Tab 横滑 + 点击居中 + 滚动同步 | ❌ 无 |
| 搜索 | ❌（v2.4.10 已删） | ✅ sticky + 5 字段 + 自动展开 + 计数 | ✅ 全 Tab + `<mark>` 高亮 + 自动跳页 | ❌ 无 |
| 每条显示 CLI | ✅ `.prompt-cli` | ✅ `.cli` | ❌ 契约无 `data_source` | ⚠️ 只在命中条目里给 `cli` |
| 一键复制 prompt | ✅ 主 + 变体 | ✅ 每场景 | ✅ 卡片 + Sheet | ⚠️ 无复制按钮（HTML 里只有 `<pre>`） |
| 变体/示例 prompt | ✅ 31 变体 | ❌ | ❌ | ❌ |
| 参数表单 + 实时预览 | ❌ | ❌ | ✅ 代码路径（`editable_fields`），本产物 0 场景使用 | ❌ |
| 复制反馈 | ✅ iOS 风 toast 4500ms + 按钮态 2000ms | ✅ 同 | ✅ Base 堆叠 toast（≤5 条，≤820px 收窄 3 条） | ❌ |
| 空态/错误态 | ✅「❌ 数据加载失败」 | ✅ 同 +「暂无场景」/「无匹配」 | ❌ 无 try/catch，`JSON.parse` 失败即白屏 | ⚠️ `missing-data` 抛错 |
| 移动端 | ✅ 600/900 断点 + iOS 安全区 | ✅ 同 | ✅ 500/501/820 断点 + 安全区 | ❌ 只有 `@media(max-width:800px)` 两列 |
| 版本/日期戳 | ✅ 硬编码 footer | ✅ 数据驱动 `rendered_at` + 源标注 | ⚠️ 有区块但 `HELP.version` 未注入 →「v · HELP 模板 v4」 | ❌ |
| 关于/联系作者 | ❌ | ❌ | ✅（`contact` GitHub/Issues） | ❌ |
| 深色模式 | ❌ | ❌ | ❌（三文件 `prefers-color-scheme` 0 次） | ❌ |
| 单文件离线可手机打开 | ✅ 外部 src/href = 0 | ✅ | ✅ | ❌ |

> 结论：**F3 是最完整的「完整能力速查台」**（436 场景 + 搜索 + Tab + Sheet + 参数预览 + 关于页），但 **F3 丢了 F1/F2 的逐场景 CLI 展示与 F1 的变体示例，且没有空态守卫、没有 `navigator.clipboard` 主通道**。复刻基线取 F3，增强项回补 F1/F2。

### 4.6 可重建规格（验收条款，逐条可勾选）

1. 单文件 HTML，**零外部请求**（无 CDN、无字体、无图片外链），可离线双击打开、可手机打开。
2. 顶部标题区必须含：技能名 + 大标题 + 一句话副标题 + 引导语（F3 形态：三步条「🔍 找场景 → 📋 复制 prompt → …」）+ 统计行（场景数；F1/F2 形态为类别数 / 唤醒词数 / prompt 数）。
3. 信息架构固定为 **4 层**：L1 分组（Tab）→ L2 子功能（`<details>` 默认展开）→ L3 场景卡（2 列网格）→ L4 详情（底部 Sheet 或折叠区）。**禁止破坏该层级**（`docs/adr/0008:77`）。
4. L3 卡片必备元素：场景标题、唤醒词 chip、类型徽章（`process`/`result`/`receipt` 等）、复制按钮；`status==='【待开发】'` 时渲染待开发徽章且复制按钮仍可点。
5. 每个场景卡 summary 层必须**直接可复制主 prompt**（不展开也能复制）。
6. 复制内容必须与 `prompt_template` **逐字相等**（不做 trim/换行改写）；有 `editable_fields` 时 = `prompt_template` + 一个空行 + 每行 `label + ': ' + value`（空值行省略），`required` 为空时**拒绝复制**并提示缺失字段名。
7. 复制实现必须**双通道**：优先 `navigator.clipboard.writeText()`，不可用或 reject 时回退隐藏 `<textarea>` + `document.execCommand('copy')`；**不得只实现其中一种**（F3 只实现回退 = 回归）。
8. 复制反馈必须双重：toast（含「已复制」+ 场景/唤醒词标识，可手动关闭，自动消失）+ 按钮 `copied` 态（绿底 + 450ms 弹簧动画，2000ms 复原）；**复制后不关闭详情层**。
9. 复制按钮的提示文案必须回显**被复制的唤醒词/变体名**，避免复制错（F1 的 `nth-of-type` 定位 bug 必须修掉）。
10. 必须有全局搜索：sticky 吸顶、输入即过滤（大小写不敏感）、命中 `title/wake_word/分组名/子功能名` 任一即显示、自动展开所属子功能与分组、`<mark>` 高亮、显示「匹配 M / N」、清空恢复全量并回原位。
11. 必须有空态与错误态文案，不得白屏（F3 缺 try/catch，复刻必须补）。
12. 必须带版本号 + 生成时间戳（footer 或关于区）；契约给了 `subtitle` 就必须渲染。
13. 移动端必须过 375px / 768px / 1280px 三档，含 `<meta name="viewport">`、≥1 个 `@media`、无固定 px 高度的 `<svg>`、表格包在 `overflow-x:auto` 内；iOS 安全区用 `env(safe-area-inset-bottom)`。
14. 数据必须外置为可注入 JSON（`window.__DATA__` 或 `<script type="application/json">`），页面渲染由数据驱动，不手写场景列表；场景数/分组数/子功能数**由数据算出**（436 / 10 / 54 可机械断言）。
15. 注入器必须校验三个占位符各恰好 1 次（`<!--INJECT-DATA-->` / `<!--SHARED-HELPERS-->` / `<!--SHARED-CSS-->`），缺失或重复硬拦截；并对 `</` 转义。
16. 每条场景必须能追到 `wake_word → cli → prompt` 三元组，且与 SoT 零差异；**建议保留 F1/F2 的逐场景 CLI 展示**（`data_source` 带 `python ` 前缀，`docs/adr/0008:36-39`）。
17. 折叠展开在 Android WebView / 旧 iOS Safari 上必须有兜底（`summary` click 后 50ms 检查 `open` 是否翻转，未翻转则强制翻转，且跳过复制按钮点击；F1 L422-438）。
18. 令牌必须单一来源：只有一组 `:root` 变量（F3 有两套同名变量互相覆盖，实际生效值是 base.css 那套）。
19. 触控目标：主要操作按钮 ≥44px（F1/F2 的 24px 高按钮视为不达标）。
20. 可访问性：toast `role="status"` + `aria-live="polite"`；图标按钮给 `aria-label`；折叠用原生 `<details>/<summary>` 或等效键盘可达实现。
21. 守卫测试至少 4 条：① 契约校验通过；② 注入后 3 占位符 0 残留且 `id="help-data"` 存在；③ 场景数零丢失（`total == 数据源条数`）且 id 唯一；④ 产物含公共 `copyText` 实现、无自研复制重复实现。

> 上述 21 条与子报告 `t71-help-dissect.md §E.3` 的 20 条编号验收标准一致（子报告更细，含每条的行号依据）。

---

## 5. 视觉标杆规格（`templates/临时样例/` 两个文件）

### 5.1 定位差异 + **裁决事实**

| | B1 `统一主面板_视觉标杆.html`（23.4KB / 858 行） | B2 `沉浸主面板_视觉标杆v2.html`（29.6KB / 1058 行） |
|---|---|---|
| 标题 | `<title>统一主面板 · 视觉标杆</title>`（L6） | `<title>沉浸主面板 · 视觉标杆 v2</title>`（L6） |
| 定位 | **浅色统一主面板**：白底 + 卡片 + KPI 网格 + 趋势 | **深色沉浸主面板**：黑底 hero + 活动环 + 时间线 |
| 结构 | `.wrap(960px)` → `header.hero` → `.hero-number`（大数 + 环）→ `.kpi-grid`(4) → `.trend` → `.todo` → `.recent` → `.quick` → `.cmds` | `.wrap(1040px)` → `header.hero-dark` → `.rings`（3 环 + 中心 82%）→ `.transition-band` → `.editorial` → `.kpi-grid`(4) → `.tl-row` 时间线 → `.quick` → `.cmds` |
| 渐变 | **0 个** | 3 个（hero 径向光晕 L85、`.transition-band` L652、图例色块 L843-845） |
| 空态 | ✅ 3 种（`.empty` / `.todo-empty` / `.log-empty`） | ❌ 0 种 |
| 卡片模型 | **卡片制**（每个区块白底 + 1px `--lineS` + 阴影） | **编辑制**（`.kpi` 无卡片，仅左侧 1px 细线 + 留白） |
| 主色 | `#007aff`（A 系唯一主色） | `#0a84ff` + `--pink #ff375f`（与 A 系冲突） |

> ⚠️ **裁决事实（决定性）**：同目录 `templates/设计审查报告.html`（C1，713 行）在 **`:655-657`「十、视觉标杆(统一后的最好看版本)」明确指名 B1**，并在 `:660-662` 说明 B1 的骨架来自 `home_dashboard` 四段式 + `weight_log_receipt` 的 56px hero-number + `help_center` 的复制动画/iOS Toast；`:666-673` 给出 B1 声称满足的清单（A 系 token、无渐变 hero、A 系输入框、单一底部复制按钮、标题无 emoji、无渐变文字、无三色渐变、无金金银铜、无 pulse、卡片化表格 + 12px th + `--lineS` 轻分隔、环 + 双线 SVG 趋势、400px 断点 + Toast 安全区）。**B2 在 C1 中完全未被提及**，是更晚、未经裁决的探索。
> **结论：新版 HELP HTML 的验收目标 = B1（结构 + token 基线），并从 B2 取 3 处嫁接**（见 §5.5）。

### 5.2 设计 token（逐值，含行号）

**共享 token（B1 `:17-43` / B2 `:17-56`）**

| token | 值 | 角色 |
|---|---|---|
| `--bg` | `#ffffff` | 声明但**从未被引用**（死 token） |
| `--bg-soft` | `#f5f5f7` | 次级面（环轨道、输入底、`.cmd-row` 底、`.trend-stat`） |
| `--bg-section` | `#fafafa` | 页面底（`body`） |
| `--card` | `#ffffff` | 卡片（B2 从未引用） |
| `--ink` / `--ink2` / `--ink3` | `#1d1d1d` / `#3c3c43` / `#8e8e93` | 主/次/弱文字（Apple 灰阶，`--ink3` 禁用于正文，需过 AA 4.5:1） |
| `--line` / `--lineS` | `rgba(60,60,67,.12)` / `rgba(60,60,67,.06)` | 硬分隔 / 软分隔（列表行 `--lineS` + 首行无边框） |
| `--accent` | `#007aff`（B1）/ `#0a84ff`（B2，**与 A 系冲突，勿采用**） | 唯一主色 |
| `--accent-soft` | `rgba(0,122,255,.08)` / `rgba(10,132,255,.15)` | 主色底（输入 focus 光环、趋势面积） |
| `--green` / `--green-soft` | `#34c759` / `rgba(52,199,89,.10)`；B2 `#30d158` / `rgba(48,209,88,.15)` | 达标 |
| `--orange` / `--orange-soft` | `#ff9500` / `rgba(255,149,0,.10)`；B2 `#ff9f0a` / `rgba(255,159,10,.15)` | 警示 |
| `--red` / `--red-soft` | `#ff3b30` / `rgba(255,59,48,.10)`；B2 `#ff453a` / `rgba(255,69,58,.15)` | 失败 |
| `--pink` / `--pink-soft` | 仅 B2：`#ff375f` / `rgba(255,55,95,.15)`（后者声明未用） | 第四环（不建议引入） |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.04)` | 卡片静止 |
| `--shadow` | `0 1px 3px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.04)` | 浮层/hover |
| `--shadow-lg` | `0 2px 8px rgba(0,0,0,.06), 0 16px 40px rgba(0,0,0,.06)` | toast |
| `--r-sm` / `--r` / `--r-lg` / `--r-xl` | `8px` / `14px` / `20px` / `28px`（xl 仅 B2 且未使用） | 圆角阶梯；另用 `999px` 药丸、`50%` 圆、字面量 `10/6/4px` |
| `--ease` | `cubic-bezier(.4,0,.2,1)` | 标准缓动 |
| `--ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | 弹性缓动 |
| B2 深色区 | `--dark:#000` / `--dark-2:#1c1c1e` / `--dark-3:#2c2c2e` / `--dark-ink:#fff` / `--dark-ink2:rgba(235,235,245,.6)` / `--dark-ink3:rgba(235,235,245,.3)` / `--dark-line:rgba(255,255,255,.08)` / `--dark-lineS`(未用) | L18-25 |

**排版**

| 项 | B1（统一主面板） | B2（沉浸 v2） |
|---|---|---|
| font-family | `-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif`（L47） | 同 + `"SF Pro Text"`（L60） |
| 等宽 | `"SF Mono",monospace`（L382, L449） | `"SF Mono",monospace`（L400, L576） |
| 数字特性 | `font-feature-settings:"tnum","ss01"`（L53，每个数字元素另加 `tnum`） | 同（L66） |
| 正文 | `14px` | `14px` |
| h1 | **32px/700** ls `-.4px` lh 1.2（L71-74）；≤640px → 26px（L587） | **40px/700** ls `-.6px` lh 1.1（L104-107）；≤640px → 30px（L686） |
| hero 大数 | **56px/700** ls `-1.2px` lh 1（L128-131）；≤640px → 44px（L589）；unit 20px/500（L136） | lead-num **80px/700** ls `-2.5px` lh .9（L274-277）；≤640px → 60px（L692） |
| KPI 数值 | **28px/700** ls `-.7px`（L202-207）；unit 14px/500 | **30px/700** ls `-.8px`（L330-335）；unit 13px/500 |
| 区块 h2 | **17px/600** ls `-.2px`（L248-250）；`.hint` 12px | **24px/700** ls `-.4px`（L250-252）+ `.num` 13px（「01 / 06」） |
| 卡片/次级标题 | 18px/700（L283）/ 15px/500（L369） | 18px/600（L506）/ 15px/600（L410） |
| 触控/辅助 | 13px hint / 12px detail / 11px badge | 11px KPI label（低于 B1 的 13px 下限） |

**类型阶梯（C1:349 的绑定规则）**：`56px hero > 28px KPI > 17px h2 > 15px body > 13px hint`，**相邻级差 ≥4px 且字重级差 ≥100**。B1 完全符合；B2 是同一「阶梯种类」但编辑级量级（`80 > 30 > 24 > 15 > 13`）。

**布局**

| 项 | B1（统一主面板） | B2（沉浸 v2） |
|---|---|---|
| 容器 | `.wrap{max-width:960px;margin:0 auto;padding:32px 20px 80px}`（L55；= C1:49 / C1:645 的规范值） | `.wrap{max-width:1040px;margin:0 auto;padding:0 0 80px;overflow:hidden}`（L68） |
| KPI 网格 | `grid-template-columns:repeat(4,1fr);gap:12px`（L164-166） | `repeat(4,1fr);gap:0` + 单元格 `border-left:1px solid var(--lineS)`（L309-320） |
| 行式列表 | `.log-row` `44px 1fr auto` gap 10（L355-362）；`.todo-row` flex gap 14（L296-301） | `.tl-row` `72px 1fr auto` gap 20（L386-393）；`.todo-item` `32px 1fr auto`（L448-455）；`.cmd-item` `40px 1fr auto`（L548-555） |
| 双栏 | `.hero-number` `1fr auto` gap 24（L114-117）/ `.trend-stats` `repeat(3,1fr)`（L265-267） | `.rings` `auto 1fr` gap 36（L121-124）/ `.ring-item` `auto 1fr auto`（L161-165）/ `.lead-stat` `1.2fr 1fr` gap 32（L264-272） |
| 断点 | `≤640px` + `≤400px`（**两文件相同**，C1:673 把 400px 列为标杆契约） | 同 |
| 固定元素 | `.toast` fixed bottom 24px 居中 z9999（L522-541）；`#backTop` fixed 右下 24px 42px 磨砂圆（L564-582）；**两文件均无 `position:sticky`** | 同 |

**`≤640px` 变化**：B1 —— `.wrap` padding `20px 16px 60px`、h1 26px、`.hero-number` 单列 + 大数 44px + 环 72px、KPI 2 列、`.section` padding `18px 20px`、趋势统计单列（L584-594）；B2 —— hero padding `32px 20px 40px`、h1 30px、环单列居中 + 180px、`.editorial` `32px 20px 0`、`.lead-stat` 单列、KPI 2 列且分隔线由竖改横、`.tl-row` `56px 1fr auto`（L684-699）。
**`≤400px` 变化**：KPI 1 列 + toast `left:12px;right:12px`（B1 L595-599 / B2 L700-706，B2 用 `!important` 属坏味）。

**动效**：仅 1 个 `@keyframes copySuccess`（`0%→40% scale(1.12)[B2 为 1.15]→100%`，B1:495-499 / B2:604-608）；过渡 `.15s`/`.2s`/`.35s spring`/`.45s spring`；**两文件均无 `prefers-reduced-motion`**。

**组件形状**（可照抄的骨架）：KPI `.kpi > .label(.icon + .badge) + .main/.value + .unit + .detail`（B1:632-636）；单环 `svg{rotate(-90deg)}` r=38 `dasharray 238.76`（=2πr）`dashoffset 43` → 82%（B1:620-627）；三环 r=85/65/45 `dasharray 534.07/408.41/282.74`（B2:719-766）；趋势 `viewBox 0 0 800 180` + 3 条 `--lineS` 网格线 + accent 折线/面积 + green `stroke-dasharray="4 4"` 折线 + `r=5`/`r=9` 光晕标记（B1:654-678）；B2 另加 `--ink3` 目标线 `dasharray="2 4"` + 图例色块（B2:836, 841-848）；徽章/药丸 `.status-pill`（B1:83-104）/`.status-chip`（B2:203-230）/`.tl-tag`（B2:423-431）；空态 `.empty` padding `48px 20px` + 40px 图标 `opacity:.5` + h3 17px/600（B1:544-553）；输入 `.field input` 灰底无边框 → focus 白底 + accent 边 + `0 0 0 3px --accent-soft`（B1:409-438）；命令行 `.cmd-row` 灰底 8px 圆角 + mono 12.5px + `.copy-mini` ghost 按钮 + 底部唯一 `.copy-all` 药丸（B1:441-519）。

**两个标杆都没有、但 HELP 必须有的组件（实测 grep 均为 0 命中）**：表格 / `th` / `td`、nav / tab、`<pre>` / `<code>`、`<details>` 折叠、搜索框、面包屑、`position:sticky`、`aria-*` / `role=`、`:focus-visible`、`prefers-reduced-motion`、`prefers-color-scheme`、`@media print`、`env(safe-area-inset-*)`。
→ **A 系表格规范从 C1 取**：`table{width:100%;border-collapse:collapse;font-size:13px}`（C1:124-127）、`th{text-align:left;padding:10px 12px;font-size:11.5px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--line);background:transparent}`（C1:128-134）、`td{padding:12px;border-bottom:1px solid var(--lineS);color:var(--ink2);vertical-align:top}`（C1:135-138）、`tr:last-child td{border-bottom:none}`（C1:139）；C1:637 建议 `th` 升到 12px、`td` padding 14px，C1:671 要求「表格卡片化 + 12px th + `--lineS` 轻分隔」。
→ **`<pre>` 命令块从旧模板取**（全树唯一一处）：`health_dashboard.html:125-131` `background:#1d1d1f;color:#f5f5f7;padding:12px 16px;border-radius:10px;font-size:11.5px;line-height:1.55;overflow-x:auto;font-family:"SF Mono",monospace;white-space:pre-wrap`（采用时 radius 改 `var(--r-sm)` 8px）。
→ **通用按钮从旧模板取**：`health_dashboard.html:132-140`（`.btn` accent 底 8px 圆角）与 `home_dashboard.html:547-553`（`min-height:44px` 触控目标，iOS 44pt 规范）。
→ **进度条从旧模板取**：`home_dashboard.html:542-546`（`.kpi .bar{height:4px;border-radius:2px}` + accent/green/orange/red）。
### 5.3 B1 vs B2：以哪个作 HELP 模板

**结论：B1 作结构 + token 基线，从 B2 取 3 处嫁接。**

选 B1 的 6 条理由：① C1 `:655-674` 指名 B1 为统一目标，B2 未被提及（验收即对标 B1）；② B2 把语义色全部换成 iOS **dark-mode** 值（`#0a84ff`/`#30d158`/`#ff9f0a`/`#ff453a`）并引入第五个色相 `--pink`，与 C1:353「主色只能有一个值」冲突；③ HELP 是异构内容（散文/表格/命令块/FAQ 折叠/参数表/示例），B1 的 `.section` 卡片是通用容器，B2 的编辑制刻意取消卡片、靠 48px 留白（B2:240, 308），一旦区块需要重排/折叠/新增就会退化；④ B1 无渐变 + 有真空态，正好覆盖参考型页面的两个高频失败场景；⑤ B1 的 960px 度量更适合文字密集的速查内容；⑥ B1 的 `.hint` 槽位天然承载「这条命令做什么 / 什么时候用」注解。

**从 B2 嫁接的 3 项**：
- **G2-1 CSS 计数器编号列表**（B2:443-472, 543-566）：命令/FAQ 列表自动编号、零 JS，`/01` 前缀是非 emoji 的干净索引；
- **G2-2 `.tl-tag` 标签 chip**（B2:423-431）：承载每行的参数元信息（类型 / 必填 / 示例），比 B1 的 `.name-nutri` 内联 span 更紧凑；
- **G2-3 趋势图例 + 目标线**（B2:362-379, 836）：若 HELP 画任何图则采用。

**不要从 B2 取**：深色 hero（HELP 的 h1 必须可扫读，C1:613 要求无背景 hero）、`#0a84ff`、`--pink`、无卡片 KPI 网格、`overflow:hidden` 外壳（会破坏 sticky/锚点）、80px lead number。

**必须新增（两标杆都没有）**：表格组件（§5.2 的 C1 规范）、`<pre>`/`code` 命令块、nav/TOC、`<details>` FAQ、sticky TOC 或 sticky 区块头、`:focus-visible`、`prefers-reduced-motion`、toast 的 `safe-area-inset`（C1:673 要求）、`aria-*`/`role=` 语义。

### 5.4 验收清单（新版 HELP HTML 必须满足，逐条可勾选）

**token 与颜色**

1. **只有一个主色**：`--accent` 计算值恰为 `#007aff`；无第二个蓝、无紫、无粉（B1:27；C1:353, 398, 604）。构建产物中 grep `#0a84ff`/`#af52de`/`#ff375f` 必须为 0。
2. **灰阶恰 3 级** `#1d1d1d`/`#3c3c43`/`#8e8e93`（B1:22-24；C1:400）；**边框只用 alpha token** `rgba(60,60,67,.12)`/`rgba(60,60,67,.06)`，不用实色 hex（B1:25-26；C1:401, 671）；**`--ink3` 不得承载正文**（须过 WCAG AA 4.5:1，C1:432）。
3. **页面底 `#fafafa`、卡片面 `#ffffff`**，卡片不靠边框也能与页面区分（B1:20-21, 48）。
4. **零渐变**：最终样式表无 `linear-gradient`/`radial-gradient`（B1 无；C1:345, 613, 690-691）。

**排版**

5. **阶梯可观测**：页面最大数字 ≥48px/700，区块 `h2` 17px/600，正文 15px，提示 12-13px；相邻级差 ≥4px、字重级差 ≥100（B1:128-131, 248-250, 426, 254；C1:349）。
6. **字体栈逐字一致**：正文 `-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif`（B1:47），等宽 `"SF Mono",monospace`（B1:382, 449）。
7. **所有数字带 `font-feature-settings:"tnum"`**（B1:53 + 各数字元素；C1:359, 696-697）。
8. **`h1`/`h2` 内无 emoji**（emoji 只允许出现在 `.eyebrow` 或 KPI `.icon` 槽，B1:607-608 vs 633；C1:554-555, 670）。

**布局**

9. **`.wrap` max-width 960px + 页面 padding `32px 20px 80px`**（B1:55；C1:645）。
10. **形状 token 不得自造**：圆角只从 `{8,14,20,999,50%}` 取（B1:38-40）；静止卡片 `0 1px 2px rgba(0,0,0,.04)`、浮起 `0 1px 3px rgba(0,0,0,.04),0 8px 24px rgba(0,0,0,.04)`，不得用深色/重阴影（B1:35-37；C1:404）。
11. **列表分隔线 1px `--lineS` + 首行无边框**（B1:301-303, 361-363；C1:359）。
12. **两档断点都生效**：≤640px KPI 2 列、环/大数块单列、`.wrap` padding `20px 16px 60px`；≤400px KPI 1 列、toast `left:12px;right:12px`（B1:584-591, 595-598；C1:673）。

**组件**

13. **KPI 四槽齐全**：label 行（可选 icon + 右对齐 badge）、value + unit 同基线、detail 行（B1:632-636, 181-218）。
14. **进度环**：`svg{transform:rotate(-90deg)}`，轨道与数值同宽、`stroke-linecap:round`、dash 几何符合 `2πr`、中心百分比标签（B1:620-627）。
15. **逐字命令放进 `<pre>` 板**（不写散文里）：mono 11.5-12px、`line-height:1.55`、`white-space:pre-wrap`、`overflow-x:auto`、8px 圆角、深色或 `--bg-soft` 底（规范取自 `health_dashboard.html:125-131`，重映射到 A 系 token）。
16. **复制能力单一可预期 + 双反馈**：每行右侧 1 个 `.copy-mini` + 区块底部恰 1 个 `.copy-all` 药丸（不得放在 summary 层，C1:363, 621, 669）；成功后同时给 ① 绿色 `.copied` 按钮 + 450ms `copySuccess` 弹簧动画，② 底部居中药丸 toast 1800ms（B1:788-809, 819-848, 493-499, 522-541；C1:367, 662）。
17. **表格按 A 系规范**：`<th>` 大写 11.5-12px/600 `--ink3` + **透明底** + 1px `--line` 下边框；`<td>` padding 12-14px + 1px `--lineS` 下边框 + `--ink2`；末行无边框；表格放在 `.section` 卡片内（C1:124-143, 637, 671）。
18. **空态存在且有样式**：居中卡片 + padding `48px 20px` + 40px 图标 `opacity:.5` + 17px/600 h3 + 13px `--ink3` p（B1:544-553）。
19. **`#backTop` 仅在 `scrollY > 400` 出现**，42px 磨砂圆、`bottom/right:24px`、点击平滑回顶（B1:564-582, 850-855）。
20. **焦点可见 + 动效可关**：存在 `:focus-visible` 环（B1:432-437 只移除默认 outline，属 WCAG 风险）；`prefers-reduced-motion` 下关闭 `copySuccess` 缩放与 toast 滑入（**两标杆均缺，须主动补**）。

**复刻时须修的既有缺陷**：`.trend-svg` 的 `preserveAspectRatio="none"`（B1:660, B2:822）会把 `r=5/r=9` 标记拉成椭圆 → 改 `xMidYMid meet` 或 `vector-effect:non-scaling-stroke`；toast/`#backTop` 缺 `env(safe-area-inset-bottom)`（B1:524, 566；C1:673 明确要求）；`#backTop` 的 `backdrop-filter` 需降级底色；B1:693/709 的 `<span class="state">` 是无 CSS 规则的死标记；B2 环中心 82% 与内环 60% 自相矛盾（B2:736 vs 733），不得当数据契约；B1:787 的 `id="cmdList"` 未被 JS 使用；B1:791 把命令文本同时写进 `.cmd` 与 `onclick` 字面量（须单一来源）。

> 深度证据（逐行）另见：`D:\ilife\.scratch\research\benchmark-visual-spec.md`（758 行，含 C1 裁决依据与全部 token/组件/断点取值）。

---

## 6. HTML-First 行为契约（`SKILL.md:13-49` 逐条原文）

### 6.1 第 1 条 · HTML 同步（L15）

> 「1. **HTML 同步**：本技能的所有优化和变动、脚本的所有变动都必须体现在相应的 HTML 页面上。HTML 是技能功能的可视化镜像,任何功能变更若未同步到 HTML 视为未完成。」

配套 L16：「2. **优先级**：本强制性规定优先级最高,高于下方所有操作规范和功能说明。」；L17：「3. **变更确认**：对该技能的所有文件、脚本的任何一行修改都需要明确得到用户的 1 次确认,未经确认不得执行写入操作。」

### 6.2 第 4 条 · HTML-First 铁则（L18-19）

> 「4. ⭐ **HTML-First 铁则(V1.3 原则 11)**：唤醒词命中 SKILL 后,**只要 §已实现模板表 列出对应 HTML 模板,AI 必须 invoke HTML 工作流(渲染 → 打开)**。**严禁文字答**。trigger 无对应 HTML 模板时可文字答(但默认推荐 §输出位置 生成 HTML)。违反 = 协议 fail mode,改 SKILL.md 不改正,循环 ≤ 3 次。详见 §AI 行为:HTML-First 表。」

**规则拆解**：
- 判据 = 命中唤醒词后，**该唤醒词在 §已实现模板表（L151-219 的「强制 trigger」列）有对应模板**；
- 命中 → **必须**渲染并打开 HTML；**严禁**文字答；
- 无对应模板 → **允许**文字答，但默认仍推荐生成 HTML；
- 违反 = 协议 fail mode，重试上限 **3 次**。
- 复述见 L64：「AI 收到 trigger 词后,先查 §已实现模板表 是否有对应 HTML。有则**强制 invoke HTML**(渲染 → 打开),无则可文字答。」与 L221：「表中"强制 trigger"列出的所有 trigger 词命中后,**AI 必须** invoke 对应 HTML(渲染 → 打开),**严禁文字答**。」

### 6.3 渲染失败处理契约（L19，v2.4.19 · #242）

> 「⭐ **渲染失败处理契约(v2.4.19 增 · #242)**：render 脚本执行**必须** invoke,不得手写 HTML 兜底。判定成功 = 退出码 0 且产物 HTML 文件存在(不是看 stdout 有无表情符号——GBK 控制台下 emoji 输出可能被替换但渲染已成功,脚本已内置 `_io_guard` 防崩)。渲染失败(退出码非 0 / 产物缺失)→ 向用户输出**错误回执**(说明失败原因 + 建议命令),**严禁**手写 HTML 代替渲染产物。违反 = 协议 fail mode。」

**契约三件套**：
1. 成功判据 = **退出码 0 且产物文件存在**（不看 stdout 内容）；
2. 失败动作 = 输出**错误回执**（原因 + 建议命令）；
3. **硬禁止** = 手写 HTML 兜底。

### 6.4 第 5 条 · Wizard Verify 决策铁则（L20-28，v2.4.3）

> 「5. ⭐ **Wizard Verify 决策铁则(v2.4.3 增,用户实测反馈)**：对 `记围度` / `记体脂` 等**配置型 wizard** 的 trigger,AI **必须**根据用户输入决定走哪条流程：」

| 场景 | 触发 | AI 行为 | 命令模板 |
|---|---|---|---|
| 场景 1（主动填） | 说「记围度」/「记体脂」但**没给数据** | 不传预填 args（空 wizard）→ 用户手动填 → 复制 prompt → AI 调 CLI | `python scripts/render_body_measurements_wizard.py` |
| 场景 2（预填 verify）⭐ | 说「记围度 胸 95 腰 80 臀 100…」**给数据** | 传预填 args → 用户打开 verify → 复制 prompt → AI 调 CLI | `python scripts/render_body_measurements_wizard.py --date 2026-07-26 --chest-cm 95 --waist-cm 80 …` |
| 场景 3（信任） | **明确说**「直接录」/「我信你」 | 跳过 wizard，直接调 `body_measurements.py add` 写库 + 返回 `crud_receipt.html` 回执 | `python scripts/body_measurements.py add …` |

> 「**禁止**：**不**判断用户场景就**直接调 CLI** 写库(跳过 verify)— 即使数据看起来对。这是 v2.4.2 → v2.4.3 修复的根因：用户实测反馈 "我的维度 XXXXXXX" 后 AI 应走场景 2(预填 verify)而不是直接 CLI。违反 = 协议 fail mode。」

### 6.5 第 6 条 · 写入后回执契约（L30-43，v2.4.14）

> 「6. ⭐ **写入后回执契约(v2.4.14 增 · V1.0 §02 第②特性)**：**所有写库类 CLI 子命令必须按固定契约返 stdout**(满足 V1.0 §02 第②特性"写入后回执 = ID + 时间戳 + 影响行数")：」

| 子命令类 | 调用示例 | 必须 stdout 包含 |
|---|---|---|
| 写库类（`weight`/`add`/`delete`/`update-meal` 等） | `calorie_tracker.py weight 70 --note '...'` | `id=<N>` + `日期 <YYYY-MM-DD> <HH:MM:SS>` + `影响 N 行` + 写入字段摘要 |
| HTML 模板类触发（§04 决策矩阵 ✅） | `calorie_tracker.py list` | `⚠️ ACTION=SEND_TO_USER \| HTML=<绝对路径>`（V1.3 §HTML 交付协议） |
| v1.0 场景类单条记录（`记体重`/`记运动`/`记一餐`） | `calorie_tracker.py weight` | 场景化 HTML 回执（`render_weight_receipt.py --live` / `render_exercise_receipt.py --live-add` / `render_crud_receipt.py --live-diet-add`）；**AI 不得退回纯文字回执** |

> **硬约束**（L38-41）：
> - 「**单条 CRUD 不加 HTML(旧契约)** — 总纲 §04 决策矩阵 ❌ 不做,AI 自作主张接通 render = 违反 §⚠️ 强制性规定 第 4 条(HTML-First 反模式)。⚠️ **v1.0 场景化例外**(2026-08-03 · ticket #43 终审)：`记体重`/`记运动`/`记一餐` 等已入 446 场景清单,HTML 回执以 `.scratch/scene-index-recovered.md` + `docs/scene-prompts/` 为准,不再受本条约束」
> - 「**模板类必加 HTML** — 总纲 §04 决策矩阵 ✅ 必做,AI 跳过渲染 = 违反 §⚠️ 强制性规定 第 4 条」
> - 「**写库回执必有 ID** — V1.0 §02 第②特性"ID + 时间戳 + 影响行数"是 Verifiable 的硬规则」
> - L43：「验证脚本：`scripts/check_write_contract.py`(待加 V2.4.15) — 扫所有子命令,确保每个写库类 CLI 都 print id+timestamp+rows_affected。」

### 6.6 第 7 条 · AI 验证协议（L45-49，v2.5 · ADR-0007）

> 「7. ⭐ **AI 验证协议(v2.5 增,Issue 6 反馈)**：AI 在 SKILL 内声称"用户没 X / 用户从未 Y"前,**必须**先对该 X/Y 对应的 DB 表执行 SELECT 验证。3 个 fail mode 红线示例：」

- (a) 写脏数据后断言原值（`daily_goal.weight_goal` 被误写成字符串 `'--help'`）；
- (b) 空值误判「从未设过」——`NULL`/`0`/空串 ≠ 从未设过；
- (c) 类型误判——DB 返回非预期类型时不得假设为 0 或「未设」。
- 「违反 = 协议 fail mode,等同 HTML-First 反模式(第 4 条)。详见 ADR-0007。」

### 6.7 其他相关硬规定

- L55：「本技能所有数据操作必须通过 CLI,禁止直连数据库。」（§操作规范）
- L65：不存 deprecation 库存，破坏性变更立即生效。
- L1233-1247（§HTML 交付协议 V1.3）：渲染脚本 stdout 末行 `⚠️ ACTION=SEND_TO_USER | HTML=<绝对路径>`；agent 必须解析 → **send 文件**（不只是告诉路径）。
- 模板设计原则（L127-133）：占位符唯一（`<!--INJECT-DATA-->` 恰好 1 次）／首屏状态徽章 + 4-6 个 KPI 卡／主体按维度分组 + `details/summary` 折叠／尾部「复制回 AI」按钮／空态错误态明确显示。

---

## 7. 必须复刻清单 vs 明确不做

### 7.1 必须复刻（缺一即「不完全一样」）

| # | 必须复刻项 | 旧版出处 | 新版现状 | 验收方式 |
|---|---|---|---|---|
| M1 | **436 条唤醒词逐条可命中**（10 场景 / 11 分类 / 434 唯一词） | `_triggers.py:109-4447` | ✅ SoT 已全量移植（436/434，计数一致） | 逐词跑 `calorie.help.lookup --params '{"q":"<词>"}'` 非空 |
| M2 | **frontmatter 触发词路由**（旧 69 项 + `卡路里HELP`） | `SKILL.md:3-7` | ❌ 新版 description 无任何触发词 | 新 description 必须含高频词 + `卡路里HELP` |
| M3 | **`卡路里HELP` 速查台可打开** | `SKILL.md:295-299`、`render_help_center.py` | ❌ 无（`templates/help.html` 40 行占位且未发布） | 一条命令产出 §4.6 全 15 条的 HTML |
| M4 | **HTML-First 铁则 + 失败回执契约** | `SKILL.md:18-19` | ⚠️ 新版 SKILL.md 无该段（只有「`--html` 显式落盘」） | 新 SKILL.md 必须写入等价契约（渲染判据/失败回执/禁手写兜底） |
| M5 | **写入回执契约**（ID + 时间戳 + 影响行数 / receipt） | `SKILL.md:30-43` | ✅ 35 写键走 `receipt` 形（但字段是 `ok/message/receipt`，无 `id=`+`影响 N 行` 文本） | 逐键断言回执含 id/时间/行数 |
| M6 | **Wizard verify 决策规则** | `SKILL.md:20-28` | ⚠️ 无 wizard；规则未在 SKILL.md 落地 | 要么复刻 wizard 页，要么在 SKILL.md 写「配置型写键必须先 verify」 |
| M7 | **47 个已有模板的 HTML 必须与旧版同质** | `templates/*.html` | ⚠️ 新版是通用 KPI 壳（无明细表/图表/折叠分组） | 逐模板截图对比（§2 判定「新版已有」的 47 项） |
| M8 | **18 个需移植模板** | §2 列表 | ❌ 无键或无 HTML | 逐条补键 + 补渲染器 |
| M9 | **HELP 速查台视觉标杆** | `templates/临时样例/` | ❌ 无 | §5.4 的 20 条验收清单；**验收目标 = B1 `统一主面板_视觉标杆.html`**（`templates/设计审查报告.html:655-657` 指名裁决），B2 只取 3 处嫁接 |
| M9b | **HELP 速查台机制（F3 基线）** | 根 `卡路里.html` + `公共组件/assets/help_template.html` | ❌ 无 | §4.6 的 21 条；数据契约 + 单文件注入 + 4 层 IA + 搜索 + 复制双通道 |
| M10 | **输出目录与命名规范** | `SKILL.md:88-113`、`references/html_templates.md:27-68` | ⚠️ `--html <路径>` 显式落盘，无 `<中文command>_<YYYYMMDD>_<HHMMSS>[_N]` 默认命名 | 默认命名 + 同秒 `_N` 冲突保护 |
| M11 | **数据契约 `status: ok\|warn\|fail`** | `SKILL.md:135-145` | ⚠️ 新版用 envelope + `shape`（无 `status` 字段） | 明确映射关系或保留兼容字段 |
| M12 | **占位符唯一 + `</` 转义注入协议** | `references/html_templates.md:95-110` | ✅ 新版 `render/html.ts` 自带 `pageShell` 转义 | 注入器校验占位符计数 |
| M13 | **移动端 375px 可读** | 0730 L258-291、标杆 L584-597 | ⚠️ 只有 `≤800px` 两列 | 375/1280 两档截图 |
| M14 | **模板设计原则 5 条**（首屏 KPI / 折叠分组 / 尾部复制按钮 / 空态 / 响应式） | `SKILL.md:127-133` | ⚠️ 部分满足 | 逐条勾选 |

### 7.2 明确不做（判定 out of scope，理由引自 #39）

| # | 不做项 | 理由 |
|---|---|---|
| O1 | **定时复盘 / cron**（`cron_setup.html`、`render_cron_setup.py`、`开启/关闭/查定时复盘` 3 词） | #39 `docs/calorie-parity-39.md:21`：「定时 cron … out of scope（#14 范围），词保留路由 + HELP，仅执行层不承接」 |
| O2 | **飞书发送/归档**（`review --full` 的 send/archive、HTML 交付协议的飞书路径） | 同上（飞书发送/归档 out of scope） |
| O3 | **训记同步**（`xunji_bridge.py push-plan/backfill`、`同步到训记`/`拉训记实绩`） | 同上（训记 sync/push out of scope） |
| O4 | **mmx vision 拍营养表**（`nutrition_label_wizard.html`、`render_nutrition_label.py`、`拍营养表记一餐`/`补记一餐`） | 同上（mmx vision out of scope） |
| O5 | **DSH 面板**（`plugin-calorie` 取数） | #39 + 图 #63「面板全面化归本技能全面面板图」 |
| O6 | **跨技能联动执行**（`cross_skill_sleep.html`、`render_cross_skill_cs02.py`、作息/备忘） | #39「外联动 out of scope」；图 #63「本图只动技能包与 CLI 出口，不碰插件包」 |

### 7.3 ⚠️ 判定权在维护者，我不替其决定

| # | 待裁决问题 | 选项与影响 |
|---|---|---|
| Q1 | **「71 行」这个验收数字是否作废** | 实测 §完整清单 66 行 / 61 唯一名；若不改，验收无法机械复现（§1.5） |
| Q2 | **「完全一样」是否包含「DOM 同构」** | 若只要求「有 HTML + 数据对」，47 项已达标；若要求「视觉/交互同质」，47 项全部要重做（#39 已把 DOM 不兼容列为 P2 二期，本次 #63 是否升级？） |
| Q3 | **8 个「子集」模板算不算完全一样**（§2.2） | `combined_analysis` 154 词 → 新版 1 个 KPI 壳，落差最大 |
| Q4 | **wizard 类页面（4 个）是否复刻** | 新版 argv 直传已能写库，但旧版「先给用户看再写」的 verify 体验会丢；与 M6 绑定 |
| Q5 | **18 个需移植模板全部进一期，还是分批** | 运动 6 项、营养 4 项、趋势 2 项是集中区 |
| Q6 | **新版 6 个 `templates/*.html` 的去留** | 不在 `package.json.files`、运行时零引用；要么并入 HELP 重建，要么删 |
| Q7 | **`templates/goal_config.html` 幽灵引用** | SoT 引用但文件不存在（真实文件是 `goal_config_nutrition/water`）；SoT 要不要订正 |
| Q8 | **数据契约 `status` vs envelope `shape`** | 旧契约 `ok/warn/fail`（另一处写 `ok/warn/error`），新版 envelope 无 `status`；是否保留兼容 |
| Q9 | **`calorie.help.center` 的定位** | 现在只服务身材照片 10 键；是全量速查台复用该键，还是新增 `calorie.help.center` 全量语义 |
| Q10 | **唤醒词可达性（G16）是否算「逐键可用」一维** | t67 审计：约 43/77 键有可执行唤醒词入口，34/77 无 |
| Q11 | **HELP 复刻取哪一代架构** | F1（自研 2 层）/ F2（自研 4 层 + 搜索）/ F3（Base 参数化 + Tab + Sheet）。**子报告建议取 F3**，但 F3 丢了逐场景 CLI 展示与变体示例——「完全一样」是否要求把 F1/F2 的独有能力回补，需维护者定 |
| Q12 | **视觉目标是否锁定 B1** | C1:655-657 指名 B1，但 C1 是 CSS-only 路线（`:601-648`，无 TS 相关内容）；B1 的 `#007aff` 与 F3 现用的 `--blue:#007aff`/`#0a63ce` 是否统一，需维护者定 |
| Q13 | **复制交互是否强制走 Base P0** | `公共组件/docs/help-template-contract.md:98` 要求复用 Base `copyText/toast`，但 F3 实际只用了 `execCommand`；新版是照契约实现双通道，还是沿用 F3 现状 |
| Q14 | **`--r-xl 28px` / `--pink` / 深色区是否引入** | B2 独有；C1 要求单一主色且无渐变，若引入需维护者批准 |

---

## 附：本次盘点用到的复现命令（只读）

```powershell
# 旧 SoT 计数（不运行旧 Python）
$p='D:\2Study\StudyNotes\SKILLS\卡路里\scripts\_triggers.py'
(Get-Content -LiteralPath $p -Raw -Encoding UTF8 | Select-String -Pattern "['`"]wake_word['`"]\s*:" -AllMatches).Matches.Count   # 436

# 旧模板 → 唤醒词 → 渲染器（本次产出 CSV）
# 见 D:\ilife\.scratch\research\t71-old-trigger-records.csv

# 模板 → 引用脚本
Get-ChildItem 'D:\2Study\StudyNotes\SKILLS\卡路里\scripts' -Filter *.py |
  ForEach-Object { Select-String -Path $_.FullName -Pattern '([a-z0-9_]+\.html)' }

# 新版键表
Get-Content 'D:\ilife\packages\skill-calorie\src\cli\keys.ts' | Select-String 'calorie\.'

# 新版渲染出口
Get-Content 'D:\ilife\packages\skill-calorie\src\render\index.ts'
```

**安全声明**：本次盘点对旧树零写入（未创建、修改、重命名、删除任何文件）；未执行旧树任何 Python 脚本；未读取 `.个人笔记不允许参考`。
