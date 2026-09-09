# #89 审查席 2（蓝队 · 静态/结构面＋门禁）· 审查报告

> 被审：票 **#89《视觉锁 B1 逐值验收》**，实施 `docs/research/t89-visual-lock.md`（`8e851cb`：PASS 15／N-A 3／未达 1／FAIL 1）
> ＋ 返修 R-9（`843d60b`：H-06 正文栈＋H-10 8px，`help-visual-lock-89.test.mjs` 4 条回归断言，新 HELP 产物 1,264,952 B／sha `0743519a…`）。
> 本席方法：14 条静态项全部**自己持锁重跑**（static＋shots 双探针），H-06/H-10 diff 逐行核＋回归 4 条自跑＋**2 支自设变异**，
> 区块 ≥6 自跑，快照双 check 自跑，`pnpm test` 全量自跑＋失败集对账。
> 取证目录（gitignored，不入库）：`.scratch/t89-blue/{S,shots,blocks,I,pnpm-test.log}`。
> **verdict：PASS**。五维：静态复算 100／返修正确性 100／返修最小性 95／区块口径 100／门禁与证据诚实 95。

## 0. 纪律自检

- 持锁 `--ticket 89` 全程（GATE-RUN 见 §5）；禁全量 `t81-exec-smoke.mjs`（未跑）；变异即还原＋sha 自证（§4）；
  未改产品代码／冻结尺／他人文件（§2）；只新增本报告（`commit --only`，不 push，不关票）。
- 自检 `packages/skill-calorie/SKILL.md` 首 3 字节 `2d 2d 2d`（`---`）非零 ✓。
- 工作树现状：`M .gitignore`（＋`.tmp-*/`，他席预存改动，非本席非 #89，本席零触碰，见 S3-2）；
  `packages/base-render/src/style.ts` 变异后已还原，sha 与返修态逐字节一致（§4）。

## 1. 14 条静态项独立复算（H-01…H-11／H-15／H-17／H-18）

静态探针 runId `9e543994`（26/27，唯一红 H-17.1＝N-A 项意向内）＋浏览器 shots 探针 runId `d0f656ea`（**36/36**）
＋交互探针 runId `70ee5e7a`（21/21，覆盖 H-12/H-16/H-19/H-20 的交互侧证）。逐条 verdict（与实施席逐条比对，**零不符**）：

