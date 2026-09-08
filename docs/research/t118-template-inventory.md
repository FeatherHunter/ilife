# #118 模板分型取证清单

- **归档说明（FX-118-8）**：本文件由 `.scratch/t118/template-inventory.md` **归档入仓**（原路径是归档前旧位置、勿据此取件）。仓内指针恒为本路径；`tooling/classify-templates.mjs --inventory` 的缺省值即本文件。
- **术语统一（FX-118-10②）**：契约分型三名并存问题已消除——第三型的**唯一中文标签为「遗留」**（契约常量 `TEMPLATE_KINDS` 的 `legacy`），本清单不再使用旧的第三名。
- 取证范围：`packages/skill-*/templates/*.html`，实测 **65** 个（与预期 65 一致；`packages/skill-memo/` 无 `templates/` 目录，`packages/skill-*/` 下再无其他 `*.html`）。
- 行号口径：UTF-8 解码后按 LF 切分（65 个模板全部 LF、无 BOM、末尾带换行），与 ripgrep 行号一致。
- 标记为**逐字**匹配（区分大小写、不含空格变体）：`<!--CONTENT-->`、`<!--INJECT-DATA-->`、`<!--SHARED-CSS-->`、`<!--SHARED-HELPERS-->`、`<!--CHARTS-HELPERS-->`、`<!--NO-SHARED-->`。
- 取证时 65 个模板与其余仓库文件均为只读（只写入本清单）。

## 0. 汇总

### 0.1 总数与分型计数

| 技能 | 模板数 | 数据页（有 INJECT-DATA ＋ 容器） | 内容页（有 CONTENT） | 遗留 | 两类特征冲突 |
| --- | --- | --- | --- | --- | --- |
| skill-bill | 16 | 0 | 16 | 0 | 0 |
| skill-calorie | 6 | 0 | 0 | 6 | 0 |
| skill-chef | 8 | 0 | 8 | 0 | 0 |
| skill-home | 21 | 0 | 21 | 0 | 0 |
| skill-memo-ilife | 6 | 6 | 0 | 0 | 0 |
| skill-schedule | 8 | 0 | 8 | 0 | 0 |
| **合计** | **65** | **6** | **53** | **6** | **0** |

### 0.2 标记出现统计（逐字匹配）

| 标记 | 命中模板数 | 总出现次数 | 单模板最大出现次数 |
| --- | --- | --- | --- |
| `<!--SHARED-CSS-->` | 65 / 65 | 65 | 1 |
| `<!--SHARED-HELPERS-->` | 65 / 65 | 65 | 1 |
| `<!--CONTENT-->` | 53 / 65 | 53 | 1 |
| `<!--INJECT-DATA-->` | 6 / 65 | 6 | 1 |
| `<!--CHARTS-HELPERS-->` | 0 / 65 | 0 | 0 |
| `<!--NO-SHARED-->` | 0 / 65 | 0 | 0 |

### 0.3 标记包裹形态分布

| 标记 | 裸（无包裹标签） | 被 `<style>…</style>` 包裹 | 被 `<script>…</script>` 包裹 |
| --- | --- | --- | --- |
| SHARED-CSS | 53（bill 16 · chef 8 · home 21 · schedule 8，全部在 `:6`） | 12（calorie 6 个在 `:7`；memo-ilife 4 个在 `:7`、2 个在 `:8`） | 0 |
| SHARED-HELPERS | 59（53 个在 `:14`；calorie 6 个在 `:37`） | 0 | 6（memo-ilife 全部） |
| CONTENT | 53（全部在 `:12`） | 0 | 0 |
| INJECT-DATA | 0 | 0 | 6（memo-ilife 全部，均落在自带容器内） |

- 「裸」= 标记独占一行，且该行不在任何 `<style>`/`<script>` 开闭区间内。
- 12 个 style 包裹形态是**标记与标签同行**：`<style><!--SHARED-CSS--></style>`。
- 6 个 script 包裹形态中，INJECT-DATA 行形如 `<script id="payload" type="application/json"><!--INJECT-DATA--></script>`，HELPERS 行形如 `<script><!--SHARED-HELPERS--></script>`。

### 0.4 payload 容器（`<script id="…" type="application/json">…</script>`）

