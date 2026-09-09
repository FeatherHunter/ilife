# HELP 台账 R-3 定点复核 · 审查席 A（数据面/红队）

> **被审**：commit `4543baa`（`docs/research/t-help-parity-ledger.md` ＋ `t-help-parity-{gen,extract,compare}.mjs`）。
> **复核对象**：本席 `aee89ed` 提出的 **3 条 S2 ＋ 1 条 435/436 ＋ 8 条 S3** 是否真闭环（另核 R-3 新增断言）。
> **方法**：只验证、不重写台账。复跑自己的 `docs/research/t-help-parity-review-a-probe.mjs`（持锁 `--ticket 83`，自建 `SKILLS_DB_PATH`），
> 与新台账**逐行比对**；中间数据落 `.scratch/review-a-probe/{regen,parse-a,analyze-a,extra-a,deep-a,same-source,r3-checks}.json`。

---

## 0. 前置复核（返修是否动了产物／代码）

| 检查 | 实测 | 结论 |
|---|---|---|
| 4543baa 是否触 `packages/**` 渲染面 | 该 commit 仅 4 个 `docs/research/` 文件（`git show --stat`） | 无 |
| 三态产物是否变 | 本席复跑（16:16:36，`--ticket 83`）：file 1,264,822 `f380ef68…`／inline 994,295 `8c1683da…`／text 24,989 `92425e0a…` | **与 R-3 前逐字相同** |
| 期间他席重建 | 16:13:36 他席 `pnpm build`（`runId=2b927af3-68f9-4697-8365-5cf1a8934e8f`，exit=0）后本席复跑 | 产物 sha 不变（稳定性再证） |
| 台账 §1 三态表（R-3 新 runId） | `.scratch/final-db/calorie_html/身材照HELP_20260910_000006{,_2,_3}.html` 三文件字节／sha 与表逐字一致 | 成立 |
| 台账脚本链 | 以本席 DB／out 复跑：`RESULT: 32/32 gen-checks`／`27/27 extract-checks`／`23/23 compare-checks`；`ROWS 50 {"一致":18,"差异（可解释）":18,"新版新增":11,"新版缺失":3}` | 成立 |

---

## 1. 逐条复核（改前 → 改后 → 我的复算值）

### 1.1 三条 S2 ＋ 1 条 435/436

| # | 我的原缺陷 | R-3 改后（逐字要点） | 我的复算值 | 判定 |
|---|---|---|---|---|
| **A-2** | D4「裸 `<N>` 等尖括号｜逐字保留（**13 处** legacy 原文）」——产物侧不可复现 | 「**源码侧 13 处**（`t88-final.md:129`）／**产物侧 prompt 内 0 处**；唯一 `<N>` 在 1 条 scene id：text 态裸 1 处、payload 转义 `\u003cN>`、卡级 `&lt;N&gt;`」；判定 **一致**；来源标注 | prompt 内 `<`：旧 **0**／新 **0**；text 产物裸 `<N>`＝**1**；payload `\u003cN>`＝**1**；markup `&lt;N&gt;`＝3；**源码侧＝`packages/skill-calorie/src/triggers/**` 13 行含 `<N>`（25 处；`scene-02-diet.ts` 3 行／5 处，L29 在列）** | **闭环**（口径注：13＝**行数**，按出现次数为 25） |
| **A-3** | D6「键盘可达｜旧＝无显式 Enter／新版新增」与自身 marker 矛盾 | 「旧 `newIn.addEventListener('keydown'…Enter…doNew())`（作用于**新增输入框**）｜新：搜索框 Enter 循环跳页」；判定改 **差异（可解释）**＝**能力对等扩展** | 旧 JS 实测该 handler 逐字存在；`ledger.json→D6.oldMarkers.keyboardEnter=true`；新侧 keydown 挂在搜索 `input` | **闭环** |
| **A-4** | D5／D6「每卡 3 按钮＝**运行时注入**」 | 「**静态 markup 1,308 个**（`data-action-id` 各 436）＋运行时注入卡头**第 4 个**（`injectCardCopy`）；静态 `card-copy` 命中 0、JS `createElement("button")` 仅 4 处」 | 静态 `<button>` **1,308**；`copy-prompt`／`copy-wakeWord`／`copy-params` **各 436**；markup `card-copy` **0**；JS `createElement("button")` **4**；`injectCardCopy` 函数体确为「新建 button → append 到 `card-top`」 | **闭环** |
| **A-1／A-S3-2** | D5「卡级 code 436＝Scene.id」实为 435/436 | 「436 条，其中 **435 条逐字＝Scene.id**（1 条例外＝含 `<N>`／`"` 的 id，渲染 `&lt;N&gt;`／`&quot;`，**反转义后 436/436**）」 | 逐字＝**435**；实体形式＝436；反转义后＝**436**；唯一例外 `i=78` | **闭环** |

