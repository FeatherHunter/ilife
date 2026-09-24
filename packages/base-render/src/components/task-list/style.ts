/** task-list · **样式段**（本件唯一的样式来源）。
 *
 *  三条纪律（与组件层其余件同一份）：
 *   1. 颜色／圆角／字面／字号一律经 `skinVar()` 读（老页面没挂皮肤时落到那 11 个冻结 token）；
 *   2. 全部规则 scope 在 `.<prefix>page-ui` 之下（不开 pageUi 的页零命中 ⇒ 加法式）；
 *   3. 状态「字 ＋ 形 ＋ 色」三样齐：勾选框是**真框形**（空框 → 实心框 ＋ ✓），行名另加**划线**，
 *      色只是第三样 ⇒「大字报刊」皮肤下强调色＝墨黑也分得出。
 *
 *  交互件的地板（判据逐条断）：
 *   · **整行是命中区**（`<label>` 高 ≥44，宽＝行宽）⇒ 手指不用去够那 22px 的框；
 *   · `:hover` 包在 `@media (hover:hover) and (pointer:fine)` 里，且**不是唯一通路**（勾选靠 `change`）；
 *   · `:active` 只动 `transform`（≤80ms），`prefers-reduced-motion` 下关掉过渡、状态照落（不卡半路）；
 *   · `:focus-visible` 有可见焦点环（画在框形上，2px）；`disabled` 有 `cursor:not-allowed` ＋ 行上写明为什么；
 *   · 只动 `transform`／`opacity`（进度条填充也是 `scaleX`，不改宽度）。
 *
 *  几何契约：零横向溢出（`flex-wrap` ＋ `minmax(0,1fr)` ＋ `overflow-wrap:anywhere`）；
 *  勾选框、名称、读数三个槽在窄档各就各位（读数换行到右侧、不挤压名称）。
 *  窄宽由**容器**决定（`container-type:inline-size` ＋ `@container`），不看视口。
 */
