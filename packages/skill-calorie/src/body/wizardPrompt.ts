/** #538 路 身体域两张预检确认页的**两段文本**（给人核对的那一段 ＋ 给 AI 的那一段）。
 *
 *  为什么另立一件：`wizardPlate.ts` 在本票整改里越过 350 行告警线（349→366）——它同时住着
 *  「取数／入参校验」（`build*WizardView`）与「两段文本的措辞」（预览清单、缺项清单、复制区那一段）。
 *  本票把**措辞面**整支搬进本件：`wizardPlate.ts` 只留取数与字段口径并薄转出（出口名与签名一字不变）。
 *
 *  两段文本各管一件事（#366 的裁定，本票不动这条分工）：
 *    ① `preview`＝折叠区里那一段**人眼核对清单**；
 *    ② `prompt`＝复制区里那一段：全合规时**就是一条能直接执行的写命令**，否则是缺项清单。
 *
 *  #538 措辞口径：并列的东西**一条一行**（不拿 `；`／`／`／`,` 串一行），内部叫法不上屏（负责人第 4／5 条）。
 */
import { CALIPER_FIELDS, MEASUREMENT_FIELDS, MEASUREMENT_ZH, measureCamelName } from '../fetch/body.js';
import { SOURCE_CHOICES, SOURCE_LABELS } from '../kcal.js';
import { GENDER_LABELS } from '../analysis/utils.js';
import { commandLine } from '../shared/writeParts.js';
import { BF_INPUT, CALIPER_INPUT, CALIPER_SOURCE, isCaliperMode } from './wizardPlate.js';
import { m } from '../entries/index.js';

/** 写命令 camel 口径镜像（围度 13 项；唯一来源＝`fetch/body.ts` 的列名与中文名表）。 */
export const WIZARD_MEASURE_CAMEL: Record<string, string> = Object.fromEntries(
  MEASUREMENT_FIELDS.map((f) => [measureCamelName(f), f]),
);

/** 部位中文名（同取唯一来源 `MEASUREMENT_ZH`）。 */
export const WIZARD_MEASURE_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(WIZARD_MEASURE_CAMEL).map(([camel, field]) => [camel, MEASUREMENT_ZH[field] ?? field]),
);

/* #1320 · 模块级取词违规（S1）修正：部位名是上屏标签，改 getter 在渲染期取词（与 wizardPlate 同一份文案、各自分节）。 */
export const WIZARD_CALIPER_LABELS: Record<string, string> = {
  get caliper_chest_mm(): string { return m('skill-calorie.body-wizardPrompt.c018'); },
  get caliper_abdominal_mm(): string { return m('skill-calorie.body-wizardPrompt.c019'); },
  get caliper_thigh_mm(): string { return m('skill-calorie.body-wizardPrompt.c020'); },
  get caliper_tricep_mm(): string { return m('skill-calorie.body-wizardPrompt.c021'); },
  get caliper_subscapular_mm(): string { return m('skill-calorie.body-wizardPrompt.c022'); },
  get caliper_suprailiac_mm(): string { return m('skill-calorie.body-wizardPrompt.c023'); },
  get caliper_midaxillary_mm(): string { return m('skill-calorie.body-wizardPrompt.c024'); },
};

const MEASURE_UPPER = ['chestCm', 'waistCm', 'abdomenCm', 'hipCm', 'shoulderCm'];
const MEASURE_LOWER = ['leftThighCm', 'rightThighCm', 'leftCalfCm', 'rightCalfCm'];
const MEASURE_ARM = ['leftArmCm', 'rightArmCm', 'leftForearmCm', 'rightForearmCm'];
const MEASURE_ALL = [...MEASURE_UPPER, ...MEASURE_LOWER, ...MEASURE_ARM];

/** 本页复制区那条写命令的键（事实源＝`body/commands.ts` 的 `BODY_COMMANDS`）。只引字面量，
 *  不反向 import：`commands.ts → wizard.ts → 本件` 会成环；t366 测试与注册表逐字对账。 */
export const WIZARD_WRITE_KEYS = { measure: 'calorie.body.measure-add', composition: 'calorie.body.composition-add' } as const;

/** 两页预览块里那句介绍：一句话说清「这段是给谁看的」。 */
const previewHead = (): string => m('skill-calorie.body-wizardPrompt.c017');

export type MeasureFilled = { camel: string; snake: string; label: string; value: number }[];

/** 给 AI 的那段话里的一条一行：`// - 甲`（#538 起不再拿 `；`／`／`／`,` 串一行）。 */
function checkLines(items: readonly string[]): string {
  return items.map((s) => '// - ' + s).join('\n');
}

function line(label: string, value: string): string {
  return '- ' + label + ':' + value;
}

/** 人眼核对清单（围度）：三组各一条一行。 */
export function buildMeasureWizardPreview(date: string, filled: MeasureFilled, note: string | null): string {
  const byGroup = (group: string[], label: string): string => {
    const items = group.map((c) => filled.find((f) => f.camel === c)).filter((f) => !!f) as MeasureFilled;
    if (items.length === 0) return '';
    return '\n- ' + label + ':\n' + checkLines(items.map((f) => f.label + ' ' + f.value + 'cm'));
  };
  const groups = [byGroup(MEASURE_UPPER, m('skill-calorie.body-wizardPrompt.c001')), byGroup(MEASURE_LOWER, m('skill-calorie.body-wizardPrompt.c002')), byGroup(MEASURE_ARM, m('skill-calorie.body-wizardPrompt.c003'))].join('');
  // 逐条标签直接写进句子（原先经 line() 拼：标签作为实参进了调用，整句就断成了两截）。
  return m('skill-calorie.body-wizardPrompt.c004', {
    p0: previewHead(),
    p1: String(date),
    p2: String(filled.length),
    p3: String(groups),
    p4: String(note ?? '—'),
  });
}

