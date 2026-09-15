# T351-v15 独立复核报告（计划编辑器 V15 · commit `804a4c3`）

> 复核席＝独立第三方（非作者）。派单＝编排者 2026-09-15 的 V15 复核条（本席只读交付件，另开自己的取证台）。
> **不采信作者任何结论**：本件每条读数都是本席自己跑出来的；作者自述只作「对照物」列在 §6。
> 需求正件＝`docs/skills/skill-calorie/t351-v14-plan-editor-design.md`（§1 四条 ＋ §2 早前已定 ＋ §3 数据面）。
> 判据边界＝**页面契约层 ＋ 可复现性**；审美（挤／丑／观感）按派单归负责人肉眼，本席不判。

## 判定：FAIL

两条 **S1**，都落在需求正件 **§1 第 3 条**（「只有第 1 周能增删动作；第 2 周起只能调参数」）上：

1. **§1③ 第三句未实现**：第 2 周起的力量动作参数是**一行纯文本**，不是可填的格 —— 组数／次数／负重（含 RM 切换）
   用户根本改不了，只有有氧时长那一格能填。**探针读数**：锁周周四的两个动作里，可填格只有 `["set-min"]`，
   纯文本参数行＝`["5 组乘 8 次 70 kg","分钟"]`，RM/kg 切换钮 **0 个**。
2. **§1③ 那颗唯一能填的格写错目标**：锁周有氧输入**没有 `data-d/s/m`**，写值后落到「**本周** 周一 凌晨 第 1 个动作」，
   被点的那一行纹丝不动。**探针读数**：改「第 3 周 周四 椭圆机」20→77 分钟，计划表变动的行是
   `第 3 周 | 周一 | 凌晨 | 爬楼机 | 腿 | 有氧　30 分钟 → 77 分钟`，椭圆机仍 20 分钟。
   ⇒ 用户那次编辑**丢了**，且**另一行被静默改脏**（这一页的产物表正是拿去落库的那张表）→ 兼有数据错位风险。

§1 另外三条（日页签／周页签 nowrap 且滚动条可见／讨论口吻与空态兜底）**本席复跑全部为真**。
但 §1③ 是四条里的一条，**契约违反即 S1 ⇒ FAIL**（分数只作摘要，见 §5）。

## 一、机器证据

**提交面**：`804a4c39d998ad27370da5fc8a6ab9194f8121fe`（王辰浩 2026-09-15 15:51:36 +0800），改动恰 3 件（＋32／−12）。
工作区 blob 与 `804a4c3:<path>` **全等**：`d1cc211bbe25c3776ed0530a1df47a0fd63ebbb1`（`planEditorCss.ts`）／
`087f756f8a8e3d0a694d33868b7beff7fd0374d8`（`planEditorDocs.ts`）／`d9855b7e4a5efcd39a4faa81415a4ea6e779bb44`（`planEditorRuntime.ts`）；
当前 HEAD `5539f8a`，`804a4c3` 是 HEAD 的祖先。**交付与版本库无漂移。**
编译产物同版自证：dist 三件 sha256 `4e396e2087f4…`／`069770e0947e…`／`33db3ad8aa8b…`，
且含本轮五个新标记（`daySel`／`go-day`／`pe-daytabs`／讨论口吻整句／`训练安排由第 1 周决定`）。
开工前门：`pnpm gen:check` → **exit 0**（`GEN-CHECK PASS：键 127（写 46 ＋ 读 81）…`）。
> 按编排者口径：**一律用 sha256 判内容，不用 mtime**（本仓有他席在编译、会刷新 dist 的 mtime）。

| GATE-RUN runId | 命令（均经 `tooling/run-locked.mjs`） | exit | 摘要行 |
| --- | --- | --- | --- |
| `t351-v15-review` | `--ticket 351 --run-id t351-v15-review -- node .scratch/t351-v15-review/t351-v15-review.mjs --phase=collect` | **0** | `RESULT: 7/7`（取证链：真出口重出样张 ＋ headless Chrome 六视口实测 ＋ 判据自证） |
| `t351-v15-review-gate` | `--ticket 351 --run-id t351-v15-review-gate -- node … --phase=gate` | **1** | `RESULT: 16/18`（契约门；红＝`C3.4`、`X1`） |
| `t351-v15-mutation` | `--ticket 351 --run-id t351-v15-mutation -- node .scratch/t351-v15-review/t351-v15-mutation.mjs --under-lock` | **0** | `MUTATION-SUMMARY: OK`（两处改坏必红 ＋ 一处反证必绿 ＋ 三处还原逐件 sha256 全等） |
| `t351-v15-review-warnline` | `--ticket 351 --run-id t351-v15-review-warnline -- node packages/skill-calorie/scripts/check-warning-line.mjs` | **1** | `RESULT: 80/82`；两条 `RED 台账陈化` **都在他席件**（见 §4-6） |