| 容器 id | 模板数 | 所在模板（容器行号） |
| --- | --- | --- |
| `payload` | 6 | change_category.html:110 · init_report.html:107 · memo_query.html:64 · sync_report.html:324 · wish_complete.html:92 · wish_plan.html:95 |
| 其他 id | 0 | — |
| 无容器 | 59 | 其余全部模板 |

- 6 个容器的开标签、`<!--INJECT-DATA-->`、闭标签**在同一行**（容器跨度 = 单行），即 INJECT-DATA 全部落在自带容器内。
- 全仓 65 个模板中 `application/json` 字面量仅出现在上述 6 处；其余 59 个模板无任何 `type="application/json"` 容器。

### 0.5 生产可达性三态（是否被 `src/**` 引用）

| 三态 | 数量 | 技能分布 | 依据 |
| --- | --- | --- | --- |
| 生产在用 | 59 | bill 16 · chef 8 · home 21 · memo-ilife 6 · schedule 8 | 各技能 `src/render/templates.ts` 闭集数组（按**无扩展名 stem** 登记）＋ `loadTemplate()` 读 `templates/<name>.html`；`package.json:16` 的 `files` 含 `templates/*.html` |
| 仅测试引用 | 6 | calorie 6 | `packages/skill-calorie/test/skill-t11.test.mjs:35-36`（枚举目录并断言 6 个文件名）＋ `:40`/`:41`（断言两标记各恰 1）；`packages/skill-calorie/package.json:16-19` 的 `files=[dist,SKILL.md]` **不含** templates |
| 零引用 | 0 | — | — |

生产在用的登记点（文件:行号）：

- `packages/skill-bill/src/render/templates.ts:7-24`（`BILL_TEMPLATES`，16 项）、`:52-58`（`loadTemplate`）
- `packages/skill-chef/src/render/templates.ts:7-16`（`CHEF_TEMPLATES`，8 项）、`:36-42`
- `packages/skill-home/src/render/templates.ts:7-29`（`HOME_TEMPLATES`，21 项）、`:62-68`
- `packages/skill-memo-ilife/src/render/templates.ts:7-14`（`MEMO_TEMPLATES`，6 项）、`:19-25`
- `packages/skill-schedule/src/render/templates.ts:7-16`（`SCHEDULE_TEMPLATES`，8 项）、`:36-42`

登记数组与磁盘文件**逐名一致**（bill 16/16、chef 8/8、home 21/21、memo 6/6、schedule 8/8，无「登记无文件」也无「有文件未登记」）。

其他引用形态（非 `src/**`，不计入三态）：

- `packages/skill-calorie/test/calorie-c43.test.mjs:124` 引用 `diet.html`；`packages/skill-calorie/test/cmd-read-t11.test.mjs:109` 引用 `home.html`（均为测试临时目录产物路径）。
- `docs/research/t71-old-baseline-inventory.md:33`、`:723` 提及 calorie 的 `templates/help.html`（文字描述，非代码引用）。
- `docs/public-installer-47.md:51` 的 `home.html` 是命令输出的临时文件名，与模板文件无关。

## 1. 逐模板清单

记号说明：`CSS`=`<!--SHARED-CSS-->`、`HELPERS`=`<!--SHARED-HELPERS-->`、`CONTENT`=`<!--CONTENT-->`、`INJECT`=`<!--INJECT-DATA-->`；`@N` 为行号。包裹形态：`裸`=独占一行无包裹标签，`style`=被 `<style>…</style>` 包裹，`script`=被 `<script>…</script>` 包裹。行数为 LF 行数（末尾换行不计）。

