/** T5 #24 · 饮食分析口径（对照老家 scripts/analysis/diet.py）。
 *
 * dietCalorieTrend / dietMacroRatio / dietFoodRanking / dietDeficitAnalysis。
 * 只取 as_dict=True 结构化形状；print 分支归 T11。空数据回 rejection（明确阻断）。
 * 注意：trend/ranking 查询不过滤饮水行（老家原样）；low_calorie/frequent 榜
 * 排除含 water/💧水（B-205）。deficit 用 体重×24×系数 BMR（老家口径，非 Mifflin）。
 */
import type { DatabaseSync } from 'node:sqlite';
import { FetchError } from '../fetch/errors.js';
import { getActivityFactor, parseDate } from './utils.js';
import { ok, rejection } from './result.js';
import type { AnalysisResult } from './result.js';

const round = (n: number): number => Math.round(n);
const round1 = (n: number): number => Math.round(n * 10) / 10;
const round2 = (n: number): number => Math.round(n * 100) / 100;

function rangeOf(start: string, end?: string | null): [string, string] {
  const s = parseDate(start);
  if (!s) throw new FetchError('起始日期非法: ' + String(start));
  return [s, parseDate(end ?? undefined) ?? s];
}

function latestWeightKg(db: DatabaseSync): number {
  const row = db.prepare('SELECT weight_kg FROM weight_log ORDER BY date DESC LIMIT 1').get() as { weight_kg: number | null } | undefined;
  return row?.weight_kg ?? 70;
}

function profileActivityLevel(db: DatabaseSync): string {
  const row = db.prepare('SELECT activity_level FROM user_profile WHERE id = 1').get() as { activity_level: string | null } | undefined;
  return row?.activity_level ?? 'moderate';
}

export interface TrendDay { date: string; totalCal: number; totalProtein: number; totalCarbs: number; totalFat: number }
export interface CalorieTrend { daysCount: number; totalCal: number; avgCal: number; calGoal: number | null; complianceDays: number; weekdayAvg: number; weekendAvg: number; daily: TrendDay[] }

