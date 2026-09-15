/** #353 · 身体域预检确认页取数（记围度／记体脂两页）：
 * 自 `render/wizardPort.ts` **原样迁入**能力目录 `src/body/`（归属律：只属身体的东西住身体目录）。
 * 身材照／GIF 两页仍住 `render/wizardPort.ts`，本件不碰。
 *
 * 数据源全复用既有取数层（fetch/body.ts），不自算：
 * 围度 recent＝listMeasurements(limit 1)；体脂 recent＝listCompositions(limit 1)。
 * 空库一律不抛（场景 1 空预检确认页照开；recent 记 null）。
 *
 * 预填 params 键名与写命令同形（MEASURE_CAMEL／CALIPER_FIELDS 口径），
 * 未知字段 fail(2)（与 cli/write.ts 同字面「不支持字段: 」，防拼写漂移）。
 *
 * **#366 · 复制—执行闭环**：页面上那两段文本分开住，各管一件事——
 *   ① `prompt`＝**复制区**那一段：全合规时**就是一条能直接执行的写命令**（`calorie-cmd-read <写键>
 *      --params '<JSON>'`，走 `shared/writeParts.ts:commandLine` 同一产出者）；缺项／越界时仍是老正本
 *      的**缺项清单注释串**（`// …`，`body_composition_wizard.html:487-524`）——宁可不给命令，不给跑不通的命令。
 *   ② `preview`＝**人眼核对**的参数清单（老正本 `#promptBox` 的老 prose 形态），住表单预览位，不参与复制。
 * 输入口径（裁定 3）与模式判定（裁定 1）：`CALIPER_INPUT`／`BF_INPUT`／`MEASURE_STEP` 是提示文案与校验
 * 文案的**同一处来源**，`isCaliperMode` 决定体脂率只读与否。
 */
import type { DatabaseSync } from 'node:sqlite';
import { listCompositions, listMeasurements, BODY_FAT_PCT_MAX, BODY_FAT_PCT_MIN, CALIPER_FIELDS, CALIPER_MAX_MM, CALIPER_MIN_MM, MEASUREMENT_BOUNDS, MEASUREMENT_FIELDS, MEASUREMENT_ZH, measureCamelName } from '../fetch/body.js';
import { SOURCE_CHOICES, SOURCE_LABELS } from '../kcal.js';
import { GENDER_LABELS, todayISO } from '../analysis/utils.js';
import { CalorieRenderError } from '../render/errors.js';
import { commandLine } from '../shared/writeParts.js';
import { jp7BodyFatPct } from './log.js';
import * as prompt from './wizardPrompt.js';

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

/* ── 0. 预检页的输入口径与复制区口径（#366：裁定 1 只读／裁定 3 单位与精度） ── */

/** 本页复制区那条写命令的键（事实源＝`body/commands.ts` 的 `BODY_COMMANDS`）。只引字面量，
 *  不反向 import：`commands.ts → wizard.ts → 本件` 会成环；t366 测试与注册表逐字对账。 */
export const WIZARD_WRITE_KEYS = { measure: 'calorie.body.measure-add', composition: 'calorie.body.composition-add' } as const;

/** 皮褶 7 点输入口径（裁定 3：老正本 `body_composition_wizard.html:300-329`）。 */
export const CALIPER_INPUT = { step: '0.1', min: CALIPER_MIN_MM, max: CALIPER_MAX_MM } as const;
/** 体脂率输入口径（裁定 3：老正本 `body_composition_wizard.html:346`）。 */
export const BF_INPUT = { step: '0.01', min: BODY_FAT_PCT_MIN, max: BODY_FAT_PCT_MAX } as const;
/** 围度 13 项步长（老正本 `body_measurements_wizard.html:181-253` 逐项 `step="0.1"`）；
 *  逐部位区间取 `fetch/body.ts` 的 `MEASUREMENT_BOUNDS`（唯一来源），不在本件手抄第二份。 */
export const MEASURE_STEP = '0.1';

/** 皮褶 7 点范围句：**提示与校验同一句**（票面要消掉同页两套口径；数值以裁定 3 的 `min／max` 为准，
 *  结论与 `fetch/body.ts` 的 `CALIPER_MIN_MM < v < CALIPER_MAX_MM` 一致）。 */
export function caliperRangeText(): string { return '(' + CALIPER_INPUT.min + ', ' + CALIPER_INPUT.max + ') mm'; }

/** 体脂率范围句：同上（老正本 `:499` 与 `fetch/body.ts` 的 `(0, 60)` 同结论）。 */
export function bfRangeText(): string { return '(' + BF_INPUT.min + ', ' + BF_INPUT.max + ')%'; }

