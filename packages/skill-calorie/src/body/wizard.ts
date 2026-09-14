/** 向导（HELP 一级分组「身体细节」下一级，唤醒词「看体脂向导」／「看围度向导」）：
 *  体脂向导 ＋ 围度向导两条读命令——填表前的取数与预检页。
 *
 * 两条 `case` 逐字搬自旧分派层 `cli/cmd_read.ts`（#314 纯搬迁，行为不变）；
 * 视图数据与整页文档走本能力内部件 `body/wizardPlate.ts`／`body/wizardDocs.ts`
 * （#353 自 `render/wizardPort.ts`／`render/wizardPortDocs.ts` 原样迁入）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildCompositionWizardView, buildMeasureWizardView } from './wizardPlate.js';
import { buildCompositionWizardDoc, buildMeasureWizardDoc } from './wizardDocs.js';
import { nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';

/** `calorie.view.measure-wizard` · 围度向导：已填项数与最近一次记录。 */
export function viewMeasureWizard(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildMeasureWizardView(db, params);
  const metrics = nums({
    filledCount: v.filledCount, hasRecent: v.recent ? 1 : 0,
  });
  return { data: { metrics }, html: buildMeasureWizardDoc(v) };
}

/** `calorie.view.composition-wizard` · 体脂向导：来源／体脂率／7 处皮褶的已填项数。 */
export function viewCompositionWizard(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const v = buildCompositionWizardView(db, params);
  const metrics = nums({
    filledCount: (v.source ? 1 : 0) + (v.bodyFatPct === null ? 0 : 1) + v.calipers.length,
    caliperCount: v.calipers.length, sum7: v.sum7, hasRecent: v.recent ? 1 : 0,
  });
  return { data: { metrics }, html: buildCompositionWizardDoc(v) };
}
