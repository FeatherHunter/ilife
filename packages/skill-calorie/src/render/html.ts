/** T8 #27 + T10 #29 · HTML 串模板（包内目录，不跨包；风格只引 base-render tokens）。
 *
 * 红线：样式常量一律走 token()/cx()（base-render 唯一真相源），本包不自带颜色/圆角/字号常量；
 * 转义走 base-render escapeHtml；数值序列化前已在数据层 round2，模板不再做数学
 * （bar 宽度的 0..100 钳位为纯展示裁剪；照片层数值在本层不做数学）。
 * T8 四模板：renderHomeHtml（总览）/ renderDietHtml（饮食：总览+餐别分布）/
 * renderExerciseHtml（运动）/ renderGoalHtml（目标分析）。
 * T10 模板：photoCardHtml（照片卡）/ renderPhotoReceiptHtml（CRUD 收据）/ renderGalleryHtml（画廊）/
 * renderCompareHtml（对比）/ renderViewerHtml（单图）/ renderGifHtml（动图规划，只 render 任务描述不嵌 GIF）/
 * renderPhotoHelpHtml（HELP 速查）/ renderErrorHtml（失败收据）。缺失由数据层抛，本层不返空。
 * 二进制原样：照片只 render 文件名 <img> 引用 + fileExists 位，不嵌 base64。
 */
import { cx, escapeHtml, token } from '@feather_wch/base-render';
import type { HomeData } from './home.js';
import type { DietOverview, MealDistribution } from './diet.js';
import type { ExerciseView } from './exercise.js';
import type { GoalView } from './goal.js';
import type { CompareData, GalleryData, GifTask, PhotoCard, ViewerData } from './photo.js';
import { GIF_PASSTHROUGH_NOTE } from './photo.js';
import type { CrudReceipt, ErrorReceipt } from './receipt.js';
import type { PhotoHelpHit } from './help.js';

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

export function renderPhotoHelpHtml(hits: PhotoHelpHit[], query?: string): string {
  const rows = hits.map((h) => '<div class="' + cx('item') + '"><b>' + escapeHtml(h.wakeWord) + '</b> ' +
    '<span style="color:' + token('muted') + '">' + escapeHtml(h.key) + '</span><div>' + escapeHtml(h.desc) + '</div>' +
    '<pre>' + escapeHtml(h.exec) + '</pre></div>').join('');
  const body = (query ? '<div>查询：' + escapeHtml(query) + ' · 命中 ' + hits.length + ' 条</div>' : '<div>共 ' + hits.length + ' 条</div>') + rows;
  return pageShell('calorie', 'ilife:calorie:photo:help', '身材照片 HELP 速查', body);
}

export function renderErrorHtml(e: ErrorReceipt): string {
  const sug = e.suggestions.map((s) => '<li>' + escapeHtml(s) + '</li>').join('');
  const body = '<div class="' + cx('error') + '" style="color:' + token('danger') + '">' + escapeHtml(e.reason) + '</div>' +
    '<div>' + escapeHtml(e.op) + (e.sub ? ' · ' + escapeHtml(e.sub) : '') + '</div>' +
    '<pre>' + escapeHtml(e.dataText) + '</pre><ul>' + sug + '</ul>' +
    '<pre>' + escapeHtml(e.fixPrompt) + '</pre>';
  return pageShell('calorie', 'ilife:calorie:photo:error', e.sceneName + '失败回执', body);
}
