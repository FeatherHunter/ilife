/** T8 #27 + T9 #28 + T10 #29 · HTML 串模板（包内目录，不跨包；风格只引 base-paint tokens）。
 *
 * 红线：样式常量一律走 token()/cx()（base-paint 唯一真相源），本包不自带颜色/圆角/字号常量；
 * 转义走 base-paint escapeHtml；数值序列化前已在数据层 round2，模板不再做数学
 * （bar 宽度的 0..100 钳位为纯展示裁剪；照片层数值在本层不做数学）。
 * T8 四模板（总览已迁 `src/home/homeDocs.ts`，#370 纯搬迁；**饮食／运动／目标分析三条老模板已在
 *  #708 删除**——它们生产零调用方，唯一消费者是 `test/render-t8.test.mjs` 的直调，删除后生产零变化）。
 * T9 模板：目标五盘/组合分析/缺口/饮食复盘/健康盘/排行/食品库。
 * T10 模板：photoCardHtml（照片卡）/ renderPhotoReceiptHtml（CRUD 收据）/ renderGalleryHtml（画廊）/
 * renderCompareHtml（对比）/ renderViewerHtml（单图）/ renderGifHtml（动图规划，只 render 任务描述不嵌 GIF）/
 * renderErrorHtml（失败收据）。缺失由数据层抛，本层不返空。
 * 二进制原样：照片只 render 文件名 <img> 引用 + fileExists 位，不嵌 base64。
 */
import { cx, escapeHtml, token } from 'base-paint';
import type { CompareData, GalleryData, GifTask, PhotoCard, ViewerData } from '../photo/photo.js';
import { GIF_PASSTHROUGH_NOTE } from '../photo/photo.js';
import type { CrudReceipt, ErrorReceipt } from './receipt.js';
import { copyActionHtml, copyRuntimeScriptHtml } from './copy.js';
import type { GoalConfig, GoalProgress, GoalRecommend, GoalStatus, GoalWeight } from '../goal/goalPlates.js';
import type { WeightCompareView, WeightDashboard, WeightHistoryView, WeightReviewView, VolatilityView } from '../weight/plate.js';
import type { BodyCompositionView, BodyMeasureView } from '../body/bodyPlate.js';
import type { ExerciseGoalView, PlanView, PlanVsActualView, PlanWizardView } from './planPlate.js';
import { buildPlanProcessDoc, buildPlanResultDoc, buildPlanVsActualDoc } from './workoutPlanDocs.js';
import { buildPlanWizardDoc } from './planWizardDocs.js';
import type { WritePreview } from '../workout/write.js';
import type { GoalExpiringView, GoalPredictView, GoalVsActualView } from '../goal/goalExtraPlate.js';
import type { AnomalyView, ContraView, DedupeView, PredictView } from './insightPlate.js';
import type { ProfileView } from '../profile/view.js';
import type { CombinedAnalysis, DietReview } from './analysisPlate.js';
import type { DeficitData } from '../analysis/deficit.js';
import type { FoodRanking } from '../diet/dietEngine.js';
import type { HealthPlate } from '../analysis/healthPlate.js';
import type { AllRankings } from '../diet/rankingPlate.js';
import type { ProductLibrary, ProductSearch, ProductStats } from '../diet/libraryPlate.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

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
  const p = pct === null || pct === undefined ? m('skill-calorie.render-html.c001') : pct + '%';
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

function tagChips(tags: string[]): string {
  if (tags.length === 0) return '<span style="color:' + token('muted') + '">' + m('skill-calorie.photo-photo.c015') + '</span>';
  return tags.map((t) => '<span class="' + cx('chip') + '" style="border:1px solid ' + token('border') + '">' + escapeHtml(t) + '</span>').join('');
}

function fileBadge(exists: boolean | null): string {
  if (exists === null) return '<span style="color:' + token('muted') + '">' + m('skill-calorie.render-html.c905') + '</span>';
  if (exists) return '<span style="color:' + token('accent') + '">' + m('skill-calorie.render-html.c906') + '</span>';
  return '<span style="color:' + token('danger') + '">' + m('skill-calorie.render-html.c907') + '</span>';
}

/** 照片卡：文件名引用 + 标签 + 日期 + 存在位（无二进制内嵌）。 */
export function photoCardHtml(c: PhotoCard): string {
  return (
    '<figure class="' + cx('photo') + '" data-id="' + c.id + '" style="border:1px solid ' + token('border') + ';border-radius:' + token('radius') + 'px">' +
    '<img src="' + escapeHtml(c.photoPath) + '" alt="' + m('skill-calorie.render-html.c900', { p0: String(c.id) }) + '" data-file-exists="' + String(c.fileExists) + '" />' +
    '<figcaption>#' + c.id + ' ' + escapeHtml(c.date) + ' ' + escapeHtml(c.time ?? '') + ' ' + tagChips(c.tagList) + ' ' + fileBadge(c.fileExists) +
    (c.note ? '<div>' + escapeHtml(c.note) + '</div>' : '') + '</figcaption></figure>'
  );
}

