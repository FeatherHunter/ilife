# 场景 05 健身计划所需五条既有命令：今天做了什么

调研对象：仓库 `D:\ilife`，包 `packages/skill-calorie`。全部结论来自读源码，未跑命令。
五条命令的注册表条目（`packages/skill-calorie/src/cli/keys.ts:97,98,105,113,129`）**五条全部** `shape: 'stat'`：

| 命令名 | 标题 | 注册处 |
| --- | --- | --- |
| `calorie.view.plan` | 训练计划看 | `keys.ts:97` |
| `calorie.view.plan-wizard` | 构建向导 | `keys.ts:98` |
| `calorie.view.contraindication` | 禁忌扫描 | `keys.ts:105` |
| `calorie.view.exercise-review` | 计划复盘 | `keys.ts:113` |
| `calorie.view.process-progress` | 落地训练进度 | `keys.ts:129` |

分发的总入口是 `packages/skill-calorie/src/cli/cmd_read.ts` 的 `switch`（五个 `case` 分别落在 963／968／1021／438／604 行）。

---

## 一、calorie.view.plan（训练计划看）

### 1. 今天吃什么（参数）

**一个参数都不收。**

`cmd_read.ts:963-967`：

```
case 'calorie.view.plan': {
  const v = buildPlanView(db);
  const metrics = nums({ totalSessions: v.totalSessions, totalMovements: v.totalMovements, totalWeeks: v.totalWeeks });
  return { data: { metrics }, html: renderPlanHtml(v) };
}
```

`buildPlanView` 的签名是 `buildPlanView(db: DatabaseSync)`（`src/render/planPlate.ts:30`），没有任何第二参数。传 `--params` 也不会被读。

### 2. 今天走哪条路（装配 + 取数）

- 分发：`cmd_read.ts:963`
- 数据视图：`src/render/planPlate.ts:30` `buildPlanView`
- 取数：`src/fetch/plan.ts:209` `getPlan(db)`，返回 `{ config, sessions }`；配置行类型 `PlanConfigRow`（`fetch/plan.ts:189`），会话行类型 `PlanSessionRow`（`fetch/plan.ts:197`）
- HTML：`src/render/html.ts:532` `renderPlanHtml`
- 缺失阻断：无配置且无会话时抛 `missing-data`「无训练计划（先定训练计划）」（`planPlate.ts:32-34`）

### 3. 产物形态：**片段**（不是完整文档）

`renderPlanHtml` 末尾 `return pageShell('calorie', 'ilife:calorie:plan', '训练计划看', body);`（`html.ts:539`）。

`pageShell` 在 `html.ts:38-45`，第一段拼的就是：

```
'<section class="' + cx('page') + '" data-skill="…" data-slot="…" …>'
```

`cx` 来自 `base-paint`（`html.ts:14`），而 `STYLE_PREFIX = 'ilife-'`（`node_modules/.pnpm/base-paint@0.2.0/node_modules/base-paint/dist/style.js:21`），`cx(...)` 定义在同文件 `style.js:35`。故 **`cx('page')` = `ilife-page`**，产物首字符就是 `<section class="ilife-page"`。

结论：**片段**，无 `<!doctype html>`、无 `<meta charset>`、无内联样式表，`<h1>` 直接挂在 `<section>` 下（`html.ts:43`）。

### 4. 缺什么

- **不收任何参数**：没有周次（week）、没有日期（date/start/end）、没有动作（movement）筛选口，`cmd_read.ts:963-967`。场景 05 若要「看某周」「看某天练什么」，现有命令无法表达。
- **8 条上限的静默截断**：`renderPlanHtml` 里 `v.sessions.slice(0, 8)`（`html.ts:533`），第 9 条起不出现在页面上，且不告知被截断。
- **只出 KPI 卡**：每场会话只画 `W{week}D{day}#{session_index}` + 标签 + 动作条数（`html.ts:533-538`），动作名与组数一律不展开；也没有图表区块。
- **片段形态**：交付出去不是可独立打开的文档。

