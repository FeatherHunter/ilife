/** cash-waterline · **渲染**（纯函数产 HTML；三形态各一套骨架，分派在文件末尾）。
 *
 *  —— 形态 A：`waterline` 逐日水位柱（底线 ＋ 告急日点名） ——
 *
 *  一根柱子＝一天结束时还剩多少（占预算的百分比），底线是一条虚线；跌破底线的日子**下面逐日点名**
 *  （日期 ＋ 那天花了多少 ＋ 余量），不是只把柱子染红。今天那一格有一条软底＋描边的整列，轴上写「今天」。
 *
 *  —— 形态 B：`bullet` 每周子弹图（实际 ＋ 底线刻度） ——
 *
 *  一条横条＝**累计**已用掉的比例（满格＝整段预算），竖线＝余量跌破底线的那个位置。
 *  越过 100% 的那一周：**条形画到满格、读数里照实点名**（`已用 136%`），不缩回 100%。
 *
 *  —— 形态 C：`flow` 进出水三栏（构成 ＋ 够不够撑到月底） ——
 *
 *  进／出／余各一栏，每栏逐行「名字 ＋ 条 ＋ 钱数」；余栏给**判定**（撑得住／撑不住 ＋ 差多少），
 *  判定写成字（✓／！ ＋ 词 ＋ 色三样都在）。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · **色不是唯一信息**：跌破底线的日子有名字与数字（点名那块）、越过底线的周有读数、判定有词；
 *   · **关键数字不被截断**：钱数与日期带 `white-space:nowrap`，横轴刻度**算成至多 6 枚**（多了就是压字）；
 *   · **形状与读数同出一份真值**：柱高／条宽／净额／占比／判定句全在 `model.ts` 算好后直接上屏。
 */
import { esc } from '../shared/escape.js';
import {
  CASH_WATERLINE_CLASS,
  CASH_WATERLINE_HEIGHT_VAR,
  CASH_WATERLINE_THRESHOLD_VAR,
  CASH_WATERLINE_USED_THRESHOLD_VAR,
  CASH_WATERLINE_WIDTH_VAR,
  cashWaterlineSlot,
  type CashWaterlineForm,
} from './attrs.js';
import {
  normalizeCashWaterline,
  type CashWaterlineBulletModel,
  type CashWaterlineFlowModel,
  type CashWaterlineFlowLineModel,
  type CashWaterlineModel,
  type CashWaterlineWaterlineModel,
  type CashWaterlineWeekModel,
} from './model.js';

