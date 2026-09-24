/** key-value-list · **渲染**（纯函数产 HTML；本件只有形态 A「档案行」一种骨架）。
 *
 *  —— 形态 A：档案行（两列，值右对齐）——
 *
 *  骨架：根 `<div class="… is-rows">` →（可省的小标题 `<p class="…-heading">`）→
 *  一张档案 `<dl class="…-list">` → 逐行 `<div class="…-row"><dt class="…-term">字段</dt><dd class="…-value">值</dd></div>`。
 *
 *  它替掉的两种错法：
 *   · 用点线撑起"字段 … 值"（点线是**账目行**的语汇：那是"一份账的读数"，本件是"一份档案的字段"）；
 *   · 值与标签同级同重（读者分不出哪一半是主角）——本件靠字重（700）与字号（`fs-h3`）压住标签（`fs-sm`）。
 *
 *  两条硬口径（判据断的就是它们）：
 *   · **值右对齐**（形态 A 的识别特征）：同一张档案里所有行的值右缘对齐，多行扫读才成列；
 *   · **标记里不写分隔符**（点线／冒号／`·` 一个都不写）：字段与值之间的缝由两列列距承担。
 */
import { esc } from '../shared/escape.js';
import {
  KEY_VALUE_CLASS,
  keyValueSlot,
  type KeyValueForm,
  type KeyValueListInput,
  type KeyValueSlot,
} from './attrs.js';
import { normalizeKeyValueList, type KeyValueModel } from './model.js';

/** 单行：字段名（配角）＋ 值（主角，右对齐）＋ 可选后缀说明。 */
function rowHtml(row: KeyValueModel['rows'][number]): string {
  const parts: string[] = ['<div class="' + keyValueSlot('row') + '">'];
  parts.push('<dt class="' + keyValueSlot('term') + '">' + esc(row.label) + '</dt>');
  parts.push('<dd class="' + keyValueSlot('value') + (row.num ? ' ' + keyValueSlot('value-num') : '')
    + '">' + esc(row.value) + '</dd>');
  if (row.note !== undefined) {
    /* 后缀说明住在**值位那一格的下一行**（不给 `<dt>` 添第二格）：多行时它跟着值一起右对齐，
       不与值抢同一行——值一长就把说明挤没，正是要避免的错法。 */
    parts.push('<dd class="' + keyValueSlot('note') + '">' + esc(row.note) + '</dd>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态键 → 形态类名（**闭集里那一格**；`Record<KeyValueForm, …>` 让"加了形态却忘了补类名"当场红）。 */
const FORM_SLOTS: Readonly<Record<KeyValueForm, KeyValueSlot>> = Object.freeze({
  rows: 'form-rows',
});

/** 形态 A 的骨架。 */
function renderRows(m: KeyValueModel): string {
  const parts: string[] = ['<div class="' + KEY_VALUE_CLASS + ' ' + keyValueSlot(FORM_SLOTS[m.form])
    + (m.extraClass === undefined ? '' : ' ' + m.extraClass) + '">'];
  if (m.heading !== undefined) {
    parts.push('<p class="' + keyValueSlot('heading') + '">' + esc(m.heading) + '</p>');
  }
  parts.push('<dl class="' + keyValueSlot('list') + '">');
  for (const row of m.rows) parts.push(rowHtml(row));
  parts.push('</dl></div>');
  return parts.join('');
}

const RENDERERS: Readonly<Record<KeyValueForm, (m: KeyValueModel) => string>> = Object.freeze({
  rows: renderRows,
});

/** 档案行：一串「字段：值」的清单。纯函数产标记，零 DOM。
 *  `rows` 为空时返回空串（**空清单不是档案**：空壳子只会在页面上留一条空线）。 */
export function renderKeyValueList(input: KeyValueListInput): string {
  const m = normalizeKeyValueList(input);
  if (m.rows.length === 0) return '';
  const render = RENDERERS[m.form];
  return render(m);
}