| 技能 | 模板 | 行数 | 标记（行号） | 包裹形态 | 容器 id | 生产可达性 | 分型 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| skill-bill | account_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | account_write.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | analysis_compare.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | analysis_overview.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | analysis_trend.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | goal_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | goal_write.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | help.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | link_submit.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | record_add.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | record_detail.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | record_range.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | record_search.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | record_today.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | record_update.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-bill | setup_run.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-calorie | diet.html | 40 | CSS@7 · HELPERS@37 | CSS=style（:7） · HELPERS=裸（:37） | — | 仅测试引用 | 遗留 |
| skill-calorie | exercise.html | 40 | CSS@7 · HELPERS@37 | CSS=style（:7） · HELPERS=裸（:37） | — | 仅测试引用 | 遗留 |
| skill-calorie | goal.html | 40 | CSS@7 · HELPERS@37 | CSS=style（:7） · HELPERS=裸（:37） | — | 仅测试引用 | 遗留 |
| skill-calorie | help.html | 40 | CSS@7 · HELPERS@37 | CSS=style（:7） · HELPERS=裸（:37） | — | 仅测试引用 | 遗留 |
| skill-calorie | home.html | 40 | CSS@7 · HELPERS@37 | CSS=style（:7） · HELPERS=裸（:37） | — | 仅测试引用 | 遗留 |
| skill-calorie | photo-gallery.html | 40 | CSS@7 · HELPERS@37 | CSS=style（:7） · HELPERS=裸（:37） | — | 仅测试引用 | 遗留 |
| skill-chef | cooking_run.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-chef | help.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-chef | history_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-chef | history_record.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-chef | recipe_search.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-chef | recipe_view.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-chef | recipe_write.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-chef | shopping_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | care_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | care_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | help.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | inventory_records.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | inventory_round.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | item_detail.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | item_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | item_search.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | item_update_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | location_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | location_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | outfit_pick.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | shopping_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | shopping_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | stats_alert.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | stats_overview.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | tag_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | tag_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | ticket_query.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | ticket_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-home | trip_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-memo-ilife | change_category.html | 257 | CSS@7 · INJECT@110 · HELPERS@111 | CSS=style（:7） · INJECT=script＋容器（:110） · HELPERS=script（:111） | payload（:110） | 生产在用 | 数据页 |
| skill-memo-ilife | init_report.html | 225 | CSS@8 · INJECT@107 · HELPERS@108 | CSS=style（:8） · INJECT=script＋容器（:107） · HELPERS=script（:108） | payload（:107） | 生产在用 | 数据页 |
| skill-memo-ilife | memo_query.html | 104 | CSS@7 · INJECT@64 · HELPERS@65 | CSS=style（:7） · INJECT=script＋容器（:64） · HELPERS=script（:65） | payload（:64） | 生产在用 | 数据页 |
| skill-memo-ilife | sync_report.html | 512 | CSS@8 · INJECT@324 · HELPERS@325 | CSS=style（:8） · INJECT=script＋容器（:324） · HELPERS=script（:325） | payload（:324） | 生产在用 | 数据页 |
| skill-memo-ilife | wish_complete.html | 239 | CSS@7 · INJECT@92 · HELPERS@93 | CSS=style（:7） · INJECT=script＋容器（:92） · HELPERS=script（:93） | payload（:92） | 生产在用 | 数据页 |
| skill-memo-ilife | wish_plan.html | 272 | CSS@7 · INJECT@95 · HELPERS@96 | CSS=style（:7） · INJECT=script＋容器（:95） · HELPERS=script（:96） | payload（:95） | 生产在用 | 数据页 |
| skill-schedule | help.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-schedule | plan_day.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-schedule | plan_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-schedule | record_compare.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-schedule | record_day.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-schedule | record_detail.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-schedule | record_range.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |
| skill-schedule | record_receipt.html | 16 | CSS@6 · CONTENT@12 · HELPERS@14 | 裸（三处均无包裹） | — | 生产在用 | 内容页 |

清单行数核对：65 行数据行 = bill 16 + calorie 6 + chef 8 + home 21 + memo-ilife 6 + schedule 8。

## 2. 无法归类或两类特征冲突的模板

**两类特征冲突（同时含 CONTENT 与 INJECT-DATA）：0 个。** 65 个模板中不存在任何一个同时含两类标记的模板。

**无法落入「数据页／内容页」两类的模板：6 个**，全部属 skill-calorie（无 CONTENT、无 INJECT-DATA、无容器）：

