---
'base-paint': minor
---

#75（图 #63）base-paint 共享样式资产落地：`buildStyleSheet`（契约 §3.2／§6.2）。

**新增运行时**（1 条）：`buildStyleSheet(input?: StyleSheetInput): StyleSheetOutput`
（`{ css, tokens, prefix, version }`）。产出即 `<!--SHARED-CSS-->` 的填充物
（`input.assets.sharedCssText`，契约 `docs/base-paint-contract.md:163`），形态为**裸 CSS 文本**
（不含 `<style>` 包裹——包裹由 `fillTemplate` 完成，契约 §3.1 的 `assetsBare` 不变量）。

**产出内容**：`:root` 的 11 个 `CSS_VAR_TOKENS` **逐值**（顺序即常量声明序，`--blue: #007aff`
锁 B1 主色）＋ `CONTROL_STYLE_SECTIONS` 闭集 8 个样式区的真实规则（toast／actionBar／copyButton／
statusBadge／emptyState／errorReceipt／charts／helpShell），类名自动加 `prefix`（缺省 `STYLE_PREFIX`）。

**红线遵守**：① 不自造第二份 token 表——`:root` 由 `CSS_VAR_TOKENS` 生成，逐字节等于契约
doc:276-288 的 CSS 块；② 不自造类名——每个 CSS 类名都有产出者（控件区由 `renderToast` 等实际渲染
的类名双向对齐，helpShell 由 `src/help.ts` 的 `cls()` 实参反查，charts 逐字节复用）；③ charts 的 CSS
文本**复用** `src/charts.ts` 的唯一产出者 `chartsCss`（#78 结论，重述即 S1），`chartsCss` 加 `export`
但**不进 `src/index.ts`**（冻结面仍 130 条）；④ Q14 禁入零命中（`--r-xl`／`--pink`／深色区）；
⑤ 与既有 `STYLE_TOKENS`（9 个深色 JS token）**并存**、键集不重叠；⑥ 不按技能名分支：`extraCss`
**末尾原样追加**，基座段逐字节恒定。

**类名撞车处置（裁定 R6／施工单 B-R4）**：`ilife-error` 亦由
`packages/skill-calorie/src/render/html.ts:254`（`cx('error')`，错误页正文）产出 → errorReceipt 的容器
规则**不用**裸 `.ilife-error` 选择器，改用 `.ilife-error:has(> .ilife-error-title)` 精确限定自身类组合；
浏览器实测 calorie 的 `ilife-error` 节点 computed `padding:0px`／背景透明／圆角 0（未被污染）。

**页面壳不归本票（裁定 R7／B-D2a）**：只产 11 token ＋ 8 个闭集样式区；页面壳／KPI／表格／回到顶部等
无闭集归属的样式归 #104（B1 区块组件 owner），`extraCss` 语义被契约 doc:299-300 限死，**不塞壳层样式**。

**`version` 取值（裁定 D1）**：契约 doc:268 只冻结类型 `version: string`、**未规定取值**（契约空白）→
本票裁定取 `STYLE_VERSION`（`'0.1.0'`，语义为「样式表版本」、已被 `test-d:119 _B17` 锁、与 B8 同值、
零新增符号）；**禁止**从 `package.json` 读（撞 `dist` 纯度红线）。

**签名面零改动**：`SPEC_FROZEN_SURFACE` 仅把 `BuildStyleSheet`／`buildStyleSheet` 两条 `status`
由 `pending` 翻成 `implemented` → 落地后 **implemented 130／pending 0**（130 条不变）；三处同步
（清单 `src/spec/index.ts:79-80` ↔ 契约 §3.2 标记区 doc:269-270 ↔ `test-d/contract-signatures.ts:219`
的 `Absent<>` → `Present<>` ＋ 追加 `_S09b` 出口类型锁）。

**测试与证据**：`packages/base-render/test/style.test.mjs` **23 用例**（逐 token 逐值／`:root` 与契约
逐字节／8 区覆盖／类名双向对齐／charts 复用／`extraCss` 末尾追加与同源／`fillTemplate` 跨票联调不抛
`asset-missing`／撞车负控／壳层不越界）；可复跑证据
`docs/research/t75-{style,publish,mutation,visual}-evidence.{md,mjs}`（发布面 **19/19**：真打 tarball →
解包 → 从发布产物 import 并调用；变异自证 **6/6**；浏览器 computed **42/42**，无浏览器则显式 exit 1）。
门禁：`pnpm build`／`pnpm boundaries`／`pnpm snapshot:check`／`pnpm publish:pre` 四条 exit 0；
`pnpm test` **新增失败 = 0**（判据 = `.scratch/t75/baseline-failing.txt` 的 21 条既有失败逐名比对）。

**偏离记账**：① 契约 doc:295「技能现有私有 CSS 串随 #75 删除」**本票不执行**（4 技能尚未依赖
base-paint，删除即破坏其 HTML 输出，且 #96 门未建）→ 落点 = #96 门 → #108–#113 真迁移
（契约 doc:295 已补**落点注记**，见返修台账 FX-75-10）；
② `packages/base-render/style/tokens.css`（49 B）**保留不动**（非契约资产、不在 `files`、
是 `--ilife-font` 唯一落点，C-21 禁新增 token 名）；③ charts CSS **双份注入**（`buildChartsHelpersJs`
自注入 `<style id="ilife-charts">` ＋ 本票 `sharedCssText` 含 charts 区）——同源、幂等、无命名空间分裂，
属**已知记账**；④ 验收② 本票只给**代理证据**（6 个 calorie 模板预包裹 `<!--SHARED-CSS-->`，直接
`fillTemplate` 必抛 `marker-missing`，真实模板取证待 #107）；⑤ 契约 doc:973 称「`pnpm publish:plan`
的 tarball 含契约资产」——实测该命令只打印发布计划、不做 tarball 内容断言，**措辞待校正**，
本票以真打 tarball 取证。

