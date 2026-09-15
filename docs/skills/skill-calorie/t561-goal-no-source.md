# #561 目标域页面屏上来源脚注删除 · 证据件

票面：`gh issue view 561`「目标域页面屏上来源脚注删除（跟随 #560 的用户裁决）」，实施者角色。
用户裁决原文（改动注释与测试注释逐条引用同一句）：
「用户 2026-09-15 点名：所有 HTML 页面底部的「数据来源：xxx」都删掉（用户直接看得见按钮与内容，不需要脚注复读来路）。」
#560 只管场景 01 的 9 页（跨场景不动）；本票补场景 06 目标管理这一族**自己的页面**。

## 一、影响清单（结构纪律第一步）与交付对账（第五步）

先实跑 25 条唤醒词逐件点名（读法见 §四），**以实跑为准**逐件落：

| # | 文件 | 一句话与理由 | 对账 |
|---|---|---|---|
| 1 | `packages/skill-calorie/src/goal/resultDocs.ts` | 目标类 3 键（`view.goal`／`view.goal-vs-actual`／`view.goal-expiring`，共 4 件实跑产物）整页装配：`tailOf()` 的**来源脚注**那一条尾巴（`renderCaliberLine(footer)`）整条撤，四处（`tailOf` 定义 ＋ 3 个调用点的 footer 实参）跟着收；`copyBlockOf` 的 `source`（复制日志第 3 段技术原件）一字不动 | 落 |
| 2 | `packages/skill-calorie/src/goal/receipt.ts` | 目标管理 5 条会改数据库的命令（10 件写词实跑产物）写后回执整页：屏上最后一行 `renderCaliberLine('数据来源：本机目标库 ｜ …')` 整行撤；`copyLog({ source: receipt.meta.source })` 载荷不动 | 落 |
| 3 | `packages/skill-calorie/test/t561-goal-no-source.test.mjs`（新建） | 本票验收用例：25 条命令逐条可见文本零命中 ＋ 载荷来源仍在（正证）＋ 完整文档四断言 ＋ 变异自证 | 落 |
| 4 | `docs/skills/skill-calorie/t561-goal-no-source.md`（本件）＋ `.scratch/t561/` 下的探针与变异脚本、长输出 | 证据与长输出日志（文件名带票号） | 落 |

**未落（实跑查明「本件不出屏上脚注」，逐件点名）**：

| 文件 | 实跑读数 | 为什么不动 |
|---|---|---|
| `packages/skill-calorie/src/goal/precheck.ts` | 三条预检页（#2／#7／#8）可见文本 `数据来源` **0 命中**，原样 HTML 亦 0 | 该页的来源只进 `copyLog({ source: GOAL_SOURCE })`（复制日志第 3 段），屏上从来没有脚注行；本票只删屏上调用，故一行不改 |
| `packages/skill-calorie/src/goal/goalWeightDoc.ts` | 看体重目标进度（#12）可见文本 0 命中 | 该页没有任何来源脚注行（眉标那串 `calorie.view.goal-weight · 目标管理域` 被 `assembleDocPage` 的源码标识符筛整行挡掉，不上屏） |
| `packages/skill-calorie/src/render/trendDocs.ts` | 看目标预测达成（#25）可见文本 0 命中 | 该页属 `src/render/`（别家能力目录，本票禁区）；实跑证明它本来就不出脚注，无需改，**不转票** |
| `packages/skill-calorie/src/home/goalProgressDocs.ts` | #9／#10／#11／#13／#17／#18 六件 `calorie.view.goal-progress` 可见文本 0 命中 | 场景 01 的页（#467／#560 已撤该行），本票禁区；读数一并记进 §四 备查 |

禁区（均未碰）：`src/home/**`、`src/diet/**`、`src/weight/**`、`src/body/**`、`src/photo/**`、`src/render/**`、`src/triggers/**`、
公共 helper（`shared/sourceLine.ts` 的 `sourceLine`／base-paint 的 `renderCaliberLine` 本身，别家页仍在用）、
`SKILL.md` 与生成物、唤醒词名／命令键／参数名／退出码／取数口径。

## 二、结构设计（第二步）

无新目录、无新文件落在 `src/`（只删调用，不加名字）。两源码件对外接口不变
（`buildGoalDoc`／`buildGoalVsActualDoc`／`buildGoalExpiringDoc`／`goalReceiptDoc` 签名与导出数不变；
`tailOf` 是本件私有函数，少一个入参）。取数口径一行不动：三条读键仍吃 `read.ts` 现算的视图与 `metrics`，
五条写键仍逐格读库。测试新件只走 CLI 真出口 ＋ 只读源码注记，不新增共用件、不跨能力引用。

