/** #86 · wizard 4 页复刻（D1 verify 体验）render 数据＋ prompt 复刻。
 *
 * 点名（t71 §2 #4/#6/#11/#9；#52 明确不做、#54 新版已有不碰）：
 * 3 个配置型 wizard（记围度／记体脂／记身材照）＋ 1 个 GIF 框选器。
 * 形态＝静态 HTML ＋ copyText（B7 边界：B-09 表单零 JS，行为归宿主；
 * formPrompt／selectList／smartSelect 一律不用，复制走 Base P0 双通道）。
 *
 * 数据源全复用既有取数层（fetch/body.ts、fetch/photos.ts），不自算：
 * 围度 recent＝listMeasurements(limit 1)；体脂 recent＝listCompositions(limit 1)；
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
import { listCompositions, listMeasurements, CALIPER_FIELDS } from '../fetch/body.js';
import { listPhotos } from '../fetch/photos.js';
import { toCard } from './photo.js';
import { SOURCE_CHOICES, SOURCE_LABELS } from '../kcal.js';
import { todayISO } from '../analysis/utils.js';
import { CalorieRenderError } from './errors.js';

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

/** 写键 camel 口径镜像（cli/write.ts MEASURE_CAMEL；测试钉死键集一致）。 */
export const WIZARD_MEASURE_CAMEL: Record<string, string> = {
  chestCm: 'chest_cm', waistCm: 'waist_cm', abdomenCm: 'abdomen_cm', hipCm: 'hip_cm', shoulderCm: 'shoulder_cm',
  leftThighCm: 'left_thigh_cm', rightThighCm: 'right_thigh_cm', leftCalfCm: 'left_calf_cm', rightCalfCm: 'right_calf_cm',
  leftArmCm: 'left_arm_cm', rightArmCm: 'right_arm_cm', leftForearmCm: 'left_forearm_cm', rightForearmCm: 'right_forearm_cm',
};

export const WIZARD_MEASURE_LABELS: Record<string, string> = {
  chestCm: '胸围', waistCm: '腰围', abdomenCm: '腹围', hipCm: '臀围', shoulderCm: '肩围',
  leftThighCm: '左大腿', rightThighCm: '右大腿', leftCalfCm: '左小腿', rightCalfCm: '右小腿',
  leftArmCm: '左上臂', rightArmCm: '右上臂', leftForearmCm: '左前臂', rightForearmCm: '右前臂',
};

const MEASURE_UPPER = ['chestCm', 'waistCm', 'abdomenCm', 'hipCm', 'shoulderCm'];
const MEASURE_LOWER = ['leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm'];
const MEASURE_ARM = ['leftArmCm', 'rightArmCm', 'leftForearmCm', 'rightForearmCm'];
const MEASURE_ALL = [...MEASURE_UPPER, ...MEASURE_LOWER, ...MEASURE_ARM];

export const WIZARD_CALIPER_LABELS: Record<string, string> = {
  caliper_chest_mm: '胸', caliper_abdominal_mm: '腹', caliper_thigh_mm: '大腿',
  caliper_tricep_mm: '三头肌', caliper_subscapular_mm: '肩胛下',
  caliper_suprailiac_mm: '髂上', caliper_midaxillary_mm: '腋中线',
};

/** 中文来源别名（cli/write.ts SOURCE_ALIASES 同值，测试钉死）。 */
const SOURCE_ALIASES: Record<string, string> = {
  '家测皮褶钳': 'home_caliper', '医院测': 'hospital', '健身房测': 'gym',
  '健身房': 'gym', '医院': 'hospital', '皮褶钳': 'home_caliper',
};

function normSource(v: unknown): string | undefined {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  const s = String(v).trim();
  if ((SOURCE_CHOICES as readonly string[]).includes(s)) return s;
  const hit = SOURCE_ALIASES[s];
  if (hit) return hit;
  throw new CalorieRenderError('bad-input', '参数 source 非法（home_caliper/hospital/gym 或中文 家测皮褶钳/医院测/健身房测）：' + s);
}

/* ── 1. 记围度 wizard（body_measurements_wizard.html 复刻） ── */

export interface MeasureWizardView {
  date: string;
  note: string | null;
  filled: { camel: string; snake: string; label: string; value: number }[];
  filledCount: number;
  recent: { date: string; values: Record<string, number | null> } | null;
  prompt: string;
}

