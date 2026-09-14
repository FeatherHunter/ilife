# T351-v5 · 「看完整计划」穿老模板观感的样张证据

**判定：PASS（本单写集内 61/61 全绿；两处变异各自「改坏必红／还原必绿」；双端截图已出）**
本轮把 order176–185 这一族的**结果页**（`buildPlanResultDoc`）按老卡路里技能 `workout_plan_view.html` 的观感重做：
两级页签（零内联脚本）、场次卡、部位彩色徽章、页宽 900 与老 token 观感。**未动** 186–195／201–207、`test/**`、
`base-render/**`、`base-paint/**`、`src/shared/copyArea.ts`、`photo/**`；共享 JS 一件未改。

## 一、照了老页哪些点（逐条对账）

老模板＝`D:\2Study\StudyNotes\SKILLS\卡路里\templates\workout_plan_view.html`（721 行，下称「老 `:行号`」）。
新侧类名前缀 `ilw-`（老页用的是 `.app/.tabs/.session…` 这类裸名，本页样式块随正文进内容区，故加前缀防与共享样式表撞名）。

| 老页 | 新侧 | 落点 |
|---|---|---|
| 设计 token `:root`（`:503-507`） | `.ilw-app` 作用域内起同义别名（**不重定义**冻结 token） | `workoutPlanCss.ts` 静态段 |
| 页宽 900 居中 `.app`（`:514`） | `.ilife-block-page-shell{box-sizing:border-box;max-width:900px}` | 同上（实测总宽 900，与老页 `*{box-sizing:border-box}` 同口径） |
| 周次页签 `.tabs/.tab/.tab.active`（`:27-32`） | `.ilw-tabs/.ilw-tab`＋`#id:checked~…` 生成规则；激活＝主色字＋2px 下划线 | `workoutPlanCss.ts` 动态段 |
| 日页签 `.day-tabs/.day-tab/.active`（`:58-62`） | `.ilw-day-tabs/.ilw-day-tab`；激活＝深底白字；无安排的星期压暗 | 同上 |
| 场次卡 `.session`（`:38`）＋`.sess-head/-tag/-name/-time`（`:39-42`） | `.ilw-session/.ilw-sess-head/.ilw-sess-tag/.ilw-sess-name/.ilw-sess-meta` | `workoutPlanLook.ts`＋`workoutPlanCss.ts` |
| 头行信息密度「周X ｜ 场次名 ｜ 时段 ｜ 共 N 组 ｜ 节奏」（老 `:596-599`） | 同序同留白：`周一 上肢 07:00–08:30 共 3 组 节奏 20-30 RPM(2-2.5秒/次)`（各段在源里以换行分隔，选中复制与检索拿得到分隔） | `workoutPlanLook.ts` |
| 部位彩色徽章 `PART_COLORS`（`:185-189`）＋`.part-tag`（`:55`） | `.ilw-pb-<slug>`：色值照老页七个十六进制值，底色等效老页 `色20` 的 `rgba(…,.13)`；老页逐格内联 `style`，本页一律落类名（正文零内联样式） | `workoutPlanCss.ts` 的 `PART_PALETTE`（类名与规则同源） |
| 动作格「加粗名＋块级副行小字」（老 `:620`＋`td .sub` `:52`） | `<strong>`＋`renderCaliberLine`（共享位口径行），只收紧间距 | `workoutMovementTable.ts` |
| 表格排版 `th`（`:48`）／`td`（`:49-51`）／`tr:last-child`（`:50`） | `.ilw-session th/td/td:first-child/tr:last-child td` 逐条照搬；数值列右对齐沿用共享表 `align:'right'` | `workoutPlanCss.ts` |
| 休息日卡 `.rest-day`（`:43-44`） | `.ilw-rest`（40px 居中留白）＋「周二 · 休息日」＋「主动恢复，不排训练动作」 | `workoutPlanLook.ts` |
| 卡片化：白底＋细线＋16 圆角＋淡阴影 | `.ilw-session{background:var(--card);border:1px solid var(--lineS);border-radius:16px;box-shadow:var(--shadow)}` | `workoutPlanCss.ts` |
| 双端两处 `@media(max-width:640px)`（`:119-128`、`:136-140`） | 照搬 `.app` 内边距／`.session` 内边距／h1 26px／`td` 与 `td:first-child`／`.kpi-grid` 两列＋奇数末位通栏 | 同上 |

