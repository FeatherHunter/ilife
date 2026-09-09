/** T8 #27 + T9 #28 + T10 #29 · HTML 串模板（包内目录，不跨包；风格只引 base-paint tokens）。
 *
 * 红线：样式常量一律走 token()/cx()（base-paint 唯一真相源），本包不自带颜色/圆角/字号常量；
 * 转义走 base-paint escapeHtml；数值序列化前已在数据层 round2，模板不再做数学
 * （bar 宽度的 0..100 钳位为纯展示裁剪；照片层数值在本层不做数学）。
 * T8 四模板：renderHomeHtml（总览）/ renderDietHtml（饮食：总览+餐别分布）/
 * renderExerciseHtml（运动）/ renderGoalHtml（目标分析）。
 * T9 模板：目标五盘/组合分析/缺口/饮食复盘/健康盘/排行/食品库。
 * T10 模板：photoCardHtml（照片卡）/ renderPhotoReceiptHtml（CRUD 收据）/ renderGalleryHtml（画廊）/
 * renderCompareHtml（对比）/ renderViewerHtml（单图）/ renderGifHtml（动图规划，只 render 任务描述不嵌 GIF）/
 * renderPhotoHelpHtml（HELP 速查）/ renderErrorHtml（失败收据）。缺失由数据层抛，本层不返空。
 * 二进制原样：照片只 render 文件名 <img> 引用 + fileExists 位，不嵌 base64。
 */
import { cx, escapeHtml, token } from 'base-paint';
import type { HomeData } from './home.js';
import type { DietOverview, MealDistribution } from './diet.js';
import type { ExerciseView } from './exercise.js';
import type { GoalView } from './goal.js';
import type { CompareData, GalleryData, GifTask, PhotoCard, ViewerData } from './photo.js';
import { GIF_PASSTHROUGH_NOTE } from './photo.js';
import type { CrudReceipt, ErrorReceipt } from './receipt.js';
import type { PhotoHelpHit } from './help.js';
import { copyActionHtml, copyRuntimeScriptHtml } from './copy.js';
import type { GoalConfig, GoalProgress, GoalRecommend, GoalStatus, GoalWeight } from './goalPlate.js';
import type { WeightCompareView, WeightDashboard, WeightHistoryView, WeightReviewView, VolatilityView } from './weightPlate.js';
import type { BodyCompositionView, BodyMeasureView } from './bodyPlate.js';
import type { ExerciseGoalView, PlanView, PlanWizardView } from './planPlate.js';
import type { GoalExpiringView, GoalPredictView, GoalVsActualView } from './goalExtra.js';
import type { AnomalyView, ContraView, DedupeView, PredictView } from './insightPlate.js';
import type { ProfileView } from './profilePlate.js';
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

export function renderHomeHtml(d: HomeData): string {
  const t = d.daily.totals;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('今日摄入', fmt(t.cal, ' 卡'), '目标 ' + fmt(d.calorieGoal, ' 卡')) +
    kpi('蛋白', fmt(t.pro, ' g')) +
    kpi('饮水', fmt(d.daily.waterMl, ' ml'), '目标 ' + fmt(d.waterGoal, ' ml')) +
    kpi('今日缺口', fmt(d.deficitToday, ' 卡'), '正=缺口') +
    kpi('连续记录', d.streakDays + ' 天', '近' + d.week.loggedDays + '天有记录') +
    kpi('周均摄入', fmt(d.week.avgIntake, ' 卡'), d.week.start + ' ~ ' + d.week.end) +
    '</div>' +
    bar('热量完成度', d.caloriePct) + bar('蛋白完成度', d.proteinPct) + bar('饮水完成度', d.waterPct) +
    (d.daily.overCal
      ? '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">今日已超热量目标</div>'
      : '<div class="' + cx('ok') + '" style="color:' + token('accent') + '">热量在目标内</div>');
  return pageShell('calorie', 'ilife:calorie', '今日总览 ' + d.date, body);
}