/** 复制区那一段（围度）：填了至少 1 项 → 一条能直接执行的写命令；一项没填 → 缺项清单句。 */
export function buildMeasureWizardPrompt(date: string, filled: MeasureFilled, note: string | null): string {
  if (filled.length === 0) return m('skill-calorie.body-wizardPrompt.c005');
  const params: Record<string, unknown> = { date };
  for (const camel of MEASURE_ALL) {
    const hit = filled.find((f) => f.camel === camel);
    if (hit) params[camel] = hit.value;
  }
  if (note) params['note'] = note;
  return commandLine(WIZARD_WRITE_KEYS.measure, params);
}

/** 缺项／越界清单（体脂）：每条里并列的东西一条一行；全合规时返回空串。 */
function compositionChecklist(v: {
  source: string | null; sourceGiven: boolean; bodyFatPct: number | null;
  age: number | null; sex: string | null;
  calipers: { field: string; value: number }[];
}): string {
  if (!v.sourceGiven) {
    return m('skill-calorie.body-wizardPrompt.c006', {
      p0: String(SOURCE_LABELS[CALIPER_SOURCE]),
      p1: String(checkLines(SOURCE_CHOICES.map((s) => SOURCE_LABELS[s]))),
    });
  }
  const bad = v.calipers.filter((c) => !(c.value > CALIPER_INPUT.min && c.value < CALIPER_INPUT.max));
  if (isCaliperMode(v.source)) {
    const missing = CALIPER_FIELDS.filter((f) => !v.calipers.some((c) => c.field === f));
    if (missing.length > 0) {
      return m('skill-calorie.body-wizardPrompt.c007', {
        p0: String(missing.length),
        p1: String(checkLines(missing.map((f) => WIZARD_CALIPER_LABELS[f] ?? f))),
      });
    }
    if (bad.length > 0) {
      return m('skill-calorie.body-wizardPrompt.c008', {
        p0: String(CALIPER_INPUT.min),
        p1: String(CALIPER_INPUT.max),
        p2: String(checkLines(bad.map((c) => WIZARD_CALIPER_LABELS[c.field] ?? c.field))),
      });
    }
    if (v.age === null || !v.sex) {
      // 这两条提示项是文案（不是数据）：写进句子，别再过 checkLines 的实参。
      return m('skill-calorie.body-wizardPrompt.c009');
    }
    return '';
  }
  if (v.bodyFatPct === null) return m('skill-calorie.body-wizardPrompt.c010');
  if (!(v.bodyFatPct > BF_INPUT.min && v.bodyFatPct < BF_INPUT.max)) {
    return m('skill-calorie.body-wizardPrompt.c011', {
      p0: String(BF_INPUT.min),
      p1: String(BF_INPUT.max),
      p2: String(v.bodyFatPct),
    });
  }  if (bad.length > 0) {
    return m('skill-calorie.body-wizardPrompt.c012', {
      p0: String(CALIPER_INPUT.min),
      p1: String(CALIPER_INPUT.max),
      p2: String(checkLines(bad.map((c) => WIZARD_CALIPER_LABELS[c.field] ?? c.field))),
    });
  }
  return '';
}

/** 人眼核对清单（体脂）：7 处皮褶一条一行；来源印中文名。 */
export function buildCompositionWizardPreview(v: {
  date: string; source: string | null; bodyFatPct: number | null;
  age: number | null; sex: string | null; note: string | null;
  calipers: { field: string; label: string; value: number }[];
}): string {
  const isCaliper = isCaliperMode(v.source);
  const srcLabel = v.source === null ? '—' : (SOURCE_LABELS as Record<string, string>)[v.source] ?? v.source;
  let textBody = '';
  if (isCaliper && v.calipers.length === CALIPER_FIELDS.length) {
    const by = (f: string): number => (v.calipers.find((c) => c.field === f) as { value: number }).value;
    const sum7 = CALIPER_FIELDS.reduce((s, f) => s + by(f), 0);
    // 7 处一条一行（中文冒号，不用半角 `:`）；总和另起一条。
    textBody = m('skill-calorie.body-wizardPrompt.c013', {
      p0: String(checkLines(CALIPER_FIELDS.map((f) => (WIZARD_CALIPER_LABELS[f] as string) + ' ' + by(f)))),
      p1: String(Math.round(sum7 * 10) / 10),
    });
  }
  const modeWord = (isCaliper ? m('skill-calorie.body-wizardPrompt.c014') : m('skill-calorie.body-wizardPrompt.c015'));
  return m('skill-calorie.body-wizardPrompt.c016', {
    p0: previewHead() + modeWord,
    p1: String(v.date),
    p2: String(srcLabel),
    p3: String(v.age === null ? '—' : String(v.age)),
    p4: String(v.sex ? (GENDER_LABELS[v.sex] ?? v.sex) : '—'),
    p5: String(textBody),
    p6: String(v.bodyFatPct === null ? '—' : v.bodyFatPct + '%'),
    p7: String(v.note ?? '—'),
  });
}

/** 复制区那一段（体脂）：全合规 → 一条能直接执行的写命令；否则 → 缺项／越界清单。
 *  皮褶钳模式下 `bodyFatPct` **不进命令**（裁定 1：由命令按 7 点换算）。 */
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