export function buildMeasureWizardPrompt(date: string, filled: MeasureWizardView['filled'], note: string | null): string {
  if (filled.length === 0) return '// 请至少填 1 个围度（13 项分 3 组，至少 1 项）';
  const byGroup = (group: string[], label: string): string => {
    const items = group
      .map((c) => filled.find((f) => f.camel === c))
      .filter((f): f is MeasureWizardView['filled'][number] => !!f);
    if (items.length === 0) return '';
    return '  ' + label + ': ' + items.map((f) => f.label + ' ' + f.value + 'cm').join(', ');
  };
  const groups = [byGroup(MEASURE_UPPER, '上身'), byGroup(MEASURE_LOWER, '下身'), byGroup(MEASURE_ARM, '手臂')].filter(Boolean).join('\n');
  return '请帮我记录围度到卡路里\n\n参数:\n- 日期:' + date + '\n- 围度(' + filled.length + ' 项 / 共 13):\n' + groups + (note ? '\n- 备注:' + note : '');
}

export function buildMeasureWizardView(db: DatabaseSync, raw: Record<string, unknown>): MeasureWizardView {
  for (const k of Object.keys(raw)) {
    if (!(k in WIZARD_MEASURE_CAMEL) && k !== 'date' && k !== 'note' && k !== 'key') {
      throw new CalorieRenderError('bad-input', '不支持字段: ' + k);
    }
  }
  const date = strOrUndef(raw['date'], 'date') ?? todayISO();
  assertISO(date, 'date');
  const note = strOrUndef(raw['note'], 'note') ?? null;
  const filled: MeasureWizardView['filled'] = [];
  for (const camel of MEASURE_ALL) {
    const v = numOrUndef(raw[camel], camel);
    if (v !== undefined) {
      filled.push({ camel, snake: WIZARD_MEASURE_CAMEL[camel] as string, label: WIZARD_MEASURE_LABELS[camel] as string, value: v });
    }
  }
  let recent: MeasureWizardView['recent'] = null;
  try {
    const rows = listMeasurements(db, { days: 36500, limit: 1 }) as Array<Record<string, unknown>>;
    if (rows.length > 0) {
      const r = rows[0] as Record<string, unknown>;
      const values: Record<string, number | null> = {};
      for (const camel of MEASURE_ALL) {
        const snake = WIZARD_MEASURE_CAMEL[camel] as string;
        const v = r[snake];
        values[camel] = typeof v === 'number' ? v : null;
      }
      recent = { date: String(r['date'] ?? ''), values };
    }
  } catch { recent = null; }
  return { date, note, filled, filledCount: filled.length, recent, prompt: buildMeasureWizardPrompt(date, filled, note) };
}

/* ── 2. 记体脂 wizard（body_composition_wizard.html 复刻） ── */

export interface CompositionWizardView {
  date: string;
  source: string | null;
  sourceLabel: string | null;
  bodyFatPct: number | null;
  age: number | null;
  sex: string | null;
  note: string | null;
  calipers: { field: string; label: string; value: number }[];
  sum7: number | null;
  recent: { date: string; bodyFatPct: number | null; source: string | null } | null;
  prompt: string;
}

export function buildCompositionWizardPrompt(v: {
  date: string; source: string | null; bodyFatPct: number | null;
  age: number | null; sex: string | null; note: string | null;
  calipers: { field: string; label: string; value: number }[];
}): string {
  if (!v.source) return '// 请选来源（上方第 1 步：home_caliper/hospital/gym）';
  if (v.bodyFatPct === null) return '// 请填体脂率（上方第 3 步；皮褶→体脂换算未移植，直传实测值）';
  if (!(v.bodyFatPct > 0 && v.bodyFatPct < 60)) return '// 体脂率需在 (0, 60)% 之间，当前 ' + v.bodyFatPct + '% 异常';
  const isCaliper = v.source === 'home_caliper';
  let textBody = '';
  if (isCaliper) {
    if (v.calipers.length < CALIPER_FIELDS.length) {
      const missing = CALIPER_FIELDS.filter((f) => !v.calipers.some((c) => c.field === f));
      return '// 还差 ' + missing.length + ' 项皮褶:' + missing.join(', ');
    }
    const bad = v.calipers.filter((c) => !(c.value > 0 && c.value < 100));
    if (bad.length > 0) return '// 皮褶值需在 (0, 100) mm 之间:' + bad.map((c) => c.field).join(', ') + ' 当前异常';
    const by = (f: string): number => (v.calipers.find((c) => c.field === f) as { value: number }).value;
    const sum7 = CALIPER_FIELDS.reduce((s, f) => s + by(f), 0);
    textBody = '- 7 处皮褶(mm):胸 ' + by('caliper_chest_mm') + ' / 腹 ' + by('caliper_abdominal_mm') +
      ' / 大腿 ' + by('caliper_thigh_mm') + ' / 三头肌 ' + by('caliper_tricep_mm') +
      ' / 肩胛下 ' + by('caliper_subscapular_mm') + ' / 髂上 ' + by('caliper_suprailiac_mm') +
      ' / 腋中线 ' + by('caliper_midaxillary_mm') + '\n- 7 处总和:' + (Math.round(sum7 * 10) / 10) + ' mm\n';
  }
  return '请帮我记一条' + (isCaliper ? '体脂钳测' : '外部测量') + '结果到卡路里\n\n参数:\n- 日期:' + v.date +
    '\n- 来源:' + v.source + (v.age !== null ? '\n- 年龄:' + v.age : '') +
    (v.sex ? '\n- 性别:' + (v.sex === 'male' ? '男' : '女') : '') + '\n' + textBody +
    '- 体脂率:' + v.bodyFatPct + '%' + (v.note ? '\n- 备注:' + v.note : '');
}

