/** skeleton · **样式段**（本件唯一的样式来源）。这也是**动效常量的家**（用户裁定：动效常量住本件的 `style.ts`）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：本件设 `container-type: inline-size`（它自己就是容器）；`@container` 只调排头那句
 *     人话（**不碰行距与列宽**——那是「加载完不跳版」的锚点）。媒体查询只判设备能力。
 *
 *  **动效纪律**（判据逐条断）：只动 `opacity`（`SKELETON_PULSE_NAME` 的每一帧只有 opacity 一条声明）；
 *  `prefers-reduced-motion: reduce` 下 `animation: none` 并换成一个**静止**的可见度（`SKELETON_STILL_OPACITY`）
 *  —— 不许有东西卡在半路，也不许把占位块变成看不见。
 *
 *  几何契约（判据钉死）：
 *   · 读数位高度 ＝ `skinVar('fs-h1') × SKELETON_READING_SCALE`（**与 `page-head` 主读数同尺度**：
 *     真读数进来时那一行的高度逐像素不变）；
 *   · 行距 ＝ `SKELETON_ROW_HEIGHT_PX` ＋ `SKELETON_ROW_SEPARATOR_PX`（行盒 `min-height` ＋ 行间发丝线）；
 *   · 时间槽宽度**读 `entry-rows` 的常量**（`ENTRY_ROW_TIME_MIN_WIDTH_PX`）—— 跨两件只有一个数字，
 *     「列对得上」由构造保证，不靠两处抄同一个数；
 *   · 版面高度 ＝ 排头 ＋ 纸面（读数位 ＋ 行数 × 行距）⇒ 是 `rows` 的线性式。
 */