/** 卡头：标题 ＋ 右端口径（三形态共用）。 */
function headHtml(m: CashWaterlineModel): string {
  const parts: string[] = ['<div class="' + cashWaterlineSlot('hd') + '">',
    '<h4 class="' + cashWaterlineSlot('title') + '">' + esc(m.title) + '</h4>'];
  if (m.stamp !== undefined) {
    parts.push('<span class="' + cashWaterlineSlot('stamp') + '">' + esc(m.stamp) + '</span>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 脚注：口径行（本件永远出一句——不给就由 `model.ts` 写自己的口径）。 */
function noteHtml(m: CashWaterlineModel): string {
  return '<p class="' + cashWaterlineSlot('note') + '">' + esc(m.note) + '</p>';
}

/** 图例的一行（色块 ＋ 一句话；数字另在点名那块里）。 */
function legendItemHtml(kind: string, text: string): string {
  return '<li class="' + cashWaterlineSlot('legend-item') + '">'
    + '<i class="' + cashWaterlineSlot('swatch') + ' is-' + kind + '" aria-hidden="true"></i>'
    + '<span>' + esc(text) + '</span></li>';
}

/* ── 形态 A：逐日水位柱 ─────────────────────────────────────────── */

/** 横轴：只出算好的那几枚刻度字（首尾必出），今天那一格写「今天」。 */
function axisHtml(m: CashWaterlineWaterlineModel): string {
  const cells = m.days.filter((d) => d.axis !== '');
  if (cells.length === 0) return '';
  return '<div class="' + cashWaterlineSlot('xax') + '">'
    + cells.map((d) => '<span class="' + cashWaterlineSlot('xax-cell') + (d.today ? ' is-today' : '') + '">'
      + esc(d.axis) + '</span>').join('') + '</div>';
}

/** 告急日点名：跌破底线的日子逐条写出来（日期 ＋ 那天花了多少 ＋ 余量）。 */
function lowListHtml(m: CashWaterlineWaterlineModel): string {
  if (m.lowCount === 0) return '';
  const parts: string[] = ['<div class="' + cashWaterlineSlot('lowlist') + '">',
    '<p class="' + cashWaterlineSlot('low-title') + '">跌破底线的日子 · ' + esc(String(m.lowCount)) + ' 天</p>',
    '<ul class="' + cashWaterlineSlot('low-rows') + '">'];
  for (const row of m.lowRows) {
    parts.push('<li class="' + cashWaterlineSlot('low-row') + '">'
      + '<b class="' + cashWaterlineSlot('low-day') + '">' + esc(row.label) + '</b>'
      + '<span class="' + cashWaterlineSlot('low-spend') + '">那天花 ' + esc(row.spendText) + '</span>'
      + '<span class="' + cashWaterlineSlot('low-pct') + '">余量 ' + esc(row.pctText) + '</span></li>');
  }
  parts.push('</ul></div>');
  return parts.join('');
}

/** 形态 A 的骨架：卡头 → 画布（底线 ＋ 逐日柱）→ 横轴 → 图例 → 点名 → 脚注。 */
function renderWaterline(m: CashWaterlineWaterlineModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + cashWaterlineSlot('plot') + '" role="img" aria-label="' + esc(m.ariaLabel) + '">');
  parts.push('<span class="' + cashWaterlineSlot('thr') + '" aria-hidden="true">'
    + '<b class="' + cashWaterlineSlot('thr-text') + '">底线 ' + esc(m.thresholdText) + '</b></span>');
  for (const day of m.days) {
    const cls = ' is-' + (day.low ? 'low' : 'keep') + (day.today ? ' is-today' : '');
    parts.push('<span class="' + cashWaterlineSlot('col') + cls + '" aria-hidden="true">'
      + '<i class="' + cashWaterlineSlot('fill') + '" style="' + CASH_WATERLINE_HEIGHT_VAR
      + ': ' + String(day.pct) + '%"></i></span>');
  }
  parts.push('</div>');
  parts.push(axisHtml(m));
  parts.push('<ul class="' + cashWaterlineSlot('legend') + '">'
    + legendItemHtml('keep', '余量占预算')
    + legendItemHtml('low', '跌破底线（' + m.legendLow + '）')
    /* 没标今天就不出这一行图例：图例是"图上有什么"的说明，不能替图多写一条。 */
    + (m.todayIndex === undefined ? '' : legendItemHtml('today', '今天'))
    + '</ul>');
  parts.push(lowListHtml(m));
  parts.push(noteHtml(m));
  return parts.join('');
}

/* ── 形态 B：每周子弹图 ─────────────────────────────────────────── */

/** 一周那一行：行头（名字 ｜ 进 ｜ 出 ｜ 净 ｜ 越过底线的读数）＋ 轨道（填充 ＋ 底线刻度）。 */
function weekRowHtml(week: CashWaterlineWeekModel): string {
  const parts: string[] = ['<div class="' + cashWaterlineSlot('brow') + (week.low ? ' is-low' : '') + '">'];
  parts.push('<span class="' + cashWaterlineSlot('bhd') + '">'
    + '<b class="' + cashWaterlineSlot('bhd-name') + '">' + esc(week.label) + '</b>'
    + '<span class="' + cashWaterlineSlot('bhd-num') + '">进 ' + esc(week.inflowText) + '</span>'
    + '<span class="' + cashWaterlineSlot('bhd-num') + '">出 ' + esc(week.outflowText) + '</span>'
    + '<span class="' + cashWaterlineSlot('net') + '">净 ' + esc(week.netText) + '</span>'
    + (week.over ? '<span class="' + cashWaterlineSlot('over') + '">已用 ' + esc(week.usedText) + '</span>' : '')
    + '</span>');
  parts.push('<span class="' + cashWaterlineSlot('rail') + '">'
    + '<i class="' + cashWaterlineSlot('rail-fill') + '" aria-hidden="true" style="' + CASH_WATERLINE_WIDTH_VAR
    + ': ' + String(week.fillPct) + '%"></i>'
    + '<u class="' + cashWaterlineSlot('rail-thr') + '" aria-hidden="true"></u></span>');
  parts.push('</div>');
  return parts.join('');
}

/** 形态 B 的骨架：卡头 → 逐周 → 图例 → 脚注。
 *
 *  **不给整块挂 `role="img"`**：这一形态的内容全是字（周名、进／出、净、已用比例），
 *  挂 `role="img"` 会把子树判成图形、把那些字从读屏里抹掉。给一句 `role="group"` 的名字即可。 */
function renderBullet(m: CashWaterlineBulletModel): string {
  const parts: string[] = [headHtml(m)];
  parts.push('<div class="' + cashWaterlineSlot('bullet') + '" role="group" aria-label="' + esc(m.ariaLabel) + '">');
  for (const week of m.weeks) parts.push(weekRowHtml(week));
  parts.push('</div>');
  parts.push('<ul class="' + cashWaterlineSlot('legend') + '">'
    + legendItemHtml('keep', '本周结束时已用掉预算的比例')
    + legendItemHtml('low', '跌破底线（' + m.legendLow + '）')
    + '</ul>');
  parts.push(noteHtml(m));
  return parts.join('');
}

/* ── 形态 C：进出水三栏 ─────────────────────────────────────────── */

/** 栏里的一行：条 ＋ 读数。 */
function flowLineHtml(line: CashWaterlineFlowLineModel, kind: string): string {
  return '<div class="' + cashWaterlineSlot('line') + '">'
    + '<span class="' + cashWaterlineSlot('line-bar') + ' is-' + kind + '">'
    + '<i class="' + cashWaterlineSlot('line-fill') + '" aria-hidden="true" style="' + CASH_WATERLINE_WIDTH_VAR
    + ': ' + String(line.fillPct) + '%"></i></span>'
    + '<span class="' + cashWaterlineSlot('line-text') + '">' + esc(line.name + ' ' + line.amountText) + '</span>'
    + '</div>';
}

/** 一栏：栏头（栏名 ｜ 笔数／占比 ｜ 合计）＋ 逐行；余栏另给判定。 */
function flowCardHtml(kind: string, name: string, countText: string, totalText: string,
  lines: readonly CashWaterlineFlowLineModel[], verdict?: { word: string; text: string; ok: boolean }): string {
  const parts: string[] = ['<div class="' + cashWaterlineSlot('card') + '">',
    '<div class="' + cashWaterlineSlot('card-hd') + '">',
    '<span class="' + cashWaterlineSlot('card-name') + ' is-' + kind + '">' + esc(name) + '</span>',
    '<span class="' + cashWaterlineSlot('card-count') + '">' + esc(countText) + '</span>',
    '<b class="' + cashWaterlineSlot('card-total') + '">' + esc(totalText) + '</b>',
    '</div>'];
  for (const line of lines) parts.push(flowLineHtml(line, kind));
  if (verdict !== undefined) {
    parts.push('<p class="' + cashWaterlineSlot('verdict') + (verdict.ok ? ' is-ok' : ' is-danger') + '">'
      + '<b class="' + cashWaterlineSlot('verdict-word') + '">' + esc(verdict.word) + '</b>'
      + '<span>' + esc(verdict.text) + '</span></p>');
  }
  parts.push('</div>');
  return parts.join('');
}

/** 形态 C 的骨架：卡头 → 三栏 → 脚注（三栏里的字都在，`role="group"` 只给这一块一个名字）。 */
function renderFlow(m: CashWaterlineFlowModel): string {
  const f = m.flow;
  const parts: string[] = [headHtml(m),
    '<div class="' + cashWaterlineSlot('three') + '" role="group" aria-label="' + esc(m.ariaLabel) + '">'];
  parts.push(flowCardHtml('in', '进', f.inCountText, f.inTotalText, f.inflow));
  parts.push(flowCardHtml('out', '出', f.outCountText, f.outTotalText, f.outflow));
  parts.push(flowCardHtml('left', '余', f.leftPctText, f.leftText,
    [{ name: '日均', amountText: f.avgText, fillPct: f.leftFillPct }],
    { word: f.verdictWord, text: f.verdictText, ok: f.ok }));
  parts.push('</div>');
  parts.push(noteHtml(m));
  return parts.join('');
}

/** 形态 → 骨架（分派写在这里，加第四形态就是加一支）。 */
const SKELETONS: Readonly<Record<CashWaterlineForm, (m: CashWaterlineModel) => string>> = {
  waterline: (m) => renderWaterline(m as CashWaterlineWaterlineModel),
  bullet: (m) => renderBullet(m as CashWaterlineBulletModel),
  flow: (m) => renderFlow(m as CashWaterlineFlowModel),
};

/** 渲染现金水位（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。 */
export function renderCashWaterline(input: unknown): string {
  const m = normalizeCashWaterline(input);
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  /* 几何只经**本件自己的**自定义属性交给样式段（名字住 `attrs.ts`，不占 `--ilife-*` 那个皮肤命名空间）：
     形态 A 给底线在画布上的位置，形态 B 给底线换算成「已用」的位置（形态 C 的条宽逐行自带，不需要根上的变量）。 */
  const vars: string[] = [];
  if (m.form === 'waterline') vars.push(CASH_WATERLINE_THRESHOLD_VAR + ': ' + String(m.thresholdPct) + '%');
  if (m.form === 'bullet') vars.push(CASH_WATERLINE_USED_THRESHOLD_VAR + ': ' + String(m.usedThresholdPct) + '%');
  const style = vars.length === 0 ? '' : ' style="' + vars.join('; ') + '"';
  return '<div class="' + CASH_WATERLINE_CLASS + ' is-' + m.form + extra + '"' + style + '>'
    + SKELETONS[m.form](m) + '</div>';
}
