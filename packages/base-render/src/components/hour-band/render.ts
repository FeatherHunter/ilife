/** hour-band · **渲染**（纯函数产 HTML；本件只有形态 A「单带＋整点刻度尺＋下方明细行」一种骨架）。
 *
 *  —— 形态 A：单带（0–24 时）＋整点刻度尺 ＋ 下方明细行 ——
 *
 *  一天摊成一条带：每个时段按"当天第几分钟"定位，**长度就是「多久」**；段够宽时，段里再写一遍时长；
 *  带下面一条整点刻度尺（0..23，窄档只留偶数点）＋ 逐段的明细行（起止／名称／时长／补充读数）。
 *
 *  它替掉的三种错法：
 *   · 一句摘要"今天很忙"——读不出哪几段忙、忙了多久；
 *   · 24 行"每小时记了多少分钟"——那是复盘柱状图的活（`packages/skill-schedule` 的本地件 `renderHourBand`）；
 *   · 只画带不给起止——带读得出长度、读不出"从几点到几点"（明细行补这一半）。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **机器值是分钟，显示串算出来**（`HH:MM`／`6h40m` 由本件算：几何与去重都要分钟）；
 *   · **带上的空档显形**：时段没盖到的时间**算出来**并出最后一行「— ／ 其余时间未记录 ／ 时长」；
 *   · **窄档不横滑**：带与刻度尺都是 24 份（`repeat(24, minmax(0,1fr))`），明细行的时长 `nowrap`、
 *     名称换行不截断——关键读数（起止／时长）永不写 `…`。
 */
import { esc } from '../shared/escape.js';
import {
  HOUR_BAND_CLASS,
  HOUR_BAND_FORMS,
  HOUR_BAND_HOURS,
  HOUR_BAND_MISSING,
  HOUR_BAND_UNRECORDED_LABEL,
  hourBandSlot,
  type HourBandForm,
} from './attrs.js';
import {
  hourBandPercent,
  normalizeHourBand,
  type HourBandIntervalModel,
  type HourBandModel,
} from './model.js';

/** 头部那一排：标题 ＋ 用途 ＋ 合计（合计 `margin-left:auto` 顶到右缘，窄档自己折行）。 */
function headHtml(m: HourBandModel): string {
  const parts: string[] = ['<div class="' + hourBandSlot('hd') + '">'];
  parts.push('<b class="' + hourBandSlot('title') + '">' + esc(m.title) + '</b>');
  if (m.use !== undefined) parts.push('<span class="' + hourBandSlot('use') + '">' + esc(m.use) + '</span>');
  if (m.summary !== undefined) {
    parts.push('<span class="' + hourBandSlot('sum') + '">'
      + '<i class="' + hourBandSlot('sum-label') + '">' + esc(m.summary.label) + '</i>'
      + '<b class="' + hourBandSlot('sum-value') + '">' + esc(m.summary.value) + '</b>'
      + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 那条带：逐段定位。**它是纯形状**（语义在明细行里）⇒ `aria-hidden`，段里的时长字也对读屏器无意义。 */
function bandHtml(m: HourBandModel): string {
  const segs = m.intervals.map((iv) => '<b class="' + hourBandSlot('sg') + ' is-l' + String(iv.tone) + '"'
    + ' style="left:' + hourBandPercent(iv.from) + ';width:' + hourBandPercent(iv.to - iv.from) + '">'
    + (iv.bandText === undefined ? '' : '<u class="' + hourBandSlot('sg-text') + '">' + esc(iv.bandText) + '</u>')
    + '</b>').join('');
  return '<div class="' + hourBandSlot('band') + '" aria-hidden="true">' + segs + '</div>';
}

/** 整点刻度尺：24 格（窄档样式只留偶数点；轴线不是读数 ⇒ `aria-hidden`）。 */
function rulerHtml(): string {
  const hours: string[] = [];
  for (let h = 0; h < HOUR_BAND_HOURS; h += 1) {
    hours.push('<i class="' + hourBandSlot('ruler-hour') + (h % 2 === 1 ? ' is-odd' : '') + '">' + String(h) + '</i>');
  }
  return '<div class="' + hourBandSlot('ruler') + '" aria-hidden="true">' + hours.join('') + '</div>';
}

/** 图例：色块 ＋ 类别名（色块 aria-hidden，名字是字）。 */
function legendHtml(m: HourBandModel): string {
  const items = m.legend.map((it) => '<span><i class="' + hourBandSlot('sw') + ' is-l' + String(it.tone)
    + '" aria-hidden="true"></i>' + esc(it.label) + '</span>').join('');
  return '<div class="' + hourBandSlot('lgs') + '">' + items + '</div>';
}

/** 一条明细行：起止／名称／时长／补充读数。 */
function rowHtml(t: string, n: string, v: string, meta?: string, nil?: boolean): string {
  return '<div class="' + hourBandSlot('r') + (nil === true ? ' is-nil' : '') + '">'
    + '<span class="' + hourBandSlot('t') + '">' + esc(t) + '</span>'
    + '<span class="' + hourBandSlot('n') + '">' + esc(n) + '</span>'
    + '<span class="' + hourBandSlot('v') + '">' + esc(v) + '</span>'
    + (meta === undefined ? '' : '<span class="' + hourBandSlot('meta') + '">' + esc(meta) + '</span>')
    + '</div>';
}

/** 明细行区：逐段一行 ＋（有的话）未记录那一行。 */
function rowsHtml(m: HourBandModel): string {
  const rows = m.intervals.map((iv: HourBandIntervalModel) => rowHtml(iv.clock, iv.label, iv.duration, iv.meta));
  if (m.unrecordedMinutes > 0) {
    rows.push(rowHtml(HOUR_BAND_MISSING, HOUR_BAND_UNRECORDED_LABEL, m.unrecordedText, undefined, true));
  }
  return '<div class="' + hourBandSlot('rows') + '">' + rows.join('') + '</div>';
}

/** 形态 A 的骨架。0 段＝空串（与"没内容不留空块"同口径）。 */
function renderBand(m: HourBandModel): string {
  if (m.intervals.length === 0) return '';
  const parts: string[] = [headHtml(m), bandHtml(m), rulerHtml()];
  if (m.legend.length > 0) parts.push(legendHtml(m));
  parts.push(rowsHtml(m));
  if (m.note !== undefined) parts.push('<p class="' + hourBandSlot('note') + '">' + esc(m.note) + '</p>');
  return parts.join('');
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<HourBandForm, (m: HourBandModel) => string>> = {
  band: renderBand,
};

/** 渲染时段带（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderHourBand(input: unknown): string {
  const m = normalizeHourBand(input);
  const body = SKELETONS[m.form](m);
  if (body === '') return '';
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + HOUR_BAND_CLASS + ' is-' + m.form + extra + '">' + body + '</div>';
}
