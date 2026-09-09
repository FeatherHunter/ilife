---
'base-link-core': patch
'base-combos': patch
---

#79（79b）base-* 三包**版本统一**：`base-link-core` 0.1.0→**0.2.0**、`base-combos` 0.1.0→**0.2.0**（`base-paint` 已是 0.2.0 且 0.1.0／0.2.0 均已发布，故统一到 0.2.0，只许前进）。包内依赖范围同步为同版本线：`base-combos` 的 `base-link-core` 由 `workspace:^0.1.0` 改 `workspace:^0.2.0`，`base-paint` 的 devDependency 由 `^0.1.0` 改 `^0.2.0`。

**机制**（契约 §5 · B8）：`.changeset/config.json` 的 `fixed` 组由 `[]` 改为 `[["base-link-core", "base-paint", "base-combos"]]`——此后任一包发版，三包同版本、同发布，版本偏斜在发版机制层被消除。CI 断言落在 `packages/base-render/test/base-version-lockstep.test.mjs`（`pnpm test` glob 内）：三包 `version` 逐字相等 ＋ `fixed` 组恰好覆盖三包 ＋ 包内 caret 范围与工作区版本同 major.minor。

**签名面零改动**：本 changeset 不改任何冻结签名、不改任何渲染产出（`pnpm snapshot:check`／`pnpm snapshot:html:check` changed=0，`calorie.help.center` file 态产物 sha256 逐字节不变）。版本常量（`ENVELOPE_VERSION`／`RENDER_CONTRACT_VERSION`／`RENDER_ENVELOPE_VERSION`／`STYLE_VERSION`／`BASE_PAINT_CONTRACT_VERSION` = `'0.1.0'`）是**契约版本**，非包版本，保持冻结值不动。

**未覆盖面（登记，不掩饰）**：`packages/skill-calorie` 的 devDependency 仍为 `base-link-core: ^0.1.0`（本票禁改该包；锁文件落到 registry `0.1.0`，但该包引用全为 `import type`、类型擦除，影响面为零，见交付报告 §4.5，缺口 G-2；解冻后一行对齐 `^0.2.0`）。其余 5 技能包（bill／chef／home／schedule／memo-ilife）的 `dependencies.base-link-core` 已对齐 `^0.2.0`，并由 lockstep 技能面断言锁住（R-8 返修）。
