/** progress-list · **渲染**（纯函数产 HTML；本件只有形态 A「四行清单」一种骨架）。
 *
 *  —— 形态 A：四行清单 ——
 *
 *  每行四段，**自上而下不抢宽度**：目标名＋状态字 ／ 当前 / 目标＋单位 ／ 条 ／ 还差多少。
 *  它替掉的两种错法：
 *   · 把「当前/目标」塞进条里当标签 —— 条一窄（窄容器）字就被压没；
 *   · 只给一条进度条、不给状态字 —— 色一换（墨黑强调的皮肤）「到没到」就读不出来。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **条的比例由本件算**（`current / goal`，夹在 0..100），调用方不传宽度；
 *   · **状态字必出**（未记录／进行中／已达标／已超 或调用方给的），色不是唯一信息；
 *   · **缺值写成 `—`**，且缺值那行**不出** `aria-valuenow`（没有数就不该报一个数）。
 */
import { esc } from '../shared/escape.js';
import { PROGRESS_LIST_CLASS, progressListSlot } from './attrs.js';
import { normalizeProgressList, type ProgressListModel, type ProgressListRowModel } from './model.js';

/** 状态 → 行上的类（`is-blank`／`is-on-track`／`is-done`／`is-over`）。 */
function stateClass(state: string): string {
  return 'is-' + state;
}

/** 一行：名＋状态字 ／ 值＋目标 ／ 条 ／ 还差多少。 */
function rowHtml(row: ProgressListRowModel): string {
  const parts: string[] = ['<li class="' + progressListSlot('row') + ' ' + stateClass(row.state)
    + (row.tone === 'none' ? '' : ' is-' + row.tone) + '" data-ilife-progress-state="' + esc(row.state) + '">'];
  parts.push('<p class="' + progressListSlot('top') + '">');
  parts.push('<span class="' + progressListSlot('label') + '">' + esc(row.label) + '</span>');
  parts.push('<span class="' + progressListSlot('state') + '">' + esc(row.stateWord) + '</span>');
  parts.push('</p>');
  parts.push('<p class="' + progressListSlot('meta') + '">');
  parts.push('<b class="' + progressListSlot('value') + '">' + esc(row.valueText) + '</b>');
  parts.push('<span class="' + progressListSlot('goal') + '">/ ' + esc(row.goalText) + '</span>');
  if (row.unit !== undefined) {
    parts.push('<span class="' + progressListSlot('unit') + '">' + esc(row.unit) + '</span>');
  }
  parts.push('</p>');
  /* 条：`role="progressbar"` ＋ 名 ＋ 值文本。**未记录那行不给 `aria-valuenow`**——报了就是撒谎。 */
  parts.push('<div class="' + progressListSlot('track') + '" role="progressbar" aria-valuemin="0" aria-valuemax="100"'
    + (row.pct === null ? '' : ' aria-valuenow="' + esc(String(row.pct)) + '"')
    + ' aria-label="' + esc(row.label) + '" aria-valuetext="' + esc(row.ariaText) + '">');
  parts.push('<i class="' + progressListSlot('fill') + '" style="width: ' + esc(String(row.fillPct)) + '%"></i>');
  parts.push('</div>');
  if (row.remain !== undefined) {
    parts.push('<p class="' + progressListSlot('remain') + '">' + esc(row.remain) + '</p>');
  }
  parts.push('</li>');
  return parts.join('');
}

/** 形态 A 的骨架。**行序即入参序**（调用方按重要程度排）。 */
function renderRows(m: ProgressListModel): string {
  const parts: string[] = [];
  if (m.heading !== undefined) {
    parts.push('<p class="' + progressListSlot('heading') + '">' + esc(m.heading) + '</p>');
  }
  if (m.rows.length === 0) {
    /* 没有行就没有「清单」：给了 `emptyLine` 就出那句人话，没给就一个字都不出（不留空壳）。 */
    if (m.emptyLine !== undefined) {
      parts.push('<p class="' + progressListSlot('note') + '">' + esc(m.emptyLine) + '</p>');
    }
    return parts.join('');
  }
  parts.push('<ul class="' + progressListSlot('list') + '">');
  for (const row of m.rows) parts.push(rowHtml(row));
  parts.push('</ul>');
  if (m.note.length > 0) {
    const spans = m.note.map((s) => '<span>' + esc(s) + '</span>').join('');
    parts.push('<p class="' + progressListSlot('note') + '">' + spans + '</p>');
  }
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<ProgressListModel['form'], (m: ProgressListModel) => string>> = {
  rows: renderRows,
};

/** 渲染多目标进度（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderProgressList(input: unknown): string {
  const m = normalizeProgressList(input);
  const body = SKELETONS[m.form](m);
  if (body === '') return '';
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + PROGRESS_LIST_CLASS + ' is-' + m.form + extra + '">' + body + '</div>';
}
