/** 饮食能力的子功能「记饮食」（HELP 场景 02「饮食」下一级 diet_1）：记一餐／批量补记饮食／复制昨日饮食／记喝水。
 *
 * #315 纯搬迁：四个处理体**逐字搬自** `src/cli/write.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `fetch/diet.ts` 的公开接口，参数与窗口口径走共用位 `shared/params.ts`，
 * 回执底座走 `shared/writeParts.ts`——本件不重写任何别人的算式。
 * 四条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { MEALS, WATER_NAME, addMeal, addMealsBatch, copyMeals, getDailySummary } from '../fetch/diet.js';
import { CalorieRenderError } from '../render/errors.js';
import type { WriteOut } from '../shared/commandSpec.js';
import { assertISO, fail, needArr, needNum, optNum, optStr, wday } from '../shared/params.js';
import { F, R, commandLine, out } from '../shared/writeParts.js';
import { ENTRY_PRECHECK } from './precheckPort.js';
import { buildLabelPrecheckDoc } from './precheckLabel.js';
import { buildLabelPrecheckView } from './precheckPort.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

/** `calorie.diet.add` · 记一餐（唤醒词 记一餐）。 */
export function writeDietAdd(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  /* #277 · 「拍营养表」两条词的**第一步**：入口带 `entry:"precheck"` 时本命令只出**识别确认页**、
     **不写库**（老实物 `nutrition_label_wizard.html` 的 `output_type` 是 `process`，
     `scripts/build-help.mjs` 的流程句子逐字「过程：先出预检确认页 → 用户确认 → 跑这条命令」）。
     确认之后跑的是同一条命令、去掉 `entry` 那一位——回执页仍是 #509／#270 那一张，行为一字不差。 */
  if (optStr(params, 'entry') === ENTRY_PRECHECK) {
    const v = buildLabelPrecheckView(params);
    const page = buildLabelPrecheckDoc(v, v.date !== '', commandLine('calorie.diet.add', params));
    return { data: out(R(m('skill-calorie.diet-log.c001'), 'create', m('skill-calorie.diet-log.c002'), m('skill-calorie.diet-log.c003'), m('skill-calorie.diet-log.c004'), {
      recordId: null, noChange: true, ids: [], idSource: 'none', writtenFields: [],
    })).data, html: page };
  }
  const foodName = (optStr(params, 'foodName') ?? optStr(params, 'food_name') ?? '');
  if (!foodName.trim()) fail(2, m('skill-calorie.diet-log.c005'));
  const calories = needNum(params, 'calories');
  const protein = needNum(params, 'protein');
  for (const [k, v] of [['calories', calories], ['protein', protein]] as const) {
    if (v < 0) fail(2, m('skill-calorie.diet-log.c006', { p0: String(k) }));
  }
  for (const k of ['carbs', 'fat'] as const) {
    const v = optNum(params, k);
    if (v !== undefined && v < 0) fail(2, m('skill-calorie.diet-log.c007', { p0: String(k) }));
  }
  const grams0 = optNum(params, 'grams');
  if (grams0 !== undefined && grams0 <= 0) fail(2, m('skill-calorie.diet-log.c008'));
  const date = wday(params, 'date');
  if (date) assertISO(date, 'date');
  const meal = optStr(params, 'meal') ?? optStr(params, 'mealOverride');
  if (meal !== undefined && !(MEALS as readonly string[]).includes(meal)) fail(2, m('skill-calorie.diet-log.c009', { p0: String(listJoin(currentRenderLanguage(), MEALS)) }));
  const r = addMeal(db, {
    foodName: foodName.trim(), calories, protein,
    carbs: optNum(params, 'carbs') ?? 0, fat: optNum(params, 'fat') ?? 0,
    grams: optNum(params, 'grams') ?? 100, note: optStr(params, 'note'),
    date, time: optStr(params, 'time'), mealOverride: meal,
  });
  /* #496 · 页面标题原写死「记一餐」，而这一条命令底下挂着 5 个唤醒词（记一餐／记一餐（含备注）／
     补记饮食／拍营养表记一餐／拍营养表补记一餐）：补记饮食那一页顶着「记一餐 · 回执」，
     与进来的唤醒词对不上（审查件第 22 条）。命令收不到唤醒词，只能按**这次写入自己的事实**取标题：
     给了日期＝补记（不是现在吃的这一顿）；带了备注＝含备注。两者都不是的才是普通记一餐。 */
  const note = optStr(params, 'note');
  const hasNote = note !== undefined && note.trim() !== '';
  const backfill = date !== undefined;
  /* #509 · 上面那三种事实还分不出「拍营养表记一餐／拍营养表补记一餐」这两个入口——它俩的参数与
     普通记一餐／补记饮食全同（都带 `note`、都带 `date`），差别只在用户点的是哪条唤醒词，
     命令这一层看不见（审查件第 21、27 条点名的「05 与 01 逐字节相同」就是这两页）。⇒ 由**入口**
     自己带一个来源标记：`source:'photo'`（`src/diet/routes.ts` 那两条拍营养表的记录照 #276 给
     `看有备注的饮食记录` 带 `hasNote` 的同款做法传）。它只是上屏措辞的开关：
     参数名不上屏、不写库、不进 `writtenFields`；不给这个参数时行为与从前一字不差。 */
  const photo = optStr(params, 'source') === 'photo';
  const scene = backfill
    ? (photo ? m('skill-calorie.diet-log.c010') : m('skill-calorie.diet-log.c011'))
    : (photo ? m('skill-calorie.diet-log.c012') : (hasNote ? m('skill-calorie.diet-log.c013') : m('skill-calorie.diet-log.c014')));
  const said = (backfill ? m('skill-calorie.diet-log.c015') : m('skill-calorie.diet-log.c016')) + r.food_name + ' ' + r.date + ' ' + r.time + '（' + r.meal + '）';
  if (r.duplicate) {
    return out(R(scene, 'create', String(r.message ?? m('skill-calorie.diet-log.c017')), scene, m('skill-calorie.diet-log.c018'), {
      recordId: r.dupId ?? null, noChange: true,
      ids: r.dupId ? [r.dupId] : [], idSource: r.dupId ? 'record' : 'none', writtenFields: [],
    }));
  }
  const remain = r.remainingCal === null || r.remainingCal === undefined ? '' : m('skill-calorie.diet-log.c019', { p0: String(r.remainingCal) });
  /* #496 · 副题把备注原文带上（审查件第 21、27 条：「含备注」那一页与普通记一餐逐字节相同，
     读者看不出备注记到了哪里）。 */
  const noteText = hasNote ? m('skill-calorie.diet-log.c020', { p0: String(String(note)) }) : '';
  /* #509 · 拍照入口的两页（05 拍营养表记一餐／06 拍营养表补记一餐）另带一行来源：
     读者点两个入口看到的是两张一样的页——这一行就是「同一顿、这次是照着包装营养表记的」那处差异。 */
  const sourceText = photo ? m('skill-calorie.diet-log.c021') : '';
  return out(R(scene, 'create', said + sourceText + noteText + remain, scene, m('skill-calorie.diet-log.c022'), {
    recordId: r.id, ids: r.id === null ? [] : [r.id], writtenFields: [...F.diet],
    items: [{ id: r.id ?? undefined, date: r.date, status: m('skill-calorie.diet-log.c023'), reason: '', detail: r.food_name }],
  }));
}