### 1.2 我另记的 5＋3 条 S3

| # | 我的原缺陷 | R-3 处置 | 我的复算值 | 判定 |
|---|---|---|---|---|
| **A-S3-1** | 体积四段加总 962,035 ≠ +962,002（残差 33 B） | 新增两行：构成**块口径** `markup 953,821＋payload 块 270,313＋style 块 21,031＋js 块 19,657 ＝ 1,264,822`（残差 0）；增减 `962,036 ＋ 标签壳 −34 ＝ 962,002` | 新块和＝**1,264,822**（残差 **0**）；旧块和＝**302,820**（残差 **0**）；标签壳 **旧 120／新 86**（差 **−34**）；分块和 **962,036**；962,036−34＝**962,002** | **闭环** |
| **A-S3-3** | stdout 字节随路径长度变 | §1.1 标注**环境相关量**＋公式 `stdoutBytes ＝ 基线 ＋ 2×Δ(path)`，「勿当固定值比对」 | 本席 1,282／1,286／26,829（路径长 +3 字符 ×2 处＝+6 B） | **闭环** |
| **A-S3-4** | 「file 产物内逐字包含 inline 片段」有反例 | 改为**分段逐字相等**（style／`<section>` 内容段／helpers 三段 sha256）＋把「inline 是 file 子串」**钉成 false 断言** | `segEqual={style:true,content:true,helpers:true}`（三段 sha 两侧逐字相同）；`inlineIsSubstringOfFile=**false**` | **闭环** |
| **A-S3-5** | css／js 拼接口径混用（±1 B） | extract 改**块口径／内容口径双记**并声明 ±1 连接符口径（旧壳 120 vs 席 B 119） | 内容口径：css 直连 33,469／`join('\n')` 33,470；js 直连 71,199／连接 71,200 | **闭环** |
| **A-S3-6** | 新侧剪贴板漏记 `execCommand` 兜底 | 「`navigator.clipboard.writeText()` ＋ textarea 回退，**仍带** `execCommand('copy')` 兜底」 | 新 JS 含 `execCommand('copy')` | **闭环** |
| **A-S3-7** | 「参数必填校验 旧＝有」在本数据上不可观测 | 该行标注「**代码级判定**：F3 根镜像 436 场景 `editable_fields` 全空」 | 旧 payload `editable_fields` 命中 **0** | **闭环** |
| **A-S3-8** | 「既有唤醒词 恒最后」易误读 | 「**仅 `diet_9`／`analysis_9` 两组**有该子功能且恒列组末」 | 标签为「既有唤醒词」的子功能＝**2** 个，均为所在组末位 | **闭环** |

### 1.3 R-3 新增断言的独立复核

