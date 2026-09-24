/** tooltip · **样式段**（本件唯一的样式来源）。
 *
 *  纪律与同族其余件同一套：皮肤只经 `skinVar()` 读／scope 在 `.<prefix>page-ui` 之下／
 *  **一条 `box-shadow` 都不写**（零阴影皮肤下浮面照样立得住：**粗边 ＋ 外圈晕 ＋ 顶层**）。
 *
 *  定位两道：
 *   · **@supports (anchor-name: --a) 之内**：`top: calc(anchor(bottom) + 8px)`（**竖轴贴词**）＋
 *     横轴 `left: max(12px, calc(50% - 280px))` ＋ `width: min(560px, 100% - 24px)`（**横轴夹在容器里**）；
 *     贴不下时 `position-try-fallbacks: --tooltip-up` 翻到词的上方（**名字不带 `ilife-`**：
 *     `--ilife-*` 是皮肤 token 的命名空间，方位名是结构不是语言——见 `attrs.ts` 的 `TOOLTIP_ANCHOR_PREFIX`）。
 *     —— 宽气泡**不跟词对齐**：一条 560px 的气泡挂在句子中间那个词上，跟词对齐在窄屏必然越界。
 *   · **之外**：同一套横轴 + `position: fixed; inset: auto`（普通定位元素），打开时运行时算 `top`。
 *
 *  命中盒：词在行里不能撑行，视觉盒就是那两个字的宽度 ⇒ ≥44×44 的命中盒由一圈**看不见的**
 *  `::after`（`inset: -12px -8px`）往外撑；判据用 `elementFromPoint` 在词中心上下各 21px 处量到它。
 */
import { skinVar } from '../skin/index.js';
import {
  TOOLTIP_ANCHOR_QUERY, TOOLTIP_EDGE_PX, TOOLTIP_OFFSET_PX, TOOLTIP_WIDTH_PX,
  tooltipClass, tooltipSlot,
} from './attrs.js';

/** 本件样式段的入参。 */
export interface TooltipCssInput {
  /** 类名前缀；缺省 `ilife-`。 */
  readonly prefix?: string;
}

