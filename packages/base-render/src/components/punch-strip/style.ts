/** punch-strip · **样式段**（本组件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：只读 token，不新增 token 名；全部规则 scope 在 `.<prefix>page-ui` 下。
 *  **色一律读 token**：文字走冻结 token（皮肤作用域里有旧名映射），虚线／软底／描边几处显式经 `skinVar()` 读皮肤。
 *
 *  几何契约（钉在测试里）：
 *   · 格宽是**份数**（`flex: 1 1 0`）⇒ 总宽永远等于容器宽，N 格换 M 格不横滑（390 档无横滚）；
 *   · 空心盒与实心盒**同一副盒模型**（描边改成实色、不删边框）⇒ 有数／没数的格子等高等宽，不跳版；
 *   · 日期位与盒子里的小字（两处都是"数"）都经 `skinVar('font-num')` 读皮肤的数字字面。
 *
 *  色（选中态口径）：打孔虚线走 `line`、选中描边走 `accent`；**有数格走"有文字的选中面"那一档**
 *  （底 `accent-soft`、字 `accent-text`、描边 `accent`）——盒里那枚 10.5px 读数是**字**，
 *  而实心 `accent` 那一档只许放图形／勾／大字（`accent-ink` on `accent` 在 `neutral` 只有 4.02:1，
 *  过不了文本地板 ⇒ 读数不许坐在实心强调底上）。件里零颜色字面量。
 */
import { skinVar } from '../skin/contract.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 盒子的几何（px）：高度与被"打孔"的方角——两处读数住这里，样式与测试都读它。 */
export const PUNCH_STRIP_BOX_HEIGHT_PX = 34;
export const PUNCH_STRIP_BOX_RADIUS_PX = 3;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function punchStripCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = root + ' .' + p + 'block-punch-strip';
  return [
    '/* punch-strip（打孔格带）：一格一天，虚线"打孔"盒；有数格填主色软底＋主色字、选中套主色圈。 */',
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
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: 10px;',
    '  letter-spacing: -.02em;',
    '  color: var(--fg3);',
    '  text-align: center;',
    '  white-space: nowrap;',
    '}',
    s + '-box {',
    '  box-sizing: border-box;',
    '  height: ' + PUNCH_STRIP_BOX_HEIGHT_PX + 'px;',
    '  border: 1px dashed ' + skinVar('line') + ';',
    '  border-radius: ' + PUNCH_STRIP_BOX_RADIUS_PX + 'px;',
    '  display: flex;',
    '  align-items: flex-end;',
    '  justify-content: center;',
    '  padding-bottom: 4px;',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: 10.5px;',
    '  color: var(--fg3);',
    '  overflow: hidden;',
    '}',
    '/* 有数：底改主色软底、字取强调色的文本档、描边取主色（**面上有读数 ⇒ 走"有文字的选中面"那一档**；',
    '   实心 accent 那一档只许放图形／勾／大写大字）。描边改实色、不删边框 ⇒ 与空心盒等高等宽、不跳版。 */',
    s + '-cell.is-on ' + '.' + p + 'block-punch-strip-box {',
    '  background: ' + skinVar('accent-soft') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  border-style: solid;',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '}',
    '/* 选中：一格主色描边（一页至多一格；只描边、不改字色 ⇒ 不写成反白）。 */',
    s + '-cell.is-selected ' + '.' + p + 'block-punch-strip-box {',
    '  outline: 1.5px solid ' + skinVar('accent') + ';',
    '  outline-offset: 1px;',
    '}',
  ].join(LF);
}
