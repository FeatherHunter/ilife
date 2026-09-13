/** 写命令的回执底座（**唯一定义地**）：回执装配（`R`／`out`／`receiptHtml`）＋ 影响行数口径
 *  （`totalChanges`）＋ 写入字段摘要口径（`F`／`COL_CLI`／`provided`／`definedKeys`）＋ 删除措辞。
 *
 * 谁在用（写得出哪两个在用）：
 *   ① 出口分派层 `src/cli/write.ts`——尚未搬进能力目录的老写键；
 *   ② 能力目录（本票：体重 `src/weight/`）——写命令的实现搬回能力目录后，回执仍是同一套形状
 *      （`ok`／`message`／`receipt` 三件，`affectedRows` 由 `dispatchWrite` 统一注入）。
 *
 * 口径正本：`#97` M5 写库回执契约（只追加字段）；`#101`→`#120` 删除可恢复性
 *  （**不得承诺可恢复**：软删除＝行保留、已从查询与统计排除、暂无恢复入口；硬删除＝行删除、不可恢复）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { buildCrudReceipt } from '../render/receipt.js';
import type { CrudReceipt, M5IdSource } from '../render/receipt.js';
import type { WriteOut } from './commandSpec.js';

/** 删除口径单一来源（prose 词条 ＋ `items[].status` 状态串同源派生）。
 * `recoverable` 恒 false：全仓 0 个 restore/undo/recover 入口，故不得出现「可恢复」承诺。 */
export const SOFT_EXCLUDED_INNER = '软删除：行保留，已从查询与统计中排除；暂无恢复入口';
export const SOFT_EXCLUDED = '（' + SOFT_EXCLUDED_INNER + '）';
export const HARD_INNER = '硬删除，不可恢复';
export const HARD_WORDING = '（' + HARD_INNER + '）';

/** 状态串与 prose 同源：kind 决定「软/硬」，两者一律带「不可恢复」。 */
export function deleteStatus(kind: 'soft' | 'hard', base = '已删除'): string {
  return base + (kind === 'soft' ? '（软，不可恢复）' : '（硬，不可恢复）');
}