import { skinVar } from '../skin/contract.js';
import { taskListClass, taskListSlot, type TaskListSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本件的内容容器名（`@container` 按它命中）。 */
export const TASK_LIST_CONTAINER = 'ilife-task-list';
/** 窄档断点（px）：容器窄于它就换排法（**不是**视口断点）。 */
export const TASK_LIST_NARROW_MAX_PX = 420;
/** 整行命中区的高度下限（px）：44 是全仓的触控地板。 */
export const TASK_LIST_HIT_MIN_HEIGHT_PX = 44;
/** 勾选框的边长（px）：视觉盒 22，命中盒靠整行。 */
export const TASK_LIST_CHECK_SIZE_PX = 22;
/** 进度条高度（px）。 */
export const TASK_LIST_BAR_HEIGHT_PX = 7;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function taskListCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /** 槽类的**裸**选择器（不带 `.page-ui` 前缀）：只用在"祖先已经由 `sc()`／`cls()` 给过"的嵌套选择器里——
   *  否则会拼成 `.page-ui .a .page-ui .b`（那要求 `.page-ui` 出现在件内部），永远匹配不上（实拍踩过）。 */
  const bare = (name: TaskListSlot): string => '.' + taskListSlot(name, p);
  const sc = (name: TaskListSlot): string => root + ' ' + bare(name);
  /** 行内那几个类（可见的框形／命中区／名称）：渲染与运行时共用 `attrs.ts` 那一份名字。 */
  const cls = (suffix: string): string => root + ' .' + taskListClass(p) + suffix;
  const bareCls = (suffix: string): string => '.' + taskListClass(p) + suffix;
  const s = cls('');
  const row = cls('-row');
  const hit = cls('-hit');
  const check = cls('-check');
  const label = cls('-label');
  const v = skinVar;
  return [
    '/* task-list（勾选清单）：一条一行，整行是命中区；组头与表头给"勾了几样"。 */',
    s + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  min-width: 0;',
    '  container: ' + TASK_LIST_CONTAINER + ' / inline-size;',
    '}',
    sc('head') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  padding-bottom: 6px;',
    '}',
    sc('title') + ' {',
    '  color: ' + v('ink') + ';',
    '  font-size: ' + v('fs-sm') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    sc('progress') + ' {',
    '  margin-left: auto;',
    '  color: ' + v('ink-2') + ';',
    '  font-size: ' + v('fs-xs') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    sc('progress') + ' b {',
    '  color: ' + v('ink') + ';',
    '  font-family: ' + v('font-num') + ';',
    '  font-weight: 800;',
    '}',
    sc('bar') + ' {',
    '  height: ' + TASK_LIST_BAR_HEIGHT_PX + 'px;',
    '  border-radius: ' + v('radius-pill') + ';',
    '  background: ' + v('line') + ';',
    '  overflow: hidden;',
    '}',
    sc('bar-fill') + ' {',
    '  display: block;',
    '  height: 100%;',
    '  transform-origin: left center;',
    '  transform: scaleX(0);',
    '  background: ' + v('accent') + ';',
    '  transition: transform .18s cubic-bezier(.22,1,.36,1);',
    '}',
    sc('body') + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  min-width: 0;',
    '  margin-top: 6px;',
    '}',
    sc('group') + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  min-width: 0;',
    '}',
    '/* 组头：字 ＋ 计数 ＋ 一条横线（分区靠线与字，不靠底色）。 */',
    sc('group-title') + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 8px;',
    '  margin: 8px 0 2px;',
    '  color: ' + v('ink-2') + ';',
    '  font-size: ' + v('fs-xs') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .06em;',
    '}',
    sc('group-title') + '::after {',
    '  content: "";',
    '  flex: 1 1 auto;',
    '  height: 1px;',
    '  background: ' + v('line') + ';',
    '}',
    sc('group-name') + ' { flex: 0 0 auto; }',
    sc('group-count') + ' {',
    '  flex: 0 0 auto;',
    '  color: ' + v('ink-3') + ';',
    '  font-family: ' + v('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  letter-spacing: 0;',
    '}',
    row + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  min-width: 0;',
    '  border-top: 1px solid ' + v('line') + ';',
    '}',
    hit + ' {',
    '  position: relative;',
    '  display: flex;',
    /* 允许换行：窄档那条 `@container` 规则把"读数"整行挪下去（不换行的话它会一直挤着名称）。 */
    '  flex-wrap: wrap;',
    '  align-items: flex-start;',
    '  gap: 10px;',
    '  box-sizing: border-box;',
    '  min-width: 0;',
    '  min-height: ' + TASK_LIST_HIT_MIN_HEIGHT_PX + 'px;',
    '  padding: 10px 0;',
    '  cursor: pointer;',
    '  border-radius: ' + v('radius-sm') + ';',
    '}',
    '/* 勾选框：真 input 隐身留在原地（可 Tab、可读屏），视觉走旁边的框形。 */',
    check + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  top: 0;',
    '  width: ' + TASK_LIST_CHECK_SIZE_PX + 'px;',
    '  height: ' + TASK_LIST_CHECK_SIZE_PX + 'px;',
    '  margin: 0;',
    '  opacity: 0;',
    '  pointer-events: none;',
    '}',
    check + '-box {',
    '  position: relative;',
    '  flex: 0 0 auto;',
    '  box-sizing: border-box;',
    '  width: ' + TASK_LIST_CHECK_SIZE_PX + 'px;',
    '  height: ' + TASK_LIST_CHECK_SIZE_PX + 'px;',
    '  margin-top: 1px;',
    '  border: 1.5px solid ' + v('ink-3') + ';',
    '  border-radius: ' + v('radius-sm') + ';',
    '  background: ' + v('surface') + ';',
    '  transition: transform 60ms linear;',
    '}',
    '/* 勾上：框变实心 ＋ ✓（形 ＋ 字）；行名同划一道线（第二样信息）。 */',
    '/* `+` 两侧的两个选择器都要是**裸**的：写成 `.page-ui .check + .page-ui .box` 时，',
    '   那个 `.page-ui` 必须紧邻在勾选框后面，永远不成立（实拍踩过）。 */',
    check + ':checked + ' + bareCls('-check-box') + ' {',
    '  border-color: ' + v('accent') + ';',
    '  background: ' + v('accent') + ';',
    '}',
    check + ':checked + ' + bareCls('-check-box') + '::after {',
    '  content: "✓";',
    '  position: absolute;',
    '  inset: 0;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  color: ' + v('accent-ink') + ';',
    '  font-size: 14px;',
    '  font-weight: 700;',
    '  line-height: 1;',
    '}',
    check + ':focus-visible + ' + bareCls('-check-box') + ' {',
    '  outline: 2px solid ' + v('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    check + ':disabled + ' + bareCls('-check-box') + ' {',
    '  border-color: ' + v('line') + ';',
    '  background: ' + v('surface-2') + ';',
    '}',
    row + ':has(' + bareCls('-check') + ':disabled) ' + bareCls('-hit') + ' { cursor: not-allowed; }',
    row + ':has(' + bareCls('-check') + ':disabled) ' + bareCls('-label') + ' { color: ' + v('ink-2') + '; }',
    label + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  color: ' + v('ink') + ';',
    '  font-size: ' + v('fs-sm') + ';',
    '  line-height: 1.5;',
    '  overflow-wrap: anywhere;',
    '}',
    label + ' em {',
    '  display: block;',
    '  margin-top: 2px;',
    '  color: ' + v('ink-3') + ';',
    '  font-size: ' + v('fs-xs') + ';',
    '  font-style: normal;',
    '  line-height: 1.55;',
    '}',
    sc('amount') + ' {',
    '  flex: 0 0 auto;',
    '  color: ' + v('ink-2') + ';',
    '  font-family: ' + v('font-num') + ';',
    '  font-size: ' + v('fs-sm') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '}',
    '/* 已勾：行名划线变灰（形态＋色两样），框变实心（第三样）。 */',
    row + '.is-done ' + bareCls('-label') + ' {',
    '  color: ' + v('ink-3') + ';',
    '  text-decoration: line-through;',
    '}',
    row + '.is-done ' + bareCls('-label') + ' em { text-decoration: none; }',
    row + '.is-done ' + bare('amount') + ' { color: ' + v('ink-3') + '; }',
    '/* 错态：写在勾选框旁边（不只染色），运行时读它的 id 挂 aria-describedby。 */',
    sc('err') + ' {',
    '  margin: 0 0 8px ' + (TASK_LIST_CHECK_SIZE_PX + 10) + 'px;',
    '  padding-left: 8px;',
    '  border-left: 3px solid ' + v('danger') + ';',
    '  color: ' + v('danger') + ';',
    '  font-size: ' + v('fs-xs') + ';',
    '  line-height: 1.55;',
    '  overflow-wrap: anywhere;',
    '}',
    sc('absent') + ' {',
    '  padding: 12px 0 2px;',
    '  color: ' + v('ink-3') + ';',
    '  font-size: ' + v('fs-sm') + ';',
    '}',
    sc('foot') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 12px;',
    '  margin-top: 10px;',
    '  padding-top: 8px;',
    '  border-top: 1px solid ' + v('line') + ';',
    '  color: ' + v('ink-2') + ';',
    '  font-size: ' + v('fs-xs') + ';',
    '}',
    '/* 悬停：包在设备能力查询里，且**不是唯一通路**（勾选由 `change` 驱动，触屏没有悬停也照勾）。 */',
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + hit + ':hover { background: ' + v('surface-2') + '; }',
    '}',
    '/* 按下：只动 transform，≤80ms。 */',
    hit + ':active ' + bareCls('-check-box') + ' { transform: scale(.9); }',
    '/* 减动效：过渡关掉，状态照落（不许有东西卡在半路）。 */',
    '@media (prefers-reduced-motion:reduce) {',
    '  ' + check + '-box { transition: none; }',
    '  ' + sc('bar-fill') + ' { transition: none; }',
    '}',
    '/* 窄档：右侧读数另起一行靠右，名称不被挤压。 */',
    '@container ' + TASK_LIST_CONTAINER + ' (max-width: ' + TASK_LIST_NARROW_MAX_PX + 'px) {',
    '  ' + sc('amount') + ' { flex: 1 1 100%; text-align: right; }',
    '  ' + sc('progress') + ' { margin-left: 0; }',
    '}',
  ].join(LF);
}