**变异红／还原一致（两行，取自 `logs/mutation-run-locked.txt`）**：

```
RED: M1 变异=planEditorCss.ts 「周页签条 flex-wrap:nowrap 改回 wrap」 产物印记=.pe-tabs{display:flex;flex-wrap:wrap; 期望红=[C2.1,C2.5] C2.1=RED C2.5=RED 契约门 14/18 ⇒ OK
RESTORE: IDENTICAL M1 逐件 sha256 一致：源码 3/3、编译产物 3/3；复跑契约门 16/18（基线 16/18）读数漂移=无；源码 planEditorCss.ts=ea11db69756f planEditorDocs.ts=b2e977c868c4 planEditorRuntime.ts=b2aac9555632
RED: M2 变异=planEditorRuntime.ts 「日页签「只渲染选中的那一天」改回全渲 7 天」 产物印记=dayHtml(0) + dayHtml(1) 期望红=[C1.2,C1.3] C1.2=RED C1.3=RED 契约门 12/18 ⇒ OK
RESTORE: IDENTICAL M2 逐件 sha256 一致：源码 3/3、编译产物 3/3；复跑契约门 16/18（基线 16/18）读数漂移=无；源码 planEditorCss.ts=ea11db69756f planEditorDocs.ts=b2e977c868c4 planEditorRuntime.ts=b2aac9555632
GREEN: M3 变异=planEditorRuntime.ts 「反证：给锁周有氧输入补上 data-d/s/m」 产物印记=function plainParams(mv, d, s, m) 期望转绿=[X1] X1=PASS 契约门 17/18 ⇒ OK
RESTORE: IDENTICAL M3 逐件 sha256 一致：源码 3/3、编译产物 3/3；复跑契约门 16/18（基线 16/18）读数漂移=无；源码 planEditorCss.ts=ea11db69756f planEditorDocs.ts=b2e977c868c4 planEditorRuntime.ts=b2aac9555632
```

- **M3 是本席自设的反证**：只把锁周有氧输入的坐标补回去（`var at=''` → 带上 `data-d/s/m`），`X1` **由红转绿**（契约门 17/18）。
  ⇒ 证明 `X1` 这条探针确实在测那处缺陷，不是恒红、也不是探针自己的毛病。
- **改坏的两处各打了作者脚本打不到的地方**：M1 把 `nowrap` 改回 `wrap`（判计算样式，不判源码字符串）；M2 把「只渲一天」改回全渲 7 天。
- 变异期间**一律走加锁包装器**（外层持主锁、内层换隔离锁目录避重入）；全程 `try/finally` ＋ **逐文件按字节还原**
  （未用 `git checkout -- .`／未整目录还原）；还原后源码 3/3、编译产物 3/3 的 sha256 与基线全等，复跑读数零漂移。

## 二、四条逐条（全部来自本席复跑）

### §1① 日 1～周日做成页签、一次只显示一天 —— **PASS（4/4）**

| 判据 | 读数 |
| --- | --- |
| 日页签条存在、7 格、各带 `data-act=go-day` | `hasDaytabs=true`；`["周一2","周二1","周三","周四2","周五","周六","周日"]`（数字＝当天训练次数徽章） |
| 一次只渲染选中的那一天 | `.pe-week` 内 `.pe-day` **恰 1 个**；选中态 1 个＝周一首屏 |
| 页签真能切 | 点 `[data-act=go-day][data-d=3]` → `is-on` 移到「周四」、`.pe-day` 仍 **1 个**、该天动作＝`["史密斯机深蹲","椭圆机"]` |
| `.pe-day` 不再带左侧星期列 | `.pe-dow` **0 个**；`.pe-day` computed `display=block`、`grid-template-columns=none`（旧的 `64px 1fr` 两列网格已撤） |

### §1② 周页签横向滑动不换行（且滚动条可见；日页签同形） —— **PASS（5/5）**

