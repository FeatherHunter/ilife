/** base-paint/style：样式唯一真相源。
 *
 * 红线：样式只抖 render——改样式只改本文件，link-core/combos/单品包
 * 禁止自带样式常量。类名前缀统一 STYLE_PREFIX，token 表冻结。
 *
 * 本文件同时是 **#75 共享样式资产的唯一产出者**（契约 §3.2／§6.2）：
 * `buildStyleSheet()` 产出的 `css` 即 `<!--SHARED-CSS-->` 的填充物
 * （`input.assets.sharedCssText`，契约 `docs/base-paint-contract.md:163`）。
 * 逐条纪律（契约行号）：
 * - `:root` 的 11 个 token 逐值取 `CSS_VAR_TOKENS`（doc:273-289），**不自造第二份表**（doc:303）；
 * - 8 个样式区取 `CONTROL_STYLE_SECTIONS` 闭集（doc:295），类名自动加 `prefix`；
 * - 产出**不含** `STYLE_FORBIDDEN_TOKENS`（Q14）、**不含**深色区（doc:292）；
 * - `charts` 区文本**复用** `charts.ts` 的唯一产出者 `chartsCss`，**不得重述**（#78 结论）；
 * - 与既有 `STYLE_TOKENS`（9 个深色 JS token）**并存**、语义互不覆盖（doc:293）；
 * - `extraCss` 末尾**原样追加**、**不按技能名分支**（doc:299-300），并执行**三禁强制**
 *   （`:root` 改写／Q14 禁入项／深色区 → 抛不导出的 `StyleSheetError`；D3 修订见 §8.11）。
 */

import { chartsCss } from './charts.js';
import { ACTION_BAR_DEFAULTS, TOAST_DEFAULTS } from './spec/index.js';
import { CONTROL_STYLE_SECTIONS, CSS_VAR_TOKENS, STYLE_FORBIDDEN_TOKENS, STYLE_SHEET_ID } from './spec/style.js';
import type {
  BuildStyleSheet,
  ControlStyleSection,
  CssVarName,
  StyleSheetInput,
  StyleSheetOutput,
} from './spec/style.js';

export const STYLE_PREFIX = 'ilife-';
export const STYLE_VERSION = '0.1.0';

export const STYLE_TOKENS = Object.freeze({
  radius: 8,
  gap: 8,
  fontSize: 13,
  fg: '#e6edf3',
  muted: '#8b8b95',
  accent: '#c084fc',
  danger: '#f85149',
  border: '#2a2d35',
  bg: '#16181d',
});

export type StyleTokenName = keyof typeof STYLE_TOKENS;

/** 类名拼接（自动加前缀，falsy 跳过）。 */
export function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter((n): n is string => typeof n === 'string' && n.length > 0).map((n) => STYLE_PREFIX + n).join(' ');
}

/** 取 token（样式消费唯一入口，换肤时单点改）。 */
export function token(name: StyleTokenName): string {
  return String(STYLE_TOKENS[name]);
}

/* ── #75 共享样式资产（契约 §3.2／§6.2） ───────────────────────────────── */

/** 换行（仓库口径：`String.fromCharCode(10)`，不写字面 `\n`）。 */
const LF = String.fromCharCode(10);

/** 样式区名 → kebab 类名根（`actionBar` → `action-bar`）。
 *  **只用于生成注释头**：真实类名恒取各控件产出器里的字面量（见各区注释），
 *  区名 kebab 与类名根并非一一对应（如 `copyButton` 的类名根是 `copy-btn`、
 *  `emptyState` 是 `empty`、`errorReceipt` 是 `error`）——**不得**用本函数臆造类名。 */
