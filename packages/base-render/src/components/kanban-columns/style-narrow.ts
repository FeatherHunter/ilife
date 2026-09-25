/** kanban-columns · **窄容器段样式**（本件自己那份容器查询；由 `style.ts` 汇总，产物顺序不变）。
 *
 *  拆分只为行数（本包告警线 350；与 `scatter-fit/style-forms.ts`、`drag-sort` 同批同一处手法）：
 *  同一份纪律、同一个前缀，搬走的是行数，不是取值；`kanbanColumnsCss()` 的产物逐字节不变。
 *
 *  这一段判的是**本件自己的宽度**（`@container`，不是视口）：窄于
 *  `KANBAN_COLUMNS_NARROW_PX` 时一列一屏——分段切换出来，列区一次只留当前那一列
 *  （三列同时立着会把内容挤成三根细柱）。
 */
import {
  KANBAN_COLUMNS_CONTAINER,
  KANBAN_COLUMNS_NARROW_PX,
  KANBAN_COLUMNS_SHOW_ATTR,
  kanbanColumnsSlot,
  type KanbanColumnsSlot,
} from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 窄容器段（`@container` 一条，里面 6 条规则）。由 `style.ts` 按前缀汇总。 */
export function kanbanColumnsNarrowCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** **槽类名**（不带 scope）：写「某槽下的子件」时只许用它。 */
  const sc = (slot: KanbanColumnsSlot): string => '.' + kanbanColumnsSlot(slot, p);
  /** **带 scope 的完整选择器**（一条规则打头用）。 */
  const s = (slot: KanbanColumnsSlot): string => root + ' ' + sc(slot);
  const narrow = '@container ' + KANBAN_COLUMNS_CONTAINER
    + ' (max-width: ' + String(KANBAN_COLUMNS_NARROW_PX) + 'px)';
  /** 窄档当前列的命中器（`show="2"` ⇒ 第二列留下来；值由分段切换与入参 `activeCol` 给）。 */
  const shown = (at: number): string => s('host') + '[' + KANBAN_COLUMNS_SHOW_ATTR + '="' + String(at) + '"]'
    + ' ' + sc('cols') + ' > ' + sc('col') + ':nth-child(' + String(at) + ')';

  return [
    '/* 窄容器（<' + String(KANBAN_COLUMNS_NARROW_PX) + 'px）：**一列一屏**——分段切换出来，',
    '   一次只留当前那一列（三列同时立着会把内容挤成三根细柱）。',
    '   判的是**本件自己的宽度**：嵌进侧栏／面板／卡片时照样按自己的宽度折（所以这里不用 `@media`）。 */',
    narrow + ' {',
    '  ' + s('switch') + ' {',
    '    display: grid;',
    '    grid-auto-flow: column;',
    '    grid-auto-columns: minmax(0, 1fr);',
    '    gap: 8px;',
    '  }',
    '  ' + s('cols') + '.is-n2, ' + s('cols') + '.is-n3, ' + s('cols') + '.is-n4 {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '  ' + s('cols') + ' > ' + sc('col') + ' { display: none; }',
    '  ' + shown(1) + ' { display: flex; }',
    '  ' + shown(2) + ' { display: flex; }',
    '  ' + shown(3) + ' { display: flex; }',
    '  ' + shown(4) + ' { display: flex; }',
    '}',
  ].join(LF);
}
