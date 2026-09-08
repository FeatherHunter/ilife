/** base-paint/spec/template：占位符契约与统一填充器（#74 冻结面）。
 *
 * 本文件是**冻结的共享层契约类型**（type-only + 纯数据常量），与
 * `src/contract.ts`（既有渲染契约 envelope→HTML）**不同物**。
 *
 * 命名红线（AC-1）：`injector` 一词专指 sidebar 槽位装配
 *（`src/injector.ts`：mountInjector／SlotsPort／openPage）。HTML 占位符
 * 填充器对外名 **fillTemplate**，落点 `src/template.ts`。
 * 禁止用法：htmlInjector／injectHtml／injectPlaceholders／htmlTemplateInjector。
 *
 * 依赖红线（AC-13）：本文件只许 `import type`；base-paint 不得运行时依赖
 * base-link-core（tooling/check-boundaries.mjs L15）。
 */

/** 六个占位符的逐字写法（唯一真相源；文档 §3.1 是它的投影）。
 *
 * `content` 是 #118 收归契约的**正文槽位**（`<!--CONTENT-->`）。溯源：旧基线
 * `D:/2Study/StudyNotes/SKILLS/卡路里` 73 个模板**零命中**——它不是旧 v1.30 能力，
 * 而是**新架构发明的槽位**，由本仓 4 个技能（bill／chef／home／schedule）各自私有
 * `CONTENT_MARKER` 事实使用（53 个内容页），#118 把它收归共享层唯一真相源。
 */
export const TEMPLATE_MARKERS = Object.freeze({
  injectData: '<!--INJECT-DATA-->',
  content: '<!--CONTENT-->',
  sharedHelpers: '<!--SHARED-HELPERS-->',
  sharedCss: '<!--SHARED-CSS-->',
  chartsHelpers: '<!--CHARTS-HELPERS-->',
  noShared: '<!--NO-SHARED-->',
} as const);

export type TemplateMarkerKey = keyof typeof TEMPLATE_MARKERS;
export type TemplateMarkerLiteral = (typeof TEMPLATE_MARKERS)[TemplateMarkerKey];

/** 数量规则：exactly-one 硬拦截；zero-or-one 可选；zero-or-one-exempt 豁免通道。 */
export type MarkerRule = 'exactly-one' | 'zero-or-one' | 'zero-or-one-exempt';

export interface MarkerRuleSpec {
  readonly literal: string;
  readonly rule: MarkerRule;
  /** 未声明 NO-SHARED 时是否必须出现。 */
  readonly required: boolean;
  /** 声明 NO-SHARED 后是否允许缺席。 */
  readonly exemptable: boolean;
}

/** 每个标记的逐字写法与数量约束（AC-6／AC-12／#118 D-1…D-2）。
 *
 * `injectData` 由 `exactly-one`／`required: true` **放宽**为 `zero-or-one`／`required: false`
 * ——这是 #118 授权放宽的既有签名之一（第 2 处为 `FillTemplateInput.data?`，D-8 裁定 2），理由：数据页与内容页是**互斥的两类模板**，
 * 数量约束改由载荷槽规则 `PAYLOAD_SLOT_RULE` 承担（恰有其一）。
 */
export const MARKER_RULES = Object.freeze({
  injectData: { literal: TEMPLATE_MARKERS.injectData, rule: 'zero-or-one', required: false, exemptable: false },
  content: { literal: TEMPLATE_MARKERS.content, rule: 'zero-or-one', required: false, exemptable: false },
  sharedHelpers: { literal: TEMPLATE_MARKERS.sharedHelpers, rule: 'exactly-one', required: true, exemptable: true },
  sharedCss: { literal: TEMPLATE_MARKERS.sharedCss, rule: 'exactly-one', required: true, exemptable: true },
  chartsHelpers: { literal: TEMPLATE_MARKERS.chartsHelpers, rule: 'zero-or-one', required: false, exemptable: false },
  noShared: { literal: TEMPLATE_MARKERS.noShared, rule: 'zero-or-one-exempt', required: false, exemptable: false },
} as const satisfies Record<TemplateMarkerKey, MarkerRuleSpec>);

