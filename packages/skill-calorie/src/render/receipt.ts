/** T10 #29 · 通用 CRUD 回执 + 失败回执（对照老家 render_crud_receipt.py / render_error_receipt.py）。
 *
 * 收据只承载“已执行结果”的呈现数据：调用方先调 T4 fetch 写数（addPhotos/deletePhoto/
 * updateTag/tagAdd/tagRemove），再把返回值组装进来，本层不写库、不读二进制。
 * 失败回执对齐老家 build_error：场景/操作/原因/数据文本/建议/修正 prompt。
 *
 * #97 · M5 写库回执契约（**只追加字段**，v1；正本 `docs/research/t97-m5-contract.md`）：
 * 旧版铁则 M5（`SKILL.md:30-41`）要求写库类 CLI stdout 含 `id=<N>` ＋ `日期 <YYYY-MM-DD>
 * <HH:MM:SS>` ＋ `影响 N 行` ＋ 写入字段摘要；新架构 stdout 是**一行 JSON**（P9），四要素落在
 * `CrudReceipt` 的追加字段上：`recordId`／`ids`／`idSource` ＋ `meta.actionAt` ＋ `affectedRows`
 * ＋ `writtenFields`，并以 `m5Line` 给出旧版整行文本的等价物。既有字段一字未改。
 */
import { CalorieRenderError } from './errors.js';

export interface TagDiff {
  before: string[];
  after: string[];
}

export interface PhotoDistance {
  tag: string;
  days: number;
}

export interface ReceiptItem {
  id?: number;
  date?: string;
  file?: string;
  photoPath?: string;
  tagList?: string[];
  status: string;
  reason: string;
  detail?: string;
}

export interface ReceiptMeta {
  actionAt: string;
  entityType: string;
  wakeWord: string;
  source: string;
}

export interface CrudReceipt extends M5Fields {
  scene: string;
  action: string;
  op: 'create' | 'update' | 'delete';
  recordId: number | null;
  summary: string;
  items: ReceiptItem[];
  tagDiff: TagDiff | null;
  distance: PhotoDistance | null;
  noChange: boolean;
  meta: ReceiptMeta;
}

export interface ErrorReceipt {
  sceneName: string;
  op: string;
  sub: string;
  reason: string;
  dataText: string;
  suggestions: string[];
  fixPrompt: string;
  meta: ReceiptMeta;
}

/* ---------------------------------------------------------------- #97 · M5 追加字段 */

/** M5 契约版本（回执自证：探针/测试据此断言「本回执满足哪一版 M5」）。 */
export const M5_CONTRACT = '1' as const;
/** 影响行数来源：SQLite `total_changes()` 在本键写库前后的增量（真实库行数，非自报）。 */
export const M5_AFFECTED_SOURCE = 'sqlite:total_changes' as const;

/** id 口径（旧版 `id=<N>`；条件/批量写旧版为 `id=n/a`）。
 * - `record`：单条记录 id（`recordId` 或 `ids` 非空）
 * - `singleton`：单例行表（user_profile／daily_goal），固定 id=1
 * - `condition`：按条件/批量的写（旧版 `id=n/a`，`ids` 为空数组）
 * - `none`：本次无写入且无 id 可指（如重复跳过且拿不到原 id）
 */
export type M5IdSource = 'record' | 'singleton' | 'condition' | 'none';

export interface M5Fields {
  m5Contract: '1';
  affectedRows: number;
  affectedRowsSource: 'sqlite:total_changes';
  ids: number[];
  idSource: M5IdSource;
  writtenFields: string[];
  m5Line: string;
}

export interface M5Input {
  recordId: number | null;
  ids?: number[];
  idSource?: M5IdSource;
  affectedRows?: number;
  writtenFields?: string[];
  actionAt: string;
  noChange?: boolean;
}

/** 旧版整行文本等价物：`id=<N|n/a> | 日期 <YYYY-MM-DD HH:MM:SS> | 影响 N 行 | 字段 a,b`。 */
export function m5LineOf(input: {
  recordId: number | null; ids: number[]; actionAt: string; affectedRows: number; writtenFields: string[];
}): string {
  const idText = input.recordId !== null
    ? String(input.recordId)
    : (input.ids.length > 0 ? input.ids.join(',') : 'n/a');
  const fields = input.writtenFields.length > 0 ? input.writtenFields.join(',') : '—';
  return 'id=' + idText + ' | 日期 ' + input.actionAt + ' | 影响 ' + input.affectedRows + ' 行 | 字段 ' + fields;
}