export function renderPhotoReceiptHtml(r: CrudReceipt): string {
  const items = r.items.length > 0
    ? r.items.map((it) => '<div class="' + cx('item') + '">#' + escapeHtml(String(it.id ?? '')) + ' ' +
      escapeHtml(it.file ?? it.photoPath ?? it.detail ?? '') + ' ' + escapeHtml(it.status) +
      (it.reason ? '（' + escapeHtml(it.reason) + '）' : '') + '</div>').join('')
    : '<div style="color:' + token('muted') + '">' + m('skill-calorie.render-html.c908') + '</div>';
  const diff = r.tagDiff
    ? '<div>' + m('skill-calorie.render-html.c901', {
      p0: escapeHtml(listJoin(currentRenderLanguage(), r.tagDiff.before) || '—'), p1: escapeHtml(listJoin(currentRenderLanguage(), r.tagDiff.after) || '—'),
    }) + '</div>'
    : '';
  const dist = r.distance
    ? '<div>' + m('skill-calorie.render-html.c902', { p0: escapeHtml(r.distance.tag), p1: String(r.distance.days) }) + '</div>'
    : '';
  const body = '<div class="' + cx('receipt') + '">' + escapeHtml(r.summary) + '</div>' +
    (r.noChange ? '<div style="color:' + token('danger') + '">' + m('skill-calorie.render-html.c909') + '</div>' : '') +
    diff + dist + items;
  return pageShell('calorie', 'ilife:calorie:photo:receipt', m('skill-calorie.render-html.c002', { p0: String(r.scene) }), body);
}

export function renderGalleryHtml(g: GalleryData): string {
  const counts = g.tagCounts.map((t) => kpi(t.tag, m('skill-calorie.render-html.c003', { p0: String(t.count) }))).join('');
  const body = '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c004'), m('skill-calorie.render-html.c005', { p0: String(g.totalCount) }), g.filters.dateFrom + ' ~ ' + g.filters.dateTo) +
    kpi(m('skill-calorie.render-html.c006'), g.filters.tag || m('skill-calorie.render-html.c007')) +
    kpi(m('skill-calorie.render-html.c008'), g.daysSinceLast === null ? '—' : m('skill-calorie.render-html.c009', { p0: String(g.daysSinceLast) })) + '</div>' +
    '<div class="' + cx('section') + '"><h2>' + m('skill-calorie.render-html.c910') + '</h2><div class="' + cx('grid') + '">' + counts + '</div></div>' +
    '<div class="' + cx('grid') + '">' + g.photos.map(photoCardHtml).join('') + '</div>';
  return pageShell('calorie', 'ilife:calorie:photo:gallery', m('skill-calorie.render-html.c010', { p0: String(g.totalCount) }), body);
}

export function renderCompareHtml(c: CompareData): string {
  const body = '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c011'), m('skill-calorie.render-html.c012', { p0: String(c.intervalDays) }), c.orderByDate ? m('skill-calorie.render-html.c013') : m('skill-calorie.render-html.c014')) +
    (c.crossTagWarning
      ? '<div style="color:' + token('danger') + '">' + m('skill-calorie.render-html.c911') + '</div>'
      : '<div style="color:' + token('accent') + '">' + m('skill-calorie.render-html.c912') + '</div>') + '</div>' +
    '<div class="' + cx('grid') + '">' + photoCardHtml(c.photo1) + photoCardHtml(c.photo2) + '</div>';
  return pageShell('calorie', 'ilife:calorie:photo:compare', m('skill-calorie.render-html.c015', { p0: String(c.intervalDays) }), body);
}

export function renderViewerHtml(v: ViewerData): string {
  const nav = '<div>' + m('skill-calorie.render-html.c903', {
    p0: v.prevId === null ? m('skill-calorie.render-html.c016') : '#' + v.prevId,
    p1: v.nextId === null ? m('skill-calorie.render-html.c017') : '#' + v.nextId,
  }) + '</div>';
  return pageShell('calorie', 'ilife:calorie:photo:viewer', m('skill-calorie.render-html.c018', { p0: String(v.photo.id) }), photoCardHtml(v.photo) + nav);
}

export function renderGifHtml(t: GifTask): string {
  const body = '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c019'), t.tag) +
    kpi(m('skill-calorie.render-html.c020'), m('skill-calorie.render-html.c021', { p0: String(t.photoCount) }), (t.firstDate ?? '—') + ' ~ ' + (t.lastDate ?? '—')) +
    kpi(m('skill-calorie.render-html.c022'), t.photoIds.length > 0 ? t.photoIds.join(',') : m('skill-calorie.render-html.c023')) + '</div>' +
    '<div style="color:' + token('muted') + '">' + escapeHtml(GIF_PASSTHROUGH_NOTE) + '</div>' +
    '<div style="color:' + token('muted') + '">' + escapeHtml(t.note) + '</div>';
  return pageShell('calorie', 'ilife:calorie:photo:gif', m('skill-calorie.render-html.c024', { p0: String(t.photoCount) }), body);
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