## 二、那 5% 适配（本仓约束压过的部分）

1. **禁内联脚本**（契约 `docs/base-paint-contract.md` AC-7 零注入面）：老页三段内联 JS（页签切换 `:644-669`、各模式渲染 `:212-551`、取数入口 `:672-711`）**一个字未搬**；页签改零脚本选钮式（见 §三）。实测：写集十份产物各恰 1 块 `<script>`（共享 helpers），指纹唯一。
2. **首屏默认全展开**（老页默认只显示 `current_week` 与周一）：本页「全部周次／全部」两枚默认选中 ⇒ 各周各日场次都在 DOM 里可见，查找与打印拿得到全文（老页靠脚本，关掉脚本就是空白）。
3. **token 不重定义**：老 `:root` 的 11 个名只在 `.ilw-app` 内起别名（`--ink→--fg`、`--ink2→--fg2`、`--ink3→--fg3`、`--card/--line` 同值直取、`--accent→--blue`（Q12 锁 B1 主色）、`--green→--ok`）；老页 `--lineS:#e8e8ed` 无冻结对应，照老值写死；`--red/--amber` 不用（老页那两处要完成度数据）。故页底仍是 `--bg:#f5f5f7`（老页 `#fbfbfd`）、主色 `#007aff`（老页 `#0071e3`）。
4. **副行小字取共享位口径** 12px ＋ `--fg2`（老页 11px ＋ `#86868b`，对比度 3.62:1 已在共享样式表被否）。
5. **不印「休息」列**（老页恒空，库里无 `movement.rest` 字段）。
6. **底部不照搬老页 `.footer/.btn-group/.btn`**：本页底部是冻结双按钮（共享复制区），其双端由共享样式表负责，本页不重画别人的件。
7. **不做老页的「今日复盘／周期进度／每周完成率／计划vs实际」四块**：那要完成度数据，属 `calorie.view.exercise-review` 一族，本页不硬造。
8. **用词 中文单语**：「会话」一律写「场次」（页面上「会话」0 次）；`main/iso` 只以「主要／孤立」出现在副行。

## 三、页签的零脚本手法与理由

**手法：选钮式（`input[type=radio]` ＋ `label` ＋ 兄弟选择器）。** 一级周＝一组 `name="ilw-wk"`；二级日＝**每周一组** `name="ilw-dy-<周序号>"`，面板与选钮同父同级；收放规则由 `workoutPlanCss.ts` 按周数逐条生成（`#id:checked~.面板`），首屏「全部周次／全部」默认 `checked`。

**为什么不选 `:target` 锚点式**：① 两级同用会抢同一个 `#` 锚点（选了周就没法再表达日），且会改地址栏并触发跳转滚动；② `:target` 默认态没有锚点、也没法给页签自身盖激活样式（要靠 `:has()`，多一层浏览器版本前提）；③ 选钮式天然可键盘操作（Tab 进组、方向键换周／换日，`:focus-visible` 逐 id 给对应 `label` 描边）。

**可搜可打印**：内容全在 DOM；首屏全展开 ⇒ 浏览器查找命中任一场次；`@media print` 藏页签、两级面板一律展开、卡片 `break-inside:avoid` ⇒ 纸上拿得到完整计划。

**实测坑（已修，留档）**：逗号选择器串末尾只挂一个 `::after` 时，声明会落到整串里**前面那些元素本身**上——激活那枚周页签会被绝对定位成一条蓝条（文字蓝底蓝字看不见）。修法＝`::after` 逐条挂在每个选择器后面（`workoutPlanCss.ts` 的 `stateSelAfter`）。

