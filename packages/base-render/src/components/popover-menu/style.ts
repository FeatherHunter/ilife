/** popover-menu · **样式段**（本件唯一的样式来源）。
 *
 *  纪律与同族两件同一套：皮肤只经 `skinVar()` 读／scope 在 `.<prefix>page-ui` 之下／
 *  **一条 `box-shadow` 都不写**（零阴影皮肤下浮面照样立得住：**粗边 ＋ 外圈晕 ＋ 顶层**）。
 *
 *  定位两道（票面钉死的降级路）：
 *   · **@supports (anchor-name: --a) 之内**：CSS 锚定定位——`position-area: bottom span-left`
 *     （贴右档）／`bottom span-right`（贴左档），`position-try-fallbacks: flip-block, flip-inline`
 *     在贴不下时翻到上方／另一侧；
 *   · **之外**：退回普通定位元素（`position: fixed; inset: auto` ＋ 触发键旁那点边距），
 *     打开时由运行时按触发键的矩形算 `left`／`top`（这一点写在 `runtime.ts` 的行为契约里）。
 *  两条能力查询串与运行时**读同一份常量**（`MENU_ANCHOR_QUERY`／`MENU_AREA_QUERY`）：
 *  CSS 与脚本对「这个引擎支不支持」必须说同一件事。
 */
import { skinVar } from '../skin/index.js';
import {
  MENU_ANCHOR_QUERY, MENU_AREA_QUERY, MENU_EDGE_PX, MENU_GAP_PX, MENU_MAX_HEIGHT_PX,
  MENU_MIN_HEIGHT_PX, MENU_OFFSET_PX, MENU_WIDTH_PX, menuClass, menuSlot,
} from './attrs.js';

/** 本件样式段的入参。 */
export interface PopoverMenuCssInput {
  /** 类名前缀；缺省 `ilife-`。 */
  readonly prefix?: string;
}

