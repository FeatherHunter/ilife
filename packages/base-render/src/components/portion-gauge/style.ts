/** portion-gauge · **样式段**（本件唯一的样式来源；A 档量感条那半在 `style-gauge.ts`，由这里汇总）。
 *
 *  纪律（与本节其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（不开本配方页零命中）；不写 `:root`／`!important`、
 *     不新增 token 名、零代码里写死的色值（占比填充走强调色实底，缺换算那一行走提醒色）；
 *   · **宽度只许容器判**：布局靠 `@container` ＋ 内在尺寸 ＋ 纯 CSS 等分；本件不写任何 `@media`。
 *
 *  两处几何契约（判据钉住）：
 *   · **位置由值算出**：占比填充的宽度是行内算出来的百分比（`model.ts` 里由同一个占比出，
 *     与占比那句的字是同一个数）——读者按条读到的占比就是那句说的占比；
 *     **条那一轨有最小宽**（`PORTION_GAUGE_BAR_MIN_PX`）：长占比句让位换行，不许把条挤成 0 宽
 *     （条是 0 长而那句写着 70% ＝ 两处读数走散）。A 档量感条的已用那一段同此（它压在余量底上，
 *     宽度也是行内算出来的百分比）——那一半的规则见 `style-gauge.ts`；
 *   · **色不是唯一信息**：占比条是强调色**实底**（无文字的图形那一档）＋ 那句占比给字；
 *     缺换算那一行是提醒软底 ＋ 提醒字（两样同时在）。**没有一处拿正文墨色当“面”**。
 */
import { skinVar } from '../skin/contract.js';
import { PORTION_GAUGE_NARROW_PX, portionGaugeSlot, type PortionGaugeSlot } from './attrs.js';
import { portionGaugeGaugeCss } from './style-gauge.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 占比条那一轨的**最小宽**（px）：容器宽全被占比句吃掉时，条仍要留得下一条读得出比例的实底
 *  （同族口径先例 `compare-columns` 的 `COMPARE_COLUMNS_BAR_MIN_PX`）。
 *  **只有一个来源** —— `style.ts` 读它拼轨宽；判据拿它对真机读数（条宽 ≥ 它）。
 *  窄档（`≤ PORTION_GAUGE_NARROW_PX`）走单列、条占满整行，不靠这条最小宽。 */