/** 载荷槽规则（#118 D-2／A2，**机读**）：`injectData`（数据页）与 `content`（内容页）**恰有其一**。
 *
 *  - 两者都有 → `conflictCode`（`marker-conflict`）；
 *  - 两者都无 → `missingCode`（`marker-missing`）；
 *  - 恰有其一 → 合法（再按 `TEMPLATE_KIND_RULE` 定分型）。
 *
 * 事实依据：全仓 65 个模板**零冲突**（无任何一个同时含两标记，见
 * `docs/research/t118-template-inventory.md` §2，**已入仓**；原 `.scratch/t118/template-inventory.md`
 * 是归档前旧位置、勿据此取件）；6 个数据页的 `INJECT-DATA` 全部落在
 * 自带容器内，53 个内容页的 `CONTENT` 全部裸在 `:12`。
 *
 * 与 `TEMPLATE_CHECK_ORDER` 的关系：两槽**皆有**时由本规则报 `conflictCode`；两槽**皆无**时
 * 由本规则报 `missingCode`。若同一模板还命中别的条件，取 `TEMPLATE_CHECK_ORDER` 里**更靠前**的码
 * （首个命中即抛、不聚合）。
 */
export const PAYLOAD_SLOT_RULE = Object.freeze({
  members: ['injectData', 'content'],
  rule: 'exactly-one',
  conflictCode: 'marker-conflict',
  missingCode: 'marker-missing',
} as const);

/** 模板三分型（#118 D-6／A5）：数据页／内容页／遗留（契约外资产）。 */
export const TEMPLATE_KINDS = ['data-page', 'content-page', 'legacy'] as const;

export type TemplateKind = (typeof TEMPLATE_KINDS)[number];

/** 分型判定规则（**机读**）：`required` 各恰 1 次且 `forbidden` 各 0 次即命中该型。
 *
 *  三型**穷尽且互斥**——但**仅对合法模板（计数 ∈ {0,1}）成立**：恰有其一载荷槽 →
 *  `data-page`／`content-page`；两者皆无 → `legacy`；两者皆有 → 三型皆不命中，报
 *  `noKindCode`（三型同值，恒等于 `PAYLOAD_SLOT_RULE.conflictCode` = `marker-conflict`）。
 *  计数 > 1 的模板**不属分型判定面**（本规则只对 0／1 次计数试配），由 `TEMPLATE_CHECK_ORDER`
 *  的**首个命中码**报错（数量 > 1 → `marker-duplicate`，见契约 §3.1.2⑤）。
 *
 *  `legacy` 的口径：**契约外的遗留资产**——按本规则判定的「两载荷槽皆无」，调用 `fillTemplate`
 *  抛 `marker-missing` 是**正确行为**（不该能填）；**payload 容器不是分型判据**（容器只由
 *  `CONTAINER_CHECK_RULE` 在含 `injectData` 时校验）。本仓 6 个 calorie 模板属此型，
 *  处置归 #107（DESIGN D-3）。
 */
export const TEMPLATE_KIND_RULE = Object.freeze({
  'data-page': { required: ['injectData'], forbidden: ['content'], noKindCode: 'marker-conflict' },
  'content-page': { required: ['content'], forbidden: ['injectData'], noKindCode: 'marker-conflict' },
  legacy: { required: [], forbidden: ['injectData', 'content'], noKindCode: 'marker-conflict' },
} as const satisfies Record<TemplateKind, {
  readonly required: readonly TemplateMarkerKey[];
  readonly forbidden: readonly TemplateMarkerKey[];
  /** 三型皆不命中（两载荷槽皆有）时的错误码。 */
  readonly noKindCode: TemplateErrorCode;
}>);