export function buildCompositionWizardView(db: DatabaseSync, raw: Record<string, unknown>): CompositionWizardView {
  const allowed = new Set(['date', 'source', 'bodyFatPct', 'age', 'sex', 'note', 'key', ...CALIPER_FIELDS]);
  for (const k of Object.keys(raw)) {
    if (!allowed.has(k)) throw new CalorieRenderError('bad-input', '不支持字段: ' + k);
  }
  const date = strOrUndef(raw['date'], 'date') ?? todayISO();
  assertISO(date, 'date');
  const source = normSource(raw['source']) ?? null;
  const bodyFatPct = numOrUndef(raw['bodyFatPct'], 'bodyFatPct') ?? null;
  const ageRaw = numOrUndef(raw['age'], 'age') ?? null;
  const age = ageRaw === null ? null : Math.trunc(ageRaw);
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) {
    throw new CalorieRenderError('bad-input', '参数 age 须为 1..120 整数');
  }
  let sex: string | null = null;
  const sexRaw = strOrUndef(raw['sex'], 'sex');
  if (sexRaw !== undefined) {
    if (sexRaw === 'male' || sexRaw === '男') sex = 'male';
    else if (sexRaw === 'female' || sexRaw === '女') sex = 'female';
    else throw new CalorieRenderError('bad-input', '参数 sex 非法（male/female 或 男/女）：' + sexRaw);
  }
  const note = strOrUndef(raw['note'], 'note') ?? null;
  const calipers: CompositionWizardView['calipers'] = [];
  for (const f of CALIPER_FIELDS) {
    const v = numOrUndef(raw[f], f);
    if (v !== undefined) calipers.push({ field: f, label: WIZARD_CALIPER_LABELS[f] as string, value: v });
  }
  const sum7 = calipers.length === CALIPER_FIELDS.length
    ? Math.round(calipers.reduce((s, c) => s + c.value, 0) * 10) / 10
    : null;
  let recent: CompositionWizardView['recent'] = null;
  try {
    const rows = listCompositions(db, { days: 36500, limit: 1 }) as Array<Record<string, unknown>>;
    if (rows.length > 0) {
      const r = rows[0] as Record<string, unknown>;
      recent = {
        date: String(r['date'] ?? ''),
        bodyFatPct: typeof r['body_fat_pct'] === 'number' ? (r['body_fat_pct'] as number) : null,
        source: typeof r['source'] === 'string' ? (r['source'] as string) : null,
      };
    }
  } catch { recent = null; }
  const sourceLabel = source ? ((SOURCE_LABELS as Record<string, string>)[source] ?? source) : null;
  const view: CompositionWizardView = {
    date, source, sourceLabel, bodyFatPct, age, sex, note, calipers, sum7, recent, prompt: '',
  };
  view.prompt = buildCompositionWizardPrompt(view);
  return view;
}

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
  if (srcPaths.length === 0) return '// 请先填照片文件路径（srcPaths，至多 20 张）';
  if (!tag) return '// 请填 tag（建议：正面/背面/侧面，同一类用同一 tag）';
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
  lines.push('- 循环:' + (v.loop === 0 ? '无限' : v.loop + ' 次'));
  lines.push('- 尺寸:' + v.width + '×' + v.height);
  if (v.watermark) lines.push('- 水印:"' + v.watermark + '"');
  lines.push('- 过渡:' + v.transition);
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
