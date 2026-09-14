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
import { CalorieRenderError } from '../render/errors.js';
import { buildPhotoPickerDoc } from './pickerDoc.js';
import { photoDir } from './dir.js';

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
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw <= 0) bad('参数 id 须为正整数照片 id');
  return raw as number;
}

function optAction(raw: unknown): PickerAction {
  if (raw === undefined || raw === null) return 'remove';
  if (raw !== 'remove' && raw !== 'tag') bad('参数 action 只许 remove/tag：' + String(raw));
  return raw;
}

function optOp(raw: unknown): PickerTagOp | null {
  if (raw === undefined || raw === null) return null;
  if (raw !== 'set' && raw !== 'add' && raw !== 'remove') bad('参数 op 只许 set/add/remove：' + String(raw));
  return raw;
}

function optTag(raw: unknown, field: string): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string' || raw.trim() === '') bad('参数 ' + field + ' 须为非空字符串');
  return raw.trim();
}

function optLimit(raw: unknown): number {
  if (raw === undefined || raw === null) return PICKER_DEFAULT_LIMIT;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > PICKER_MAX_LIMIT) {
    bad('参数 limit 须为 1..' + PICKER_MAX_LIMIT + ' 整数');
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
    return '// 还没选照片：把候选列表里那个 #号说给我（例如 #19），我再把要执行的指令写出来';
  }
  if (action === 'remove') {
    return '请帮我删除身材照 #' + selectedId + '（删了就找不回来，先看上面那张是不是它）' +
      '\n\n命令:\n```bash\ncalorie-cmd-read calorie.photo.remove --params \'' +
      JSON.stringify({ id: selectedId }) + '\'\n```\n\n完成后返回写库回执。';
  }
  if (op === null || newTag === null) {
    return '// 已选 #' + selectedId + '：还差两样——要把标签换成、加上，还是去掉哪个；换成／加上／去掉的标签叫什么';
  }
  return '请帮我改照片标签 #' + selectedId + '（先核对本页快照里的原标签）' +
    '\n\n命令:\n```bash\ncalorie-cmd-read calorie.photo.tag --params \'' +
    JSON.stringify({ id: selectedId, op, tag: newTag }) + '\'\n```\n\n完成后返回写库回执。';
}

/** `calorie.view.photo-picker` · 删照候选：候选列表＋单张快照＋可复制 prompt（只读）。 */
export function viewPhotoPicker(params: Record<string, unknown>, db: DatabaseSync): {
  data: Record<string, unknown>; html: string;
} {
  for (const k of Object.keys(params)) {
    if (!ALLOWED.has(k)) bad('不支持字段: ' + k);
  }
  const id = optId(params['id']);
  const action = optAction(params['action']);
  const op = optOp(params['op']);
  const newTag = optTag(params['newTag'], 'newTag');
  const tag = optTag(params['tag'], 'tag');
  const dateFrom = params['dateFrom'] === undefined ? undefined : dayField(params, 'dateFrom');
  const dateTo = params['dateTo'] === undefined ? undefined : dayField(params, 'dateTo');
  const today = params['today'] === undefined ? undefined : dayField(params, 'today');
  if (dateFrom && dateTo && dateFrom > dateTo) bad('dateFrom 不得晚于 dateTo');
  const days = params['days'];
  if (days !== undefined && (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 36500)) {
    bad('days 须为 1..36500 整数');
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
    throw new CalorieRenderError('missing-data',
      '无身材照（' + (dateFrom ?? '') + ' ~ ' + (dateTo ?? '') + (tag ? ' · 标签 ' + tag : '') + '）');
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
  const view: PhotoPickerView = {
    candidates, fullCount, truncated: fullCount > candidates.length,
    filtersDesc: (tag ? '标签 ' + tag + ' · ' : '') + '近窗候选（本页 ' + candidates.length + '/' + fullCount + ' 张）',
    selected, selectedInList: selected !== null && candidates.some((c) => c.id === selected?.id),
    action, prompt,
  };
  const items = candidates.map((p) => ({
    id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists,
  }));
  return {
    data: { items, total: fullCount, selectedId: id },
    html: buildPhotoPickerDoc(view, dir ?? null),
  };
}
