/** #86 · wizard 身材照／GIF 两页（D1 verify 体验）render 数据＋ prompt 复刻。
 *
 * 点名（#353 后：记围度／记体脂两页已迁入 `src/body/wizardPlate.ts`，本件只留两页）：
 * 记身材照 ＋ GIF 框选器（t71 §2 #11/#9；#52 明确不做、#54 新版已有不碰）。
 * 形态＝静态 HTML ＋ copyText（B7 边界：B-09 表单零 JS，行为归宿主；
 * formPrompt／selectList／smartSelect 一律不用，复制走 Base P0 双通道）。
 *
 * 数据源全复用既有取数层（photo/photos.ts），不自算：
 * 身材照 wizard 纯配置（老家 render_body_photo_log_wizard.py 无数据源）不读库；
 * GIF 框选＝listPhotos(tag/365 天窗）＋ toCard 文件名引用＋存在位（T10 二进制铁则，
 * 永不 base64 内嵌；cropper.js 不引入，沿老家 v2.3.5 手动 4 数字坐标）。
 * 空库一律不抛（场景 1 空 wizard 照开；recent 记 null）。
 *
 * prompt 复刻口径（旧模板 buildPrompt/generatePrompt 逐字结构，新 CLI 形态）：
 * 围度／体脂＝参数式（老家即无命令段，复制给 AI 后由 AI 调写键）；
 * 身材照／GIF＝参数＋命令段（老家 python 命令译为 calorie-cmd-read 同形；
 * photo.gif 无 photoIds/crops 形参，框选与裁剪落参数段由 AI 承接）。
 * 预填 params 键名与写键同形（MEASURE_CAMEL／CALIPER_FIELDS／photo.add 口径），
 * 未知字段 fail(2)（与 cli/write.ts 同字面「不支持字段: 」，防拼写漂移）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { listPhotos } from './photos.js';
import { toCard } from './photo.js';
import { CalorieRenderError } from '../render/errors.js';

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertISO(v: string, field: string): void {
  if (!ISO_RE.test(v) || Number.isNaN(Date.parse(v + 'T12:00:00Z'))) {
    throw new CalorieRenderError('bad-input', field + ' 非法（须 YYYY-MM-DD）：' + v);
  }
}

function numOrUndef(raw: unknown, field: string): number | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) throw new CalorieRenderError('bad-input', '参数 ' + field + ' 须为 number：' + String(raw));
  return n;
}

function strOrUndef(raw: unknown, field: string): string | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') throw new CalorieRenderError('bad-input', '参数 ' + field + ' 须为字符串');
  const s = raw.trim();
  return s === '' ? undefined : s;
}

/* ── 身体两页已迁出（#353）：记围度／记体脂的视图与 prompt 原样迁入 src/body/wizardPlate.ts，本件只留身材照／GIF。 */

/* ── 3. 记身材照 wizard（body_photo_log_wizard.html 复刻，纯配置不读库） ── */

export const PHOTO_LOG_TAGS = ['正面', '背面', '侧面', '正面自然光', '正面灯光', '手臂', '腹部', '腿部'];

export interface PhotoLogWizardView {
  srcPaths: string[];
  tag: string | null;
  note: string | null;
  prompt: string;
}

