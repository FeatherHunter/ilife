/** #833 · init 域（初始化类）· 能力门（本目录**唯一**对外的口）。
 *
 * 本域管 HELP「初始化类」那一组的一个场景 `memo_init_setup`（唤醒词「首次使用」），
 * 出两格产物（册子 #848）：`首次使用`（报告族·结果页）与 `首次使用-向导`（向导族·过程页）。
 *
 * 对外四件，各一句话：
 *   · `INIT_SCENE_ID` —— 本域场景 id（`pageEnvelope` 与册子取主体都用它，只此一处写死）；
 *   · `readInitDiagnosis` —— 读 AI 给的诊断 JSON（坏输入抛 `InitInputError`，出口侧归 exit 2）；
 *   · `InitInputError` —— 上面那条抛出的错误类型；
 *   · `renderInitPage` —— 出整页（`mode` 选报告页或引导页），返回 HTML ＋ 它在册子里的页型。
 *
 * 共用位与边界：不走 `src/render/**` 的自持装配（那套待结构票按域拆），直接用公共层
 * `base-paint` 的区块与文档壳；本目录不写任何自持样式、不碰库、不碰配置。
 */
import type { InitDiagnosis } from './diagnosis.js';
import { renderInitGuidePage, renderInitReportPage } from './page.js';
import type { InitPageInput } from './page.js';

export { readInitDiagnosis, InitInputError } from './diagnosis.js';
export type { InitDiagnosis, InitCheckItem, InitCheckStatus, InitTodo, InitVerifyEntry, InitVerifyStatus } from './diagnosis.js';

/** 本域场景 id（HELP `init.ts` 的 `memo_init_setup`）。 */
export const INIT_SCENE_ID = 'memo_init_setup';

/** 出哪一页：`report`＝结果页（册子 `首次使用`）／`guide`＝过程页（册子 `首次使用-向导`）。 */
export type InitPageMode = 'report' | 'guide';

/** 出页结果：整页 HTML ＋ 该页在册子里的页型（取主体时要用它）。 */
export interface InitPageOutput {
  readonly html: string;
  readonly kind: '结果页' | '过程页';
}

/** 出页。入参＝诊断载荷 ＋ 生成时刻 ＋ 回执信封（复制区载荷由它序列化）。 */
export function renderInitPage(mode: InitPageMode, diagnosis: InitDiagnosis, input: Omit<InitPageInput, 'diagnosis'>): InitPageOutput {
  const page: InitPageInput = { diagnosis, ...input };
  return mode === 'guide'
    ? { html: renderInitGuidePage(page), kind: '过程页' }
    : { html: renderInitReportPage(page), kind: '结果页' };
}
