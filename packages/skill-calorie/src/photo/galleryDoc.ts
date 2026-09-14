/** #341 · 看身材照整页文档（完整文档＋内嵌照片＋复制区）。
 *
 * `gallery.ts` 的调用处（票面“gallery 调用处”即本件）：取数仍是 `photo.ts` 的
 * `buildGalleryData`，本件只做呈现组装——KPI＋内嵌照片＋缺失明示＋明细表＋复制区，
 * 经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 * 体重参考切片：`src/weight/plateDocs.ts`（KPI＋表＋`dataCopyArea`＋`assembleDocPage`）。
 *
 * #438 · 体积退让：渲染期按 `PHOTO_LIST_PAGE_MAX_BYTES` 逐张试嵌（口径与取值均沿用
 * t400 裁定 3，见 t438 文档）。横幅的**触发与 M 只按预算跳过计数**（文件缺失不进横幅，
 * 见 t438 §一 整改），**复制数据仍是全量行**（只截断内嵌，不截断数据）。退让的版面口径
 * 归 #472 换成公共层静态提示区块（`notice()`）：横幅读数仍是「本页显示几张／还有几张没
 * 显示」两数，只是不再印体积上限这类技术细节。
 *
 * #472（读侧 A 组）· 文本与展示：屏上只留用户看得懂的说法——眉标去掉内部命令名与「域」；
 * KPI 的「共」只留张数、另说「最近一张」；显示／找不到文件／太大没显示三种态用同一套人话词汇；
 * 图注＝日期时刻＋标签＋相对天数（相对天数在**装配层**按 `todayISO()` 现算），文件名收成
 * 可复制小字块，正常张不再逐张喊「文件存在」；缺失清单逐张一行并挂状态徽标；明细表只标异常、
 * 正常行留空。取值口径（预算／缺失／未校验三态归属）与复制数据一字未改。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { escapeHtml, renderStatusBadge } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea, notice } from '../shared/copyArea.js';
import { todayISO } from '../analysis/utils.js';
import { CALORIE_COPY_ACTION, copyActionHtml } from '../render/copy.js';
import type { GalleryData, PhotoCard } from './photo.js';
import { embedPhotos, embedPhotosWithinBudget, type PhotoEmbed } from './photoThumb.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

/** 单页体积上限（字节）：本票首定，供 281／282／352 复用（见 t341 文档）。
 * 实测 2 张小图约 60KB（含 ~60KB 文档壳）；1 MiB 直嵌仅容 3~4 张 200KB 实拍。
 * #438 起本值**真的被渲染路径引用**：`buildPhotoListDoc` 逐张试嵌，超限即退让
 * （横幅明示＋占位态），不再无声全量内嵌（改值须同步四处引用件与 t341 体积节）。 */
export const PHOTO_LIST_PAGE_MAX_BYTES = 1024 * 1024;

/** 文件名键：库内 `photoPath` 可能与内嵌件取的名字不同（补全路径口径），两处都试。 */
function fileNameOf(photoPath: string): string {
  return photoPath.split('/').pop()?.split('\\').pop() ?? photoPath;
}

/** 未内嵌的归属：文件缺失／读取失败／文件过大（内嵌件判的），与体积预算（本件判的）。 */
function isNonBudgetSkip(e: PhotoEmbed | undefined): boolean {
  return e === undefined || e.dataUri === null;
}

/** 没显示的那张给用户看的一句话（#472：内部原因句翻成人话，四态各归各的）。 */
function notShownReason(e: PhotoEmbed | undefined, skipReason: string | undefined): string {
  if (skipReason !== undefined) return '照片太大，本页没显示';
  const raw = e?.missing ?? '';
  if (raw === '') return '这张没显示';
  if (raw.includes('过大')) return '照片太大，本页没显示';
  if (raw.includes('未配照片目录')) return '没配照片目录，读不到文件';
  if (raw.includes('文件缺失')) return '找不到文件：' + (e?.fileName ?? '');
  return '读不出这张照片：' + (e?.fileName ?? '');
}