---

## 二、calorie.view.plan-wizard（构建向导）

### 1. 今天吃什么（参数）

`cmd_read.ts:968-975`：

```
case 'calorie.view.plan-wizard': {
  const plan = params['plan'];
  if (typeof plan !== 'object' || plan === null || Array.isArray(plan)) fail(2, '缺参数 plan（PlanInput 对象）');
  const catalog = params['catalog'];
  const v = buildPlanWizardView(plan, (catalog as string[] | undefined) ?? undefined);
  …
}
```

| 参数 | 必填 | 含义 |
| --- | --- | --- |
| `plan` | 是 | 待校验的整份计划对象（`PlanInput`，含 `config` ＋ `weeks` 数组）；不是对象即 `fail(2)`（`cmd_read.ts:970`） |
| `catalog` | 否 | 已知动作名清单（字符串数组），供校验器判定动作是否在册；非法即 `bad-input`「catalog 须为字符串数组」（`planPlate.ts:66-68`） |

形状约束在 `buildPlanWizardView`（`planPlate.ts:56-76`）：`plan` 必须是对象、`plan.weeks` 必须是数组（`planPlate.ts:57-63`）；`PlanInput` 类型定义在 `fetch/plan.ts:61`，其子结构 `PlanWeekInput`（`fetch/plan.ts:56`）、`PlanDayInput`（`fetch/plan.ts:51`）、`PlanSessionInput`（`fetch/plan.ts:42`）、`PlanMovement`（`fetch/plan.ts:35`）。

### 2. 今天走哪条路（装配 + 取数）

- 分发：`cmd_read.ts:968`
- 数据视图：`src/render/planPlate.ts:56` `buildPlanWizardView`
- 取数／校验：`src/fetch/plan.ts:71` `validatePlan(plan, { catalog })`，**纯 dryRun、不落库**（`planPlate.ts:71`；视图字段 `dryRun: true` 钉死在 `planPlate.ts:53,75`）
- HTML：`src/render/html.ts:542` `renderPlanWizardHtml`
- 计数口径：`checkedSessions` ＝ 输入里会话的条数，坏计划也照计 N（`planPlate.ts:72-74`），与 `errorCount` 分开

注意：这条命令**不读库**。`buildPlanWizardView` 的入参里没有 `DatabaseSync`，与另外四条不同。

### 3. 产物形态：**片段**（不是完整文档）

`return pageShell('calorie', 'ilife:calorie:plan-wizard', '构建向导', body);`（`html.ts:551`）。同 §一，`cx('page')` = `ilife-page`，产物首字符 `<section class="ilife-page"`。

结论：**片段**。正文只有两块 KPI 卡（可落地／纯校验）＋最多 5 条错误 ＋ 最多 5 条警告（`html.ts:543-550`），错误与警告各截断到 5 条。

### 4. 缺什么

- **不是向导，是校验器**：只吃一份**已经写好的完整计划 JSON**，没有任何分步输入、没有动作库浏览、没有按部位/器械选动作的口子（`planPlate.ts:56-76`）。要「构建」得由外部先把整棵树拼好。
- **不读库、不落库**：校验结果与库中现有计划无关，也不能把结果落盘（`planPlate.ts:53` `dryRun: true`）。
- **错误只显示 5 条**：`v.errors.slice(0, 5)`（`html.ts:543`），超出部分静默丢弃，页面上没有「还有 N 条」的提示。
- **没有周次/日期维度**：不接受 `week`、`date`，无法「只校验第 3 周」。
- **片段形态**。

---

## 三、calorie.view.process-progress（落地训练进度）

### 1. 今天吃什么（参数）

`cmd_read.ts:604-613`：

```
case 'calorie.view.process-progress': {
  const end = optStr(params, 'end') ?? latestFoodDate(db) ?? todayISO();
  assertISO(end, 'end');
  const v = buildProcessProgressView(db, end);
  …
}
```