## 三、超线报警（第四步）

当场实测（LF 口径，节点口径 `readFileSync(f,'utf8').split('\n').length - 1`）：`src/goal/resultDocs.ts` 改前 270 → 改后 **269**
（撤 4 处来源脚注代码 −4，件头补 #561 注记 ＋3）；`src/goal/receipt.ts` 改前 236 → 改后 **238**（撤 1 行脚注 −1，件头补 #561 注记 ＋3）。
两件均远在告警线 350 以内，不触发「已超线，需要根据规则进行重构。」；台账（`packages/skill-calorie/AGENTS.md`）无这两件，无需同步。

## 四、改前读数（25 条唤醒词逐件点名，2026-09-15 实跑）

读法（探针 `.scratch/t561/probe.mjs`，产物 `.scratch/t561/25-run.md` ＋ `25-run.json` ＋ `out/*.html`）：
临时库 `mkdtemp` ＋ `SKILLS_DB_PATH` 指向它 ＋ `seedFull()` ＋ `CALORIE_TODAY=SEED_TODAY`（`2026-09-07`），
逐条跑 `src/triggers/scene-06-goal.ts` 的 `main_prompt.cli`（词表里 `<日期>` 占位符按 `docs/research/t81-seed.mjs`
的替换表换成 `2026-09-06`）；「屏上可见文本」＝ `test/visible-text-probe.mjs` 的 `visibleText(stripCopyPayload(html))`。

- 实跑合计：25 条 **exit 0／25**（写类命令写各自那份临时库），产物完整文档四断言 25/25 全真。
- **屏上仍印 `数据来源` 的 14 件**（改前）：
  - `receipt.ts`（`calorie.goal.set`／`.water`／`.weight`／`.pause`／`.resume` 五键、10 条写词各 1 件）：
    #1 定营养目标 86262 字节、#3 定体重目标 84865、#4 定体重目标(自动算截止) 85269、#5 定体重目标(含起始日) 85942、
    #6 定饮水目标 84765、#19 改营养目标 85981、#20 改体重目标 84879、#21 改饮水目标 84813、#22 暂停所有目标 84993、
    #23 重启所有目标 84931 —— 命中串一律 `数据来源：本机目标库 ｜ 本次影响 N 行 ｜ 时间 …`。
  - `resultDocs.ts`（4 件）：#15 看目标完成度 73411 字节（`📊 数据来源：本机目标表与饮食记录，窗口 2026-09-01 至 2026-09-07。`）、
    #24 看目标历史完成 73405（同串、窗口 2026-08-09 至 2026-09-07）、#14 看目标对比实际 82733
    （`📊 数据来源：本机目标表与饮食记录，对比窗口 2026-08-09 至 2026-09-07，逐日表看最近 30 天。`）、
    #16 看即将到期的目标 70421（`📊 数据来源：本机目标表与体重目标。`）。
- **零命中的 11 件**：3 件预检页（#2／#7／#8，`view.goal-wizard`，75710／76078／76282 字节）、
  6 件目标进度页（#9／#10／#11／#13／#17／#18，`view.goal-progress`，场景 01 的件）、
  1 件体重目标页（#12，68703）、1 件目标预测页（#25，67560）。
- 计数与票面的对账：票面写「12 结果页＋10 回执页＋11 预检页」，实跑是 **12 结果页 ＋ 10 回执页 ＋ 3 预检页 = 25 件**——
  预检页那一件命令（`calorie.view.goal-wizard`）在本场景 25 条词里只被 3 条自动算词唤醒；「11 条写词」是这条命令
  服务的写词总数（见 `precheck.ts` 件头），不是本场景的唤醒条数。以实跑为准，读数按 25 件记。
- 复制载荷（`data-t` 段）里的来源改前就在：10 件回执页载荷含 `calorie_data.db ｜ daily_goal (写库回执)`；
  4 件结果页载荷含 `calorie_data.db ｜ 目标表与饮食记录`（到期页是 `目标表与体重目标`）；3 件预检页载荷含
  `calorie_data.db ｜ daily_goal ＋ user_profile ＋ weight_log`。

## 五、改动明细

- `src/goal/resultDocs.ts`：`tailOf()` 少一个 `footer` 入参、函数体撤 `+ renderCaliberLine(footer)`；
  3 个调用点各撤一行 footer 实参（`view.goal`／`view.goal-vs-actual`／`view.goal-expiring`）；
  件头「八样」里那一行补 #561 注记 ＋ `tailOf` 注释改「三条共用尾巴」。取数、`metrics`、
  `copyBlockOf` 的 `source`（复制日志第 3 段）一字未动。