/** `calorie.diet.batch` · 批量补记饮食。 */
export function writeDietBatch(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const items = needArr(params, 'items');
  if (items.length > 200) fail(2, m('skill-calorie.diet-log.c024'));
  const r = addMealsBatch(db, items.map((e) => {
    const o = (e ?? {}) as Record<string, unknown>;
    const food = o['foodName'] ?? o['food_name'];
    return {
      date: o['date'] === undefined ? undefined : String(o['date']),
      time: o['time'] === undefined ? undefined : String(o['time']),
      food_name: food === undefined ? undefined : String(food),
      grams: o['grams'] as number | undefined, calories: o['calories'] as number | undefined,
      protein: o['protein'] as number | undefined, carbs: o['carbs'] as number | undefined,
      fat: o['fat'] as number | undefined, note: o['note'] === undefined ? undefined : String(o['note']),
    };
  }));
  return out(R(m('skill-calorie.diet-log.c025'), 'create', m('skill-calorie.diet-log.c026', { p0: String(r.added), p1: String(r.skipped), p2: String(r.failed) }), m('skill-calorie.diet-log.c027'), m('skill-calorie.diet-log.c028'), {
    noChange: r.added === 0, ids: [], idSource: 'condition',
    writtenFields: r.added > 0 ? [...F.diet] : [],
    items: r.failures.slice(0, 20).map(([idx, reason]) => ({ status: m('skill-calorie.diet-log.c029'), reason, detail: m('skill-calorie.diet-log.c030', { p0: String(idx) }) })),
  }));
}