function sectionSlug(section: ControlStyleSection): string {
  return section.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/** `:root` 的 11 个冻结 token 块：逐值取 `CSS_VAR_TOKENS`，顺序即常量声明序。
 *  形态与契约 doc:276-288 的 CSS 块一致（`name + ': ' + value` 带空格）。 */
function rootBlock(): string {
  const lines: string[] = [':root {'];
  for (const name of Object.keys(CSS_VAR_TOKENS) as CssVarName[]) {
    lines.push('  ' + name + ': ' + CSS_VAR_TOKENS[name] + ';');
  }
  lines.push('}');
  return lines.join(LF);
}

/** 页级基座（非控件区）：**本票不产**。
 *  裁定 R7／施工单 B-D2(a)：页面壳／KPI／表格／回到顶部等**无闭集归属**的样式归 #104
 *  （区块组件 owner），#75 只产 11 token ＋ 8 个闭集样式区；`extraCss` 语义被
 *  契约 doc:299-300 限死（只许技能作用域 token 覆盖块），**不得**塞壳层样式。 */

/** 主色 alpha 派生（`ghostBorderAlpha` 等）：RGB 与 `--blue` 同源（`#007aff`）。
 *  这是**派生字面量**、不是第二份 token 表（不新增 token 名，doc:299）。 */
const BLUE_RGB = '0, 122, 255';

/** 焦点环（视觉尺 H-20 强制项）：`:focus-visible` 覆盖全部可交互控件。 */
function focusRing(selector: string): string {
  return selector + ':focus-visible {' + LF + '  outline: 2px solid var(--blue);' + LF + '  outline-offset: 2px;' + LF + '}';
}

/** 各区 CSS 文本（闭集 `CONTROL_STYLE_SECTIONS` 的**唯一**实现处）。
 *  每区的类名逐条来自产出器实测（注释里给 `file:line`），**不许臆造未被使用的类名**。 */
const SECTION_BUILDERS: Record<ControlStyleSection, (prefix: string) => string> = {
  /** toast —— 类名产出者 `src/controls.ts:176-219`（静态）与 `:495-593`（helpers 运行时）。 */
  toast: (p) => [
    '.' + p + 'toast-stack {',
    '  position: fixed;',
    '  left: 50%;',
    '  bottom: calc(24px + env(safe-area-inset-bottom, 0px));',
    '  transform: translateX(-50%);',
    '  z-index: 9999;',
    '  display: flex;',
    '  flex-direction: column;',
    '  align-items: center;',
    '  gap: ' + TOAST_DEFAULTS.gapPx + 'px;',
    '  max-width: calc(100vw - 32px);',
    '  pointer-events: none;',
    '}',
    // `flex-wrap: wrap` ＋ 下面 `.ilife-toast-title-detail{flex:1 1 100%}` 是**运行时 DOM 的
    // 布局回归修复**：静态产出器（`controls.ts:216-221`）有 `.ilife-toast-body` 包裹，
    // 而 helpers 运行时 DOM（`controls.ts:577-596`）**没有**包裹 → 不换行时标题与详情被排成
    // flex 同行（A2 浏览器实测 `rt_title_top=14 / rt_detail_top=14`）。静态侧在 body 内不受影响
    // （`.ilife-toast-title-detail` 只由 helpers 产出，静态侧用的是 `.ilife-toast-detail`）。
    '.' + p + 'toast {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: flex-start;',
    '  gap: 12px;',
    '  box-sizing: border-box;',
    '  min-width: 300px;',
    '  max-width: 480px;',
    '  padding: 13px 14px 13px 16px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 14px;',
    '  background: var(--card);',
    '  color: var(--fg);',
    '  box-shadow: var(--shadow);',
    '  font-size: 12.5px;',
    '  line-height: 1.4;',
    '  font-feature-settings: "tnum";',
    '  pointer-events: auto;',
    '}',
    '.' + p + 'toast-danger {',
    '  border-color: rgba(255, 59, 48, .38);',
    '}',
    '.' + p + 'toast-icon {',
    '  flex: 0 0 auto;',
    '  padding-top: 1px;',
    '  font-size: 20px;',
    '  line-height: 1;',
    '}',
    // `flex-basis: 0%`（原 `auto`）：让 body 的**假定主尺寸**为 0，静态侧在 `flex-wrap: wrap`
    // 下也不会因内容 max-content 超宽而把 body 折到第二行（实测静态 toast 仍是单行 102px）。
    '.' + p + 'toast-body {',
    '  flex: 1 1 0%;',
    '  min-width: 0;',
    '}',
    '.' + p + 'toast-title-row {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px;',
    '}',
    '.' + p + 'toast-title {',
    '  margin-bottom: 2px;',
    '  color: var(--fg);',
    '  font-size: 12.5px;',
    '  font-weight: 600;',
    '  line-height: 1.4;',
    '}',
    // 运行时详情（helpers 产出 `.ilife-toast-title-detail`）：`flex-basis:100%` 强制独占一行，
    // 修掉「标题与详情同排」的回归；静态侧无此类名，不受影响。
    '.' + p + 'toast-title-detail {',
    '  flex: 1 1 100%;',
    '  color: var(--fg2);',
    '  font-size: 11px;',
    '  font-weight: 400;',
    '  line-height: 1.5;',
    '}',
    '.' + p + 'toast-chip {',
    '  flex-shrink: 0;',
    '  padding: 2px 8px;',
    '  border-radius: 999px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-size: 10px;',
    '  font-weight: 700;',
    '  letter-spacing: .02em;',
    '  line-height: 1.6;',
    '}',
    '.' + p + 'toast-chip-ok {',
    '  background: rgba(52, 199, 89, .12);',
    '  color: #1f8f3d;',
    '}',
    '.' + p + 'toast-chip-warn {',
    '  background: rgba(255, 149, 0, .12);',
    '  color: #b25000;',
    '}',
    '.' + p + 'toast-chip-danger {',
    '  background: rgba(255, 59, 48, .12);',
    '  color: #c0392b;',
    '}',
    '.' + p + 'toast-count {',
    '  flex-shrink: 0;',
    '  padding: 2px 8px;',
    '  border-radius: 8px;',
    '  color: var(--fg3);',
    '  font-size: 10px;',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '.' + p + 'toast-detail {',
    '  color: var(--fg2);',
    '  font-size: 11px;',
    '  line-height: 1.5;',
    '}',
    '.' + p + 'toast-lines {',
    '  color: var(--fg2);',
    '  font-size: 11px;',
    '  line-height: 1.55;',
    '  white-space: pre-wrap;',
    '}',
    '.' + p + 'toast-code {',
    '  margin: 6px 0 0;',
    '  padding: 8px 10px;',
    '  border-radius: 8px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 10.5px;',
    '  line-height: 1.5;',
    '  white-space: pre-wrap;',
    '  max-height: 140px;',
    '  overflow: auto;',
    '}',
    '.' + p + 'toast-act {',
    '  margin: 0;',
    '  padding: 2px 4px;',
    '  border: 0;',
    '  background: none;',
    '  color: var(--ok);',
    '  font-family: inherit;',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '}',
    '.' + p + 'toast-act:active {',
    '  opacity: .7;',
    '}',
    '.' + p + 'toast-close {',
    '  flex-shrink: 0;',
    '  margin: 0 0 0 6px;',
    '  padding: 5px 9px;',
    '  border: 0;',
    '  border-radius: 8px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-family: inherit;',
    '  font-size: 10.5px;',
    '  font-weight: 500;',
    '  white-space: nowrap;',
    '  cursor: pointer;',
    '}',
    focusRing('.' + p + 'toast-act'),
    focusRing('.' + p + 'toast-close'),
    '@media (max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px) {',
    '  .' + p + 'toast-stack {',
    '    left: 12px;',
    '    right: 12px;',
    '    transform: none;',
    '    align-items: stretch;',
    '  }',
    '  .' + p + 'toast {',
    '    min-width: 0;',
    '    max-width: none;',
    '  }',
    '}',
  ].join(LF),

  /** actionBar —— 类名产出者 `src/controls.ts:649-695`（`action-bar`／`action-row`／
   *  `action-row-ghost`／`action-btn`／`action-btn-<kind>`）。 */
  actionBar: (p) => [
    '.' + p + 'action-bar {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 8px;',
    '  box-sizing: border-box;',
    '  margin: 12px 0;',
    '  max-width: 520px;',
    '  margin-left: auto;',
    '  margin-right: auto;',
    '}',
    '.' + p + 'action-row {',
    '  display: grid;',
    '  grid-template-columns: repeat(' + ACTION_BAR_DEFAULTS.evenRowPairs + ', minmax(0, 1fr));',
    '  gap: 8px;',
    '}',
    '.' + p + 'action-row-ghost {',
    '  grid-template-columns: minmax(0, 1fr);',
    '}',
    '.' + p + 'action-btn {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-height: ' + ACTION_BAR_DEFAULTS.minHeightPx + 'px;',
    '  padding: 0 16px;',
    '  border: 1px solid transparent;',
    '  border-radius: 999px;',
    '  background: var(--blue);',
    '  color: var(--card);',
    '  font-family: inherit;',
    '  font-size: ' + ACTION_BAR_DEFAULTS.fontSizePx + 'px;',
    '  font-weight: ' + ACTION_BAR_DEFAULTS.fontWeight + ';',
    '  line-height: 1;',
    '  cursor: pointer;',
    '}',
    '.' + p + 'action-btn-primary {',
    '  background: var(--blue);',
    '  color: var(--card);',
    '}',
    '.' + p + 'action-btn-red {',
    '  background: #ff3b30;',
    '  color: var(--card);',
    '}',
    '.' + p + 'action-btn-ghost {',
    '  border-color: rgba(' + BLUE_RGB + ', ' + ACTION_BAR_DEFAULTS.ghostBorderAlpha + ');',
    '  background: var(--card);',
    '  color: var(--blue);',
    '}',
    focusRing('.' + p + 'action-btn'),
  ].join(LF),

  copyButton: (p) => [
    '.' + p + 'copy-btn {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  gap: 6px;',
    '  min-height: ' + ACTION_BAR_DEFAULTS.minHeightPx + 'px;',
    '  padding: 0 14px;',
    '  border: 1px solid transparent;',
    '  border-radius: 999px;',
    '  background: var(--blue);',
    '  color: var(--card);',
    '  font-family: inherit;',
    '  font-size: ' + ACTION_BAR_DEFAULTS.fontSizePx + 'px;',
    '  font-weight: ' + ACTION_BAR_DEFAULTS.fontWeight + ';',
    '  line-height: 1;',
    '  cursor: pointer;',
    '  transition: transform .45s cubic-bezier(.34, 1.56, .64, 1), background-color .2s ease;',
    '}',
    '.' + p + 'copy-btn-primary {',
    '  background: var(--blue);',
    '  color: var(--card);',
    '}',
    '.' + p + 'copy-btn-ghost {',
    '  border-color: rgba(' + BLUE_RGB + ', ' + ACTION_BAR_DEFAULTS.ghostBorderAlpha + ');',
    '  background: var(--card);',
    '  color: var(--blue);',
    '}',
    '.' + p + 'copy-btn-wide {',
    '  width: 100%;',
    '}',
    '.' + p + 'copy-btn:active {',
    '  transform: scale(.96);',
    '}',
    focusRing('.' + p + 'copy-btn'),
  ].join(LF),

  /** statusBadge —— 类名产出者 `controls.ts:702-707`。
   *  **逐值对齐施工单 B §1.4**（旧 `.hm-status` 同值）：`gap:6px;padding:6px 14px;font-size:13px;
   *  font-weight:600;border-radius:999px;width:fit-content`。此前实测偏离 `1px 8px／11px／gap:normal`
   *  （A2 返修项④）→ 本票按规格值对齐，不再记账偏离。四组底色/字色沿用旧 `.hm-status.{ok,warn,
   *  danger,empty}`（非 token 硬编码色 → 按 D-5 以 CSS 常量落地，不新增 token 名）。 */
  statusBadge: (p) => [
    '.' + p + 'status-badge {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '  padding: 6px 14px;',
    '  border-radius: 999px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  line-height: 1.6;',
    '  width: fit-content;',
    '}',
    '.' + p + 'status-badge-ok {',
    '  background: rgba(52, 199, 89, .12);',
    '  color: #1f8f3d;',
    '}',
    '.' + p + 'status-badge-warn {',
    '  background: rgba(255, 149, 0, .12);',
    '  color: #b25000;',
    '}',
    '.' + p + 'status-badge-danger {',
    '  background: rgba(255, 59, 48, .12);',
    '  color: #c0392b;',
    '}',
    '.' + p + 'status-badge-empty {',
    '  background: var(--soft);',
    '  color: var(--fg3);',
    '}',
  ].join(LF),

  emptyState: (p) => [
    '.' + p + 'empty {',
    '  padding: 48px 20px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 20px;',
    '  background: var(--card);',
    '  text-align: center;',
    '  color: var(--fg2);',
    '}',
    '.' + p + 'empty-icon {',
    '  font-size: 40px;',
    '  line-height: 1.2;',
    '  opacity: .5;',
    '}',
    '.' + p + 'empty-text {',
    '  margin-top: 8px;',
    '  color: var(--fg);',
    '  font-size: 17px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'empty-hint {',
    '  margin-top: 4px;',
    '  color: var(--fg3);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'empty-action {',
    '  margin-top: 16px;',
    '}',
  ].join(LF),

  /** errorReceipt —— 类名产出者 `src/controls.ts:763-765`。
   *  **类名撞车处置（裁定 R6／施工单 B-R4）**：`ilife-error` 亦由
   *  `packages/skill-calorie/src/render/html.ts:254`（`cx('error')`，语义为「错误页正文」）产出，
   *  故容器规则**不得**用裸 `.ilife-error` 选择器（会污染 calorie 错误页）；改用
   *  `:has(> .ilife-error-title)` 精确限定「本组件自己的类组合」——
   *  calorie 的 `ilife-error` 节点无该子元素，**不命中**。 */
  errorReceipt: (p) => [
    '.' + p + 'error:has(> .' + p + 'error-title) {',
    '  margin: 12px 0;',
    '  padding: 20px 22px;',
    '  border: 1px solid rgba(255, 59, 48, .28);',
    '  border-radius: 14px;',
    '  background: rgba(255, 59, 48, .06);',
    '  color: var(--fg);',
    '}',
    '.' + p + 'error-title {',
    '  margin-bottom: 14px;',
    '  color: #a83228;',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '}',
    // **旧层两行 grid 语义对齐**（施工单 B §1.6 要求「等价」）：旧层 `.hm-error .hm-actions
    // {margin-top:0}` ＋ 相邻 `+ .hm-actions{margin-top:14px}`，其中 `wide` 按钮跨列、两个 ghost
    // 各占半宽。A2 返修项⑤实测旧实现 retry 独占 1352px、两个 ghost 仅 78px（单 flex 行）→ 改为
    // grid 2 列（列数取 `ACTION_BAR_DEFAULTS.evenRowPairs`）＋ `.ilife-copy-btn-wide` 跨全列。
    '.' + p + 'error-actions {',
    '  display: grid;',
    '  grid-template-columns: repeat(' + ACTION_BAR_DEFAULTS.evenRowPairs + ', minmax(0, 1fr));',
    '  gap: 8px;',
    '}',
    '.' + p + 'error-actions > .' + p + 'copy-btn-wide {',
    '  grid-column: 1 / -1;',
    '}',
    '@media (max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px) {',
    '  .' + p + 'error:has(> .' + p + 'error-title) {',
    '    padding: 16px 14px;',
    '  }',
    '}',
  ].join(LF),

  /** charts —— **复用** `src/charts.ts` 的唯一产出者 `chartsCss`（#78 结论；重述即 S1）。 */
  charts: (p) => chartsCss(p),

  /** helpShell —— 类名产出者 `src/help.ts:380-599`（`cls()` ＝ `ilife-help-shell-<suffix>`）。 */
  helpShell: (p) => [
    '.' + p + 'help-shell {',
    '  display: block;',
    '  max-width: 960px;',
    '  margin: 0 auto;',
    '  padding: 32px 20px 80px;',
    '  color: var(--fg);',
    '  font-feature-settings: "tnum";',
    '}',
    '.' + p + 'help-shell-hero {',
    '  margin-bottom: 20px;',
    '}',
    '.' + p + 'help-shell-eyebrow {',
    '  margin: 0;',
    '  color: var(--blue);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '  letter-spacing: .08em;',
    '  text-transform: uppercase;',
    '}',
    '.' + p + 'help-shell-title {',
    '  margin: 6px 0 0;',
    '  font-size: 32px;',
    '  font-weight: 700;',
    '  letter-spacing: -.4px;',
    '  line-height: 1.2;',
    '}',
    '.' + p + 'help-shell-subtitle {',
    '  margin: 6px 0 0;',
    '  color: var(--fg2);',
    '  font-size: 15px;',
    '}',
    '.' + p + 'help-shell-lead {',
    '  margin: 4px 0 0;',
    '  color: var(--fg3);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'help-shell-init {',
    '  padding: 16px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 20px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'help-shell-init-title {',
    '  margin: 0;',
    '  font-size: 17px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-init-subtitle {',
    '  margin: 4px 0 0;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'help-shell-init-prompt {',
    '  margin: 8px 0 0;',
    '  padding: 12px;',
    '  border-radius: 8px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 12px;',
    '  line-height: 1.55;',
    '  white-space: pre-wrap;',
    '  overflow-x: auto;',
    '}',
    '.' + p + 'help-shell-init-steps {',
    '  margin: 8px 0 0;',
    '  padding-left: 20px;',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'help-shell-init-step {',
    '  margin: 2px 0;',
    '}',
    '.' + p + 'help-shell-tab-bar {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 8px;',
    '  margin: 16px 0;',
    '}',
    '.' + p + 'help-shell-tab {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  gap: 6px;',
    '  padding: 6px 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 999px;',
    '  background: var(--card);',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '}',
    '.' + p + 'help-shell-tab-icon {',
    '  font-size: 14px;',
    '}',
    '.' + p + 'help-shell-tab-input {',
    '  position: absolute;',
    '  width: 1px;',
    '  height: 1px;',
    '  margin: -1px;',
    '  padding: 0;',
    '  border: 0;',
    '  overflow: hidden;',
    '  clip: rect(0 0 0 0);',
    '  white-space: nowrap;',
    '}',
    '.' + p + 'help-shell-pages {',
    '  display: block;',
    '}',
    '.' + p + 'help-shell-page {',
    '  display: block;',
    '}',
    '.' + p + 'help-shell-page-body {',
    '  display: none;',
    '}',
    '.' + p + 'help-shell-tab-input:checked + .' + p + 'help-shell-page-body {',
    '  display: block;',
    '}',
    '.' + p + 'help-shell-grid {',
    '  display: grid;',
    '  grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  gap: 12px;',
    '}',
    '.' + p + 'help-shell-card {',
    '  display: block;',
    '  padding: 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 14px;',
    '  background: var(--card);',
    '  box-shadow: var(--shadow);',
    '}',
    '.' + p + 'help-shell-card-top {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px;',
    '}',
    '.' + p + 'help-shell-card-title {',
    '  margin: 8px 0 0;',
    '  font-size: 17px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-chip {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  padding: 1px 8px;',
    '  border-radius: 999px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-badge {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  padding: 1px 8px;',
    '  border-radius: 999px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-badge-dev {',
    '  background: rgba(255, 149, 0, .12);',
    '  color: #b25000;',
    '}',
    '.' + p + 'help-shell-cli {',
    '  display: block;',
    '  margin-top: 6px;',
    '  color: var(--fg3);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 11.5px;',
    '}',
    '.' + p + 'help-shell-fields {',
    '  margin: 8px 0 0;',
    '  padding: 0;',
    '  list-style: none;',
    '}',
    '.' + p + 'help-shell-field {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 6px;',
    '  padding: 6px 0;',
    '  border-top: 1px solid var(--line);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'help-shell-field:first-child {',
    '  border-top: 0;',
    '}',
    '.' + p + 'help-shell-field-label {',
    '  color: var(--fg2);',
    '}',
    '.' + p + 'help-shell-field-value {',
    '  color: var(--fg);',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-field-hint {',
    '  color: var(--fg3);',
    '}',
    '.' + p + 'help-shell-field-required {',
    '  color: #c0392b;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-sheet {',
    '  margin-top: 10px;',
    '  border-top: 1px solid var(--line);',
    '}',
    '.' + p + 'help-shell-sheet-summary {',
    '  padding: 8px 0;',
    '  color: var(--blue);',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '  list-style: none;',
    '}',
    '.' + p + 'help-shell-sheet-summary::-webkit-details-marker {',
    '  display: none;',
    '}',
    '.' + p + 'help-shell-sheet-summary::after {',
    '  content: "▾";',
    '  display: inline-block;',
    '  margin-left: 6px;',
    '  transition: transform .15s ease;',
    '}',
    '.' + p + 'help-shell-sheet[open] > .' + p + 'help-shell-sheet-summary::after {',
    '  transform: rotate(180deg);',
    '}',
    '.' + p + 'help-shell-sheet-body {',
    '  padding-bottom: 4px;',
    '}',
    '.' + p + 'help-shell-prompt {',
    '  margin: 0;',
    '  padding: 12px;',
    '  border-radius: 8px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-family: "SF Mono", monospace;',
    '  font-size: 12px;',
    '  line-height: 1.55;',
    '  white-space: pre-wrap;',
    '  overflow-x: auto;',
    '}',
    '.' + p + 'help-shell-actions {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 8px;',
    '  margin-top: 10px;',
    '}',
    '.' + p + 'help-shell-btn {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-height: ' + ACTION_BAR_DEFAULTS.minHeightPx + 'px;',
    '  padding: 0 14px;',
    '  border: 1px solid transparent;',
    '  border-radius: 999px;',
    '  background: var(--blue);',
    '  color: var(--card);',
    '  font-family: inherit;',
    '  font-size: ' + ACTION_BAR_DEFAULTS.fontSizePx + 'px;',
    '  font-weight: ' + ACTION_BAR_DEFAULTS.fontWeight + ';',
    '  line-height: 1;',
    '  cursor: pointer;',
    '}',
    '.' + p + 'help-shell-btn-prompt,',
    '.' + p + 'help-shell-btn-wakeWord,',
    '.' + p + 'help-shell-btn-params {',
    '  background: var(--blue);',
    '  color: var(--card);',
    '}',
    focusRing('.' + p + 'help-shell-btn'),
    '.' + p + 'help-shell-subgroup {',
    '  margin-top: 12px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 14px;',
    '  background: var(--card);',
    '}',
    '.' + p + 'help-shell-subgroup-summary {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  padding: 10px 14px;',
    '  font-size: 14px;',
    '  font-weight: 600;',
    '  cursor: pointer;',
    '}',
    '.' + p + 'help-shell-count {',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-subgroup-body {',
    '  padding: 0 14px 14px;',
    '}',
    '.' + p + 'help-shell-about-sec {',
    '  margin-top: 20px;',
    '}',
    '.' + p + 'help-shell-about-head {',
    '  margin: 0 0 8px;',
    '  font-size: 17px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-about-list {',
    '  margin: 0;',
    '  padding: 0;',
    '  list-style: none;',
    '}',
    '.' + p + 'help-shell-about-row {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 8px;',
    '  padding: 8px 0;',
    '  border-top: 1px solid var(--line);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'help-shell-about-row:first-child {',
    '  border-top: 0;',
    '}',
    '.' + p + 'help-shell-about-label {',
    '  color: var(--fg2);',
    '}',
    '.' + p + 'help-shell-about-value {',
    '  color: var(--fg);',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-about-note {',
    '  margin: 8px 0 0;',
    '  color: var(--fg3);',
    '  font-size: 13px;',
    '}',
    '.' + p + 'help-shell-meta {',
    '  margin-top: 20px;',
    '}',
    '.' + p + 'help-shell-meta-block {',
    '  margin-top: 16px;',
    '}',
    '.' + p + 'help-shell-meta-title {',
    '  margin: 0 0 8px;',
    '  font-size: 17px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-meta-html {',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '}',
    '@media (max-width: 640px) {',
    '  .' + p + 'help-shell {',
    '    padding: 20px 16px 60px;',
    '  }',
    '  .' + p + 'help-shell-title {',
    '    font-size: 26px;',
    '  }',
    '  .' + p + 'help-shell-grid {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '}',
    '@media (max-width: 400px) {',
    '  .' + p + 'help-shell-tab-bar {',
    '    gap: 6px;',
    '  }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  .' + p + 'copy-btn {',
    '    transition: none;',
    '  }',
    '  .' + p + 'copy-btn:active {',
    '    transform: none;',
    '  }',
    '}',
  ].join(LF),
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
 *  `extra-css-root`（改写基座 `:root`）／`extra-css-forbidden-token`（Q14 禁入项）／
 *  `extra-css-dark-scheme`（深色区选择器，doc:292）。 */
class StyleSheetExtraCssError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'StyleSheetError';
    this.code = code;
  }
}

/** `extraCss` 三禁强制（**编排者返修裁定：D3 修订**，见契约 §8.11）。
 *
 *  理由：契约 doc:299-300 的三条「不得」（不得改写基座值／不得引入 Q14 禁入项／不得引入深色区）
 *  此前**无任何落点**（D3 原裁定「不校验、纯调用方责任」）→ 本票补最小强制：
 *  - (a) 含 `:root` 选择器 → 改写基座；
 *  - (b) 含 `STYLE_FORBIDDEN_TOKENS`（`--r-xl`／`--pink`）；
 *  - (c) 含深色区选择器（`[data-theme`／`prefers-color-scheme: dark`）。
 *  命中**任一**即抛错；**合法技能作用域覆盖块**（`.ilife-<skill>{--blue:…}`）照常通过。
 *  **未知 token 名不强制**（契约未冻结 token 名闭集的判定方式 → 保持调用方责任，记账见 §8.11）。 */
function assertExtraCss(extraCss: string): void {
  if (extraCss === '') return;
  if (/:root(?![\w-])/.test(extraCss)) {
    throw new StyleSheetExtraCssError('extra-css-root',
      'buildStyleSheet: extraCss 不得改写基座（命中 `:root` 选择器）；技能主题只许用 `.ilife-<skill>` 作用域覆盖块（契约 doc:299）');
  }
  for (const forbidden of STYLE_FORBIDDEN_TOKENS) {
    if (extraCss.includes(forbidden)) {
      throw new StyleSheetExtraCssError('extra-css-forbidden-token',
        'buildStyleSheet: extraCss 不得引入 Q14 禁入 token（命中 ' + forbidden + '，契约 doc:292）');
    }
  }
  if (/\[\s*data-theme/i.test(extraCss) || /prefers-color-scheme\s*:\s*dark/i.test(extraCss)) {
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
