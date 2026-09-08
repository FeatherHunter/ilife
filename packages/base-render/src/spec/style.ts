/** base-paint/spec/style：共享样式资产契约（#75 冻结面）。
 *
 * 冻结的**旧 token A 组 11 个**（AC-9，来源旧 `assets/base.css:13-23` 实测）；
 * 与既有 `src/style.ts` 的 9 个深色 JS token（`STYLE_TOKENS`）**不同物**：
 * 后者是既有渲染契约，前者是注入 HTML 的 CSS 变量表。
 *
 * 红线：样式只抖 base-paint；类名前缀 `ilife-`；单品包禁自带样式常量。
 * Q14：不得引入 `--r-xl`／`--pink`／深色区。
 */

/** 旧 token A 组逐值（11 个；`--blue: #007aff` 与 Q12 锁定的 B1 主色一致）。 */
export const CSS_VAR_TOKENS = Object.freeze({
  '--fg': '#1d1d1f',
  '--fg2': '#6e6e73',
  '--fg3': '#86868b',
  '--bg': '#f5f5f7',
  '--card': '#ffffff',
  '--line': '#d2d2d7',
  '--blue': '#007aff',
  '--blue2': '#0a63ce',
  '--soft': '#f5f8ff',
  '--ok': '#34c759',
  '--shadow': '0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06)',
} as const);

export type CssVarName = keyof typeof CSS_VAR_TOKENS;

/** 样式表版本（B8 统一版本口径由 §5 机制决定）。 */
export const STYLE_SHEET_ID = 'ilife-base';

/** 控件样式区边界：每个区一个类名命名空间（自动加 `STYLE_PREFIX`）。 */
export const CONTROL_STYLE_SECTIONS = [
  'toast',
  'actionBar',
  'copyButton',
  'statusBadge',
  'emptyState',
  'errorReceipt',
  'charts',
  'helpShell',
] as const;

export type ControlStyleSection = (typeof CONTROL_STYLE_SECTIONS)[number];

/** Q14 禁入 token（出现即契约缺陷）。 */
export const STYLE_FORBIDDEN_TOKENS = ['--r-xl', '--pink'] as const;

export interface StyleSheetInput {
  /** 缺省既有 `STYLE_PREFIX`（`ilife-`）。 */
  readonly prefix?: string;
  /** 附加 CSS 文本；不得重定义 token、不得出现禁入 token。 */
  readonly extraCss?: string;
}

export interface StyleSheetOutput {
  readonly css: string;
  readonly tokens: readonly CssVarName[];
  readonly prefix: string;
  readonly version: string;
}

/** 冻结签名：`buildStyleSheet(input?: StyleSheetInput): StyleSheetOutput`。 */
export type BuildStyleSheet = (input?: StyleSheetInput) => StyleSheetOutput;