export function renderDietHtml(o: DietOverview, dist: MealDistribution): string {
  const slices = dist.slices
    .map((s) => kpi(s.meal, s.calories + ' 卡', s.count + ' 餐 · ' + s.pct + '%'))
    .join('');
  const body =
    '<div class="' + cx('section') + '"><h2>饮食总览 ' + escapeHtml(o.start) + ' ~ ' + escapeHtml(o.end) + '</h2>' +
    '<div class="' + cx('grid') + '">' +
    kpi('累计', o.totalCalories + ' 卡', o.loggedDays + '/' + o.days + '天有记录') +
    kpi('日均', fmt(o.avgCalories, ' 卡')) +
    kpi('目标', o.calorieGoal + ' 卡') +
    kpi('趋势', o.trend.summary.trend, '均值 ' + o.trend.summary.avg + ' 卡') +
    '</div></div>' +
    '<div class="' + cx('section') + '"><h2>餐别分布 ' + escapeHtml(dist.date) + '（窗口跟 MEAL_WINDOWS）</h2>' +
    '<div class="' + cx('grid') + '">' + slices + '</div>' +
    '<div style="color:' + token('muted') + '">合计 ' + dist.totalCalories + ' 卡 · 加餐=下午茶+夜宵</div></div>';
  return pageShell('calorie', 'ilife:calorie:diet', '饮食 ' + o.start + ' ~ ' + o.end, body);
}

export function renderExerciseHtml(v: ExerciseView): string {
  const types = v.review.byType
    .slice(0, 4)
    .map((t) => kpi(t.type, t.burned + ' 卡', t.sessions + ' 次 · ' + t.minutes + ' 分钟'))
    .join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('总消耗', v.review.totalBurned + ' 卡', v.start + ' ~ ' + v.end) +
    kpi('总时长', v.review.totalMinutes + ' 分钟') +
    kpi('次数', v.review.sessions + ' 次', '活跃 ' + v.review.activeDays + ' 天') +
    kpi('数列活跃天', v.activeDays + ' 天', '数列合计 ' + v.totalBurnedSeries + ' 卡') +
    '</div>' + (types ? '<div class="' + cx('section') + '"><h2>TOP 类型</h2><div class="' + cx('grid') + '">' + types + '</div></div>' : '');
  return pageShell('calorie', 'ilife:calorie:exercise', '运动 ' + v.start + ' ~ ' + v.end, body);
}

export function renderGoalHtml(v: GoalView): string {
  const n = v.nutrition;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('热量目标', n.calorie_goal + ' 卡') +
    kpi('蛋白目标', fmt(n.protein_goal, ' g')) +
    kpi('饮水目标', fmt(n.water_goal, ' ml')) +
    kpi('30d完成', v.history.completedCount + '/' + (v.history.completedCount + v.history.incompleteCount), fmt(v.completionPct, '%')) +
    kpi('周缺口', v.deficit.summary.weeklyDeficit + ' 卡', '预计 ' + v.deficit.summary.predictedLossKg + ' kg') +
    kpi('缺口趋势', v.deficit.summary.trend) +
    '</div>' +
    bar('目标完成率', v.completionPct);
  return pageShell('calorie', 'ilife:calorie:goal', '目标分析 ' + v.start + ' ~ ' + v.end, body);
}

function tagChips(tags: string[]): string {
  if (tags.length === 0) return '<span style="color:' + token('muted') + '">无标签</span>';
  return tags.map((t) => '<span class="' + cx('chip') + '" style="border:1px solid ' + token('border') + '">' + escapeHtml(t) + '</span>').join('');
}

function fileBadge(exists: boolean | null): string {
  if (exists === null) return '<span style="color:' + token('muted') + '">文件未校验</span>';
  if (exists) return '<span style="color:' + token('accent') + '">文件存在</span>';
  return '<span style="color:' + token('danger') + '">文件缺失</span>';
}

