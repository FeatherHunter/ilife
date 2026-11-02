/** 页面级形状族**样式组装器**（`pageShapeCss()`）：本族三支的样式段按原顺序拼回，
 *  末尾再汇总 `#950` 两族（导航／横条）。恒返回非空 CSS 文本。
 *
 *  **住址**：目录化批次②从 `src/pageShapes.ts` 搬来；**拼装顺序一个字未改**（顺序是产物的一部分）。
 */
import { pageNavCss } from '../page-nav/index.js';
import { pageBarsCss } from '../page-bars/index.js';
import { factStripCss } from './fact-strip.js';
import { mediaCss } from './media.js';
import { timelineCss } from './timeline.js';
import { m } from '../../entries/index.js';

/** 换行（仓库口径：不写字面换行转义，与 `blocks.ts` 同）。 */
const LF = String.fromCharCode(10);

/** 形状件的样式唯一产出者（①②③ 三支 ＋ ②b 占位件 ＋ ④ 汇总的两族）。 */
export function pageShapeCss(input?: { readonly prefix?: string }): string {
  const p = input !== undefined && input !== null
    && typeof input.prefix === 'string' && input.prefix !== '' ? input.prefix : 'ilife-';
  const root = '.' + p + 'page-ui';
  return [
        m('base-render.components-page-style.c001'),
    ...factStripCss(p, root),
    ...mediaCss(p, root),
    ...timelineCss(p, root),
      m('base-render.components-page-style.c002'),
      m('base-render.components-page-style.c003'),
      pageNavCss({ prefix: p }),
      pageBarsCss({ prefix: p }),
  ].join(LF);
}
