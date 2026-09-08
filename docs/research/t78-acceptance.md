# #78 验收汇总（base- 图表层与 HELP 壳）

> 正本：`.scratch/t78/ARCHITECT-RULINGS.md`（R1–R35）／`ACCEPTANCE.md`（验收章程）／`OPTION-MATRIX.md`（84 字段判据）。
> 纪律：**施工者不得自证**——四路验收均为独立 subagent；编排者另做独立探针与变异复核。

## 1. 四路独立验收

| 路 | 范围 | 裁决 | 报告 | 处置 |
|---|---|---|---|---|
| **V1** | 契约面（5 条 pending 翻转／三处同步／出口面／签名测试） | **通过**（0 阻断） | `docs/research/t78-verify-v1.md` | — |
| **V2b** | HELP 壳行为 parity ＋ 鉴别力 | 首轮**不通过** → 复验**不通过** → 终局**通过** | `t78-verify-v2b.md`（含终局复验节） | 3＋1 条 FX 全修；编排者**亲自定点复验**（改 `dist/help.js` → 47 测试 46 通过 / 1 失败、还原逐字节相同） |
| **V2a** | 图表行为 parity（84 字段 ＋ 抽样） | **不通过**（实现零缺陷；5 条断言鉴别力缺口） | `t78-verify-v2a.md` | 84/84 字段 ＋ 21/21 重点 ＋ 15/15 随机抽样通过；5 条 FX 已由 A1c 落地 |
| **V3** | 对抗与变异鉴别力（32 处独立变异） | **不通过**（24 红 / 8 存活） | `t78-verify-v3.md` | 8 处存活 ＋ 17 条弱断言已由 A1c／A2 落地 |

## 2. 编排者独立复核（非施工者自证）

- **独立探针**：壳产物（完整文档／六标记 0 残留／`<script>` 恰 2／canvas 0／内联事件 0）；8 类图表（`yTicks:9→6` 条刻度、`pct:250→100` 收敛、`pct:0` 时 `empty:false`、`markPoint`／`anomaly`／`area`／`markLine` 各 1）；柱族绘图区 `20..148` 最高柱满高；散点内联 `style="r:10"`；helpers JS 幂等自注入零全局。
- **独立变异（编排者自写脚本 `.scratch/t78/v3-mutations.mjs`，改 `dist` 并逐处还原校验 SHA）**：12 处 → **11 命中**；唯一存活＝分数 `pct` 取整无断言 → 已派 A1c 补（`Math.round`→`floor` 必须红）。
- **定点复验**：`FX-78-V2b-4` 由编排者改 `dist/help.js` 复现（47 测试 46 通过 / 1 失败、`dist` 未被并发覆盖、还原逐字节相同）。

## 3. 返修台账（施工轮次）

| 轮 | 范围 | 结果 |
|---|---|---|
| A1 | 图表初版 | 74 用例／13 变异 |
| A1b | R1／R2 预审 21 条 ＋ 类名命名空间 `ilife-chart*`→`ilife-charts*` | 16/16 ＋ §C 全改强；82 用例／30 变异；`charts.ts` 1793 行 |
| **A1c** | V2a 5 条 ＋ V3 8 条 ＋ 17 弱断言 ＋ **combo 线点对齐（编排者改判为缺陷）** | 31 处变异 31/31；`tsc` exit 0 |
| A2 | HELP 壳 4 轮（R31 完整文档／R32 CLI 文本／V2b 3 条／V2b-4 夹具退化／W13–W17） | 48 用例；实现 SHA 多轮零改动自证 |

## 4. 门禁（`docs/base-paint-contract.md:1014` 口径）

- `pnpm build`／`pnpm boundaries`／`pnpm test:types` 三条 **exit 0**；
- `pnpm test` **新增失败 = 0**（判据 `docs/research/t92-baseline-failures.md` 失败用例名多重集；比对脚本 `.scratch/t78/compare-failures.mjs`）；
- 契约签名测试 **47/47**；`charts.test.mjs` **87/87**；`help.test.mjs` **48/48**；base-render 全目录 **388/388**。
- 77 键实跑（`docs/research/t81-exec-smoke.mjs`）**361 条全 exit 0**（含 #90／#93 接线后的复核）。

## 5. 证据入仓

`docs/research/t78-{contract-scope,old-baseline,contract-precheck-r1,parity-audit-r2,verify-v1,verify-v2a,verify-v3,browser-evidence,charts-evidence,help-evidence}.{md,mjs}` ＋ 本文件。

## 6. 已知缺口（登记，不阻塞）

- HELP 壳视觉与 CSS-only 交互依赖 **#75** 的 `sharedCssText`（`helpShell` 区）；#88 本就依赖 #75。
- **搜索**与 **Sheet 实时预览**无承载资产 → 行为归 **#88**（可给 `buildSharedHelpersJs` 追加通用行为，**签名不变**）。
- 带 `editable_fields` 的「复制指令合并参数行／空值拦截」、变体示例、`data_source` 等 → **#88／#106**。
- scatter 缺省 4 条 Y 刻度无关闭开关（契约缺口）；`combo.y2` 不移植；`format`／`singleColor` 不复刻字符串形态。
