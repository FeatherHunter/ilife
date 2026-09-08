# #118 旧基线包裹约定原文摘录（仓内可追溯出处）

- **用途**：契约 §4.5「与旧基线的偏离」引用旧基线 `公共组件/README.md:63` 的**完整原文两句**，其仓内可追溯出处即本文件 §1（此前该引用的出处只有未入仓的 `.scratch` 快照，第三方无法复现）。
- **取证链**：本文件**转录**自旧层取证快照 `.scratch/t118/baseline.md:74`（该快照是**归档前旧位置**、未入仓、**勿据此取件**，与契约 §0 依据表／§4.5／§3.1.2① 同口径）；快照的最终来源是旧层仓库 `公共组件/README.md:63`（旧层不在本仓，仓内不复现）。转录与快照该行逐字一致，仅补来源与口径标注。
- **不是第二真相**：包裹约定的机读真相仍在 `packages/base-render/src/spec/template.ts` 的 `ASSET_WRAP_RULE`／`ASSET_WRAPPERS`／`WRAP_PREDICATES`；条文见契约 §3.1.2④／§4.5。本文件只做原文摘录与来源标注。

## 1. `公共组件/README.md:63` 原文（包裹约定，完整两句）

> ⚠️ 占位符必须放在独立 `<script>`/`<style>` 块内, 勿与 `</script>`/`</style>` 字样混在资产注释里

- 前半句「必须放在独立 `<script>`/`<style>` 块内」＝**模板自带包裹**（旧约定）；本契约**有意偏离**为「资产裸文本 ＋ **填充器包裹**」（§4.5／§3.1.2④）。
- 后半句「勿与 `</script>`/`</style>` 字样混在资产注释里」＝**资产文本不得混入闭标签字样**；本契约**沿用并机读化**为不变量①（`WRAP_PREDICATES.assetsBare`，判定方式 `trim-prefix-or-suffix`）。
- 同快照 `:74` 另记：`:75-86` 给出最小骨架示例（三标记分别位于 `<script id="payload" …>`／`<script>`／`<style>` 内）。

## 2. 同快照的相邻取证事实（逐条转录，供 §4.5 的四条理由引用）

- 旧层注入器**只替换文本、不补写标签**：`公共组件/injector.py:104-122` 全部为 `str.replace(marker, text, 1)`（快照 §6 第 3 条）——故旧约定下包裹责任 100% 落在模板。
- 旧层契约 §3（`公共组件/docs/component-contract.md:64-75`）**只规定数量与硬拦截、未规定包裹**（快照 §6 第 4 条）；包裹约定仅存在于 README（`:63`）与最小骨架示例（`:75-86`），且旧层存在两代注入形态（Base 管线 vs 渲染器生成 `window.__DATA__`）。
- 旧层自带模板 `assets/help_template.html` 的 payload 容器 id 是 **`help-data`** 而非 `payload`（`:195`，快照 §6 第 5 条）——与 `DEFAULT_DATA_SCRIPT_ID` 的校验口径无关（旧注入器不校验容器 id）。

## 3. 引用与复现口径

- 契约 §4.5 以本文件 §1 作为 `README.md:63` 原文出处；`.scratch/t118/baseline.md` 一律标注「归档前旧位置、未入仓、**勿据此取件**」，不得据此取件。
- **不依赖旧层**即可复现的仓内证据：`docs/research/t118-template-inventory.md`（裸 53／包裹 12 逐条统计）＋ `tooling/classify-templates.mjs`（判定只读 `dist` 冻结常量）＋ 输出快照 `docs/research/t118-template-classification.md`（见 §4.5）。
