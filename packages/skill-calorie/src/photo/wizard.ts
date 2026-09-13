/** 向导与规划器（HELP 一级分组「身材照片」下一级，唤醒词「看身材照向导」／「看GIF规划器」）：
 *  身材照向导 ＋ GIF规划器两条读命令——填表前的取数与预检页。
 *
 * 两条 `case` 逐字搬自旧分派层 `cli/cmd_read.ts`（#314 纯搬迁，行为不变）；
 * 视图数据与整页文档走共用件 `render/wizardPort.ts`／`render/wizardPortDocs.ts`，
 * 照片目录走本能力内部件 `dir.ts` 的读侧口径（缺目录不抛）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildGifPlannerView, buildPhotoLogWizardView } from '../render/wizardPort.js';
import { buildGifPlannerDoc, buildPhotoLogWizardDoc } from '../render/wizardPortDocs.js';
import { nums } from '../shared/params.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { photoDir } from './dir.js';

/** `calorie.view.photo-log-wizard` · 身材照向导：待存文件数与标签是否已给。 */
export function viewPhotoLogWizard(params: Record<string, unknown>): ViewOut {
  const v = buildPhotoLogWizardView(params);
  const metrics = nums({
    fileCount: v.srcPaths.length, hasTag: v.tag ? 1 : 0,
  });
  return { data: { metrics }, html: buildPhotoLogWizardDoc(v) };
}

/** `calorie.view.gif-planner` · GIF规划器：候选张数／已选／缺失／裁剪项。 */
export function viewGifPlanner(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const dir = photoDir(params);
  const v = buildGifPlannerView(db, params, dir ?? null);
  const metrics = nums({
    photoCount: v.photos.length, selectedCount: v.selectedIds.length,
    missingCount: v.missingIds.length, cropCount: v.photos.filter((p) => p.crop).length,
  });
  return { data: { metrics }, html: buildGifPlannerDoc(v) };
}
