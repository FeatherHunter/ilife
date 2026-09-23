/** style · sheet
 *
 *  样式表的**组装与校验**：8 区拼装 ＋ `extraCss` 三禁 ＋ `buildStyleSheet()`。
 *
 *  **住址**：目录化批次⑥把 `src/style.ts` 切成「一份令牌 ＋ 一个区一件 ＋ 一个组装器」，
 *  正文原样搬来；搬迁判据＝产物逐字节相同（`buildStyleSheet()` 的 css 全文 ＋ 出口名单），
 *  见 `docs/base/base-render/组件目录架构.md`。
 */

import { actionBarSection } from './action-bar.js';
import { copyButtonSection } from './copy-button.js';
import { emptyStateSection } from './empty-state.js';
import { errorReceiptSection } from './error-receipt.js';
import { helpShellSection } from './help-shell.js';
import { LF, rootBlock, sectionSlug } from './parts.js';
import { statusBadgeSection } from './status-badge.js';
import { toastSection } from './toast.js';
import { STYLE_PREFIX, STYLE_VERSION, token } from './tokens.js';
import { chartsCss } from '../../charts.js';
import { BuildStyleSheet, CONTROL_STYLE_SECTIONS, CSS_VAR_TOKENS, ControlStyleSection, CssVarName, STYLE_FORBIDDEN_TOKENS, STYLE_SHEET_ID, StyleSheetInput } from '../../spec/style.js';

/** 各区 CSS 文本（闭集 `CONTROL_STYLE_SECTIONS` 的**唯一**实现处）。
 *  每区的类名逐条来自产出器实测（注释里给 `file:line`），**不许臆造未被使用的类名**。
 *  区实现住在同目录的 `<区名>.ts`（一件一区）；`charts` 仍是转调 `chartsCss()` 的一行。 */
const SECTION_BUILDERS: Record<ControlStyleSection, (prefix: string) => string> = {
  toast: toastSection,
  actionBar: actionBarSection,
  copyButton: copyButtonSection,
  statusBadge: statusBadgeSection,
  emptyState: emptyStateSection,
  errorReceipt: errorReceiptSection,
  charts: (p) => chartsCss(p),
  helpShell: helpShellSection,
};

/** 闭集漂移 fail-fast（与 `src/help.ts:90-93` 同口径）：`CONTROL_STYLE_SECTIONS`
 *  新增区名而本文件未补实现时，**导入即报错**，不会静默产出缺区样式表。 */
for (const section of CONTROL_STYLE_SECTIONS) {
  if (SECTION_BUILDERS[section] === undefined) {
    throw new Error('base-paint/style：CONTROL_STYLE_SECTIONS 闭集缺样式区实现（' + section + '）');
  }
}

/** 缺省前缀（`StyleSheetInput.prefix` 非法时回落，见 `normalizePrefix`）。 */
function normalizePrefix(input?: StyleSheetInput): string {
  const prefix = input === undefined || input === null ? undefined : input.prefix;
  return typeof prefix === 'string' && prefix !== '' ? prefix : STYLE_PREFIX;
}

/** `extraCss` 违规错误：**不导出**（与 #74 `TemplateError`／#76 `bad-input` 同口径——
 *  冻结面 `SPEC_FROZEN_SURFACE` 无该运行时条目，调用方按 `name`／`code` 判定）。
 *  code 三值 = 契约 doc:299-300 三条「不得」的落点：
 *  `extra-css-root`（改写基础 `:root`）／`extra-css-forbidden-token`（Q14 禁入项）／
 *  `extra-css-dark-scheme`（深色区选择器，doc:292）。 */
class StyleSheetExtraCssError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'StyleSheetError';
    this.code = code;
  }
}

/** CSS 块注释剥除（`/* … *\/` → 空格）：**判定前先剥注释**——注释里的 `:root`／`--pink` 只是说明文字，
 *  不是「改写基础／引入禁入项」；反之注释**不能**藏住真实声明（`/*c*\/:root{}` 剥后仍命中）。 */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, ' ');
}

/** **token 边界**匹配（返修 W6）：`--pink` 只匹配完整自定义属性名，`--pinkish`／`--pink-2` **不**命中
 *  （旧实现 `includes(forbidden)` 会把 `--pinkish` 误拦）。边界 = 前一个字符非 `[A-Za-z0-9_-]`、
 *  后一个字符非 `[A-Za-z0-9_-]`。 */
