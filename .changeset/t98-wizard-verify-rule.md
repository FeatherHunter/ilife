---
'skill-calorie': patch
---

#98（map #63）SKILL.md 补 **Wizard Verify 铁则（M6，v2.4.3 复刻）** 返修版：优先级声明 ＋ 前置（先问测量方式）＋ 词→页映射表 ＋ 三场景表（主动填／预填 verify／直接录）＋ #86 落地前的**文字 verify fallback** ＋ 训练计划「**当前不可写**」＋ **AUTO 块覆盖句** ＋ 违规回执逐字口径。全部落在 `<!-- HELP-AUTO-START/END -->` 块**外**（块 sha256 逐字节未变），锚点一律**符号锚**（不引 `src/**` 行号——并发票在改 `write.ts`／`cmd_read.ts`，行号必腐）。

- **铁则原文出处**：`docs/research/t71-old-baseline-inventory.md:669-679`（§6.4，逐字引旧 `SKILL.md:20-28`）；必须复刻清单 M6 行 `:726`。
- **CLI 符号锚**：空参被拦（`fetch/body.ts` `validateMeasurementInput` 的 `fail('围度','empty',…)` → `cli/write.ts` `dispatchWrite` 的 `ValidationError` 分支）、预填键白名单（`cli/write.ts` `MEASURE_CAMEL` 循环）、皮褶钳缺 `bodyFatPct` 即 `fail(2,…)`（换算未移植）、计划类 dry-run（`render/planPlate.ts` `buildPlanWizardView` → `fetch/plan.ts` `validatePlan`，`dryRun:true`／`insertedCount:0`）、35 写键 `receipt` 形（`cli/write.ts` 模块头契约 ＋ `out()`）。
- **路由真值**：多步交互配置写词落 `non-exec`／`NON_EXEC_REASONS.wizard`；**77 键无训练计划写键 → 当前不可写**（`NON_EXEC_REASONS.planWriteMissing` 逐字「…本仓执行层不承接计划写入」，实测 77 键仅 `calorie.view.plan`／`calorie.view.plan-wizard` 两个读键）；同族 5 词在路由层为 `exec`（`triggers/routing.ts` `WAKE_ROUTES` 场景 08）——只证明写键可达，**不豁免** verify 前置（含 AUTO 块，冲突登记见证据 §5 C-1）。
- **与 #86 依赖**：本侧已引用；#86 仍 OPEN 0%，落地后回引。页面本体归 #86，本票只写映射与前置。
- **同步 #87**：唯一出口段与公共安装器段的 HTML 落盘口径改为默认 `calorie_html/<中文command>_<TS>[_N].html` ＋ `--output` 覆盖（`--html` legacy 别名）。
- **未落地（登记）**：SKILL.md 3 处 `skill-calorie@0.1.1` 与 changeset 消费须在发布窗口（框架图 #1，本图 out of scope）同批同步。
- **证据**：`docs/research/t98-m6-wizard-verify-evidence.md` ＋ 可复跑 `docs/research/t98-auto-block-check.mjs`（幂等＋git 基线，**不硬编码 sha**）／`docs/research/t98-test-delta.mjs`（`pnpm build`／`boundaries`／`snapshot:check`／`publish:pre` 全 exit 0；`skill-t11` 7/7 绿）。
