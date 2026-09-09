# #89 审查席 1（红队 · 交互/时序面＋返修复核）报告

- 被审：票 **#89《视觉锁 B1 逐值验收》**实施 `docs/research/t89-visual-lock.md`（`8e851cb`：15 PASS／3 N-A／1 未达／1 FAIL）＋ 返修 R-9（`843d60b`：H-06 正文栈＋H-10 4px→8px＋回归测试 4 条）
- 被验产物：`.scratch/t89/help-file.html`（**1,264,952 B，sha256=`0743519a470975f6abf5ced73457b79a0f874f847d3f7b2290eee3077e09a913`**，本席实测与 R-9 §6 逐字一致，旧 `f380ef68…` 确认作废）
- 浏览器：`Chrome/152.0.7977.83`（CDP 直连，零第三方；与实施/R-9 同版本）
- 本席证据根（不入库，只放 `.scratch/`）：`.scratch/t89-red/{S,I,shots,blocks}/`（`probe-*.json`＋`*.log`＋28 张 shots PNG＋`I/h12-{1440,640,400}.png`＋blocks 9 张）
- 本席纪律：全程持锁 `--ticket 89`；禁全量 `pnpm test`（只跑目标套件）；未改产品代码／冻结尺／他人文件；只新增本报告；`SKILL.md` 首 3 字节 `2d 2d 2d` 已自检；不 push；不关票

## 1. B1 20 条 verdict（本席独立实测，非采信实施席）