| 参数 | 必填 | 含义 |
| --- | --- | --- |
| `end` | 否 | 窗口右端点（ISO 日期）；缺省取库里最新饮食日期，再缺省取今天（`cmd_read.ts:605`）。非 ISO 即抛 `bad-input`（`trendMiscPort.ts:379` 的 `assertISODate`） |

**窗口是钉死的 7 天**：`const start = shiftISODate(end, -6)`（`src/render/trendMiscPort.ts:381`）。没有 `start`，也没有天数参数，调用方无法把窗口拉长或缩短。

### 2. 今天走哪条路（装配 + 取数）

- 分发：`cmd_read.ts:604`
- 数据视图：`src/render/trendMiscPort.ts:378` `buildProcessProgressView`
- 取数：**不经 `src/fetch/` 模块，直接写 SQL**（`trendMiscPort.ts:382-391`）：
  - `workout_plan_config`（`title`、`total_weeks`，`trendMiscPort.ts:382-384`）
  - `workout_plans` 里非休息日的条数＝`plannedDays`（`trendMiscPort.ts:385-387`）
  - `exercise_log` 在 `[start, end]` 内的条数与 `duration_minutes` 之和（`trendMiscPort.ts:388-391`）
- HTML：`src/render/trendMiscPortDocs.ts:382` `buildProcessProgressDoc`
- 缺失阻断：既无计划又近 7 天无运动记录时抛 `missing-data`「无训练计划且近 7 天无运动记录」（`trendMiscPort.ts:392`）

### 3. 产物形态：**完整文档**

`buildProcessProgressDoc` 末尾走 `assembleDocPage({ docTitle, title: '落地训练进度', eyebrow: 'calorie.view.process-progress · 趋势其他移植域', subtitle: …, content, charts: false })`（`trendMiscPortDocs.ts:402-409`）。

`assembleDocPage` 在 `packages/skill-calorie/src/shared/docPage.ts:47`，它用 `docShell` 拼模板，而 `docShell` 的第一行常量就是：

```
'<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n…'
```

（`shared/docPage.ts:38-43`，同处写出 `<title>`、`<!--SHARED-CSS-->`、`<div class="wrap ilife-page">`、`<!--SHARED-HELPERS-->`；样式表由 `buildStyleSheet().css + blocksCss()` 注入，见 `shared/docPage.ts:49-53`）。

结论：**完整文档**，`<!doctype html>` 起头、带 `charset="utf-8"`、带共用样式表与 helpers。

### 4. 缺什么

- **窗口固定 7 天且不接受 `start`**（`trendMiscPort.ts:381`，`cmd_read.ts:605`）：场景 05 若要「看整月落地情况」无法表达。
- **没有周次维度**：`plannedDays` 是**全计划**非休息日条数（`trendMiscPort.ts:385-387`），不分周，也没有「第 N 周已落地几场」。
- **没有按动作看落地**：只有会话条数与总时长两个数字（`trendMiscPort.ts:398-399`），拿不到「哪个动作真做了」。
- **页面只有 4 张 KPI 卡**：计划有无／计划训练日／近 7 天运动／近 7 天时长（`trendMiscPortDocs.ts:384-389`），没有图表（`charts: false`，`trendMiscPortDocs.ts:408`），也没有窗内逐日明细表。
- 与「计划」的关联是**弱关联**：只读 `workout_plan_config` 的一行标题与周数，不读 `workout_plans` 的日期派生（对比 §四的 `exercise-review` 会按 `start_date` 把会话日期算出来）。

---

## 四、calorie.view.exercise-review（计划复盘）

### 1. 今天吃什么（参数）

`cmd_read.ts:438-447`：

```
case 'calorie.view.exercise-review': {
  const { start, end } = defaultRange(db, params);
  const v = buildReviewView(db, start, end);
  …
}
```

