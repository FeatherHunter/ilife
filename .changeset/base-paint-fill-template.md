---
'base-paint': minor
---

#74（map #63）base-paint 统一占位符填充器 `fillTemplate` 落地 ＋ `escapeHtml` 五字符归一。

**新增运行时**：`fillTemplate(input: FillTemplateInput): FillTemplateOutput`（契约 §3.1／§3.1.2／§6.1 逐条实现）：
六标记数量规则（含 `NO-SHARED` 豁免与互斥）／载荷槽规则（`INJECT-DATA` 与 `CONTENT` 恰有其一）／
模板三分型／包裹约定（资产裸文本 ＋ 填充器按 `ASSET_WRAPPERS` 包裹，两条不变量按 `WRAP_PREDICATES` 判定）／
容器校验**仅当含 `INJECT-DATA` 时**执行（`CONTAINER_CHECK_RULE`）／8 个错误码按 `TEMPLATE_CHECK_ORDER`
**首个命中即抛、不聚合**／`strict` 两档（零依赖信封校验，**不调用** `parseEnvelope`）。失败一律抛
`TemplateError`（`{ name, code, marker?, message }`），**不返空页**。零运行时依赖不变（AC-13）。

**行为变更（AC-14）**：`escapeHtml` 由 4 字符归一为 5 字符（`& < > " '`，`'` → `&#39;`），
转义集与实体表恒读冻结常量 `ESCAPE_HTML_CHARS`／`ESCAPE_HTML_ENTITIES`；签名测试的漂移哨兵已按契约翻转。
影响面为**数据相关**（被转义文本含 `'` 时输出字节改变，每个 `'` +4 字节）；calorie 侧差异证据见
`docs/research/t74-escape-html-calorie-diff.md`（41 处调用点、5／5 样本、现有资产 0 命中）。

**签名面零改动**：`SPEC_FROZEN_SURFACE` 仅把 `FillTemplate`／`fillTemplate` 两条 `status` 由 `pending`
翻成 `implemented`（130 条不变：implemented 104 → 106、pending 26 → 24），三处同步（清单 ↔ 契约 §3.1
标记区表格 ↔ `test-d/contract-signatures.ts`）＋ 运行时出口面锁断言翻转。`TemplateError` **不**新增运行时出口
（冻结面无该条目）。本 changeset 只声明 `base-paint`；base-* 三包统一版本由 #79 的 changesets `fixed` 组落地。

**未执行（红线）**：技能包（模板／`package.json`／render 层）**零改动**；其余 5 技能的迁移路径只写在
`docs/research/t74-migration-path.md`（含 12 处预包裹（6 模板 × 2 标记）的去包裹动作、`escapeHtml` 本地副本删除清单，
以及 **FX-74-7 必修的「资产替换面」声明**：私有 CSS 有两个变体 → #75 统一资产后技能输出必然变字节）；
calorie 6 个遗留模板的改造归 #107（`fillTemplate` 对其抛 `marker-missing` 是正确行为）；
三个资产产出者 `buildStyleSheet`（#75）／`buildSharedHelpersJs`（#76）／`buildChartsHelpersJs`（#78）仍 `pending`，
本票用自造合法 fixture 资产自证，不自产任何资产。

**返修（FX-74-1…FX-74-9，三份独立验收通过后）**：行为零变更——唯一实现改动是 JSON 的 `<` 转义改引冻结常量
`TEXT_JSON_LT_RULE`（原写死 `u003c` 字面量，属第二真相，FX-74-2）；其余为测试与文档级修复
（3 处恒真断言改为有鉴别力断言、补 9 条边界用例、门禁口径与边界登记写入契约 §7／§8.8）。