/** 注入顺序（逐字对齐旧 §7「SHARED(JS) → SHARED-CSS → CHARTS → DATA」）。
 *
 * `content` **不在**本数组内（#118 显式记账）：`INJECTION_ORDER` 是**既有冻结签名**、
 * 只许追加不允许改。**正文替换与四个资产／数据步之间无先后语义**（#118 FX-6 统一口径）：
 * 载荷槽两成员**互斥**（`PAYLOAD_SLOT_RULE`），任一模板至多出现 `content` 与 `injectData` 之一，
 * 故两者不会对同一文本竞争同一位置；`content` 既不占本数组的位置，**也不是**「恒为最后一步」。
 */
export const INJECTION_ORDER = ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData'] as const;

export type InjectionStep = (typeof INJECTION_ORDER)[number];

/** 共享资产的包裹约定（#118 D-5／A4，**方案 i**：资产裸文本 ＋ 填充器负责包裹）。
 *
 *  两个**不变量**（违反即抛 `TemplateError`，判定谓词见 `WRAP_PREDICATES`）：
 *  ① **资产不得自带包裹标签**——`TemplateAssets` 三个值恒为裸文本，违者报 `assetWrappedCode`；
 *  ② **三个共享资产标记不得被预包裹**——作用域**限定为 `ASSET_WRAPPERS` 的键集**
 *     （`sharedCss`／`sharedHelpers`／`chartsHelpers`），**排除 `injectData`**：payload 容器是
 *     **必需项**（`CONTAINER_CHECK_RULE`），不是「预包裹」；`content`／`noShared` 不在作用域内。
 *     违者报 `markerPreWrappedCode`。
 *
 *  与旧基线的**偏离（显式记账）**：旧 `公共组件/README.md:63` 规定「占位符必须放在独立
 *  `<script>`／`<style>` 块内」（模板自带包裹），本契约**有意偏离**为填充器包裹；理由与
 *  迁移代价见契约 §4.5（迁移面 12 个模板 vs 53～59 个）。parity 不受影响：两种约定产出的
 *  HTML 可完全一致。
 */
export const ASSET_WRAP_RULE = Object.freeze({
  /** 不变量①：三个资产文本不得自带包裹标签。 */
  assetsBare: true,
  /** 包裹标签由填充器统一写；模板与技能侧不得预包。 */
  fillerWraps: true,
  /** 不变量②：三个共享资产标记不得被预包裹（作用域见 `WRAP_PREDICATES`）。 */
  forbidPreWrappedMarker: true,
  /** 违反不变量①的错误码（资产不可用）。 */
  assetWrappedCode: 'asset-missing',
  /** 违反不变量②的错误码（标记与包裹约定冲突）。 */
  markerPreWrappedCode: 'marker-conflict',
} as const);

/** 三个资产的**逐字**包裹标签（唯一真相源；键与 `TemplateAssets` 对齐）。
 *
 *  填充器据此把裸资产包成：`sharedCssText` → `<style>` ＋ 文本 ＋ `</style>`；
 *  `sharedHelpersJs`／`chartsHelpersJs` → `<script>` ＋ 文本 ＋ `</script>`。
 *  只许引本常量，不得在实现里另写字面量（第二真相）。
 */
export const ASSET_WRAPPERS = Object.freeze({
  sharedCssText: { openTag: '<style>', closeTag: '</style>' },
  sharedHelpersJs: { openTag: '<script>', closeTag: '</script>' },
  chartsHelpersJs: { openTag: '<script>', closeTag: '</script>' },
} as const satisfies Record<keyof TemplateAssets, { readonly openTag: string; readonly closeTag: string }>);

/** 资产键 → 标记键（**唯一映射**，避免「资产键」与「标记键」各写一份、漂移无从发现）。
 *
 *  不变量②的作用域按**标记键**表述（`WRAP_PREDICATES.forbidPreWrappedMarker.scope`），
 *  而包裹标签按**资产键**表述（`ASSET_WRAPPERS`）——本常量是两者之间唯一的桥。
 */
export const ASSET_MARKER_KEYS = Object.freeze({
  sharedCssText: 'sharedCss',
  sharedHelpersJs: 'sharedHelpers',
  chartsHelpersJs: 'chartsHelpers',
} as const satisfies Record<keyof TemplateAssets, TemplateMarkerKey>);

