/** #283 · 删身材照候选与快照（只读过程型页的取数＋prompt）。
 *
 * 服务「删身材照」与标签三条（改／加／删照片标签）：先列候选（缩略图＋日期＋标签）
 * → 选中一张看快照 → 复制 prompt → 才走写命令（老技能 D6 三步，
 * `SKILL.md:1193`「先列候选 → 快照确认 → 回执」）。
 * 本件只做取数与 prompt 组装；整页文档见 `pickerDoc.ts`。快照只读，不含删除动作
 * （删除走 `calorie.photo.remove` 写命令；t400 裁定 2 prompt 即 CLI、裁定 4 快照只读必读）。
 * 空库即抛（缺失阻断不返空，exit 4，不落盘）；参数非法即抛 bad-input（exit 2）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { getPhotoRow, listPhotos } from './photos.js';
import { toCard, type PhotoCard } from './photo.js';
import { dayField } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';
import { CalorieRenderError } from '../render/errors.js';
import { buildPhotoPickerDoc } from './pickerDoc.js';
import { photoDir } from './dir.js';
import { m } from '../entries/index.js';

export type PickerAction = 'remove' | 'tag';
export type PickerTagOp = 'set' | 'add' | 'remove';

export interface PhotoPickerView {
  readonly candidates: PhotoCard[];
  readonly fullCount: number;
  readonly truncated: boolean;
  readonly filtersDesc: string;
  readonly selected: PhotoCard | null;
  readonly selectedInList: boolean;
  readonly action: PickerAction;
  readonly prompt: string;
}

/** 候选缺省与上限（t341 体积节口径沿用：单页 1 MiB 只容 3~4 张实拍直嵌，候选不无脑全嵌）。 */
export const PICKER_DEFAULT_LIMIT = 20;
export const PICKER_MAX_LIMIT = 100;

const ALLOWED = new Set([
  'id', 'action', 'op', 'newTag', 'tag',
  'dateFrom', 'dateTo', 'days', 'limit', 'today', 'photosDir',
]);

function bad(msg: string): never {
  throw new CalorieRenderError('bad-input', msg);
}

function optId(raw: unknown): number | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw <= 0) bad(m('skill-calorie.photo-picker.c001'));
  return raw as number;
}

function optAction(raw: unknown): PickerAction {
  if (raw === undefined || raw === null) return 'remove';
  if (raw !== 'remove' && raw !== 'tag') bad(m('skill-calorie.photo-picker.c002', { p0: String(String(raw)) }));
  return raw;
}

function optOp(raw: unknown): PickerTagOp | null {
  if (raw === undefined || raw === null) return null;
  if (raw !== 'set' && raw !== 'add' && raw !== 'remove') bad(m('skill-calorie.photo-picker.c003', { p0: String(String(raw)) }));
  return raw;
}

function optTag(raw: unknown, field: string): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string' || raw.trim() === '') bad(m('skill-calorie.photo-picker.c004', { p0: String(field) }));
  return raw.trim();
}

function optLimit(raw: unknown): number {
  if (raw === undefined || raw === null) return PICKER_DEFAULT_LIMIT;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > PICKER_MAX_LIMIT) {
    bad(m('skill-calorie.photo-picker.c005', { p0: String(PICKER_MAX_LIMIT) }));
  }
  return raw as number;
}

/** prompt 预览：有已选 ID 即 bash 可执行 CLI；缺项即指到步骤的占位句（t400 裁定 2）。
 *  人话口径（#474）：命令段本身（`calorie-cmd-read …` 与 `--params` JSON）是给 AI 的机器内容，
 *  一律不改；只改**对着用户说的那几句**。 */
