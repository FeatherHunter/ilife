/** dialog · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律：
 *   1. 皮肤只经 `skinVar()` 读（**不手写 `var(--ilife-…)`**）；一条 `:root` 都不写、一条 `!important` 都不用、
 *      不定义新 token 名——判据按这三条扫全文。
 *   2. scope 在 `.<prefix>page-ui` 之下：不开 pageUi 的页零命中（加法式），也**不碰别人的类名**。
 *   3. **层次不靠投影**：小票纸与大字报刊两套皮肤是零阴影皮肤，浮面若靠 `--shadow` 立起来，一换皮就塌。
 *      本件一条 `box-shadow` 都不写，层次的第二手段是三样**与皮肤无关**的东西：
 *        · **粗边**：2px（页内细线是 1px 的发丝线，粗一档就读得出「这是浮面」）；
 *        · **外圈晕**：`outline: 3px`（零模糊，不是投影；`outline` 跟 `border-radius` 走）；
 *        · **遮罩更暗**：`::backdrop` 拿 `ink` 算 46% 压暗（顶层 ＋ 压暗一起读作「下面那层进不去」）。
 *
 *  几何契约（写在常量里也钉在判据里）：
 *   · 窄档**不贴边**：面板宽 `min(344px, 100% - 32px)` ⇒ 390 档左右各留 23px、360 档各留 16px；
 *   · 高过视口**内部滚**：面板是 flex 竖列，正文那一格 `flex:1 1 auto; min-height:0; overflow:auto`，
 *     动作条 `flex:0 0 auto` ⇒ 正文滚、动作条始终看得见；
 *   · 命中区 **≥44×44**（`DIALOG_MIN_HEIGHT_PX`，全宽口径，不只窄屏）。
 */
import { skinVar } from '../skin/index.js';
import {
  DIALOG_EDGE_PX, DIALOG_MAX_WIDTH_PX, DIALOG_MIN_HEIGHT_PX, DIALOG_STATUS_ATTR,
  dialogClass, dialogOpenerClass, dialogSlot,
} from './attrs.js';

/** 样式段的入参（与同层其余件同形：前缀可换）。 */
export interface DialogCssInput {
  /** 类名前缀；缺省 `ilife-`。 */
  readonly prefix?: string;
}

/** 前缀归一（缺省 `ilife-`；与本层其余件同一条口径）。 */
function prefixOf(input: DialogCssInput | undefined): string {
  return input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
}

/** 浮面的**硬边**：比发丝线深一档的裁切边（零阴影皮肤下「这是浮面」的第一手段）。 */
export function dialogEdgeMix(): string {
  return 'color-mix(in srgb, ' + skinVar('ink') + ' 30%, ' + skinVar('line') + ')';
}

/** 浮面的**外圈晕**：零模糊的 `outline`（第二手段；不是投影）。 */
export function dialogHaloMix(): string {
  return 'color-mix(in srgb, ' + skinVar('ink') + ' 9%, transparent)';
}

/** **遮罩**：拿 `ink` 算出来的压暗（第三手段；不写死黑）。 */
export function dialogScrimMix(): string {
  return 'color-mix(in srgb, ' + skinVar('ink') + ' 46%, transparent)';
}

