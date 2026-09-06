/** T10 #29 · 通用 CRUD 回执 + 失败回执（对照老家 render_crud_receipt.py / render_error_receipt.py）。
 *
 * 收据只承载“已执行结果”的呈现数据：调用方先调 T4 fetch 写数（addPhotos/deletePhoto/
 * updateTag/tagAdd/tagRemove），再把返回值组装进来，本层不写库、不读二进制。
 * 失败回执对齐老家 build_error：场景/操作/原因/数据文本/建议/修正 prompt。
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

export interface CrudReceipt {
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

function nowStamp(): string {
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
}): CrudReceipt {
  if (!input.scene) throw new CalorieRenderError('bad-input', 'scene 必填');
  if (!input.summary) throw new CalorieRenderError('bad-input', 'summary 必填（回执无摘要不返空页）');
  if (input.op !== 'create' && input.op !== 'update' && input.op !== 'delete') {
    throw new CalorieRenderError('bad-input', 'op 非法：' + String(input.op));
  }
  return {
    scene: input.scene,
    action: input.action || input.scene,
    op: input.op,
    recordId: input.recordId ?? null,
    summary: input.summary,
    items: input.items ?? [],
    tagDiff: input.tagDiff ?? null,
    distance: input.distance ?? null,
    noChange: input.noChange ?? false,
    meta: buildReceiptMeta(input.scene, input.wakeWord, input.source),
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