/** 照片卡：文件名引用 + 标签 + 日期 + 存在位（无二进制内嵌）。 */
export function photoCardHtml(c: PhotoCard): string {
  return (
    '<figure class="' + cx('photo') + '" data-id="' + c.id + '" style="border:1px solid ' + token('border') + ';border-radius:' + token('radius') + 'px">' +
    '<img src="' + escapeHtml(c.photoPath) + '" alt="身材照#' + c.id + '" data-file-exists="' + String(c.fileExists) + '" />' +
    '<figcaption>#' + c.id + ' ' + escapeHtml(c.date) + ' ' + escapeHtml(c.time ?? '') + ' ' + tagChips(c.tagList) + ' ' + fileBadge(c.fileExists) +
    (c.note ? '<div>' + escapeHtml(c.note) + '</div>' : '') + '</figcaption></figure>'
  );
}

export function renderPhotoReceiptHtml(r: CrudReceipt): string {
  const items = r.items.length > 0
    ? r.items.map((it) => '<div class="' + cx('item') + '">#' + escapeHtml(String(it.id ?? '')) + ' ' +
      escapeHtml(it.file ?? it.photoPath ?? it.detail ?? '') + ' ' + escapeHtml(it.status) +
      (it.reason ? '（' + escapeHtml(it.reason) + '）' : '') + '</div>').join('')
    : '<div style="color:' + token('muted') + '">无逐张明细</div>';
  const diff = r.tagDiff
    ? '<div>改前：' + escapeHtml(r.tagDiff.before.join('、') || '—') + ' → 改后：' + escapeHtml(r.tagDiff.after.join('、') || '—') + '</div>'
    : '';
  const dist = r.distance
    ? '<div>距上次「' + escapeHtml(r.distance.tag) + '」照已隔 ' + r.distance.days + ' 天</div>'
    : '';
  const body = '<div class="' + cx('receipt') + '">' + escapeHtml(r.summary) + '</div>' +
    (r.noChange ? '<div style="color:' + token('danger') + '">未产生实际变化</div>' : '') +
    diff + dist + items;
  return pageShell('calorie', 'ilife:calorie:photo:receipt', r.scene + '回执', body);
}

export function renderGalleryHtml(g: GalleryData): string {
  const counts = g.tagCounts.map((t) => kpi(t.tag, t.count + ' 张')).join('');
  const body = '<div class="' + cx('grid') + '">' +
    kpi('共', g.totalCount + ' 张', g.filters.dateFrom + ' ~ ' + g.filters.dateTo) +
    kpi('标签筛选', g.filters.tag || '全部') +
    kpi('距上次拍照', g.daysSinceLast === null ? '—' : g.daysSinceLast + ' 天') + '</div>' +
    '<div class="' + cx('section') + '"><h2>标签计数</h2><div class="' + cx('grid') + '">' + counts + '</div></div>' +
    '<div class="' + cx('grid') + '">' + g.photos.map(photoCardHtml).join('') + '</div>';
  return pageShell('calorie', 'ilife:calorie:photo:gallery', '看身材照 · ' + g.totalCount + ' 张', body);
}

export function renderCompareHtml(c: CompareData): string {
  const body = '<div class="' + cx('grid') + '">' +
    kpi('间隔', c.intervalDays + ' 天', c.orderByDate ? '按日期正序' : '按日期倒序') +
    (c.crossTagWarning
      ? '<div style="color:' + token('danger') + '">跨标签对比警告：非同标签对比，可比性较弱</div>'
      : '<div style="color:' + token('accent') + '">同标签对比</div>') + '</div>' +
    '<div class="' + cx('grid') + '">' + photoCardHtml(c.photo1) + photoCardHtml(c.photo2) + '</div>';
  return pageShell('calorie', 'ilife:calorie:photo:compare', '对比两张照片 · 间隔 ' + c.intervalDays + ' 天', body);
}

export function renderViewerHtml(v: ViewerData): string {
  const nav = '<div>上一张：' + (v.prevId === null ? '无' : '#' + v.prevId) +
    ' · 下一张：' + (v.nextId === null ? '无' : '#' + v.nextId) + '</div>';
  return pageShell('calorie', 'ilife:calorie:photo:viewer', '身材照查看 #' + v.photo.id, photoCardHtml(v.photo) + nav);
}