| 参数 | 必填 | 含义 |
| --- | --- | --- |
| `start` | 否 | 窗口左端（ISO 日期）；与 `end` 都给则必须 `start <= end`（`cmd_read.ts:219-221`） |
| `end` | 否 | 窗口右端（ISO 日期）。`defaultRange`（`cmd_read.ts:214-231`）依次认 `end` → `date` → `today`，缺省取库内最新饮食日期或今天 |
| `date` / `today` | 否 | 只是 `end` 的别名，优先级低于 `end`（`cmd_read.ts:215`） |

缺省窗口＝ 7 天（`defaultRange` 的 `defDays = 7`，`cmd_read.ts:214`）。

### 2. 今天走哪条路（装配 + 取数）

- 分发：`cmd_read.ts:438`
- 数据视图：`src/render/exercisePort.ts:407` `buildReviewView(db, start, end)`
- 取数：两条腿
  - `src/fetch/plan.ts:209` `getPlan(db)` 取计划（`exercisePort.ts:409`），并要求 `plan.config.start_date` 存在，否则 `missing-data`「无训练计划（先定训练计划）」（`exercisePort.ts:410-412`）
  - `src/fetch/exercise.ts:284` `listWindow(db, start, end)` 取窗内运动记录，空则 `missing-data`「无运动记录：{start} ~ {end}」（`exercisePort.ts:413-414`）
- 会话日期是**算出来的**：由 `plan.config.start_date` 的周一 ＋ `(week-1)*7 + (day-1)` 派生（`exercisePort.ts:397-405,425`），休息日跳过（`exercisePort.ts:424`）
- HTML：`src/render/sportPortDocs.ts:350` `buildReviewDoc`（同文件 348 行注释写明对照 `exercise_review.html`）
- 命中判定：会话完成＝当日有任一记录；动作完成＝计划动作名与实做名**双向子串**命中（`sportPortDocs.ts:424` 的 subtitle 里如实写明）

### 3. 产物形态：**完整文档**

`buildReviewDoc` 末尾 `return assembleDocPage({ docTitle, title: '计划复盘 ' + v.start + ' ~ ' + v.end, eyebrow: 'calorie.view.exercise-review · 运动移植域', subtitle: v.planTitle + …, content, charts })`（`sportPortDocs.ts:420-427`；`charts` 被置 `true`，见 `sportPortDocs.ts:366,377`）。

同 §三的论证：`assembleDocPage`（`shared/docPage.ts:47`）→ `docShell`（`shared/docPage.ts:36-44`）首行即 `'<!doctype html>\n<html lang="zh-CN">…<meta charset="utf-8">'`。

结论：**完整文档**，且因为 `charts: true` 还额外带上图表 helpers 槽位（`shared/docPage.ts:37,53`）。

### 4. 缺什么

- **没有动作参数**：场景 05 的唤醒词里有「看动作完成率」（`src/triggers/routing.ts:364`），但命令只认 `start`/`end`，拿不到「只看某个动作」。动作排序／筛选只能靠页面全量列出。
- **必须有运动记录才出页**：窗内一条 `exercise_log` 都没有就 `missing-data`（`exercisePort.ts:414`）。「这周一场没练」这种最需要复盘的场景反而直接阻断。
- **必须有计划 `start_date`**：无计划即阻断（`exercisePort.ts:410-412`），不能只看实绩。
- **缺省 7 天，没有周/月/全部参数**：routing.ts:359-364 里「本周／本月／全部」三个唤醒词**用的是同一串写死的 `start`/`end`**（`2026-09-01`~`2026-09-07`），本月与全部并未真的换窗口；只有「全部」那条给了 `2026-08-31`~`2026-09-07`（`routing.ts:361`）。也就是说窗口差异全靠调用方临时拼参数，命令本身没有 `range=week|month|all`。
- **「未完成训练」没有独立出口**：`ReviewView` 里有 `unhit` 字段（`exercisePort.ts:394`），但页面上要靠整表里 `hit` 列自己看。

---

## 五、calorie.view.contraindication（禁忌扫描）

