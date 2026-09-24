/** drawer-sheet · **样式段**（本件唯一的样式来源）。
 *
 *  与 `dialog` 同一套纪律（皮肤只经 `skinVar()` 读／scope 在 `.<prefix>page-ui` 之下／**零 `box-shadow`**），
 *  层次的第二手段同样是**粗边 ＋ 外圈晕 ＋ 更暗遮罩**（零阴影皮肤下也立得住）。
 *
 *  几何契约（写在常量里也钉在判据里）：
 *   · 贴底档：宽 `min(520px, 100% - 32px)`，左右各留 16px、**底边贴齐**（这是「底部弹层」的形），
 *     上方两个角走 `radius`、下方两条边是直角；
 *   · 贴右档（`edge-side`）：整条贴容器右边，宽 `min(380px, 100% - 32px)`，上下贴齐；
 *   · 高过视口：面板是 flex 竖列，清单那一格 `flex:1 1 auto; min-height:0; overflow:auto`，
 *     头与脚 `flex:0 0 auto` ⇒ 清单滚、**完成键始终看得见**；
 *   · 候选项高 ≥52px、相邻两行留 8px 缝、关闭键与完成键 ≥44×44。
 */
import { skinVar } from '../skin/index.js';
import {
  DRAWER_EDGE_PX, DRAWER_GAP_PX, DRAWER_MAX_WIDTH_PX, DRAWER_MIN_HEIGHT_PX, DRAWER_OPTION_MIN_HEIGHT_PX,
  DRAWER_SIDE_WIDTH_PX, drawerClass, drawerOpenerClass, drawerSlot,
} from './attrs.js';

/** 本件样式段的入参。 */
export interface DrawerSheetCssInput {
  /** 类名前缀；缺省 `ilife-`。 */
  readonly prefix?: string;
}