export const PORTION_GAUGE_BAR_MIN_PX = 72;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function portionGaugeCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-portion-gauge';
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。
     拿 `s()` 去拼后代／兄弟选择器会拼出 `.page-ui .a .page-ui .b` —— 第二条 `.page-ui` 永远匹配不到，
     规则「看着在、其实不生效」。本文件只用 `s()` 打头；要拼嵌在选择器内部的裸槽类时，才在那一处现加 `c()`。 */
  const s = (slot: PortionGaugeSlot): string => root + ' .' + portionGaugeSlot(slot, p);
  const c = (slot: PortionGaugeSlot): string => '.' + portionGaugeSlot(slot, p);

  return [
    '/* portion-gauge（份量换算 · 换算三栏）：一行一样食材，菜谱单位 → 营养库单位 → 实物占比。',
    '   色一律从 token 出（占比填充走强调色实底、缺换算那一行走提醒色）：换皮只换取值、不换结构；',
    '   任何一档都不拿文字墨色当面。 */',
    box + ' {',
    /* 宽度判据的落点：本件是**自己的容器**——嵌进侧栏／面板／卡片时照样按自己的宽度排。 */
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
    /* ── 卡头 ── */
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
    /* 内容撑宽是横溢的来源：调用方给一句长口径时，`flex: none` ＋ 不换行会让这一项拒绝收窄
       ⇒ 父行跟着溢出。故 `flex: 0 1 auto`（可收窄）＋ `min-width: 0` ＋ 允许在词内断行。 */
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  margin-left: auto;',
    '  padding: 1px 8px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('tail') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  margin-left: auto;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* ── 换算行区：一行一样 ── */
    s('conv') + ' {',
    '  display: grid;',
    '  gap: 0;',
    '  min-width: 0;',
    '}',
    s('row') + ' {',
    '  display: grid;',
    '  gap: 6px;',
    '  min-width: 0;',
    '  padding: 10px 0;',
    '}',
    /* 行与行之间一条发丝线（第一行不画：它上面是卡头那一排）。 */
    s('row') + ' + ' + c('row') + ' {',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    /* 行头：食材名 ＋ 出处那句 ＋ 这一行合计多少克。 */
    s('head') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 8px;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '}',
    s('name') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('sub') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 这一行合计多少克顶到右缘；长了自己换行（`flex: 0 1 auto` ＋ `min-width: 0`），不把行头撑宽。 */
    s('same') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  margin-left: auto;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 换算框：左栏菜谱单位 → 右栏营养库口径（三栏里的前两栏）。
       `min-height` 是触控地板那一档（调用方把某一行做成入口时，命中盒不小于这一高）。 */
    s('eq') + ' {',
    '  display: grid;',
    '  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);',
    '  gap: 8px;',
    '  align-items: center;',
    '  min-width: 0;',
    '  min-height: 44px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  padding: 6px 10px;',
    '}',
    s('side') + ' {',
    '  display: grid;',
    '  gap: 1px;',
    '  min-width: 0;',
    '}',
    /* 换算的那个数另起一层：上面一行是数，下面一行是说明。数可以换行——原型那一版写了不换行，
       长单位（`12 份家庭装`）在窄容器里会把框顶宽，故这里允许在词内断行。 */
    s('side-value') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('side-label') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    s('side') + '.is-to {',
    '  text-align: right;',
    '}',
    s('arrow') + ' {',
    '  justify-self: center;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '}',
    /* 实物占比：占比条 ‖ 那句占比（三栏里的第三栏）。 */
    s('obj') + ' {',
    '  display: grid;',
    /* 第一轨（占比条）**有最小宽**：第二轨是 `auto`——按 max-content 吃宽，长占比句（32／64／128 字）
       在宽档会把第一轨压成 0：条还在、长度却是 0，读者按条读到的占比是 0，而那句照写 70%
       （2026-09 真机读数 `gridTemplateColumns = "0px 473px"`、`bar = 0px`）。故第一轨给最小宽，
       长占比句改成**换行让位**；第二轨写 `minmax(0, auto)`，不留内容撑宽的下限。 */
    '  grid-template-columns: minmax(' + String(PORTION_GAUGE_BAR_MIN_PX) + 'px, 1fr) minmax(0, auto);',
    '  gap: 8px;',
    '  align-items: center;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '}',
    /* 占比条的轨道（中性面）；填充是强调色实底（无文字的图形那一档）。 */
    s('bar') + ' {',
    '  position: relative;',
    '  min-width: 0;',
    '  height: 12px;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    s('fill') + ' {',
    '  position: absolute;',
    '  left: 0;',
    '  top: 0;',
    '  bottom: 0;',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('accent') + ';',
    '}',
    /* 那句占比顶到右缘；**永不截断**（长了换行：`占一天膳食纤维 100%` 在窄档会折成两行）。 */
    s('share') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* ── 脚注 ── */
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.7;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 缺换算那一行：**语义档**（提醒）⇒ 提醒软底 ＋ 提醒字（两样同时在，不只染色）。 */
    s('missing') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  padding: 8px 10px;',
    '  border: 1px solid ' + skinVar('warn') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('warn-soft') + ';',
    '  color: ' + skinVar('warn') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 600;',
    '  overflow-wrap: anywhere;',
    '}',
    /* ── A 档量感条那半（同一份纪律、同一份样式段；搬走的是行数，不是取值）── */
    ...portionGaugeGaugeCss(input),
    '/* 本件自身不带可点元素。这一条是**地板**：调用方把某一行包成入口时焦点必须看得见。 */',
    box + ' :focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '/* 窄容器（<' + String(PORTION_GAUGE_NARROW_PX) + 'px）：换算框与占比行改走单列 —— **一栏不减**。',
    '   方向标转过去指着下一行（上 → 下），右栏的数顶到左缘（与左栏同一边）。',
    '   宽度靠 `minmax(0, 1fr)` 自己收窄，不横滑、也不藏横滑。 */',
    '@container (max-width: ' + String(PORTION_GAUGE_NARROW_PX) + 'px) {',
    '  ' + s('eq') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '  ' + s('side') + '.is-to {',
    '    text-align: left;',
    '  }',
    '  ' + s('arrow') + ' {',
    '    justify-self: start;',
    '    transform: rotate(90deg);',
    '  }',
    '  ' + s('obj') + ' {',
    '    grid-template-columns: minmax(0, 1fr);',
    '  }',
    '  ' + s('share') + ' {',
    '    justify-self: start;',
    '  }',
    '}',
  ].join(LF);
}