### 1. 今天吃什么（参数）

`cmd_read.ts:1021-1026`：

```
case 'calorie.view.contraindication': {
  const part = optStr(params, 'part') ?? 'all';
  const v = buildContraView(db, part);
  …
}
```

| 参数 | 必填 | 含义 |
| --- | --- | --- |
| `part` | 否 | 扫描部位，缺省 `all`；**只接受 `all`／`腰`／`膝`／`肩` 四个值**，其它值抛 `bad-input`「part 非法（all/腰/膝/肩）」（`src/render/insightPlate.ts:120-121`）。中文映射表另见 `src/output.ts:298` |

### 2. 今天走哪条路（装配 + 取数）

- 分发：`cmd_read.ts:1021`
- 数据视图：`src/render/insightPlate.ts:119` `buildContraView(db, part = 'all')`
- 取数／扫描：`src/analysis/contraindications.ts:87` `scanPlan(db, part)`，返回 `PlanScan`（`analysis/contraindications.ts:85`，含 `hits`／`bySeverity`／`summaryStatus`／`suggestions`）
- HTML：`src/render/trendDocs.ts:334` `buildContraDoc`（同文件 332 行注释写明对照 `contraindication_report.html`）
- 缺失阻断：扫到的会话数为 0 时抛 `missing-data`「无训练计划可扫描（先定训练计划）」（`insightPlate.ts:123`）

注意：`html.ts:618` 另有一个 `renderContraHtml`，但**分发没走它**，走的是 `buildContraDoc`（`cmd_read.ts:1025`）。同域里 `renderAnomalyHtml`（`html.ts:608`）与 `buildAnomalyDoc`（`trendDocs.ts:289`）也是这种双份并存的情形。

### 3. 产物形态：**完整文档**

`buildContraDoc` 末尾 `return assembleDocPage({ docTitle, title: '禁忌扫描（' + v.part + '）', eyebrow: 'calorie.view.contraindication · 趋势分析域', subtitle: null, content, charts: false })`（`trendDocs.ts:389-396`）。

结论：**完整文档**（`<!doctype html>` 起、带 `charset="utf-8"`），依据同 §三（`shared/docPage.ts:38-43`）。

正文含：部位参数回显区块（`trendDocs.ts:337-340`）、6 张 KPI 卡（`trendDocs.ts:341-348`）、命中明细表**最多 100 行**（`trendDocs.ts:351`，超出时 caption 会如实写「仅列前 100 条，共 N 条」，`trendDocs.ts:364`）、替代建议列表（`trendDocs.ts:368-377`）。

### 4. 缺什么

- **只扫计划，不扫实绩**：`scanPlan` 吃的是计划树（`analysis/contraindications.ts:87`），与 `exercise_log` 里真做了什么的记录无关。
- **部位是四值闭集**：只有 `all`／`腰`／`膝`／`肩`（`insightPlate.ts:120-121`），场景 05 若要加「腕」「踝」等部位需改白名单本身。
- **没有周次/日期维度**：不能只扫第 N 周或某天。
- **替代选择不进页面**：页内参数表单的说明写明「替代选择归宿主，已选清单不进静态页」（`trendDocs.ts:339`），页面只给建议文本，选哪个、怎么改回计划由外部承担。
- **不落库、不改计划**：命令无写口（`keys.ts:105` 是 `view`，`cmd_read.ts:1021` 只读 `db`）。

---

## 六、共性与分野

### 走「片段」路的两条

`calorie.view.plan`、`calorie.view.plan-wizard` —— **共用同一条装配路**：

- 视图都在 `src/render/planPlate.ts`（`:30`、`:56`）
- 页面都在 `src/render/html.ts` 里、都经 `pageShell`（`:38`）收尾（`:539`、`:551`）
- 产物都是 `<section class="ilife-page">` 起头的**片段**，不带 `<!doctype html>`、不带 `charset`、不带样式表