/** 本组件的样式段。 */
export function drawerSheetCss(input?: DrawerSheetCssInput): string {
  const p = input !== undefined && input !== null && typeof input.prefix === 'string' && input.prefix !== ''
    ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const c = drawerClass(p);
  const panel = root + ' dialog.' + c;
  const slot = (name: string): string => '.' + drawerSlot(name as never, p);
  const edge = 'color-mix(in srgb, ' + skinVar('ink') + ' 30%, ' + skinVar('line') + ')';
  const halo = 'color-mix(in srgb, ' + skinVar('ink') + ' 9%, transparent)';
  const scrim = 'color-mix(in srgb, ' + skinVar('ink') + ' 46%, transparent)';
  const min = String(DRAWER_MIN_HEIGHT_PX) + 'px';
  const row = String(DRAWER_OPTION_MIN_HEIGHT_PX) + 'px';
  const gap = String(DRAWER_GAP_PX) + 'px';
  const side = String(DRAWER_EDGE_PX * 2) + 'px';
  return [
    '/* drawer-sheet（底部弹层 · 形态 C 多选 ＋ 完成 N 项）：真 <dialog> ＋ showModal()；零 box-shadow。 */',
    '/* 层次：粗边 ＋ 外圈晕 ＋ 更暗遮罩（贴底与贴右两档共用同一套配方）。 */',
    panel + '{box-sizing:border-box;',
    '  width:min(' + DRAWER_MAX_WIDTH_PX + 'px, calc(100% - ' + side + '));',
    '  max-width:calc(100% - ' + side + ');',
    '  max-height:calc(100% - ' + side + ');',
    '  max-height:calc(100dvh - ' + side + ');',
    /* 贴底：水平居中、底边贴齐（`margin-bottom` 归零就是「弹层贴着下边」这件事）。 */
    '  margin:auto auto 0;padding:0;overflow:hidden;',
    '  border:2px solid ' + edge + ';border-bottom:0;',
    '  border-radius:' + skinVar('radius') + ' ' + skinVar('radius') + ' 0 0;',
    '  outline:3px solid ' + halo + ';',
    '  background:' + skinVar('surface') + ';color:' + skinVar('ink') + ';',
    '  font:400 ' + skinVar('fs-body') + '/1.5 ' + skinVar('font') + '}',
    panel + ':not([open]){display:none}',
    panel + '[open]{display:flex;flex-direction:column}',
    panel + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:-4px}',
    panel + '::backdrop{background:' + scrim + '}',
    /* 贴右档：同一份标记换一边站（**形态参数**，不是媒体查询）。 */
    panel + '.edge-side{width:min(' + DRAWER_SIDE_WIDTH_PX + 'px, calc(100% - ' + side + '));',
    '  max-width:calc(100% - ' + side + ');max-height:100%;margin:0 0 0 auto;',
    '  border-right:0;border-bottom:2px solid ' + edge + ';',
    '  border-radius:' + skinVar('radius') + ' 0 0 ' + skinVar('radius') + '}',
    panel + '.edge-side ' + slot('grab') + '{display:none}',
    /* 抓手（只有贴底档画） */
    root + ' ' + slot('grab') + '{flex:0 0 auto;width:40px;height:4px;margin:10px auto 2px;',
    '  border-radius:' + skinVar('radius-pill') + ';background:' + skinVar('line') + '}',
    /* 头（不滚） */
    root + ' ' + slot('head') + '{flex:0 0 auto;display:flex;align-items:flex-start;gap:10px;padding:8px 16px 10px}',
    root + ' ' + slot('headtext') + '{flex:1 1 auto;min-width:0}',
    root + ' ' + slot('title') + '{margin:0;font-size:' + skinVar('fs-h3') + ';font-weight:700;line-height:1.35;',
    '  overflow-wrap:anywhere}',
    root + ' ' + slot('sub') + '{display:block;margin-top:2px;color:' + skinVar('ink-2') + ';',
    '  font-size:' + skinVar('fs-xs') + ';line-height:1.5;overflow-wrap:anywhere}',
    root + ' ' + slot('close') + '{flex:0 0 auto;display:grid;place-items:center;width:' + min + ';height:' + min + ';',
    '  margin:-6px -8px -6px 0;padding:0;border:0;border-radius:' + skinVar('radius-pill') + ';background:none;',
    '  color:' + skinVar('ink-2') + ';font:400 ' + skinVar('fs-body') + '/1 ' + skinVar('font') + ';cursor:pointer}',
    root + ' ' + slot('close') + ':active{transform:scale(.98);transition:transform 60ms linear}',
    root + ' ' + slot('close') + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:2px}',
    /* 清单（滚的是它） */
    root + ' ' + slot('body') + '{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;',
    '  gap:' + gap + ';padding:0 16px 12px}',
    root + ' ' + slot('opt') + '{display:flex;align-items:center;gap:10px;box-sizing:border-box;min-height:' + row + ';',
    '  padding:8px 12px;border:2px solid ' + edge + ';border-radius:' + skinVar('radius-sm') + ';',
    '  background:' + skinVar('surface') + ';color:' + skinVar('ink') + ';',
    '  font:400 ' + skinVar('fs-sm') + '/1.4 ' + skinVar('font') + ';cursor:pointer}',
    root + ' ' + slot('opt') + ':has(' + slot('box') + ':checked){background:' + skinVar('accent-soft') + ';',
    '  border-color:' + skinVar('accent') + '}',
    root + ' ' + slot('opt') + ':has(' + slot('box') + ':focus-visible){outline:2px solid ' + skinVar('accent') + ';',
    '  outline-offset:2px}',
    root + ' ' + slot('box') + '{flex:0 0 auto;width:22px;height:22px;margin:0;accent-color:' + skinVar('accent') + '}',
    root + ' ' + slot('text') + '{flex:1 1 auto;min-width:0;font-weight:600;overflow-wrap:anywhere}',
    root + ' ' + slot('note') + '{display:block;margin-top:1px;color:' + skinVar('ink-2') + ';font-weight:400;',
    '  font-size:' + skinVar('fs-xs') + '}',
    root + ' ' + slot('meta') + '{flex:0 0 auto;color:' + skinVar('ink-2') + ';font-size:' + skinVar('fs-xs') + ';',
    '  font-family:' + skinVar('font-num') + ';font-variant-numeric:tabular-nums}',
    root + ' ' + slot('opt') + '[data-ilife-drawer-off="1"]{cursor:not-allowed;background:' + skinVar('surface-2') + ';',
    '  border-color:' + skinVar('line') + ';color:' + skinVar('ink-2') + '}',
    root + ' ' + slot('hint') + '{margin:2px 0 0;color:' + skinVar('ink-2') + ';font-size:' + skinVar('fs-xs') + ';',
    '  line-height:1.5;overflow-wrap:anywhere}',
    root + ' ' + slot('empty') + '{flex:1 1 auto;margin:0;padding:18px 16px;color:' + skinVar('ink-2') + ';',
    '  font-size:' + skinVar('fs-sm') + ';line-height:1.6;overflow-wrap:anywhere}',
    /* 脚（不滚） */
    root + ' ' + slot('foot') + '{flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:10px 16px;',
    '  border-top:1px solid ' + skinVar('line') + ';background:' + skinVar('surface') + '}',
    root + ' ' + slot('count') + '{flex:1 1 auto;min-width:0;color:' + skinVar('ink-2') + ';',
    '  font-size:' + skinVar('fs-xs') + ';line-height:1.4;overflow-wrap:anywhere}',
    root + ' ' + slot('count') + ' b{color:' + skinVar('ink') + ';font-family:' + skinVar('font-num') + ';',
    '  font-variant-numeric:tabular-nums}',
    root + ' ' + slot('countnote') + '{display:block;color:' + skinVar('ink-2') + '}',
    /* 完成键（实底）：底取 `accent-text` 而不是 `accent`（小字压强调底走仓内 #179 的口径：
       `--blue` 4.02:1 不到 AA，`--blue2` 起才够）。 */
    root + ' ' + slot('done') + '{flex:0 0 auto;min-height:' + min + ';padding:0 16px;box-sizing:border-box;',
    '  border:2px solid ' + skinVar('accent-text') + ';border-radius:' + skinVar('radius-sm') + ';',
    '  background:' + skinVar('accent-text') + ';color:' + skinVar('accent-ink') + ';',
    '  font:600 ' + skinVar('fs-sm') + '/1.15 ' + skinVar('font') + ';cursor:pointer;overflow-wrap:anywhere}',
    root + ' ' + slot('done') + ':active{transform:scale(.98);transition:transform 60ms linear}',
    root + ' ' + slot('done') + ':focus-visible{outline:2px solid ' + skinVar('ink') + ';outline-offset:2px}',
    root + ' ' + slot('done') + '[disabled]{cursor:not-allowed;background:' + skinVar('surface-2') + ';',
    '  border-color:' + skinVar('line') + ';color:' + skinVar('ink-2') + '}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + root + ' ' + slot('opt') + ':hover{border-color:' + skinVar('accent') + '}',
    '  ' + root + ' ' + slot('opt') + '[data-ilife-drawer-off="1"]:hover{border-color:' + skinVar('line') + '}',
    '  ' + root + ' ' + slot('close') + ':hover{background:' + skinVar('surface-2') + '}',
    '  ' + root + ' ' + slot('done') + ':not([disabled]):hover{border-color:' + skinVar('ink') + '}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  ' + root + ' ' + slot('done') + ':active,' + root + ' ' + slot('close') + ':active{transform:none;transition:none}',
    '}',
    /* 触发键 */
    root + ' ' + '.' + drawerOpenerClass(p) + '{display:inline-flex;align-items:center;justify-content:center;',
    '  min-height:' + min + ';padding:0 16px;box-sizing:border-box;border:2px solid ' + edge + ';',
    '  border-radius:' + skinVar('radius-sm') + ';background:' + skinVar('surface') + ';',
    '  color:' + skinVar('accent-text') + ';font:600 ' + skinVar('fs-sm') + '/1.15 ' + skinVar('font') + ';',
    '  cursor:pointer;overflow-wrap:anywhere}',
    root + ' ' + '.' + drawerOpenerClass(p) + ':active{transform:scale(.98);transition:transform 60ms linear}',
    root + ' ' + '.' + drawerOpenerClass(p) + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:2px}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + root + ' ' + '.' + drawerOpenerClass(p) + ':hover{border-color:' + skinVar('accent') + '}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  ' + root + ' ' + '.' + drawerOpenerClass(p) + ':active{transform:none;transition:none}',
    '}',
  ].join('\n');
}
