/** #353 · 身体域预检确认页取数（记围度／记体脂两页）：
 * 自 `render/wizardPort.ts` **原样迁入**能力目录 `src/body/`（归属律：只属身体的东西住身体目录）。
 * 身材照／GIF 两页仍住 `render/wizardPort.ts`，本件不碰。
 *
 * 数据源全复用既有取数层（fetch/body.ts），不自算：
 * 围度 recent＝listMeasurements(limit 1)；体脂 recent＝listCompositions(limit 1)。
 * 空库一律不抛（场景 1 空预检确认页照开；recent 记 null）。
 *
 * prompt 复刻口径（旧模板 buildPrompt/generatePrompt 逐字结构，新命令形态）：
 * 围度／体脂＝参数式（老家即无命令段，复制给 AI 后由 AI 调写命令）；
 * 预填 params 键名与写命令同形（MEASURE_CAMEL／CALIPER_FIELDS 口径），
 * 未知字段 fail(2)（与 cli/write.ts 同字面「不支持字段: 」，防拼写漂移）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { listCompositions, listMeasurements, CALIPER_FIELDS, MEASUREMENT_FIELDS, MEASUREMENT_ZH, measureCamelName } from '../fetch/body.js';
import { SOURCE_CHOICES, SOURCE_LABELS } from '../kcal.js';
import { GENDER_LABELS, todayISO } from '../analysis/utils.js';
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

/** 写命令 camel 口径镜像（cli/write.ts 的围度参数名；测试钉死键集一致）：
 *  #440 起由 `fetch/body.ts` 唯一来源换算（`MEASUREMENT_FIELDS` ＋ `measureCamelName`），不再手抄第二份键表。 */
export const WIZARD_MEASURE_CAMEL: Record<string, string> = Object.fromEntries(
  MEASUREMENT_FIELDS.map((f) => [measureCamelName(f), f]),
);

/** 部位中文名：#440 起同取唯一来源 `MEASUREMENT_ZH`（旧版是本件自持的一份 camel 键名表）。 */
export const WIZARD_MEASURE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(WIZARD_MEASURE_CAMEL).map(([camel, field]) => [camel, MEASUREMENT_ZH[field] ?? field]),
);

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

/* ── 1. 记围度预检确认页（body_measurements_wizard.html 复刻） ── */

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

/* ── 2. 记体脂预检确认页（body_composition_wizard.html 复刻） ── */

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
    (v.sex ? '\n- 性别:' + (GENDER_LABELS[v.sex] ?? v.sex) : '') + '\n' + textBody +
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
