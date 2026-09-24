/** entry-rows · **渲染**（明细行：一条记录 = 一行）。
 *
 *  —— 明细行 ——
 *
 *  形状：`时间 ・ 餐别 ・ 名称 ・ 量 …………… 值 单位`（＋ 下一行的备注）。
 *  槽位**各自独立**：给哪几槽就出哪几槽，缺的槽不留空位、不用占位符顶替。
 *
 *  它替掉的是哪几种错法：
 *   · 一条记录写成一整句（「13:55 午餐 百事可乐 2000g 860 卡」）⇒ 五个字段挤在同一行文本里，
 *     换一条记录就没法逐列对照；
 *   · 用七列表格装"一条记录"（列名要重复一遍、窄屏出横向滚动条、食物名竖排）；
 *   · 备注（「2L 按常规每 100ml 约 43kcal 估算」）被塞进正文那句里，读起来像第二个记录。
 *
 *  与既有件的关系（**选型先看这两条**）：
 *   · 一串"时间 ＋ 做了什么"、按时间轴连起来（左侧一条轴线与圆点）→ 用 `renderTimelineRows`；
 *   · 一条记录一行、右侧要对齐一个值（金额／热量／里程）→ 用本件。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';

export interface EntryRowInput {
  /** 时间槽（如 `13:55`）；不给＝不出这一槽。 */
  readonly time?: string;
  /** 类别槽（如餐别 `午餐`）；不给＝不出。 */
  readonly badge?: string;
  /** 名称（这一条是什么；必填）。 */
  readonly name: string;
  /** 数量槽（如 `2000 g`）；不给＝不出。 */
  readonly measure?: string;
  /** 值（如热量 `860`；必填）。 */
  readonly value: string;
  /** 值的单位（`卡`）；给了就小一号。 */
  readonly unit?: string;
  /** 备注（另起一行、缩进到名称列下；不给＝不出）。 */
  readonly note?: string;
  /** **行下读数**（另起一行的一排小字，逐项一个 `<span>`）：这一条带的一组结构化事实
   *  （如「蛋白 35 g」「碳水 0 g」「脂肪 0 g」）。**逐项分开给，不要自己拼分隔符**——
   *  分隔由版式的列距承担（仓规：拿字符当分隔 = 该处缺 UI 设计）。不给＝不出这一行。 */
  readonly facts?: readonly string[];
}

export interface EntryRowsInput {
  /** 一行一条记录；0 条＝空串（与"没内容不留空块"同口径）。 */
  readonly rows: readonly EntryRowInput[];
  /** 小标题（如「吃了什么」）；不给＝不出。 */
  readonly heading?: string;
  /** 缺记那一句（如「早餐 · 晚餐 · 加餐 未记录」）——**这是"没什么"，不是一条记录**，
   *  所以它住独立槽位、不进 `rows`（进了就会被算成一条、也会带上值位）。不给＝不出。 */
  readonly absentLine?: string;
  readonly extraClass?: string;
}

/** 明细行：一条记录一行。空数组且没有缺记句 ⇒ 出不了一个字。 */
export function renderEntryRows(input: EntryRowsInput): string {
  assertPlainObject(input, 'renderEntryRows: input');
  if (!Array.isArray(input.rows)) badInput('entry-rows: input.rows 必须是数组');
  const heading = optText(input.heading, 'entry-rows: input.heading');
  const absent = optText(input.absentLine, 'entry-rows: input.absentLine');
  const extra = optExtraClass(input.extraClass, 'entry-rows: input.extraClass');
  if (input.rows.length === 0 && heading === undefined && absent === undefined) return '';
  const p = 'ilife-block-entry-row';
  const body = input.rows.map((raw, i) => {
    const field = 'entry-rows: input.rows[' + i + ']';
    assertPlainObject(raw, field);
    const name = reqText(raw.name, field + '.name');
    const value = reqText(raw.value, field + '.value');
    const time = optText(raw.time, field + '.time');
    const badge = optText(raw.badge, field + '.badge');
    const measure = optText(raw.measure, field + '.measure');
    const unit = optText(raw.unit, field + '.unit');
    const note = optText(raw.note, field + '.note');
    const facts = raw.facts === undefined ? [] : raw.facts;
    if (!Array.isArray(facts)) badInput('entry-rows: ' + field + '.facts 必须是数组');
    const factsHtml = facts.length === 0 ? '' : '<span class="' + p + '-facts">'
      + facts.map((fact, j) => '<span>' + esc(reqText(fact, field + '.facts[' + j + ']')) + '</span>').join('')
      + '</span>';
    return '<div class="' + p + '">'
      + (time === undefined ? '' : '<span class="' + p + '-time">' + esc(time) + '</span>')
      + (badge === undefined ? '' : '<span class="' + p + '-badge">' + esc(badge) + '</span>')
      + '<span class="' + p + '-name">' + esc(name) + '</span>'
      + (measure === undefined ? '' : '<span class="' + p + '-measure">' + esc(measure) + '</span>')
      + '<span class="' + p + '-leader" aria-hidden="true"></span>'
      + '<span class="' + p + '-value">' + esc(value)
      + (unit === undefined ? '' : '<small>' + esc(unit) + '</small>') + '</span>'
      + (note === undefined ? '' : '<span class="' + p + '-note">' + esc(note) + '</span>')
      + factsHtml
      + '</div>';
  }).join('');
  return '<div class="ilife-block-entry-rows' + (extra === undefined ? '' : ' ' + extra) + '">'
    + (heading === undefined ? '' : '<div class="ilife-block-entry-rows-heading">' + esc(heading) + '</div>')
    + body
    + (absent === undefined ? '' : '<div class="ilife-block-entry-rows-absent">' + esc(absent) + '</div>')
    + '</div>';
}
