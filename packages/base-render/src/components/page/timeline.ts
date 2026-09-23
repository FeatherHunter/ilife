/** 页面级形状件 ③**时间轴条**（`renderTimelineRows`）。
 *
 *  左侧一条轴线＋圆点，时间与正文分两槽。
 *
 *  **住址**：目录化批次②把它从 `src/pageShapes.ts` 搬到这里（正文原样，判据＝产物逐字节相同，
 *  见 `docs/base/base-render/组件目录架构.md`）。
 */

import { esc, reqText, optText } from './shared.js';
/* ══════════════════════════════════════════════════════════════
 * ③ 时间轴条：左侧轴线 ＋ 圆点，时间与正文分两槽
 * ══════════════════════════════════════════════════════════════ */

export interface TimelineRowInput {
  /** 时间槽（人话串，如「5 月 30 日」）。 */
  readonly time: string;
  /** 主文（这一条发生了什么）。 */
  readonly main: string;
  /** 补充说明（可省）。 */
  readonly note?: string;
}

export interface TimelineRowsInput {
  readonly rows: readonly TimelineRowInput[];
  /** 版面根的附加类名（空格分隔）。 */
  readonly extraClass?: string;
}

/** 时间轴条：一串「时间 ＋ 做了什么」的呈现形状。0 条＝空串。 */
export function renderTimelineRows(input: TimelineRowsInput): string {
  const rows = input.rows;
  if (!Array.isArray(rows)) throw new Error('pageShapes: renderTimelineRows: input.rows 必须是数组');
  if (rows.length === 0) return '';
  const extra = optText(input.extraClass, 'renderTimelineRows: input.extraClass');
  const body = rows.map((row, i) => {
    const field = 'renderTimelineRows: input.rows[' + i + ']';
    const time = reqText(row.time, field + '.time');
    const main = reqText(row.main, field + '.main');
    const note = optText(row.note, field + '.note');
    return '<li class="ilife-block-timeline-row">'
      + '<span class="ilife-block-timeline-dot" aria-hidden="true"></span>'
      + '<span class="ilife-block-timeline-time">' + esc(time) + '</span>'
      + '<span class="ilife-block-timeline-main">' + esc(main) + '</span>'
      + (note === undefined ? '' : '<span class="ilife-block-timeline-note">' + esc(note) + '</span>')
      + '</li>';
  }).join('');
  return '<ol class="ilife-block-timeline' + (extra === undefined ? '' : ' ' + extra) + '">' + body + '</ol>';
}

/** 本件样式段（族组装器 `pageShapeCss()` 按原顺序拼回）。 */
export function timelineCss(p: string, root: string): string[] {
  return [
      '/* ③ 时间轴条：一条轴线 ＋ 逐条圆点；时间与正文分两槽（不用 · 串）。 */',
      root + ' .' + p + 'block-timeline {',
      '  margin: 16px 0;',
      '  padding: 4px 0 4px 18px;',
      '  border-left: 1px solid var(--line);',
      '  list-style: none;',
      '}',
      root + ' .' + p + 'block-timeline-row {',
      '  position: relative;',
      '  display: flex;',
      '  flex-wrap: wrap;',
      '  gap: 2px 12px;',
      '  align-items: baseline;',
      '  padding: 6px 0;',
      '}',
      root + ' .' + p + 'block-timeline-dot {',
      '  position: absolute;',
      '  left: -23px;',
      '  top: 13px;',
      '  width: 9px;',
      '  height: 9px;',
      '  border-radius: 50%;',
      '  background: var(--blue);',
      '}',
      root + ' .' + p + 'block-timeline-time {',
      '  flex: 0 0 auto;',
      '  color: var(--fg2);',
      '  font-size: 13px;',
      '  font-variant-numeric: tabular-nums;',
      '}',
      root + ' .' + p + 'block-timeline-main {',
      '  flex: 1 1 auto;',
      '  min-width: 0;',
      '  color: var(--fg);',
      // #567 J4（§5.2 区块标题 15 吸收 14／15）。
      '  font-size: 15px;',
      '  font-weight: 600;',
      '}',
      root + ' .' + p + 'block-timeline-note {',
      '  flex: 1 1 100%;',
      '  color: var(--fg3);',
      '  font-size: 12px;',
      '  line-height: 1.6;',
      '}',
  ];
}