/** 围度某一位的区间句（**闭区间**，与命令层 `validateMeasurementInput` 的 `lo <= v <= hi` 同结论）。 */
export function measureRangeText(field: string): string {
  const b = MEASUREMENT_BOUNDS[field] as [number, number];
  return b[0] + '–' + b[1] + ' cm';
}
/** 未给 `source` 时页面按哪一支打开：照老正本下拉默认项（家测皮褶钳 `body_composition_wizard.html:270`）。 */
export const CALIPER_SOURCE = 'home_caliper';
/** 皮褶钳模式？（裁定 1：这一支的体脂率只读、由命令按 7 点换算） */
export function isCaliperMode(source: string | null): boolean { return (source ?? CALIPER_SOURCE) === CALIPER_SOURCE; }

/** 皮褶钳模式的体脂率**预演值**：页面显示的就是命令将算出的那一个（算式同源 `body/log.ts`）；
 *  7 点／年龄／性别任一缺位即 `null`（不拿半份数据凑数）。 */
export function previewBodyFatPct(calipers: { field: string; value: number }[], age: number | null, sex: string | null): number | null {
  return age === null || !sex || calipers.length !== CALIPER_FIELDS.length
    ? null
    : jp7BodyFatPct(calipers.reduce((s, c) => s + c.value, 0), age, sex);
}

/* ── 1. 记围度预检确认页（body_measurements_wizard.html 复刻） ── */

export interface MeasureWizardView {
  date: string;
  note: string | null;
  filled: { camel: string; snake: string; label: string; value: number }[];
  filledCount: number;
  recent: { date: string; values: Record<string, number | null> } | null;
  /** 复制区里那一段：全合规时＝可直接执行的写命令，缺项时＝缺项清单注释串（老正本 `:322-323`）。 */
  prompt: string;
  /** 人眼核对的参数清单（老正本 `#promptBox` 的老 prose 形态；不参与复制）。 */
  preview: string;
}

/** 围度那两段文本件（核对清单 ＋ 复制区那一段）同住姊妹件 `wizardPrompt.ts`，出口经本件薄转出。 */
export { buildMeasureWizardPreview, buildMeasureWizardPrompt } from './wizardPrompt.js';
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
  return {
    date, note, filled, filledCount: filled.length, recent,
    prompt: prompt.buildMeasureWizardPrompt(date, filled, note),
    preview: prompt.buildMeasureWizardPreview(date, filled, note),
  };
}

/* ── 2. 记体脂预检确认页（body_composition_wizard.html 复刻） ── */

export interface CompositionWizardView {
  date: string;
  source: string | null;
  /** `--params` 里到底给没给 `source`（页面缺省按皮褶钳打开，但复制区仍要先请人确认来源）。 */
  sourceGiven: boolean;
  sourceLabel: string | null;
  bodyFatPct: number | null;
  age: number | null;
  sex: string | null;
  note: string | null;
  calipers: { field: string; label: string; value: number }[];
  sum7: number | null;
  /** 皮褶钳模式下的换算预演（7 点／年龄／性别全齐才算得出，否则 `null`）。 */
  previewBodyFatPct: number | null;
  recent: { date: string; bodyFatPct: number | null; source: string | null } | null;
  /** 复制区那一段：全合规时＝可直接执行的写命令，否则＝缺项清单注释串（老正本 `:487-524`）。 */
  prompt: string;
  /** 人眼核对的参数清单（老正本 `#promptBox` 的老 prose 形态；不参与复制）。 */
  preview: string;
}

/** 缺项／越界清单（老正本 `body_composition_wizard.html:487-524` 四句：`:489` 缺来源、`:511` 缺项、
 *  `:513` 越界、`:499` 体脂率区间），另补 `#358` 交棒的「缺年龄／性别先问」那一句。
 *  **全合规时返回空串** —— 那时复制区放的是一条能直接跑的写命令。 */
