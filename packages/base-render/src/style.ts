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
  /** toast —— 类名产出者：`src/controls.ts` 的 `renderToast`（静态）与 `buildSharedHelpersJs`
   *  的 `feedback()`（helpers 运行时）；两侧结构**同构**（`.toast` > `.toast-body` >
   *  `.toast-title-row` ＋ 可选 detail；`.toast-close` 在 body 之外）。 */
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
    // W1（返修第二轮）：此处原有 `flex-wrap: wrap` 是**权宜补丁**（helpers 运行时 DOM 缺 body 包裹
    // 时靠换行分层，代价是把关闭按钮挤到第三行）。根因已由 `controls.ts` 的结构对齐修掉
    // （helpers 与静态产出器／旧层同构：`icon? + .toast-body(> .toast-title-row + detail) + .toast-close`），
    // 补丁一并删除 → 关闭按钮与标题恒同行。
    '.' + p + 'toast {',
    '  display: flex;',
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
    '  animation: ' + p + 'toast-in .22s cubic-bezier(.34, 1.56, .64, 1) both;',
    '}',
    // 入场动效（W4）：旧层 `.hm-toast{opacity:0;transform:scale(.9)}` ＋ `.hm-toast.show{…}`
    // （`base.js:75`）依赖 JS 加类，新控制器**不加 `.show`**（`ToastController.show` 是方法名，非类）
    // → 改为 **CSS-only** `@keyframes` ＋ `animation`，**不依赖任何 JS 加类**，且默认可见。
    '@keyframes ' + p + 'toast-in {',
    '  from {',
    '    opacity: 0;',
    '    transform: scale(.9) translateY(4px);',
    '  }',
    '  to {',
    '    opacity: 1;',
    '    transform: none;',
    '  }',
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
    // body 是 toast 的**唯一**内容列（静态产出器与 helpers 运行时同构，见 `controls.ts`
    // `TOAST_BODY_CLASS`）：`flex: 1 1 auto` 让它吃掉剩余宽度并内部换行，
    // 关闭按钮因此恒与标题同行（W1 判据 `rt_close_top === rt_title_top`）。
    '.' + p + 'toast-body {',
    '  flex: 1 1 auto;',
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
    // 运行时详情（helpers 产出 `.ilife-toast-title-detail`，在 `.ilife-toast-body` 内）：
    // 与静态侧 `.ilife-toast-detail` **同排版**；此前的 `flex: 1 1 100%` 权宜补丁已随结构对齐删除。
    '.' + p + 'toast-title-detail {',
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
    // W3（H-16 双反馈的 CSS 侧）：复制成功态变绿。规格 `docs/visual-spec-help.md:195,197`
    // 「按钮变绿进入 `copied` 态并跑 450ms 弹簧动画」；弹簧 = 基座 `transition: transform .45s
    // cubic-bezier(.34, 1.56, .64, 1)`（B1 `benchmark-visual-spec.md:279,645`），本节只补**变绿**。
    // 类名由**运行时**添加（`copied`，非 `ilife-` 前缀 → 不占样式区命名空间）；
    // 本票**不改** helpers 的复制反馈行为，移交落点见契约 §8.11.1 FX-75-11。
    '.' + p + 'copy-btn.copied {',
    '  border-color: var(--ok);',
    '  background: var(--ok);',
    '  color: var(--card);',
    '}',
    focusRing('.' + p + 'copy-btn'),
  ].join(LF),

  /** statusBadge —— 类名产出者 `controls.ts:702-707`。
   *  **逐值对齐施工单 B §1.4**：`gap:6px;padding:6px 14px;font-size:13px;font-weight:600;
   *  border-radius:999px;width:fit-content`。四组底色／字色**逐值取旧 `.hm-status.{ok,warn,danger,empty}`**
   *  （`公共组件/assets/base.css:225-228`；旧值清单亦见施工单 B `:253`）——**实色**背景，非 alpha：
   *  ok `#e6f7ec`／`#1f8c3d`、warn `#fff5e0`／`#a25b00`、danger `#fff0ee`／`#a83228`、
   *  empty `#f0f0f3`／`var(--fg2)`（empty 字色旧层 `base.css:228` 为 `#6e6e73`＝`--fg2` 解析值，底色为实色 `#f0f0f3`）。
   *  **返修 W2**：上一轮误用 `#1f8f3d`／`#b25000`（全仓无出处）＋ 12% alpha 底色，且注释谎称「沿用旧值」
   *  → 已改回旧逐值，注释与实现一致（非 token 硬编码色按 D-5 以 CSS 常量落地，不新增 token 名）。 */
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
    '  background: #e6f7ec;',
    '  color: #1f8c3d;',
    '}',
    '.' + p + 'status-badge-warn {',
    '  background: #fff5e0;',
    '  color: #a25b00;',
    '}',
    '.' + p + 'status-badge-danger {',
    '  background: #fff0ee;',
    '  color: #a83228;',
    '}',
    '.' + p + 'status-badge-empty {',
    '  background: #f0f0f3;',
    '  color: var(--fg2);',
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
    // **旧层两行 grid 语义对齐**（施工单 B §1.6 要求「等价」）：旧层 `.hm-actions`
    // `{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:520px;margin:0 auto}`（`base.css:81-91`，
    // 其中 `max-width:520px;margin:0 auto` 在 **`:87-89`**）＋ `.hm-error .hm-actions{margin-top:0}` 与
    // 相邻 `+ .hm-actions{margin-top:14px}`（两行之间的竖向间距 14px）。
    // A2 返修项⑤实测旧实现 retry 独占 1352px、两个 ghost 仅 78px（单 flex 行）→ 改为
    // grid 2 列（列数取 `ACTION_BAR_DEFAULTS.evenRowPairs`）＋ `.ilife-copy-btn-wide` 跨全列。
    // **返修 W5**：上一轮漏了 `max-width:520px;margin:0 auto`（实测 retry 1352／ghost 672，
    // 旧应为 520／256）→ 本节补上；两行间距由 `gap:8px` 改为 `row-gap:14px;column-gap:8px`
    // 以逐值对齐旧层 `+.hm-actions{margin-top:14px}`。
    '.' + p + 'error-actions {',
    '  display: grid;',
    '  grid-template-columns: repeat(' + ACTION_BAR_DEFAULTS.evenRowPairs + ', minmax(0, 1fr));',
    '  row-gap: 14px;',
    '  column-gap: 8px;',
    '  max-width: 520px;',
    '  margin-left: auto;',
    '  margin-right: auto;',
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

  /** helpShell —— 类名产出者 `src/help.ts:380-599`（`cls()` ＝ `ilife-help-shell-<suffix>`）
   *  ＋ `src/controls.ts` 的 `buildSharedHelpersJs`（#88 S4 运行时注入：卡级复制按钮／搜索／高亮／
   *  回到顶部——后缀同一命名空间，T11 按既有 `cls()` 实参前缀归属）。 */
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
    // ── #88 S4：helpers 运行时注入面（`src/controls.ts` 的 `buildSharedHelpersJs`）──────────
    // 类名后缀与 `src/help.ts` 的 `cls()` 同一命名空间（T11 归属由既有实参前缀承担）；
    // 只用 11 个冻结 token，不新增 token、不越区、不走技能侧 `extraCss`。
    '.' + p + 'help-shell-tab-search {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin: 0 0 16px;',
    '}',
    '.' + p + 'help-shell-tab-search-input {',
    '  flex: 1 1 200px;',
    '  min-width: 0;',
    '  min-height: 36px;',
    '  padding: 0 14px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 999px;',
    '  background: var(--card);',
    '  color: var(--fg);',
    '  font-family: inherit;',
    '  font-size: 13px;',
    '}',
    focusRing('.' + p + 'help-shell-tab-search-input'),
    '.' + p + 'help-shell-tab-search-clear {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 28px;',
    '  height: 28px;',
    '  padding: 0;',
    '  border: 1px solid var(--line);',
    '  border-radius: 50%;',
    '  background: var(--card);',
    '  color: var(--fg2);',
    '  font-family: inherit;',
    '  font-size: 12px;',
    '  line-height: 1;',
    '  cursor: pointer;',
    '}',
    focusRing('.' + p + 'help-shell-tab-search-clear'),
    '.' + p + 'help-shell-page-hitcount {',
    '  color: var(--fg2);',
    '  font-size: 13px;',
    '  font-weight: 600;',
    '}',
    '.' + p + 'help-shell-card-copy {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  margin-left: auto;',
    '  min-height: 28px;',
    '  padding: 0 12px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 999px;',
    '  background: var(--card);',
    '  color: var(--blue);',
    '  font-family: inherit;',
    '  font-size: 12px;',
    '  font-weight: 600;',
    '  line-height: 1;',
    '  cursor: pointer;',
    '}',
    focusRing('.' + p + 'help-shell-card-copy'),
    '.' + p + 'help-shell-card-mark {',
    '  padding: 0 2px;',
    '  border-radius: 4px;',
    '  background: var(--soft);',
    '  color: var(--blue2);',
    '  font-weight: 600;',
    '}',
    // 搜索态：未命中卡片／子功能组整块隐藏（`hidden` 属性会被本区 `display:block` 覆盖，
    // 故用类名而非属性；类名同样由 helpers 以 `className` 字符串增删，不依赖 `classList`）。
    '.' + p + 'help-shell-card-hidden {',
    '  display: none;',
    '}',
    '.' + p + 'help-shell-subgroup-hidden {',
    '  display: none;',
    '}',
    '.' + p + 'help-shell-field-input {',
    '  flex: 1 1 120px;',
    '  min-width: 0;',
    '  min-height: 32px;',
    '  padding: 0 10px;',
    '  border: 1px solid var(--line);',
    '  border-radius: 8px;',
    '  background: var(--card);',
    '  color: var(--fg);',
    '  font-family: inherit;',
    '  font-size: 13px;',
    '}',
    focusRing('.' + p + 'help-shell-field-input'),
    // 回到顶部（视觉尺 H-19：42px 圆形、fixed bottom/right 24px、初始 opacity:0 ＋
    // pointer-events:none，scrollY>400 加 `-show`；点击平滑回顶由 helpers 承担）。
    '.' + p + 'help-shell-btn-backtop {',
    '  position: fixed;',
    '  right: 24px;',
    '  bottom: 24px;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  width: 42px;',
    '  height: 42px;',
    '  padding: 0;',
    '  border: 1px solid var(--line);',
    '  border-radius: 50%;',
    '  background: var(--card);',
    '  color: var(--fg);',
    '  font-family: inherit;',
    '  font-size: 18px;',
    '  font-weight: 600;',
    '  line-height: 1;',
    '  box-shadow: var(--shadow);',
    '  opacity: 0;',
    '  pointer-events: none;',
    '  transition: opacity .2s ease;',
    '  z-index: 9998;',
    '  cursor: pointer;',
    '}',
    '.' + p + 'help-shell-btn-backtop-show {',
    '  opacity: 1;',
    '  pointer-events: auto;',
    '}',
    focusRing('.' + p + 'help-shell-btn-backtop'),
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
    // W4：入场动效在 reduced-motion 下**归零**（含动画本身，不只是时长）。
    '  .' + p + 'toast {',
    '    animation: none;',
    '  }',
    // #88 S4：回到顶部按钮的透明度过渡同样归零（H-20 覆盖全部可交互控件）。
    '  .' + p + 'help-shell-btn-backtop {',
    '    transition: none;',
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

/** CSS 块注释剥除（`/* … *\/` → 空格）：**判定前先剥注释**——注释里的 `:root`／`--pink` 只是说明文字，
 *  不是「改写基座／引入禁入项」；反之注释**不能**藏住真实声明（`/*c*\/:root{}` 剥后仍命中）。 */
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
 *  理由：契约 doc:299-300 的三条「不得」（不得改写基座值／不得引入 Q14 禁入项／不得引入深色区）
 *  此前**无任何落点**（D3 原裁定「不校验、纯调用方责任」）→ 本票补最小强制：
 *  - (a) 含 `:root` 选择器 → 改写基座；
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
      'buildStyleSheet: extraCss 不得改写基座（命中 `:root` 选择器）；技能主题只许用 `.ilife-<skill>` 作用域覆盖块（契约 doc:299）');
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