## 四、双端截图（各两张：视口＋整页）

| 端 | 视口 | 整页 |
|---|---|---|
| 桌面 1440×1000 | `.scratch/t351-fix/v5-shots/order184-desktop-viewport.png`（60,162 B） | `.scratch/t351-fix/v5-shots/order184-desktop-full.png`（95,559 B，页高 1728） |
| 手机 390×844 | `.scratch/t351-fix/v5-shots/order184-mobile-viewport.png`（38,731 B） | `.scratch/t351-fix/v5-shots/order184-mobile-full.png`（80,320 B，页高 1889） |

拍摄对象＝`.scratch/t351-fix/final-v5/order184-result.html`（79,491 B），工具＝`.scratch/t351-fix-review-v2/shot.mjs`
（Chromium `--headless=new` ＋ CDP 截图，与本单共用同一张样张）。手机端可见：指标卡两列＋第三张（奇数末位）通栏、
日页签折行、卡片内边距与字号按老页收窄、底部冻结双按钮通栏。

## 五、判据读数（机器读数，逐条）

**GATE-RUN 声明**（运行标识抄自 `.scratch/locks/gate-runs.log` 的对应行，导出件见 `t351-v5-gate-runs.log`）：

```
GATE-RUN runId=t351-v5-window1 cmd=node .scratch/t351-fix/v5/locked-window.mjs
GATE-RUN runId=t351-v5-window2 cmd=node .scratch/t351-fix/v5/locked-window.mjs
GATE-RUN runId=t351-v5-restore-b cmd=node .scratch/t351-fix/v5/run-176-207-v5.mjs --out .scratch/t351-fix/v5/restore-b
```

| 判据 | 命令（持锁直调，落 `.scratch/t351-v5/*.log`） | 读数 |
|---|---|---|
| 全量机检 | `run-176-207-v5.mjs --out .scratch/t351-fix/final-v5` | **`RESULT: 61/61（产物 37 ＋ 判据 24）`／`PROBE: PASS（24/24 判据全绿）`** |
| 场景 05 三条 | `node --test test/scene05-read.test.mjs test/scene05-write-create.test.mjs test/scene05-write-mutate.test.mjs` | exit 0，`pass 3 / fail 0`（三条用例逐条 ✔） |
| 告警线门 | `node packages/skill-calorie/scripts/check-warning-line.mjs` | exit 0，`RESULT: 50/50`，`PASS: 告警线台账齐全且与实况一致` |
| 编译（全包读数） | `tsc -b packages/skill-calorie` | exit 1——**他席在途件**（`src/analysis/reportDoc.ts` 缺 `./reportDocTracked.js`／`./reportDocScore.js`；`reportPlate.ts` readonly 不匹配），非本票写集 |
| 编译（本票有效） | `tsc <同套 compilerOptions> packages/skill-calorie/src/render/workoutPlanDocs.ts`（只编本票入口的依赖闭包） | exit 0 |
| 零 JS（⑩） | 同上全量机检 | 写集十份每份 `<script` **恰 1 块**且逐字同长同头（指纹数 1，`21908:(function () {`）；正文无内联事件处理器、无 `javascript:`；全量块数分布 `[1,2]`（写集外 201–207 为 2 块＝helpers＋图表 helpers，共享资产） |
| 冻结 id | 同上 | 每份 ②`真 id="ilife-copy-data"=1／id="ilife-copy-log"=1`、⑤`data-action-id="ilife-copy-log"` **恰 1 颗且无 `disabled`** |
| 用词（⑪） | 同上 | 判份数 10，`会话`／`main`／`iso`／`calorie.` 红=0（`data-t` 载荷不算正文） |
| 页签手法（⑫） | 同上 | 有动作表的 8 份同时命中 `ilw-tabs`／`ilw-day-tabs`／`#ilw-wk-all:checked`／`type="radio"`，红=0；部位徽章数 3／3／3／2／2／1／6／6 |
| 副行（⑥） | 同上 | 8 份全过；生产形状 `背 iso 主` 读作 **`背 主 · 孤立`**（命中=true） |
| 节奏（⑧） | 同上 | 184 逐字三条 `["20-30 RPM(2-2.5秒/次)","18-25 RPM(2.5-3秒/次)","15-20 RPM(3-4秒/次)"]`；休息日标题 0 条带节奏；周级标题 0 条带节奏 |
| 夹具三条边界 | 同上 | ①`周二 · 休息日`命中、十份无「休息日（休息日）」；②`3组×10／8次`＋`35／40kg` 命中；③空 `sets` 出双短横线命中 |
| **变异 A**（摘掉副行拼装） | `check-mut-a`（产物落 `.scratch/t351-fix/v5/mut-a`，**在交付目录之外**） | **红：`RESULT: 60/61`，`FAIL 机检⑥`（8 份副行全空）** |
| A 还原 | `check-restore-a`（`.scratch/t351-fix/v5/restore-a`） | **绿：`RESULT: 61/61`（`PROBE: PASS 24/24`）** |
| **变异 B**（摘掉节奏上移） | `check-mut-b`（`.scratch/t351-fix/v5/mut-b`） | **红：`RESULT: 60/61`，`FAIL 机检⑧`（184 节奏 `[]`，逐页条数全 0）** |
| B 还原 | `run-176-207-v5.mjs --out .scratch/t351-fix/v5/restore-b`（runId `t351-v5-restore-b`） | **绿：`RESULT: 61/61`／`PROBE: PASS（24/24）`** |
| 行数告警线 | `LF` 口径实测 | `workoutPlanDocs.ts` 275／`workoutMovementTable.ts` 149／`workoutPlanCss.ts` 185／`workoutPlanLook.ts` 146，**四件均在线内（350）** |

