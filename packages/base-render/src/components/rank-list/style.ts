/** rank-list · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下，且只读本件自己的类名；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：本件设 `container-type: inline-size`，窄档调整走 `@container`；本件**一条 `@media` 都没有**
 *     （媒体查询只许判设备能力，不许判宽度——这些页面会被嵌进侧栏／面板／卡片）。
 *
 *  几何契约（判据钉住）：
 *   · 宽档＝领奖台三张等宽卡并排（第 1 名居中、卡更高），第 4 名起逐行；窄档＝卡改成竖排一列（名次顺序）。
 *   · **条永远在名称下面另起一行**（行里那一格是「名称 ＋ 条」上下叠着）⇒ 窄档也不把名称挤成竖排。
 *   · 领奖台三张卡等宽 ⇒ 卡里的条彼此可比；逐行区的条也等宽 ⇒ 行与行可比。跨两段的两条长度不可直比
 *     （轨道宽度不同）——跨段读份额请看占比那一列。
 */
import { skinVar } from '../skin/contract.js';
import { rankListPlaceClass, rankListSlot, type RankListSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 窄容器阈值（px）：领奖台三张卡改竖排一列。判的是**本件自己的宽度**（`@container`），不是视口宽度。 */
export const RANK_LIST_NARROW_PX = 560;

/** 领奖台上每张卡的最小宽度（em）：窄于它就不放三列（`auto-fit` 自己收成一列）。 */
export const RANK_LIST_CARD_MIN_EM = 9.5;

/** 第 1 名的读数相对其余两名的倍数（领奖台上「大一号」的那一格尺寸事实）。 */
export const RANK_LIST_FIRST_VALUE_SCALE = 1.2;

/** 条的厚度（px）：领奖台卡与逐行区同一厚度（同一族只有一种条的读法）。 */
export const RANK_LIST_BAR_THICKNESS_PX = 6;

/** 条的最小宽度（px）：列挤到极限时仍留得下一条可见的长度。 */
export const RANK_LIST_BAR_MIN_PX = 8;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function rankListCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-rank-list';
  const s = (slot: RankListSlot): string => root + ' .' + rankListSlot(slot, p);
  /** **组合符右侧一律用它**：带 scope 前缀的选择器只能出现在**最左**——`.scope .a > .scope .b` 里
   *  第二个 `.scope` 改成要求「`.a` 的直接子元素里那个 `.scope`」，于是整条规则**永不命中**（实测踩过：
   *  第一名的字号与名次色、逐行区的读数档都因此没生效）。右侧只写本件自己的类名。 */
  const inner = (slot: RankListSlot): string => '.' + rankListSlot(slot, p);
  const card = box + '-card';
  const podium = box + '-podium';
  const row = box + '-row';
  const mid = box + '-mid';
  const value = box + '-value';
  const rankBare = inner('rank');
  const nameBare = inner('name');
  const valueBare = inner('value');
  const rowBare = inner('row');

  return [
    '/* rank-list（榜单 · 形态 A「领奖台」）：前三名三张卡 ＋ 第 4 名起逐行；名次／名称／条／值／占比。',
    '   层次不靠阴影与大圆角：靠发丝线、底色块、字重与顶边那道语义条 ⇒ 换皮只换取值。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度改档。 */
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    '/* 领奖台：三张等宽卡。`auto-fit` ＋ 固定下限 ⇒ 只有一两名时卡不会缩成三分之一宽。',
    '   DOM 顺序仍是 1→2→3（读屏与键盘顺序不乱），宽档的「第 1 名居中」靠 `order` 摆。 */',
    s('podium') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(' + String(RANK_LIST_CARD_MIN_EM) + 'em, 1fr));',
    '  align-items: end;',
    '  gap: 8px;',
    '  min-width: 0;',
    '}',
    '/* 卡：`surface` 底 ＋ 一圈 `edge` 发丝线（零阴影的两套皮肤下靠这条线立起来）＋ 顶边一条语义色。 */',
    card + ' {',
    '  display: grid;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  padding: 10px 10px 12px;',
    '  background: ' + skinVar('surface') + ';',
    '  border: 1px solid ' + skinVar('edge') + ';',
    '  border-top: 3px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    '/* 第 1 名：顶边换成强调色 ＋ 更粗 ／ 读数大一号（`RANK_LIST_FIRST_VALUE_SCALE`）／名次走强调色的文本档。',
    '   三样一起给，色不是唯一信息（换到墨黑强调的报刊皮肤，粗顶边与大字号照样读得出）。 */',
    card + '.' + rankListPlaceClass(1) + ' {',
    '  order: 2;',
    '  padding-top: 14px;',
    '  border-top-width: 5px;',
    '  border-top-color: ' + skinVar('accent') + ';',
    '}',
    card + '.' + rankListPlaceClass(2) + ' {',
    '  order: 1;',
    '}',
    card + '.' + rankListPlaceClass(3) + ' {',
    '  order: 3;',
    '}',
    s('rank') + ' {',
    '  min-width: 1.6em;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    card + '.' + rankListPlaceClass(1) + ' > ' + rankBare + ' {',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
    '/* 名称：本件的主角（条与值都从它派生）。长了换行，**不许 `…`**。 */',
    s('name') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  line-height: 1.4;',
    '  overflow-wrap: anywhere;',
    '}',
    s('note') + ' {',
    '  display: block;',
    '  margin-top: 2px;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 400;',
    '  line-height: 1.5;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 读数：数字走 `font-num` ＋ 等宽数字；不写 `nowrap`（长读数宁可换行，也不许顶破容器）。 */',
    value + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h2') + ';',
    '  font-weight: 700;',
    '  line-height: 1.15;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    card + '.' + rankListPlaceClass(1) + ' > ' + valueBare + ' {',
    '  font-size: calc(' + skinVar('fs-h2') + ' * ' + String(RANK_LIST_FIRST_VALUE_SCALE) + ');',
    '}',
    s('unit') + ' {',
    '  margin-left: 3px;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    '/* 占比：份额的精确读法（跨两段比份额看它，不看条长）。 */',
    s('share') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 条：全榜共用一条刻度（长度＝这一名的值 ÷ 全榜最大值）。轨道走 `surface-2`，与皮肤无关地看得见。 */',
    s('bar') + ' {',
    '  display: block;',
    '  min-width: 0;',
    '  height: ' + String(RANK_LIST_BAR_THICKNESS_PX) + 'px;',
    '  background: ' + skinVar('surface-2') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  overflow: hidden;',
    '}',
    s('fill') + ' {',
    '  display: block;',
    '  height: 100%;',
    '  background: ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '}',
    s('list') + ' {',
    '  display: grid;',
    '  min-width: 0;',
    '  margin-top: 4px;',
    '}',
    '/* 逐行：名次 ｜「名称 ＋ 条」那一格 ｜ 值 ｜ 占比。条在名称**下面**另起一行 ⇒ 名称永不与条抢宽度。 */',
    row + ' {',
    '  display: grid;',
    '  grid-template-columns: auto minmax(0, 1fr) auto auto;',
    '  gap: 0 8px;',
    '  align-items: baseline;',
    '  min-width: 0;',
    '  padding: 8px 0;',
    '}',
    row + ' + ' + rowBare + ' {',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    mid + ' {',
    '  display: grid;',
    '  gap: 5px;',
    '  min-width: 0;',
    '}',
    row + ' > ' + valueBare + ' {',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '}',
    mid + ' > ' + nameBare + ' {',
    '  font-weight: 600;',
    '}',
    '/* 口径行：这条榜单的数怎么算的、占比按什么合计（要读的正文，走 `ink-2` 不走更浅的一档）。 */',
    s('caliber') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 8px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.7;',
    '  overflow-wrap: anywhere;',
    '}',
    s('caliber') + ' > b {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .06em;',
    '}',
    s('caliber') + ' > span {',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方若把某一名包成链接，焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(RANK_LIST_NARROW_PX) + 'px）：三张卡并排会把名称与读数挤成竖排 ⇒ 卡改竖排一列、',
    '   名次回到自然顺序（1→2→3）；逐行区四列不动（条本来就在名称下面，名字那一格仍是弹性那一格）。 */',
    '@container (max-width: ' + String(RANK_LIST_NARROW_PX) + 'px) {',
    '  ' + s('podium') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '  ' + card + '.' + rankListPlaceClass(1) + ',',
    '  ' + card + '.' + rankListPlaceClass(2) + ',',
    '  ' + card + '.' + rankListPlaceClass(3) + ' {',
    '    order: 0;',
    '  }',
    '  ' + card + '.' + rankListPlaceClass(1) + ' {',
    '    padding-top: 10px;',
    '  }',
    '  ' + row + ' {',
    '    gap: 0 6px;',
    '  }',
    '}',
  ].join(LF);
}
