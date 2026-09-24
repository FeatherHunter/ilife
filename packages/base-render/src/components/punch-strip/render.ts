/** punch-strip · **渲染**（打孔格带：N 天里"哪几天有数、各是多少"，像纸边一排打孔刻度）。
 *
 *  —— 打孔格带 ——
 *
 *  形状：一格一天——**日期在上、格在下**；格是一只虚线小盒，那天有数就**填深色、值写在盒里**，
 *  缺数留空心盒（写 `—`）；"当前正在细看的那天"套一圈朱红描边（一页至多一格）。
 *
 *  它替掉的是哪几种错法：
 *   · 逐日只说一句「有记录 1/7 天」——句子报得出**数量**，报不出**哪几天**；
 *   · 用折线讲 7 天的日级读数——7 个点在窄档挤成一条毛刺，读者要的是"哪几天有、各多少"；
 *   · 逐日做成六列表（日期／摄入／三宏量）——窄档被卡片化成一列七块，一屏放不下；
 *   · 逐日做成一行小字的并列串（`09-14 · 09-15 · …`）——分隔符串里读不出值，还犯去分隔符门禁。
 *
 *  与既有件的关系（**选型先看这三条**）：
 *   · 要"哪天有／哪天没有"的**格带**、值进格 → 本件；
 *   · 要"标签 → 值"的**清单**（整窗逐日、行数不定）→ `renderLedgerRows`；
 *   · 要"值／目标"的**比例形状** → `renderScaleBar`；要"哪几天有记录"的**行式提要** → `renderDayStrip`。
 *
 *  出处＝原型 `.scratch/diet-ui-proto/v2-小票.html` 的 `.punch` 一族（用户点名那件「这 7 天」控件）。
 *  格数上限住 `PUNCH_STRIP_MAX_CELLS`：它是"一行可数"的形状，再多天就该换账目行（**本件不替表格**）。
 */
import { esc } from '../shared/escape.js';
import { assertPlainObject, badInput, optExtraClass, optText, reqText } from '../shared/validate.js';

/** 一行最多几格（600px 纸上格宽 ≥40px、390px 屏上 ≥25px 的实测口径）；更多天请用账目行。 */
export const PUNCH_STRIP_MAX_CELLS = 14;

/** 缺数格里的缺省占位（与全仓"缺数一律写 —"同字，同 `DAY_STRIP_EMPTY_MARK`）。 */
export const PUNCH_STRIP_EMPTY_MARK = '\u2014';

export interface PunchCellInput {
  /** 格上的日期串（如 `09-17`；「今天」二字带不带由调用方定）。 */
  readonly label: string;
  /** 那天的读数（**已是给人看的样子**）；`null` ＝ 那天缺数（空心盒 ＋ `emptyMark`）。 */
  readonly value: string | null;
  /** 当前正在细看的那天（朱红描边，一页至多一格）；缺省 `false`。 */
  readonly selected?: boolean;
}

export interface PunchStripInput {
  /** 逐天的格子（顺序＝时间顺序）；0 格＝空串（与"没内容不留空块"同口径）。 */
  readonly days: readonly PunchCellInput[];
  /** 小标题（如「这 7 天」）；不给＝不出。字距由样式段统一，调用方不要自己加空格的写法。 */
  readonly heading?: string;
  /** 缺数格里的占位；缺省 `—`；给空串＝空格（原型缺数格就是空格）。 */
  readonly emptyMark?: string;
  readonly extraClass?: string;
}

/** 打孔格带：把"哪几天有数、各是多少"画成一排格。空数组出不了一个字。 */
export function renderPunchStrip(input: PunchStripInput): string {
  assertPlainObject(input, 'renderPunchStrip: input');
  const days = input.days;
  if (!Array.isArray(days)) badInput('punch-strip: input.days 必须是数组');
  if (days.length === 0) return '';
  if (days.length > PUNCH_STRIP_MAX_CELLS) {
    badInput('punch-strip: input.days 最多 ' + PUNCH_STRIP_MAX_CELLS + ' 格（一行可数；更多天请用账目行）');
  }
  let emptyMark = PUNCH_STRIP_EMPTY_MARK;
  if (input.emptyMark !== undefined) {
    if (typeof input.emptyMark !== 'string') badInput('punch-strip: input.emptyMark 必须是字符串');
    emptyMark = input.emptyMark;
  }
  const heading = optText(input.heading, 'punch-strip: input.heading');
  const extra = optExtraClass(input.extraClass, 'punch-strip: input.extraClass');
  const p = 'ilife-block-punch-strip';
  const cells = days.map((raw, i) => {
    const field = 'punch-strip: input.days[' + i + ']';
    assertPlainObject(raw, field);
    const label = reqText(raw.label, field + '.label');
    const value = raw.value === null || raw.value === undefined ? null : reqText(raw.value, field + '.value');
    return '<div class="' + p + '-cell' + (value === null ? '' : ' is-on')
      + (raw.selected === true ? ' is-selected' : '') + '">'
      + '<span class="' + p + '-date">' + esc(label) + '</span>'
      + '<span class="' + p + '-box">' + esc(value === null ? emptyMark : value) + '</span>'
      + '</div>';
  }).join('');
  return '<div class="' + p + (extra === undefined ? '' : ' ' + extra) + '">'
    + (heading === undefined ? '' : '<div class="' + p + '-heading">' + esc(heading) + '</div>')
    + '<div class="' + p + '-cells">' + cells + '</div>'
    + '</div>';
}
