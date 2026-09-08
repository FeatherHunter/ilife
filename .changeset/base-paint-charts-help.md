---
'base-paint': minor
---

#78（map #63）base- 图表层与 HELP 壳落地：`SPEC_FROZEN_SURFACE` 5 条 `pending` → `implemented`（3 runtime ＋ 2 type），**签名值零改动**（三处同步：清单 ↔ 契约 §3.5 标记区 ↔ `test-d/contract-signatures.ts`），`implemented 128／pending 2`（余下 2 条 = #75）。

**新增运行时出口 3 个**：`charts`（`ChartsApi` 8 方法：bar／line／donut／progress／combo／sparkline／gauge／scatter，纯 CSS+SVG 字符串产出）／`buildChartsHelpersJs`（图表 helpers JS 唯一产出者，自注入 `<style id="ilife-charts">`）／`renderHelpShell`（HELP 壳，数据页分型，走 `fillTemplate`）。`ChartError`／`HelpSchemaError`／内置壳模板**不导出**（与 `TemplateError`／`ControlsError` 同口径，调用方按 `name`／`code` 判定）。

**坐标与自包含**：`CHART_COORD_RULE='viewBox-only'`（容器零 padding、留白进 viewBox、`vector-effect="non-scaling-stroke"`）；产出无 `<canvas>`／无内联 `<script>`／无 `onclick=`／无 `node:`／零第三方；模块自身零 DOM（DOM 只出现在 `buildChartsHelpersJs` 的产出文本里）。B4 白名单例外已去掉（`CHART_KINDS` 闭集）。

**HELP 壳**：`HELP_SHELL_ID`／`HELP_COPY_TARGETS`／`HELP_COPY_ACTIONS` 逐字取自冻结常量；完整 HTML 文档（`<!DOCTYPE html>` ＋ `<meta charset="utf-8">`）；CSS-only 交互（`:checked` Tab ＋ `<details>` 折叠／Sheet），无内联脚本；scene-data 零依赖 draft-07 子集校验（4 个错误码首个命中即抛）。

**契约修正（本票施工期取证发现）**：`SCENE_DATA_SCHEMA` 的 `scenes[]` 补 `minItems: 1`（文档 §3.5.2 写「必填，非空」而机读权威缺该约束）；AC-3 单数笔误引证更正为 `docs/help-template-contract.md:51`（旧稿写的 `assets/help_template.html:52` 实为 CSS 行）。

**与旧基线的偏离（显式记账）**：combo 的 DOM 校准（`getBoundingClientRect`／rAF／`getTotalLength`）与旧「SVG viewBox ＋ HTML 百分比覆盖层」双层坐标**不复刻**（新契约纯字符串 ＋ `viewBox-only`），改判「同一 scale 函数导出数据点与路径端点、物理对齐」；旧 `combo.y2` 不移植；`dotSize`／`dotStyle`／`combo.tooltip` 等旧版死参数按冻结类型实现为新能力；HELP 壳的视觉与 CSS-only 交互依赖 #75 的 `sharedCssText`（`helpShell` 区），壳只产结构前提与类名命名空间（与 #76 toast 同性质）。
