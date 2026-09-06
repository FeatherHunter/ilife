/** T10 #29 · 身材照片 HTML 串模板（住包内，无外部模板文件；风格只引 base-render tokens）。
 *
 * 红线：样式常量一律走 token()/cx()（base-render 唯一真相源），本包不自带颜色/
 * 圆角/字号常量；转义走 base-render escapeHtml；数值在本层不做数学。
 * 二进制原样：照片只 render 文件名 <img> 引用 + fileExists 位，不嵌 base64；
 * 动图只 render 任务描述，不嵌 GIF。
 */
import { cx, escapeHtml, token } from '@feather_wch/base-render';
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