function normSrcPaths(raw: unknown): string[] {
  if (raw === undefined || raw === null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: string[] = [];
  for (const s of arr) {
    if (typeof s !== 'string' || s.trim() === '') {
      throw new CalorieRenderError('bad-input', '参数 srcPaths 须为照片路径字符串数组');
    }
    out.push(s.trim());
  }
  if (out.length > 20) throw new CalorieRenderError('bad-input', 'srcPaths 至多 20 张');
  return out;
}

export function buildPhotoLogWizardPrompt(srcPaths: string[], tag: string | null, note: string | null): string {
  // #474：两处缺项占位句去参数名、说人话（用户看不出 `srcPaths`／`tag` 指的是哪一栏）。
  if (srcPaths.length === 0) return '// 还没填照片路径：把照片的完整路径粘到上面那一栏（最多 20 张）';
  if (!tag) return '// 还没填标签：从上面的常用标签里点一个（同一类照片用同一个）';
  const files = srcPaths.map((f) => '"' + f + '"').join(' ');
  const params = { srcPaths, tag, ...(note ? { note } : {}) };
  return '请帮我记录 ' + srcPaths.length + ' 张身材照到卡路里\n\n参数:\n- 照片文件:' + files +
    '\n- tag:' + tag + (note ? '\n- 备注:' + note : '') +
    '\n\n命令:\n```bash\ncalorie-cmd-read calorie.photo.add --params \'' + JSON.stringify(params) + '\'\n```\n\n完成后返回写库回执。';
}

export function buildPhotoLogWizardView(raw: Record<string, unknown>): PhotoLogWizardView {
  const allowed = new Set(['srcPaths', 'srcPath', 'tag', 'note', 'key']);
  for (const k of Object.keys(raw)) {
    if (!allowed.has(k)) throw new CalorieRenderError('bad-input', '不支持字段: ' + k);
  }
  const srcPaths = normSrcPaths(raw['srcPaths'] ?? raw['srcPath']);
  const tagRaw = strOrUndef(raw['tag'], 'tag');
  if (tagRaw !== undefined && tagRaw.length > 20) throw new CalorieRenderError('bad-input', '参数 tag 至多 20 字符');
  const tag = tagRaw ?? null;
  const note = strOrUndef(raw['note'], 'note') ?? null;
  return { srcPaths, tag, note, prompt: buildPhotoLogWizardPrompt(srcPaths, tag, note) };
}

/* ── 4. GIF 框选器（body_photo_gif_planner.html 复刻，无 cropper.js） ── */

/** 过渡效果的中文词（#474）：表单下拉的 `option` 文本与 prompt 里的「- 过渡:」共用这一份，
 *  两处不许走散；**机器值仍是 `cut/fade/dissolve`**（命令段与校验口径一字未改）。 */
export function transitionText(transition: string): string {
  const map: Record<string, string> = { cut: '硬切', fade: '淡入淡出', dissolve: '溶解' };
  return map[transition] ?? transition;
}

export interface GifPlannerPhoto {
  id: number;
  date: string;
  tagList: string[];
  photoPath: string;
  fileExists: boolean | null;
  selected: boolean;
  crop: [number, number, number, number] | null;
}

export interface GifPlannerView {
  tag: string | null;
  photos: GifPlannerPhoto[];
  selectedIds: number[];
  missingIds: number[];
  duration: number;
  loop: number;
  width: number;
  height: number;
  watermark: string | null;
  transition: string;
  output: string | null;
  prompt: string;
}

function normIdList(raw: unknown, field: string): number[] {
  if (raw === undefined || raw === null) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(',').map((s) => s.trim()).filter(Boolean);
  const out: number[] = [];
  for (const v of arr) {
    const n = typeof v === 'number' ? v : Number(String(v).trim());
    if (!Number.isInteger(n) || n <= 0) throw new CalorieRenderError('bad-input', '参数 ' + field + ' 须为正整数 id 数组');
    out.push(n);
  }
  return out;
}

function normCrops(raw: unknown): Record<string, [number, number, number, number]> {
  if (raw === undefined || raw === null || raw === '') return {};
  let obj: Record<string, unknown>;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw) as Record<string, unknown>; }
    catch { throw new CalorieRenderError('bad-input', '参数 crops 须为 JSON 对象 {id:[x1,y1,x2,y2]}'); }
  } else if (typeof raw === 'object' && !Array.isArray(raw)) {
    obj = raw as Record<string, unknown>;
  } else {
    throw new CalorieRenderError('bad-input', '参数 crops 须为 JSON 对象 {id:[x1,y1,x2,y2]}');
  }
  const out: Record<string, [number, number, number, number]> = {};
  for (const [id, box] of Object.entries(obj)) {
    if (!Array.isArray(box) || box.length !== 4 || !box.every((n) => typeof n === 'number' && Number.isFinite(n))) {
      throw new CalorieRenderError('bad-input', '参数 crops[' + id + '] 须为 [x1,y1,x2,y2] 四数字');
    }
    const [x1, y1, x2, y2] = box as number[];
    if (!(x2 as number > (x1 as number) && (y2 as number) > (y1 as number))) {
      throw new CalorieRenderError('bad-input', '参数 crops[' + id + '] 须满足 x2>x1 且 y2>y1');
    }
    out[id] = [x1 as number, y1 as number, x2 as number, y2 as number];
  }
  return out;
}

export function buildGifPlannerPrompt(v: {
  selectedIds: number[]; crops: Record<string, [number, number, number, number]>;
  duration: number; loop: number; width: number; height: number;
  watermark: string | null; transition: string; output: string | null; tag: string | null;
}): string {
  if (v.selectedIds.length === 0) return '// 未选中任何照片（先按 tag 列出，再给 photoIds 框选）';
  const lines: string[] = [];
  lines.push('请帮我生成身材变化 GIF');
  lines.push('');
  lines.push('参数:');
  lines.push('- 已选 ' + v.selectedIds.length + ' 张(按顺序):ID = ' + v.selectedIds.join(' '));
  const cropIds = v.selectedIds.filter((id) => v.crops[String(id)]);
  if (cropIds.length > 0) {
    lines.push('- 裁剪(每张单独):');
    for (const id of cropIds) {
      const [x1, y1, x2, y2] = v.crops[String(id)] as [number, number, number, number];
      lines.push('    ' + id + ': (' + x1 + ', ' + y1 + ') ' + (x2 - x1) + '×' + (y2 - y1) + ' → 即 (' + x1 + ', ' + y1 + ', ' + x2 + ', ' + y2 + ')');
    }
  } else {
    lines.push('- 裁剪:无(整图)');
  }
  lines.push('- 速度:' + v.duration + 'ms/帧');
  lines.push('- 循环:' + (v.loop === 0 ? '无限循环' : v.loop + ' 次循环'));
  lines.push('- 尺寸:' + v.width + '×' + v.height);
  if (v.watermark) lines.push('- 水印:"' + v.watermark + '"');
  // #474（审查整改 2）·「指令与下拉用同一个词」：这里落**下拉选项文本**（硬切／淡入淡出／溶解），
  //  与表单所见同一份词（`transitionText` 是两处唯一的措辞出处）。
  //  机器面一字未改：命令段 `--params` 与表单 `option value` 仍是 `cut`／`fade`／`dissolve`——
  //  参数字符串才是程序读的那面，`- 过渡:` 这行是给读者看的。
  lines.push('- 过渡:' + transitionText(v.transition));
  if (v.output) lines.push('- 输出:' + v.output);
  lines.push('');
  lines.push('命令:');
  lines.push('```bash');
  const gifParams: Record<string, unknown> = { tag: v.tag ?? '正面' };
  lines.push('calorie-cmd-read calorie.photo.gif --params \'' + JSON.stringify(gifParams) + '\'');
  lines.push('```');
  lines.push('');
  lines.push('完成后用浏览器打开生成的 GIF 文件让用户确认。');
  return lines.join('\n');
}

