/** photo-grid · **样式段**（本件唯一的样式来源）。**重做件**：占位必须读得出是相片。
 *
 *  四条重做口径（`重做设计口径.md` §0）逐条落在这一段里：
 *   ① **占位物读得出它是什么**：定形框（`aspect-ratio`）＋ 四角取景角标 ＋ 中央相机记号 ＋ 底部题注条；
 *   ② **状态除色之外还有第二样**：占位格与真图格靠 `is-placeholder`（虚线内圈 ＋ 相机记号），
 *      末尾「加一张」靠**虚线边框**与内容格分开 —— 换皮换到零阴影、零圆角也读得出；
 *   ③ **层次不靠投影与圆角**：框靠一圈发丝线 ＋ 四角角标，题注条靠**软底色 ＋ 上发丝线**；
 *   ④ **骨架对得上这类数据**：`<figure>` ＋ `<figcaption>`（照片与它的题注本来就是一格一件事）。
 *
 *  纪律：只经 `skinVar()` 读皮肤；scope 在 `.<prefix>page-ui` 之下；零 `:root`／`!important`；
 *  宽度只许容器判（`@container`），媒体查询只判设备能力（本件没用到）。
 */
import { skinVar } from '../skin/contract.js';
import { PHOTO_GRID_RATIOS, photoGridSlot, type PhotoGridSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 取景角标的臂长（px）：一根角标两条边各这么长。 */
export const PHOTO_GRID_MARK_ARM_PX = 12;
/** 取景角标的线宽（px）。 */
export const PHOTO_GRID_MARK_THICK_PX = 2;
/** 取景角标离框边的内距（px）。 */
export const PHOTO_GRID_MARK_INSET_PX = 6;
/** 末尾「加一张」那格的命中下限（px）：**命中盒不得小于它**（视觉盒可以随比例更高）。 */
export const PHOTO_GRID_TOUCH_PX = 44;
/** 列数换档的容器阈值（px）：窄于它两列，宽于它三列——**判的是本件自己的宽度**。 */
export const PHOTO_GRID_THREE_COL_PX = 520;

/** 四角取景角标：8 层背景（每角一条横、一条竖），不新增元素、不吃伪元素、零阴影下也在。 */
function marksCss(): string[] {
  const color = skinVar('line');
  const bar = 'linear-gradient(' + color + ', ' + color + ')';
  const arm = String(PHOTO_GRID_MARK_ARM_PX) + 'px';
  const thick = String(PHOTO_GRID_MARK_THICK_PX) + 'px';
  const inset = String(PHOTO_GRID_MARK_INSET_PX) + 'px';
  const right = 'calc(100% - ' + inset + ')';
  const bottom = 'calc(100% - ' + inset + ')';
  const pos: string[] = [];
  for (const [y, x] of [[inset, inset], [inset, right], [bottom, inset], [bottom, right]]) {
    pos.push(x + ' ' + y, x + ' ' + y);
  }
  return [
    '  background-image: ' + [bar, bar, bar, bar, bar, bar, bar, bar].join(', ') + ';',
    '  background-size: ' + [arm + ' ' + thick, thick + ' ' + arm].join(', ')
      + [arm + ' ' + thick, thick + ' ' + arm].join(', ')
      + [arm + ' ' + thick, thick + ' ' + arm].join(', ')
      + [arm + ' ' + thick, thick + ' ' + arm].join(', ') + ';',
    '  background-position: ' + pos.join(', ') + ';',
    '  background-repeat: no-repeat;',
  ];
}

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function photoGridCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-photo-grid';
  const slotSel = (s: PhotoGridSlot): string => '.' + photoGridSlot(s, p);
  const s = (slot: PhotoGridSlot): string => root + ' ' + slotSel(slot);

  const out: string[] = [
    '/* photo-grid（照片网格 · 形态 A「网格 ＋ 加一张」）：定形框 ＋ 四角取景角标 ＋ 底部题注条。',
    '   **重做件**：占位不再是「一块灰」——没真图时也一眼看出「这里放一张照片」。',
    '   零阴影、零圆角下层次靠发丝线、软底色与角标 ⇒ 三套皮肤都成立。 */',
    box + ' {',
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 14px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    '/* 网格：窄档两列，宽档三列（判的是**本件自己的宽度**，不是视口宽度）。 */',
    s('grid') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(2, minmax(0, 1fr));',
    '  gap: 12px 10px;',
    '  min-width: 0;',
    '  align-items: start;',
    '}',
    '/* 一格：`<figure>` ＝ 一张照片 ＋ 它的题注（本来就是一格一件事）。 */',
    s('cell') + ' {',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  margin: 0;',
    '}',
    '/* ① 定形框：比例落在框上，**真图与占位共用一个框** ⇒ 图到位不跳版。 */',
    s('frame') + ' {',
    '  position: relative;',
    '  display: grid;',
    '  place-items: center;',
    '  width: 100%;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  border: 1px solid ' + skinVar('edge') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  overflow: hidden;',
    '}',
  ];
  for (const ratio of PHOTO_GRID_RATIOS) {
    out.push(root + ' .' + photoGridSlot('frame', p) + '-' + ratio
      + ' { aspect-ratio: ' + ratio.split('-').join(' / ') + '; }');
  }
  out.push(
    '/* ② 四角取景角标：取景器的样子（8 层背景，不加元素、不用伪元素）。 */',
    s('marks') + ' {',
    '  position: absolute;',
    '  inset: 0;',
    '  pointer-events: none;',
    ...marksCss(),
    '}',
    '/* 中央那枚相机记号：**只有占位格才出**——一眼看出「这里放一张照片」。 */',
    s('lens') + ' {',
    '  position: relative;',
    '  display: block;',
    '  grid-area: 1 / 1;',
    '  align-self: end;',
    '  margin-bottom: 6px;',
    '  width: 34px;',
    '  height: 26px;',
    '  box-sizing: border-box;',
    '  border: ' + String(PHOTO_GRID_MARK_THICK_PX) + 'px solid ' + skinVar('ink-3') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    s('lens') + '::before {',
    '  content: "";',
    '  position: absolute;',
    '  left: 50%;',
    '  top: 50%;',
    '  width: 10px;',
    '  height: 10px;',
    '  margin: -6px 0 0 -6px;',
    '  box-sizing: border-box;',
    '  border: ' + String(PHOTO_GRID_MARK_THICK_PX) + 'px solid ' + skinVar('ink-3') + ';',
    '  border-radius: 50%;',
    '}',
    s('lens') + '::after {',
    '  content: "";',
    '  position: absolute;',
    '  right: 3px;',
    '  top: -7px;',
    '  width: 8px;',
    '  height: 5px;',
    '  box-sizing: border-box;',
    '  border: ' + String(PHOTO_GRID_MARK_THICK_PX) + 'px solid ' + skinVar('ink-3') + ';',
    '  border-bottom: 0;',
    '  border-radius: 3px 3px 0 0;',
    '}',
    '/* 占位格写在框里的那句话（＝这一格该放什么照片）＋ 一圈虚线内圈：**与真图格的第二样差别**。 */',
    s('alt') + ' {',
    '  grid-area: 2 / 1;',
    '  align-self: start;',
    '  justify-self: center;',
    '  max-width: 100%;',
    '  padding: 0 8px;',
    '  box-sizing: border-box;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    s('frame') + ' { grid-template-rows: 1fr auto 1fr; }',
    s('cell') + '.is-placeholder ' + slotSel('frame') + ' {',
    '  border-style: dashed;',
    '  background: ' + skinVar('surface') + ';',
    '}',
    '/* 真图：比例由框定，`object-fit: cover` 铺满（不裁掉题注条：题注在框外）。 */',
    s('img') + ' {',
    '  display: block;',
    '  grid-area: 1 / 1 / 4 / 2;',
    '  width: 100%;',
    '  height: 100%;',
    '  max-width: 100%;',
    '  object-fit: cover;',
    '}',
    '/* 张数角标（同一天多张）：走墨底白字，三套皮肤下都压得住照片。 */',
    s('stack') + ' {',
    '  position: absolute;',
    '  right: ' + String(PHOTO_GRID_MARK_INSET_PX) + 'px;',
    '  bottom: ' + String(PHOTO_GRID_MARK_INSET_PX) + 'px;',
    '  padding: 1px 7px;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('ink') + ';',
    '  color: ' + skinVar('surface') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '/* ③ 题注条：底部一行（日期 ＋ 说明）——**零阴影下的那道分家靠软底色 ＋ 上发丝线**。 */',
    s('caption') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  min-width: 0;',
    '  padding: 6px 8px;',
    '  box-sizing: border-box;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.5;',
    '}',
    s('date') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('text') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* ④ 末尾那一格「加一张」：**虚线框 ＋ 加号**，靠边框样式（不是颜色）与内容格分开。 */',
    s('add') + ' {',
    '  display: grid;',
    '  place-items: center;',
    '  align-content: center;',
    '  gap: 4px;',
    '  min-height: ' + String(PHOTO_GRID_TOUCH_PX) + 'px;',
    '  box-sizing: border-box;',
    '  padding: 14px 8px;',
    '  border: 1px dashed ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: transparent;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  text-align: center;',
    '}',
    s('add-mark') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: calc(' + skinVar('fs-body') + ' * 1.6);',
    '  line-height: 1;',
    '  font-weight: 600;',
    '}',
    s('add-label') + ', ' + s('add-hint') + ' {',
    '  max-width: 100%;',
    '  overflow-wrap: anywhere;',
    '}',
    s('add-hint') + ' {',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-weight: 600;',
    '}',
    '/* 按月分组的组头：月份 ＋ 计数（由本件算）＋ 可选补充；分家靠发丝线。 */',
    s('group') + ' {',
    '  display: grid;',
    '  gap: 8px;',
    '  min-width: 0;',
    '}',
    s('group-head') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 10px;',
    '  margin: 0;',
    '  padding-bottom: 6px;',
    '  min-width: 0;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    s('month') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '}',
    s('group-count') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('group-head') + ' > ' + slotSel('note') + ' { margin-left: auto; }',
    '/* 脚注：共几张 ＋ 调用方给的口径（逐段一枚 span，段间一条发丝线）。 */',
    s('foot') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 8px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.6;',
    '}',
    s('count') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s('foot') + ' > ' + slotSel('note') + ' {',
    '  padding-left: 8px;',
    '  border-left: 1px solid ' + skinVar('line') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 空态：没有照片不是错误（新账本／新物品本来就没有），说清下一步。 */',
    s('empty') + ' {',
    '  margin: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '}',
    '/* 焦点地板：本件不带可点元素；调用方若把某一格或「加一张」包成按钮，焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 宽容器（≥' + String(PHOTO_GRID_THREE_COL_PX) + 'px）：两列改三列——判的是本件自己的宽度。 */',
    '@container (min-width: ' + String(PHOTO_GRID_THREE_COL_PX) + 'px) {',
    '  ' + s('grid') + ' {',
    '    grid-template-columns: repeat(3, minmax(0, 1fr));',
    '  }',
    '}',
  );
  return out.join(LF);
}
