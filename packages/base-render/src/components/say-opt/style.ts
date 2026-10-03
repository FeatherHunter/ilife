/** say-opt · **样式段**（本件唯一的样式来源）。
 *
 *  判地＝`docs/skills/skill-bill/proto/say-collect/x01-记支出-采集-v2.3.html` 的内嵌 <style>
 *  里 `.say-opt` 那十条：虚线暖边的一折 ＋ 一行表头（44px 触控下限）＋ 组内表单 ＋ 组尾提示行。
 *  两处**合成**（记在这里，别处不再写）：
 *   · `.say-opt .say-form` 只给了组内的 `margin`，它那几条布局（一列 ＋ 10px 间距）来自 `.say-form`
 *     自身 —— 本件把两条并成 `-form` 一条（组内那层容器由本件产出，故不必分两处写）；
 *   · 表头里那四格（`.lbl` ／ `.plus` ／ `.sub` ／ `.cnt`）一律换成槽类名，声明一条不动。
 *
 *  纪律：只经 `skinVar()` 读皮肤（源码里不写手写的 `var(--ilife-…)`）；
 *  scope 全在 `.<prefix>page-ui` 之下；零 `:root` ／零 `!important` ／零新 token 名；
 *  颜色与圆角只有**判地授权的那几处字面**——每一处的上一行都压着
 *  `判地字面 · 授权照抄：#…（用途）` 那句话（#1114 的授权，逐处记账、不许悄悄再加一颗）。
 */
import { skinVar } from '../skin/contract.js';
import { sayOptSlot, type SayOptSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 表头的触控下限（px）：判地 `.say-opt>summary{min-height:44px}`。 */
export const SAY_OPT_TOUCH_PX = 44;
/** 外框圆角（px）：判地 `.say-opt{border-radius:12px}`（皮肤三档里没有 12 ⇒ 本票逐字照抄）。 */
export const SAY_OPT_RADIUS_PX = 12;
/** 组内左右内距（px）：判地表头的 `13px` 一档（表单与提示行同一条竖线）。 */
export const SAY_OPT_GUTTER_X_PX = 13;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function sayOptCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-say-opt';
  const s = (slot: SayOptSlot): string => root + ' .' + sayOptSlot(slot, p);

  return [
    '/* say-opt（选填组）：一行表头 ・ 组内表单 ・ 组尾提示行；折叠走原生 details。 */',
    box + ' {',
    '  margin: 10px 0 0;',
    '  /* 判地字面 · 授权照抄：#ddd0b6（这一折的虚线暖边） */',
    '  border: 1px dashed #ddd0b6;',
    '  /* 判地字面 · 授权照抄：' + SAY_OPT_RADIUS_PX + 'px（外框圆角；皮肤三档里没有这一档） */',
    '  border-radius: ' + SAY_OPT_RADIUS_PX + 'px;',
    '  /* 判地字面 · 授权照抄：#fdfaf3（选填组的底色 —— 与必填格的暖底分得开） */',
    '  background: #fdfaf3;',
    '  overflow: hidden;',
    '}',
    box + ' > summary {',
    '  list-style: none;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  min-height: ' + SAY_OPT_TOUCH_PX + 'px;',
    '  padding: 10px ' + SAY_OPT_GUTTER_X_PX + 'px;',
    '  font-size: 13px;',
    '  font-weight: 700;',
    '  color: ' + skinVar('ink-2') + ';',
    '}',
    box + ' > summary::-webkit-details-marker {',
    '  display: none;',
    '}',
    s('lbl') + ' {',
    '  flex: none;',
    '  white-space: nowrap;',
    '}',
    s('plus') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('accent') + ';',
    '  font-weight: 900;',
    '  font-size: 15px;',
    '  line-height: 1;',
    '}',
    s('sub') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  font-weight: 400;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: 12px;',
    '  overflow-wrap: anywhere;',
    '}',
    s('cnt') + ' {',
    '  flex: none;',
    '  font-size: 12px;',
    '  color: ' + skinVar('accent') + ';',
    '  font-weight: 800;',
    '  white-space: nowrap;',
    '}',
    box + '[open] > summary {',
    '  /* 判地字面 · 授权照抄：#ddd0b6（展开时表头下的虚线分隔） */',
    '  border-bottom: 1px dashed #ddd0b6;',
    '  /* 判地字面 · 授权照抄：#fbf7ec（展开时表头的暖底 —— 与组内那些格同一块底） */',
    '  background: #fbf7ec;',
    '}',
    s('form') + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 10px;',
    '  margin: 10px ' + SAY_OPT_GUTTER_X_PX + 'px 0;',
    '}',
    s('note') + ' {',
    '  margin: 6px ' + SAY_OPT_GUTTER_X_PX + 'px 12px;',
    '  font-size: 12px;',
    '  line-height: 1.6;',
    '  color: ' + skinVar('ink-3') + ';',
    '}',
  ].join(LF);
}