/** 本组件的样式段（调用方拼进 `<style>`；`dialogCss()` 是它唯一的对外名）。 */
export function dialogCss(input?: DialogCssInput): string {
  const p = prefixOf(input);
  const root = '.' + p + 'page-ui';
  const panel = root + ' dialog.' + dialogClass(p);
  const slot = (name: string): string => '.' + dialogSlot(name as never, p);
  const opener = '.' + dialogOpenerClass(p);
  const edge = dialogEdgeMix();
  const min = String(DIALOG_MIN_HEIGHT_PX) + 'px';
  const gap = String(DIALOG_EDGE_PX * 2) + 'px';
  return [
    '/* dialog（对话框 · 形态 A 确认型）：真 <dialog> ＋ showModal()——遮罩、焦点锁、Esc、顶层都是浏览器给的。 */',
    '/* 层次：粗边 ＋ 外圈晕 ＋ 更暗遮罩（本件零 box-shadow ⇒ 零阴影的两套皮肤下也立得住）。 */',
    panel + '{box-sizing:border-box;',
    '  width:min(' + DIALOG_MAX_WIDTH_PX + 'px, calc(100% - ' + gap + '));',
    '  max-width:calc(100% - ' + gap + ');',
    /* 两条 max-height：`%` 是给「还认不得 dvh」的兜底，认得的走下面那条（手机上不被地址栏吃掉半屏）。 */
    '  max-height:calc(100% - ' + gap + ');',
    '  max-height:calc(100dvh - ' + gap + ');',
    '  margin:auto;padding:0;overflow:hidden;',
    '  border:2px solid ' + edge + ';',
    '  border-radius:' + skinVar('radius') + ';',
    '  outline:3px solid ' + dialogHaloMix() + ';',
    '  background:' + skinVar('surface') + ';color:' + skinVar('ink') + ';',
    '  font:400 ' + skinVar('fs-body') + '/1.5 ' + skinVar('font') + '}',
    /* 关着的一律不显示（`open` 的显隐由原生属性决定，这里只把开着的排成竖列）。 */
    panel + ':not([open]){display:none}',
    panel + '[open]{display:flex;flex-direction:column}',
    panel + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:-4px}',
    panel + '::backdrop{background:' + dialogScrimMix() + '}',
    /* 头部（不滚） */
    root + ' ' + slot('head') + '{flex:0 0 auto;display:flex;gap:12px;padding:18px 18px 0}',
    root + ' ' + slot('headtext') + '{min-width:0}',
    root + ' ' + slot('icon') + '{flex:0 0 auto;display:grid;place-items:center;width:34px;height:34px;',
    '  border-radius:' + skinVar('radius-pill') + ';background:' + skinVar('warn-soft') + ';color:' + skinVar('warn') + '}',
    panel + '.tone-danger ' + slot('icon') + '{background:' + skinVar('danger-soft') + ';color:' + skinVar('danger') + '}',
    root + ' ' + slot('title') + '{margin:0;font-size:' + skinVar('fs-h3') + ';font-weight:700;line-height:1.4;',
    '  overflow-wrap:anywhere}',
    root + ' ' + slot('sub') + '{display:block;margin-top:3px;color:' + skinVar('ink-2') + ';',
    '  font-size:' + skinVar('fs-xs') + ';line-height:1.5;overflow-wrap:anywhere}',
    /* 正文（滚的是它） */
    root + ' ' + slot('body') + '{flex:1 1 auto;min-height:0;overflow:auto;padding:10px 18px 0;',
    '  color:' + skinVar('ink-2') + ';font-size:' + skinVar('fs-sm') + ';line-height:1.6;overflow-wrap:anywhere}',
    root + ' ' + slot('body') + ' p{margin:0 0 8px}',
    root + ' ' + slot('body') + ' p:last-child{margin-bottom:0}',
    /* 状态行：写在动作条上方（不只染色；形状符号由标记给） */
    root + ' ' + slot('status') + '{flex:0 0 auto;margin:0;padding:12px 18px 0;color:' + skinVar('danger') + ';',
    '  font-size:' + skinVar('fs-xs') + ';line-height:1.5;overflow-wrap:anywhere}',
    root + ' ' + slot('status') + ' b{margin-right:4px}',
    root + ' ' + slot('status') + '[' + DIALOG_STATUS_ATTR + '="busy"]{color:' + skinVar('ink-2') + '}',
    root + ' ' + slot('note') + '{flex:0 0 auto;margin:0;padding:12px 18px 0;color:' + skinVar('ink-2') + ';',
    '  font-size:' + skinVar('fs-xs') + ';line-height:1.5;overflow-wrap:anywhere}',
    /* 动作条（不滚）＋ 动作键（≥44×44） */
    root + ' ' + slot('foot') + '{flex:0 0 auto;display:flex;gap:8px;padding:16px 18px 18px}',
    root + ' ' + slot('act') + '{flex:1 1 0;min-width:' + min + ';min-height:' + min + ';box-sizing:border-box;',
    '  padding:7px 14px;border:2px solid ' + edge + ';border-radius:' + skinVar('radius-sm') + ';',
    '  background:' + skinVar('surface') + ';color:' + skinVar('ink') + ';',
    '  font:600 ' + skinVar('fs-sm') + '/1.15 ' + skinVar('font') + ';cursor:pointer;overflow-wrap:anywhere}',
    /* 主动作（实底）：底取 **`accent-text`**（同族深一档）而不是 `accent`——小字压强调底要走仓内
       #179 的口径（`--blue` 4.02:1 不到 AA 的 4.5:1，`--blue2` 起才够），这条口径在 `blocks.ts` 里
       逐处写着。破坏性档换 `danger`（压 `accent-ink` 7.7:1）。 */
    root + ' ' + slot('act') + ':last-child{background:' + skinVar('accent-text') + ';',
    '  border-color:' + skinVar('accent-text') + ';color:' + skinVar('accent-ink') + '}',
    panel + '.tone-danger ' + slot('foot') + ' ' + slot('act') + ':last-child{background:' + skinVar('danger') + ';',
    '  border-color:' + skinVar('danger') + '}',
    root + ' ' + slot('act') + ':active{transform:scale(.98);transition:transform 60ms linear}',
    root + ' ' + slot('act') + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:2px}',
    root + ' ' + slot('act') + ':last-child:focus-visible{outline-color:' + skinVar('ink') + '}',
    root + ' ' + slot('act') + '[disabled]{cursor:not-allowed;background:' + skinVar('surface-2') + ';',
    '  border-color:' + skinVar('line') + ';color:' + skinVar('ink-2') + '}',
    /* loading：原地换字（宽度由 flex 定住 ⇒ 不跳版）；转圈归调用方，组件只声明「正在写」这一档 */
    root + ' ' + slot('act') + '[aria-busy="true"]{cursor:progress}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + root + ' ' + slot('act') + ':hover{border-color:' + skinVar('accent') + '}',
    '  ' + root + ' ' + slot('act') + ':last-child:hover{border-color:' + skinVar('ink') + '}',
    '  ' + root + ' ' + slot('act') + '[disabled]:hover{border-color:' + skinVar('line') + '}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  ' + root + ' ' + slot('act') + ':active{transform:none;transition:none}',
    '}',
    /* 触发键（页面正文里那一枚；焦点归还回路的另一头） */
    root + ' ' + opener + '{display:inline-flex;align-items:center;justify-content:center;min-height:' + min + ';',
    '  padding:0 16px;box-sizing:border-box;border:2px solid ' + edge + ';',
    '  border-radius:' + skinVar('radius-sm') + ';background:' + skinVar('surface') + ';',
    '  color:' + skinVar('accent-text') + ';font:600 ' + skinVar('fs-sm') + '/1.15 ' + skinVar('font') + ';',
    '  cursor:pointer;overflow-wrap:anywhere}',
    root + ' ' + opener + ':active{transform:scale(.98);transition:transform 60ms linear}',
    root + ' ' + opener + ':focus-visible{outline:2px solid ' + skinVar('accent') + ';outline-offset:2px}',
    '@media (hover:hover) and (pointer:fine){',
    '  ' + root + ' ' + opener + ':hover{border-color:' + skinVar('accent') + '}',
    '}',
    '@media (prefers-reduced-motion: reduce){',
    '  ' + root + ' ' + opener + ':active{transform:none;transition:none}',
    '}',
  ].join('\n');
}