/** #90：唤醒词 HELP 速查列表（原 `cmd_read` 内联 HTML 收编）——同一套复制接线。 */
export function renderHelpLookupHtml(hits: readonly HelpLookupHit[], query: string): string {
  const rows = hits.map((h) => helpRowHtml(
    '<b>' + escapeHtml(h.wake_word) + '</b> <span style="color:' + token('muted') + '">' + escapeHtml(h.key) + '</span>' +
    '<span style="color:' + token('muted') + '">' + escapeHtml(h.category) + '</span>',
    h.desc, h.cli,
  )).join('');
  const body = '<div>' + m('skill-calorie.render-html.c904', { p0: escapeHtml(query), p1: String(hits.length) }) + '</div>' + rows;
  return pageShell('calorie', 'ilife:calorie:help', m('skill-calorie.render-html.c025', { p0: String(escapeHtml(query)), p1: String(hits.length) }), body) + copyRuntimeScriptHtml();
}

export function renderErrorHtml(e: ErrorReceipt): string {
  const sug = e.suggestions.map((s) => '<li>' + escapeHtml(s) + '</li>').join('');
  const body = '<div class="' + cx('error') + '" style="color:' + token('danger') + '">' + escapeHtml(e.reason) + '</div>' +
    '<div>' + escapeHtml(e.op) + (e.sub ? ' · ' + escapeHtml(e.sub) : '') + '</div>' +
    '<pre>' + escapeHtml(e.dataText) + '</pre><ul>' + sug + '</ul>' +
    '<pre>' + escapeHtml(e.fixPrompt) + '</pre>';
  return pageShell('calorie', 'ilife:calorie:photo:error', m('skill-calorie.render-html.c026', { p0: String(e.sceneName) }), body);
}

export function renderGoalConfigHtml(g: GoalConfig): string {
  const n = g.nutrition;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c027'), m('skill-calorie.render-html.c028', { p0: String(n.calorie_goal) })) +
    kpi(m('skill-calorie.render-html.c029'), fmt(n.protein_goal, ' g')) +
    kpi(m('skill-calorie.render-html.c030'), fmt(n.carbs_goal, ' g')) +
    kpi(m('skill-calorie.render-html.c031'), fmt(n.fat_goal, ' g')) +
    kpi(m('skill-calorie.render-html.c032'), fmt(n.water_goal, ' ml')) +
    kpi(m('skill-calorie.render-html.c033'), g.paused ? m('skill-calorie.render-html.c034') : m('skill-calorie.render-html.c035'), g.pausedAt ?? '') +
    '</div>' +
    (g.consistent
      ? '<div class="' + cx('ok') + '" style="color:' + token('accent') + '">' + m('skill-calorie.render-html.c913', { p0: String(g.diffKcal) }) + '</div>'
      : '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">' + m('skill-calorie.render-html.c914', { p0: String(g.diffKcal) }) + '</div>');
  return pageShell('calorie', 'ilife:calorie:goal-config', m('skill-calorie.render-html.c036'), body);
}

export function renderGoalRecommendHtml(g: GoalRecommend): string {
  const r = g.recommend;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c037'), r.profileLabel, m('skill-calorie.render-html.c038', { p0: String(r.tdee) })) +
    kpi(m('skill-calorie.render-html.c039'), m('skill-calorie.render-html.c040', { p0: String(r.calorieGoal) }), m('skill-calorie.render-html.c041', { p0: String(r.weeklyRateKg) })) +
    kpi(m('skill-calorie.render-html.c042'), r.proteinGoal + ' g') +
    kpi(m('skill-calorie.render-html.c043'), r.carbsGoal + ' g') +
    kpi(m('skill-calorie.render-html.c044'), r.fatGoal + ' g') +
    kpi(m('skill-calorie.render-html.c045'), r.waterGoal + ' ml', g.water.basis) +
    '</div>' +
    '<div style="color:' + token('muted') + '">' + r.planReasons.map((x) => escapeHtml(x)).join('<br>') + '</div>' +
    (r.missing.length > 0
      ? '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">' + m('skill-calorie.render-html.c915', { p0: escapeHtml(listJoin(currentRenderLanguage(), r.missing)) }) + '</div>'
      : '');
  return pageShell('calorie', 'ilife:calorie:goal-recommend', m('skill-calorie.render-html.c046', { p0: String(r.profileLabel) }), body);
}

export function renderGoalWeightHtml(g: GoalWeight): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c047'), fmt(g.weightGoal, ' kg'), g.deadline ? m('skill-calorie.render-html.c048', { p0: String(g.deadline) }) : '') +
    kpi(m('skill-calorie.render-html.c049'), fmt(g.latestKg, ' kg'), g.start + ' ~ ' + g.end) +
    kpi(m('skill-calorie.render-html.c050'), fmt(g.deltaKg, ' kg'), m('skill-calorie.render-html.c051', { p0: String(g.loggedDays) })) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:goal-weight', m('skill-calorie.render-html.c052', { p0: String(g.start), p1: String(g.end) }), body);
}

export function renderGoalProgressHtml(g: GoalProgress): string {
  const n = g.nutrition;
  const total = g.history.completedCount + g.history.incompleteCount;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c053'), m('skill-calorie.render-html.c054', { p0: String(n.calorie_goal) })) +
    kpi(m('skill-calorie.render-html.c055'), g.history.completedCount + '/' + total, fmt(g.completionPct, '%')) +
    kpi(m('skill-calorie.render-html.c056'), m('skill-calorie.render-html.c057', { p0: String(g.deficit.summary.weeklyDeficit) }), m('skill-calorie.render-html.c058', { p0: String(g.deficit.summary.predictedLossKg) })) +
    kpi(m('skill-calorie.render-html.c059'), g.deficit.summary.trend) +
    kpi(m('skill-calorie.render-html.c060'), g.trend.summary.trend, m('skill-calorie.render-html.c061', { p0: String(g.trend.summary.avg) })) +
    '</div>' +
    bar(m('skill-calorie.render-html.c062'), g.completionPct);
  return pageShell('calorie', 'ilife:calorie:goal-progress', m('skill-calorie.render-html.c063', { p0: String(g.start), p1: String(g.end) }), body);
}