/** 本组件的样式段。 */
export function tooltipCss(input?: TooltipCssInput): string {
  const p = input !== undefined && input !== null && typeof input.prefix === 'string' && input.prefix !== ''
    ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const c = tooltipClass(p);
  const slot = (name: string): string => '.' + tooltipSlot(name as never, p);
  const edge = 'color-mix(in srgb, ' + skinVar('ink') + ' 30%, ' + skinVar('line') + ')';
  const halo = 'color-mix(in srgb, ' + skinVar('ink') + ' 9%, transparent)';
  const off = String(TOOLTIP_OFFSET_PX) + 'px';
  const side = String(TOOLTIP_EDGE_PX) + 'px';
  const half = String(TOOLTIP_WIDTH_PX / 2) + 'px';
  const bubble = root + ' ' + slot('bubble');
  const word = root + ' ' + slot('word');
  return [
    '/* tooltip（气泡说明 · 形态 B 宽气泡带「为什么重要」）：popover ＋ role=tooltip；零 box-shadow。 */',
    '/* 层次：粗边 ＋ 外圈晕 ＋ 顶层（`popover` 的顶层是浏览器给的，不靠任何投影）。 */',
    root + ' ' + '.' + c + '{position:relative;display:inline-block}',
    /* 词：行里的真按钮，视觉盒就是那两个字；下划线是「这里可以问一句」的记号（不是投影）。 */
    word + '{position:relative;display:inline-flex;align-items:baseline;gap:4px;margin:0 -2px;padding:0 2px;',
    '  border:0;border-radius:' + skinVar('radius-sm') + ';background:none;color:' + skinVar('ink') + ';',
    '  font:600 inherit;font-family:inherit;line-height:inherit;cursor:help;',
    '  text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:2px;',
    '  text-decoration-color:color-mix(in srgb, ' + skinVar('ink') + ' 45%, transparent)}',
    /* 看不见的命中扩展：把命中盒撑到 ≥44px（判据在词中心上下各 21px 处量 elementFromPoint）。 */
    word + '::after{content:"";position:absolute;inset:-12px -8px}',
    word + ':active{transform:scale(.98);transition:transform 60ms linear}',
    word + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:2px}',
    root + ' ' + slot('mark') + '{color:' + skinVar('ink-2') + ';font-size:' + skinVar('fs-xs') + '}',
    /* 气泡：**横轴夹在容器里**（宽气泡不跟词对齐），竖轴贴词。 */
    bubble + '{box-sizing:border-box;position:fixed;inset:auto;',
    '  left:max(' + side + ', calc(50% - ' + half + '));',
    '  top:auto;bottom:auto;width:min(' + TOOLTIP_WIDTH_PX + 'px, calc(100% - ' + side + ' - ' + side + '));',
    '  max-height:calc(100% - ' + side + ' - ' + side + ');overflow:auto;margin:' + off + ' 0 0;',
    '  display:block;padding:12px 14px;background:' + skinVar('surface') + ';color:' + skinVar('ink') + ';',
    '  border:2px solid ' + edge + ';border-radius:' + skinVar('radius') + ';outline:3px solid ' + halo + ';',
    '  font:400 ' + skinVar('fs-sm') + '/1.6 ' + skinVar('font') + ';overflow-wrap:anywhere}',
    bubble + ':not(:popover-open){display:none}',
    /* 锚定定位（**只在支持锚定 API 的引擎里**生效；能力查询串与运行时同一份常量）。 */
    '@supports (' + TOOLTIP_ANCHOR_QUERY + '){',
    '  ' + bubble + ':popover-open{top:calc(anchor(bottom) + ' + off + ');',
    '    position-try-fallbacks:' + '--tooltip-up}',
    '  @position-try --tooltip-up{top:auto;bottom:calc(anchor(top) + ' + off + ')}',
    '}',
    root + ' ' + slot('head') + '{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;',
    '  padding-bottom:8px;border-bottom:1px solid ' + skinVar('line') + '}',
    root + ' ' + slot('badge') + '{flex:0 0 auto;padding:1px 7px;border:1px solid ' + skinVar('line') + ';',
    '  border-radius:' + skinVar('radius-sm') + ';background:' + skinVar('surface-2') + ';',
    '  color:' + skinVar('accent-text') + ';font:600 ' + skinVar('fs-xs') + '/1.6 ' + skinVar('font-num') + '}',
    root + ' ' + slot('title') + '{flex:1 1 auto;min-width:0;font-size:' + skinVar('fs-h3') + ';font-weight:700;',
    '  line-height:1.4;overflow-wrap:anywhere}',
    root + ' ' + slot('hint') + '{flex:0 0 auto;color:' + skinVar('ink-2') + ';font-size:' + skinVar('fs-xs') + '}',
    root + ' ' + slot('text') + '{display:block;padding-top:10px;color:' + skinVar('ink-2') + ';',
    '  font-size:' + skinVar('fs-sm') + ';line-height:1.7;max-width:68ch}',
    /* 形态 B 的识别特征：这一段「为什么重要」必须在。 */
    root + ' ' + slot('why') + '{display:block;margin-top:10px;padding-top:10px;border-top:1px solid ' + skinVar('line') + ';',
    '  color:' + skinVar('ink-2') + ';font-size:' + skinVar('fs-xs') + ';line-height:1.6;max-width:68ch}',
    root + ' ' + slot('why') + ' b{margin-right:4px;color:' + skinVar('ink') + '}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + word + ':hover{background:' + skinVar('surface-2') + '}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  ' + word + ':active{transform:none;transition:none}',
    '}',
  ].join('\n');
}