/** M5 字段派生（单一来源：`buildCrudReceipt` 与 `withM5` 都走这里）。 */
export function buildM5(input: M5Input): M5Fields {
  const ids = [...(input.ids ?? (input.recordId !== null ? [input.recordId] : []))];
  const affectedRows = input.affectedRows ?? 0;
  const writtenFields = [...(input.writtenFields ?? [])];
  const idSource: M5IdSource = input.idSource
    ?? (input.recordId !== null || ids.length > 0
      ? 'record'
      : (input.noChange ? 'none' : 'condition'));
  if (!Number.isInteger(affectedRows) || affectedRows < 0) {
    throw new CalorieRenderError('bad-input', 'M5 affectedRows 须为非负整数：' + String(affectedRows));
  }
  return {
    m5Contract: M5_CONTRACT,
    affectedRows,
    affectedRowsSource: M5_AFFECTED_SOURCE,
    ids,
    idSource,
    writtenFields,
    m5Line: m5LineOf({ recordId: input.recordId, ids, actionAt: input.actionAt, affectedRows, writtenFields }),
  };
}

/** 只追加：把 M5 字段补进既有回执（photo.ts 三回执与本层同一入口，既有字段一字不改）。 */
export function withM5(receipt: CrudReceipt, patch: Omit<M5Input, 'recordId' | 'actionAt'> = {}): CrudReceipt {
  return {
    ...receipt,
    ...buildM5({
      recordId: receipt.recordId,
      ids: patch.ids ?? receipt.ids,
      idSource: patch.idSource ?? receipt.idSource,
      affectedRows: patch.affectedRows ?? receipt.affectedRows,
      writtenFields: patch.writtenFields ?? receipt.writtenFields,
      actionAt: receipt.meta.actionAt,
      noChange: receipt.noChange,
    }),
  };
}

/** 本仓唯一的时间戳口径（`YYYY-MM-DD HH:MM:SS`，本地时）。回执 `meta.actionAt` 与
 *  复制日志第 5 段同源；#239 起对外给出去——别在别处再写一份同样的格式。
 *  （注：`src/fetch/exercise.ts` 另有一份同名私有件，属取数层的既有重复，不在本次改动面。） */
export function nowStamp(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
}

export function buildReceiptMeta(entityType: string, wakeWord: string, source: string): ReceiptMeta {
  if (!entityType) throw new CalorieRenderError('bad-input', 'entityType 必填');
  if (!wakeWord) throw new CalorieRenderError('bad-input', 'wakeWord 必填');
  return { actionAt: nowStamp(), entityType, wakeWord, source };
}

export function buildCrudReceipt(input: {
  scene: string;
  action: string;
  op: CrudReceipt['op'];
  recordId?: number | null;
  summary: string;
  items?: ReceiptItem[];
  tagDiff?: TagDiff | null;
  distance?: PhotoDistance | null;
  noChange?: boolean;
  wakeWord: string;
  source: string;
  /** #97 · M5 追加字段（缺省：ids 由 recordId 派生、affectedRows=0、writtenFields=[]）。 */
  ids?: number[];
  idSource?: M5IdSource;
  affectedRows?: number;
  writtenFields?: string[];
}): CrudReceipt {
  if (!input.scene) throw new CalorieRenderError('bad-input', 'scene 必填');
  if (!input.summary) throw new CalorieRenderError('bad-input', 'summary 必填（回执无摘要不返空页）');
  if (input.op !== 'create' && input.op !== 'update' && input.op !== 'delete') {
    throw new CalorieRenderError('bad-input', 'op 非法：' + String(input.op));
  }
  const recordId = input.recordId ?? null;
  const noChange = input.noChange ?? false;
  const meta = buildReceiptMeta(input.scene, input.wakeWord, input.source);
  return {
    scene: input.scene,
    action: input.action || input.scene,
    op: input.op,
    recordId,
    summary: input.summary,
    items: input.items ?? [],
    tagDiff: input.tagDiff ?? null,
    distance: input.distance ?? null,
    noChange,
    meta,
    ...buildM5({
      recordId, noChange, actionAt: meta.actionAt,
      ids: input.ids, idSource: input.idSource,
      affectedRows: input.affectedRows, writtenFields: input.writtenFields,
    }),
  };
}

export function buildErrorReceipt(input: {
  sceneName?: string;
  wakeWord?: string;
  op?: string;
  sub?: string;
  reason?: string;
  data?: unknown;
  suggestions?: string[];
  fixPrompt?: string;
}): ErrorReceipt {
  const sceneName = input.sceneName || '操作失败';
  let dataText = '—';
  if (input.data !== undefined && input.data !== null) {
    try {
      dataText = typeof input.data === 'string' ? input.data : JSON.stringify(input.data, null, 2);
    } catch {
      dataText = String(input.data);
    }
  }
  return {
    sceneName,
    op: input.op || '操作未完成',
    sub: input.sub || '',
    reason: input.reason || '(未知原因)',
    dataText,
    suggestions: input.suggestions && input.suggestions.length > 0
      ? [...input.suggestions]
      : ['修正后重试', '更换参数/目标', '联系开发者'],
    fixPrompt: input.fixPrompt || '// 修正 prompt 未生成',
    meta: buildReceiptMeta(sceneName, input.wakeWord || sceneName, '错误回执(写库前校验/执行中失败)'),
  };
}