| 条 | 本席 verdict | 实测值（本席自跑） | 证据路径（`.scratch/t89-blue/` 下） | 复算命令（仓根，持锁） |
|---|---|---|---|---|
| H-01 | PASS | 禁色 `[]`；`--blue:#007aff` 逐字；computed 根/壳 `#007aff` | `S/probe-static.json`＋`shots/H-01/{viewport,element}.png` | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs --out <dir>`；shots 同理换 `t89-probe-shots.mjs` |
| H-02 | PASS | token 7/7；h1/卡标题 `rgb(29,29,31)`；副标题/命令 `rgb(110,110,115)`；fg3 仅 ≤13px 3 类 | `S/probe-static.json`＋`shots/H-02/*` | 同上 |
| H-03 | PASS | `--bg:#f5f5f7`≠`--card:#ffffff`；卡面 `rgb(255,255,255)` | `S/probe-static.json`＋`shots/H-03/*` | 同上 |
| H-04 | PASS | `gradHelp:0`／`gradAll:1`（charts 冻结资产例外） | `S/probe-static.json`＋`shots/H-04/element.png` | 同上（须同时打印 gradHelp 与 gradAll） |
| H-05 | PASS | max 32（D-9 无 48px 档）；h2 17/600；正文 15；提示 12/13；h1 32/700 | `S/probe-static.json`＋`shots/H-05/element.png` | 同上 |
| H-06 | PASS（返修后） | 壳 computed 首位 `"SF Pro Display"` 全栈；等宽 `"SF Mono",monospace`，Consolas=0；`body` 仍 `"Noto Sans SC"`（T22 设计） | `S/probe-static.json`(sfPro=1)＋`shots/`H-06.1/.2 双绿 | 同上；细则见 §4 |
| H-07 | PASS | CSS `tnum` 命中 2；computed 壳/计数/徽章/卡标题全 `"tnum"` | `S/probe-static.json`＋`shots/H-07/element.png` | 同上 |
| H-08 | PASS | h1/h2 共 4，emoji 0；h1=`唤醒词速查台` | `S/probe-static.json`＋`shots/H-08/element.png` | 同上 |
| H-09 | PASS | CSS 逐字 `960px`＋`32px 20px 80px`；1440 computed 同值；留白 209/209（±2 内居中） | `S/probe-static.json`＋`shots/H-09/element.png` | 同上 |
| H-10 | PASS（返修后） | HELP 区 `cssBad:[]`（radiiHelp=[14,999,8,20,50%]）；computed badCount=0；charts 2px 已除外 | `S/probe-static.json`(badRadiiHelp=[])＋`shots/`H-10.1/.2 双绿 | 同上；细则见 §4 |
| H-11 | PASS | 首行 `border-top:0`、后续 `1px solid rgb(210,210,215)`；`:first-child` 规则 2 | `S/probe-static.json`＋`shots/H-11/element.png` | 同上 |
| H-15 | PASS | `<pre>` 439；12px／行高比 1.55／pre-wrap／auto／8px 全绿 | `S/probe-static.json`＋`shots/H-15/element.png` | 同上 |
| H-17 | N-A | HELP 页 `<table>`=0（static H-17.1 红＝意向内；shots H-17 N-A）；转 B-03 全绿（§3） | `blocks/B-03/viewport.png` | blocks 命令（§3） |
| H-18 | PASS | 白底／20px／1px／居中；48/20；图标 40px／.5；标题 17/600；说明 13px `#86868b` | `shots/H-18/*`（.1/.2/.3/.4 全绿） | shots 命令 |

20 条总分布：**PASS 17／N-A 3（H-13／H-14／H-17）／FAIL 0／未达 0**（H-12/H-16/H-19/H-20 交互侧本席 21/21 全绿佐证实现结论；
H-13/H-14 N-A 复核见 §6）。与实施席（返修后）主张逐条一致，**零不符**。

## 2. H-06／H-10 返修复核（diff 最小性＋零越界）

- 改动面（`git show 843d60b --stat` 复核）：仅 3 件——`packages/base-render/src/style.ts`（＋10−1）＋
  `packages/base-render/test/help-visual-lock-89.test.mjs`（新，92 行）＋`docs/research/t89-recheck-h06-h10.md`。
  `packages/base-render/src/spec/` 工作树 clean（`git status` 空），**冻结尺零触碰** ✓。
- helpShell 区最小改动 ✓：hunk1 局部常量 `BODY_FONT_STACK`（`style.ts:94`，注释明示非 token）；
  hunk2 壳基座 `+1` 行 `font-family`（`style.ts:527`，`body` 规则未产，T22 合规）；
  hunk3 `card-mark` `4px`→`8px`（`style.ts:955`）。无他区改动。
- 无 token 新增 ✓：`:root` 实测仍 **11 个**（`--fg,--fg2,--fg3,--bg,--card,--line,--blue,--blue2,--soft,--ok,--shadow`）；
  `BODY_FONT_STACK` 命中恰 2（定义＋引用）；栈值无 `--` 由回归 H-06-①断言钉死并绿。
- 等宽栈不动 ✓：`SF Mono` 声明恰 4 处逐字 `"SF Mono", monospace`，`Consolas` 0 命中（回归 H-06-②绿）。
- 回归 4 条自跑：runId `68390555` **4/4 绿**（还原后复跑再绿，§4）。
- 新 HELP 产物 sha 自证（本席重生成 runId `0d1cfc55`）：**1,264,952 B**／
  `sha256=0743519a470975f6abf5ced73457b79a0f874f847d3f7b2290eee3077e09a913`——与 R-9 §6 逐字一致 ✓。

## 3. 内容页区块级（≥6 个，命名空间／必需属性／状态；「不做 DOM 同构」遵守确认）

blocks 探针 runId `8458b34c`：**39/39 PASS**。本席抽 9 个区块（超 ≥6 要求）：

| 区块 | 断言面 | 本席实测锚点 |
|---|---|---|
| B-02 KPI（承 H-13） | 命名空间＋四槽＋状态降级 | value-row 并入 unit 文本；非法 status→empty；computed 四槽＋tnum |
| B-03 表格（承 H-17） | 必需属性＋数值 | table/thead/th/td＝2/2/15/51；th 大写/透明/1px/12px/600；td 12–14px；末行 0px；表在卡内 |
| B-04 图表（承 H-14） | 命名空间＋状态 | canvas=0；viewBox 四值；8 kind＋empty=true＋非法抛 ChartError |
| B-06 指令块 | 必需属性＋数值 | 真 `<pre>`；data-action-id＝data-t；computed 六项 |
| B-08 折叠区 | 状态 | details/summary 各 5；复制后 80ms 内 open 不变 |
| B-09 表单 | 命名空间＋必需属性 | 15 字段 name＋placeholder 齐 |
| B-10 空态 | 命名空间＋数值 | renderEmptyState 四件套；computed 七项 |
| B-11 复制区 | 必需属性＋状态 | 双属性分工；空文本 ok:false＋零端口调用 |
| B-12 反馈区 | 命名空间＋状态 | role=status／aria-live=polite；运行时单 toast |

口径遵守：探针头注释明示「**不锚 DOM 同构**：只锚命名空间＋必需属性＋状态取值＋数值规格」
（`t89-probe-blocks.mjs:9,97`）；本席 grep 确认无 `outerHTML`／`innerHTML` 全量比对——**口径被遵守** ✓。

## 4. 自设变异（2 支，变异即还原＋sha 自证）

| 支 | 变异动作 | 实测（须红） | 还原自证 |
|---|---|---|---|
| MUT-H10 | `card-mark` `8px`→`4px`（build runId `5d04782b`） | 回归 runId `28c7e800`：**H-10 双红／H-06 双绿**（意向红 ✓） | 即时还原 |
| MUT-H06 | 摘壳基座正文栈行（build runId `e0f142e2`） | 回归：**H-06 双红／H-10 双绿**（意向红 ✓；第二条红系 `SF Pro Display` 零命中连带，机理吻合） | 即时还原 |

还原后：`style.ts` sha256=`a0f7e7f3a58741f9ab824fa73234cde9114114864e821b01371aae266554303c`
＝变异前实测值＝R-9 报告值，三方一致；`git diff --stat` 仅剩预存 `.gitignore` 改动；
重建（runId `504b76fa`）＋回归复跑 **4/4 绿**。**RED-THEN-GREEN OK，无残留。**

## 5. 门禁表（本席持锁自跑）＋ canonical＋快照双 check

| 门 | 命令 | runId／输出 | 结论 |
|---|---|---|---|
| build | `pnpm build` | `6fc9e416` exit 0（`tsc -b`） | 绿 |
| boundaries | `node tooling/check-boundaries.mjs` | `fd351fae` `boundaries: PASS` | 绿 |
| snapshot:check | `node tooling/write-snapshot.mjs --check` | `d70d7b8c` `0.1.0@932e7b250d278d50` 不变 | 绿 |
| snapshot:html:check | `node tooling/skill-html-snapshot.mjs --check` | `cd91b569` `artifacts=185 changed=0` | 绿 |
| pnpm test | 全量（`.scratch/t89-blue/pnpm-test.log`） | tests 1149／pass 1124／**fail 25** | 见下 |

- 失败集对账：`node docs/research/t101-fail-set.mjs docs/research/t88-baseline/test-failset.txt .scratch/t89-blue/pnpm-test.log`
  → **base=34 after=29，新增=0，消失=5**（5 条基线项自愈：#41 M3／#76／#80／FX-76-2／check-combos；自愈方向无害）。
  25 条失败面抽查：无 `style`／`visual`／`H-0`／`H-1`／`help-visual-lock-89` 项；
  命中 `help` 字样的仅基线白名单内 envelope 空库契约项（#48／#50），非新增。**新增 0 达标** ✓。
- 快照判定：双 check 在新 CSS 下**仍绿** → 判定为「**改动未越界**」（快照面不含 HELP CSS 字节／产物 sha；
  若快照含 HELP 产物字节则应红——此处绿与 R-9 双绿一致，机理吻合；旧 sha 硬编码行的跟进见 S3-1）。
- 对账命令：`node tooling/check-gate-audit.mjs --evidence docs/research/t89-review-blue.md --ticket 89 --since 2026-09-09T20:07:00Z --allow-nonzero --allow-undeclared`
- GATE-RUN runId=68390555-f639-4b67-ac8d-4e0aaedada40 cmd="node --test packages/base-render/test/help-visual-lock-89.test.mjs"
- GATE-RUN runId=9e543994-992b-4923-bf9b-5124aadc3a48 cmd="node docs/research/t89-probe-help-static.mjs --out .scratch/t89-blue/S"
- GATE-RUN runId=d0f656ea-c0b6-453c-92de-82096f3620d7 cmd="node docs/research/t89-probe-shots.mjs --out .scratch/t89-blue/shots"
- GATE-RUN runId=8458b34c-4735-41c8-9b63-aaacb9495c74 cmd="node docs/research/t89-probe-blocks.mjs --out .scratch/t89-blue/blocks"
- GATE-RUN runId=70ee5e7a-a4eb-4a6d-832b-dfdbbe5af3e2 cmd="node docs/research/t89-probe-help-interactive.mjs --out .scratch/t89-blue/I"
- GATE-RUN runId=5d04782b-8942-4e02-bfc4-e5f8fa8ec408 cmd="pnpm build"
- GATE-RUN runId=28c7e800-950a-4120-8057-199dbde710d7 cmd="node --test packages/base-render/test/help-visual-lock-89.test.mjs"
- GATE-RUN runId=e0f142e2-ef7c-452d-afea-79a508c5ce14 cmd="pnpm build"
- GATE-RUN runId=504b76fa-9423-408e-9c88-a90a9bb53d15 cmd="pnpm build"
- GATE-RUN runId=6fc9e416-3826-49b8-8963-bdde2093e974 cmd="pnpm build"
- GATE-RUN runId=fd351fae-c574-4a3c-81e5-c382f2cfaeb2 cmd="node tooling/check-boundaries.mjs"
- GATE-RUN runId=d70d7b8c-d2ad-4414-9cca-f5108641bf50 cmd="node tooling/write-snapshot.mjs --check"
- GATE-RUN runId=cd91b569-e76a-4918-ab7e-791ad4365b4a cmd="node tooling/skill-html-snapshot.mjs --check"
- GATE-RUN runId=0d1cfc55-7681-4e7e-9acb-9dfbfc1d8e29 cmd="node .scratch/t89/cmdA.mjs"
- GATE-RELAX flag=--allow-nonzero reason=static H-17.1 N-A 红／MUT-H10 与 MUT-H06 意向红／pnpm test flop 集 exit1，无一冒领为 pass
- GATE-RELAX flag=--allow-undeclared reason=共享门禁日志下他席并行条目及本席 3 次未留 runId 的直跑（MUT-H06 红复跑／还原绿复跑／pnpm test 全量，结论以输出文件为准）非声明证据
- 对账结果：`gate-audit: PASS（matched=14/14，scoped=25，undeclared=11；auditEntries=1047）`。

## 6. N-A 复核（H-13／H-14／H-17，理由是否成立）

- H-13：HELP 页 `.kpi`＝0（static `kpiHits:0`；shots `domCounts.kpi:0`）＋尺 `visual-spec-help.md:171` 明定 HELP 页不判转 B-02
  ＋ B-02 39/39 内全绿 → **N/A 成立** ✓。
- H-14：HELP 页 `<svg>`=0／`<circle>`=0（static＋shots 双源）＋尺 `:180` 明定转 B-04 ＋ B-04 全绿 → **N/A 成立** ✓。
- H-17：HELP 页 `<table>`=0（static H-17.1 红即此；shots N-A）＋尺 H-17 为 A 系新增表格能力（旧版 F1/F2 命中 0）
  ＋ B-03 全绿 → **N/A 成立** ✓（机判红≠verdict 红，口径与 R-9 一致）。

## 7. 缺陷清单（S1／S2／S3＋归属）

- **S1：无。** 14 条静态复算与实施席（返修后）零不符；H-06/H-10 修复机理与实测闭合。
- **S2：无。**
- **S3-1（归属 编排者／台账跟进，非 #89 缺陷，R-9 §7 已登记）**：产物 sha 变更（`f380ef68…`→`0743519a…`）后，
  旧 sha 硬编码引用行重跑即红（`t-help-parity-review-a-probe.mjs:173`、`t79-review-blue-probe.mjs:25`、
  `t-help-parity-ledger.md:41,306` 等；旧轮 `t89-evidence/536e8b9c-…` 为冻结历史永不改）。
  本席确认新 sha 可一命令再生（§2），跟进与否由编排者定夺，不扣分。
- **S3-2（归属 他席工作树现状，现状登记）**：`M .gitignore`（＋`.tmp-*/`）为本席到场前已存在改动，本席零触碰；
  `snapshot:html:check` 指纹 `78cc9778…` 在新 CSS 下不变，佐证快照面与 HELP CSS 解耦（见 §5 判定）。

## 8. 五维＋verdict＋整改清单

| 维 | 分 | 依据 |
|---|---|---|
| ① 静态逐值复算 | 100 | 14 条双探针自跑，零不符；shots 36/36＋static 26/27（唯一红＝N-A 项） |
| ② 返修正确性 | 100 | H-06 壳 computed 首位 SF Pro Display＋H-10 cssBad 空；回归 4/4；双变异 RED-THEN-GREEN |
| ③ 返修最小性 | 95 | helpShell 3 hunk／零 token／spec 零触碰；扣 5 分：常量注释未显式点名落点选择舍 `body` 的 T22 依据行号（内容对，索引可补） |
| ④ 区块口径 | 100 | 9 区块自跑全绿；不做 DOM 同构有字面口径＋实现对应 |
| ⑤ 门禁与证据诚实 | 95 | 四门＋失败集新增 0＋快照双绿＋产物 sha 三方一致；扣 5 分：2 次回归复跑 runId 未留痕（stderr 过滤所致，结论有输出为证） |

**verdict：PASS（返修验收通过，不关票）。** H-06 未达与 H-10 FAIL 均已按 D-22 规格修复并由本席独立复算闭合；
20 条 B1 无遗漏（PASS 17／N-A 3／FAIL 0／未达 0）；门禁四门全绿、失败集新增 0、快照双绿系改动未越界；
唯一 S3 为台账跟进事项（另行定夺）。关闭权归编排者。

整改清单（另行定夺，不阻塞本票）：T1 旧产物 sha 硬编码行跟进（S3-1，R-9 §7 清单）；
T2 无（门禁全绿，无新增失败）；T3 ③维索引补 T22 行号（nit，可顺手）。

## 9. 对账与交付核对

- 本席 GATE-RUN（`--ticket 89`）：`68390555`（回归 4/4）／`9e543994`（static 26/27）／`d0f656ea`（shots 36/36）／
  `8458b34c`（blocks 39/39）／`70ee5e7a`（interactive 21/21）／`5d04782b`＋`28c7e800`（MUT-H10 建＋红）／
  `e0f142e2`（MUT-H06 建＋红）／`504b76fa`（还原重建）／`6fc9e416`（build 门）／`fd351fae`（boundaries 门）／
  `d70d7b8c`（snapshot:check）／`cd91b569`（snapshot:html:check）／`0d1cfc55`（HELP 产物重生成）。
  exit≠0 者（static N-A 红／MUT 意向红／pnpm test flop 集）均为如实记录，非 pass 冒领。
- 本席交付：仅本报告（`commit --only docs/research/t89-review-blue.md`）；探针复用在仓探针（未改）＋取证落 `.scratch/t89-blue/`（不入库）；
  未改产品代码／冻结尺／他人文件；未 push；未关票。
