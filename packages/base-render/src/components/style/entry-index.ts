/** style 公共件 · **序号位**（判地 `.idx` 那一枚编号方块）的唯一定义地。
 *
 *  它是什么：一枚行序方块，占 22×22 的见方位、圆角 7px、暖底 `#f4efe2` 3001、12px/700 字、字色 `#8a857a`。
 *  几何逐字照判地（`proto/analysis/a01-看月度-v2.1.html` 的内嵌 <style> 里 `.idx` 那一条）：
 *  `flex:0 0 22px` / `height:22px` / `margin-top:1px` / `border-radius:7px` / `background:#f4efe2` /
 *  `border:1px solid var(--line)` / `color:#8a857a` / `font-size:12px` / `font-weight:700` /
 *  `display:inline-flex` / `align-items:center` / `justify-content:center`。
 *
 *  为什么单独一件（铁律二 概念唯一）：**序号方块目前有两个用法**——
 *  一是 `entry-card` 那件的 `-idx` 槽（写入域回执页 DETAIL 卡），
 *  二是分析域 DETAIL 段里的占比行（`renderDistributionRows`）与列表行（`renderListRows`）。
 *  同一枚方块的形状只能定一份，否则两处会走散。本件定类名与样式，
 *  两侧都从这里取。
 *
 *  纪律：颜色与圆角只有**判地授权的那几处字面**（上面那句——`#f4efe2` 编号胶囊的底、
 *  `#8a857a` 字色）；`border` 与圆角走皮肤号（同 `entry-card` 那一份口径）；
 *  零 `:root` 、零 `!important`、零新 token 名。
 */
import { skinVar } from '../skin/contract.js';

/** 换行（仓库口径：不写字面换行转义）。 */
const LF = String.fromCharCode(10);

/** 序号位的槽类名（**唯一拼法**：渲染侧与样式段都从这里取，各写一份就会走散）。 */
export function entryIndexSlot(prefix = 'ilife-'): string {
  return prefix + 'block-entry-index';
}
/** 序号方块的见方边长（px）：判地 `.idx{flex:0 0 22px;height:22px}`。 */
export const ENTRY_INDEX_BOX_PX = 22;
/** 序号方块的圆角（px）：判地 `.idx{border-radius:7px}`。走皮肤号 `radius-tag`（票据纸取它，兜底 7px）。 */
export const ENTRY_INDEX_RADIUS_PX = 7;

/** 序号位的样式段。恒返回非空 CSS 文本。
 *
 *  调用方：`blocks.ts` 把它拼进 `blocksCss()`（不要调用方另行拼一段），
 *  所以**序号位在每一张页上都有样式**、而不需要每个页面另接一段。 */
export function entryIndexCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const sel = '.' + entryIndexSlot(p);
  return [
    '/* 序号位（判地 `.idx`：行序方块）——几何逐条照判地。 */',
    sel + ' {',
    '  flex: 0 0 ' + String(ENTRY_INDEX_BOX_PX) + 'px;',
    '  height: ' + String(ENTRY_INDEX_BOX_PX) + 'px;',
    '  margin-top: 1px;',
    '  /* 圆角读皮肤号 `radius-tag`（票据纸 7px ＝判地 `.idx{border-radius:7px}`；兜底 7px）。 */',
    '  border-radius: ' + skinVar('radius-tag') + ';',
    '  /* 判地字面 · 授权照抄：#f4efe2（序号胶囊的底） */',
    '  background: #f4efe2;',
    '  border: 1px solid ' + skinVar('line') + ';',
    '  /* 判地字面 · 授权照抄：#8a857a（序号胶囊的字色） */',
    '  color: #8a857a;',
    '  font-size: 12px;',
    '  font-weight: 700;',
    '  display: inline-flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '}',
  ].join(LF);
}