| 新增断言 | 我的复核 |
|---|---|
| 判定由测量产生（`add(…, rule, …)`；无判定字面量；恒真 `? A : A` 已删） | 源码 4 处三元**两分支均不同**（0 处恒真）；`ok()` 断言 **23** 处（与 §9.1「21→23」一致） |
| 每行 `evidenceRef` 可解析（50/50） | `rows` 缺 `evidenceRef`＝**0**；`resolveRef` 断言在册（compare.mjs:410-412） |
| 穷举对账 17 键 100% 覆盖 | 我的复跑 `ledger.json → summary.enumDiffs=17、uncoveredEnumDiffs=0` |
| 体积等式闭合两条断言 | 块口径残差 0 ＋ `962,036−34＝962,002` 均实测成立（见 A-S3-1 行） |
| `ledger.json` 去 `generatedAt` 后 sha256 `e8233c78…` | **其盘上文件按 raw 字节复算＝`e8233c78…` 逐字命中**（该文件已无 `generatedAt` 字段）；本席同输入连跑两次同值 → 确定性成立。**注**：本席自跑产物 raw sha＝`409a6a78…`，差异源于 `repo.head`／`statusShort`（输入不同：`40cfce8` vs `4543baa`）→ 该 sha **绑定输入** |
| 50 行分布 18／18／11／3 | 复跑 `ROWS 50 {"一致":18,"差异（可解释）":18,"新版新增":11,"新版缺失":3}` |
| D4 新行 subtitle、D6 新行 tnum／字体栈、D5 新行 222/341、D7 新行 payload 顶层键 5→6 | 旧 subtitle `10 分类 · 436 场景 · 更新于 2026-08-14 11:38`／新 `10 分类 · 436 场景`；`tnum` 旧 false／新 true；`-apple-system`＋`PingFang SC` 旧 true／新 **false**（新 CSS `font-family` 仅 `"SF Mono", monospace` 与 `inherit`）；带 ISO 日期的 CLI＝**222/341**；payload 顶层键 5→6（＋`meta_blocks`）——**全部逐值成立** |
| D7「与 L-16 对账 +253,843 B」 | 1,264,822 − 1,010,979 ＝ **253,843**（算术成立；L-16 源值属他档） |

---

## 2. 余项（非阻塞 · 建议随下次文档改动一并修）

| ID | 余项 | 我的实测 | 建议 |
|---|---|---|---|
| **RA-1** | D5 新行「95 条无字段卡的「复制参数」按钮回落复制卡级 code（**＝Scene.id**）」 | **94/95 逐字**；第 95 条（`i=78`，id 含 `<N>`／`"`）的 `data-t` 为 HTML 实体转义形式（`&lt;N&gt;`／`&quot;`），语义同 id | 加与 A-1 相同的脚注「1 条经实体转义」 |
| **RA-2** | §1.1「**payload 块** 270,259 B 插在内容段与 helpers 之间」 | **块（含标签）＝270,313 B**；270,259 B 是 JSON **内容**（D7 已按块口径 270,313 记账） | §1.1 改为「payload 内容 270,259 B／块 270,313 B」 |

> 两条均为措辞／口径级（≤54 B、1/95 条），**不影响任何判定或结论**；其余 11 项复核全部闭环。

---

## 3. 门禁实测表（本席 R-3 复核轮）

对账窗口：`--ticket 83 --since 2026-09-09T16:16:00Z --until 2026-09-09T16:19:00Z`（覆盖本席 9 条持锁运行，全部 exit=0）。