import { ENTRY_ROW_TIME_MIN_WIDTH_PX } from '../entry-rows/index.js';
import { skinVar } from '../skin/contract.js';
import { skeletonSlot, type SkeletonSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 行盒高度（px）＝**行距**：真件明细行在正文 `line-height:1.5` 下的行高（`entry-rows` 的行盒子同高）。
 *  行间那条发丝线（`SKELETON_ROW_SEPARATOR_PX`）**画在这个盒子里面**（`box-sizing:border-box`）
 *  ⇒ 行盒高就是行距，加载前后逐行对得上（真机量的是相邻两行的 `top` 之差）。 */
export const SKELETON_ROW_HEIGHT_PX = 35;
/** 行间发丝线（px）：与 `entry-rows` 的行间点线同一副盒子（一条线，含在上面那个行盒里）。 */
export const SKELETON_ROW_SEPARATOR_PX = 1;
/** 主读数尺度：与 `page-head` 的主读数同尺度（读数 ＝ 页标题 × 2.2）—— 两件的读数是同一行字。 */
export const SKELETON_READING_SCALE = 2.2;
/** 值位列宽（px）：金额／热量那一列。 */
export const SKELETON_VALUE_SLOT_PX = 64;
/** 占位块与纸面的混合比（%）：`color-mix(in srgb, ink N%, surface)` —— **从 token 算出来**，不写死灰值。 */
export const SKELETON_PLACEHOLDER_MIX_PERCENT = 13;
/** 脉搏动效名（每帧只有 `opacity`）。 */
export const SKELETON_PULSE_NAME = 'ilife-block-skeleton-pulse';
/** 脉搏周期（ms）。 */
export const SKELETON_PULSE_DURATION_MS = 1400;
/** 脉搏最暗一帧的可见度（不许低到看不见）。 */
export const SKELETON_PULSE_MIN_OPACITY = 0.55;
/** `prefers-reduced-motion: reduce` 下的静止可见度（动效停住，占位块照旧看得见）。 */
export const SKELETON_STILL_OPACITY = 0.72;
/** 窄容器阈值（px，`@container` 判的是**本件自己的宽度**）：排头那句人话改两台。 */
export const SKELETON_NARROW_PX = 420;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function skeletonCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-skeleton';
  /** 槽位的**裸类名**：跟在组合子（`+`／`>`／后代）后面时用它 —— 带 `.ilife-page-ui` 前缀的复合选择器
   *  拼成 `A + .ilife-page-ui .x` 时，`+` 会落在 `.ilife-page-ui` 上（要求那个「页面壳」是前一行的兄弟），
   *  规则**静默不匹配**（2026-09 真机判据抓到过这一处）。 */
  const cls = (slot: SkeletonSlot): string => '.' + skeletonSlot(slot, p);
  const s = (slot: SkeletonSlot): string => root + ' ' + cls(slot);

  /** 占位块的底色：从两个 token 算出来（皮肤换取值，它跟着换）。 */
  const block = 'color-mix(in srgb, ' + skinVar('ink') + ' ' + String(SKELETON_PLACEHOLDER_MIX_PERCENT) + '%, '
    + skinVar('surface') + ')';
  const pulse = SKELETON_PULSE_NAME + ' ' + String(SKELETON_PULSE_DURATION_MS) + 'ms ease-in-out infinite';

  return [
    '/* skeleton（加载骨架 · 形态 A「读数 ＋ 明细行骨架」）：占位块照真版式排，加载完不跳版。',
    '   动效只走 opacity；`prefers-reduced-motion` 下停住但照样看得见。 */',
    '@keyframes ' + SKELETON_PULSE_NAME + ' {',
    '  0%, 100% { opacity: ' + String(SKELETON_PULSE_MIN_OPACITY) + '; }',
    '  50% { opacity: 1; }',
    '}',
    box + ' {',
    '  container-type: inline-size;',
    '  display: grid;',
    '  gap: 10px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    '/* 排头那句人话：正在读什么 ＋ 还要多久（骨架不是「无话可说」的样子）。 */',
    s('cap') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 10px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '}',
    s('cap-text') + ' {',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    s('cap-eta') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    '/* 纸面：占位块落在它上面（与真件的纸面同一副盒子：同内距、同圆角、同纸边）。 */',
    s('card') + ' {',
    '  display: grid;',
    '  gap: 12px;',
    '  min-width: 0;',
    '  padding: 14px 16px;',
    '  border: 1px solid ' + skinVar('edge') + ';',
    '  border-radius: ' + skinVar('radius') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  box-shadow: ' + skinVar('shadow') + ';',
    '}',
    '/* 读数位：真件这里是页头的主读数大字 ⇒ 占位块的高度就是那一行字的高度（两件同尺度）。 */',
    s('reading') + ' {',
    '  display: grid;',
    '  gap: 8px;',
    '  justify-items: start;',
    '  min-width: 0;',
    '  padding-bottom: 12px;',
    '  border-bottom: 1px solid ' + skinVar('line') + ';',
    '}',
    s('reading-value') + ' {',
    '  display: block;',
    '  box-sizing: border-box;',
    '  width: min(46%, 150px);',
    '  height: calc(' + skinVar('fs-h1') + ' * ' + String(SKELETON_READING_SCALE) + ');',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + block + ';',
    '  animation: ' + pulse + ';',
    '}',
    s('reading-sub') + ' {',
    '  display: block;',
    '  box-sizing: border-box;',
    '  width: min(30%, 96px);',
    '  height: ' + skinVar('fs-sm') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + block + ';',
    '  animation: ' + pulse + ';',
    '}',
    '/* 明细行组：列宽与真件一致（时间槽读 `entry-rows` 的常量、值位右对齐）。 */',
    s('list') + ' {',
    '  display: grid;',
    '  gap: 0;',
    '  min-width: 0;',
    '}',
    s('row') + ' {',
    '  display: grid;',
    '  grid-template-columns: ' + String(ENTRY_ROW_TIME_MIN_WIDTH_PX) + 'px minmax(0, 1fr) minmax(0, '
      + String(SKELETON_VALUE_SLOT_PX) + 'px);',
    '  gap: 10px;',
    '  align-items: center;',
    '  box-sizing: border-box;',
    '  min-height: ' + String(SKELETON_ROW_HEIGHT_PX) + 'px;',
    '  min-width: 0;',
    '}',
    '/* 行间一条发丝线（第一行不出，与 `entry-rows` 同一副盒子）；`box-sizing:border-box` ⇒',
    '   线画在行盒里，行距恒 ＝ ' + String(SKELETON_ROW_HEIGHT_PX) + 'px。 */',
    s('row') + ' + ' + cls('row') + ' {',
    '  border-top: ' + String(SKELETON_ROW_SEPARATOR_PX) + 'px solid ' + skinVar('line') + ';',
    '}',
    s('row-time') + ' {',
    '  display: block;',
    '  box-sizing: border-box;',
    '  width: 100%;',
    '  height: ' + skinVar('fs-sm') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + block + ';',
    '  animation: ' + pulse + ';',
    '}',
    s('row-lines') + ' {',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '}',
    s('line') + ' {',
    '  display: block;',
    '  box-sizing: border-box;',
    '  width: 100%;',
    '  height: ' + skinVar('fs-xs') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + block + ';',
    '  animation: ' + pulse + ';',
    '}',
    s('line-short') + ' {',
    '  display: block;',
    '  box-sizing: border-box;',
    '  width: 52%;',
    '  height: ' + skinVar('fs-xs') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + block + ';',
    '  animation: ' + pulse + ';',
    '}',
    s('row-value') + ' {',
    '  display: block;',
    '  box-sizing: border-box;',
    '  width: 100%;',
    '  height: ' + skinVar('fs-sm') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + block + ';',
    '  animation: ' + pulse + ';',
    '}',
    '/* 动效停住：占位块换成一个静止的可见度（停住 ≠ 看不见）。 */',
    '@media (prefers-reduced-motion:reduce) {',
    '  ' + s('reading-value') + ',',
    '  ' + s('reading-sub') + ',',
    '  ' + s('row-time') + ',',
    '  ' + s('line') + ',',
    '  ' + s('line-short') + ',',
    '  ' + s('row-value') + ' {',
    '    animation: none;',
    '    opacity: ' + String(SKELETON_STILL_OPACITY) + ';',
    '  }',
    '}',
    '/* 窄容器（<' + String(SKELETON_NARROW_PX) + 'px）：只把排头那句人话改成两台 ——',
    '   **行距与列宽一律不动**（它们是「加载完不跳版」的锚点，窄档改了就等于换版式）。 */',
    '@container (max-width: ' + String(SKELETON_NARROW_PX) + 'px) {',
    '  ' + s('cap') + ' {',
    '    display: grid;',
    '    gap: 2px;',
    '    justify-items: start;',
    '  }',
    '}',
  ].join(LF);
}