export function esc(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ------------------------------------------------ #97 · M5 回执契约（追加字段，正本 t97-m5-contract.md） */

/** 影响行数来源：SQLite `total_changes()` 在本键写库前后的增量。
 * 真实库行数（INSERT／UPDATE／DELETE／软删标记一律计；`INSERT OR REPLACE` 命中已有行＝1，
 * `INSERT OR IGNORE` 命中已有行＝0——实测 node:sqlite v24），非自报。 */
export function totalChanges(db: DatabaseSync): number {
  const row = db.prepare('SELECT total_changes() AS n').get() as { n?: number } | undefined;
  return row && typeof row.n === 'number' ? Number(row.n) : 0;
}

/** 写入字段摘要（CLI 参数名口径）：create 键＝该键写入字段全集（缺省值也算写入）；
 * update 键＝本次实际变更字段；delete 键＝空数组（无写入字段，旧版同样只印 id/日期/影响）。 */
export const F = {
  diet: ['foodName', 'calories', 'protein', 'carbs', 'fat', 'grams', 'note', 'date', 'time'],
  water: ['ml', 'note', 'date', 'time'],
  weight: ['kg', 'note', 'date', 'time'],
  weightBatch: ['kg', 'date'],
  exercise: ['type', 'calories', 'minutes', 'date', 'time', 'note', 'reps', 'category', 'difficulty', 'distance', 'heartRate', 'maxHeartRate', 'steps', 'setIndex', 'loadKg', 'backfill'],
  photo: ['srcPaths', 'tag', 'note', 'date', 'time'],
  product: ['productName', 'brand', 'calories', 'protein', 'fat', 'saturatedFat', 'carbohydrates', 'sugar', 'dietaryFiber', 'sodium', 'note'],
} as const;

/** 库列名 → CLI 参数名（update 键按实际变更列回报写入字段摘要）。 */
export const COL_CLI: Record<string, string> = {
  food_name: 'foodName', grams: 'grams', calories: 'calories', protein: 'protein', carbs: 'carbs',
  fat: 'fat', note: 'note', date: 'date', time: 'time',
  exercise_type: 'type', calories_burned: 'calories', duration_minutes: 'minutes', category: 'category',
  difficulty: 'difficulty', distance_km: 'distance', avg_heart_rate: 'heartRate',
  max_heart_rate: 'maxHeartRate', steps: 'steps', reps: 'reps', load_kg: 'loadKg',
  set_index: 'setIndex', is_backfill: 'backfill',
  product_name: 'productName', brand: 'brand', saturated_fat: 'saturatedFat', carbohydrates: 'carbohydrates',
  sugar: 'sugar', dietary_fiber: 'dietaryFiber', sodium: 'sodium',
};

export const cliNames = (cols: readonly string[]): string[] => cols.map((c) => COL_CLI[c] ?? c);

/** 只取「实际提供」的参数名（写入字段摘要；`undefined` 不算写入）。 */
export function provided(params: Record<string, unknown>, names: readonly string[]): string[] {
  return names.filter((n) => params[n] !== undefined);
}

/** `input` 里实际有值的键（体脂／围度等动态字段表）。 */
export function definedKeys(input: Record<string, unknown>): string[] {
  return Object.keys(input).filter((k) => input[k] !== undefined);
}

/** M5 追加补丁：ids／idSource／writtenFields（`affectedRows` 由 `dispatchWrite` 统一注入）。 */
export type M5Patch = { ids?: number[]; idSource?: M5IdSource; writtenFields?: string[] };

/** C6 #43 · 写收据 HTML 结构化分项：摘要 + 操作元 + items 逐条（id/日期/状态/原因/明细）。 */
export function receiptHtml(scene: string, summary: string, op: string, recordId: number | null, items?: CrudReceipt['items']): string {
  const list = (items ?? []).length > 0
    ? '<ul>' + (items ?? []).map((it) => '<li>#' + esc(it.id ?? '') + (it.date ? ' ' + esc(it.date) : '') + ' ' + esc(it.status) + (it.reason ? '（' + esc(it.reason) + '）' : '') + (it.detail ? ' · ' + esc(it.detail) : '') + '</li>').join('') + '</ul>'
    : '';
  return '<section class="ilife-page" data-skill="calorie" data-slot="ilife:calorie:receipt"><h1>' + esc(scene) + '</h1>' +
    '<div class="ilife-item"><b>' + esc(summary) + '</b><div>op=' + esc(op) + (recordId === null ? '' : ' · id=' + esc(recordId)) + '</div>' + list + '</div></section>';
}

export function out(receipt: CrudReceipt): WriteOut {
  return {
    data: { ok: true, message: receipt.summary, receipt },
    html: receiptHtml(receipt.scene, receipt.summary, receipt.op, receipt.recordId, receipt.items),
  };
}

/** 页面「复制日志」第 4 段的命令原文：与 AI 实跑那条同形（含本次 `--params`），可照抄重跑。
 *  参数值里若出现半角单引号，原文会在此处被截断——与 `profile/setup.ts` 的 prompt 写命令同一口径，
 *  真要照抄重跑请自行把单引号转义（本仓命令原文一贯用单引号包 JSON）。 */
export function commandLine(key: string, params: Record<string, unknown>): string {
  return 'calorie-cmd-read ' + key + " --params '" + JSON.stringify(params) + "'";
}

/** 回执装配的收口：一次写命令的「场景／操作／摘要／唤醒词／取数来源」＋ 追加补丁。 */
export const R = (
  scene: string, op: CrudReceipt['op'], summary: string, wakeWord: string, source: string,
  extra?: Partial<Pick<CrudReceipt, 'recordId' | 'items' | 'tagDiff' | 'distance' | 'noChange' | 'action'>> & M5Patch,
): CrudReceipt =>
  buildCrudReceipt({
    scene, action: scene, op, recordId: null, summary, items: [], wakeWord, source,
    ...(extra ?? {}),
  });