---

## 返修（A1 PASS 87／A2 FAIL 77 → 编排者裁定返修；契约 §8.11.1 台账 FX-75-1…FX-75-10）

- **S1 · 运行时 toast 布局回归**：`.ilife-toast{flex-wrap:wrap}` ＋ `.ilife-toast-title-detail{flex:1 1 100%}`
  （helpers 运行时 DOM 无 `.ilife-toast-body` 包裹）；`.ilife-toast-body` 改 `flex:1 1 0%` 防静态侧折行。
  浏览器实测：运行时 `rt_title_top=621／rt_detail_top=653／rt_toast_h=113px`，静态仍 `404/404/404` 单行。
- **圆角越集 ＋ 证据断言被私自放宽**：`.ilife-toast-count` 圆角 `6px → 8px`；视觉脚本恢复**严格集**
  `{8,14,20,999,50%}`（仅 charts 段豁免 `2px`）→ 变异 M10（改回 6px）使视觉脚本变红。
- **T8／T10 对「基座规则整条删除」不敏感**：新增 `ruleBlocks()` ＋ `SECTION_BASE_RULE`（基座规则块 ＋
  声明数下限）；T8／T10 改规则块选择器级断言 → 变异 M6／M7／M8 均红。
- **statusBadge 逐值偏离**：对齐施工单 B §1.4（`gap:6px`／`padding:6px 14px`／`font-size:13px`／`width:fit-content`）。
- **errorReceipt 按钮布局不等价**：改 grid 2 列 ＋ `.ilife-copy-btn-wide{grid-column:1/-1}`
  （实测 `retry_w=1337px＝容器宽`、`ghost_w=665px ≈ (1337−8)/2`）。
- **H-04 取证漏段**：`nonCharts` 改为「除 charts 段外的全部产出文本」（含 helpShell 段）。
- **`DSH_BROWSER` 无效值静默回落**：显式设置但不存在 → `exit 1`（变异探针 P1 自证）。
- **视觉证据无独立锚点**：新增对契约 doc:276-288 `:root` 块的**外部 oracle 逐字断言** → 变异 M11
  （`--blue → #123456`）使视觉脚本变红。
- **`extraCss` 无强制（D3 修订）**：命中 `:root`／`STYLE_FORBIDDEN_TOKENS`／深色区任一即抛**不导出**的
  `StyleSheetError`（`name`＋`code`），零新增对外导出；合法技能作用域块照常通过，未知 token 名不强制。

**返修后数字**：`style.test.mjs` **25 用例全绿**；视觉取证 **56/56**；变异自证 **15/15**（还原后 fail=0）；
发布面真打 tarball **22/22**（新增发布产物上的 extraCss 三禁断言）；四门 exit 0；冻结面仍 **130 条**
（implemented 130／pending 0）。

---

## 第二轮返修（R1 FAIL 82／R2 PASS 84 → 编排者裁定再返修；契约 §8.11.2 台账 FX-75-11…FX-75-18）

- **S2 · 运行时 toast 关闭按钮被挤到第 3 行（新引入缺陷，根因修）**：helpers 运行时 DOM 缺
  `.ilife-toast-body`／`.ilife-toast-title-row` 包裹 → 与静态产出器／旧层**结构对齐**
  （`icon? + .toast-body(> .toast-title-row ＋ 可选 .toast-title-detail) + .toast-close`），
  类名常量提到模块级供两侧共用；**删除**全部权宜补丁（`flex-wrap`／`flex:1 1 100%`／`body{flex:1 1 0%}`）。
  浏览器实测 `rt_close_top === rt_title_top`（关闭按钮与标题同行）、`rt_toast_h=58px`（旧缺陷 113px）。
- **S2 · `statusBadge` 颜色溯源不实**：改回旧 `.hm-status` 逐值**实色**（ok `#e6f7ec`/`#1f8c3d`、
  warn `#fff5e0`/`#a25b00`、danger `#fff0ee`/`#a83228`、empty `#f0f0f3`），注释与实现一致。
- **S2 · H-16 `copied` 变绿缺失**：新增 `.ilife-copy-btn.copied{border-color:var(--ok);background:var(--ok);
  color:var(--card)}`（弹簧 450ms 已在基座）；**运行时加类移交** #88／#91 或另开票。
- **S2 · toast 入场动效缺失**：新增 CSS-only `@keyframes <prefix>toast-in`（`scale(.9)→1`／`opacity 0→1`）
  ＋ `.ilife-toast{animation:… both}`，**不依赖 JS 加 `.show`**；`prefers-reduced-motion: reduce` 下归零。
- **S3 · `.ilife-error-actions` 缺旧 `.hm-actions` 的 `max-width:520px;margin:0 auto`**：补上，
  并把 `gap:8px` 改为 `row-gap:14px;column-gap:8px`（旧 `.hm-actions + .hm-actions{margin-top:14px}`）。
- **S3 · `assertExtraCss` 假阳性**：判定前剥 CSS 注释（注释里的 `:root` 不再误拦）；禁入 token 改
  **边界匹配**（`--pinkish`／`--r-xlarge` 不再误拦，`/*c*/:root{}` 仍拦）。
- **S3 · 变异脚本判据弱**：只从**失败行**取判据名（`✖` 行／`**FAIL**` 表行），不再被 `✔ <同名>` 命中。
- **S3 · 窄屏未真跑 375px**：改 iframe 宽 375（`--window-size=375` 实测 `innerWidth=526`），
  `H-12e` 改结构判据 ＋ `B-12j`／`B-12k` 合并为逐值判据。