/** 相对天数（#472 图注第三段）：**装配层**按当刻「今天」现算；未到／算不出即不出这一段。 */
function relativeDays(date: string, today: string): string {
  const days = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(date + 'T12:00:00Z')) / 86400000);
  if (!Number.isFinite(days) || days < 0) return '';
  return days === 0 ? '今天' : days + ' 天前';
}

/** 图注（#472）＝`2026-05-30 17:44 · 正面 · 59 天前`；文件名另起一个可复制小字块；
 *  正常张不再逐张喊「文件存在」（没显示的那张在自己的位置上说明白）。 */
function figureHtml(p: PhotoCard, e: PhotoEmbed | undefined, skipReason: string | undefined, today: string): string {
  const tags = p.tagList.length > 0 ? p.tagList.map(escapeHtml).join('、') : '无标签';
  const fileName = e?.fileName ?? fileNameOf(p.photoPath);
  const img = e?.dataUri != null
    ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" />'
    : '<div>' + escapeHtml(notShownReason(e, skipReason)) + '</div>';
  const caption = [escapeHtml(p.date) + (p.time === null ? '' : ' ' + escapeHtml(p.time.slice(0, 5))),
    tags, relativeDays(p.date, today)].filter((s) => s !== '').join(' · ');
  return '<figure data-id="' + p.id + '">' + img +
    '<figcaption>' + caption + '</figcaption>' +
    '<div><code>' + escapeHtml(fileName) + '</code>'
    + copyActionHtml(fileName, { actionId: CALORIE_COPY_ACTION.actionId, label: '复制文件名' }) + '</div>'
    + '</figure>';
}

/** 体积横幅（#472 改公共层静态提示块）：触发与 M 仍只取**预算跳过计数**（老正本
 *  `embed_skipped_count` 口径；文件缺失态由缺失清单承担、不进这里——否则「3 张正常照＋
 *  1 张缺文件」也会弹这条并写错归因）。老版自造的 `budget-banner` 类全仓无任何样式（已复核），
 *  故改用 `notice()`（`src/shared/copyArea.ts` ⑤，走公共层 `renderFeedbackBlock` 的浅色静态形态）。 */
function budgetNoticeHtml(embeddedCount: number, budgetSkippedCount: number): string {
  if (budgetSkippedCount <= 0) return '';
  return notice({
    msg: '照片较多，本页只显示 ' + embeddedCount + ' 张；还有 ' + budgetSkippedCount + ' 张没显示',
    detail: '可按「标签」或日期分批看',
  });
}

/** 本窗张数明细句（#472 人话版）：找不到文件 N 张／太大没显示 M 张；都齐即不出这一句。 */
function detailOf(g: GalleryData, embeds: PhotoEmbed[], skipReason: ReadonlyMap<string, string>): string {
  const missing = g.photos.filter((p) => {
    const e = embeds.find((x) => x.fileName === fileNameOf(p.photoPath));
    return skipReason.get(fileNameOf(p.photoPath)) === undefined && isNonBudgetSkip(e);
  }).length;
  const skipped = skipReason.size;
  const seg: string[] = [];
  if (missing > 0) seg.push(missing + ' 张找不到文件');
  if (skipped > 0) seg.push(skipped + ' 张太大未显示');
  return seg.join(' · ');
}

/** 本窗最近一张的日期（KPI「共」的说明位；行序按日期倒序，仍取最大值，不依赖行序）。 */
function latestDateOf(g: GalleryData): string {
  return g.photos.reduce((acc, p) => (p.date > acc ? p.date : acc), g.photos[0]?.date ?? '');
}

