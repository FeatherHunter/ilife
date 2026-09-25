/** kanban-columns · **形态 `grouped` 的样式段**（按位置分列 ＋ 列内二级组；由 `style.ts` 汇总，产物顺序在窄容器段之前）。
 *
 *  拆分只为行数（本包告警线 350；与同目录 `style-narrow.ts` 同一处手法）：同一份纪律、同一个前缀，
 *  搬走的是行数，不是取值。
 *
 *  **这一档的三条形状决定**（用户 2026-09-26 的复看口径 ＋ `docs/base/base-render/触屏优先.md` §二 B 档）：
 *   1. **列壳浮起走 `--shadow`**：这一档的列是一张**立起来的板**（中性皮肤下那枚 token 是真投影，
 *      小票纸／大字报刊／水墨本就是 `none`——它们有自己的边与纸纹，不该再多一层浮起）。只读 `skinVar()`。
 *   2. **二级组减层**（「层次由**边多**变**边准**」）：组的竖边一道 3px（`KANBAN_COLUMNS_GROUP_EDGE_PX`），
 *      组名行底下再压一道 1px 发丝线，把「组名」那一层与「物件行」那一层分开；
 *      **物件行不再各挂一根竖边**——原来一根组边里再嵌五根行边，左沿六条边在读，层次反而糊。
 *      全档只有两处边：组边（3px，层次）与**拿起那一行的主色侧标**（2px，状态；见下）。
 *   3. **一屏只留一层话**：这一档没有落点线、没有空槽旁白——列头就一行「列名 ＋ 计数」，
 *      组名行一行「组名 ＋ 组计数」，物件行一行「名字 ＋ 量」；拿起之后靠状态句 ＋ 各列收纳键的字说话。
 *
 *  拿起那一行按**「整行选中」**那一档走（`docs/base/base-render/选中态与皮肤语言.md` 第三节）：
 *  底 `surface-2` ＋ 左侧 2px `accent` 侧标 ＋ 行内主字仍 `ink`；再叠上 `KANBAN_COLUMNS_LIFT_PX` 的位移
 *  （与 `status` 档同一道「站起来」的形）。**未拿起的行不画边**：那 2px 是透明色的槽位，
 *  留着只为「拿起时不横跳」，不是一条边。
 */
import { skinVar } from '../skin/contract.js';
import {
  KANBAN_COLUMNS_GROUP_EDGE_PX,
  KANBAN_COLUMNS_HOVER_QUERY,
  KANBAN_COLUMNS_LIFT_PX,
  KANBAN_COLUMNS_TOUCH_PX,
  kanbanColumnsSlot,
  type KanbanColumnsSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 形态 `grouped` 的那一段（每一条都钉在 `.is-grouped` 上：**`status` 档一个字节都不碰**）。 */
export function kanbanColumnsGroupedCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** **槽类名**（不带 scope）：写「某槽下的子件」时只许用它。 */
  const sc = (slot: KanbanColumnsSlot): string => '.' + kanbanColumnsSlot(slot, p);
  /** **本档的完整选择器**：`.<prefix>page-ui .<件>.is-grouped <槽>`——形态限定写在这一个助手里。 */
  const g = (slot: KanbanColumnsSlot): string => root + ' ' + '.' + p + 'block-kanban-columns.is-grouped ' + sc(slot);
  const hover = '@media ' + KANBAN_COLUMNS_HOVER_QUERY;

  return [
    '/* kanban-columns（形态 grouped「按位置分列 ＋ 列内二级组」）：列＝位置，列里再挂一层组。',
    '   这一档没有落点线、没有空槽旁白——列头一行读数、组名行一行读数、物件行一行读数。 */',
    '/* 列壳：这一档的列是一张**立起来的板**（`--shadow` 在中性皮肤下是真投影，纸族本就是 none）。 */',
    g('col') + ' {',
    '  box-shadow: ' + skinVar('shadow') + ';',
    '}',
    '/* 列头：**读数一行说完**——「列名 ＋ 计数」同占一行（`status` 档那三条 areas 在这一档收成一条）。 */',
    g('head') + ' {',
    '  grid-template-columns: auto minmax(0, 1fr) auto;',
    '  grid-template-areas: "name count add";',
    '}',
    g('count') + ' {',
    '  justify-self: end;',
    '}',
    '/* 列身：组与组之间留 12px（比物件行之间那 8px 宽一档——层次先靠留白，再靠那两道线）。 */',
    g('body') + ' {',
    '  gap: 12px;',
    '}',
    '/* 二级组：一道 ' + String(KANBAN_COLUMNS_GROUP_EDGE_PX) + 'px 竖边 ＋ 左缩进。',
    '   **全档唯一一道层次边**：组里的物件行自己不带边（原型那儿左沿六条边在读）。 */',
    g('group') + ' {',
    '  display: grid;',
    '  gap: 8px;',
    '  padding: 0 0 8px 12px;',
    '  border-left: ' + String(KANBAN_COLUMNS_GROUP_EDGE_PX) + 'px solid ' + skinVar('line') + ';',
    '  min-width: 0;',
    '}',
    '/* 组名行：组名 ＋ 组计数各一句读数；**底下压一道发丝线**，把组名那一层与物件行那一层分开。 */',
    g('ghead') + ' {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 8px;',
    '  min-height: 32px;',
    '  padding-bottom: 4px;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '  min-width: 0;',
    '}',
    g('gname') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    g('gcount') + ' {',
    '  margin-left: auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 一行物件：**整行就是那颗按钮**（名字 ＋ 量一行说完，命中盒＝整行）。',
    '   那道 2px 是**透明槽位**：没拿起时不画任何东西，拿起时换成主色侧标，行里的字一个像素都不横跳。 */',
    g('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 1fr) auto;',
    '  gap: 8px;',
    '  align-items: center;',
    '  min-height: ' + String(KANBAN_COLUMNS_TOUCH_PX) + 'px;',
    '  padding: 2px 10px;',
    '  border: 0;',
    '  border-left: 2px solid transparent;',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  text-align: start;',
    '  cursor: pointer;',
    '  transition: transform 80ms ease;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    g('row') + ' > ' + sc('label') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    g('row') + ' > ' + sc('value') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: end;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 拿起的那一行＝**整行选中**那一档：软底（次要面）＋ 左侧 2px 主色侧标 ＋ 行内主字仍 `ink`；',
    '   再叠上与 `status` 档同一道「站起来」的位移（位移口径见 `attrs.ts` 那两枚常量）。 */',
    g('row') + '.is-picked {',
    '  background: ' + skinVar('surface-2') + ';',
    '  border-left-color: ' + skinVar('accent') + ';',
    '  transform: translateY(-' + String(KANBAN_COLUMNS_LIFT_PX) + 'px);',
    '}',
    '/* 悬停只许是增强：行沿铺一层次要面（通路是点选与收纳键，鼠标悬停不是通路）。 */',
    hover + ' {',
    '  ' + g('row') + ':hover { background: ' + skinVar('surface-2') + '; }',
    '}',
    '@media (prefers-reduced-motion: reduce) {',
    '  ' + g('row') + ' { transition: none; transform: none; }',
    '}',
  ].join(LF);
}