/** 两条包裹不变量的**判定谓词**（#118 FX-3，机读；**唯一一份实现**）。
 *
 *  作用域（`scope`）＋ 判定方式（`method`）＋ 错误码（`code`）三者由本常量冻结：
 *
 *  ① `assetsBare`（不变量①，`ASSET_WRAP_RULE.assetsBare`）：`scope` = `ASSET_WRAPPERS` 的键集
 *     （三个资产文本）。判定方式 `trim-prefix-or-suffix` = **资产文本 `trim()` 后，以任一
 *     `ASSET_WRAPPERS[*].openTag` 起 或 以任一 `closeTag` 止** → 违反。
 *     **不得**用子串命中（`includes`）：helpers JS 合法含 `<script>` 字面量（拼接 HTML），
 *     子串判定会误报。仅在该资产**被消费的标记存在**时校验（豁免缺席不校验）。
 *  ② `forbidPreWrappedMarker`（不变量②，`ASSET_WRAP_RULE.forbidPreWrappedMarker`）：
 *     `scope` = `ASSET_MARKER_KEYS` 的值集（三个共享资产标记），`excludes` = `['injectData']`。
 *     判定方式 `enclosing-open-tag` = 对**每一个**标记出现处，扫描其**左侧全部前缀文本**
 *     （不限同行，故同行与跨行两种形态都命中）：若最近的未闭合 `<style`／`<script` 开标签
 *     存在（即 `lastIndexOf(openTag 的标签名形式) > lastIndexOf(对应 closeTag)`）→ 违反。
 *
 *  #74 与 `tooling/classify-templates.mjs` **共用**本常量；**禁止第二份实现**（契约 §3.1.2④）。
 */
export const WRAP_PREDICATES = Object.freeze({
  assetsBare: {
    scope: ['sharedCssText', 'sharedHelpersJs', 'chartsHelpersJs'],
    method: 'trim-prefix-or-suffix',
    code: 'asset-missing',
  },
  forbidPreWrappedMarker: {
    scope: ['sharedCss', 'sharedHelpers', 'chartsHelpers'],
    excludes: ['injectData'],
    method: 'enclosing-open-tag',
    code: 'marker-conflict',
  },
} as const);

/** payload 容器**由模板自带**，逐字形态（旧 `injector.py:119-120` 同形态）：
 *  `<script id="payload" type="application/json"><!--INJECT-DATA--></script>`。
 *
 * 填充器**只把 `<!--INJECT-DATA-->` 标记文本替换为 JSON 字符串**，**不生成／不补写容器标签**
 * （生成包裹会与自带容器双包）。本两个常量的用途是**校验模板自带容器**：容器存在则断言
 * id／type 与 `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`（或 `FillTemplateInput.dataScriptId`）匹配；
 * 容器缺失或 id／type 不符 → 抛 `TemplateError` code `container-missing`（message 区分两因）。
 */
export const DEFAULT_DATA_SCRIPT_ID = 'payload';
export const DATA_SCRIPT_TYPE = 'application/json';

/** 容器校验的作用域（#118 FX-1，机读）：**仅当模板含 `appliesWhenMarker`（`injectData`）时执行**。
 *
 *  依据：53 个内容页**没有** payload 容器且要求模板零改动（§3.1.2④①），按无条件容器校验会
 *  使 53/65 模板全抛 `container-missing`。因此条文与 `data`／`strict` 的收窄写法对齐：
 *  **无 `<!--INJECT-DATA-->` → 不校验容器 → 不可能抛 `container-missing`**。
 *  `openTag`／`closeTag` 复用 `ASSET_WRAPPERS`（容器与 JS 包裹同为一对 `<script>`／`</script>`，
 *  不另写字面量）；`id`／`type` 复用 `DEFAULT_DATA_SCRIPT_ID`／`DATA_SCRIPT_TYPE`。
 */
