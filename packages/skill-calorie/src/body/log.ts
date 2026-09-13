/** 记身体细节（HELP 一级分组「身体细节」下一级）：记体脂 ＋ 记围度两条写命令。
 *
 * 本文件是这两条命令**事实的住处**：加一条命令只改这里＋`commands.ts`，共用位一行不动。
 * 两条 `case` 逐字搬自旧分派层 `cli/write.ts`（#314 纯搬迁，行为不变）；随搬迁一起进来的还有
 * 原先私藏在 `cli/write.ts` 的两件**身体域参数口径**（`normSource`／`normSex`、`MEASURE_CAMEL`
 * ＋ `measureCliNames`）——它们只被这两条命令用，留在分派层等于让分派层替能力保管参数口径
 * （`docs/agents/structure.md` 铁律一）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { CALIPER_FIELDS, addComposition, addMeasurement } from '../fetch/body.js';
import { SOURCE_CHOICES, SOURCE_LABELS } from '../kcal.js';
import type { SourceChoice } from '../kcal.js';
import { todayISO } from '../analysis/utils.js';
import { R, definedKeys, out } from '../shared/writeParts.js';
import { assertISO, fail, optInt, optNum, optStr, wday } from '../shared/params.js';
import type { WriteOut } from '../shared/commandSpec.js';

/** 体脂来源中文别名（`--source` 收英文枚举或这几个中文词，语义照旧）。 */
const SOURCE_ALIASES: Record<string, SourceChoice> = { '家测皮褶钳': 'home_caliper', '医院测': 'hospital', '健身房测': 'gym', '健身房': 'gym', '医院': 'hospital', '皮褶钳': 'home_caliper' };

/** 体脂来源归一：英文枚举直通，中文别名查表，都不是即 exit 2。 */
function normSource(v: unknown): SourceChoice {
  const s = String(v ?? '').trim();
  if ((SOURCE_CHOICES as readonly string[]).includes(s)) return s as SourceChoice;
  const hit = SOURCE_ALIASES[s];
  if (hit) return hit;
  fail(2, '缺参数 source（' + SOURCE_CHOICES.join('/') + ' 或中文 ' + Object.keys(SOURCE_ALIASES).join('/') + '）');
  throw new Error('unreachable');
}

/** 性别归一：`male/female` 或「男／女」，给了别的即 exit 2。 */
function normSex(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  if (s === 'male' || s === 'female') return s;
  if (s === '男') return 'male';
  if (s === '女') return 'female';
  fail(2, '参数 sex 非法（male/female 或 男/女）：' + s);
  throw new Error('unreachable');
}

/** 围度 CLI 参数名 → 库列名（14 项，与 `fetch/body.ts` 的 `MEASUREMENT_FIELDS` 同面）。 */
const MEASURE_CAMEL: Record<string, string> = {
  chestCm: 'chest_cm', waistCm: 'waist_cm', abdomenCm: 'abdomen_cm', hipCm: 'hip_cm', shoulderCm: 'shoulder_cm',
  leftThighCm: 'left_thigh_cm', rightThighCm: 'right_thigh_cm', leftCalfCm: 'left_calf_cm', rightCalfCm: 'right_calf_cm',
  leftArmCm: 'left_arm_cm', rightArmCm: 'right_arm_cm', leftForearmCm: 'left_forearm_cm', rightForearmCm: 'right_forearm_cm',
};

/** 围度库列名 → CLI 参数名（`MEASURE_CAMEL` 反向；写入字段摘要统一走 CLI 名口径）。 */
function measureCliNames(keys: string[]): string[] {
  return keys.map((k) => Object.keys(MEASURE_CAMEL).find((c) => MEASURE_CAMEL[c] === k) ?? k);
}

/** `calorie.body.composition-add` · 记体脂（皮褶钳 7 处或外部测量直传；皮褶→体脂自动换算未移植）。 */
export function writeCompositionAdd(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = wday(params, 'date') ?? todayISO();
  assertISO(date, 'date');
  const source = normSource(params['source']);
  const input: Record<string, unknown> = {
    date, source, bodyFatPct: params['bodyFatPct'], note: optStr(params, 'note'),
    age: optInt(params, 'age'), sex: normSex(params['sex']),
  };
  for (const f of CALIPER_FIELDS) {
    const v = optNum(params, f);
    if (v !== undefined) input[f] = v;
  }
  if (input['bodyFatPct'] === undefined) fail(2, '缺参数 bodyFatPct（皮褶→体脂自动换算未移植，直传实测值）');
  const r = addComposition(db, input as unknown as Parameters<typeof addComposition>[1]);
  const label = SOURCE_LABELS[source] ?? source;
  return out(R('记体脂', 'create', '已记体脂：' + date + ' ' + label + ' ' + r.bodyFatPct + '%', '记体脂', 'body_composition (写库回执)', {
    recordId: r.id, ids: [r.id], writtenFields: definedKeys(input),
    items: [{ id: r.id, date, status: '成功', reason: '', detail: r.bodyFatPct + '%' }],
  }));
}

/** `calorie.body.measure-add` · 记围度（只认 14 个围度字段，多给一个即 exit 2）。 */
export function writeMeasureAdd(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const date = wday(params, 'date') ?? todayISO();
  assertISO(date, 'date');
  const input: Record<string, unknown> = { date, note: optStr(params, 'note') };
  for (const [camel, col] of Object.entries(MEASURE_CAMEL)) {
    const v = optNum(params, camel);
    if (v !== undefined) input[col] = v;
  }
  for (const k of Object.keys(params)) {
    if (!(k in MEASURE_CAMEL) && k !== 'date' && k !== 'note' && k !== 'key') fail(2, '不支持字段: ' + k);
  }
  const r = addMeasurement(db, input as unknown as Parameters<typeof addMeasurement>[1]);
  const filledCn = r.filled.map((f) => {
    const camel = Object.keys(MEASURE_CAMEL).find((c) => MEASURE_CAMEL[c] === f) ?? f;
    return camel + ' ' + String((input as Record<string, unknown>)[f]);
  }).join('、');
  return out(R('记围度', 'create', '已记围度：' + date + '（' + filledCn + '）', '记围度', 'body_measurements (写库回执)', {
    recordId: r.id, ids: [r.id], writtenFields: measureCliNames(definedKeys(input)),
    items: [{ id: r.id, date, status: '成功', reason: '', detail: filledCn }],
  }));
}