```
GATE-RUN runId=2e012887-adb0-42c3-9b61-ded7566b15f7 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=bb8436d5-eb4f-46ca-9c2f-e13ad281fcef cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=14f17e77-78ed-4421-b92b-e76004abdc62 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=72e8b37f-0f13-43aa-85d2-20d58995df8c cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=4d7ae2c1-a993-4586-9212-c02f21b6250f cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=d630ce48-1652-4451-8b18-050aba2d859a cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""
GATE-RUN runId=13e8e3ed-3dc6-4741-97e2-12c21e922fca cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center"
GATE-RUN runId=9c94b29b-4c8a-4bf7-9ebe-59be50dbb847 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"inline\\\"}\""
GATE-RUN runId=6e7c6a4b-88c9-43bb-a936-3175189ed141 cmd="node packages/skill-calorie/dist/cli/cmd_read.js calorie.help.center --params \"{\\\"mode\\\":\\\"text\\\"}\""

GATE-RELAX flag=--allow-undeclared reason=同一票号 83 在本窗口有并发 session 运行（`pnpm test`／`pnpm build`／`.scratch/t83/r2b-*.mjs`／`t83-review-blue-mut.mjs`／他席 gate-audit 等，均非本席命令）；本席 9 条运行已逐条声明，反向对账其余条目属他席
```

- 9 条声明全部 `exit=0`（无需 `--allow-nonzero`）。前 3 条＝本席探针 `--regen`（自建 DB）；中 3 条＝`--same`（三态同源）；后 3 条＝复跑被审 `gen.mjs`（其默认票号 83）。
- **被审台账 §5 的门禁主张独立复核**：以其逐字命令重跑 → `RESULT: matched=28/28 auditEntries=874 scoped=66 undeclared=38` ＋ `gate-audit: PASS`（台账记 840 条，日志已增长至 874，属预期）。

**对账输出（本席实测）**：

```
$ node tooling/check-gate-audit.mjs --evidence docs/research/t-help-parity-review-a-recheck.md --ticket 83 `
    --since 2026-09-09T16:16:00Z --until 2026-09-09T16:19:00Z --allow-undeclared
（见下）
```

```
证据：D:\ilife\docs\research\t-help-parity-review-a-recheck.md
审计：D:\ilife\.scratch\locks\gate-runs.log（RUN 条目 892 条；窗口内 19 条，ticket=83）
声称运行 9 条（逐条命中 exit=0）
反向对账：窗口内无人声明的 RUN 条目 10 条（他席 `t83-recheck-r2.md`／`t83-html-first.md` 的 gate-audit 等）
RESULT: matched=9/9 auditEntries=892 scoped=19 undeclared=10
gate-audit: PASS
```

---

## 4. 结论

| 项 | 结果 |
|---|---|
| 我的 3 条 S2 | **全部闭环**（A-2／A-3／A-4） |
| 我的 1 条 435/436 | **闭环**（435 逐字 ＋ 1 条转义，反转义 436/436） |
| 我的 8 条 S3 | **全部闭环** |
| R-3 新增机器化断言 | 独立复核成立（判定由测量产生／evidenceRef 50/50／穷举 17 键 0 未覆盖／体积两条等式／ledger.json 确定性） |
| 余项 | **2 条 S3 措辞级**（RA-1、RA-2），非阻塞 |

**verdict：PASS**（R-3 对本席返修单闭环 **11/11**；无新增 S1／S2；2 条余项不影响任何判定）。

**最小整改清单（非阻塞，建议下次文档改动一并落地）**
1. D5「95 条回落＝Scene.id」→ 补「94 条逐字 ＋ 1 条实体转义（`i=78`）」。
2. §1.1「payload 块 270,259 B」→ 改「payload 内容 270,259 B／块 270,313 B」，与 D7 块口径对齐。

## 5. 自检

```
$ node -e "const b=require('fs').readFileSync('packages/skill-calorie/SKILL.md');console.log([...b.slice(0,3)].map(x=>x.toString(16).padStart(2,'0')).join(' '))"
2d 2d 2d          ← 非 00 00 00（#124 未复现）
```

- 本席本轮**只新增** `docs/research/t-help-parity-review-a-recheck.md`，并改自己的 `docs/research/t-help-parity-review-a-probe.mjs`（加 `--ticket` 开关 ＋ `--r3` 复核模式）；未改被审 4 个文件、未改 `packages/**`／`tooling/**`／既有 `docs/**`。
- 未跑全量 `pnpm test`；持锁运行仅 9 条 CLI（全 exit=0）。
