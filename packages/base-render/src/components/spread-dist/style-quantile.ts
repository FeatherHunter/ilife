/** spread-dist · **C 档（`quantile` 分位尺）那一段样式**（同目录第二份样式来源；由 `style.ts` 的
 *  `spreadDistCss()` 汇总，位置与拆分前逐字节相同）。
 *
 *  为什么有这一件：本件一次落三档骨架，`style.ts` 一度到 349 行（本包告警线 350，
 *  `packages/base-render/AGENTS.md`）——A 档那一段加不进去。C 档这一段（结论句 ＋ 一档一格 ＋
 *  正中那一档的选中面）边界干净，独立成件；**旧两档那两段一个字节都不改**——搬的只是「住哪个文件」。
 *
 *  纪律同 `style.ts`：只经 `skinVar()` 读皮肤／全部规则 scope 在 `.<prefix>page-ui` 之下／
 *  零 `:root`／零 `!important`／零颜色字面量／零省略手段（读数永不截断）／宽度只许容器判。
 */
import { skinVar } from '../skin/contract.js';
import { spreadDistSlot, type SpreadDistSlot } from './attrs.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** C 档的样式（由 `spreadDistCss()` 插在正确的行序上）。恒返回非空 CSS 文本。 */
export function spreadDistQuantileCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  /* 槽类名（**不带 scope**）：只用在**已经落进本件某条选择器内部**的位置（前缀由外层那条选择器给）。 */
  const s = (slot: SpreadDistSlot): string => root + ' .' + spreadDistSlot(slot, p);
  const c = (slot: SpreadDistSlot): string => '.' + spreadDistSlot(slot, p);

  return [
    /* ── C 档：结论一句话在上、读数在下 ── */
    s('lead') + ' {',
    '  margin: 0;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-display') + ';',
    '  font-size: ' + skinVar('fs-body') + ';',
    '  font-weight: 700;',
    '  line-height: 1.5;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 一档一格：`auto-fit` ＋ `minmax` ⇒ 宽档并排、窄档自动折行（**一档不减**，减档＝删读数）。
       档间距走皮肤自己的 `space`（大字报刊那套更大 ⇒ 那一档下留白自动多一层，不用写皮肤名分支）。 */
    s('stops') + ' {',
    '  display: grid;',
    '  grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));',
    '  gap: ' + skinVar('space') + ';',
    '  min-width: 0;',
    '}',
    s('stop') + ' {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  gap: 2px 6px;',
    '  min-width: 0;',
    '  padding: 10px 12px;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  border-radius: ' + skinVar('radius-sm') + ';',
    '  background: ' + skinVar('surface-2') + ';',
    '}',
    s('stop-name') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-sm') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    s('stop-label') + ' {',
    '  flex: 0 1 auto;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink-2') + ';',
    '  font-size: ' + skinVar('fs-xs') + ';',
    '  font-weight: 600;',
    '  line-height: 1.45;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 那个数另起一行（`flex-basis: 100%`）：一格里两层——上面一行说这是哪一档，下面一行是数。 */
    s('stop-value') + ' {',
    '  flex-basis: 100%;',
    '  min-width: 0;',
    '  color: ' + skinVar('ink') + ';',
    '  font-family: ' + skinVar('font-num') + ';',
    '  font-size: ' + skinVar('fs-h3') + ';',
    '  font-weight: 700;',
    '  font-variant-numeric: tabular-nums;',
    '  overflow-wrap: anywhere;',
    '}',
    /* 正中那一档（中位）：**有文字的选中面** ⇒ 软底 ＋ 主色字 ＋ 主色描边（三样同时在）。 */
    s('stop') + '.is-median {',
    '  border-color: ' + skinVar('accent') + ';',
    '  background: ' + skinVar('accent-soft') + ';',
    '}',
    /* 三处字一起换成主色文本档（档名／说明句／那个数），**一条选择器写全**——
       拆成三行会让「一行即一条选择器」的源码级判据读不到另外两行。 */
    s('stop') + '.is-median ' + c('stop-name') + ', ' + s('stop') + '.is-median ' + c('stop-label')
      + ', ' + s('stop') + '.is-median ' + c('stop-value') + ' {',
    '  color: ' + skinVar('accent-text') + ';',
    '}',
  ].join(LF);
}
