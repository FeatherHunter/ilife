/** scale-bar · **样式段**（本组件唯一的样式来源）。
 *
 *  纪律（与本层其余件同一份）：只读冻结 token，不新增 token 名；全部规则 scope 在 `.<prefix>page-ui` 下。
 *
 *  几何契约（钉在测试里）：
 *   · 两形态的**根高度相同**（刻度 22px ＋ 可选一行 18px）——同一页换形态不跳版；
 *   · 条形码逐格等宽（`flex:1 1 0`），格间距 3px，总宽永远等于容器宽（窄屏不横滑）；
 *   · 超目标（`is-over`）只换颜色（走语义色），**形状不变**：仍是满格／满轨，不画第二圈。
 */
import { PAPER_MONO_STACK } from '../shared/typography.js';
import { SCALE_BAR_DEFAULT_CELLS } from './render.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 刻度条的两档高度（px）：条形码的格高／细线的轨高。 */
export const SCALE_BAR_CELL_HEIGHT_PX = 22;
export const SCALE_BAR_LINE_HEIGHT_PX = 6;

/** 本组件的样式段。恒返回非空 CSS 文本。 */
export function scaleBarCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  const s = root + ' .' + p + 'block-scale-bar';
  return [
    '/* scale-bar（刻度条）：条形码（N 格可数）／细线（一条轨）两形态，同一份值域。 */',
    s + ' {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 6px;',
    '  min-width: 0;',
    '}',
    s + '-track {',
    '  display: flex;',
    '  gap: 3px;',
    '  width: 100%;',
    '  min-width: 0;',
    '}',
    s + '.is-cells ' + '.' + p + 'block-scale-bar-cell {',
    '  flex: 1 1 0;',
    '  min-width: 0;',
    '  height: ' + SCALE_BAR_CELL_HEIGHT_PX + 'px;',
    '  border-radius: ' + 1 + 'px;',
    '  background: var(--line);',
    '}',
    s + '.is-cells ' + '.' + p + 'block-scale-bar-cell.is-on {',
    '  background: var(--fg);',
    '}',
    '/* 细线档：轨高 6px，填充只用主色；轨底用 --line（与条形码的"空格"同色 ⇒ 两形态的空/满语义一致）。 */',
    s + '.is-line ' + '.' + p + 'block-scale-bar-track {',
    '  gap: 0;',
    '  height: ' + SCALE_BAR_LINE_HEIGHT_PX + 'px;',
    '  border-radius: 999px;',
    '  overflow: hidden;',
    '  background: var(--line);',
    '}',
    s + '.is-line ' + '.' + p + 'block-scale-bar-fill {',
    '  display: block;',
    '  height: 100%;',
    '  border-radius: 999px;',
    '  background: var(--blue);',
    '}',
    '/* 超目标：只换色（语义色与同仓"值位"三档一致），形状不变。 */',
    s + '.is-over ' + '.' + p + 'block-scale-bar-cell.is-on,',
    s + '.is-over ' + '.' + p + 'block-scale-bar-fill {',
    '  background: #a83228;',
    '}',
    s + '-cap {',
    '  display: flex;',
    '  flex-wrap: wrap;',
    '  align-items: baseline;',
    '  justify-content: space-between;',
    '  gap: 4px 12px;',
    '  color: var(--fg2);',
    /* 两端读数都是"数"：走原型 `--mono`（`.code-row .pct` 同款）。 */
    '  font-family: ' + PAPER_MONO_STACK + ';',
    '  font-size: 11.5px;',
    '  font-variant-numeric: tabular-nums;',
    '}',
    s + '-cap-right {',
    '  font-weight: 600;',
    '}',
    '/* 条形码总格数写在产出器里（' + SCALE_BAR_DEFAULT_CELLS + ' 格缺省）；样式不猜格数。 */',
  ].join(LF);
}
