/** ledger-rows · **样式段**（本组件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：只读冻结 token，不新增 token 名；全部规则 scope 在 `.<prefix>page-ui` 下。
 *  **字面经 `skinVar()` 读皮肤**：颜色走那 11 个冻结 token 名（皮肤作用域有旧名映射），字面没有旧名可映射 ⇒ 显式走皮肤读法。
 *
 *  几何契约（钉在测试里）：
 *   · 值列**右对齐且数字位走皮肤的 `font-num`**（`tabular-nums`）⇒ 逐行竖读时小数点／单位在同一列；
 *   · 引导线是**零高度的下边框**（`flex:1` 撑开、`translateY` 抬到基线），开关它不改任何行的行高；
 *   · 行距与"明细行"同档（padding 6px 0）⇒ 两件混排时行高一致。
 */
import { skinVar } from '../skin/contract.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function ledgerRowsCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = root + ' .' + p + 'block-ledger-row';
  /* 裸槽类（**不带** scope）：只用在"祖先已经由 `s` 给过"的嵌套／兄弟选择器里——
     否则会拼成 `.+page-ui .a + .+page-ui .a`，那条规则要求"件里再套一层 page-ui"，**永远命中不到**。 */
  const b = '.' + p + 'block-ledger-row';
  return [
    '/* ledger-rows（账目行）：标签 →（点线）→ 值；值列右对齐、等宽数字。 */',
    root + ' .' + p + 'block-ledger-rows {',
    '  display: flex;',
    '  flex-direction: column;',
    '  min-width: 0;',
    '}',
    root + ' .' + p + 'block-ledger-rows-heading {',
    '  margin-bottom: 2px;',
    '  color: var(--fg3);',
    '  font-size: 11.5px;',
    '  font-weight: 700;',
    '  letter-spacing: .22em;',
    '}',
    s + ' {',
    '  display: flex;',
    '  align-items: baseline;',
    '  gap: 8px;',
    '  padding: 6px 0;',
    '  min-width: 0;',
    '  font-size: 13.5px;',
    '}',
    '/* 相邻行之间一条 hairline；首行不带（小标题已经把它和上文分开了）。 */',
    s + ' + ' + b + ' {',
    '  border-top: 1px solid var(--line);',
    '}',
    s + '-label {',
    '  flex: 0 1 auto;',
    '  color: var(--fg2);',
    '  overflow-wrap: anywhere;',
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
    '  font-weight: 700;',
    /* 值位是"数"：经 `skinVar('font-num')` 读皮肤的数字字面（与主数字头同一支字面）。 */
    '  font-family: ' + skinVar('font-num') + ';',
    '  letter-spacing: -.01em;',
    '  font-variant-numeric: tabular-nums;',
    '  text-align: right;',
    '}',
    s + '-value small {',
    '  margin-left: 3px;',
    '  color: var(--fg2);',
    '  font-size: 11.5px;',
    '  font-weight: 600;',
    '}',
    '/* 合计行：上面一条实线（比 hairline 重一档）、字加粗——"这一行是加出来的"。 */',
    s + '.is-total {',
    '  margin-top: 2px;',
    '  border-top: 1px solid var(--fg);',
    '  font-weight: 800;',
    '}',
    s + '.is-total .' + p + 'block-ledger-row-label {',
    '  color: var(--fg);',
    '  font-weight: 700;',
    '}',
  ].join(LF);
}