function hasBoundedToken(text: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
  return new RegExp('(^|[^A-Za-z0-9_-])' + escaped + '(?![A-Za-z0-9_-])').test(text);
}

/** `extraCss` 三禁强制（**编排者返修裁定：D3 修订**，见契约 §8.11）。
 *
 *  理由：契约 doc:299-300 的三条「不得」（不得改写基础值／不得引入 Q14 禁入项／不得引入深色区）
 *  此前**无任何落点**（D3 原裁定「不校验、纯调用方责任」）→ 本票补最小强制：
 *  - (a) 含 `:root` 选择器 → 改写基础；
 *  - (b) 含 `STYLE_FORBIDDEN_TOKENS`（`--r-xl`／`--pink`）；
 *  - (c) 含深色区选择器（`[data-theme`／`prefers-color-scheme: dark`）。
 *  命中**任一**即抛错；**合法技能作用域覆盖块**（`.ilife-<skill>{--blue:…}`）照常通过。
 *  **返修 W6（误拦两面）**：① 判定前先 `stripCssComments()`（注释里的 `:root` 不再误拦）；
 *  ② 禁入 token 改**边界匹配**（`--pinkish` 不再误拦）。**漏拦面**同时登记于契约 §8.11：
 *  三禁仍是**文本级**判定（不解析 CSS AST），`html{--blue:…}` 这类等价改写仍属调用方责任。
 *  **未知 token 名不强制**（契约未冻结 token 名闭集的判定方式 → 保持调用方责任，记账见 §8.11）。 */
function assertExtraCss(extraCss: string): void {
  if (extraCss === '') return;
  const code = stripCssComments(extraCss);
  // `:root` 是伪类名（CSS 伪类名大小写不敏感）→ 用 `/i` 拦住 `:ROOT` 之类的等价写法。
  if (/:root(?![A-Za-z0-9_-])/i.test(code)) {
    throw new StyleSheetExtraCssError('extra-css-root',
      'buildStyleSheet: extraCss 不得改写基础（命中 `:root` 选择器）；技能主题只许用 `.ilife-<skill>` 作用域覆盖块（契约 doc:299）');
  }
  for (const forbidden of STYLE_FORBIDDEN_TOKENS) {
    if (hasBoundedToken(code, forbidden)) {
      throw new StyleSheetExtraCssError('extra-css-forbidden-token',
        'buildStyleSheet: extraCss 不得引入 Q14 禁入 token（命中 ' + forbidden + '，契约 doc:292）');
    }
  }
  if (/\[\s*data-theme/i.test(code) || /prefers-color-scheme\s*:\s*dark/i.test(code)) {
    throw new StyleSheetExtraCssError('extra-css-dark-scheme',
      'buildStyleSheet: extraCss 不得引入深色区选择器（命中 `[data-theme` 或 `prefers-color-scheme: dark`，契约 doc:292）');
  }
}

/** 冻结签名：`buildStyleSheet(input?: StyleSheetInput): StyleSheetOutput`。
 *
 *  **同源**：不按技能名分支；任何技能主题差异只能来自调用方显式传入的 `extraCss`（doc:300）。
 *  `extraCss` **末尾原样追加**（不加工、不转义）；并执行**三禁强制**（D3 修订，见 `assertExtraCss`）：
 *  命中 `:root`／`STYLE_FORBIDDEN_TOKENS`／深色区任一 → 抛不导出的 `StyleSheetError`（带 `code`）。 */
export const buildStyleSheet: BuildStyleSheet = (input) => {
  const prefix = normalizePrefix(input);
  const extraCss = input === undefined || input === null || input.extraCss === undefined ? '' : String(input.extraCss);
  assertExtraCss(extraCss);
  const parts: string[] = [
    '/* base-paint 共享样式资产 · ' + STYLE_SHEET_ID + ' · v' + STYLE_VERSION + ' */',
    rootBlock(),
  ];
  for (const section of CONTROL_STYLE_SECTIONS) {
    parts.push('/* ' + sectionSlug(section) + ' */');
    parts.push(SECTION_BUILDERS[section](prefix));
  }
  if (extraCss !== '') parts.push(extraCss);
  return Object.freeze({
    css: parts.join(LF),
    tokens: Object.freeze(Object.keys(CSS_VAR_TOKENS) as CssVarName[]),
    prefix,
    version: STYLE_VERSION,
  });
};