/** `calorie.diet.copy` · 复制昨日饮食。 */
export function writeDietCopy(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const today = todayISO();
  const from = wday(params, 'from') ?? wday(params, 'fromDate') ?? shiftISODate(today, -1);
  const to = wday(params, 'to') ?? wday(params, 'toDate') ?? today;
  assertISO(from, 'from');
  assertISO(to, 'to');
  const r = copyMeals(db, from, to);
  if (r.copied + r.skipped === 0) throw new CalorieRenderError('missing-data', '来源无饮食记录（' + from + '）');
  return out(R(m('skill-calorie.diet-log.c031'), 'create', m('skill-calorie.diet-log.c032', {
    p0: String(from),
    p1: String(to),
    p2: String(r.copied),
    p3: String(r.skipped),
  }), m('skill-calorie.diet-log.c033'), m('skill-calorie.diet-log.c034'), {
    noChange: r.copied === 0, ids: [], idSource: 'condition',
    writtenFields: r.copied > 0 ? [...F.diet] : [],
  }));
}

/** `calorie.water.log` · 记喝水。 */
export function writeWaterLog(params: Record<string, unknown>, db: DatabaseSync): WriteOut {
  const ml = needNum(params, 'ml');
  if (!(ml > 0) || ml > 10000) fail(2, m('skill-calorie.diet-log.c035'));
  const date = wday(params, 'date');
  if (date) assertISO(date, 'date');
  const r = addMeal(db, {
    foodName: WATER_NAME, calories: 0, protein: 0, grams: ml,
    note: optStr(params, 'note'), date, time: optStr(params, 'time'),
  });
  if (r.duplicate) {
    // 与 `calorie.diet.add` 同口径（§3.3 `record`）：重复跳过的原 id 由 fetch 回传（`fetch/diet.ts:96`），
    // 拿得到就报 `record`＋`ids=[dupId]`，拿不到才退 `none`（返修 R-3／蓝队 D-3 统一）。
    return out(R(m('skill-calorie.diet-log.c036'), 'create', String(r.message ?? m('skill-calorie.diet-log.c037')), m('skill-calorie.diet-log.c038'), m('skill-calorie.diet-log.c039'), {
      recordId: r.dupId ?? null, noChange: true,
      ids: r.dupId ? [r.dupId] : [], idSource: r.dupId ? 'record' : 'none', writtenFields: [],
    }));
  }
  const day = date ?? todayISO();
  const sum = getDailySummary(db, day);
  return out(R(m('skill-calorie.diet-log.c040'), 'create', m('skill-calorie.diet-log.c041', { p0: String(ml), p1: String(day), p2: String(sum.waterMl) }), m('skill-calorie.diet-log.c042'), m('skill-calorie.diet-log.c043'), {
    recordId: r.id, ids: r.id === null ? [] : [r.id], writtenFields: [...F.water],
    items: [{ id: r.id ?? undefined, date: r.date, status: m('skill-calorie.diet-log.c044'), reason: '', detail: ml + 'ml' }],
  }));
}
