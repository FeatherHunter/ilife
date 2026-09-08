---
'skill-calorie': patch
---

#98（map #63）SKILL.md 补 **Wizard Verify 铁则（M6，v2.4.3 复刻）**：三场景表（主动填／预填 verify／直接录）＋禁止项，落在 `<!-- HELP-AUTO-START/END -->` 块**外**（块 sha256 逐字节未变），逐条锚到实现 `file:line`。

- **铁则原文出处**：`docs/research/t71-old-baseline-inventory.md:669-679`（§6.4，逐字引旧 `SKILL.md:20-28`）；必须复刻清单 M6 行 `:726`。
- **CLI 落点**：空参被拦（`fetch/body.ts:107` → `cli/write.ts:205`）、预填键白名单（`cli/write.ts:754-756`）、皮褶钳须带 `bodyFatPct`（`:732`，换算未移植）、计划类 dry-run 纯校验（`render/planPlate.ts:55-72`，`dryRun:true`／`insertedCount:0`）、35 写键 `receipt` 形（`cli/write.ts:3-5`／`:112-115`）。
- **路由真值**：需多步交互的配置写词落 `non-exec`／`NON_EXEC_REASONS.wizard`（`triggers/routing.ts:75-76`、`:193-194`、`:366-372`）；77 键无训练计划写键（`:97-98`）；同族 5 词在路由层为 `exec`（`:396-400`）——只证明写键可达，分流仍按铁则（冲突登记见证据 §5 C-1）。
- **与 #86 互相引用**：本侧已写（verify 页本体归 #86）；#86 侧待其落地。
- **证据**：`docs/research/t98-m6-wizard-verify-evidence.md` ＋ 可复跑 `docs/research/t98-auto-block-check.mjs`／`docs/research/t98-test-delta.mjs`（`pnpm build`／`boundaries`／`snapshot:check`／`publish:pre` 全 exit 0；测试失败集 delta 归属并发票，本票可见面 A/B 20/20 零影响）。
