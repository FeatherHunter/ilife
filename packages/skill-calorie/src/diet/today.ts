/** 饮食能力的子功能「看饮食」（HELP 场景 02「饮食」下一级 diet_3）：今日饮食／今日饮水。
 *
 * #315 纯搬迁：两个处理体**逐字搬自** `src/cli/cmd_read.ts` 的对应 `case`（语义不动，只换住处）。
 * 取数走 `fetch/diet.ts`、装配走 `render/diet.ts`／`render/dietDocs.ts`／`diet/nutritionPort(Docs).ts`、
 * 配比算式走 `diet/dietEngine.ts` 的公开接口——本件不重写任何别人的算式。
 * 两条声明住 `./commands.ts`；对外只经 `./index.ts`。
 */
import type { DatabaseSync } from 'node:sqlite';
import { dietMacroRatio } from './dietEngine.js';
import { shiftISODate, todayISO } from '../analysis/utils.js';
import { listMeals } from '../fetch/diet.js';
import { buildDietOverview, buildMealDistribution } from '../render/diet.js';
import { buildTodayDietDoc, buildTodayNoteEmptyDoc } from './todayDocs.js';
import { CalorieRenderError } from '../render/errors.js';
import { buildTodayWaterView, hasAnyDietRow } from './nutritionPort.js';
import { buildEmptyWindowDoc, buildTodayWaterDoc } from './nutritionPortDocs.js';
import type { ViewOut } from '../shared/commandSpec.js';
import { assertISO, dayField, fail, latestFoodDate, nums, optStr, windowRange } from '../shared/params.js';
import { commandLine } from '../shared/writeParts.js';

/** 备注筛选参数：`hasNote` 主名、`withNote` 兼容旧唤醒词文案（`--with-note`）。只收布尔，非布尔即用法错。 */
function hasNoteOf(params: Record<string, unknown>): boolean | undefined {
  const v = params['hasNote'] !== undefined ? params['hasNote'] : params['withNote'];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== 'boolean') fail(2, '参数 hasNote 须为布尔');
  return v as boolean;
}

/** `calorie.today` · 今日饮食（`hasNote:true` 只看带备注的条目；取数已含 note 列）。 */
export function viewToday(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const date = windowRange(params)?.end ?? dayField(params, 'date') ?? latestFoodDate(db) ?? todayISO();
  assertISO(date, 'date');
  const hasNote = hasNoteOf(params);
  let rows = listMeals(db, date).filter((r) => r.food_name !== '💧水');
  if (hasNote === true) rows = rows.filter((r) => (r.note ?? '').trim() !== '');
  if (hasNote === false) rows = rows.filter((r) => (r.note ?? '').trim() === '');
  /* #496 · 「只看有备注的」筛出 0 条不是取数失败（这天就是没写备注）⇒ 出空态页，
     不落「ERR 4 取数失败（缺失阻断）」（审查件第 67 条：「无匹配时给空态句」）。
     整日一条记录都没有（`hasNote` 没给）仍是既有口径：缺失阻断，读数层不编页。 */
  if (rows.length === 0 && hasNote === true) {
    return { data: { items: [], total: 0 }, html: buildTodayNoteEmptyDoc(date) };
  }
  if (rows.length === 0) throw new CalorieRenderError('missing-data', '无饮食记录（' + date + '）');
  const items = rows.map((r) => ({ id: r.id, date: r.date, time: r.time, food_name: r.food_name, grams: r.grams, calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat, note: r.note ?? '' }));
  const o = buildDietOverview(db, date, date);
  const dist = buildMealDistribution(db, date);
  // #108 · 今日饮食全文档（餐次进度＋营养配比＋今日明细；配比无数据即 skip，不编数）。
  const mt = dietMacroRatio(db, date, date);
  return { data: { items, total: items.length }, html: buildTodayDietDoc({ overview: o, dist, meals: rows, macro: mt.status === 'ok' ? (mt.data ?? null) : null, hasNote: hasNote === true, command: commandLine('calorie.today', params) }) };
}

/** `calorie.view.today-water` · 今日饮水。 */
export function viewTodayWater(params: Record<string, unknown>, db: DatabaseSync): ViewOut {
  const date = windowRange(params)?.end ?? dayField(params, 'date') ?? latestFoodDate(db) ?? todayISO();
  assertISO(date, 'date');
  /* #511 · 这一条命令底下挂着两个唤醒词（看今日喝水／看今日饮水），参数一字不差，命令分不出进来的是
     哪条 ⇒ 由入口自己带 `entry` 标记（`src/diet/routes.ts` 那条「看今日喝水」的记录），页头按它出叫法。
     不给标记（含未知参数名）＝从前的「今日饮水」那一支，行为一字不差。 */
  const entry = optStr(params, 'entry');
  /* #275 · 复制日志第 4 段「调用链」＝**本次命令原文**（含 `--params`），照抄可重跑（裁定 7）；
     命令原文走命令层共用件 `shared/writeParts.ts` 的 `commandLine()`，页面件不自己拼。 */
  const command = commandLine('calorie.view.today-water', params);
  let v;
  try {
    v = buildTodayWaterView(db, date);
  } catch (e) {
    /* #275 · **两态分清**（`t425` 裁定 4 的 2026-09-15 澄清）：7 天窗内一杯都没记、库里别处还有记录
       ⇒ 这是「今天还没喝水」这个再常见不过的状态，出完整页 ＋ 空态句 ＋ 引导句；
       **库为空**仍原样抛出去走 `exit 4`（既有设计行为，本件不据裁定 4 去改它）。 */
    if (!(e instanceof CalorieRenderError) || e.code !== 'missing-data' || !hasAnyDietRow(db)) throw e;
    const name = entry === 'drink' ? '今日喝水' : '今日饮水';
    const weekStart = shiftISODate(date, -6);
    return {
      data: { metrics: {} },
      html: buildEmptyWindowDoc({
        key: 'calorie.view.today-water',
        metaLeft: name + ' · 饮食',
        title: '💧 ' + name,
        blockTitle: '今日读数',
        emptyText: '这一段（' + weekStart + ' ~ ' + date + '）没有饮水记录，进度与每杯都还是空的。',
        guide: '要让它有内容，先用「记喝水」记上一杯（可带时间），再来看进度。',
        footnote: '📊 数据来源 · 饮水记录 · ' + date,
        command,
      }),
    };
  }
  const metrics = nums({
    todayMl: v.todayMl, targetMl: v.targetMl, pct: v.pct, remainMl: v.remainMl, cups: v.cups.length,
  });
  return { data: { metrics }, html: buildTodayWaterDoc(v, entry, command) };
}