/** 本组件的样式段。 */
export function popoverMenuCss(input?: PopoverMenuCssInput): string {
  const p = input !== undefined && input !== null && typeof input.prefix === 'string' && input.prefix !== ''
    ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const c = menuClass(p);
  const slot = (name: string): string => '.' + menuSlot(name as never, p);
  const edge = 'color-mix(in srgb, ' + skinVar('ink') + ' 30%, ' + skinVar('line') + ')';
  const halo = 'color-mix(in srgb, ' + skinVar('ink') + ' 9%, transparent)';
  const min = String(MENU_MIN_HEIGHT_PX) + 'px';
  const gap = String(MENU_GAP_PX) + 'px';
  const side = String(MENU_EDGE_PX) + 'px';
  const offset = String(MENU_OFFSET_PX) + 'px';
  const panel = root + ' ' + slot('panel');
  return [
    '/* popover-menu（浮出菜单 · 形态 A 贴着按钮）：popover ＋ role=menu；零 box-shadow。 */',
    '/* 层次：粗边 ＋ 外圈晕 ＋ 顶层（`popover` 的顶层是浏览器给的，不靠任何投影）。 */',
    root + ' ' + '.' + c + '{position:relative;display:inline-flex}',
    root + ' ' + slot('trigger') + '{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;',
    '  min-height:' + min + ';padding:0 14px;border:2px solid ' + edge + ';',
    '  border-radius:' + skinVar('radius-sm') + ';background:' + skinVar('surface') + ';',
    '  color:' + skinVar('accent-text') + ';font:600 ' + skinVar('fs-sm') + '/1.15 ' + skinVar('font') + ';',
    '  cursor:pointer;overflow-wrap:anywhere}',
    root + ' ' + slot('trigger') + '[aria-expanded="true"]{background:' + skinVar('surface-2') + ';',
    '  border-color:' + skinVar('accent') + ';color:' + skinVar('ink') + '}',
    root + ' ' + slot('trigger') + ':active{transform:scale(.98);transition:transform 60ms linear}',
    root + ' ' + slot('trigger') + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:2px}',
    /* 面板：**降级路**（普通定位元素）；@supports 之内那一段再把它换成锚定定位。 */
    panel + '{box-sizing:border-box;position:fixed;inset:auto;margin:' + offset + ' 0 0;padding:6px;',
    '  width:min(' + MENU_WIDTH_PX + 'px, calc(100% - ' + side + ' - ' + side + '));',
    '  max-height:' + MENU_MAX_HEIGHT_PX + 'px;overflow:auto;',
    '  background:' + skinVar('surface') + ';color:' + skinVar('ink') + ';',
    '  border:2px solid ' + edge + ';border-radius:' + skinVar('radius-sm') + ';',
    '  outline:3px solid ' + halo + ';',
    '  font:400 ' + skinVar('fs-sm') + '/1.35 ' + skinVar('font') + '}',
    panel + ':not(:popover-open){display:none}',
    /* 锚定定位（**只在支持锚定 API 的引擎里**生效；两条能力查询与运行时同一份常量）。 */
    '@supports (' + MENU_ANCHOR_QUERY + '){',
    '  @supports (' + MENU_AREA_QUERY + '){',
    '    ' + panel + '.is-end:popover-open{position-area:bottom span-left;',
    '      position-try-fallbacks:flip-block,flip-inline}',
    '    ' + panel + '.is-start:popover-open{position-area:bottom span-right;',
    '      position-try-fallbacks:flip-block,flip-inline}',
    '  }',
    '}',
    /* 项：一行一枚真按钮；相邻两枚留 8px 缝（命中区不粘在一起）。 */
    root + ' ' + slot('panel') + ' ' + slot('item') + '{display:flex;align-items:center;gap:10px;width:100%;',
    '  box-sizing:border-box;min-height:' + min + ';padding:0 10px;margin-top:' + gap + ';',
    '  border:0;border-radius:' + skinVar('radius-sm') + ';background:none;color:' + skinVar('ink') + ';',
    '  text-align:left;font:400 ' + skinVar('fs-sm') + '/1.35 ' + skinVar('font') + ';cursor:pointer}',
    root + ' ' + slot('panel') + ' ' + slot('item') + ':first-of-type{margin-top:0}',
    root + ' ' + slot('item') + ':active{transform:scale(.98);transition:transform 60ms linear}',
    root + ' ' + slot('item') + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:-2px}',
    root + ' ' + slot('item') + '.is-danger{color:' + skinVar('danger') + '}',
    root + ' ' + slot('item') + '[aria-checked="true"] ' + slot('key') + '{font-weight:700}',
    root + ' ' + slot('group') + '{padding:' + gap + ' 10px 3px;color:' + skinVar('ink-2') + ';',
    '  font-size:' + skinVar('fs-xs') + ';font-weight:700}',
    root + ' ' + slot('sep') + '{height:1px;margin:' + gap + ' 6px;background:' + skinVar('line') + '}',
    root + ' ' + slot('key') + '{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}',
    root + ' ' + slot('note') + '{display:block;color:' + skinVar('ink-2') + ';font-size:' + skinVar('fs-xs') + ';',
    '  margin-top:1px}',
    root + ' ' + slot('shortcut') + '{flex:0 0 auto;padding:1px 6px;border:1px solid ' + skinVar('line') + ';',
    '  border-radius:' + skinVar('radius-sm') + ';background:' + skinVar('surface-2') + ';',
    '  color:' + skinVar('ink-2') + ';font-family:' + skinVar('font-num') + ';font-size:' + skinVar('fs-xs') + '}',
    root + ' ' + slot('tick') + '{flex:0 0 auto;width:16px;color:' + skinVar('accent-text') + ';font-weight:700}',
    root + ' ' + slot('panel') + ' ' + slot('item') + '[disabled]{cursor:not-allowed;color:' + skinVar('ink-2') + '}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + root + ' ' + slot('trigger') + ':hover{border-color:' + skinVar('accent') + '}',
    '  ' + root + ' ' + slot('item') + ':hover{background:' + skinVar('surface-2') + '}',
    '  ' + root + ' ' + slot('item') + '.is-danger:hover{background:' + skinVar('danger-soft') + '}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  ' + root + ' ' + slot('trigger') + ':active,' + root + ' ' + slot('item') + ':active{transform:none;transition:none}',
    '}',
  ].join('\n');
}
