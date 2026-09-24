/** rank-list · **渲染**（纯函数产 HTML；本件只有形态 A「领奖台」一种骨架）。
 *
 *  —— 形态 A：领奖台 ——
 *
 *  前三名各占一张卡，**第 1 名住在中间**（宽档靠 `order` 摆位：DOM 顺序仍是 1→2→3，读屏与键盘顺序不乱），
 *  第 4 名起逐行排在下面。**每一名都给条**：长度＝这一名的值 ÷ 全榜最大值，数字给准值，占比给精确份额。
 *
 *  它替掉的两种错法：
 *   · 只给名次与数值 ⇒ 读者读不出第一名与第二名差多少（条把那点差摊开）；
 *   · 榜首与第 20 名同形同字号 ⇒ 一眼看不出谁在榜首（领奖台那一档大一号 ＋ 更粗的顶边）。
 *
 *  三条硬口径（判据断的就是它们）：
 *   · 条长与数字**同源**（都来自入参的值）：长度按「值 ÷ 全榜最大值」，不是拍出来的百分比；
 *   · **条在名称下面另起一行**（行里那一格是「名称 ＋ 条」上下叠着）⇒ 窄档也绝不把名称挤成竖排；
 *   · 名称／副语／口径行长了一律换行，**不许 `…` 截断**。
 */
import { esc } from '../shared/escape.js';
import { rankListPlaceClass, rankListSlot, RANK_LIST_CLASS, type RankListForm } from './attrs.js';
import { normalizeRankList, type RankListModel, type RankListRowModel } from './model.js';

/** 值那一格（含单位）：单位小一号、跟在数字后（与账目行／明细行同一条写法）。 */
function valueHtml(m: RankListModel, text: string): string {
  return '<b class="' + rankListSlot('value') + '">' + esc(text)
    + (m.unit === undefined ? '' : '<small class="' + rankListSlot('unit') + '">' + esc(m.unit) + '</small>')
    + '</b>';
}

/** 名称那一格（含可选副语）：副语另起一行，不给就不出。 */
function nameHtml(row: RankListRowModel): string {
  return '<span class="' + rankListSlot('name') + '">' + esc(row.name)
    + (row.note === undefined ? '' : '<small class="' + rankListSlot('note') + '">' + esc(row.note) + '</small>')
    + '</span>';
}

/** 条的外框（填充宽度＝这一名的值 ÷ 全榜最大值）。条是**装饰**：值已经以文本上屏，故 `aria-hidden`。 */
function barHtml(width: string): string {
  return '<span class="' + rankListSlot('bar') + '" aria-hidden="true">'
    + '<i class="' + rankListSlot('fill') + '" style="width: ' + width + '%"></i></span>';
}

/** 领奖台上的一张卡：名次（「第 N 名」）／名称（＋副语）／值／占比／条。
 *  位次类名（`is-place-1/2/3`）只用于宽档摆位：第 1 名居中、卡更高。 */
function cardHtml(m: RankListModel, row: RankListRowModel, index: number): string {
  return '<div class="' + rankListSlot('card') + ' ' + rankListPlaceClass(index + 1) + '">'
    + '<b class="' + rankListSlot('rank') + '">' + esc(row.rankText) + '</b>'
    + nameHtml(row)
    + valueHtml(m, row.valueText)
    + '<span class="' + rankListSlot('share') + '">' + esc(row.shareText) + '</span>'
    + barHtml(row.width)
    + '</div>';
}

/** 第 4 名及以后的一行：名次（序号）／「名称 ＋ 条」那一格／值／占比。 */
function rowHtml(m: RankListModel, row: RankListRowModel): string {
  return '<div class="' + rankListSlot('row') + '">'
    + '<b class="' + rankListSlot('rank') + '">' + esc(row.rankText) + '</b>'
    + '<span class="' + rankListSlot('mid') + '">' + nameHtml(row) + barHtml(row.width) + '</span>'
    + valueHtml(m, row.valueText)
    + '<span class="' + rankListSlot('share') + '">' + esc(row.shareText) + '</span>'
    + '</div>';
}

/** 口径行：左端一枚标签（「口径」）＋ 一句话（数怎么算的、占比按什么合计）。 */
function caliberHtml(m: RankListModel): string {
  if (m.caliber === undefined) return '';
  return '<p class="' + rankListSlot('caliber') + '"><b>' + esc(m.caliberLabel) + '</b>'
    + '<span>' + esc(m.caliber) + '</span></p>';
}

/** 形态 A 的骨架。 */
function renderPodium(m: RankListModel): string {
  const cards = m.podium.map((row, i) => cardHtml(m, row, i)).join('');
  const rest = m.rest.length === 0 ? ''
    : '<div class="' + rankListSlot('list') + '">' + m.rest.map((row) => rowHtml(m, row)).join('') + '</div>';
  return '<div class="' + rankListSlot('podium') + '">' + cards + '</div>' + rest + caliberHtml(m);
}

/** 形态 → 骨架（本件只有一格；分派写在这里，加第二形态就是加一支）。 */
const SKELETONS: Readonly<Record<RankListForm, (m: RankListModel) => string>> = {
  podium: renderPodium,
};

/** 渲染榜单（纯函数：同样的入参恒产同样的字节；转义只经 `shared/escape.ts`）。
 *  `rows: []` ⇒ **空串**（没有名次就没有榜；空壳、空标题都留不住）。 */
export function renderRankList(input: unknown): string {
  const m = normalizeRankList(input);
  if (m.podium.length === 0) return '';
  const extra = m.extraClass === undefined ? '' : ' ' + m.extraClass;
  return '<div class="' + RANK_LIST_CLASS + ' is-' + m.form + extra + '">' + SKELETONS[m.form](m) + '</div>';
}
