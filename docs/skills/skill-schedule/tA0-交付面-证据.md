# 【交付面】唤醒词命令缺省落盘 ＋ 产物落点分家 ＋ 命名一处定义 —— 证据（#843）

票：[#843](https://github.com/FeatherHunter/ilife/issues/843)（sub-issue of map [#779](https://github.com/FeatherHunter/ilife/issues/779)）

## 一、做了什么（对着票面三条）

| 票面 | 落地 |
|---|---|
| 7 个唤醒词命令**缺省不落盘** | `src/cli/cmd_read.ts`：缺省即落盘（页面落产物根、HELP 自带 `landing`）；`--html` 仍是优先级最高的逐字落点；HELP 现找（`q`）按定义不落盘（`ViewOut.delivery:false` 显式表态） |
| 产物落点分家 | `src/config.ts` 默认值表分两键：`html.dir`＝产物**根**（`schedule_html`）、`html.helpDir`＝根下 HELP 那一支（`help`）；算式唯一定义地＝`src/fetch/paths.ts`（`htmlDirOf`／`helpDirOf`／`resolveHelpDirOf`） |
| 命名规则一处定义 | `src/delivery/naming.ts` 的 `pageStemFor(spec)`＝`技能名_命令标题`（标题读生成的 `registry.ts` 声明，不写第二遍）；落盘唯一出口＝`src/delivery/output.ts` 的 `deliverHtml` |

改动前的落点 `help/output.ts` 已搬到 `src/delivery/output.ts`（页面与 HELP 共一条链），`help/helpPaths.ts` 只剩转出——落点算式不再有第二份。

## 二、机器读数

### ① 验收命令（票面）

```
node docs/skills/skill-schedule/tA0-交付面探针.mjs
```

绿态（`RESULT: PASS cases=8 red=0`；指纹与结论同一行）：

```
RESULT: PASS cases=8 red=0 | FINGERPRINT: src-n=67 src-sha-前=934dee4e7b612094 src-sha-后=934dee4e7b612094 dist-n=273 dist-sha-前=73b6720b6af4929e dist-sha-后=73b6720b6af4929e selftest-dist-变动件=0 tsc-exit=0 时长ms=88 开始=2026-09-21T05:13:17.968Z 结束=2026-09-21T05:13:18.073Z
```

逐键读数（同一趟）：

```
schedule.record.today   → 作息管家_今日作息_20260921_131318.html（952 B）
schedule.record.range   → 作息管家_汇总作息_20260921_131318.html（1174 B）
schedule.record.detail  → 作息管家_作息详情_20260921_131318.html（1122 B）
schedule.record.compare → 作息管家_作息对比_20260921_131318.html（1073 B）
schedule.plan.today     → 作息管家_查日程_20260921_131318.html（936 B）
schedule.plan.write     → 作息管家_写计划_20260921_131319.html（1020 B）
schedule.record.write   → 作息管家_记作息_20260921_131319.html（1002 B）
schedule.help.lookup    → 作息管家_HELP_20260921_131319.html（139084 B，落 <产物根>/help/）
落点分家：产物根里 10 件页面、HELP 支里 1 件 HELP
```

### ② 变异自证：改坏一处必须变红（两行机器读数）

变异不落在仓库主树上：把本包拷到 `.scratch/t843/vary/`（仓库外解析到共享 `node_modules` 的独立副本），
在副本里改源、`tsc -b .scratch/t843/vary --force` 重建，再用**同一份探针** `--bin` 指副本出口：

| 变异 | 读数 |
|---|---|
| ① 改坏**命名规则**（`naming.ts` 的 `SCHEDULE_SKILL_NAME`：`作息管家` → `作息管家X`） | `RESULT: FAIL cases=8 red=14`；红条例：`schedule.record.today：落盘名 作息管家X_今日作息_20260921_130516.html 不符「作息管家_今日作息_<时间戳>.html」` |
| ② 改坏**落点分家**（`config.ts` 的 `html.dir`：`schedule_html` → `schedule_html_pages`） | `RESULT: FAIL cases=8 red=…`；红条例：`schedule.record.today：落点 …\data\schedule_html_pages ≠ …\data\schedule_html`、`HELP 支目录不存在：…\data\schedule_html\help` |
| 还原（真出口再跑一趟，同一份探针） | `RESULT: PASS cases=8 red=0`（指纹 `src-sha=934dee4e7b612094`／`dist-sha=73b6720b6af4929e`，与变异前那一行逐字相同） |

两行原文分别见 `.scratch/t843/mut1.log`（变异①）与 `.scratch/t843/mut2.log`（变异②）；还原那一趟见 `.scratch/t843/probe-3.log`。

### ③ 安静窗口与指纹绑定（协议 §2.6）

- 安静窗口：跑之前 `git status --short -- packages/skill-schedule/src` 为空（本票改动已提交）；锁目录属主不是别人（探针自检，属主票号不同即 exit 2 作废）。
- 指纹：探针自己调 `docs/agents/t540-指纹绑定.mjs --scope packages/skill-schedule` 取那一行 `FINGERPRINT:`，结论**只对该指纹有效**（`src` 漂移即作废）。

### ④ 本包全量用例

```
GATE-RUN runId=2ac607fc-cd42-4885-8b94-f7ba627bf8f2 cmd="node --test --test-concurrency=1 packages/skill-schedule/test/*.test.mjs"
ℹ pass 124
ℹ fail 0
```

（运行标识抄自 `.scratch/locks/gate-runs.log`；同命令的另两趟 `runId=f0b02ada-7535-479b-9c90-70b54fe45bca`／`d972ddf3-75bb-44fa-874f-42201ec57ae2` 也是 exit 0。）

其中新增 `test/tA0-交付面.test.mjs`（4 条：8 键缺省落盘 ＋ 落点分家 ＋ 命名出处 ＋ 同名不覆盖）。

### ⑤ 安静窗口被撞一次（读数作废与恢复，过程留痕）

跑本票验收的时候，**本包 `dist/cli/cmd_read.js` 被别家的测试缝覆写过一次**：`packages/skill-calorie/test/helpers/land-inferred-stub.mjs`
为跨技能出口把 fixture 脚本**暂放**在 `packages/skill-schedule/dist/cli/cmd_read.js`（跑完由 `after` 还原），
那次 `pnpm -w test`（根测试面）在我这席的窗口里被 120 秒超时杀掉，`after` 没走到 ⇒ 文件残留成 fixture。

- 现场读数（作废的那一窗）：`schedule.config.read` 回的是 `{"ok":true,"message":"fixture 默认回执"}`——一眼可辨，
  故**当时以该 `dist` 为前提的读数一律作废**（协议 §2.6 的口径：`dist` 混进别家东西即不可用）。
- 处置：停掉那趟根测试（背景任务已 kill）→ `tsc -b packages/skill-schedule --force` 重编（`dist/cli/cmd_read.js`
  恢复为 9109 B 的本包出口）→ **重跑本票全部读数**（本文上面几条就是重跑后的那一套）。
- 给后来人的话：以本包 `dist` 为前提做读数之前，先确认出口是本包的（`schedule.config.read` 认得出）——
  那份 fixture 残留会**静默**冒充本包出口，指纹工具也看不出（它只看 `src`／`dist` 有没有变，不问内容是谁的）。

其中新增 `test/tA0-交付面.test.mjs`（4 条：8 键缺省落盘 ＋ 落点分家 ＋ 命名出处 ＋ 同名不覆盖）。

## 三、跨包锁同步（已做，票面外但被本票改动所迫）

落点分家改了 `html.dir` 的默认值，两份别的包的用例把这个默认值锁死了，故一并更新（只改断言，不改页面文案与行表）：

- `packages/plugin-schedule-ilife/test/config-surface-696.test.mjs`：`html.dir` 默认值改 `schedule_html`、新增 `html.helpDir` 一格的断言；「一行一键对齐」改成「面板会给改的键一个不少，`html.helpDir` 不立行」（落点类项只读，面板那一行显示的正是含它的绝对路径）。
- `packages/plugin-schedule-ilife/test/skills-provider.test.mjs`：正文锚点由「缺省交付物＝HELP 文件」改成「缺省交付物与回执形状」（#843 起 8 键都缺省落盘）。
- 该包全量：`GATE-RUN runId=31373f9f-f244-40d3-ac78-0e0d0a2e6806 cmd="node --test --test-concurrency=1 packages/plugin-schedule-ilife/test/*.test.mjs"` → `pass 70 / fail 0`。

## 四、范围外发现（不属本票，转给对应票）

1. **`对比两个月` 那条路由跑不通**：路由项只给 `preset {kind:'months'}`，而 `viewRecordCompare` 的 months 支还要 `monthA`／`monthB` ⇒ 照抄跑 exit 4。归【分析与洞察】票（该键的页面化票）。
2. **`tsc -b` 增量死锁**（本票实测一次）：`src` 改完而 `tsconfig.tsbuildinfo` 更新时刻更晚时，`tsc -b` 判「up to date」**不重编**，`dist` 留着旧写法；`tsc -b <包> --force` 即恢复。以 `dist` 为前提的读数（真出口、探针）务必先 `--force` 重编，或先用 `t540-指纹绑定.mjs` 确认产物与源码同代。
3. **测试件并行跑会互撞**（本包实测）：`node --test packages/skill-schedule/test/*.test.mjs` 默认并发下本次出现 0～62 条不等的失败，`--test-concurrency=1` 恒绿（124/124）。门禁口径宜固定串行。
4. **`dist` 会被别家的测试缝借用**（见 §二⑤）：`packages/skill-calorie/test/helpers/land-inferred-stub.mjs` 把 fixture 暂放到本包出口，进程被超时杀掉即残留。要一份「本包 `dist` 一定是本包的」判据，现在只能靠「出口回执认得出」这一条——要不要加一道机械门，归维护者裁。
