# t828 · remind 域 4 场景端到端 —— 实施证据

票：[#828](https://github.com/FeatherHunter/ilife/issues/828)（Part of [#820](https://github.com/FeatherHunter/ilife/issues/820)）。
提交：`fe28c85b`（8 件；见文末「提交范围」）。
口径出处：`t822-册子冻结.md`（册子格）／`t824-视觉基准.md`（五维尺与四门跑法）／`t856-manifest.json`（清单是唯一权威）／`t855-实施规格-与开工前读数.md`（域形状）。

---

## 一 交付物

| # | 场景 id | 唤醒词 | 命令 | 册子格（seq／族） | 产物主体 | 字节 |
|---|---|---|---|---|---|---|
| 14 | `memo_remind_with_note` | 记提醒 | `memo.create` | 14 通用回执 | `记提醒` | 17 859 |
| 15 | `memo_remind_existing` | 设提醒 | `memo.reminder` | 15 通用回执 | `设提醒` | 17 988 |
| 16 | `memo_reminders_active` | 看提醒 | `memo.remind` | 16 列表查询 | `看提醒` | 24 332 |
| 17 | `memo_completed_reminders` | 查已提醒备忘 | `memo.remind` | 17 列表查询 | `查已提醒备忘` | 23 603 |

**源码落点**（票面要求 `src/remind/`）：

- `src/remind/routes.ts` 改（两条路由纠错）；
- `src/remind/run.ts` 改（两条命令的产物接线）；
- `src/render/listPage.ts` 新建（「列表查询」页族唯一定义地，9 格）；
- `src/render/index.ts`、`src/render/receipt.ts` 改（族出口与回执族场景名单各加本域两格）；
- `src/memo/run.ts` 改（跨域那一格，见 §五）；
- `templates/receipt.html`、`templates/memo_query.html` 改（复制区说明行由文案改结构）。

## 二 两处路由纠错（本票的诊断结论，逐条带机器读数）

**① `设提醒` 接不住（原 exit 2）。**
`REMIND_ROUTES` 只声明 `needs: ['remind_at']`，而 `memo.reminder` 的 `reminderContentOf()` 要求 `content`／`body`／`title` 有一个非空，缺则红。
老技能是权威：`memo_cli.py:1116-1117` 逐字 `if not content or not content.strip(): error_json("请填入提醒内容")` ⇒ **`content` 是必填**，本域该做的是把它声明成槽位（缺什么当场报什么），不是放宽命令。
改法：`needs: ['content', 'remind_at']`，并把 `cli` 那一行改成照抄即能跑（含 `note_id`）；`note_id` **不入 needs**（HELP 场景 45 行写「可选，可不关联具体笔记」）。

**② `查已提醒备忘` 与 `看提醒` 出同一份（视图反了）。**
原 `preset: { done: false }`，而「已完成视图」的判据是 `mode === 'done' || done === true` ⇒ `false` 落回 `status=active` 分支，两条命令**逐字节同结果**。
改法：`preset: { done: true, scene: 'memo_completed_reminders' }`。权威实现本来就在（`listCompletedReminders`，老 `completed_reminders` 口径：打卡笔记经 `notes.reminder_id` 反查提醒行）。

## 三 五条验收命令逐条读数（2026-09-21 收尾轮 · 全绿）

前置件已齐：[#851](https://github.com/FeatherHunter/ilife/issues/851) 关票分解出 [#867 读数链](https://github.com/FeatherHunter/ilife/issues/867)／[#868 判分引擎](https://github.com/FeatherHunter/ilife/issues/868)／[#869 六列机审](https://github.com/FeatherHunter/ilife/issues/869)／[#870 形状件](https://github.com/FeatherHunter/ilife/issues/870)，四件都已落地 —— 本票七条阻塞边全部关闭。

| 门 | 命令 | 读数 | 绿？ |
|---|---|---|---|
| 真出口用例 | `node --test packages/skill-memo-ilife/test/t828-remind-domain.test.mjs` | **19/19 通过**（4 场景落盘 ＋ 两处纠错定义级 ＋ 4 条反例 ＋ 2 条收尾钉） | ✅ |
| 分隔符门 | `node packages/base-render/test/separator-probe.mjs <产物>` | 4 件**节点级 0／行级 0** | ✅ |
| 响应式门 | `node packages/skill-calorie/scripts/measure-responsive.mjs --dir <产物目录>` | `OVERFLOW-ZERO pages=4 cells=12 failed=0`（390／768／1440） | ✅ |
| 机审六列 | `node docs/skills/skill-memo-ilife/t869-机审.mjs --dir <页群目录>` | **`RESULT: 4/4 PASS ①0 ②0 ③0 ④0 ⑤0 ⑥0`**；逐列汇总「双端断点缺失 0 件／触摸目标缺失 0 件／页内自造样式 0 件／重复句 0 句／分隔符懒政 0 处／英文裸词 0 处」 | ✅ |
| 五维尺 | `node packages/base-render/scripts/判分.mjs --dir <读数目录> --config <按域配置>` | **逐页 96／96／100／100，均分 98，最低 96**；每维 ≥ 满权 80%（D1 15／D2 20／D3 25／D4 15／D5 21–25）；**硬扣分 0**；`RECONCILE … 最大绝对差 = 0 ⇒ 一致（差 0）`（比对 28 项） | ✅ |

读数与配置落 `t828-判分读数/`（`sep.json`／`resp.json`／`fmt.json`／`facts.json`／`人核档.md`／`判分配置.json`／`判分结果.json`），可重跑。

**复现**：`node .scratch/tickets828/probe-remind-e2e.mjs`（唤醒词与场景 id 从官方源 `src/help/scenes/remind.ts` 取，真喂 `routeWakeword()`，真跑唯一出口，临时库 ＋ 隔离配置，**绝不碰活库**）。

## 三之二 收尾轮现场修掉的三处（都是「机器门读不到、渲染后才看得见」那类）

| # | 症状 | 判据出处 | 改法 |
|---|---|---|---|
| 1 | 回执页**页题两遍**：写死的眉头「备忘录回执」与运行时页题同串 | `t849-视觉基准.md` §1 H3（同事实一页一处，−2） | 删眉头元素与其 CSS；页题由载荷 `title` 唯一提供 |
| 2 | 元信息行 `时间：… · 唤醒词「…」` —— **运行时**才拼出来的 `·` 串，分隔符探针读不到 | §3 形状化对照表（`·` 串单实体的多字段 ⇒ 键值行） | 改用全角间隔，不再用并列串 |
| 3 | 生成物把内部参数带到用户面：`看提醒` 的 `preset` 让 SKILL 速查示例多出 `"scene":…`；`设提醒` 的 `content` 落成占位符 `<值>` | 命令不上 HELP 交付面；示例要「照抄即能跑」 | 撤 `看提醒` 的 `preset`（缺省支已够）；`exampleParams` 给 `content` 一条人话示例 |

第 1／2 条已由用例钉住（`t828-remind-domain.test.mjs` 的「页题不重复」「页上可见文本不用分隔符串顶替版式」「运行时渲染的元信息行」三条，各自改坏即红）。

## 四 （已作废，留档）此前两条门为什么跑不了

**这一段是上一轮写的，现况见 §三。** 当时 `t824-视觉基准.md` §4 定的两件（备忘录六列机审、判分引擎直升公共层）都住 #851，而 #851 是串行窗口小票、当时 open 未认领；故本票只报到 90%。#851 随后关票并分解出 #867–#870 四件，四件落地后本票补跑了两道门，读数见 §三。

## 五 跨域一处：`记提醒` 的页为何住在 `src/memo/run.ts`

`记提醒` 的 HELP 场景（`memo_remind_with_note`）是**两步合一**（添笔记 ＋ 设提醒），命令是 `memo.create`（`#837` Q⑥ 定稿：**不开新键、也不给 create 补参数**）。
⇒ 这一格的回执页只能由 `memo.create` 那一支出，而那个函数住备忘域。判据＝「这一次有没有要求建提醒」（路由断言 `needs: ['remindAt']` 保证给了它就一定到），**不是分类**（这条命令的每条分类创建都会走它）。
改动是 `runCreate` 里追加一支 ＋ 上一行 `#829` 的 `wishReceiptFor` 并排，共 6 行。

## 六 顺带清掉的一处债（分隔符门从 4 件全红到全绿）

改前：4 件产物**每件都红 1–2 处**，命中全是同一句话 —— 复制区说明行：

- `receipt.html`：`点复制数据保存这次的结果 · 点复制日志用于反馈问题（日志不含隐私内容）`
- `memo_query.html`：`跟随筛选/展开实时变化 · 粘贴给 AI 继续下一步(复制数据 = 初始全量存档)` ／ `点复制数据保存当前结果 · 点复制日志用于反馈问题(日志不含隐私内容)`

这正是 `t824-视觉基准.md` §3 点名的「复制区说明行 7 处同一句」，也是 #851 第 3 件要收的共用件。
本票按 §3 的**语义 → 形状**表处理：`·` 串单实体的多字段 ⇒ **键值行**（`<dl>` 一条一项），**不是把 `·` 换个标点**（换标点是懒政，门能过、债还在）。共用件仍归 #851。

## 七 行数账（诚实记账）

`src/remind/run.ts` 100 → 188 LF（加了两个族的整页装配），`src/remind/routes.ts` 57 → 66 LF，`src/render/listPage.ts` 新建 69 LF —— **均未越 350 告警线**。
`src/memo/run.ts` 在本次会话中一度到 367 LF（越线），**#829 已把它拆到 285 LF**（页装配三件搬去 `src/memo/receiptPage.ts`），本票的 6 行落在 285 基线上。

## 八 提交范围

`fe28c85b`：8 件 —— 本票 7 件（`src/remind/routes.ts`／`src/remind/run.ts`／`src/render/listPage.ts`／`src/render/index.ts`／`src/render/receipt.ts`／`templates/{receipt,memo_query}.html`／`test/t828-remind-domain.test.mjs`）＋ 共编件 `src/memo/run.ts` 的**全部在途差异**。

⚠️ **一处要别的席位知道的事**：`src/memo/run.ts` 的那 105 行差异里混进了 #829 的在途重构（`receiptPage.ts` 拆分 ＋ `wishReceiptFor` 接线），它们本会是 #829 自己的提交。`git add -p` 的交互通道在本会话不可用（管道 stdin 下只出 1 块），改用 `git apply --cached --recount` 只推自己的块时，`-U0` 补丁的 `@@ -134,0 +79,11 @@` 与 `-U3` 三方合并叠加，把其余块一并带进了索引。**代码一行没丢没坏**（编译绿、本域测试全绿、工作区与索引一致），但**归属串了**：#829 的人提交时该件会显示为已提交状态。

## 九 交付对账（必报五步第五步）

| 票面要求 | 落点 | 状态 |
|---|---|---|
| ① 报影响清单与结构设计给负责人点头 | 票面诊断评论（2026-09-21） | ✅ 已报（含 4 场景抄表 ＋ 5 条实测缺陷） |
| ② 照 #855 形状拆能力目录 | `src/remind/` 六件（#855 批次 3 已落），本票只改其中两件 | ✅ |
| ③ 逐场景真跑，产物落册子目录，回执绝对路径 | 4 格产物 ＋ 本证据件 §一；落点走共用件 `base-paint/save-html` | ✅ |
| ④ 本域产物上链路总表与双端墙的对应格 | 4 个主体与 `t856-manifest.json` 四行逐格一致（§三 逐格比对）；整墙 34 格重铺归 #834 | ✅ 本域这几格 |
| ⑤ 报交付对账 | 本表 | ✅ |
