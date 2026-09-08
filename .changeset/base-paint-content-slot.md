---
'base-paint': minor
---

#118（map #63）base- 契约补遗：CONTENT 槽位／INJECT-DATA 语义／包裹约定。**只冻结契约，不实现运行时**——`fillTemplate` 运行时归 #74，12 个预包裹模板的改造归 #74／#107，模板文件本票零改动。

**新增 6 条冻结签名**：`PAYLOAD_SLOT_RULE`（载荷槽规则：`INJECT-DATA` 与 `CONTENT` 恰有其一，两者都有 → `marker-conflict`、都无 → `marker-missing`）／`TEMPLATE_KINDS`／`TemplateKind`／`TEMPLATE_KIND_RULE`（模板三分型：数据页／内容页／遗留，穷尽且互斥**仅对合法模板（计数 ∈ {0,1}）成立**，不命中 → `noKindCode`）／`ASSET_WRAP_RULE`／`ASSET_WRAPPERS`（包裹约定：资产裸文本 ＋ 填充器负责包裹，含两条不变量）。

**改 3 条既有签名（只追加）**：`TEMPLATE_MARKERS` 加 `content`（`<!--CONTENT-->`）；`TEMPLATE_ERROR_CODES` 末尾追加 `content-missing`（既有 7 个逐字逐序不变）；`FillTemplateInput` 末尾追加 `content?`。

**放宽 2 条（#118 授权的既有签名改动）**：`MARKER_RULES.injectData` 由 `exactly-one`／`required: true` 改为 `zero-or-one`／`required: false`——数量约束上移到 `PAYLOAD_SLOT_RULE` 承担；`FillTemplateInput.data` 由必填放宽为 `data?: unknown`（**D-8 裁定 2 授权**，与 `content?` 对称：数据页提供、内容页可省略；属追加式放宽、向后兼容）。

**FX-118 返修（V1／V3 验收后 · 总架构师裁定）追加 4 条冻结签名**（全 runtime／implemented，**未改任何既有签名的值**、**未实现 `fillTemplate`**、**未改任何模板文件**）：
- `CONTAINER_CHECK_RULE`：容器校验**仅当模板含 `<!--INJECT-DATA-->` 时执行**（`appliesWhenMarker: 'injectData'`）——53 个内容页无容器**合法**，不抛 `container-missing`（FX-118-1 阻塞项）；
- `TEMPLATE_CHECK_ORDER`：8 个错误码的**唯一判定次序**，**首个命中即抛、不聚合**（FX-118-2；真实 calorie 模板 → `marker-missing`）；
- `WRAP_PREDICATES` ＋ `ASSET_MARKER_KEYS`：两条包裹不变量的**判定谓词唯一一份**（作用域＋判定方式；不变量②作用域**排除 `injectData`**——payload 容器是必需项而非「预包裹」），#74 与 `tooling/classify-templates.mjs` 共用（FX-118-3／9）。

`SPEC_FROZEN_SURFACE` 由 120 条增至 **130 条**（首轮 126：implemented 94 → 100，runtime 79 → 84，type 41 → 42；返修 ＋4：implemented 104／pending 26 不变，runtime 88／type 42）。三处同步（清单 ↔ 契约 §3.1 标记区表格 ↔ `test-d`）＋ 运行时逐值断言 10 条（#118 ＋ FX-118 用例），含 S-1…S-4 机读自证。

**与旧基线的偏离（显式记账，契约 §4.5）**：旧 `公共组件/README.md:63` 要求「占位符必须放在独立 `<script>`／`<style>` 块内」（模板自带包裹），本契约**有意偏离**为「资产裸文本 ＋ 填充器包裹」——迁移面 12 个模板 vs 53～59 个，且新仓 53/65 已是「裸标记 ＋ 填充器包」的事实多数；parity 不受影响。`<!--CONTENT-->` 是**新架构发明的槽位**（旧基线 73 个模板**零命中**），不是旧 v1.30 能力。README:63 后半句（「勿与 `</script>`／`</style>` 字样混在资产注释里」）本轮补全引用，并由不变量①机读承接（FX-118-10③）。

**分类取证**：`tooling/classify-templates.mjs` 可复跑（判定只读 `dist` 的冻结常量，分型标签／包裹标签／容器／谓词全部复用冻结面），65 个模板 = 数据页 6／内容页 53／遗留 6，且与 **`docs/research/t118-template-inventory.md`**（本轮归档入仓，FX-118-8）逐条一致（65 条）。
