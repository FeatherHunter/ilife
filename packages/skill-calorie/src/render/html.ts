/** T9 #28 · 目标分析盘 HTML 串模板（包内目录，不跨包；风格只引 base-render tokens）。
 *
 * 红线：样式常量一律走 token()/cx()（base-render 唯一真相源），本包不自带颜色/圆角/字号常量；
 * 转义走 base-render escapeHtml；数值序列化前已在数据层 round2，模板不再做数学
 * （bar 宽度的 0..100 钳位为纯展示裁剪，与 T8 同约）。
 * 模板：目标五盘（config/recommend/weight/progress/status）/ 组合分析 / 缺口 /
 * 饮食复盘 / 健康盘 / 排行（单榜+全榜）/ 食品库（search/library/stats）。
 * 缺失由数据层抛，本层不返空。
 */
import { cx, escapeHtml, token } from '@feather_wch/base-render';
import type { GoalConfig, GoalProgress, GoalRecommend, GoalStatus, GoalWeight } from './goalPlate.js';
import type { CombinedAnalysis, DietReview } from './analysisPlate.js';
import type { DeficitData } from '../analysis/deficit.js';
import type { FoodRanking } from '../analysis/diet.js';
import type { HealthPlate } from './health.js';
import type { AllRankings } from './ranking.js';
import type { ProductLibrary, ProductSearch, ProductStats } from './library.js';

function pageShell(skill: string, slot: string, title: string, body: string): string {
  return (
    '<section class="' + cx('page') + '" data-skill="' + escapeHtml(skill) + '" data-slot="' + escapeHtml(slot) + '"' +
    ' style="background:' + token('bg') + ';color:' + token('fg') + ';border:1px solid ' + token('border') +
    ';border-radius:' + token('radius') + 'px;padding:' + token('gap') + 'px;font-size:' + token('fontSize') + 'px">' +
    '<h1 class="' + cx('title') + '" style="color:' + token('fg') + '">' + escapeHtml(title) + '</h1>' + body + '</section>'
  );
}

function kpi(label: string, value: string, sub?: string): string {
  return (
    '<div class="' + cx('kpi') + '" style="border:1px solid ' + token('border') + ';border-radius:' + token('radius') + 'px">' +
    '<span class="' + cx('kpi-label') + '" style="color:' + token('muted') + '">' + escapeHtml(label) + '</span>' +
    '<b class="' + cx('kpi-value') + '">' + escapeHtml(value) + '</b>' +
    (sub ? '<span class="' + cx('kpi-sub') + '" style="color:' + token('muted') + '">' + escapeHtml(sub) + '</span>' : '') + '</div>'
  );
}

function bar(label: string, pct: number | null): string {
  const p = pct === null || pct === undefined ? '未设目标' : pct + '%';
  const w = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
  return (
    '<div class="' + cx('bar') + '"><span style="color:' + token('muted') + '">' + escapeHtml(label) + ' ' + escapeHtml(p) + '</span>' +
    '<div style="background:' + token('border') + ';border-radius:' + token('radius') + 'px">' +
    '<div style="width:' + w + '%;background:' + token('accent') + ';border-radius:' + token('radius') + 'px">&nbsp;</div></div></div>'
  );
}

function fmt(n: number | null | undefined, suffix = ''): string {
  if (n === null || n === undefined) return '—';
  return String(n) + suffix;
}

export function renderGoalConfigHtml(g: GoalConfig): string {
  const n = g.nutrition;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('热量目标', n.calorie_goal + ' 卡') +
    kpi('蛋白目标', fmt(n.protein_goal, ' g')) +
    kpi('碳水目标', fmt(n.carbs_goal, ' g')) +
    kpi('脂肪目标', fmt(n.fat_goal, ' g')) +
    kpi('饮水目标', fmt(n.water_goal, ' ml')) +
    kpi('状态', g.paused ? '已暂停' : '进行中', g.pausedAt ?? '') +
    '</div>' +
    (g.consistent
      ? '<div class="' + cx('ok') + '" style="color:' + token('accent') + '">宏量自洽（差 ' + g.diffKcal + ' 卡）</div>'
      : '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">宏量与热量差 ' + g.diffKcal + ' 卡，建议复核</div>');
  return pageShell('calorie', 'ilife:calorie:goal-config', '目标配置', body);
}