| 判据 | 读数（headless Chrome 实测计算样式 ＋ 几何） |
| --- | --- |
| `.pe-tabs` `flex-wrap=nowrap` | computed `nowrap` |
| `.pe-tabs` `overflow-x=auto` | computed `auto`；`scrollbar-width=thin` |
| **滚动条没被藏掉** | 全页 style 扫描命中「藏滚动条」规则 **0 条**；周条／日条 computed `scrollbar-width` 均 `thin`；**实测滚动条占位 10px**（`offsetHeight−clientHeight`，12 周态） |
| 日页签同形 | 日条 `nowrap` ＋ `auto` ＋ `scrollbar-width=thin`（同款三段） |
| 周多了真能横滑 | 12 周：**390 宽**（固定宽 iframe 造真视口）`scrollW=1065 / clientW=343`、滚动条占位 10px；**1254 宽** `scrollW=1065 / clientW=1040`（第 12 周与「加一周」也在屏外，靠横滑够得着） |

> 作者脚本覆盖不到这一段：墙生成器**不打开页面**。本席另加**判据自证**（`E7`）：`*::-webkit-scrollbar{display:none}`、
> `*{scrollbar-width:none}`、`.pe-tabs{scrollbar-width:none}`、`.pe-tabs::-webkit-scrollbar{display:none}`、
> `.pe-daytabs::-webkit-scrollbar{display:none}` 五种写法全被点名，`scrollbar-width:thin` 与 `.ilife-block-toc::-webkit-scrollbar`
> 两个反例不误报 ⇒ 这条判据自己也被测过。

### §1③ 只有第 1 周能增删动作，第 2 周起只调参数 —— **部分 PASS；第三句 RED**

前两条（结构面）**读数**（本席夹具：4 周，`weeks[1..3].locked=true`，当前停第 3 周、选中周四）：

- 第 2 周起「加一次训练」**禁用**：`disabled=true`、属性在、文案＝「训练安排由第 1 周决定，这里只改参数」→ **PASS**
- 动作层面的加／减**禁用**：`add-move` `disabled=true`；`del-train` **0 个**、`del-move` **0 个**（换成锁图标 2 个）；
  时段胶囊 8/8 全禁用；全部禁用控件 `data-act＝["set-slot"×4,"add-move","set-slot"×4,"add-move","add-train"]` → **PASS**
- **参数（组数／次数／重量／时长）全放开 → RED**：锁周周四动作 `["史密斯机深蹲","椭圆机"]`，可填格只有 `["set-min"]`；
  纯文本参数行 `["5 组乘 8 次 70 kg","分钟"]`；RM/kg 切换钮 **0 个**。⇒ 力量动作的组数／次数／负重**改不了**。
- 机制自证（`C3.5`，PASS 但说明问题）：实现把「结构禁」与「参数开」绑在**同一个 `locked` 开关**上 ——
  `locked:true` 态＝结构禁 `true`／参数开 `false`；`locked:false` 态（页面自己「加一周」造出的周就是 `locked:false`）＝
  结构禁 `false`（加训练 `disabled=false`、删动作 2 个）／参数开 `true`。
  ⇒ **§1③ 的三句话在任何可达状态里都不可能同时为真**：要么结构没锁住，要么参数改不了。

### §1④ 讨论先于生成（口吻 ＋ 空态兜底） —— **PASS（2/2）**

- 口径行＝「**这份计划是按我们刚才讨论的结果填好的，你看着改。**动作结构只在第 1 周改，后面每一周的动作都跟它一样，
  各周自己填重量、次数与时长。每天最多 4 次训练，每次挑一个时段；有氧只填时长。」
  —— 是「按讨论填好、微调」口吻，不含「从零／空白起」那类口吻；空态页口径行同源 → **PASS**
- 空态兜底仍可用：`.pe-empty` 在、「定一份计划」主按钮在；**点下去**（真点击）后出周页签 5 格 ＋ 日页签 7 格 ＋ `.pe-day` 1 个 → **PASS**
- 附注（不判，供负责人裁量）：空态那段说明仍是「先排第 1 周。它就是母版…」（＝从零填口吻）。§1④② 把空态划为兜底，
  故本席不把它计入红；若负责人要连兜底也改成讨论口吻，那是需求改动、不是本票缺陷。

### 自设探针（作者脚本覆盖不到的盲区）

- `X1` **RED** —— 锁周改有氧时长写错目标（上 §判定 第 2 条）。输入框实测 HTML：
  `<input type="number" min="1" max="600" value="20" data-act="set-min">`（**无 `data-d/s/m`**）。