这两条是**唯一**还走 `pageShell` 的健身计划命令；`pageShell` 在 `html.ts` 里被 44 处 `return pageShell(...)` 调用（grep 计数），是这一包的老页面出口。

### 走「完整文档」路的三条

`calorie.view.process-progress`、`calorie.view.exercise-review`、`calorie.view.contraindication` —— **共用另一条装配路**：

- 都调 `src/shared/docPage.ts:47` 的 `assembleDocPage`，拿到 `<!doctype html>` 起头、带 `charset="utf-8"` 与共用样式表的**完整文档**
- 页面分别落在 `src/render/trendMiscPortDocs.ts:382`、`src/render/sportPortDocs.ts:350`、`src/render/trendDocs.ts:334`
- 这三个 `*Docs.ts` 按 `shared/docPage.ts:1-14` 的文件头注释，此前各抄了一份模板，现在收成一份

### 真正的分野

| 维度 | plan | plan-wizard | process-progress | exercise-review | contraindication |
| --- | --- | --- | --- | --- | --- |
| 读库 | 是 | **否** | 是 | 是 | 是 |
| 收时间窗 | 否 | 否 | 仅 `end`（窗固定 7 天） | `start`/`end`（缺省 7 天） | 否 |
| 收部位 | 否 | 否 | 否 | 否 | `part` |
| 产物 | 片段 | 片段 | 完整文档 | 完整文档 | 完整文档 |
| 数据来自 | `fetch/plan.ts:209` | `fetch/plan.ts:71`（纯校验） | `trendMiscPort.ts:382-391` 直写 SQL | `fetch/plan.ts:209` + `fetch/exercise.ts:284` | `analysis/contraindications.ts:87` |
| 页面模块 | `html.ts` | `html.ts` | `trendMiscPortDocs.ts` | `sportPortDocs.ts` | `trendDocs.ts` |

一对一的一次性做法（不是共用件）：

- `plan-wizard` 是五条里**唯一不碰数据库**的一条（`planPlate.ts:56` 的入参无语义上的 `db`）。
- `process-progress` 是五条里**唯一绕过 `src/fetch/` 直接写 SQL** 的一条（`trendMiscPort.ts:382-391`）。
- `contraindication` 是五条里**唯一有部位闭集白名单**的一条（`insightPlate.ts:120-121`）。
- `plan` 是五条里**唯一连一个参数都不收**的一条（`cmd_read.ts:963-967`）。

---

## 七、路由层已经写明的缺口

`src/triggers/routing.ts` 把场景 05 的一批唤醒词主动判为**命中但不执行**（`kind: 'non-exec'`），理由文本本身就说明了上面各条「缺什么」。原文见 `routing.ts:94-119` 的 `NON_EXEC_REASONS`，此处按意思转述并给行号：

| 理由名 | 定义处 | 意思 | 被哪些唤醒词引用 |
| --- | --- | --- | --- |
| `planFilterMissing` | `routing.ts:96-97` | **`calorie.view.plan` 无周／日／动作筛选参数，返回全计划**，与唤醒词要的周／日／动作粒度不符，于是没有单条同形命令 | 「看本周计划」「看下周计划」「看上周计划」「看指定周计划」「看今天练什么」「看某动作安排」「看某天练什么」「看计划 vs 实际」（`routing.ts:334-340,343`） |
| `planWriteMissing` | `routing.ts:98-99` | 没有训练计划的写入口，执行层不承接计划写入 | 「定训练计划」「复制训练计划」「定休息日」「加训练动作」「定一周计划」「改训练计划」「改某天训练」「删某天训练」「改动作」「撤销训练计划」（`routing.ts:344-353`） |
| `oosLanding` | `routing.ts:117-118` | 明确不做（架构规格 `docs/calorie-architecture.md:60` 的「落地」项），唤醒词只保证命中与文案 | 「落地训练」「落地到本周末」「落地到本月底」（`routing.ts:354-356`，另见 `:760`） |
| `oosXunji` | `routing.ts:115` | 明确不做（架构规格同处的「训记」） | 「同步到训记」「拉训记实绩」（`routing.ts:357`，另见 `:732`） |