export function renderGoalStatusHtml(g: GoalStatus): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c064'), g.paused ? m('skill-calorie.render-html.c065') : m('skill-calorie.render-html.c066'), g.pausedAt ?? '') +
    kpi(m('skill-calorie.render-html.c067'), m('skill-calorie.render-html.c068', { p0: String(g.nutrition.calorie_goal) })) +
    kpi(m('skill-calorie.render-html.c069'), fmt(g.nutrition.water_goal, ' ml')) +
    '</div>' +
    (g.paused
      ? '<div class="' + cx('warn') + '" style="color:' + token('danger') + '">' + m('skill-calorie.render-html.c916') + '</div>'
      : '<div class="' + cx('ok') + '" style="color:' + token('accent') + '">' + m('skill-calorie.goal-resultDocs.c164') + '</div>');
  return pageShell('calorie', 'ilife:calorie:goal-status', m('skill-calorie.render-html.c070'), body);
}

export function renderCombinedHtml(c: CombinedAnalysis): string {
  const a = c.analysis;
  const r = a.correlation.r === null || a.correlation.r === undefined ? '—' : String(a.correlation.r);
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c071'), a.labels.a + ' vs ' + a.labels.b, c.pair + ' · ' + c.window) +
    kpi(m('skill-calorie.render-html.c072'), r, 'n=' + a.correlation.n) +
    kpi(m('skill-calorie.render-html.c073'), fmt(a.aAvg), m('skill-calorie.render-html.c074', { p0: String(fmt(a.aDelta)) })) +
    kpi(m('skill-calorie.render-html.c075'), fmt(a.bAvg), m('skill-calorie.render-html.c076', { p0: String(fmt(a.bDelta)) })) +
    kpi(m('skill-calorie.render-html.c077'), c.start + ' ~ ' + c.end, m('skill-calorie.render-html.c078', { p0: String(c.series.length) })) +
    '</div>' +
    '<div style="color:' + token('muted') + '">' + escapeHtml(a.insight) + '</div>';
  return pageShell('calorie', 'ilife:calorie:combined', m('skill-calorie.render-html.c079', { p0: String(c.pair) }), body);
}

export function renderDeficitHtml(d: DeficitData, title?: string): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c080'), m('skill-calorie.render-html.c081', { p0: String(d.summary.avgDeficit) }), m('skill-calorie.render-html.c082', { p0: String(d.summary.trend) })) +
    kpi(m('skill-calorie.render-html.c083'), m('skill-calorie.render-html.c084', { p0: String(d.summary.weeklyDeficit) }), m('skill-calorie.render-html.c085', { p0: String(d.summary.predictedLossKg) })) +
    kpi(m('skill-calorie.render-html.c086'), m('skill-calorie.render-html.c087', { p0: String(d.summary.avgIntake) }), m('skill-calorie.render-html.c088', { p0: String(d.target.intake) })) +
    kpi(m('skill-calorie.render-html.c089'), m('skill-calorie.render-html.c090', { p0: String(d.summary.avgBurn) }), m('skill-calorie.render-html.c091', { p0: String(d.target.tdee) })) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:deficit', title ?? m('skill-calorie.render-html.c092', { p0: String(d.meta.start), p1: String(d.meta.end) }), body);
}

export function renderDietReviewHtml(r: DietReview): string {
  const t = r.trend.status === 'ok' && r.trend.data ? m('skill-calorie.render-html.c093', { p0: String(r.trend.data.totalCal), p1: String(r.trend.data.avgCal) }) : '—';
  const macroText = r.macro.status === 'ok' && r.macro.data && r.macro.data.protein
    ? m('skill-calorie.render-html.c094', {
      p0: String(r.macro.data.protein.pct),
      p1: String(r.macro.data.carb?.pct),
      p2: String(r.macro.data.fat?.pct),
    })
    : '—';
  const meals = r.byMeal.map((s) => kpi(s.meal, m('skill-calorie.render-html.c095', { p0: String(s.totalCalories) }), m('skill-calorie.render-html.c096', { p0: String(s.days) }))).join('');
  const body =
    '<div class="' + cx('section') + '"><h2>' + m('skill-calorie.render-html.c917', { p0: escapeHtml(r.start), p1: escapeHtml(r.end) }) + '</h2>' +
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c097'), t, m('skill-calorie.render-html.c098', { p0: String(r.loggedDays) })) +
    kpi(m('skill-calorie.render-html.c099'), macroText) +
    '</div></div>' +
    '<div class="' + cx('section') + '"><h2>' + m('skill-calorie.render-html.c918') + '</h2>' +
    '<div class="' + cx('grid') + '">' + meals + '</div></div>';
  return pageShell('calorie', 'ilife:calorie:diet-review', m('skill-calorie.render-html.c100', { p0: String(r.start), p1: String(r.end) }), body);
}