- `X2` **PASS（正向对照）** —— 母版周（`locked:false`）里力量参数**真能写**：`史密斯机深蹲` 改前 `5 组乘 8 次`、
  改后 `9 组乘 8 次`。⇒ 排除「探针写路不通」造成的假红。
- 备注①（**S3 记账**）：锁周「加一次训练」只有 `disabled` 一层挡，委派处理器里没有 `lock()` 守卫；
  往那颗 disabled 钮上**合成派发** click，训练段数 2 → 3。真实指针／键盘都点不到 disabled 钮 ⇒ **非用户可达**，只记账。

## 三、逐条路径（本席动的件）

**只读**：`packages/skill-calorie/src/render/planEditor*.ts` 三件与任何 `src/**` —— **一件未改**（复核末 `git diff HEAD` 对三件为空；
变异期的临时改动已按字节还原，sha256 全等见 §一）。他席在途的 33 件 M 件一件未碰（`.scratch/t351-editor/**` 也未写入，
连作者样张都只**复制**到本席目录后再跑墙生成器）。

| 路径 | 说明 |
| --- | --- |
| `docs/skills/skill-calorie/t351-v15-review-报告.md` | 本件（回执四段式 ＋ 缺陷清单） |
| `.scratch/t351-v15-review/t351-v15-review.mjs` | 复核主脚本（真出口重出样张 ＋ Chrome 实测 ＋ 契约门 18 条 ＋ 取证链 7 条） |
| `.scratch/t351-v15-review/fixtures.mjs` | 本席自写夹具（5 状态；含「爬楼机在 (0,0,0)、椭圆机在 (3,1,0)」的坐标设计） |
| `.scratch/t351-v15-review/inpage-probe.js` | 页内探针（计算样式／点击／填值／整表逐行对账） |
| `.scratch/t351-v15-review/t351-v15-mutation.mjs` | 变异红／还原一致自证（M1／M2 改坏 ＋ M3 反证，全程加锁） |
| `.scratch/t351-v15-review/repro-author-samples.mjs`、`diff-author-samples.mjs`、`diff-author-samples-exact.mjs`、`diff-author-samples-hunks.mjs` | 作者样张重出与差异定位（精确到差异块） |
| `.scratch/t351-v15-review/samples/*.html`（5 份） | 本席重出的样张（**当前 dist**） |
| `.scratch/t351-v15-review/probe/*.html`（6 份） | 带页内探针的实测页（含 390 宽 iframe 包装页） |
| `.scratch/t351-v15-review/author-samples/`、`author-repro/` | 作者 4 份样张的**副本**与本席重出（副本不动作者目录） |
| `.scratch/t351-v15-review/logs/**` | `gate-run-collect.txt`／`gate-run-gate.txt`／`mutation-run-locked.txt`／`readings.json`／`checks.json`／`last-run.txt`／`warnline.txt`／`dump-*.txt`／`repro-author-samples.txt`／`diff-author-samples.txt`／`diff-author-samples-hunks.txt` |
| `.scratch/t351-v15-review/mut/**` | 变异日志、变异前源码备份（`backup/*.bak`）、隔离锁的 `gate-runs.log` |
| `.scratch/locks/gate-runs.log` | 加锁包装器的审计面（本席四次 GATE-RUN 的 RUN 行） |

**入口如实交代（编排者点名）**：这一页**不在任何命令链上** —— 全仓 `git grep planEditor` 只命中那四件自身，
`src/cli/keys.ts`／`registry.ts` 无对应键，`buildPlanEditorDoc` 调用方为零（本席独立查证与编排者一致）。
所以本席的入口只能是**编译产物导出的 `buildPlanEditorDoc`**（`packages/skill-calorie/dist/render/planEditorDocs.js`）
＋ 本席自写的起法（`.scratch/t351-v15-review/t351-v15-review.mjs`），样张由本席自己按真出口渲染。
**限制如实写**：既然**没有命令出口**，「这一页在真命令链上能跑」**无法验证**，本席也**没有**把「样张能渲染」当成
「真出口能跑」——本席能验的是「这个导出函数在当前编译产物里的行为」，以及它在**真 Chrome** 里的实测（计算样式、点击、填值）。
接线本身归编排者另开的票（§4-1）。

## 四、缺陷清单