export function renderGoalRecommendHtml(g: GoalRecommend): string {
  const r = g.recommend;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('方案', r.profileLabel, 'TDEE ' + r.tdee + ' 卡') +
    kpi('热量目标', r.calorieGoal + ' 卡', '每周 ' + r.weeklyRateKg + ' kg') +
    kpi('蛋白', r.proteinGoal + ' g') +
    kpi('碳水', r.carbsGoal + ' g') +
    kpi('脂肪', r.fatGoal + ' g') +
    kpi('饮水', r.waterGoal + ' ml', g.water.basis) +
    '</div>' +
    '<div style="color:' + token('muted') + '">' + r.planReasons.map((x) => escapeHtml(x)).join('<br>') + '</div>' +
    (r.missing.length > 0
      ? '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">缺项用默认补齐：' + escapeHtml(r.missing.join('、')) + '</div>'
      : '');
  return pageShell('calorie', 'ilife:calorie:goal-recommend', '目标推荐（' + r.profileLabel + '）', body);
}

export function renderGoalWeightHtml(g: GoalWeight): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('目标体重', fmt(g.weightGoal, ' kg'), g.deadline ? '截止 ' + g.deadline : '') +
    kpi('最新体重', fmt(g.latestKg, ' kg'), g.start + ' ~ ' + g.end) +
    kpi('净变化', fmt(g.deltaKg, ' kg'), '有记录 ' + g.loggedDays + ' 天') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:goal-weight', '体重目标 ' + g.start + ' ~ ' + g.end, body);
}

export function renderGoalProgressHtml(g: GoalProgress): string {
  const n = g.nutrition;
  const total = g.history.completedCount + g.history.incompleteCount;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('热量目标', n.calorie_goal + ' 卡') +
    kpi('完成', g.history.completedCount + '/' + total, fmt(g.completionPct, '%')) +
    kpi('周缺口', g.deficit.summary.weeklyDeficit + ' 卡', '预计 ' + g.deficit.summary.predictedLossKg + ' kg') +
    kpi('缺口趋势', g.deficit.summary.trend) +
    kpi('摄入趋势', g.trend.summary.trend, '均值 ' + g.trend.summary.avg + ' 卡') +
    '</div>' +
    bar('目标完成率', g.completionPct);
  return pageShell('calorie', 'ilife:calorie:goal-progress', '目标进度 ' + g.start + ' ~ ' + g.end, body);
}

export function renderGoalStatusHtml(g: GoalStatus): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('状态', g.paused ? '已暂停' : '进行中', g.pausedAt ?? '') +
    kpi('热量目标', g.nutrition.calorie_goal + ' 卡') +
    kpi('饮水目标', fmt(g.nutrition.water_goal, ' ml')) +
    '</div>' +
    (g.paused
      ? '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">记录照常，仅目标暂停</div>'
      : '<div class="' + cx('ok') + '" style="color:' + token('accent') + '">目标进行中</div>');
  return pageShell('calorie', 'ilife:calorie:goal-status', '目标状态', body);
}

export function renderCombinedHtml(c: CombinedAnalysis): string {
  const a = c.analysis;
  const r = a.correlation.r === null || a.correlation.r === undefined ? '—' : String(a.correlation.r);
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('配对', a.labels.a + ' vs ' + a.labels.b, c.pair + ' · ' + c.window) +
    kpi('相关系数', r, 'n=' + a.correlation.n) +
    kpi('A 均值', fmt(a.aAvg), '变化 ' + fmt(a.aDelta)) +
    kpi('B 均值', fmt(a.bAvg), '变化 ' + fmt(a.bDelta)) +
    kpi('窗口', c.start + ' ~ ' + c.end, c.series.length + ' 天') +
    '</div>' +
    '<div style="color:' + token('muted') + '">' + escapeHtml(a.insight) + '</div>';
  return pageShell('calorie', 'ilife:calorie:combined', '组合分析 ' + c.pair, body);
}

export function renderDeficitHtml(d: DeficitData, title?: string): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('日均缺口', d.summary.avgDeficit + ' 卡', '趋势 ' + d.summary.trend) +
    kpi('周缺口', d.summary.weeklyDeficit + ' 卡', '预计 ' + d.summary.predictedLossKg + ' kg') +
    kpi('日均摄入', d.summary.avgIntake + ' 卡', '目标 ' + d.target.intake + ' 卡') +
    kpi('日均消耗', d.summary.avgBurn + ' 卡', 'TDEE ' + d.target.tdee + ' 卡') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:deficit', title ?? ('缺口 ' + d.meta.start + ' ~ ' + d.meta.end), body);
}

