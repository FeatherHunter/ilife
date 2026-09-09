# t-chartfix 图表排版修复证据（#78 冻结面产物，约束优先）

## 0. 结论速览

- 修好 2 处：D2 标签居中（bar＋combo，band 标度）、D3 进度可见（`min-height:12px` 兜底）。
- D1 字号倒挂**未修**：既有断言把 bug 值钉死，按硬约束停下等契约级裁定（见 §4）。
- 冻结面 `SPEC_FROZEN_SURFACE`：130 条／implemented 130／pending 0（前后一致）；零新增导出；签名零改动。
- 架构红线：`viewBox-only`、零 `<canvas>`、纯字符串、模块零 DOM、无 `node:`、无隐式全局（`H.纯度`＋`H.纯度（src 侧）`全绿）。

## 1. 缺陷→修法→证据

### D2 标签与柱子错位（已修）

- 根因：`xLabelsSvg` 对所有 kind 用折线点标度 `xAt(frame,i,n)`；bar／combo 柱列中心是 band 标度
  `x0+slot*(i+0.5)`。3 柱 width:320 时点标度首尾标签落在 14.0／306.0（绘图区边缘），柱心是 62.7／257.3。
- 修法（`packages/base-render/src/charts.ts`）：
  - `xLabelsSvg` 新增第 5 形参 `xOf`（缺省点标度；内部函数，非导出，冻结面无影响）；
  - bar 调用点传 band 标度（`:1252`）；combo 调用点同样传 band 标度（`:1473`，与 FX-A1c-01 线点＝柱心同标度）；
  - line／scatter 不动（点标度本就正确）。
- 前后证据：`node docs/research/t-chartfix-repro.mjs`
  - 修前：`BAR_CENTERS=62.7,160.0,257.3`／`XLABEL_X=14.0,160.0,306.0`／`DELTA=48.7,0.0,48.7`；
  - 修后：`XLABEL_X=62.7,160.0,257.3`／`DELTA=0.0,0.0,0.0`；
  - 截图：`docs/research/t-chartfix-before.png` → `docs/research/t-chartfix-after.png`（周一／周三归位柱下）。
- 新断言（只增不改，既有 `it` 内追加，87 条计数不变）：`C.labels` 末尾（柱心逐值＋标签 x＝柱心）、
  `F.bars / F.lines` 末尾（combo 4 列标签 x＝50.5／123.5／196.5／269.5）。

### D3 进度条缩成头发丝（已修）

- 根因：缺省轨道高 8（`resolveCommon` 缺省 `height:8` → 内联 `height:8px`＋viewBox 高 8），65% 填充肉眼近乎细线。
- 修法（`src/charts.ts` 的 `chartsCss` 内新增一条规则，`:1741`）：
  `.ilife-charts-progress .ilife-charts-svg{min-height:12px}`。
  未动 `height` 选项→内联／viewBox 映射（`E.height` 四条照旧）；不同属性不与内联 height 冲突；
  无渐变／圆角增量（T13 渐变数、H-10a2 圆角集不受影响）；渲染高度＝max(8px,12px)＝12px，65% 可读。
- 前后证据：repro `PROG_FILL` 宽 65.0／`PROG_PCT_TEXT=65%` 不变，渲染高 8px→12px（层叠结果）；
  截图 after 可见轨道明显加粗；`E.height` 末尾新增字面量断言。
- 未选方案：缺省 8→12 会打破 `charts.test.mjs:138`（viewBox `100.0 8.0`）与`:1010`（`height:8px`），属钉住值，按约束不碰。

### D1 X 轴标签字号倒挂（未修，等裁定）

- 实测：`.ilife-charts-xlabel{font-size:10px}`＝`.ilife-charts-value{font-size:10px}`；
  bar 内 `.ilife-charts-bar .ilife-charts-xlabel{font-size:10.5px}`＞`.ilife-charts-bar .ilife-charts-value{font-size:10px}`。
- 任何方向的修法（降轴标签或升数值）都会改动 `H.图表文本字号` 钉死的字面量（§4），按硬约束停下，未动源码。
- 拟议修法（供编排者裁定后执行）：bar 轴标签 10.5px→9px、全局轴标签 10px→9px（数值 0.9x），同步更新该用例三处字面量。