export const CONTAINER_CHECK_RULE = Object.freeze({
  appliesWhenMarker: 'injectData',
  openTag: ASSET_WRAPPERS.sharedHelpersJs.openTag,
  closeTag: ASSET_WRAPPERS.sharedHelpersJs.closeTag,
  id: DEFAULT_DATA_SCRIPT_ID,
  type: DATA_SCRIPT_TYPE,
  code: 'container-missing',
} as const);

/** `--strict` 时对 data 做零依赖信封校验的字段表（AC-13：base-paint 自持）。 */
export const STRICT_ENVELOPE_FIELDS = ['version', 'skill', 'shape', 'key', 'data'] as const;
/** 与 base-link-core `ENVELOPE_SHAPES` 逐字一致，漂移由签名测试钉死。 */
export const STRICT_ENVELOPE_SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'] as const;

/** 填充器错误码（失败一律抛错，不返空页）。
 *
 * `data-missing` = `data === undefined` 或不可 JSON 序列化（洞 12 口径）；
 * `content-missing` = 模板含 `<!--CONTENT-->` 但调用方未提供 `content`（#118 D-5，与 `data-missing` 对称）；
 * `container-missing` = 模板含 `<!--INJECT-DATA-->` 但缺自带容器，或容器 id／type 与声明不符
 * （`CONTAINER_CHECK_RULE`；**无 `INJECT-DATA` 的模板不校验容器**，FX-1）。
 *
 * **一码多义必须由 `message` 辨因**（#118 FX-10①，不改码）：
 *  - `asset-missing`：① 资产为空串 ② 资产**自带包裹标签**（不变量①，`WRAP_PREDICATES.assetsBare`）；
 *  - `marker-conflict`：① 两载荷槽皆有 ② `NO-SHARED` 与 SHARED 并存 ③ 标记被**预包裹**
 *    （不变量②，`WRAP_PREDICATES.forbidPreWrappedMarker`）。
 *
 * 只**追加**（#118 A3）：既有 7 个逐字、逐序不变，`content-missing` 追加在**末尾**。
 */
export const TEMPLATE_ERROR_CODES = [
  'marker-missing',
  'marker-duplicate',
  'marker-conflict',
  'data-missing',
  'container-missing',
  'asset-missing',
  'strict-invalid',
  'content-missing',
] as const;

export type TemplateErrorCode = (typeof TEMPLATE_ERROR_CODES)[number];

/** **唯一判定次序**（#118 FX-2，机读）：8 个错误码的先后，**首个命中即抛、不聚合**。
 *
 *  填充器按本数组顺序逐阶段判定，命中即抛对应 `code`；同一输入同时满足多个条件时，
 *  **只有本数组里最靠前的那个码**被抛出（不聚合、不并发报告）。
 *
 *  逐阶段触发条件（契约 §3.1.2⑤ 逐条对齐）：
 *  ① `marker-duplicate`：任一标记出现 > 1 次（`MARKER_RULES` 数量规则）；
 *  ② `marker-missing`：必需标记缺席且未豁免，或载荷槽两成员皆无（`PAYLOAD_SLOT_RULE.missingCode`）；
 *  ③ `marker-conflict`：两载荷槽皆有（`PAYLOAD_SLOT_RULE.conflictCode`）／`NO-SHARED` 与 SHARED 并存／
 *     共享资产标记被预包裹（`WRAP_PREDICATES.forbidPreWrappedMarker`）；
 *  ④ `container-missing`：**含 `injectData` 时**缺自带容器或 id／type 不符（`CONTAINER_CHECK_RULE`）；
 *  ⑤ `asset-missing`：被消费的资产为空串或自带包裹标签（`WRAP_PREDICATES.assetsBare`）；
 *  ⑥ `data-missing`：数据页 `data === undefined` 或不可 JSON 序列化；
 *  ⑦ `content-missing`：内容页 `content === undefined`；
 *  ⑧ `strict-invalid`：`strict: true` 且信封校验失败。
 *
 *  与既有措辞的一致性：本次序使真实 calorie 模板（两载荷槽皆无 ＋ SHARED-CSS 预包裹）
 *  抛 **`marker-missing`**（② 早于 ③），与 §6.1／§3.1.2③ 的点名一致。
 */
