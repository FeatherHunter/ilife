/** progress-ring · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、不新增 token 名；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ `flex-wrap`；本件不写任何 `@media`（视口宽 ≠ 组件宽）。
 *
 *  几何契约（判据钉住）：
 *   · 半环是内联 SVG、宽度 100% 自适应，**根不留横向滚动**（`min-width:0` ＋ `max-width` 撑底）；
 *   · 环下大字是 **HTML**，与右侧读数是同一套字号阶梯 ⇒ 窄容器里不会随 SVG 一起糊掉；
 *   · 数据色一律**算出来**：底轨 ＝ 主文字往卡面混，填充 ＝ 强调色，超目标 ＝ 危险色（三档都是 token）。
 */
import { skinVar } from '../skin/contract.js';
import { progressRingSlot, type ProgressRingSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 环下大字的字号（px）：两档之间只差这一处——窄容器不让大字把版面顶宽。 */
export const PROGRESS_RING_VALUE_PX = 44;
const NARROW_VALUE_PX = 36;

/** 窄容器阈值（px）：大字与小环一起收一档。**这是本件自己的宽度**（`@container` 判的），不是视口宽度。 */
const NARROW_PX = 420;

/** 环的最大直径（px）：容器再宽也不让环长成一块空地（读数是主角、环是标尺）。 */
export const PROGRESS_RING_MAX_DIAMETER_PX = 280;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function progressRingCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-progress-ring';
  const s = (slot: ProgressRingSlot): string => root + ' .' + progressRingSlot(slot, p);
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。
     拿 `s()` 去拼后代／兄弟选择器会拼出 `.page-ui .a .page-ui .b` —— 第二条 `.page-ui` 永远匹配不到，
     规则「看着在、其实不生效」（2026-09 样张页上抓到过一次：超目标态那三处换色全没生效）。 */
  const c = (slot: ProgressRingSlot): string => '.' + progressRingSlot(slot, p);

  return [
    '/* progress-ring（进度环 · 形态 A「半环 ＋ 环下大字 ＋ 右侧读数」）：一块「已完成／目标」的环。',
    '   环是内联 SVG（弧长按 2πr 的一半算），大字是 HTML ⇒ 窄容器里读数不随 SVG 一起缩放。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度折行。 */
    '  container-type: inline-size;',
    /* 宿主页不保证是 `border-box`（真页面默认 content-box）：本件带边框／内距的位子
       在那种页里会比容器宽出边框那几像素 ⇒ 在本件**自己的子树里**把 `box-sizing` 钉成 `border-box`。 */
    '  box-sizing: border-box;',
    '  display: grid;',
    '  gap: 10px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1.5;',
    '}',
    box + ' * {',
    '  box-sizing: border-box;',
    '}',
    /* 卡头：标题与右侧口径同一排；容器一窄，口径自己折到下一行（标题不掉字、不用 `…`）。 */
    s('hd') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 3px 10px;',
    '  min-width: 0;',
    '}',
    s('title') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  line-height: 1.35;',
    '  overflow-wrap: anywhere;',
    '}',
    s('stamp') + ' {',
    '  flex: none;',
    '  margin-left: auto;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    /* 环与右侧读数：一排两格，`flex-wrap` 让它在窄容器里自己叠起来（不判视口宽度）。 */
    s('split') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  gap: 12px 20px;',
    '  min-width: 0;',
    '}',
    s('gauge') + ' {',
    '  flex: 1 1 220px;',
    '  min-width: 0;',
    '}',
    /* 环：宽度跟着容器走，但长不过 `PROGRESS_RING_MAX_DIAMETER_PX`（环是标尺、不是主角）。 */
    s('svg') + ' {',
    '  display: block;',
    '  width: 100%;',
    '  max-width: ' + String(PROGRESS_RING_MAX_DIAMETER_PX) + 'px;',
    '  height: auto;',
    '  margin: 0 auto;',
    '  overflow: visible;',
    '}',
    '/* 底轨：主文字往卡面混一档（不是硬编码灰），换皮自动跟着走。 */',
    s('trk') + ' {',
    '  stroke: color-mix(in srgb, ' + skinVar('ink') + ' 13%, ' + skinVar('surface') + ');',
    '}',
    '/* 填充弧：强调色是**非文本**档，正好用在这里；超目标换危险色（形状不变：弧画满）。 */',
    s('fil') + ' {',
    '  stroke: ' + skinVar('accent') + ';',
    '}',
    box + '.is-over ' + c('fil') + ' {',
    '  stroke: ' + skinVar('danger') + ';',
    '}',
    /* 环下大字：值（大字）／单位／分母另起一行／百分数一枚胶囊——四枚都在同一行里换行，不压字。 */
    s('hero') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  justify-content: center;',
    '  gap: 2px 8px;',
    '  margin: 8px 0 0;',
    '  min-width: 0;',
    '}',
    s('value') + ' {',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + String(PROGRESS_RING_VALUE_PX) + 'px;',
    '  font-weight: 700;',
    '  line-height: 1.05;',
    '  letter-spacing: -.02em;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    s('unit') + ' {',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '}',
    '/* 分母占满一整行（`flex-basis:100%`）：它再长也只把自己这行撑开，不把大字挤窄。 */',
    s('denom') + ' {',
    '  flex: 1 0 100%;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: center;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 百分数：那条弧的读数。**数字永不换行、永不截断**（它是本件的第二识别特征）。 */',
    s('pct') + ' {',
    '  flex: none;',
    '  padding: 1px 8px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('accent-soft') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    box + '.is-over ' + c('pct') + ' {',
    '  background: ' + skinVar('danger-soft') + ';',
    '  color: ' + skinVar('danger') + ';',
    '}',
    /* 右侧读数：宽容器多列、窄容器一列；名字可换行，值永不换行、永不截断。 */
    s('kvs') + ' {',
    '  flex: 2 1 260px;',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(min(190px, 100%), 1fr));',
    '  gap: 0 20px;',
    '  min-width: 0;',
    '}',
    s('kv') + ' {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 10px;',
    '  min-width: 0;',
    '  padding: 8px 0;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '}',
    s('kv-label') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    s('kv-value') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  white-space: nowrap;',
    '}',
    /* 脚注那句人话：**超目标时换色**（不只换色——同一句话里带差额与百分比，字也在说话）。 */
    s('note') + ' {',
    '  margin: 0;',
    '  padding-top: 10px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    box + '.is-over ' + c('note') + ' {',
    '  color: ' + skinVar('danger') + ';',
    '  font-weight: 600;',
    '}',
    '/* 本件自身不带可点元素。这一条是**地板**：调用方把环包成链接时，焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(NARROW_PX) + 'px）：大字与环各收一档——环占满整行、读数跟着缩，',
    '   免得环下大字把自己撑出容器。判的是**本件自己的宽度**（本件会被嵌进侧栏／面板／卡片）。 */',
    '@container (max-width: ' + String(NARROW_PX) + 'px) {',
    '  ' + s('value') + ' {',
    '    font-size: ' + String(NARROW_VALUE_PX) + 'px;',
    '  }',
    '  ' + s('svg') + ' {',
    '    max-width: 220px;',
    '  }',
    '  ' + s('kvs') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '}',
  ].join(LF);
}