export function renderGifHtml(t: GifTask): string {
  const body = '<div class="' + cx('grid') + '">' +
    kpi('标签', t.tag) +
    kpi('照片数', t.photoCount + ' 张', (t.firstDate ?? '—') + ' ~ ' + (t.lastDate ?? '—')) +
    kpi('照片 IDs', t.photoIds.length > 0 ? t.photoIds.join(',') : '无') + '</div>' +
    '<div style="color:' + token('muted') + '">' + escapeHtml(GIF_PASSTHROUGH_NOTE) + '</div>' +
    '<div style="color:' + token('muted') + '">' + escapeHtml(t.note) + '</div>';
  return pageShell('calorie', 'ilife:calorie:photo:gif', '生成身材照 GIF · ' + t.photoCount + ' 张', body);
}

/** 唤醒词 HELP 速查（`calorie.help.lookup`）的一行；字段名沿用 envelope 口径。 */
export interface HelpLookupHit {
  readonly wake_word: string;
  readonly category: string;
  readonly key: string;
  readonly cli: string;
  readonly desc: string;
}

/** 一行 = 标题行 + 描述 + 可执行命令 + **复制按钮**（#90：复制交互走 Base P0 双通道）。 */
function helpRowHtml(head: string, desc: string, cli: string): string {
  return '<div class="' + cx('item') + '">' + head +
    '<div>' + escapeHtml(desc) + '</div>' +
    '<pre>' + escapeHtml(cli) + '</pre>' +
    copyActionHtml(cli) + '</div>';
}

/** #90：HELP 页的复制接线 = 每行复制按钮（渲染期写入 `ACTION_ID_ATTR`／`DEFAULT_DATA_ATTR`）
 *  ＋ 页尾注入页面侧运行时（`buildSharedHelpersJs()` 产出，双通道 ＋ toast）。 */
export function renderPhotoHelpHtml(hits: PhotoHelpHit[], query?: string): string {
  const rows = hits.map((h) => helpRowHtml(
    '<b>' + escapeHtml(h.wakeWord) + '</b> <span style="color:' + token('muted') + '">' + escapeHtml(h.key) + '</span>',
    h.desc, h.exec,
  )).join('');
  const body = (query ? '<div>查询：' + escapeHtml(query) + ' · 命中 ' + hits.length + ' 条</div>' : '<div>共 ' + hits.length + ' 条</div>') + rows;
  return pageShell('calorie', 'ilife:calorie:photo:help', '身材照片 HELP 速查', body) + copyRuntimeScriptHtml();
}

/** #90：唤醒词 HELP 速查列表（原 `cmd_read` 内联 HTML 收编）——同一套复制接线。 */
export function renderHelpLookupHtml(hits: readonly HelpLookupHit[], query: string): string {
  const rows = hits.map((h) => helpRowHtml(
    '<b>' + escapeHtml(h.wake_word) + '</b> <span style="color:' + token('muted') + '">' + escapeHtml(h.key) + '</span>' +
    '<span style="color:' + token('muted') + '">' + escapeHtml(h.category) + '</span>',
    h.desc, h.cli,
  )).join('');
  const body = '<div>查询：' + escapeHtml(query) + ' · 命中 ' + hits.length + ' 条</div>' + rows;
  return pageShell('calorie', 'ilife:calorie:help', '唤醒词 HELP 速查 · ' + escapeHtml(query) + '（' + hits.length + ' 条）', body) + copyRuntimeScriptHtml();
}