export function renderHealthHtml(h: HealthPlate): string {
  const d = h.dashboard.data;
  const w = d && (d as { weight?: unknown }).weight !== null && (d as { weight?: unknown }).weight !== undefined ? m('skill-calorie.render-html.c101') : m('skill-calorie.render-html.c102');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c103'), h.start + ' ~ ' + h.end, m('skill-calorie.render-html.c104', { p0: String(h.loggedDays) })) +
    kpi(m('skill-calorie.render-html.c105'), fmt(h.avgIntake, m('skill-calorie.render-html.c106'))) +
    kpi(m('skill-calorie.render-html.c107'), fmt(h.avgDeficit, m('skill-calorie.render-html.c108'))) +
    kpi(m('skill-calorie.render-html.c109'), h.dashboard.status === 'ok' ? m('skill-calorie.render-html.c110') : m('skill-calorie.render-html.c111'), m('skill-calorie.render-html.c112', { p0: String(w) })) +
    kpi(m('skill-calorie.render-html.c113'), h.dashboard.message) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:health', m('skill-calorie.render-html.c114', { p0: String(h.start), p1: String(h.end) }), body);
}

export function renderRankingHtml(r: FoodRanking): string {
  const items = r.items
    .slice(0, 10)
    .map((it) => kpi('#' + it.rank + ' ' + it.foodName, m('skill-calorie.render-html.c115', { p0: String(it.totalCal) }), m('skill-calorie.render-html.c116', { p0: String(it.cnt), p1: String(it.avgCalPerMeal) })))
    .join('');
  const body =
    '<div class="' + cx('section') + '"><h2>' + escapeHtml(r.title) + '</h2>' +
    '<div class="' + cx('grid') + '">' + items + '</div></div>';
  return pageShell('calorie', 'ilife:calorie:ranking', m('skill-calorie.render-html.c117', { p0: String(r.category) }), body);
}

export function renderAllRankingsHtml(a: AllRankings): string {
  const parts = (Object.entries(a.boards) as Array<[string, FoodRanking | null]>)
    .map(([cat, b]) => {
      if (!b) return kpi(cat, '—', m('skill-calorie.render-html.c118'));
      const top = b.items[0];
      return kpi(cat, top ? m('skill-calorie.render-html.c119', { p0: String(top.foodName), p1: String(top.totalCal) }) : '—', 'TOP ' + b.topN);
    })
    .join('');
  const body =
    '<div class="' + cx('grid') + '">' + parts + '</div>' +
    '<div style="color:' + token('muted') + '">' + m('skill-calorie.render-html.c919', { p0: escapeHtml(a.start), p1: escapeHtml(a.end), p2: String(a.okCount) }) + '</div>';
  return pageShell('calorie', 'ilife:calorie:ranking-all', m('skill-calorie.render-html.c120'), body);
}

export function renderProductSearchHtml(s: ProductSearch): string {
  const items = s.items
    .slice(0, 10)
    .map((p) => kpi(p.product_name, m('skill-calorie.render-html.c121', { p0: String(p.calories) }), m('skill-calorie.render-html.c122', { p0: String(p.brand ?? ''), p1: String(p.protein) })))
    .join('');
  const body =
    '<div class="' + cx('grid') + '">' + kpi(m('skill-calorie.render-html.c123'), s.keyword, m('skill-calorie.render-html.c124', { p0: String(s.total) })) + '</div>' +
    '<div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:search', m('skill-calorie.render-html.c125', { p0: String(s.keyword) }), body);
}

export function renderProductLibraryHtml(l: ProductLibrary): string {
  const items = l.items
    .slice(0, 10)
    .map((p) => kpi(p.product_name, m('skill-calorie.render-html.c126', { p0: String(p.calories) }), (p.brand ?? '') + '·' + (p.category ?? '')))
    .join('');
  const body =
    '<div class="' + cx('grid') + '">' + kpi(m('skill-calorie.render-html.c127'), l.category ?? m('skill-calorie.render-html.c128'), m('skill-calorie.render-html.c129', { p0: String(l.total) })) + '</div>' +
    '<div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:library', m('skill-calorie.render-html.c130'), body);
}

export function renderProductStatsHtml(s: ProductStats): string {
  const items = s.stats.map((x) => kpi(x.source, m('skill-calorie.render-html.c131', { p0: String(x.count) }))).join('');
  const body =
    '<div class="' + cx('grid') + '">' + kpi(m('skill-calorie.render-html.c132'), m('skill-calorie.render-html.c133', { p0: String(s.total) })) + '</div>' +
    '<div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:library-stats', m('skill-calorie.render-html.c134'), body);
}
export function renderWeightHtml(w: WeightDashboard): string {
  const t = w.trend;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c135'), t.firstWeight + ' → ' + t.lastWeight + ' kg', t.firstDate + ' ~ ' + t.lastDate) +
    kpi(m('skill-calorie.render-html.c136'), t.avgWeight + ' kg', m('skill-calorie.render-html.c137', { p0: String(t.recordCount) })) +
    kpi(m('skill-calorie.render-html.c138'), (t.changeKg >= 0 ? '+' : '') + t.changeKg + ' kg', m('skill-calorie.render-html.c139', { p0: String(t.trendCn) })) +
    kpi(m('skill-calorie.render-html.c140'), fmt(w.weightGoal, ' kg'), w.deadline ? m('skill-calorie.render-html.c141', { p0: String(w.deadline) }) : m('skill-calorie.render-html.c142')) +
    kpi(m('skill-calorie.render-html.c143'), w.gapKg === null ? '—' : (w.gapKg >= 0 ? '+' : '') + w.gapKg + ' kg') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:weight', m('skill-calorie.render-html.c144', { p0: String(w.start), p1: String(w.end) }), body);
}