function contentOf(
  g: GalleryData,
  embeds: PhotoEmbed[],
  skipReason: ReadonlyMap<string, string>,
  today: string,
): string {
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const embeddedCount = embeds.filter((e) => e.dataUri !== null).length;
  const parts: string[] = [];
  // 提示块的 M＝`skipReason` 活表（预算挑选＋兜底轮都记这里），不是本窗总张数减内嵌数。
  parts.push(budgetNoticeHtml(embeddedCount, skipReason.size));
  parts.push(renderKpiGrid([
    { label: '共', value: g.totalCount + ' 张', detail: '最近一张 ' + latestDateOf(g) },
    { label: '标签筛选', value: g.filters.tag || '全部' },
    { label: '距上次拍照', value: g.daysSinceLast === null ? '—' : g.daysSinceLast + ' 天' },
    { label: '本页', value: embeddedCount + ' 张已显示', detail: detailOf(g, embeds, skipReason) },
  ]));
  parts.push('<div>' + g.photos.map((p) => {
    const key = fileNameOf(p.photoPath);
    return figureHtml(p, byName.get(key), skipReason.get(key), today);
  }).join('') + '</div>');
  // 没显示的那几张：逐张一行（#472）——张数已在 KPI 明细里，这里不再重复一遍计数句。
  const missing = g.photos.filter((p) => {
    const key = fileNameOf(p.photoPath);
    return skipReason.get(key) === undefined && isNonBudgetSkip(byName.get(key));
  });
  parts.push(missing.map((p) => {
    const key = fileNameOf(p.photoPath);
    return '<div>#' + p.id + ' · ' + escapeHtml(key) + ' · '
      + renderStatusBadge({ status: 'danger', text: '找不到文件' }) + '</div>';
  }).join(''));
  parts.push(renderDataTable({
    columns: [
      { key: 'id', label: 'ID', align: 'right' },
      { key: 'date', label: '日期' },
      { key: 'tags', label: '标签' },
      { key: 'file', label: '文件' },
      { key: 'status', label: '状态' },
    ],
    rows: g.photos.map((p) => ({
      id: p.id, date: p.date, tags: p.tagList.join('、') || '无标签', file: p.photoPath,
      // 正常行留空（「存在」是零信息值）；异常两个字说清。公共层表格的单元格只收纯文本
      // （`renderDataTable` 的 `cellText` 会转义），徽标由上面那几行缺失清单承担。
      status: p.fileExists === null ? '未校验' : p.fileExists ? '' : '缺文件',
    })),
    caption: '身材照 ' + g.totalCount + ' 张',
    emptyText: '本窗无身材照',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.photo.list',
      data: {
        items: g.photos.map((p) => ({ id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists })),
        total: g.totalCount,
      },
    },
  }));
  return parts.join('');
}

/** 看身材照整页：完整文档（doctype 起、charset、版面、复制区）＋按预算内嵌＋缺失明示。
 *  #472：眉标（内部命令名＋内部词「域」）整行去掉；相对天数按当刻「今天」现算（`todayISO()`）。 */
export function buildPhotoListDoc(g: GalleryData, photosDir?: string | null): string {
  const today = todayISO();
  const shell = (content: string): string => assembleDocPage({
    docTitle: DOC_TITLE,
    title: '看身材照 · ' + g.totalCount + ' 张',
    eyebrow: '',
    subtitle: g.filters.tag ? '标签 ' + g.filters.tag : null,
    content,
    charts: false,
  });
  // 两步：先算**不含任何内嵌字节**的页面底子，再把剩下的预算按顺序分给逐张照片。
  const baseBytes = Buffer.byteLength(shell(contentOf(g, embedPhotos(null, g.photos), new Map(), today)), 'utf8');
  const picks = embedPhotosWithinBudget(photosDir ?? null, g.photos, baseBytes, PHOTO_LIST_PAGE_MAX_BYTES);
  let html = shell(contentOf(g, picks.embeds, picks.skipReason, today));
  // 兜底：底子或版面开销估偏时，逐张收回最大的内嵌（最多 3 轮）直到回到上限内。
  for (let round = 0; round < 3 && Buffer.byteLength(html, 'utf8') > PHOTO_LIST_PAGE_MAX_BYTES; round += 1) {
    const rest = picks.embeds.filter((e) => e.dataUri !== null && !picks.skipReason.has(e.fileName))
      .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
    if (rest.length === 0) break;
    const victim = rest[0] as PhotoEmbed;
    picks.skipReason.set(victim.fileName, '体积预算未内嵌');
    html = shell(contentOf(g, picks.embeds, picks.skipReason, today));
  }
  return html;
}