export function renderErrorHtml(e: ErrorReceipt): string {
  const sug = e.suggestions.map((s) => '<li>' + escapeHtml(s) + '</li>').join('');
  const body = '<div class="' + cx('error') + '" style="color:' + token('danger') + '">' + escapeHtml(e.reason) + '</div>' +
    '<div>' + escapeHtml(e.op) + (e.sub ? ' · ' + escapeHtml(e.sub) : '') + '</div>' +
    '<pre>' + escapeHtml(e.dataText) + '</pre><ul>' + sug + '</ul>' +
    '<pre>' + escapeHtml(e.fixPrompt) + '</pre>';
  return pageShell('calorie', 'ilife:calorie:photo:error', e.sceneName + '失败回执', body);
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
export function renderWeightHtml(w: WeightDashboard): string {
  const t = w.trend;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('体重盘', t.firstWeight + ' → ' + t.lastWeight + ' kg', t.firstDate + ' ~ ' + t.lastDate) +
    kpi('均值', t.avgWeight + ' kg', '共 ' + t.recordCount + ' 条') +
    kpi('变化', (t.changeKg >= 0 ? '+' : '') + t.changeKg + ' kg', '趋势' + t.trendCn) +
    kpi('目标体重', fmt(w.weightGoal, ' kg'), w.deadline ? '截止 ' + w.deadline : '无截止') +
    kpi('距目标', w.gapKg === null ? '—' : (w.gapKg >= 0 ? '+' : '') + w.gapKg + ' kg') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:weight', '体重盘 ' + w.start + ' ~ ' + w.end, body);
}

export function renderWeightHistoryHtml(h: WeightHistoryView): string {
  const rows = h.rows.slice(0, 10).map((r) => kpi(r.date, r.weight_kg + ' kg', (r.note ?? '') + ' BMI ' + (r.bmi ?? '—'))).join('');
  const ch = h.change ? '变化 ' + (h.change.delta >= 0 ? '+' : '') + h.change.delta + ' kg（' + h.change.spanDays + '天）' : '单点无变化';
  const body =
    '<div class="' + cx('grid') + '">' + kpi('体重历史', h.range, ch) + '</div>' +
    '<div class="' + cx('grid') + '">' + rows + '</div>';
  return pageShell('calorie', 'ilife:calorie:weight-history', '体重历史 ' + h.range, body);
}

export function renderWeightCompareHtml(v: WeightCompareView): string {
  const c = v.compare;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('体重对比', (c.avgDiff >= 0 ? '+' : '') + c.avgDiff + ' kg', c.direction) +
    kpi('本期', c.currentPeriod.avgWeight + ' kg', v.start + ' ~ ' + v.end) +
    kpi('对比期', c.comparePeriod.avgWeight + ' kg', v.compareStart + ' ~ ' + v.compareEnd) +
    kpi('节奏', c.speedLabel) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:weight-compare', '体重对比', body);
}

export function renderWeightReviewHtml(v: WeightReviewView): string {
  const m = v.milestone;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('体重复核', m.currentWeight + ' kg', m.currentDate) +
    kpi('目标体重', m.weightGoal + ' kg', m.deadline ? '截止 ' + m.deadline : '无截止') +
    kpi('差距', (m.gapKg >= 0 ? '+' : '') + m.gapKg + ' kg') +
    kpi('状态', m.status) +
    kpi('预计达成', m.estDate ?? '—', m.estDays === null || m.estDays === undefined ? '' : m.estDays + '天') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:weight-review', '体重复核 ' + v.today, body);
}

export function renderVolatilityHtml(v: VolatilityView): string {
  const o = v.volatility;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('波动分析', '基线 ' + o.baselineValue + ' kg', o.baselineToggleLabel) +
    kpi('阈值', '黄±' + o.thresholds.yellow + ' 红±' + o.thresholds.red + ' kg', 'σ=' + o.baselineSigma + 'kg') +
    kpi('预警', o.earlyWarning.message, o.earlyWarning.date + ' ' + o.earlyWarning.kg + 'kg') +
    kpi('近期异常', o.recentAnomalies.length + ' 个', '共 ' + o.points.length + ' 点') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:volatility', '波动分析 ' + v.start + ' ~ ' + v.end, body);
}

export function renderBodyCompositionHtml(v: BodyCompositionView): string {
  const items = v.items.slice(0, 8).map((r) => {
    const d = r as { date?: unknown; body_fat_pct?: unknown; source?: unknown };
    return kpi(String(d.date ?? ''), String(d.body_fat_pct ?? '—') + '%', String(d.source ?? ''));
  }).join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('体成分看', v.source ?? '全部来源', '共 ' + v.total + ' 条') +
    kpi('最新体脂', v.latestPct === null ? '—' : v.latestPct + '%') +
    kpi('趋势点', v.trend.length + ' 天') +
    '</div><div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:body-composition', '体成分看', body);
}