export function buildGifPlannerView(
  db: DatabaseSync, raw: Record<string, unknown>, photosDir?: string | null,
): GifPlannerView {
  const allowed = new Set([
    'tag', 'start', 'end', 'days', 'photoIds', 'ids', 'crops',
    'duration', 'loop', 'width', 'height', 'watermark', 'transition', 'output', 'photosDir', 'key',
  ]);
  for (const k of Object.keys(raw)) {
    if (!allowed.has(k)) throw new CalorieRenderError('bad-input', '不支持字段: ' + k);
  }
  const tag = strOrUndef(raw['tag'], 'tag') ?? null;
  const start = strOrUndef(raw['start'], 'start');
  if (start !== undefined) assertISO(start, 'start');
  const end = strOrUndef(raw['end'], 'end');
  if (end !== undefined) assertISO(end, 'end');
  if (start !== undefined && end !== undefined && start > end) {
    throw new CalorieRenderError('bad-input', 'start 不得晚于 end');
  }
  const daysRaw = numOrUndef(raw['days'], 'days');
  const days = daysRaw === undefined ? 365 : Math.trunc(daysRaw);
  if (!Number.isInteger(days) || days < 1 || days > 36500) throw new CalorieRenderError('bad-input', 'days 须为 1..36500 整数');
  const durationRaw = numOrUndef(raw['duration'], 'duration');
  const duration = durationRaw === undefined ? 500 : Math.trunc(durationRaw);
  if (duration < 50 || duration > 5000) throw new CalorieRenderError('bad-input', 'duration 须为 50..5000 毫秒');
  const loopRaw = numOrUndef(raw['loop'], 'loop');
  const loop = loopRaw === undefined ? 0 : Math.trunc(loopRaw);
  if (![0, 1, 3, 5].includes(loop)) throw new CalorieRenderError('bad-input', 'loop 须为 0/1/3/5（0=无限）');
  const widthRaw = numOrUndef(raw['width'], 'width');
  const width = widthRaw === undefined ? 400 : Math.trunc(widthRaw);
  if (width < 100 || width > 2000) throw new CalorieRenderError('bad-input', 'width 须为 100..2000 像素');
  const heightRaw = numOrUndef(raw['height'], 'height');
  const height = heightRaw === undefined ? 600 : Math.trunc(heightRaw);
  if (height < 100 || height > 2000) throw new CalorieRenderError('bad-input', 'height 须为 100..2000 像素');
  const watermark = strOrUndef(raw['watermark'], 'watermark') ?? null;
  const transition = strOrUndef(raw['transition'], 'transition') ?? 'cut';
  if (!['cut', 'fade', 'dissolve'].includes(transition)) {
    throw new CalorieRenderError('bad-input', 'transition 须为 cut/fade/dissolve');
  }
  const output = strOrUndef(raw['output'], 'output') ?? null;
  const crops = normCrops(raw['crops']);
  const wanted = normIdList(raw['photoIds'] ?? raw['ids'], 'photoIds');
  const rows = listPhotos(db, {
    ...(tag ? { tag } : {}),
    ...(start !== undefined || end !== undefined ? { dateFrom: start ?? null, dateTo: end ?? null } : { days }),
    limit: 100,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const photos: GifPlannerPhoto[] = rows.map((r) => {
    const card = toCard(r, photosDir ?? null);
    const crop = crops[String(r.id)] ?? null;
    return {
      id: r.id, date: r.date, tagList: [...r.tag_list], photoPath: card.photoPath,
      fileExists: card.fileExists, selected: wanted.length === 0 ? true : wanted.includes(r.id), crop,
    };
  });
  const missingIds = wanted.filter((id) => !byId.has(id));
  const selectedIds = photos.filter((p) => p.selected).map((p) => p.id);
  const view: GifPlannerView = {
    tag, photos, selectedIds, missingIds,
    duration, loop, width, height, watermark, transition, output, prompt: '',
  };
  view.prompt = buildGifPlannerPrompt({ selectedIds, crops, duration, loop, width, height, watermark, transition, output, tag });
  return view;
}