| # | 模板 | 冲突点（文件:行号） |
| --- | --- | --- |
| 1 | `packages/skill-calorie/templates/diet.html` | 只有 `<!--SHARED-CSS-->`（:7，被 `<style>` 包裹）＋ `<!--SHARED-HELPERS-->`（:37，裸）；无 `<!--CONTENT-->`、无 `<!--INJECT-DATA-->`、无 payload 容器 |
| 2 | `packages/skill-calorie/templates/exercise.html` | 同上（CSS:7 被 `<style>` 包裹；HELPERS:37 裸；无 CONTENT／INJECT-DATA／容器） |
| 3 | `packages/skill-calorie/templates/goal.html` | 同上（CSS:7 被 `<style>` 包裹；HELPERS:37 裸；无 CONTENT／INJECT-DATA／容器） |
| 4 | `packages/skill-calorie/templates/help.html` | 同上（CSS:7 被 `<style>` 包裹；HELPERS:37 裸；无 CONTENT／INJECT-DATA／容器） |
| 5 | `packages/skill-calorie/templates/home.html` | 同上（CSS:7 被 `<style>` 包裹；HELPERS:37 裸；无 CONTENT／INJECT-DATA／容器） |
| 6 | `packages/skill-calorie/templates/photo-gallery.html` | 同上（CSS:7 被 `<style>` 包裹；HELPERS:37 裸；无 CONTENT／INJECT-DATA／容器） |

这 6 个模板的共同事实：静态 HTML 骨架（`<div class="wrap">` 起，`:19`），页面数据靠外部脚本/CLI 落盘（无占位符注入通道）；除两个 SHARED 标记外无任何标记；文件内唯一的 `<script>` 是 `:38` 的内联 `copyData()` 函数（不是 `type="application/json"` 容器）。

## 3. 分型边界案例

1. **有 CONTENT 又无 SHARED-CSS：0 例。** 53 个内容页全部同时含 `<!--SHARED-CSS-->`（`：6`）与 `<!--SHARED-HELPERS-->`（`:14`），三者同现，无缺项。
2. **有容器但无 INJECT-DATA：0 例。** 6 个容器（memo-ilife）全部内含 `<!--INJECT-DATA-->`，且同在一行。
3. **有 INJECT-DATA 但不在自带容器内：0 例。** 6 个 INJECT-DATA 全部位于 `<script id="payload" type="application/json">…</script>` 内。
4. **既无 CONTENT 又无 INJECT-DATA：6 例**（calorie 全部 6 个）——按三分法只能落「遗留」，见 §2。
5. **同一标记两种包裹形态并存。** `<!--SHARED-CSS-->`：53 裸（bill 16 · chef 8 · home 21 · schedule 8，均在 `:6`，位于 `<head>` 内、无 `<style>` 容器）vs 12 被 `<style>` 包裹（calorie 6 在 `:7`；memo-ilife change_category:7 · memo_query:7 · wish_complete:7 · wish_plan:7 · init_report:8 · sync_report:8）。`<!--SHARED-HELPERS-->`：59 裸（53 个在 `:14`、calorie 6 个在 `:37`）vs 6 被 `<script>` 包裹（memo-ilife）。
6. **数据页无 CONTENT。** 6 个 memo-ilife 数据页既无 `<!--CONTENT-->` 也无 `<!--CONTENT-->` 的替代物；其数据通道是「自带容器 + 页内自有 `<script>`」（如 `packages/skill-memo-ilife/templates/memo_query.html:64` 容器、`:66` 起自有 `<script>`）。
7. **calorie 6 模板的标记形态自相矛盾。** CSS 被 `<style>` 包裹（`:7`）而 HELPERS 裸在 `</div>` 之后（`:37`），同一文件内两种包裹风格并存。
8. **`<!--CONTENT-->` 不在 base-paint 契约的五标记集合内。** `docs/base-paint-contract.md:127` 的 `TEMPLATE_MARKERS` 只含 injectData／sharedHelpers／sharedCss／chartsHelpers／noShared；而 53 个内容页依赖的 `CONTENT_MARKER` 由四个技能各自定义：`packages/skill-bill/src/render/html.ts:55`、`packages/skill-chef/src/render/html.ts:70`、`packages/skill-home/src/render/html.ts:61`、`packages/skill-schedule/src/render/html.ts:64`（对应 `fillTemplate` 在 `:60`／`:75`／`:66`／`:69`）。
9. **非标记注释只出现在 1 个模板。** `packages/skill-memo-ilife/templates/sync_report.html` 含 5 条装饰性 HTML 注释（`:296`、`:304`、`:307`、`:310`、`:313`，其中 `:304` 含 `>` 字符）；其余 64 个模板的 HTML 注释数等于其标记数（无多余注释）。
10. **`<!--CHARTS-HELPERS-->`／`<!--NO-SHARED-->` 全仓 0 命中。** 65 个模板均不含这两个标记（与 `docs/research/t92-base-exports-actual.md:115` 所述 `packages/**` 内计数为 0 一致）。