export function renderDietReviewHtml(r: DietReview): string {
  const t = r.trend.status === 'ok' && r.trend.data ? r.trend.data.totalCal + ' 卡·日均 ' + r.trend.data.avgCal + ' 卡' : '—';
  const m = r.macro.status === 'ok' && r.macro.data && r.macro.data.protein
    ? '蛋白/碳水/脂肪 ' + r.macro.data.protein.pct + '/' + r.macro.data.carb?.pct + '/' + r.macro.data.fat?.pct
    : '—';
  const meals = r.byMeal.map((s) => kpi(s.meal, s.totalCalories + ' 卡', s.days + ' 天')).join('');
  const body =
    '<div class="' + cx('section') + '"><h2>复盘 ' + escapeHtml(r.start) + ' ~ ' + escapeHtml(r.end) + '</h2>' +
    '<div class="' + cx('grid') + '">' +
    kpi('热量', t, r.loggedDays + ' 天有记录') +
    kpi('配比', m) +
    '</div></div>' +
    '<div class="' + cx('section') + '"><h2>按餐汇总（窗口跟 MEAL_WINDOWS，加餐=下午茶+夜宵）</h2>' +
    '<div class="' + cx('grid') + '">' + meals + '</div></div>';
  return pageShell('calorie', 'ilife:calorie:diet-review', '饮食复盘 ' + r.start + ' ~ ' + r.end, body);
}

export function renderHealthHtml(h: HealthPlate): string {
  const d = h.dashboard.data;
  const w = d && (d as { weight?: unknown }).weight !== null && (d as { weight?: unknown }).weight !== undefined ? '有' : '缺';
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('区间', h.start + ' ~ ' + h.end, '有记录 ' + h.loggedDays + ' 天') +
    kpi('日均摄入', fmt(h.avgIntake, ' 卡')) +
    kpi('日均缺口', fmt(h.avgDeficit, ' 卡')) +
    kpi('四维', h.dashboard.status === 'ok' ? '齐' : '部分缺', '体重维' + w) +
    kpi('报告', h.dashboard.message) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:health', '健康盘 ' + h.start + ' ~ ' + h.end, body);
}

export function renderRankingHtml(r: FoodRanking): string {
  const items = r.items
    .slice(0, 10)
    .map((it) => kpi('#' + it.rank + ' ' + it.foodName, it.totalCal + ' 卡', it.cnt + ' 次·均 ' + it.avgCalPerMeal + ' 卡/餐'))
    .join('');
  const body =
    '<div class="' + cx('section') + '"><h2>' + escapeHtml(r.title) + '</h2>' +
    '<div class="' + cx('grid') + '">' + items + '</div></div>';
  return pageShell('calorie', 'ilife:calorie:ranking', '排行 ' + r.category, body);
}

export function renderAllRankingsHtml(a: AllRankings): string {
  const parts = (Object.entries(a.boards) as Array<[string, FoodRanking | null]>)
    .map(([cat, b]) => {
      if (!b) return kpi(cat, '—', '本窗无数据');
      const top = b.items[0];
      return kpi(cat, top ? top.foodName + ' ' + top.totalCal + ' 卡' : '—', 'TOP ' + b.topN);
    })
    .join('');
  const body =
    '<div class="' + cx('grid') + '">' + parts + '</div>' +
    '<div style="color:' + token('muted') + '">' + escapeHtml(a.start) + ' ~ ' + escapeHtml(a.end) + ' · ' + a.okCount + '/5 榜有数据</div>';
  return pageShell('calorie', 'ilife:calorie:ranking-all', '全部排行', body);
}

export function renderProductSearchHtml(s: ProductSearch): string {
  const items = s.items
    .slice(0, 10)
    .map((p) => kpi(p.product_name, p.calories + ' 卡', (p.brand ?? '') + '·蛋白 ' + p.protein + ' g'))
    .join('');
  const body =
    '<div class="' + cx('grid') + '">' + kpi('关键词', s.keyword, '命中 ' + s.total + ' 条') + '</div>' +
    '<div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:search', '查食品 ' + s.keyword, body);
}

export function renderProductLibraryHtml(l: ProductLibrary): string {
  const items = l.items
    .slice(0, 10)
    .map((p) => kpi(p.product_name, p.calories + ' 卡', (p.brand ?? '') + '·' + (p.category ?? '')))
    .join('');
  const body =
    '<div class="' + cx('grid') + '">' + kpi('食品库', l.category ?? '全量', '共 ' + l.total + ' 条') + '</div>' +
    '<div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:library', '食品库', body);
}

export function renderProductStatsHtml(s: ProductStats): string {
  const items = s.stats.map((x) => kpi(x.source, x.count + ' 条')).join('');
  const body =
    '<div class="' + cx('grid') + '">' + kpi('总数', s.total + ' 条') + '</div>' +
    '<div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:library-stats', '库统计', body);
}
