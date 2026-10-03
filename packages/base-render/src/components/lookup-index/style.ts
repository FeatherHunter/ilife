/** lookup-index · **样式段**（本件唯一的样式来源）。
 *
 *  纪律（与组件层其余件同一份）：
 *   · 只经 `skinVar()` 读皮肤（锚点现行色走 `accent`，别名标黄底走 `warn-soft`）；
 *   · 全部规则 scope 在 `.<prefix>page-ui` 之下；零 `:root`／零 `!important`；
 *   · 不设宽度分档（纵排＋自动换行，窄容器天然成立，故无 `@container`）。
 */
import { skinVar } from '../skin/contract.js';
import { lookupIndexSlot, type LookupIndexSlot } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 判地那支等宽栈（原型 `--mono`）：规格 §5 第 5 组「照原型抄」——折叠档的唤醒词胶囊走它。 */
export const LOOKUP_INDEX_MONO_STACK = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function lookupIndexCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const box = root + ' .' + p + 'block-lookup-index';
  const s = (slot: LookupIndexSlot): string => root + ' .' + lookupIndexSlot(slot, p);
  /* 裸槽类（**不带** scope）：只用在“祖先已经由 `s` 给过”的子／后代选择器里——
     否则会拼成 `.<prefix>page-ui .a > .<prefix>page-ui .b`，那条规则要求“件里再套一层 page-ui”，**永远命中不到**。 */
  const bare = (slot: LookupIndexSlot): string => '.' + lookupIndexSlot(slot, p);
  const head = bare('head');
  const row = bare('row');
  const wake = bare('wake');
  const goto = bare('goto');

  return [
    box + ' {',
    '  display: grid;',
    '  gap: 12px;',
    '  min-width: 0;',
    '  box-sizing: border-box;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  line-height: 1.7;',
    '}',
    s('nav') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  gap: 8px;',
    '  min-width: 0;',
    '}',
    s('anchor') + ' {',
    '  display: inline-block;',
    '  min-height: 44px;',
    '  box-sizing: border-box;',
    '  padding: 10px 14px;',
    '  border: 1px solid ' + skinVar('accent') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  background: ' + skinVar('surface') + ';',
    '  color: ' + skinVar('accent-text') + ';',
    '  font-weight: 700;',
    '  text-decoration: none;',
    '}',
    s('anchor') + ':focus-visible {',
    '  outline: 2px solid ' + skinVar('accent') + ';',
    '  outline-offset: 2px;',
    '}',
    '@media (hover:hover) and (pointer:fine) {',
    '  ' + s('anchor') + ':hover { background: ' + skinVar('accent-soft') + '; }',
    '}',
    s('group') + ' {',
    '  display: grid;',
    '  gap: 4px;',
    '  min-width: 0;',
    '  margin: 0;',
    '  padding-top: 4px;',
    '  border-top: 1px solid ' + skinVar('line') + ';',
    '}',
    s('head') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s('row') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 8px;',
    '  margin: 0;',
    '  min-width: 0;',
    '  overflow-wrap: anywhere;',
    '}',
    s('wake') + ' {',
    '  flex: none;',
    '  color: ' + skinVar('ink') + ';',
    '  font-weight: 700;',
    '}',
    s('goto') + ' {',
    '  flex: 1 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 别名行：标黄底（形）＋ 前导“别名”由标记写出（字），色不是唯一信息。 */',
    box + ' ' + '.' + lookupIndexSlot('row', p) + '.is-alias {',
    '  background: ' + skinVar('warn-soft') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '}',
    s('note') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-3') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  overflow-wrap: anywhere;',
    '}',
    /* ── #1122 折叠档（判地 `proto/setup-help/h02-速查表-v2.4.html`：`.qgroup`／`.qgroup-head`／`.cnt`／`.qrows`）
       逐条照抄；**只加不改**：常显档那几条一个声明都没动，靠 `.is-fold` 提特指度盖过它们。 ── */
    box + '.is-fold {',
    '  display: block;',
    '}',
    s('group') + '.is-fold {',
    '  display: block;',
    '  margin-top: 14px;',
    '  padding: 0;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-card') + '; /* 判地字面 · 授权照抄：12px（组卡片圆角；皮肤号 radius-card 在票据纸下正是 12px） */',
    '  background: #fbf7ec; /* 判地字面 · 授权照抄：#fbf7ec（组卡片暖底） */',
    '  overflow: hidden;',
    '}',
    s('group') + '.is-fold > ' + head + ' {',
    '  list-style: none;',
    /* 行高钉 normal：判地组头吃的是页面 normal（15px ⇒ 行盒 ≈17.6，min-height:48 说了算）；
       本件根上写着 `line-height:1.7`（15×1.7＝25.5）⇒ 不钉组头就高 1.5px。 */
    '  line-height: normal;',
    '  cursor: pointer;',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '  min-height: 48px;',
    '  padding: 12px 14px;',
    '  background: ' + skinVar('surface-2') + ';',
    '  font-size: 15px;',
    '  font-weight: 800;',
    '  letter-spacing: .5px;',
    '}',
    s('group') + '.is-fold > ' + head + '::-webkit-details-marker {',
    '  display: none;',
    '}',
    /* 箭头：判地那枚 9×9 的斜角（两根 2px 边转 -45°），展开转 +45°。 */
    s('group') + '.is-fold > ' + head + '::after {',
    '  content: "";',
    '  flex: none;',
    '  width: 9px;',
    '  height: 9px;',
    '  margin-left: 10px;',
    '  border-right: 2px solid ' + skinVar('accent') + ';',
    '  border-bottom: 2px solid ' + skinVar('accent') + ';',
    '  transform: rotate(-45deg);',
    '}',
    s('group') + '.is-fold[open] > ' + head + '::after {',
    '  transform: rotate(45deg);',
    '}',
    /* 计数胶囊（判地 `.qgroup-head .cnt`）：白底 ＋ 发丝边 ＋ 999 胶囊。 */
    s('group') + '.is-fold > ' + head + ' > .' + lookupIndexSlot('count', p) + ' {',
    '  margin-left: auto;',
    /* 行高钉 normal：判地那颗胶囊吃的是页面的 normal（12px 字 ⇒ 行盒 ≈14.4），
       而本件根上写着 `line-height:1.7`（1.7×12＝20.4）⇒ 不钉就会把组头顶高 4.4px（实测 52.39 vs 48）。 */
    '  line-height: normal;',
    '  font-size: 12px;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-weight: 700;',
    '  white-space: nowrap;',
    '  background: #fff; /* 判地字面 · 授权照抄：#fff（计数胶囊底） */',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-pill') + ';',
    '  padding: 3px 10px;',
    '}',
    /* 行列表（判地 `.qrows`）：内距 2px 14px 12px，行间点线用判地那颗暖点线色。 */
    s('group') + '.is-fold > .' + lookupIndexSlot('rows', p) + ' {',
    '  list-style: none;',
    '  margin: 0;',
    '  padding: 2px 14px 12px;',
    '}',
    s('group') + '.is-fold > .' + lookupIndexSlot('rows', p) + ' > ' + row + ' {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 10px;',
    '  padding: 10px 0;',
    '  min-height: 44px;',
    '  border-top: 1px dotted #eee6d2; /* 判地字面 · 授权照抄：#eee6d2（行间点线） */',
    '  font-size: 13.5px;',
    '  line-height: 1.6;',
    '}',
    s('group') + '.is-fold > .' + lookupIndexSlot('rows', p) + ' > ' + row + ':first-child {',
    '  border-top: 0;',
    '}',
    /* 唤醒词胶囊（判地 `.qrows .wake`）：等宽栈、朱砂字、白底暖边。 */
    s('group') + '.is-fold ' + wake + ' {',
    '  flex: none;',
    '  font-family: ' + LOOKUP_INDEX_MONO_STACK + ';',
    '  font-size: 12px;',
    '  font-weight: 700;',
    '  color: ' + skinVar('accent') + ';',
    '  background: #fff; /* 判地字面 · 授权照抄：#fff（唤醒词胶囊底） */',
    '  border: 1px solid #f0d7c2; /* 判地字面 · 授权照抄：#f0d7c2（唤醒词胶囊边） */',
    '  border-radius: 6px;',
    '  padding: 2px 7px;',
    '  white-space: nowrap;',
    '}',
    s('group') + '.is-fold ' + goto + ' {',
    '  flex: 1;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: 12px;',
    '  overflow-wrap: anywhere;',
    '  text-align: right;',
    '}',
    /* 别名行：判地把"别名"写在**去向那一格的字色**上（`.goto.alias`），不铺行底 ⇒ 折叠档里撤掉常显档那层黄底。 */
    s('group') + '.is-fold ' + goto + '.is-alias {',
    '  color: ' + skinVar('warn') + ';',
    '  font-weight: 700;',
    '}',
    s('group') + '.is-fold > .' + lookupIndexSlot('rows', p) + ' > ' + row + '.is-alias {',
    '  background: none;',
    '  border-radius: 0;',
    '}',
  ].join(LF);
}