function compositionChecklist(v: {
  source: string | null; sourceGiven: boolean; bodyFatPct: number | null;
  age: number | null; sex: string | null;
  calipers: { field: string; value: number }[];
}): string {
  if (!v.sourceGiven) {
    return '// 请选来源（本页按默认「' + SOURCE_LABELS[CALIPER_SOURCE] + '」打开；可给：'
      + SOURCE_CHOICES.map((s) => SOURCE_LABELS[s]).join('／') + '）';
  }
  const bad = v.calipers.filter((c) => !(c.value > CALIPER_INPUT.min && c.value < CALIPER_INPUT.max));
  if (isCaliperMode(v.source)) {
    const missing = CALIPER_FIELDS.filter((f) => !v.calipers.some((c) => c.field === f));
    if (missing.length > 0) return '// 还差 ' + missing.length + ' 项皮褶:' + missing.join(', ');
    if (bad.length > 0) return '// 皮褶值需在 ' + caliperRangeText() + ' 之间:' + bad.map((c) => c.field).join(', ') + ' 当前异常';
    if (v.age === null || !v.sex) {
      return '// 皮褶→体脂换算要用年龄和性别：先问用户补齐（上方第 1 步的 年龄／性别，不许猜默认值）';
    }
    return '';
  }
  if (v.bodyFatPct === null) return '// 请填体脂率（上方第 3 步；外部设备读数直传）';
  if (!(v.bodyFatPct > BF_INPUT.min && v.bodyFatPct < BF_INPUT.max)) {
    return '// 体脂率需在 ' + bfRangeText() + ' 之间，当前 ' + v.bodyFatPct + '% 异常';
  }
  if (bad.length > 0) return '// 皮褶值需在 ' + caliperRangeText() + ' 之间:' + bad.map((c) => c.field).join(', ') + ' 当前异常';
  return '';
}

/** 人眼核对清单（老正本 `:518-523` 的老 prose 形态，缺值写 `—`）。 */
export function buildCompositionWizardPreview(v: {
  date: string; source: string | null; bodyFatPct: number | null;
  age: number | null; sex: string | null; note: string | null;
  calipers: { field: string; label: string; value: number }[];
}): string {
  const isCaliper = isCaliperMode(v.source);
  let textBody = '';
  if (isCaliper && v.calipers.length === CALIPER_FIELDS.length) {
    const by = (f: string): number => (v.calipers.find((c) => c.field === f) as { value: number }).value;
    const sum7 = CALIPER_FIELDS.reduce((s, f) => s + by(f), 0);
    textBody = '- 7 处皮褶(mm):胸 ' + by('caliper_chest_mm') + ' / 腹 ' + by('caliper_abdominal_mm') +
      ' / 大腿 ' + by('caliper_thigh_mm') + ' / 三头肌 ' + by('caliper_tricep_mm') +
      ' / 肩胛下 ' + by('caliper_subscapular_mm') + ' / 髂上 ' + by('caliper_suprailiac_mm') +
      ' / 腋中线 ' + by('caliper_midaxillary_mm') + '\n- 7 处总和:' + (Math.round(sum7 * 10) / 10) + ' mm\n';
  }
  return '请帮我记一条' + (isCaliper ? '体脂钳测' : '外部测量') + '结果到卡路里\n\n参数:\n- 日期:' + v.date +
    '\n- 来源:' + (v.source ?? '—') + '\n- 年龄:' + (v.age === null ? '—' : v.age) +
    '\n- 性别:' + (v.sex ? (GENDER_LABELS[v.sex] ?? v.sex) : '—') + '\n' + textBody +
    '- 体脂率:' + (v.bodyFatPct === null ? '—' : v.bodyFatPct + '%') + '\n- 备注:' + (v.note ?? '—');
}

/** 复制区那一段（#366）：全合规 → **一条能直接执行的写命令**；否则 → 缺项／越界清单注释串。
 *  皮褶钳模式下 `bodyFatPct` **不进命令**（裁定 1：由命令按 7 点换算，命令行直传路径另说）。 */
export function buildCompositionWizardPrompt(v: {
  date: string; source: string | null; sourceGiven: boolean; bodyFatPct: number | null;
  age: number | null; sex: string | null; note: string | null;
  calipers: { field: string; label: string; value: number }[];
}): string {
  const ask = compositionChecklist(v);
  if (ask !== '') return ask;
  const params: Record<string, unknown> = { date: v.date, source: v.source as string };
  if (v.age !== null) params['age'] = v.age;
  if (v.sex) params['sex'] = v.sex;
  if (!isCaliperMode(v.source)) params['bodyFatPct'] = v.bodyFatPct as number;
  for (const f of CALIPER_FIELDS) {
    const hit = v.calipers.find((c) => c.field === f);
    if (hit) params[f] = hit.value;
  }
  if (v.note) params['note'] = v.note;
  return commandLine(WIZARD_WRITE_KEYS.composition, params);
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
  const head = { date, source, sourceGiven: source !== null, bodyFatPct, age, sex, note, calipers };
  return {
    ...head, sourceLabel, sum7, recent,
    previewBodyFatPct: isCaliperMode(source) ? previewBodyFatPct(calipers, age, sex) : null,
    prompt: prompt.buildCompositionWizardPrompt(head),
    preview: prompt.buildCompositionWizardPreview(head),
  };
}