两点值得单独指出：

1. **`routing.ts:96-97` 是直接书面确认**：`calorie.view.plan` 的缺口是「无周／日／动作筛选参数」。这与 §一「一个参数都不收」完全一致，且说明该缺口是被有意登记的，不是遗漏。
2. **`planReviewMissing`（`routing.ts:100-101`）已成死条文**。它原写「没有计划完成率／未完成训练／动作完成率入口」，但 grep 全仓只在定义处命中一次，没有任何唤醒词引用它 —— 因为 `calorie.view.exercise-review`（`keys.ts:113`）已经把这条缺口填上了。填上之后，动作粒度那一档（「看动作完成率」）在唤醒词里也改指 `exercise-review`（`routing.ts:364`）。

---

## 八、不确定

1. **`part` 之外还有没有别的入口传部位**。`src/output.ts:294-299` 的 `DYNAMIC_COMMAND_SEGMENTS` 里有一条 `'calorie.view.contraindication': { 腰: '腰', 膝: '膝', 肩: '肩', all: '全部' }`，同文件 `:301` 注释说它取 `part`、缺省 `all`。我的判断是它只用于**文件名动态段**，但没读完 `output.ts` 上下文去坐实「不参与参数归一」。
2. **片段会不会在交付时被外部包成完整文档**。我查了 `src/output.ts:228` 的 `deliverHtml`：三条分支（`explicit`／`target`／缺省落点）都是把 `input.html` 原样交给 `saveHtmlFile`，**没有包裹**。但 `saveHtmlFile` 在 `base-paint/save-html` 里，我没打开它，因此「落盘时是否补 `<!doctype html>`」这一点属于未验证的推断，不是读到的事实。
3. **`calorie.view.plan` 的 8 条上限是否有意为之**。`html.ts:533` 的 `slice(0, 8)` 没有注释说明，旁边也没有「还有 N 条」的提示；是否为旧模板对齐，我无从判断。
4. **「看某天练什么」「看某动作安排」走哪条命令 —— 已解决，不再是不确定项**。`routing.ts:339-340` 把这两个词判为 `kind: 'non-exec'`、理由 `planFilterMissing`，即**根本不执行任何命令**；同族另外六个词见 `routing.ts:334-338,343`。详见 §七。
5. **`exercise-review` 的「本月／全部」是否在别处真有窗口参数**。`routing.ts:359-362` 显示三个唤醒词给的是同一串写死日期，但可能另有调用方（如技能提示词层）在运行时改写参数，我按预算只核到了 `routing.ts` 这一层。
6. **`trendDocs.ts`／`sportPortDocs.ts`／`trendMiscPortDocs.ts` 三个文件头的域划分依据**。我只能从 `eyebrow` 字面（「趋势分析域」「运动移植域」「趋势其他移植域」）看出它们被归到三个域，但为什么 `contraindication` 归「趋势分析域」而 `exercise-review` 归「运动移植域」，没有读到裁定文档。
7. **HTML 串在 `buildDelivery` 之后有没有被改写**。我核到的两处（`cmd_read.ts:966,974` 与 `:446,612,1025`）都是把 render 层返回值直接塞进 `html` 字段，但中间还隔着 `buildDelivery`／`withDelivery`（`cmd_read.ts:107`），我没读 `src/render/envelope.ts` 就停了预算，因此不能排除它在交付前对 HTML 做包裹。
8. **五条命令的 `--params` 是否有未在 `cmd_read.ts` 出现的统一前置处理**。我是直接读 `switch` 内部的 `optStr`／`defaultRange` 取参写法判断各命令参数的（`cmd_read.ts:214,605,969,1022`），没有读 `cmd_read.ts` 在 `switch` 之前的那段（约 `:130-350`）去确认没有全局参数改写。
