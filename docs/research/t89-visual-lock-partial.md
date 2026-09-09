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
| H-01 | 待采 | — | — | `node tooling/run-locked.mjs --ticket 89 -- node docs/research/t89-probe-help-static.mjs --out docs/research/t89-evidence/<runId>/S` |
| H-02 | 待采 | — | — | 同上（S）＋ shots |
| H-03 | 待采 | — | — | 同上 |
| H-04 | 待采 | — | — | 同上（须同时打印 gradHelp／gradAll） |
| H-05 | 待采 | — | — | 同上（S）＋ shots computed |
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

（随跑随记：`GATE-RUN runId=<本次 runId> cmd=<命令>`）