**连带两条（如实记）**：① `runId=t351-v5-window1` 那次窗口里，全包编译就已红（同他席在途件），窗口按设计中止并把
源码逐字复位（`RESTORE-VERIFY ok=2/2`）；当时窗口脚本没把内层失败透成子进程退出码，故 `gate-runs.log` 那行记的是
`exit=0` —— **该次不作门禁证据**，已修脚本（`process.exit`）并在 window2 起生效。
② 开发期用真出口跑过一次真数据页（未设 `SKILLS_DB_PATH`，读生产库、只读，产物落生产 html 目录
`训练计划看_20260914_213647.html`，副本 `.scratch/t351-fix/v5/reference-prod-v5.html`）：实测 **97 场次卡／264 颗部位徽章／
4 个周区块**，真数据下版式与夹具页一致（未入仓，仅作旁证）。

## 六、未做项与下一手

1. **老页 `.footer/.btn-group/.btn` 那一组双端规则未照搬**：本页底部是冻结双按钮（共享复制区），双端由共享样式表负责；
   若负责人要求那两个按钮在手机上「通栏两枚」的观感，需要改公共层或另开票给共享复制区加断点。
2. **写集外 201–207 不是零 JS（各 2 块）**：那是既有共享 helpers ＋ 图表 helpers，不属本单写集；若将来要「全族零 JS」口径，
   得先在公共层把图表 helpers 收成按需注入。
3. **页签点了某周／某日后，浏览器查找只找得到当刻可见部分**（回到全展开需点「全部周次／全部」）：这是选钮式的固有代价；
   若要求「任意状态下查找都命中全文」，只能回到全展开（即不要页签收放）或引脚本。
4. **`movements[].rest` 仍缺**（老页同库亦缺，恒空）——本页不印；要印需先给库加字段（另票）。
5. **其余 25 条链路尚未铺开**：本单只做 176–185 这一族的观感与结构；铺其余族时，本页的三件可复用
   （`workoutPlanCss.ts` 若被第二个族用，就该按结构标准提公共层并另开票）。