- `src/goal/receipt.ts`：回执内容数组末行 `renderCaliberLine('数据来源：本机目标库 ｜ 本次影响 … ｜ 时间 …')` 整行撤；
  件头块序那句补 #561 注记。`renderCaliberLine` import 留（同件另有两条口径行仍在用：字段变更块、库里现在的目标块）；
  屏上原脚注里那两条附带事实不丢：影响行数另有 KPI 卡「影响行数 N 行」承载，时间在复制日志第 5 段。
- `test/t561-goal-no-source.test.mjs`（新建）：四组判据共用同一批 25 件真跑产物；词表从
  `src/triggers/scene-06-goal.ts` 逐行解析（不另抄一份会走散的名单）。
- 未改既有测试（票面「不许改既有测试去迁就实现」）：`goal-result-254`／`goal-receipt-253`／`goal-wizard-251`／
  `t467-goal-progress` 等一件未动。

## 六、机器读数（`GATE-RUN` 行抄自 `.scratch/locks/gate-runs.log`；长输出落 `.scratch/t561/`，只看尾 5 行）

- 编译：`GATE-RUN runId=c1e45867-f006-44a4-be41-75166976c2d2 cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=0 exit=0`
  - 摘要行：`RESULT: ticket=561 runId=c1e45867-f006-44a4-be41-75166976c2d2 waitedMs=0 exit=0`；
    `packages/skill-calorie/tsconfig.tsbuildinfo` mtime 22:39:59 → **22:40:51**（真跑过：非空转）。
- 验收用例：`GATE-RUN runId=b4b045e5-8ab2-4317-995f-dca75e9bd365 cmd="node --test packages/skill-calorie/test/t561-goal-no-source.test.mjs" waitedMs=0 exit=0`
  - 摘要行：`ℹ tests 4 ／ ℹ pass 4 ／ ℹ fail 0`；用例内自证行 `T561-MUT 结果页改坏红=1 还原绿=1；回执页改坏红=1 还原绿=1`。
- 25 条词探针（复审用，非票面验收命令）：`T561-PROBE rows=25 exit0=25/25 屏上有脚注=0 载荷有来源=18`。
- 判据逐条对账：① 25 件屏上可见文本 `数据来源` **0 命中**（原样 HTML 亦 0）；② 14 件被删脚注的页载荷来源仍在
  （10 件回执页含 `daily_goal`、4 件结果页含各自来源名，且同一串在屏上已消失）；③ 25/25 完整文档四断言
  （`<!doctype html>`／`charset="utf-8"`／`<style`／`ilife-page`）＋ 复制区与页内导航都在；④ 两轮真身变异见 §七。

## 七、变异自证（真身两轮，各两行机器读数；均在持锁窗口内改坏 → 编译 → 跑验收用例 → 逐字节还原 → 再编译 → 再跑）

- 轮 1（把 `resultDocs.ts::tailOf` 那行脚注加回，4 件结果页）：
  `GATE-RUN runId=94018867-56a4-47df-b757-9dccba65f657 cmd="node .scratch/t561/mutate.mjs resultDocs" waitedMs=250209 exit=0`
  - 改坏：`tscExit=0 testExit=1 tests=4 pass=1 fail=3`，fail 行
    `AssertionError: 「看目标对比实际」`calorie.view.goal-vs-actual` 屏上还有来源脚注：📊 数据来源：本机目标表与饮食记录，窗口变异自证。`
  - 还原：`tscExit=0 testExit=0 tests=4 pass=4 fail=0`，`RESTORED-BYTE-IDENTICAL ok sha=7734e81e84e585a6`。
- 轮 2（把 `receipt.ts` 回执内容末尾那行脚注加回，10 件回执页）：
  `GATE-RUN runId=4a2d20e3-204c-4c48-a6e6-84f8aa8e0fe2 cmd="node .scratch/t561/mutate.mjs receipt" waitedMs=0 exit=0`
  - 改坏：`tscExit=0 testExit=1 tests=4 pass=1 fail=3`，fail 行
    `AssertionError: 「定营养目标」`calorie.goal.set` 屏上还有来源脚注：数据来源：本机目标库`
    ＋`AssertionError: 「定营养目标」屏上还印着回执脚注里的来源名 `本机目标库``。
  - 还原：`tscExit=0 testExit=0 tests=4 pass=4 fail=0`，`RESTORED-BYTE-IDENTICAL ok sha=7b099260195f7e35`。