| # | 分级 | 标签 | 缺陷 | 哪条红／怎么重现 | 涉及件 |
| --- | --- | --- | --- | --- | --- |
| 1 | **S1** | **本票范围**（承自 V14 `f13ceed`，本票未清） | §1③ 第三句未实现：锁周的力量动作参数是**纯文本**，组数／次数／负重（含 RM 切换）改不了 | `C3.4 RED`：`.scratch/t351-v15-review/samples/03-锁住的周.html` 停第 3 周→点日页签「周四」→`史密斯机深蹲` 那行参数是 `5 组乘 8 次 70 kg` 一行文本、无 input；`.pe-mode` 0 个。命令：`--phase=gate` | `src/render/planEditorRuntime.ts`（`plainParams()`／`moveHtml()` 的 `if (lock())` 分支）。**注意件头注释与实现相反**：注释写「锁住的周参数也可改…所以是输入框」，实现是纯文本 |
| 2 | **S1** | **本票范围**（承自 V14；本票把「结构只许第 1 周改」写进提交标题） | 锁周唯一那颗可填的格（有氧时长）**写错目标**：值落到「本周 周一 凌晨 第 1 个动作」，被点那行不动 ⇒ 编辑丢失 ＋ 另一行被静默改脏（该表正是落库依据） | `X1 RED`：改「第 3 周 周四 椭圆机」20→77 → 表变动行 `第 3 周\|周一\|凌晨\|爬楼机\|腿\|有氧 30 分钟→77 分钟`，椭圆机仍 20。机理：`plainParams()` 里 `var at=''`，坐标被丢；输入处理器 `Number(getAttribute('data-d'))` 对 `null` 得 0 ⇒ 回落 `(0,0,0)`，且 `day()` 取**当前周**。反证 `GREEN M3` | 同 1（一处 `var at = ''` ＋ `moveHtml()` 调用点） |
| 3 | S3 | 本票范围 | 加训练／加动作只有 `disabled` 一层挡，委派处理器无 `lock()` 守卫 | 备注①：合成 click 让训练段数 2→3（真实指针／键盘不可达，故不阻塞） | `planEditorRuntime.ts`（`add-train`／`add-move` 分支） |
| 4 | S3 | 本票范围 | 死控件／死代码：`.pe-edit` ＋ `data-act="unlock-note"` ＋ `hidden` 的按钮（无处理器、无样式）；`isFirstWeek()` 定义后无人用 | 读源码 ＋ 页内实测 `unlock-note` 无任何行为 | 同 3 |
| 5 | S3 | 本票范围 | 日页签改造后留下的死样式：`@media (max-width:820px)` 里 `.pe-day{grid-template-columns:1fr;gap:6px}`、`.pe-dow{padding-top:0}`（`.pe-day` 已非 grid、`.pe-dow` 已不再产出） | 读 `planEditorCss.ts` §窄屏；页内 `.pe-dow` 0 个 | `src/render/planEditorCss.ts` |
| 6 | S3 | **范围外发现** | 全树 `tsc -b` 曾被他席在途件带红：`packages/skill-calorie/src/goal/goalStore.ts(127,29): error TS2345: Argument of type 'keyof SetWeightGoalInput' is not assignable to parameter of type 'WeightGoalColumn'`（复核窗口内实测一次；随后他席自己修好，复跑 exit 0） | stderr 原文见本席复核过程；**不属本票** | `src/goal/goalStore.ts`／`goal/write.ts`（他席） |
| 7 | S3 | **范围外发现** | 告警线门红，两条 `RED 台账陈化` **都在他席件**：`src/weight/history.ts` 台账 862／实况 878、`src/home/homeDocs.ts` 台账 328／实况 334 | `check-warning-line.mjs` → `RESULT: 80/82`、exit 1。**本票件不在红名单**（`src/render/planEditorRuntime.ts LF=364` 与台账一致） | 他席件；修法 `node packages/skill-calorie/scripts/check-warning-line.mjs --sync` |
| 8 | S3 | **范围外发现** | 作者 4 份入盘样张**不能**用「当前 dist ＋ 作者夹具」逐字节重出，但差异**每份恰 2 处**：① 共享表样式一族多 1 行 `box-sizing: border-box;`（他席共享层在本票出图之后改的）；② 复制区时间戳（`nowStamp()` 渲染时刻，本不可复现）。除此之外**逐字节相同**，且本票三件与版本库全等 | `repro-author-samples.mjs` → `RESULT: 0/4`；`diff-author-samples-hunks.mjs` → 每份「差异块 2 处」（`@1416 增 1 行 box-sizing`；`@1938/1939` 时间戳 `15:50:54` → `20:06:30`） | 共享层（他席 #523/#525 一线）；**含义**：作者「重出过」这条成立，但不能读作「现在可逐字节复现」；墙上那 4 格比当前树旧 1 行共享样式 |
| 9 | S3 | **范围外发现** | 本票**无自动化测试**；作者自检覆盖不到四条契约 —— `t351-v13-editor-wall.mjs` 只数「几格／几条链接／缺几件」（本席复跑 exit 0：4 格、链接 4 条、缺失 0），**不打开页面** | 本席复跑作者墙生成器（在其样张的副本上） | 建议把本席主脚本（或同形最小版）收进 `docs/skills/skill-calorie/` 作常驻判据 |