## 2. 门禁与计数（持锁，exit code 逐项）

- `pnpm build` exit 0；`node tooling/check-boundaries.mjs` exit 0；
  `node tooling/write-snapshot.mjs --check` exit 0（快照只覆盖 skills/combos，本票无影响）；
  `pnpm publish:pre` exit 0（PASS）。
- 四测试：`contract-signatures`＋`charts`＋`style`＋`controls`＝tests 227／pass 227／fail 0（exit 0）。
- 冻结面：total 130／implemented 130／pending 0（`dist/index.js` 实测）。
- 插曲：变异还原后一次增量 `tsc -b` 未重发 dist（旧 dist 比 src 新但缺修复），`E.height` 新断言 fail 1 暴露；
  改持锁 `pnpm exec tsc -b --force` 重建 exit 0，dist 含修复，四测试回 227/227（详见报告风险 top3）。

## 3. 变异自证（持锁；跑前 sha256；`finally` 式还原；还原自证）

- 基线 sha256（修后）：`DE43046B238DAF3C3CE267EFEDAF22EF92D2C18AA6F91E2A52A67EBF4AE2AAD8`。
- M1（bar 标签回点标度）：`charts.test.mjs` fail 1——`C.labels` 新断言
  `X 标签 x 必须 == 各自柱列中心 x` 变红；exit 1；还原后 sha 一致。
- M2（删 min-height 规则）：fail 1——`E.height` 新断言`进度 svg 必须有 12px 最小高度兜底`变红；
  exit 1；还原后 sha 一致（同上值）；重建 exit 0；四测试回绿 227/227。
- 日志：`.scratch/t-chartfix/run-mut{1,2}-{build,test}.log`、`run-rebuild.log`、`run-tests-final2.log`。

## 4. 测试钉住 bug 的清单（D1，逐条）

文件均为 `packages/base-render/test/charts.test.mjs`，用例为
`H.图表文本字号：CSS 补齐各文本类 font-size（旧 charts.js:…）`（`:1660–1683`）：

1. `:1665` — `'.ilife-charts-xlabel{font-size:10px}'`：轴标签 10px，要求修为**小于**数值字号则本条必改
   （数值规则 `:1666` 同为 10px，相等非小于）。
2. `:1671` — `'.ilife-charts-bar .ilife-charts-xlabel{font-size:10.5px}'`：正是倒挂值（＞同文件 CSS 的 bar 数值 10px）。
3. `:1666` — `'.ilife-charts-value{font-size:10px}'`：反向修法（升数值字号）同样撞本条。
4. `:1676` —移动端 `'.ilife-charts-bar .ilife-charts-xlabel{font-size:9.5px}'`：连带受字号体系调整影响。

以上未做任何改动，等编排者契约级裁定。

## 5. 跨票影响（#75，只报不修）

- `style.test.mjs`（29 用例，含 T12 逐字节复用／T13 charts 段渐变数＝1）：随四测试全绿，无断裂。
- `node docs/research/t75-visual-evidence.mjs`（最终 dist）：`RESULT: 72/72`，H-10a2（charts 段圆角仅豁免 2px，
  本票只加了 `min-height` 无 radius 增量）与 H-04（charts 段渐变计数，本票无 gradient 增量）不断。
- 结论：不断；未改 `#75` 任何文件。

## 6. 改动面

- `packages/base-render/src/charts.ts`：`xLabelsSvg` 加 `xOf` 形参＋注释；bar／combo 调用点传 band 标度；
  `chartsCss` 加进度 `min-height:12px` 规则＋注释。未动 `src/spec/charts.ts`（零常量改动，无需论证）。
- `packages/base-render/test/charts.test.mjs`：三个既有 `it` 内追加断言（C.labels／E.height／F.bars)，87 条计数不变。
- 新增证据：`docs/research/t-chartfix-repro.mjs`、`docs/research/t-chartfix-evidence.md`（本文件）、
  `docs/research/t-chartfix-before.png`、`docs/research/t-chartfix-after.png`。