- 收尾对账：两轮还原后 `git status --short` 只剩本票声明的四个路径（两源码件 ＋ 新测试件 ＋ 本证据件），
  无残留改坏态；`git diff -- packages/skill-calorie/src/goal` 只有本票那几处（见 §五）。

## 八、结构与形状

- LF：两件均未越线（见 §三）；包内台账（`packages/skill-calorie/AGENTS.md`）无这两件的行，无需同步。
- 版式形状未动：页内导航／复制区／KPI 卡／表全在（§六 判据 ③ 逐条断言）；本票只少一行小字脚注，
  窄屏与 390 的横滑判据不受影响（行宽只减不增）。真浏览器量尺终审按票面归负责人肉眼。

## 九、遗留出口（未做项与下一手）

- 场景 01 的 `calorie.view.goal-progress`（`src/home/goalProgressDocs.ts`）不属本票（#467／#560 的地盘），
  实跑读数一并记在 §四（6 件零命中）。
- 别家能力目录的页（`src/render/trendDocs.ts` 的 `goal-predict` 等）实跑零命中，**无需转票**；
  若后续另有页面新印来源脚注，按用户裁决在同一波「来源脚注删」的后续票里收。
- 视觉终审（真浏览器量尺、肉眼逐页）不在实施者票面内，留负责人。

## §六 补提交（接手席）

> 题名照派单逐字（「§六 补提交（接手席）」）；上文 §一～§九 是第一席已写的段落，一字未改，
> 本节只追加在文档末尾。编号与上文 §六「机器读数」重号，以本节标题末的「补提交（接手席）」为准。

第一席中途死掉，实现那一半留在工作区未提交；本席按协议 §3.2 第 4 条接手：先量现场 → 复核 diff 合票面 → 跑门 → 限定路径提交（保持非受益者身份，未替它兜任何东西）。

### 六.1 接手时量到的现场读数

- `git status --porcelain packages/skill-calorie/src/goal`（接手当刻）：两条 ` M`——`src/goal/receipt.ts`、`src/goal/resultDocs.ts`。
- `git diff --stat packages/skill-calorie/src/goal`（接手当刻）：
  `2 files changed, 14 insertions(+), 13 deletions(-)`（分件 `receipt.ts` 8 ＋＋/−−、`resultDocs.ts` 19 行）——
  **与派单给的读数逐字相符**。
- `git log --oneline -1 cdf229a`：测试件 `test/t561-goal-no-source.test.mjs` 与证据件本件已入库（第一席那一半）；
  接手当刻这两件在盘上、工作区干净。
- 逐处读完 diff 后的判定：**改动只有两类，无一处越出票面**——
  1. 撤屏上来源脚注：`receipt.ts` 内容数组末行 `renderCaliberLine('数据来源：本机目标库 ｜ 本次影响 … ｜ 时间 …')` 整行删；
     `resultDocs.ts` 的 `tailOf()` 少一个 `footer` 入参、函数体撤 `+ renderCaliberLine(footer)`、3 个调用点各撤一行 footer 实参
     （`view.goal`／`view.goal-vs-actual`／`view.goal-expiring`）。
  2. 两件头各补 #561 用户裁决注记（`receipt.ts` 块序段、`resultDocs.ts`「八样」段）。
  **取数、文案、键名、入参名、退出码零处改动**（无一处「顺手改了别的」）。
- **复制载荷里的来源一字未动**（正证没删错地方）：
  - `receipt.ts:215-218` → `copyLog({ command, source: receipt.meta.source, m5Line: …, actionAt: …, version: … })` 原样；
  - `resultDocs.ts:69-71` → `copyLog({ command, source: DB_FILENAME + ' ｜ ' + source, … })` 原样，
    `tailOf` 仍把 `source` 传给 `copyBlockOf`（`resultDocs.ts:79`）。
- 判据：diff 与票面相符 ⇒ 继续跑门（无「停手上报」事由）。

### 六.2 提交

- 提交：`9c6710b`（全 `9c6710befa70407e540ae3c8e3417f1b5d9a7a18`），
  `功能(561): 目标域屏上来源脚注删除（接手席补提交：resultDocs.ts 的 tailOf 尾巴 ＋ receipt.ts 回执末行；复制载荷来源一字未动）`。
- `git show --stat` 读数：`2 files changed, 14 insertions(+), 13 deletions(-)`；
  `git show --pretty=format: --name-only HEAD` 只有 `packages/skill-calorie/src/goal/receipt.ts` 与
  `packages/skill-calorie/src/goal/resultDocs.ts` 两条——**别席的在途件一件都没进**。