export function dietCalorieTrend(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<CalorieTrend> {
  const [start, end] = rangeOf(startDate, endDate);
  const raw = db.prepare(
    'SELECT date, SUM(calories) AS c, SUM(protein) AS p, SUM(carbs) AS cb, SUM(fat) AS f FROM food_log WHERE date >= ? AND date <= ? GROUP BY date ORDER BY date ASC',
  ).all(start, end) as unknown as Array<{ date: string; c: number | null; p: number | null; cb: number | null; f: number | null }>;
  const rows: Array<[string, number | null, number | null, number | null, number | null]> = raw.map((r) => [r.date, r.c, r.p, r.cb, r.f]);
  if (rows.length === 0) return rejection('无饮食记录（' + start + ' ~ ' + end + '）');
  const totalCal = rows.reduce((a, r) => a + (r[1] ?? 0), 0);
  const avgCal = totalCal / rows.length;
  const goal = db.prepare('SELECT calorie_goal FROM daily_goal WHERE id = 1').get() as { calorie_goal: number | null } | undefined;
  const calGoal = goal?.calorie_goal ?? null;
  const onTarget = calGoal ? rows.filter((r) => Math.abs((r[1] ?? 0) - calGoal) <= calGoal * 0.1).length : 0;
  let weekdayCal = 0;
  let weekendCal = 0;
  let wdCount = 0;
  let weCount = 0;
  for (const r of rows) {
    const wd = new Date(r[0] + 'T12:00:00Z').getUTCDay();
    if (wd >= 1 && wd <= 5) { weekdayCal += r[1] ?? 0; wdCount += 1; }
    else { weekendCal += r[1] ?? 0; weCount += 1; }
  }
  const wdAvg = wdCount > 0 ? weekdayCal / wdCount : 0;
  const weAvg = weCount > 0 ? weekendCal / weCount : 0;
  const daily: TrendDay[] = rows.map((r) => ({ date: r[0], totalCal: r[1] ?? 0, totalProtein: r[2] ?? 0, totalCarbs: r[3] ?? 0, totalFat: r[4] ?? 0 }));
  return ok({ daysCount: rows.length, totalCal: round(totalCal), avgCal: round(avgCal), calGoal, complianceDays: onTarget, weekdayAvg: round(wdAvg), weekendAvg: round(weAvg), daily }, '热量趋势 ' + rows.length + ' 天，日均 ' + round(avgCal) + ' 卡');
}

export type MacroStatus = 'high' | 'low' | 'ok';
export interface MacroEval { pct: number; targetPct: number; diff: number; status: MacroStatus }
export interface MacroRatio { protein: MacroEval | null; carb: MacroEval | null; fat: MacroEval | null }

function evalMacro(pct: number, macro: 'protein' | 'carb' | 'fat', goal: { calorie_goal: number | null; protein_goal: number | null; carbs_goal: number | null; fat_goal: number | null } | undefined): MacroEval | null {
  if (!goal) return null;
  const calGoal = goal.calorie_goal ?? 1800;
  const target = macro === 'protein'
    ? ((goal.protein_goal ?? 150) * 4) / calGoal * 100
    : macro === 'carb' ? ((goal.carbs_goal ?? 200) * 4) / calGoal * 100 : ((goal.fat_goal ?? 60) * 9) / calGoal * 100;
  const diff = pct - target;
  return { pct: round(pct), targetPct: round(target), diff: round1(diff), status: diff > 3 ? 'high' : diff < -3 ? 'low' : 'ok' };
}

export function dietMacroRatio(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<MacroRatio> {
  const [start, end] = rangeOf(startDate, endDate);
  const row = db.prepare(
    'SELECT SUM(protein)*4 AS p, SUM(carbs)*4 AS c, SUM(fat)*9 AS f FROM food_log WHERE date >= ? AND date <= ?',
  ).get(start, end) as unknown as { p: number | null; c: number | null; f: number | null } | undefined;
  const parts = [row?.p ?? 0, row?.c ?? 0, row?.f ?? 0];
  if (!row || parts[0] + parts[1] + parts[2] === 0) return rejection('无饮食记录（' + start + ' ~ ' + end + '）');
  const total = (parts[0] as number) + (parts[1] as number) + (parts[2] as number);
  const denom = total === 0 ? 1 : total;
  const pctPro = ((parts[0] as number) / denom) * 100;
  const pctCarb = ((parts[1] as number) / denom) * 100;
  const pctFat = ((parts[2] as number) / denom) * 100;
  const goal = db.prepare('SELECT calorie_goal, protein_goal, carbs_goal, fat_goal FROM daily_goal WHERE id = 1').get() as
    | { calorie_goal: number | null; protein_goal: number | null; carbs_goal: number | null; fat_goal: number | null }
    | undefined;
  const g = goal ?? undefined;
  return ok(
    { protein: evalMacro(pctPro, 'protein', g), carb: evalMacro(pctCarb, 'carb', g), fat: evalMacro(pctFat, 'fat', g) },
    '营养配比 蛋白/碳水/脂肪 = ' + round(pctPro) + '/' + round(pctCarb) + '/' + round(pctFat),
  );
}

export type FoodRankCategory = 'high_calorie' | 'low_calorie' | 'frequent' | 'high_carb' | 'high_protein';
export interface RankItem { rank: number; foodName: string; totalCal: number; totalGrams: number; totalProtein: number; totalCarbs: number; totalFat: number; cnt: number; avgCalPerMeal: number }
export interface FoodRanking { category: string; title: string; start: string; end: string; topN: number; items: RankItem[] }

const RANK_TITLES: Record<string, string> = {
  high_calorie: '🔥 热量炸弹榜',
  low_calorie: '🥬 低热量健康榜',
  frequent: '📅 频繁吃榜',
  high_carb: '🍚 高碳水榜',
  high_protein: '💪 高蛋白榜',
};

function isWaterFood(name: string): boolean {
  return name.toLowerCase().includes('water') || name === '💧水';
}

export function dietFoodRanking(db: DatabaseSync, startDate: string, endDate?: string | null, category: string = 'high_calorie', topN = 5): AnalysisResult<FoodRanking> {
  const [start, end] = rangeOf(startDate, endDate);
  if (!Number.isInteger(topN) || topN < 1) throw new FetchError('topN 须为正整数');
  const raw = db.prepare(
    'SELECT food_name AS n, SUM(calories) AS c, SUM(grams) AS g, SUM(protein) AS p, SUM(carbs) AS cb, SUM(fat) AS f, COUNT(*) AS cnt FROM food_log WHERE date >= ? AND date <= ? GROUP BY food_name',
  ).all(start, end) as unknown as Array<{ n: string; c: number | null; g: number | null; p: number | null; cb: number | null; f: number | null; cnt: number }>;
  const rows: Array<[string, number | null, number | null, number | null, number | null, number | null, number]> = raw.map((r) => [r.n, r.c, r.g, r.p, r.cb, r.f, r.cnt]);
  if (rows.length === 0) return rejection('无饮食记录（' + start + ' ~ ' + end + '）');
  const filtered = category === 'low_calorie' || category === 'frequent' ? rows.filter((r) => !isWaterFood(r[0])) : rows;
  if (filtered.length === 0) return rejection('过滤后无记录（' + category + '）');
  const byCal = (x: (typeof filtered)[number]): number => x[1] ?? 0;
  const sorted = [...filtered].sort((a, b) => {
    if (category === 'low_calorie') {
      const avA = byCal(a) / Math.max(a[6], 1);
      const avB = byCal(b) / Math.max(b[6], 1);
      return avA - avB;
    }
    if (category === 'frequent') return b[6] - a[6];
    if (category === 'high_carb') return (b[4] ?? 0) - (a[4] ?? 0);
    if (category === 'high_protein') return (b[3] ?? 0) - (a[3] ?? 0);
    return byCal(b) - byCal(a);
  }).slice(0, topN);
  const title = (RANK_TITLES[category] ?? '📋 食物榜') + '（' + start + ' ~ ' + end + '）';
  const items: RankItem[] = sorted.map((r, i) => ({
    rank: i + 1,
    foodName: r[0],
    totalCal: r[1] ?? 0,
    totalGrams: r[2] ?? 0,
    totalProtein: r[3] ?? 0,
    totalCarbs: r[4] ?? 0,
    totalFat: r[5] ?? 0,
    cnt: r[6],
    avgCalPerMeal: Math.floor((r[1] ?? 0) / Math.max(r[6], 1)),
  }));
  return ok({ category, title, start, end, topN: items.length, items }, category + ' 榜单 TOP ' + items.length);
}

export interface DeficitAnalysis { daysCount: number; avgIntake: number; bmr: number; currentWeight: number; avgExerciseBurn: number; avgDeficit: number; totalDeficit: number; kgEquivalent: number; sizeLabel: string; dietContribPct: number; exerciseContribPct: number }

export function dietDeficitAnalysis(db: DatabaseSync, startDate: string, endDate?: string | null): AnalysisResult<DeficitAnalysis> {
  const [start, end] = rangeOf(startDate, endDate);
  const dietRaw = db.prepare(
    'SELECT date, SUM(calories) AS v FROM food_log WHERE date >= ? AND date <= ? GROUP BY date ORDER BY date ASC',
  ).all(start, end) as unknown as Array<{ date: string; v: number | null }>;
  const dietRows: Array<[string, number | null]> = dietRaw.map((r) => [r.date, r.v]);
  const exRaw = db.prepare(
    'SELECT date, SUM(calories_burned) AS v FROM exercise_log WHERE date >= ? AND date <= ? GROUP BY date ORDER BY date ASC',
  ).all(start, end) as unknown as Array<{ date: string; v: number | null }>;
  const exRows: Array<[string, number | null]> = exRaw.map((r) => [r.date, r.v]);
  if (dietRows.length === 0) return rejection('无记录（' + start + ' ~ ' + end + '）');
  const dietMap = new Map(dietRows.map((r) => [r[0], r[1] ?? 0]));
  const exMap = new Map(exRows.map((r) => [r[0], r[1] ?? 0]));
  const days = dietMap.size;
  const totalIntake = [...dietMap.values()].reduce((a, b) => a + b, 0);
  const totalEx = [...exMap.values()].reduce((a, b) => a + b, 0);
  const avgIntake = totalIntake / days;
  const avgEx = totalEx / days;
  const currentWeight = latestWeightKg(db);
  const bmr = currentWeight * 24 * getActivityFactor(profileActivityLevel(db));
  const avgDeficit = bmr + avgEx - avgIntake;
  const totalDeficit = avgDeficit * days;
  const kgEquivalent = totalDeficit / 7700;
  const dietContrib = totalDeficit !== 0 ? (Math.abs(totalDeficit - totalEx * days) / Math.abs(totalDeficit)) * 100 : 0;
  const exContrib = totalDeficit !== 0 ? (totalEx / Math.abs(totalDeficit)) * 100 : 0;
  const sizeLabel = avgDeficit > 0 && avgDeficit < 300 ? '偏小' : avgDeficit > 700 ? '过大' : '正常';
  return ok({
    daysCount: days,
    avgIntake: round(avgIntake),
    bmr: round(bmr),
    currentWeight: round1(currentWeight),
    avgExerciseBurn: round(avgEx),
    avgDeficit: round(avgDeficit),
    totalDeficit: round(totalDeficit),
    kgEquivalent: round2(kgEquivalent),
    sizeLabel,
    dietContribPct: round(dietContrib),
    exerciseContribPct: round(exContrib),
  }, '日均缺口 ' + round(avgDeficit) + ' 卡（' + sizeLabel + '）');
}
