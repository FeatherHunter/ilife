/** say-field · **样式段**（本件唯一的样式来源）。
 *
 *  一格的几何逐字照判地（`docs/skills/skill-bill/proto/say-collect/x01-记支出-采集-v2.3.html`
 *  的内嵌 <style> 里 `.say-form` ／ `.say-field` 那几条）：暖底 ＋ 暖边输入件 ＋ 44px 触控下限。
 *  选择器一律换成槽类（`.say-field > span:first-child` → `-lbl`、`.req` → `-req`、
 *  `input` ／ `select` 两支 → `-ctl` 一支），**声明与顺序一条不动**。
 *
 *  纪律：只经 `skinVar()` 读皮肤（源码里不写手写的 `var(--ilife-…)`）；
 *  scope 全在 `.<prefix>page-ui` 之下；零 `:root` ／零 `!important` ／零新 token 名；
 *  颜色与圆角只有**判地授权的那几处字面**——每一处的上一行都压着
 *  `判地字面 · 授权照抄：#…（用途）` 那句话（#1114 的授权，逐处记账、不许悄悄再加一颗）。
 */
import { skinVar } from '../skin/contract.js';
import { sayFieldSlot, type SayFieldSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 一格的触控下限（px）：判地 `.say-field{min-height:44px}`，输入件同高。 */
export const SAY_FIELD_TOUCH_PX = 44;
/** 字段名的定宽（px）：判地 `.say-field>span:first-child{min-width:76px}`（逐格竖排靠它对齐）。 */
export const SAY_FIELD_LABEL_MIN_WIDTH_PX = 76;
/** 外框圆角（px）：判地 `.say-field{border-radius:12px}`（皮肤三档里没有 12 ⇒ 本票逐字照抄）。 */
export const SAY_FIELD_RADIUS_PX = 12;
/** 输入件圆角（px）：判地 `.say-field input{border-radius:10px}`（同理，逐字照抄）。 */
export const SAY_FIELD_CONTROL_RADIUS_PX = 10;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function sayFieldCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-say-field';
  const s = (slot: SayFieldSlot): string => root + ' .' + sayFieldSlot(slot, p);

  return [
    '/* say-field（一句话表单的一格）：字段名 ・ 输入件；格里再加一行提示。 */',
    s('form') + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 10px;',
    '  margin: 0 0 10px;',
    '}',
    box + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 10px;',
    '  min-height: ' + SAY_FIELD_TOUCH_PX + 'px;',
    '  /* 判地字面 · 授权照抄：#fbf7ec（一格的暖底） */',
    '  background: #fbf7ec;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  /* 判地字面 · 授权照抄：' + SAY_FIELD_RADIUS_PX + 'px（外框圆角；皮肤三档里没有这一档） */',
    '  border-radius: ' + SAY_FIELD_RADIUS_PX + 'px;',
    '  padding: 8px 12px;',
    '  font-size: 14px;',
    '}',
    s('lbl') + ' {',
    '  flex: none;',
    '  min-width: ' + SAY_FIELD_LABEL_MIN_WIDTH_PX + 'px;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    s('req') + ' {',
    '  color: ' + skinVar('danger') + ';',
    '  font-style: normal;',
    '  font-weight: 900;',
    '}',
    s('ctl') + ' {',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '  min-height: ' + SAY_FIELD_TOUCH_PX + 'px;',
    '  /* 判地字面 · 授权照抄：#ddd0b6（输入件的暖边） */',
    '  border: 1.5px solid #ddd0b6;',
    '  /* 判地字面 · 授权照抄：' + SAY_FIELD_CONTROL_RADIUS_PX + 'px（输入件圆角） */',
    '  border-radius: ' + SAY_FIELD_CONTROL_RADIUS_PX + 'px;',
    '  /* 判地字面 · 授权照抄：#fff（输入件的白底） */',
    '  background: #fff;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: 15px;',
    '  font-weight: 700;',
    '  padding: 8px 10px;',
    '  font-family: ' + skinVar('font') + ';',
    '}',
    s('ctl') + ':focus {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 1px;',
    '  border-color: ' + skinVar('accent') + ';',
    '}',
    s('ctl') + '.is-bad {',
    '  border-color: ' + skinVar('danger') + ';',
    '  outline: 2px solid ' + skinVar('danger') + ';',
    '}',
    s('ctl') + ':disabled {',
    '  /* 判地字面 · 授权照抄：#f4efe2（禁用态的底） */',
    '  background: #f4efe2;',
    '  /* 判地字面 · 授权照抄：#a39c8e（禁用态的字色） */',
    '  color: #a39c8e;',
    '}',
    '/* 提示行是本层新增的一格（判地那条 `.say-hint` 住在字段格之外）：弱文字，占满一整行。 */',
    s('hint') + ' {',
    '  flex: 1 1 100%;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: 12px;',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
  ].join(LF);
}
