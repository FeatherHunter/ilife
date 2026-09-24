/** toast-card · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤 —— 组件里**不写** `var(--ilife-…)`（兜底链只许住在 `skin/contract.ts`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下（**一条选择器里 scope 只许出现一次**：中段一律用裸槽类）；
 *   · 不写 `:root`／`!important`、不新增 token 名、**零投影**（`shadow`／`shadow-pop` 当作不存在）；
 *   · **宽度只许容器判**：`@container` ＋ 内在尺寸 ＋ `flex-wrap`；媒体查询只判设备能力
 *     （`@media (hover:hover) and (pointer:fine)` 与 `(prefers-reduced-motion:reduce)`）。
 *
 *  零阴影、零圆角下立层次的三样（重做口径 §0 第 3 条）：
 *   **左竖条**（语气色的形状：3／4／6px）／**图标底盘**（一圈发丝线 ＋ 语气软底）／**字重与字级**
 *   （语气字 · 标题 · 细节各司其职）。
 *
 *  状态不只靠色（重做口径 §0 第 2 条）：竖条**粗细** ＋ 图标**字形** ＋ **语气字**——
 *  把三档色压成同一个墨黑，三档照样分得开。
 */
import { skinVar } from '../skin/contract.js';
import { TOAST_CARD_LEAVING_CLASS, TOAST_CARD_TONE_RULES, toastCardName, toastCardSlot, type ToastCardSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 触控目标下限（px）：动作键与关闭键的**命中盒**不得小于它（视觉盒可以小，命中盒必须够）。 */
export const TOAST_CARD_TOUCH_PX = 44;

/** 窄容器阈值（px）：动作与关闭那一排落到第二行。
 *  **这是本件自己的宽度**（`@container` 判的），不是视口宽度——件会被嵌进侧栏／面板／卡片。 */
export const TOAST_CARD_NARROW_PX = 420;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function toastCardCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /* 槽位的两种拼法：**带 scope 的 `s()`** 只用在选择器开头；中段一律 `bare()`（裸槽类）。
     中段再拼一次 `s()` 会写出 `.page-ui .A .page-ui .B` 那种**永远匹配不到**的死规则。 */
  const bare = (slot: ToastCardSlot): string => '.' + toastCardSlot(slot, p);
  const s = (slot: ToastCardSlot): string => root + ' ' + bare(slot);
  const card = root + ' ' + '.' + toastCardName(p);
  const stack = s('stack');
  const rule = (tone: keyof typeof TOAST_CARD_TONE_RULES): string => String(TOAST_CARD_TONE_RULES[tone]);

  return [
    '/* toast-card（提示卡片 · **另一件 toast**，与冻结面那件 renderToast 并存）：一条提示 ＝',
    '   图标底盘 ＋ 语气字·标题 ＋ 一句细节 ＋ 至多一枚动作 ＋ 关闭。',
    '   零阴影、零圆角下立层次的三样：**左竖条**（语气色的形状）／**图标底盘**（发丝线 ＋ 语气软底）／',
    '   **字重与字级**（语气字·标题·细节各司其职）。状态不只靠色：竖条粗细 ＋ 图标字形 ＋ 语气字。',
    '   位置与宽度归页面：堆栈是普通流内区块（本件**不写 position**，`position: fixed` 的量法听视口，',
    '   与「件有多宽」无关）；窄档判的是**每条自己的宽度**。 */',
    '/* 堆栈：宿主给位置与宽度，这里只保证「一条一条竖着排」。 */',
    stack + ' {',
    '  display: grid;',
    '  gap: 8px;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  margin: 0;',
    '  padding: 0;',
    '}',
    '/* 一条提示：**容器在这里声明**（下面那条 @container 才生效——查的是这条自己的宽度）。',
    '   层次靠面（surface）＋ 发丝线 ＋ 左竖条，不靠投影。 */',
    card + ' {',
    '  container-type: inline-size;',
    '  display: grid;',
    '  grid-template-columns: auto minmax(0, 1fr) auto;',
    '  align-items: start;',
    '  gap: 6px 12px;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  padding: 12px 12px 12px 14px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-left: ' + rule('ok') + 'px solid ' + skinVar('ok') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.6;',
    '  transition: opacity .16s ease, transform .16s ease;',
    '}',
    '/* 语气档：竖条**加粗**（形状上的第二样）——三档色被压成同一个墨黑时，靠它读档。 */',
    card + '.is-warn { border-left-width: ' + rule('warn') + 'px; border-left-color: ' + skinVar('warn') + '; }',
    card + '.is-danger { border-left-width: ' + rule('danger') + 'px; border-left-color: ' + skinVar('danger') + '; }',
    '/* 图标底盘：一圈发丝线 ＋ 语气软底（零圆角的皮肤下就是一个方格），字形是装饰。 */',
    s('icon') + ' {',
    '  grid-column: 1;',
    '  grid-row: 1;',
    '  display: grid;',
    '  place-items: center;',
    '  width: 24px;',
    '  height: 24px;',
    '  box-sizing: border-box;',
    '  border: 1px solid ' + skinVar('ok') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('ok-soft') + ';',
    '  color: ' + skinVar('ok') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  line-height: 1;',
    '}',
    card + '.is-warn ' + bare('icon') + ' { border-color: ' + skinVar('warn') + '; background: ' + skinVar('warn-soft') + '; color: ' + skinVar('warn') + '; }',
    card + '.is-danger ' + bare('icon') + ' { border-color: ' + skinVar('danger') + '; background: ' + skinVar('danger-soft') + '; color: ' + skinVar('danger') + '; }',
    '/* 正文区：语气字·标题占一行，细节占一行——两行字级与字色都分开（「字」这一样）。 */',
    s('body') + ' {',
    '  grid-column: 2;',
    '  grid-row: 1;',
    '  display: grid;',
    '  gap: 2px;',
    '  min-width: 0;',
    '}',
    s('head') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  margin: 0;',
    '  min-width: 0;',
    '}',
    '/* 语气字：小字 ＋ 拉开字距，像一枚档位标签；色只是第三样。 */',
    s('tone') + ' {',
    '  color: ' + skinVar('ok') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  letter-spacing: .06em;',
    '}',
    card + '.is-warn ' + bare('tone') + ' { color: ' + skinVar('warn') + '; }',
    card + '.is-danger ' + bare('tone') + ' { color: ' + skinVar('danger') + '; }',
    s('title') + ' {',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 细节句：比标题低一档的字级与字色（**不许** `…` 截断关键语义）。 */',
    s('detail') + ' {',
    '  margin: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  line-height: 1.7;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 动作与关闭那一排：两枚键的命中盒都不小于 44px。 */',
    s('tool') + ' {',
    '  grid-column: 3;',
    '  grid-row: 1;',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: center;',
    '  justify-content: flex-end;',
    '  gap: 6px;',
    '}',
    '/* 动作键：写动词（「撤销」／「看详情」）；键面上的字就是它的可读名字。 */',
    s('action') + ' {',
    '  min-width: ' + String(TOAST_CARD_TOUCH_PX) + 'px;',
    '  min-height: ' + String(TOAST_CARD_TOUCH_PX) + 'px;',
    '  padding: 10px 12px;',
    '  box-sizing: border-box;',
    '  border: 1px solid ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('accent-soft') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 700;',
    '  cursor: pointer;',
    '}',
    '/* 关闭键：字形只是画上去的，可读名字走 `aria-label`。 */',
    s('close') + ' {',
    '  display: grid;',
    '  place-items: center;',
    '  min-width: ' + String(TOAST_CARD_TOUCH_PX) + 'px;',
    '  min-height: ' + String(TOAST_CARD_TOUCH_PX) + 'px;',
    '  padding: 0;',
    '  box-sizing: border-box;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  line-height: 1;',
    '  cursor: pointer;',
    '}',
    '/* hover：只判设备能力（谁的页面被嵌进侧栏都一样不吃亏），且**不是唯一通路**：',
    '   静止态已经把动作写在键面上、把状态写在语气字上。 */',
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + s('action') + ':hover { opacity: .92; }',
    '  ' + s('close') + ':hover { border-color: ' + skinVar('ink-2') + '; color: ' + skinVar('ink') + '; }',
    '}',
    s('action') + ':not(:disabled):active, ' + s('close') + ':not(:disabled):active { transform: scale(.98); }',
    '/* 焦点地板：两枚键都要 2px 可见描边（不许只靠底色变化表示焦点）。 */',
    s('action') + ':focus-visible, ' + s('close') + ':focus-visible { outline: 2px solid ' + skinVar('accent') + '; outline-offset: 2px; }',
    '/* 离场：透明化 ＋ 轻微下移（160ms）；到时由运行时段真删（不是留在那儿当隐形壳）。 */',
    card + '.' + TOAST_CARD_LEAVING_CLASS + ' {',
    '  opacity: 0;',
    '  transform: translateY(4px);',
    '}',
    '/* 窄容器（≤' + String(TOAST_CARD_NARROW_PX) + 'px）：动作与关闭那一排**落到第二行**，',
    '   正文占满上行（判的是这条提示自己的宽度，不是视口宽度）。 */',
    '@container (max-width: ' + String(TOAST_CARD_NARROW_PX) + 'px) {',
    '  ' + s('body') + ' { grid-column: 2 / 4; }',
    '  ' + s('tool') + ' {',
    '    grid-column: 1 / 4;',
    '    grid-row: 2;',
    '  }',
    '}',
    '/* 动效只有那 160ms 的离场；这一档下连它都不做——没有东西会卡在半路。 */',
    '@media (prefers-reduced-motion:reduce) {',
    '  ' + card + ' { transition: none; }',
    '  ' + card + '.' + TOAST_CARD_LEAVING_CLASS + ' { transform: none; }',
    '}',
  ].join(LF);
}