| 条 | verdict | 本席实测值 | 证据路径（证据根下） | 复算命令（仓根，持锁） |
|---|---|---|---|---|
| H-01 | PASS | 禁色`[]`；`--blue:#007aff`；computed 根/壳均为`#007aff` | `S/probe-static.json`(H-01)＋`shots/probe-shots.json`(H-01.1/.2)＋`shots/H-01/*.png` | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs --out <dir>`；shots 同理 |
| H-02 | PASS | token 7/7；h1/卡标题`rgb(29,29,31)`=fg，副标题/命令`rgb(110,110,115)`=fg2；fg3 仅落 ≤13px 3 类 | `S/probe-static.json`(H-02)＋`shots/probe-shots.json`(H-02.1/.2/.3) | 同上 |
| H-03 | PASS | `--bg:#f5f5f7`≠`--card:#ffffff`；卡面 computed `rgb(255,255,255)` | `S/probe-static.json`(H-03)＋`shots/probe-shots.json`(H-03.1) | 同上 |
| H-04 | PASS | `gradHelp:0`／`gradAll:1`／`gradCharts:1`（charts 例外） | `S/probe-static.json`(H-04)＋`shots/probe-shots.json`(H-04.1) | 同上 |
| H-05 | PASS | 无 ≥48px（max 32，档 11/12/13/15/17/32）；h2 17px/600×3；正文 15；提示 12/13；h1 32px/700∈[28,32] | `S/probe-static.json`(H-05)＋`shots/probe-shots.json`(H-05.1/.2/.3) | 同上 |
| H-06 | PASS（返修前未达→已修复） | CSS `sfPro=1`；computed **shell 首位即`"SF Pro Display"`**（全栈逐字与 R-9 §3 一致）；lead 继承同值；等宽 `pre="SF Mono", monospace`，Consolas=0；body 仍`"Noto Sans SC"`（T22 禁 body 规则，by design，见备注 N-1） | `S/probe-static.json`(H-06)＋`shots/probe-shots.json`(H-06.1/.2)＋回归 4/4 | S＋shots 命令＋`node tooling/run-locked.mjs --ticket 89 -- node --test packages/base-render/test/help-visual-lock-89.test.mjs` |
| H-07 | PASS | CSS tnum 命中 2；computed 壳/计数/徽章/卡标题均为`"tnum"` | `S/probe-static.json`(H-07)＋`shots/probe-shots.json`(H-07.1) | S＋shots 命令 |
| H-08 | PASS | h1/h2 共 4 个，emoji 0；h1=`唤醒词速查台` | `S/probe-static.json`(H-08)＋`shots/probe-shots.json`(H-08.1) | 同上 |
| H-09 | PASS | CSS 逐字`max-width:960px`＋`padding:32px 20px 80px`；1440 computed 32/20/20/80＋960px；居中留白 209/209（差 0） | `S/probe-static.json`(H-09)＋`shots/probe-shots.json`(H-09.1/.2) | 同上 |
| H-10 | PASS（返修前 FAIL→已修复） | HELP 区 `cssBad:[]`（全集 {14,999,8,20,50%}）；`card-mark` 逐字 `8px`；HELP 区 `4px` 0 残留；computed 抽样 badCount=0 | `S/probe-static.json`(H-10)＋`shots/probe-shots.json`(H-10.1/.2)＋回归 4/4 | S＋shots＋回归命令 |
| H-11 | PASS | 首行 `border-top:0px`＋后续 `1px solid rgb(210,210,215)`；`:first-child` 规则 2 | `S/probe-static.json`(H-11)＋`shots/probe-shots.json`(H-11.1) | S＋shots 命令 |
| H-12 | PASS（本席交互自采） | 静态 m640:1／m400:1（m720:1／m820:2 并存）；三档 computed：1440→32/20/20/80＋960px＋grid 2 列，640/400→20/16/16/60＋grid 1 列；400px toast 栈 left/right=12px | `I/probe-interactive.json`(H12)＋`I/h12-{1440,640,400}.png`＋`shots/probe-shots.json`(H-12.1/.2/.3) | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-interactive.mjs --out <dir>` |
| H-13 | N-A | HELP 页 `.kpi`=0（shots domCounts）；承接 B-02 全绿（§4） | `shots/probe-shots.json`(domCounts)＋`blocks/probe-blocks.json`(B-02.1–.5) | blocks 命令（见 H-13 原行） |
| H-14 | N-A | HELP 页 `<svg>`=0；承接 B-04 全绿（§4） | 同上（B-04.1–.4） | 同上 |
| H-15 | PASS | `<pre>` 439 个；computed 等宽栈／12px／行高比 1.55／pre-wrap／overflow-x:auto／圆角 8px 全满足 | `S/probe-static.json`(H-15)＋`shots/probe-shots.json`(H-15.1/.2) | S＋shots 命令 |
| H-16 | PASS（本席交互自采） | 真手势命中；copied 存活 **obs 458.9ms／poll 463.4ms**∈[440,520]；剪贴板归一后逐字等长 82（含 CRLF）；复原无残留；toast 恰 1 枚存活 **obs 4511ms／poll 4500ms**≈冻结 4500；抽 40 卡每卡 1 按钮；无「复制全部」 | `I/probe-interactive.json`(H16)＋`shots/probe-shots.json`(H-16.1/.2)＋`shots/H-16/{before,after}.png` | I 命令 |
| H-17 | N-A | HELP 页 `<table>`=0（静态 H-17.1 红即此，意向内）；承接 B-03 全绿（§4） | `S/probe-static.json`(H-17.1 FAIL 意向内)＋`blocks/probe-blocks.json`(B-03.1–.5) | S＋blocks 命令 |
| H-18 | PASS | 空态卡片外观（白底／20px／1px／居中）；padding 48/20；图标 40px／.5；标题 17px／600；说明 13px `rgb(134,134,139)` | `shots/probe-shots.json`(H-18.1–.4)＋`shots/H-18/*.png` | shots 命令 |
| H-19 | PASS（本席交互自采） | 几何 42×42／50%／fixed／right=bottom=24；scrollY=0 时 opacity 0＋pe none；401 时出现可点；点击 rAF **22 采样／20 不同值／单调降到 0** | `I/probe-interactive.json`(H19.trace)＋`shots/probe-shots.json`(H-19.1–.3)＋`shots/H-19/{before,after}.png` | I 命令 |
| H-20 | PASS（本席交互自采） | reduce 下复制/回顶过渡 0s、toast 动画 none；Tab 6 次 5 环（I）＋10 控件 10 环（shots）；首 Tab SUMMARY `:focus-visible`＋1px 环 | `I/probe-interactive.json`(H20)＋`shots/probe-shots.json`(H-20.1–.3)＋`shots/H-20/focus.png` | I＋shots 命令 |

verdict 分布：**PASS 17／N-A 3（H-13／H-14／H-17，转区块）／未达 0／FAIL 0**，合计 20/20 无遗漏。

**RESULT: 17/20 PASS, 3 N-A, 0 未达, 0 FAIL**

备注 N-1（非缺陷）：H-06 `body` computed 仍`"Noto Sans SC"`——T22 禁 `body{` 规则系既有红线，落点只取壳是 R-9 按方案原文「壳一半」的正确取舍，CJK 渲染不变；若未来 CJK 栈口径变化需重审（观察项，不记缺陷）。

## 2. H-06／H-10 返修复核结论：**双双确认已修复，无回归**

- diff 最小改动（`git diff 8e851cb 843d60b -- packages/base-render/src/style.ts`）：**3 hunk（＋10−1）**——hunk1 文件级新增局部常量 `BODY_FONT_STACK`（D-5 非 token）；hunk2 `.ilife-help-shell` 基座加 1 行 `font-family`；hunk3 `card-mark` 的 `4px`→`8px`＋注释。**无 token 新增**（`:root` 11 变量未动，静态复算 tokens 7/7＋`--blue` 逐字）；**等宽未动**（`SF Mono` 恰 4 处逐字＋Consolas 0）；**`spec/` 零触碰**（同区间 diff 为空）；commit 内仅 3 件（报告＋style.ts＋新测试），无他席文件。
- 回归测试：`help-visual-lock-89.test.mjs` **4/4 PASS**（GATE-RUN `a5800ceb`，exit 0）。
- 浏览器 computed 独立确认（本席新采，非引用 R-9）：H-06.2 shell 首位 `"SF Pro Display"`＋lead 继承（shots H-06.2 PASS）；H-10.1 `cssBad:[]`＋H-10.2 computed badCount=0（shots H-10 全 PASS；静态 H-10.1 `badRadiiHelp:[]`，全量唯一 `2px` 在 charts 区属 D-10 例外）。

## 3. 交互 4 条各自证据（本席真机自采，不采信实施席）

- H-12：静态断点 m640:1／m400:1；三档 computed（§1 表格）；`I/h12-{1440,640,400}.png` 三图存档；I 探针 H-12.1–.4 全 PASS。
- H-16：真手势（click 时间戳＋addLatency 14.4ms）；copied 双计时器 458.9/463.4ms∈[440,520]；剪贴板归一逐字等长 82；toast 双计时器 4511/4500ms≈4500（±20% 内）；onsets=1／maxNodes=1；40 卡零坏卡；copyAll=0。I 探针 H-16.1–.9 全 PASS。
- H-19：几何/隐现/阈值三态齐；点击后 rAF 22 采样单调降到 scrollY=0（distinct 20）。I 探针 H-19.1–.4 全 PASS。
- H-20：reduce 下三处归零/none；Tab 6 次 5 环（I，阈值 ≥2）＋10 控件 10 环（shots）；首 Tab SUMMARY `:focus-visible`＋1px 环＋`focus.png`。I 探针 H-20.1–.4 全 PASS。

## 4. 抽验 5 条静态 PASS＋N-A 3 条复核

- 抽验 H-01／H-05／H-09／H-15／H-18：shots computed 独立复算**全 PASS**（§1 实测值），返修未回归。另静态 26/27（唯一红 H-17.1＝N-A 意向内）、shots **36/36**、交互 **21/21**。
- N-A 复核成立：HELP 页 `.kpi`=0／`<svg>`=0／`<table>`=0（shots `domCounts`＋静态 H-13/H-14 N-A 标记＋H-17.1 红三方互证）；承接区块探针 **39/39 PASS**——B-02（四槽＋tnum，unit 并入 value 文本“肥肠面 1500 卡”）／B-03（table/thead/th/td=2/2/15/51，th 大写/透明/1px/12px/600，td 12–14px/1px/末行无边框，整表在卡内）／B-04（8 kind＋empty＋ChartError，canvas=0＋viewBox）返修后仍全绿，转承接有效。

## 5. 缺陷清单（S1／S2／S3＋归属）

| # | 级别 | 缺陷 | 归属 |
|---|---|---|---|
| D-R1 | S3（非阻塞） | 旧产物 `f380ef68…`／1,264,822 B 硬编码残留 7 处（R-9 §7 已自报：ledger×2、review-a/blue-probe 硬编码、旧证据冻结行、visual-lock/plan/partial 旧产物行、t79-base-contract 时点主张）——重跑即红，需跟进更新或标注历史冻结 | 编排者定夺（本席不碰他人文件） |

**S1／S2：0 条。**返修两条均按 D-22 规格修复且三重互证（CSS 文本＋computed＋回归断言）；20 条无新红；门禁无冒领。

## 6. 门禁（GATE-RUN＋check-gate-audit 对账）

本席 5 次持锁运行（`--ticket 89`）：

- GATE-RUN runId=a5800ceb-3522-4b2f-9955-d27022db1b9a cmd="node --test packages/base-render/test/help-visual-lock-89.test.mjs"
- GATE-RUN runId=536bc09f-04eb-4c6e-a2a8-ea780db071d4 cmd="node docs/research/t89-probe-help-static.mjs --out .scratch/t89-red/S"
- GATE-RUN runId=f542d70b-96b7-4183-a71d-9f3a71bcc3d4 cmd="node docs/research/t89-probe-help-interactive.mjs --out .scratch/t89-red/I"
- GATE-RUN runId=cdeec455-7c43-4563-991c-96a58fec17bd cmd="node docs/research/t89-probe-shots.mjs --out .scratch/t89-red/shots"
- GATE-RUN runId=43075053-8707-469a-a80b-c873b7d70236 cmd="node docs/research/t89-probe-blocks.mjs --out .scratch/t89-red/blocks"

- GATE-RELAX flag=--allow-nonzero reason=唯一非零是静态探针 26/27（H-17.1＝HELP 页无 table，verdict N-A，意向内缺口如实记录），无 pass 冒领
- GATE-RELAX flag=--allow-undeclared reason=共享门禁日志下他席（#79 等）并行持锁条目非本席执行、不得作本席证据（本席交互探针起锁时即遇活锁等待 30s 目击并发）

对账命令：`node tooling/check-gate-audit.mjs --evidence docs/research/t89-review-red.md --ticket 89 --since 2026-09-09T20:00:00Z --allow-nonzero --allow-undeclared`

## 7. 五维评分＋verdict＋整改清单

| 维 | 权重 | 得分 | 依据 |
|---|---|---|---|
| 契约一致 | 30 | 30 | H-06/H-10 均按 D-22＋§4 最小方案修复；冻结面（token/spec/等宽/charts 例外口径）零漂移 |
| 证据真实可复现 | 25 | 25 | 本席 5 探针全持锁自采；Chrome 同版本；产物 sha 与 R-9 逐字对上；双计时器/归一/CRLF 等防假绿范式齐 |
| parity | 20 | 20 | 结构计数新旧一致（436/54/10/341/439 由 R-9 §6 闭合，本席 blocks 39/39 侧证）；B-02/B-03/B-04 返修后全绿 |
| 工程红线 | 15 | 15 | spec 零触碰；无 token 新增；禁全量 pnpm test；只新增报告；commit --only；不 push；不关票 |
| 文档同步 | 10 | 7 | 扣 3：D-R1 旧 sha 硬编码 7 处残留待跟进（R-9 已自报，本席不越权改他人文件） |

**总分 97/100，verdict：PASS**（返修有效，无 S1/S2，S3 仅文档同步尾巴，不阻塞 #89 收尾）。

整改清单（owner＝编排者）：① D-R1 七处旧 sha/字节引用跟进更新或标注历史冻结（含两处探针硬编码 `EXPECT_HELP_SHA`／`claimed.bytes`，重跑即红）；② 关闭 #89 与否由编排者裁决（本席不关票）；③ N-1 观察项：若未来 CJK 栈口径变化，重审 H-06 body 回落。

## 附：自检

- [x] H-12／H-16／H-19／H-20 全部自己采交互证据（I 21/21），未采信实施席
- [x] H-06／H-10 computed 独立确认＋diff 最小改动核验＋回归 4/4
- [x] 抽验 5 条静态 PASS＋N-A 3 条复核（含 blocks 39/39 转承接）
- [x] 持锁／GATE-RUN／对账声明齐；禁全量 `pnpm test`；未改产品代码／冻结尺／他人文件；只新增本报告；`commit --only`；不 push；不关票；SKILL.md `2d 2d 2d`