export const TEMPLATE_CHECK_ORDER = [
  'marker-duplicate',
  'marker-missing',
  'marker-conflict',
  'container-missing',
  'asset-missing',
  'data-missing',
  'content-missing',
  'strict-invalid',
] as const satisfies readonly TemplateErrorCode[];

export interface TemplateErrorShape {
  readonly name: 'TemplateError';
  readonly code: TemplateErrorCode;
  readonly marker?: TemplateMarkerKey;
  readonly message: string;
}

/** 注入物：base-paint 产出的共享 JS／CSS 文本（技能不得自填，B3）。
 *
 * 三个资产的**唯一产出签名**（各只有一个产出者，#74 只消费）：
 *  - `sharedHelpersJs` ← `buildSharedHelpersJs(input?)`（§3.3，归 #76）；
 *  - `sharedCssText` ← `buildStyleSheet().css`（§3.2，归 #75）；
 *  - `chartsHelpersJs` ← `buildChartsHelpersJs(input?)`（§3.5，归 #78，FX-22）。
 * 三者为空串 → `asset-missing`（产出者为空串视为实现缺陷）；产出 JS 文本的内容契约见
 * `SHARED_HELPERS_JS_RULE`（§3.3，FX-18）。
 */
export interface TemplateAssets {
  readonly sharedHelpersJs: string;
  readonly sharedCssText: string;
  readonly chartsHelpersJs?: string;
}

export interface FillTemplateInput {
  readonly template: string;
  readonly assets: TemplateAssets;
  /** 场景数据：由技能包提供，填充器只注入与校验，不生产数据（AC-12）。
   *
   *  **数据页提供；内容页可省略**（#118 D-8 裁定 2：载荷槽模型使 `data` 与 `content`
   *  **同为条件字段**，故由必填放宽为 `data?: unknown`，与 `content?` 对称；属**追加式放宽**、
   *  向后兼容）。
   *  #118 口径：**只在模板含 `<!--INJECT-DATA-->` 时**校验（缺失／不可序列化 → `data-missing`）；
   *  内容页（含 `<!--CONTENT-->`）忽略本字段、也不读它。
   */
  readonly data?: unknown;
  /** true = 除数量规则外，追加信封结构校验（旧 `--strict-payload` 语义）。 */
  readonly strict?: boolean;
  /** 期望的容器 id；缺省 `DEFAULT_DATA_SCRIPT_ID`（`'payload'`）。**只用于校验自带容器**
   *  （`CONTAINER_CHECK_RULE.id`）——`FillTemplateReport` 无该字段，**不**写入 report
   *  （V3 H7 更正：旧 JSDoc 的「与 report」与冻结的 `FillTemplateReport` 矛盾）。 */
  readonly dataScriptId?: string;
  /** 正文槽位填充物（#118 D-3）：模板含 `<!--CONTENT-->` 时必填，缺失 → `content-missing`；
   *  数据页忽略本字段。内容页的 `data` 与数据页的 `content` 均为**忽略项**（互斥，见 `PAYLOAD_SLOT_RULE`）。 */
  readonly content?: string;
}

export interface MarkerReport {
  readonly key: TemplateMarkerKey;
  readonly literal: string;
  readonly rule: MarkerRule;
  readonly count: number;
  readonly filled: boolean;
}

/** 机器可读结果（对齐旧 CLI 结果 JSON 的 status/bytes 口径）。 */
export interface FillTemplateReport {
  readonly markers: readonly MarkerReport[];
  readonly strict: boolean;
  /** 模板声明了 `<!--NO-SHARED-->`（SHARED 两标记允许缺席）。 */
  readonly exempt: boolean;
  readonly bytes: number;
}

export interface FillTemplateOutput {
  readonly html: string;
  readonly report: FillTemplateReport;
}

/** 冻结签名：`fillTemplate(input: FillTemplateInput): FillTemplateOutput`。 */
export type FillTemplate = (input: FillTemplateInput) => FillTemplateOutput;