> 「范围外发现」只作 S3 ＋ 转票措辞，不单独决定 FAIL；本票的 FAIL 由 #1／#2 两条 S1 决定。

## 五、分数（摘要）

契约一致 **13/30**（§1 四条第 ① ② ④ 全绿；第 ③ 只剩结构面，第三句未实现且唯一可填格写错目标）
／ 证据真实可复现 **21/24**（作者自述的墙自检读数与「四张样张在盘」本席复跑一致；但作者自检覆盖面不及契约，且样张相对当前树旧 1 行）
／ 新旧对照 **17/20**（V14→V15 结构面确实收紧了：加训练禁用、加删动作禁用、日页签、nowrap；但遗留项未清）
／ 工程红线 **9/14**（无测试；死控件与死样式；`plainParams` 注释与实现相反）
／ 文档同步 **8/10**（台账 `planEditorRuntime.ts` 当场实测 364 与实况一致，本票未自带同步、靠别席）
＝ **68/100**。分数只是摘要，**判定与缺陷清单才是正文**。

## 六、作者自述的对照（只作对照物，不采信）

| 作者自述 | 本席复跑 |
| --- | --- |
| `tsc` 0 | 开工时 `tsc -b` exit 0（2.7s）；复核窗口内曾被他席件带红一次（#6），他席修好后复跑 exit 0 |
| 四张样张重出 | 4 份在盘；本席重出后**每份恰 2 处差异**（复制区时间戳 ＋ 他席共享层 1 行 `box-sizing: border-box;`），其余逐字节相同；本票三件与版本库全等 ⇒ 这条成立，但不能读作「现在可逐字节复现」（#8） |
| 双端墙自检 exit 0（4 格、链接 4 条、缺失 0） | **一致**：本席复跑 exit 0、4 格、链接 4 条、缺失 0。但该自检**不判四条契约**（不打开页面、不读计算样式、不点不填），故它不是本票验收判据（#9） |

## 七、未做项 ＋ 下一手缺什么

**未做项（如实列）**

1. **审美／版式逐格**（挤、塌列、被藏横滚的观感）未判 —— 按派单归负责人肉眼；本席只判契约与可复现性。
2. **命令链可达性**未验 —— 本票无命令出口（§三），编排者已裁定接线归另一票；本席**没有**把「样张能渲染」当「真出口能跑」。
3. **全测试面**（`pnpm test`）未跑 —— 本票无测试件，且整树测试会被他席在途件影响；本席只跑了与本票相关的门（`gen:check`／`check-warning-line`／`tsc -b`）。
4. **截图墙**未出 —— 不在本席写入集；作者墙已存在，但见 #8（比当前树旧 1 行）与 #9（不产判据）。

**下一手缺什么**

1. **需要编排者开一张修票（只出报告、本席不改码）**，改 `packages/skill-calorie/src/render/planEditorRuntime.ts` 两处：
   （a）`plainParams()` 让锁周参数成为**可填的格**（组数／次数／负重 ＋ RM/kg 切换；有氧只留时长），
   （b）把 `var at=''` 换成带上 `d/s/m` 的坐标（`plainParams(mv, d, s, m)` ＋ 调用点）。
   本席反证已证明：只做 (b) 就能让 `X1` 转绿；做全 (a)(b) 才能让 `C3.4` 转绿。
2. **收口前他席须同步告警线台账**（`--sync`），否则整树门红（#7）；`goal` 那条线请把 `SetWeightGoalInput` 键类型与
   `WeightGoalColumn` 对齐（#6），别让别席窗口里随机变红。
3. **若要拿作者墙当最终验收**：先重出样张（当前比树旧 1 行共享样式，#8）；并建议把本席的契约门脚本收进仓作常驻判据（#9）。