export function buildPhotoPickerPrompt(input: {
  selectedId: number | null; action: PickerAction; op: PickerTagOp | null; newTag: string | null;
}): string {
  const { selectedId, action, op, newTag } = input;
  if (selectedId === null) {
    return m('skill-calorie.photo-picker.c006');
  }
  if (action === 'remove') {
    return m('skill-calorie.photo-picker.c007', {
      p0: String(selectedId),
      p1: String(JSON.stringify({ id: selectedId })),
    });
  }
  if (op === null || newTag === null) {
    return m('skill-calorie.photo-picker.c008', { p0: String(selectedId) });
  }
  return m('skill-calorie.photo-picker.c009', {
    p0: String(selectedId),
    p1: String(JSON.stringify({ id: selectedId, op, tag: newTag })),
  });
}

/** `calorie.view.photo-picker` · 删照候选：候选列表＋单张快照＋可复制 prompt（只读）。 */
export function viewPhotoPicker(params: Record<string, unknown>, db: DatabaseSync): {
  data: Record<string, unknown>; html: string;
} {
  for (const k of Object.keys(params)) {
    if (!ALLOWED.has(k)) bad(m('skill-calorie.photo-picker.c010', { p0: String(k) }));
  }
  const id = optId(params['id']);
  const action = optAction(params['action']);
  const op = optOp(params['op']);
  const newTag = optTag(params['newTag'], 'newTag');
  const tag = optTag(params['tag'], 'tag');
  const dateFrom = params['dateFrom'] === undefined ? undefined : dayField(params, 'dateFrom');
  const dateTo = params['dateTo'] === undefined ? undefined : dayField(params, 'dateTo');
  const today = params['today'] === undefined ? undefined : dayField(params, 'today');
  if (dateFrom && dateTo && dateFrom > dateTo) bad(m('skill-calorie.photo-picker.c011'));
  const days = params['days'];
  if (days !== undefined && (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 36500)) {
    bad(m('skill-calorie.photo-picker.c012'));
  }
  const limit = optLimit(params['limit']);
  const dir = photoDir(params);
  const rows = listPhotos(db, {
    ...(dateFrom || dateTo ? { dateFrom: dateFrom ?? null, dateTo: dateTo ?? null } : {}),
    ...(!dateFrom && !dateTo ? { days: (days as number | undefined) ?? 90 } : {}),
    ...(today ? { today } : {}),
    ...(tag ? { tag } : {}),
    limit: null,
  });
  if (rows.length === 0) {
    const tagNote = tag ? m('skill-calorie.photo-picker.c013', { p0: String(tag) }) : '';
    throw new CalorieRenderError('missing-data',
      '无身材照（' + (dateFrom ?? '') + ' ~ ' + (dateTo ?? '') + tagNote + '）');
  }
  const fullCount = rows.length;
  const page = rows.slice(0, limit);
  const candidates = page.map((r) => toCard(r, dir ?? null));
  let selected: PhotoCard | null = null;
  if (id !== null) {
    const row = getPhotoRow(db, id);
    if (!row) throw new CalorieRenderError('missing-data', '身材照 #' + id + ' 不存在');
    selected = toCard(row, dir ?? null);
  }
  const prompt = buildPhotoPickerPrompt({ selectedId: id, action, op, newTag });
  const tagPrefix = tag ? m('skill-calorie.photo-picker.c014', { p0: String(tag) }) : '';
  const view: PhotoPickerView = {
    candidates, fullCount, truncated: fullCount > candidates.length,
    filtersDesc: m('skill-calorie.photo-picker.c015', {
      p0: String(tagPrefix),
      p1: String(candidates.length),
      p2: String(fullCount),
    }),
    selected, selectedInList: selected !== null && candidates.some((c) => c.id === selected?.id),
    action, prompt,
  };
  const items = candidates.map((p) => ({
    id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists,
  }));
  return {
    data: { items, total: fullCount, selectedId: id },
    // #654：复制日志第 4 段的命令原文由命令层共用件 `commandLine()` 派生（含本次 `--params`），页面件不自己拼。
    html: buildPhotoPickerDoc(view, dir ?? null, commandLine('calorie.view.photo-picker', params)),
  };
}