- 提交形态照铁律 5：路径全限定的 `git commit -m "…" -- <两路径>`（不是 `-a`、不是 `-A`）。
- 并发现场如实记：另有一席当时在 `src/weight/**` 作业。本席 `git add`（runId `2b84c72d-fc35-4454-b224-00dd698de08c`）
  只点本票两路径；紧接着读 `git diff --cached --name-only` 时，暂存区一度并列出现别席的
  `packages/skill-calorie/src/weight/history.ts` 与 `packages/skill-calorie/test/weight-history-333.test.mjs`
  （别席并发 `git add` 所致，非本席所为），到提交前复核时它们已不在暂存区，**本席未碰、未撤、未提交它们**；
  且本席一律用路径限定的 `git commit -- <两路径>`，即便它们仍在暂存区也不会被带进本提交。
- 提交后 `git status --porcelain packages/skill-calorie/src/goal` 无输出（本票两件已清）。

### 六.3 跑门读数（均为持锁窗口内，`GATE-RUN` 行抄自 `.scratch/locks/gate-runs.log`）

- 编译：`GATE-RUN runId=fcf42509-237d-44f5-9c7b-32f4fb7a928b cmd="node node_modules/typescript/bin/tsc -b packages/skill-calorie" waitedMs=10012 exit=0`
  - 摘要行：`RESULT: ticket=561C runId=fcf42509-237d-44f5-9c7b-32f4fb7a928b waitedMs=10012 exit=0`。
- 验收用例：`GATE-RUN runId=6f03d9fd-469d-4c33-898b-7726a891f6c9 cmd="node --test packages/skill-calorie/test/t561-goal-no-source.test.mjs" waitedMs=30027 exit=0`
  - 摘要行：`ℹ tests 4 ／ ℹ pass 4 ／ ℹ fail 0`（`cancelled 0`／`skipped 0`／`todo 0`）；
  - 用例内自证行：`T561-MUT 结果页改坏红=1 还原绿=1；回执页改坏红=1 还原绿=1`；
  - 长输出落 `.scratch/t561c/gate-build.txt`／`gate-test.txt`。
- 目标域自己那 14 件专跑（票面第二判据，非票面验收命令）：`GATE-RUN runId=d8a991c9-f691-4989-8230-9762c35b025a cmd="node .scratch/t561c/probe-14.mjs" waitedMs=0 exit=0`
  - `T561C-PROBE 目标域 14 件＝结果页 4 ＋ 回执页 10`
  - `T561C-PROBE 屏上可见文本 \`数据来源\` 命中件数 = 0 / 14`
  - `T561C-PROBE 复制载荷来源仍在件数 = 14 / 14`
  - `T561C-PROBE 逐件 exit 非 0 =`（空，25 条里这 14 件逐条 exit 0）
  - 判据对账：屏上零命中 **0/14** ✅；复制载荷来源仍在 **14/14** ✅。探针与长输出落 `.scratch/t561c/probe-14.mjs`／`probe-14.txt`。

### 六.4 本席写集与未做项

- 写集（4 处，全在派单内）：`src/goal/receipt.ts`（只提交，未再加料）、`src/goal/resultDocs.ts`（同上）、
  本证据件末尾本节（只追加）、`.scratch/t561c/`（日志与探针，不入库）。
- 未改：测试件、上文 §一～§九 任一已写段落、`src/goal/` 之外的任何源件、唤醒词名／命令键名／参数名／退出码／取数口径。
- 未做：`git push`（票面禁）；真浏览器量尺与肉眼终审仍留负责人（同 §九）；本席未做第二轮变异（第一席 §七 已做两轮真身变异，本席只复跑验收用例与专跑探针）。
- 本节自身的提交归属如实记（同仓多席并发，留痕备查）：本席 `git add` 本件（runId `c58a6ea4-e56c-4f2e-b13f-75d30ff4317d`）后，
  另一席（#560）并发跑了一次**未限定路径**的 `git commit`，把当时暂存区里本席这一件一并带走——本节的 64 行插入落在别席那条提交
  `86dd890`（`修复(560): 体重页去屏上来源脚注 + log.ts/判据全绿`）里，不是本席署名的提交；本席随后那条路径限定提交因此报
  `no changes added to commit`（exit 1）。**内容已入 HEAD 且逐字无误（`git show HEAD:…` 复核本节在册）**；
  按铁律本席不做 rebase／amend／reset 等改写，故不再另立提交，如实在此留痕。
