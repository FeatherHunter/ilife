# #89 视觉锁 B1 逐值验收 · 过程台账（第 2 任实施席）

- runId（本席取证轮）：`536e8b9c-5a93-4ad0-bd92-5e125480300d`
- 证据根：`docs/research/t89-evidence/536e8b9c-5a93-4ad0-bd92-5e125480300d/`
- 交接基线：`docs/research/t89-evidence-plan.md`（commit `b927a3c`）§1 矩阵／§4 归档约定／§6 移交清单
- 照判裁定：H-12 的 400px 子句按冻结 820 为准；H-17 HELP 页 N/A；H-06 如实判「未达」＋最小修复方案（不改冻结面）
- 判据收窄：H-01 禁色只约束 UI 主色（图表色板例外 D-10）；H-04／H-10 按 CSS 区判（charts 区除外，L-17）
- 状态：取证中（先落文档再跑下一条；每 5 条一 commit，不 push）

## 逐条 verdict（实测值／证据／复算命令随取证轮补齐）

| 条 | verdict | 实测值（摘要） | 证据路径 | 逐字复算命令 |
|---|---|---|---|---|
| H-01 | PASS | 禁色命中`[]`；`--blue:#007aff`逐字；computed根/壳均为`#007aff` | `t89-evidence/<runId>/S/probe-static.json`(H-01)＋`shots/H-01/{viewport,element}.png`＋`shots/probe-shots.json`(H-01.1) | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs --out <dir>`；`node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-shots.mjs --out <dir>` |
| H-02 | PASS | 冻结token 7/7；正文h1/卡标题`rgb(29,29,31)`=--fg、副标题/命令`rgb(110,110,115)`=--fg2；--fg3仅落≤13px提示层 | `S/probe-static.json`(H-02)＋`shots/H-02/{viewport,element,lead}.png`＋`shots/probe-shots.json`(H-02.1/.2) | 同上 |
| H-03 | PASS | `--bg:#f5f5f7`≠`--card:#ffffff`；卡面computed纯白`rgb(255,255,255)` | `S/probe-static.json`(H-03)＋`shots/H-03/{viewport,card}.png`＋`shots/probe-shots.json`(H-03.1) | 同上 |
| H-04 | PASS | CSS区分区：`gradHelp:0`／`gradAll:1`／`gradCharts:1`（charts区`repeating-linear-gradient`属冻结图表资产，D-10/L-17例外） | `S/probe-static.json`(H-04)＋`shots/H-04/element.png`＋`shots/probe-shots.json`(H-04.1) | 同上（须同时打印gradHelp与gradAll） |
| H-05 | PASS | 无≥48px（max 32；D-9不要求）；h2 17px/600×3；正文subtitle 15px；提示12/13px；h1 32px/700∈[28,32] | `S/probe-static.json`(H-05)＋`shots/H-05/element.png`＋`shots/probe-shots.json`(H-05.1/.2/.3) | 同上 |
| H-06 | 待采（预期「未达」） | — | — | 同上 |
| H-07 | 待采 | — | — | 同上 |
| H-08 | 待采 | — | — | 同上 |
| H-09 | 待采 | — | — | 同上 |
| H-10 | 待采 | — | — | 同上（按 CSS 区判） |
| H-11 | 待采 | — | — | 同上 |
| H-12 | 待采（交互） | — | — | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-interactive.mjs --out docs/research/t89-evidence/<runId>/I` |
| H-13 | N/A（转 B-02，D-15） | — | — | blocks 探针 B-02 |
| H-14 | N/A（转 B-04，D-15） | — | — | blocks 探针 B-04 |
| H-15 | 待采 | — | — | S ＋ shots |
| H-16 | 待采（交互＋t121 交叉） | — | — | I ＋ `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t121-browser-evidence.mjs --label t89reuse` |
| H-17 | N/A（转 B-03，照判） | — | — | blocks 探针 B-03 |
| H-18 | 待采 | — | — | shots（空态样本） |
| H-19 | 待采（交互＋t88 交叉） | — | — | I ＋ t88-browser-evidence-b（B20／B22／B23／B25／B27） |
| H-20 | 待采（交互新采） | — | — | I ＋ shots |

## 取证轮次记账（GATE-RUN 对账用）

- `GATE-RUN runId=9f2ebd7b-0c28-493f-ad89-0f7d3ec89148 cmd="node .scratch/t89/cmdA.mjs (calorie.help.center mode=file)"` → artifact 1264822B sha16=F380EF685065A1E9（与交接基线逐字节一致）
- `GATE-RUN runId=91af98be-b3f1-4381-8327-97f9cc3c3ecf cmd="node docs/research/t89-probe-browser.mjs"` → `RESULT: 10/10 PASS`
- `GATE-RUN runId=d30a51ee-99d0-4253-bc6e-2b2ab5e0aa23 cmd="node docs/research/t89-probe-help-static.mjs"` → `RESULT: 24/27`（红=H-06.2/H-10.1/H-17.1）
- `GATE-RUN runId=15c0ee76-0170-4d27-a666-65c22617df64 cmd="node docs/research/t89-probe-help-interactive.mjs"` → `RESULT: 21/21 PASS`
- `GATE-RUN runId=48d3b30d-82ef-4099-bf96-a8cb8431e614 cmd="node docs/research/t89-probe-shots.mjs"` → `RESULT: 34/36`（红=H-06.2/H-10.1）
