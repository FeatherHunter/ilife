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

/** 五个占位符的逐字写法（唯一真相源；文档 §3.1 是它的投影）。 */
export const TEMPLATE_MARKERS = Object.freeze({
  injectData: '<!--INJECT-DATA-->',
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

/** 每个标记的逐字写法与数量约束（AC-6／AC-12）。 */
export const MARKER_RULES = Object.freeze({
  injectData: { literal: TEMPLATE_MARKERS.injectData, rule: 'exactly-one', required: true, exemptable: false },
  sharedHelpers: { literal: TEMPLATE_MARKERS.sharedHelpers, rule: 'exactly-one', required: true, exemptable: true },
  sharedCss: { literal: TEMPLATE_MARKERS.sharedCss, rule: 'exactly-one', required: true, exemptable: true },
  chartsHelpers: { literal: TEMPLATE_MARKERS.chartsHelpers, rule: 'zero-or-one', required: false, exemptable: false },
  noShared: { literal: TEMPLATE_MARKERS.noShared, rule: 'zero-or-one-exempt', required: false, exemptable: false },
} as const satisfies Record<TemplateMarkerKey, MarkerRuleSpec>);

/** 注入顺序（逐字对齐旧 §7「SHARED(JS) → SHARED-CSS → CHARTS → DATA」）。 */
export const INJECTION_ORDER = ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData'] as const;

export type InjectionStep = (typeof INJECTION_ORDER)[number];

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

/** `--strict` 时对 data 做零依赖信封校验的字段表（AC-13：base-paint 自持）。 */
export const STRICT_ENVELOPE_FIELDS = ['version', 'skill', 'shape', 'key', 'data'] as const;
/** 与 base-link-core `ENVELOPE_SHAPES` 逐字一致，漂移由签名测试钉死。 */
export const STRICT_ENVELOPE_SHAPES = ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback'] as const;

/** 填充器错误码（失败一律抛错，不返空页）。
 *
 * `data-missing` = `data === undefined` 或不可 JSON 序列化（洞 12 口径）；
 * `container-missing` = 模板缺自带 payload 容器，或容器 id／type 与声明不符（FX-2 硬约束）。
 */
export const TEMPLATE_ERROR_CODES = [
  'marker-missing',
  'marker-duplicate',
  'marker-conflict',
  'data-missing',
  'container-missing',
  'asset-missing',
  'strict-invalid',
] as const;

export type TemplateErrorCode = (typeof TEMPLATE_ERROR_CODES)[number];

export interface TemplateErrorShape {
  readonly name: 'TemplateError';
  readonly code: TemplateErrorCode;
  readonly marker?: TemplateMarkerKey;
  readonly message: string;
}

/** 注入物：base-paint 产出的共享 JS／CSS 文本（技能不得自填，B3）。
 *
 * `sharedHelpersJs` 的**唯一产出签名** = `buildSharedHelpersJs(input?)`（§3.3，归 #76）；
 * `sharedCssText` 的唯一产出签名 = `buildStyleSheet().css`（§3.2，归 #75）。
 * 二者为空串 → `asset-missing`（产出者为空串视为实现缺陷）。
 */
export interface TemplateAssets {
  readonly sharedHelpersJs: string;
  readonly sharedCssText: string;
  readonly chartsHelpersJs?: string;
}

export interface FillTemplateInput {
  readonly template: string;
  readonly assets: TemplateAssets;
  /** 场景数据：由技能包提供，填充器只注入与校验，不生产数据（AC-12）。 */
  readonly data: unknown;
  /** true = 除数量规则外，追加信封结构校验（旧 `--strict-payload` 语义）。 */
  readonly strict?: boolean;
  /** 期望的容器 id；缺省 `DEFAULT_DATA_SCRIPT_ID`（`'payload'`）。只用于校验自带容器与 report。 */
  readonly dataScriptId?: string;
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
