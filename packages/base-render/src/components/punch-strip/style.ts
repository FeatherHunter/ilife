/** punch-strip · **样式段**（本组件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：只读冻结 token，不新增 token 名；全部规则 scope 在 `.<prefix>page-ui` 下。
 *
 *  几何契约（钉在测试里）：
 *   · 格宽是**份数**（`flex: 1 1 0`）⇒ 总宽永远等于容器宽，N 格换 M 格不横滑（390 档无横滚）；
 *   · 空心盒与实心盒**同一副盒模型**（描边改成实色、不删边框）⇒ 有数／没数的格子等高等宽，不跳版；
 *   · 日期位与盒子里的小字都走 `PAPER_MONO_STACK`（原型 `.punch .d`／`.b.on` 同款）。
 *
 *  色：暖档纸面 token 集里没有（同 `sheet-frame` 的纸边与 `scale-bar` 的语义红先例）⇒
 *  打孔虚线用原型 `--dash` 的字面 `#d8d2c2`，朱红描边用朱红印那支字面 `#b3402b`（与印章同一支）。
 */
import { PAPER_MONO_STACK } from '../shared/typography.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 盒子的几何（px）：高度与被"打孔"的方角——两处读数住这里，样式与测试都读它。 */
export const PUNCH_STRIP_BOX_HEIGHT_PX = 34;
export const PUNCH_STRIP_BOX_RADIUS_PX = 3;

/** 暖档字面色：打孔虚线（原型 `--dash`）／选中描边（与印章同一支朱红）。 */
const DASH = '#d8d2c2';
const SEAL = '#b3402b';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function punchStripCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = root + ' .' + p + 'block-punch-strip';
  return [
    '/* punch-strip（打孔格带）：一格一天，虚线"打孔"盒；有数填深色、选中套朱红圈。 */',
    s + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 4px;',
    '  min-width: 0;',
    '}',
    '/* 小标题与"账目/明细"两件的标题同一套字距语汇（同一族里只有一种小标题写法）。 */',
    s + '-heading {',
    '  margin-bottom: 2px;',
    '  color: var(--fg3);',
    '  font-size: 11.5px;',
    '  font-weight: 700;',
    '  letter-spacing: .22em;',
    '}',
    s + '-cells {',
    '  display: flex;',
    '  align-items: flex-end;',
    '  gap: 6px;',
    '  min-width: 0;',
    '}',
    s + '-cell {',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 4px;',
    '}',
    s + '-date {',
    '  font-family: ' + PAPER_MONO_STACK + ';',
    '  font-size: 10px;',
    '  letter-spacing: -.02em;',
    '  color: var(--fg3);',
    '  text-align: center;',
    '  white-space: nowrap;',
    '}',
    s + '-box {',
    '  box-sizing: border-box;',
    '  height: ' + PUNCH_STRIP_BOX_HEIGHT_PX + 'px;',
    '  border: 1px dashed ' + DASH + ';',
    '  border-radius: ' + PUNCH_STRIP_BOX_RADIUS_PX + 'px;',
    '  display: flex;',
    '  align-items: flex-end;',
    '  justify-content: center;',
    '  padding-bottom: 4px;',
    '  font-family: ' + PAPER_MONO_STACK + ';',
    '  font-size: 10.5px;',
    '  color: var(--fg3);',
    '  overflow: hidden;',
    '}',
    '/* 有数：填深色（描边改实色、不删边框 ⇒ 与空心盒等高等宽）。 */',
    s + '-cell.is-on ' + '.' + p + 'block-punch-strip-box {',
    '  background: var(--fg);',
    '  border-color: var(--fg);',
    '  border-style: solid;',
    '  color: var(--card);',
    '  font-weight: 700;',
    '}',
    '/* 选中：一格朱红描边（原型 `.punch .b.sel`；一页至多一格）。 */',
    s + '-cell.is-selected ' + '.' + p + 'block-punch-strip-box {',
    '  outline: 1.5px solid ' + SEAL + ';',
    '  outline-offset: 1px;',
    '}',
  ].join(LF);
}
