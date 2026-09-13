/** 安全检查（HELP 场景 05「健身计划」下一级「安全检查」）：`calorie.view.contraindication` 读。
 *
 * 扫描口径住 `analysis/contraindications.ts` 的 `scanPlan`，视图装配住视图层
 * `render/insightPlate.ts` 的 `buildContraView`、整页住 `render/trendDocs.ts` 的 `buildContraDoc`；
 * 本能力只调公开函数，不把禁忌规则表抄一份进自己目录。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildContraView } from '../render/insightPlate.js';
import { buildContraDoc } from '../render/trendDocs.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { nums, optStr } from '../shared/params.js';

/** `calorie.view.contraindication` · 禁忌扫描（按部位扫全计划：命中动作／严重度／替代动作）。 */
export function viewContraindication(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const part = optStr(params, 'part') ?? 'all';
  const v = buildContraView(db, part);
  const metrics = nums({ scannedSessions: v.scannedSessions, scannedMovements: v.scannedMovements, errorCount: v.errorCount, warnCount: v.warnCount, infoCount: v.infoCount });
  return { data: { metrics }, html: buildContraDoc(v) };
}
