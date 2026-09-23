/** 页面级形状件 ①**事实条**（`renderFactStrip`）。
 *
 *  一行 N 件事由版式分格承担，文本里一个分隔符都没有。
 *
 *  **住址**：目录化批次②把它从 `src/pageShapes.ts` 搬到这里（正文原样，判据＝产物逐字节相同，
 *  见 `docs/base/base-render/组件目录架构.md`）。
 */

import { esc, reqText, optText } from './shared.js';
/* ══════════════════════════════════════════════════════════════
 * ① 事实条：一排「标签 ＋ 值」的格子
 * ══════════════════════════════════════════════════════════════ */

/** 语气三态（闭集）；不给＝中性（`--fg`）。取自同仓状态徽章的语义色，不发明新色值。 */
export type FactTone = 'ok' | 'warn' | 'danger';

export interface FactItemInput {
  /** 这格说的是什么（人话短标签，如「拍摄」「标签」）。 */
  readonly label: string;
  /** 这格的值（已是给人看的样子；数字口径由调用方定）。
   *  **#950 B4：`null` ＝ 缺数**——可见面印 `FACT_STRIP_MISSING_MARK`（`—`，与全仓「缺数一律写 —」同字），
   *  并带 `…-value-missing` 类降调；机器面（复制载荷）留空由调用方定，两条口径**分开**。 */
  readonly value: string | null;
  readonly tone?: FactTone;
  /** **单位**（#950 B4）：给了就紧跟值位出一枚小号单位（值位本身只吃数，不带单位）。
   *  缺数与单位同给时只印缺数占位（没有数，单位无意义）。 */
  readonly unit?: string;
}

export interface FactStripInput {
  /** 一条事实一行；0 条＝空串（与「没内容不留空块」同口径）。 */
  readonly items: readonly FactItemInput[];
  /** 版面根的附加类名（空格分隔，同 `blocks.ts` 的 `optExtraClass` 口径）。 */
  readonly extraClass?: string;
}

/** #950 B4：事实条的缺数占位（与全仓「缺数一律写 —」同字）。 */
export const FACT_STRIP_MISSING_MARK = '\u2014';

/** 事实条：一行 N 件事的呈现形状（替掉 `A · B · C` 那种串）。空数组出不了一个字。
 *  **#950 B4 扩参**：值位可给 `null`（缺数 → 印 `—`，与「0」区分开）＋ 可选单位位。
 *  给了字符串值又不给单位的既有调用点产物**逐字节不变**。 */
export function renderFactStrip(input: FactStripInput): string {
  const items = input.items;
  if (!Array.isArray(items)) throw new Error('pageShapes: renderFactStrip: input.items 必须是数组');
  if (items.length === 0) return '';
  const extra = optText(input.extraClass, 'renderFactStrip: input.extraClass');
  const cells = items.map((item, i) => {
    const field = 'renderFactStrip: input.items[' + i + ']';
    const label = reqText(item.label, field + '.label');
    const tone = item.tone;
    if (tone !== undefined && tone !== 'ok' && tone !== 'warn' && tone !== 'danger') {
      throw new Error('pageShapes: ' + field + '.tone 必须是 ok／warn／danger 之一');
    }
    const unit = optText(item.unit, field + '.unit');
    const missing = item.value === null || item.value === undefined;
    const value = missing ? FACT_STRIP_MISSING_MARK : reqText(item.value, field + '.value');
    return '<div class="ilife-block-fact-strip-item">'
      + '<span class="ilife-block-fact-strip-label">' + esc(label) + '</span>'
      + '<span class="ilife-block-fact-strip-value'
      + (tone === undefined ? '' : ' ilife-block-fact-strip-value-' + tone)
      + (missing ? ' ilife-block-fact-strip-value-missing' : '') + '">' + esc(value)
      + (missing || unit === undefined ? '' : '<span class="ilife-block-fact-strip-unit">' + esc(unit) + '</span>')
      + '</span>'
      + '</div>';
  }).join('');
  return '<div class="ilife-block-fact-strip' + (extra === undefined ? '' : ' ' + extra) + '">' + cells + '</div>';
}

/** 本件样式段（族组装器 `pageShapeCss()` 按原顺序拼回）。 */
export function factStripCss(p: string, root: string): string[] {
  return [
      '/* ① 事实条：一格「标签 ＋ 值」，格与格靠 22px 列距分开（不用任何分隔符字符）。 */',
      root + ' .' + p + 'block-fact-strip {',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 10px 22px;',
      '  margin: 12px 0 0;',
      '}',
      root + ' .' + p + 'block-fact-strip-item {',
      '  display: flex;',
      '  flex-direction: column;',
      '  gap: 2px;',
      '  min-width: 0;',
      '}',
      root + ' .' + p + 'block-fact-strip-label {',
      '  color: var(--fg3);',
      '  font-size: 12px;',
      '}',
      root + ' .' + p + 'block-fact-strip-value {',
      '  color: var(--fg);',
      // #567 J4（§5.2 区块标题 15 吸收 14／15）。
      '  font-size: 15px;',
      '  font-weight: 600;',
      '  overflow-wrap: anywhere;',
      '}',
      root + ' .' + p + 'block-fact-strip-value-ok {',
      '  color: #1f8c3d;',
      '}',
      root + ' .' + p + 'block-fact-strip-value-warn {',
      '  color: #a25b00;',
      '}',
      root + ' .' + p + 'block-fact-strip-value-danger {',
      '  color: #a83228;',
      '}',
      '/* #950 B4：缺数（`value: null`）——占位字 `—` ＋ 降调；与「0」在观感上分开。 */',
      root + ' .' + p + 'block-fact-strip-value-missing {',
      '  color: var(--fg3);',
      '  font-weight: 500;',
      '}',
      '/* #950 B4：单位位（值位只吃数，单位小一号跟在后面）。 */',
      root + ' .' + p + 'block-fact-strip-unit {',
      '  margin-left: 4px;',
      '  color: var(--fg2);',
      '  font-size: 12px;',
      '  font-weight: 500;',
      '}',
  ];
}