export function renderBodyMeasureHtml(v: BodyMeasureView): string {
  const items = v.items.slice(0, 8).map((r) => {
    const d = r as Record<string, unknown>;
    return kpi(String(d['date'] ?? ''), v.metric ? String(d[v.metric] ?? '—') + 'cm' : '有记录', String(d['note'] ?? ''));
  }).join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('围度看', v.metric ?? '全部围度', '共 ' + v.total + ' 条') +
    kpi('最新', v.latestVal === null ? '—' : v.latestVal + 'cm', v.metric ?? '') +
    kpi('趋势点', v.trend.length + ' 天') +
    '</div><div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:body-measure', '围度看', body);
}

export function renderPlanHtml(v: PlanView): string {
  const sessions = v.sessions.slice(0, 8).map((s) => kpi('W' + s.week_number + 'D' + s.day_of_week + '#' + s.session_index, s.session_label || (s.is_rest_day ? '休息' : '训练'), (Array.isArray(s.movements) ? s.movements.length : 0) + '动作')).join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('训练计划看', v.title ?? '未命名', v.totalWeeks === null ? '' : '共 ' + v.totalWeeks + ' 周') +
    kpi('会话', v.totalSessions + ' 个', '动作 ' + v.totalMovements + ' 个') +
    '</div><div class="' + cx('grid') + '">' + sessions + '</div>';
  return pageShell('calorie', 'ilife:calorie:plan', '训练计划看', body);
}

export function renderPlanWizardHtml(v: PlanWizardView): string {
  const errs = v.errors.slice(0, 5).map((e) => '<div>' + escapeHtml(e) + '</div>').join('');
  const warns = v.warnings.slice(0, 5).map((e) => '<div>' + escapeHtml(e) + '</div>').join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('构建向导', v.errorCount === 0 ? '可落地' : '有硬止', '错误 ' + v.errorCount + ' 警告 ' + v.warningCount) +
    kpi('纯校验', '不写库', '已校验 ' + v.validatedCount + ' 个会话') +
    '</div><div>' + errs + warns + '</div>';
  return pageShell('calorie', 'ilife:calorie:plan-wizard', '构建向导', body);
}

export function renderExerciseGoalHtml(v: ExerciseGoalView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('运动目标视图', v.start + ' ~ ' + v.end, v.days + '天') +
    kpi('目标', v.goalTotal + ' 卡', '日均 ' + v.dailyGoal + ' 卡') +
    kpi('实际', v.actual + ' 卡', v.achieved ? '已达成' : '未达成') +
    kpi('完成度', v.pct === null ? '—' : v.pct + '%', '差 ' + v.gap + ' 卡') +
    '</div>' + bar('运动完成率', v.pct);
  return pageShell('calorie', 'ilife:calorie:exercise-goal', '运动目标视图', body);
}

export function renderGoalExpiringHtml(v: GoalExpiringView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('即将到期目标', v.deadline, v.expiring ? '即将到期' : '未到期') +
    kpi('剩余', v.daysLeft + ' 天', '窗口 ' + v.withinDays + ' 天') +
    kpi('体重目标', fmt(v.weightGoal, ' kg')) +
    kpi('热量目标', v.calorieGoal === null ? '—' : v.calorieGoal + ' 卡') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:goal-expiring', '即将到期目标', body);
}