export function renderWeightHistoryHtml(h: WeightHistoryView): string {
  const rows = h.rows.slice(0, 10).map((r) => kpi(r.date, r.weight_kg + ' kg', (r.note ?? '') + ' BMI ' + (r.bmi ?? '—'))).join('');
  const ch = h.change ? m('skill-calorie.render-html.c145', {
    p0: String(h.change.delta >= 0 ? '+' : ''),
    p1: String(h.change.delta),
    p2: String(h.change.spanDays),
  }) : m('skill-calorie.render-html.c146');
  const body =
    '<div class="' + cx('grid') + '">' + kpi(m('skill-calorie.render-html.c147'), h.range, ch) + '</div>' +
    '<div class="' + cx('grid') + '">' + rows + '</div>';
  return pageShell('calorie', 'ilife:calorie:weight-history', m('skill-calorie.render-html.c148', { p0: String(h.range) }), body);
}

export function renderWeightCompareHtml(v: WeightCompareView): string {
  const c = v.compare;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c149'), (c.avgDiff >= 0 ? '+' : '') + c.avgDiff + ' kg', c.direction) +
    kpi(m('skill-calorie.render-html.c150'), c.currentPeriod.avgWeight + ' kg', v.start + ' ~ ' + v.end) +
    kpi(m('skill-calorie.render-html.c151'), c.comparePeriod.avgWeight + ' kg', v.compareStart + ' ~ ' + v.compareEnd) +
    kpi(m('skill-calorie.render-html.c152'), c.speedLabel) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:weight-compare', m('skill-calorie.render-html.c153'), body);
}

export function renderWeightReviewHtml(v: WeightReviewView): string {
  const milestone = v.milestone;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c154'), milestone.currentWeight + ' kg', milestone.currentDate) +
    kpi(m('skill-calorie.render-html.c155'), milestone.weightGoal + ' kg', milestone.deadline ? m('skill-calorie.render-html.c156', { p0: String(milestone.deadline) }) : m('skill-calorie.render-html.c157')) +
    kpi(m('skill-calorie.render-html.c158'), (milestone.gapKg >= 0 ? '+' : '') + milestone.gapKg + ' kg') +
    kpi(m('skill-calorie.render-html.c159'), milestone.status) +
    kpi(m('skill-calorie.render-html.c160'), milestone.estDate ?? '—', milestone.estDays === null || milestone.estDays === undefined ? '' : m('skill-calorie.render-html.c161', { p0: String(milestone.estDays) })) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:weight-review', m('skill-calorie.render-html.c162', { p0: String(v.today) }), body);
}

export function renderVolatilityHtml(v: VolatilityView): string {
  const o = v.volatility;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c163'), m('skill-calorie.render-html.c164', { p0: String(o.baselineValue) }), o.baselineToggleLabel) +
    kpi(m('skill-calorie.render-html.c165'), m('skill-calorie.render-html.c166', { p0: String(o.thresholds.yellow), p1: String(o.thresholds.red) }), 'σ=' + o.baselineSigma + 'kg') +
    kpi(m('skill-calorie.render-html.c167'), o.earlyWarning.message, o.earlyWarning.date + ' ' + o.earlyWarning.kg + 'kg') +
    kpi(m('skill-calorie.render-html.c168'), m('skill-calorie.render-html.c169', { p0: String(o.recentAnomalies.length) }), m('skill-calorie.render-html.c170', { p0: String(o.points.length) })) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:volatility', m('skill-calorie.render-html.c171', { p0: String(v.start), p1: String(v.end) }), body);
}

export function renderBodyCompositionHtml(v: BodyCompositionView): string {
  const items = v.items.slice(0, 8).map((r) => {
    const d = r as { date?: unknown; body_fat_pct?: unknown; source?: unknown };
    return kpi(String(d.date ?? ''), String(d.body_fat_pct ?? '—') + '%', String(d.source ?? ''));
  }).join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c172'), v.source ?? m('skill-calorie.render-html.c173'), m('skill-calorie.render-html.c174', { p0: String(v.total) })) +
    kpi(m('skill-calorie.render-html.c175'), v.latestPct === null ? '—' : v.latestPct + '%') +
    kpi(m('skill-calorie.render-html.c176'), m('skill-calorie.render-html.c177', { p0: String(v.trend.length) })) +
    '</div><div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:body-composition', m('skill-calorie.render-html.c178'), body);
}

