/** drag-sort · **第二形态（`buttons` 按钮排序）那一段样式**（同目录第二份样式来源；由 `style.ts` 的
 *  `dragSortCss()` 汇总）。
 *
 *  为什么有这一件：本件一次落两档骨架，样式段一度到 306 行（本包告警线 350，`packages/base-render/AGENTS.md`）。
 *  第二形态那几样（把手只有字形／选中行站起来／两半控件／虚线落点预告）边界干净，独立成件；
 *  **旧档那一段一个字节都不改**——搬的只是「住哪个文件」。
 *
 *  纪律同 `style.ts`：只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下／
 *  零 `:root`／零 `!important`／零颜色字面量／零省略手段（序号与名称永不截断）／宽度只许容器判。
 *
 *  这一档与原型（`.scratch/ui-组件墙/新件/parts-交互与流程.mjs` 第 83 件 B 档）的三处偏离，都有理由：
 *   · 两半之间留 `DRAG_SORT_GAP_PX`（8px）的缝，不是原型那一道发丝线——触屏上两个挨着的半边会误按
 *     （上移按成下移），地板是相邻触控目标 ≥8px；控件仍是**一颗**（一个外框两半，中间没有各自的描边）。
 *   · 选中行不挪身子（原型 B 也不挪）：站起来靠投影 ＋ 强调描边，位移留给「拖拽中」那一档。
 *   · 虚线预告的标签不写旁白（原型那句「点「上移」→ 落到第 1 位，某某顺延」）——只写「落到第 n 位」，
 *     谁被顶下去**由那根线的位置本身**表示（用户口径：一屏只留一层话）。
 */
import { skinVar } from '../skin/contract.js';
import {
  DRAG_SORT_CONTAINER,
  DRAG_SORT_GAP_PX,
  DRAG_SORT_HOVER_QUERY,
  DRAG_SORT_MOVE_MIN_PX,
  DRAG_SORT_NARROW_PX,
  DRAG_SORT_TOUCH_PX,
  dragSortSlot,
  type DragSortSlot,
} from './attrs.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 第二形态的样式。恒返回非空 CSS 文本（由 `dragSortCss()` 插在正确的位置上）。 */
export function dragSortFormsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** 不带 scope 的槽类名：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。 */
  const c = (slot: DragSortSlot): string => '.' + dragSortSlot(slot, p);
  /** 本件根（第二形态）：`.is-buttons` 挂在根上，于是这一档的规则只在这一档命中，旧档零命中。 */
  const bins = root + ' .' + p + 'block-drag-sort' + '.is-buttons';
  /** 第二形态下某个槽：`b('row')`＝`.…page-ui .…block-drag-sort.is-buttons .…block-drag-sort-row`。 */
  const b = (slot: DragSortSlot): string => bins + ' ' + c(slot);

  return [
    m('base-render.components-drag-sort-style-forms.c001'),
    m('base-render.components-drag-sort-style-forms.c002'),
    m('base-render.components-drag-sort-style-forms.c003'),
    m('base-render.components-drag-sort-style-forms.c004', {
      p0: String(String(DRAG_SORT_TOUCH_PX)),
      p1: String(String(DRAG_SORT_TOUCH_PX)),
    }),
    b('handle') + ' {',
    '  border: 0;',
    '  background: none;',
    '  color: ' + skinVar('ink-2') + ';',
    '}',
    m('base-render.components-drag-sort-style-forms.c005'),
    b('row') + '.is-picked {',
    '  position: relative;',
    '  z-index: 2;',
    '  background: ' + skinVar('surface') + ';',
    '  border-color: ' + skinVar('accent') + ';',
    '  box-shadow: ' + skinVar('shadow') + ';',
    '}',
    m('base-render.components-drag-sort-style-forms.c006'),
    b('meta') + ' { margin-left: 0; }',
    m('base-render.components-drag-sort-style-forms.c007'),
    b('move') + ' {',
    '  display: inline-flex;',
    '  flex: none;',
    '  margin-left: auto;',
    '  gap: ' + String(DRAG_SORT_GAP_PX) + 'px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '}',
    m('base-render.components-drag-sort-style-forms.c008', {
      p0: String(String(DRAG_SORT_MOVE_MIN_PX)),
      p1: String(String(DRAG_SORT_TOUCH_PX)),
    }),
    b('move-up') + ', ' + b('move-down') + ' {',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  min-width: ' + String(DRAG_SORT_MOVE_MIN_PX) + 'px;',
    '  min-height: ' + String(DRAG_SORT_TOUCH_PX) + 'px;',
    '  border: 0;',
    '  border-radius: 0;',
    '  background: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .02em;',
    '  cursor: pointer;',
    '  touch-action: manipulation;',
    '}',
    m('base-render.components-drag-sort-style-forms.c009'),
    b('row') + '.is-picked ' + c('move') + ' { border-color: ' + skinVar('accent') + '; }',
    b('row') + '.is-picked ' + c('move-up') + ', ' + b('row') + '.is-picked ' + c('move-down') + ' {',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
    m('base-render.components-drag-sort-style-forms.c010'),
    b('move-up') + ':disabled, ' + b('move-down') + ':disabled {',
    '  color: ' + skinVar('ink-3') + ';',
    '  cursor: not-allowed;',
    '}',
    b('move-up') + ':active, ' + b('move-down') + ':active { background: ' + skinVar('accent-soft') + '; }',
    m('base-render.components-drag-sort-style-forms.c011'),
    m('base-render.components-drag-sort-style-forms.c012'),
    b('drop') + ' {',
    '  position: relative;',
    '  display: flex;',
    '  align-items: center;',
    '  min-height: 32px;',
    '  padding: 2px 0;',
    '}',
    b('drop') + ' > i {',
    '  height: 0;',
    '  margin-top: 0;',
    '  border-top: 1px dashed ' + skinVar('accent') + ';',
    '  background: none;',
    '}',
    b('drop') + ' > b {',
    '  padding: 0 8px;',
    '  border: 0;',
    '  border-radius: 0;',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
    m('base-render.components-drag-sort-style-forms.c013'),
    b('move-up') + ':focus-visible, ' + b('move-down') + ':focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    m('base-render.components-drag-sort-style-forms.c014'),
    '@media ' + DRAG_SORT_HOVER_QUERY + ' {',
    '  ' + b('move-up') + ':hover, ' + b('move-down') + ':hover { color: ' + skinVar('accent-text') + '; }',
    '}',
    m('base-render.components-drag-sort-style-forms.c015', { p0: String(String(DRAG_SORT_NARROW_PX)) }),
    m('base-render.components-drag-sort-style-forms.c016'),
    '@container ' + DRAG_SORT_CONTAINER + ' (max-width: ' + String(DRAG_SORT_NARROW_PX) + 'px) {',
    '  ' + b('move') + ' {',
    '    flex: 1 1 100%;',
    '    margin-left: 0;',
    '    justify-content: flex-end;',
    '  }',
    '}',
  ].join(LF);
}