export function renderGoalPredictHtml(v: GoalPredictView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('目标预测达成', '目标 ' + v.targetKg + ' kg', v.start + ' ~ ' + v.end) +
    kpi('当前', v.current + ' kg') +
    kpi('预计达成', v.eta, '剩余 ' + v.daysLeft + ' 天') +
    kpi('速率', v.ratePerWeek + ' kg/周', v.feasible ? '健康' : '超范围') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:goal-predict', '目标预测达成', body);
}

export function renderGoalVsActualHtml(v: GoalVsActualView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('目标对比实际', v.start + ' ~ ' + v.end, '完成 ' + v.completedCount + '/' + (v.completedCount + v.incompleteCount)) +
    kpi('热量目标', v.calorieGoal === null ? '—' : v.calorieGoal + ' 卡') +
    kpi('完成率', v.completionPct === null ? '—' : v.completionPct + '%') +
    kpi('摄入均值', v.trendAvg + ' 卡') +
    '</div>' + bar('目标完成率', v.completionPct);
  return pageShell('calorie', 'ilife:calorie:goal-vs-actual', '目标对比实际', body);
}

export function renderPredictHtml(v: PredictView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('体重预测', v.current + ' → ' + v.forecastValue + ' kg', v.horizonDays + '天') +
    kpi('速率', v.ratePerWeek + ' kg/周') +
    kpi('区间', (v.forecastLo ?? '—') + ' ~ ' + (v.forecastHi ?? '—') + ' kg') +
    '</div><div style="color:' + token('muted') + '">' + escapeHtml(v.insight) + '</div>';
  return pageShell('calorie', 'ilife:calorie:predict', '体重预测', body);
}

export function renderAnomalyHtml(v: AnomalyView): string {
  const findings = v.diagnosis.findings.slice(0, 5).map((f) => '<div><b>' + escapeHtml(f.cause) + '</b><div>' + escapeHtml(f.evidence) + '</div><div>' + escapeHtml(f.action) + '</div></div>').join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('异常诊断', v.kind, v.start + ' ~ ' + v.end) +
    kpi('发现', v.findingCount + ' 条', v.diagnosis.title) +
    '</div><div>' + findings + '</div><div style="color:' + token('muted') + '">' + escapeHtml(v.diagnosis.insight) + '</div>';
  return pageShell('calorie', 'ilife:calorie:anomaly', '异常诊断 ' + v.kind, body);
}

export function renderContraHtml(v: ContraView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('禁忌扫描', v.summaryStatus, '部位 ' + v.part) +
    kpi('会话', v.scannedSessions + ' 个', '动作 ' + v.scannedMovements + ' 个') +
    kpi('error', v.errorCount + ' 个') +
    kpi('warn', v.warnCount + ' 个') +
    kpi('info', v.infoCount + ' 个') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:contraindication', '禁忌扫描', body);
}

export function renderDedupeHtml(v: DedupeView): string {
  const groups = v.groups.slice(0, 8).map((g) => kpi(escapeHtml(g.productName), g.ids.join(',') , (g.brand ?? '') + ' ' + g.ids.length + '条')).join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('去重报告', v.groupCount + ' 组', '重复 ' + v.rowCount + ' 条/库 ' + v.totalProducts + ' 条') +
    '</div><div class="' + cx('grid') + '">' + groups + '</div>';
  return pageShell('calorie', 'ilife:calorie:dedupe', '去重报告', body);
}

export function renderProfileHtml(v: ProfileView): string {
  const p = v.profile;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi('档案视图', (p.gender ?? '—') + ' ' + (p.age ?? '—') + '岁', '身高 ' + (p.height_cm ?? '—') + 'cm') +
    kpi('活动量', p.activity_level ?? '—') +
    kpi('备注', p.note ?? '') +
    kpi('目标', v.hasGoal ? '已设' : '未设', v.nutrition ? v.nutrition.calorie_goal + ' 卡' : '') +
    kpi('最新体重', v.latestWeightKg === null ? '—' : v.latestWeightKg + ' kg') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:profile', '档案视图', body);
}