export function renderBodyMeasureHtml(v: BodyMeasureView): string {
  const items = v.items.slice(0, 8).map((r) => {
    const d = r as Record<string, unknown>;
    return kpi(String(d['date'] ?? ''), v.metric ? String(d[v.metric] ?? '—') + 'cm' : m('skill-calorie.render-html.c179'), String(d['note'] ?? ''));
  }).join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c180'), v.metric ?? m('skill-calorie.render-html.c181'), m('skill-calorie.render-html.c182', { p0: String(v.total) })) +
    kpi(m('skill-calorie.render-html.c183'), v.latestVal === null ? '—' : v.latestVal + 'cm', v.metric ?? '') +
    kpi(m('skill-calorie.render-html.c184'), m('skill-calorie.render-html.c185', { p0: String(v.trend.length) })) +
    '</div><div class="' + cx('grid') + '">' + items + '</div>';
  return pageShell('calorie', 'ilife:calorie:body-measure', m('skill-calorie.render-html.c186'), body);
}

/** T351 视觉修复·实施兵B：计划四函数改薄委托，整页装配住 `workoutPlanDocs.ts`
 *（老 `workout_plan_view`／`process_progress` 版式装新数据＋复制数据/复制日志双按钮）。
 * 签名兼容旧调用（第二参可选）；`workout/plan.ts` 与 `workout/wizard.ts` 传真 key／命令原文，
 * 直调旧签名的按缺省命令出口（复制日志仍可照抄重跑该查询命令）。 */
export function renderPlanHtml(v: PlanView, opts?: { key?: string; command?: string; wakeWord?: string }): string {
  return buildPlanResultDoc(v, {
    key: opts?.key ?? 'calorie.view.plan',
    command: opts?.command ?? 'calorie-cmd-read calorie.view.plan',
    wakeWord: opts?.wakeWord,
  });
}

export function renderPlanVsActualHtml(v: PlanVsActualView, opts?: { key?: string; command?: string }): string {
  return buildPlanVsActualDoc(v, {
    key: opts?.key ?? 'calorie.view.plan-vs-actual',
    command: opts?.command ?? 'calorie-cmd-read calorie.view.plan-vs-actual',
  });
}

export function renderPlanWritePreviewHtml(v: WritePreview, opts?: { key?: string; command?: string; prompt?: string }): string {
  return buildPlanProcessDoc(v, {
    key: opts?.key ?? 'calorie.view.plan-write-preview',
    command: opts?.command ?? 'calorie-cmd-read calorie.view.plan-write-preview',
    prompt: opts?.prompt,
  });
}

export function renderPlanWizardHtml(v: PlanWizardView, opts?: { key?: string; command?: string; prompt?: string }): string {
  return buildPlanWizardDoc(v, {
    key: opts?.key ?? 'calorie.view.plan-wizard',
    command: opts?.command ?? 'calorie-cmd-read calorie.view.plan-wizard',
    prompt: opts?.prompt,
  });
}

export function renderExerciseGoalHtml(v: ExerciseGoalView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c187'), v.start + ' ~ ' + v.end, m('skill-calorie.render-html.c188', { p0: String(v.days) })) +
    kpi(m('skill-calorie.render-html.c189'), m('skill-calorie.render-html.c190', { p0: String(v.goalTotal) }), m('skill-calorie.render-html.c191', { p0: String(v.dailyGoal) })) +
    kpi(m('skill-calorie.render-html.c192'), m('skill-calorie.render-html.c193', { p0: String(v.actual) }), v.achieved ? m('skill-calorie.render-html.c194') : m('skill-calorie.render-html.c195')) +
    kpi(m('skill-calorie.render-html.c196'), v.pct === null ? '—' : v.pct + '%', m('skill-calorie.render-html.c197', { p0: String(v.gap) })) +
    '</div>' + bar(m('skill-calorie.render-html.c198'), v.pct);
  return pageShell('calorie', 'ilife:calorie:exercise-goal', m('skill-calorie.render-html.c199'), body);
}

export function renderGoalExpiringHtml(v: GoalExpiringView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c200'), v.deadline, v.expiring ? m('skill-calorie.render-html.c201') : m('skill-calorie.render-html.c202')) +
    kpi(m('skill-calorie.render-html.c203'), m('skill-calorie.render-html.c204', { p0: String(v.daysLeft) }), m('skill-calorie.render-html.c205', { p0: String(v.withinDays) })) +
    kpi(m('skill-calorie.render-html.c206'), fmt(v.weightGoal, ' kg')) +
    kpi(m('skill-calorie.render-html.c207'), v.calorieGoal === null ? '—' : m('skill-calorie.render-html.c208', { p0: String(v.calorieGoal) })) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:goal-expiring', m('skill-calorie.render-html.c209'), body);
}

export function renderGoalPredictHtml(v: GoalPredictView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c210'), m('skill-calorie.render-html.c211', { p0: String(v.targetKg) }), v.start + ' ~ ' + v.end) +
    kpi(m('skill-calorie.render-html.c212'), v.current + ' kg') +
    kpi(m('skill-calorie.render-html.c213'), v.eta, m('skill-calorie.render-html.c214', { p0: String(v.daysLeft) })) +
    kpi(m('skill-calorie.render-html.c215'), m('skill-calorie.render-html.c216', { p0: String(v.ratePerWeek) }), v.feasible ? m('skill-calorie.render-html.c217') : m('skill-calorie.render-html.c218')) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:goal-predict', m('skill-calorie.render-html.c219'), body);
}

