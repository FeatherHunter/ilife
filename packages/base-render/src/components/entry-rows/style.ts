/** entry-rows · **样式段**（本组件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：只读冻结 token，不新增 token 名；全部规则 scope 在 `.<prefix>page-ui` 下。
 *  **字面经 `skinVar()` 读皮肤**（颜色走的是那 11 个冻结 token 名，皮肤作用域里有旧名映射、挂皮肤即跟着走；
 *  字面**没有**旧名可映射 ⇒ 只有它必须显式走皮肤读法）。本件三处数字位都取 `font-num`。
 *
 *  几何契约（钉在测试里）：
 *   · 时间槽定宽（`min-width`）＋ 数字位走皮肤的 `font-num` ⇒ 逐条记录的时间竖排在同一列；
 *   · 值槽右对齐、数字位走皮肤的 `font-num` ⇒ 热量逐条对齐；
 *   · 行与行之间是**点线**、与"账目行"的 hairline 分得开（同一页出现两族时不混成一片）；
 *   · 备注占满一整行（`flex-basis:100%`）并缩进到名称列，**行高随备注长出来**、不挤压上一行的槽位。
 */
import { skinVar } from '../skin/contract.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 时间槽的定宽（px）：`13:55` 这一档的最窄宽度。 */
export const ENTRY_ROW_TIME_MIN_WIDTH_PX = 42;
/** 备注缩进（px）：与时间槽 ＋ 间距对齐，让备注落在名称列下。 */
export const ENTRY_ROW_NOTE_INDENT_PX = 50;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function entryRowsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = root + ' .' + p + 'block-entry-row';
  /* 裸槽类（**不带** scope）：只用在"祖先已经由 `s` 给过"的嵌套／兄弟选择器里——
     否则会拼成 `.+page-ui .a + .+page-ui .a`，那条规则要求"件里再套一层 page-ui"，**永远命中不到**。 */
  const b = '.' + p + 'block-entry-row';
  return [
    '/* entry-rows（明细行）：时间 ・ 类别 ・ 名称 ・ 数量 ………… 值；备注另起一行。 */',
    root + ' .' + p + 'block-entry-rows {',
    '  display: flex;',
    '  flex-direction: column;',
    '  min-width: 0;',
    '}',
    root + ' .' + p + 'block-entry-rows-heading {',
    '  margin-bottom: 2px;',
    '  color: var(--fg3);',
    '  font-size: 11.5px;',
    '  font-weight: 700;',
    '  letter-spacing: .22em;',
    '}',
    s + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 4px 8px;',
    '  padding: 7px 0;',
    '  min-width: 0;',
    '  font-size: 13.5px;',
    '}',
    '/* 记录之间用点线（账目行用的是 hairline）：同页两族同时出现时读得出"这是两种东西"。 */',
    s + ' + ' + b + ' {',
    '  border-top: 1px dashed var(--line);',
    '}',
    s + '-time {',
    '  flex: 0 0 auto;',
    '  min-width: ' + ENTRY_ROW_TIME_MIN_WIDTH_PX + 'px;',
    '  color: var(--fg3);',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s + '-badge {',
    '  flex: 0 0 auto;',
    '  padding: 1px 6px;',
    '  border-radius: ' + 6 + 'px;',
    '  background: var(--soft);',
    '  color: var(--fg2);',
    '  font-size: 11px;',
    '  font-weight: 700;',
    '}',
    s + '-name {',
    '  flex: 0 1 auto;',
    '  color: var(--fg);',
    '  font-weight: 700;',
    '  overflow-wrap: anywhere;',
    '}',
    s + '-measure {',
    '  flex: 0 0 auto;',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    /* 数量位是"数"（`2000 g`）：经 `skinVar('font-num')` 读皮肤的数字字面。 */
    '  font-family: ' + skinVar('font-num') + ';',
    '}',
    s + '-leader {',
    '  flex: 1 1 auto;',
    '  min-width: 12px;',
    '  align-self: flex-end;',
    '  margin-bottom: 4px;',
    '  border-bottom: 1px dotted var(--line);',
    '}',
    s + '-value {',
    '  flex: 0 0 auto;',
    '  color: var(--fg);',
    '  font-weight: 800;',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '}',
    s + '-value small {',
    '  margin-left: 3px;',
    '  color: var(--fg2);',
    '  font-size: 11px;',
    '  font-weight: 600;',
    '}',
    s + '-note {',
    '  flex: 1 1 100%;',
    '  padding-left: ' + ENTRY_ROW_NOTE_INDENT_PX + 'px;',
    '  color: var(--fg3);',
    '  font-size: 12px;',
    '  line-height: 1.6;',
    '  overflow-wrap: anywhere;',
    '}',
    '/* 行下读数：一排小字，**逐项一个 span、靠列距分开**（不写任何分隔符字符）。 */',
    s + '-facts {',
    '  display: flex;',
    '  flex: 1 1 100%;',
    '  flex-wrap: wrap;',
    '  gap: 3px 12px;',
    '  padding-left: ' + ENTRY_ROW_NOTE_INDENT_PX + 'px;',
    '  color: var(--fg3);',
    '  font-size: 11.5px;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    root + ' .' + p + 'block-entry-rows-absent {',
    '  margin-top: 6px;',
    '  color: var(--fg3);',
    '  font-size: 12.5px;',
    '}',
  ].join(LF);
}