export function renderGoalVsActualHtml(v: GoalVsActualView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c220'), v.start + ' ~ ' + v.end, m('skill-calorie.render-html.c221', {
      p0: String(v.completedCount),
      p1: String(v.completedCount + v.incompleteCount),
    })) +
    kpi(m('skill-calorie.render-html.c222'), v.calorieGoal === null ? '—' : m('skill-calorie.render-html.c223', { p0: String(v.calorieGoal) })) +
    kpi(m('skill-calorie.render-html.c224'), v.completionPct === null ? '—' : v.completionPct + '%') +
    kpi(m('skill-calorie.render-html.c225'), m('skill-calorie.render-html.c226', { p0: String(v.trendAvg) })) +
    '</div>' + bar(m('skill-calorie.render-html.c227'), v.completionPct);
  return pageShell('calorie', 'ilife:calorie:goal-vs-actual', m('skill-calorie.render-html.c228'), body);
}

export function renderPredictHtml(v: PredictView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c229'), v.current + ' → ' + v.forecastValue + ' kg', m('skill-calorie.render-html.c230', { p0: String(v.horizonDays) })) +
    kpi(m('skill-calorie.render-html.c231'), m('skill-calorie.render-html.c232', { p0: String(v.ratePerWeek) })) +
    kpi(m('skill-calorie.render-html.c233'), (v.forecastLo ?? '—') + ' ~ ' + (v.forecastHi ?? '—') + ' kg') +
    '</div><div style="color:' + token('muted') + '">' + escapeHtml(v.insight) + '</div>';
  return pageShell('calorie', 'ilife:calorie:predict', m('skill-calorie.render-html.c234'), body);
}

export function renderAnomalyHtml(v: AnomalyView): string {
  const findings = v.diagnosis.findings.slice(0, 5).map((f) => '<div><b>' + escapeHtml(f.cause) + '</b><div>' + escapeHtml(f.evidence) + '</div><div>' + escapeHtml(f.action) + '</div></div>').join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c235'), v.kind, v.start + ' ~ ' + v.end) +
    kpi(m('skill-calorie.render-html.c236'), m('skill-calorie.render-html.c237', { p0: String(v.findingCount) }), v.diagnosis.title) +
    '</div><div>' + findings + '</div><div style="color:' + token('muted') + '">' + escapeHtml(v.diagnosis.insight) + '</div>';
  return pageShell('calorie', 'ilife:calorie:anomaly', m('skill-calorie.render-html.c238', { p0: String(v.kind) }), body);
}

export function renderContraHtml(v: ContraView): string {
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c239'), v.summaryStatus, m('skill-calorie.render-html.c240', { p0: String(v.part) })) +
    kpi(m('skill-calorie.render-html.c241'), m('skill-calorie.render-html.c242', { p0: String(v.scannedSessions) }), m('skill-calorie.render-html.c243', { p0: String(v.scannedMovements) })) +
    kpi('error', m('skill-calorie.render-html.c244', { p0: String(v.errorCount) })) +
    kpi('warn', m('skill-calorie.render-html.c245', { p0: String(v.warnCount) })) +
    kpi('info', m('skill-calorie.render-html.c246', { p0: String(v.infoCount) })) +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:contraindication', m('skill-calorie.render-html.c247'), body);
}

export function renderDedupeHtml(v: DedupeView): string {
  const groups = v.groups.slice(0, 8).map((g) => kpi(escapeHtml(g.productName), g.ids.join(',') , m('skill-calorie.render-html.c248', { p0: String(g.brand ?? ''), p1: String(g.ids.length) }))).join('');
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c249'), m('skill-calorie.render-html.c250', { p0: String(v.groupCount) }), m('skill-calorie.render-html.c251', { p0: String(v.rowCount), p1: String(v.totalProducts) })) +
    '</div><div class="' + cx('grid') + '">' + groups + '</div>';
  return pageShell('calorie', 'ilife:calorie:dedupe', m('skill-calorie.render-html.c252'), body);
}

export function renderProfileHtml(v: ProfileView): string {
  const p = v.profile;
  const body =
    '<div class="' + cx('grid') + '">' +
    kpi(m('skill-calorie.render-html.c253'), m('skill-calorie.render-html.c254', { p0: String(p.gender ?? '—'), p1: String(p.age ?? '—') }), m('skill-calorie.render-html.c255', { p0: String(p.height_cm ?? '—') })) +
    kpi(m('skill-calorie.render-html.c256'), p.activity_level ?? '—') +
    kpi(m('skill-calorie.render-html.c257'), p.note ?? '') +
    kpi(m('skill-calorie.render-html.c258'), v.hasGoal ? m('skill-calorie.render-html.c259') : m('skill-calorie.render-html.c260'), v.nutrition ? m('skill-calorie.render-html.c261', { p0: String(v.nutrition.calorie_goal) }) : '') +
    kpi(m('skill-calorie.render-html.c262'), v.latestWeightKg === null ? '—' : v.latestWeightKg + ' kg') +
    '</div>';
  return pageShell('calorie', 'ilife:calorie:profile', m('skill-calorie.render-html.c263'), body);
}

