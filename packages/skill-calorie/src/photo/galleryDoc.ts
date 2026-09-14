/** #341 · 看身材照整页文档（完整文档＋内嵌照片＋复制区）。
 *
 * `gallery.ts` 的调用处（票面“gallery 调用处”即本件）：取数仍是 `photo.ts` 的
 * `buildGalleryData`，本件只做呈现组装——KPI＋内嵌照片＋缺失明示＋明细表＋复制区，
 * 经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 * 体重参考切片：`src/weight/plateDocs.ts`（KPI＋表＋`dataCopyArea`＋`assembleDocPage`）。
 *
 * #438 · 体积退让：渲染期按 `PHOTO_LIST_PAGE_MAX_BYTES` 逐张试嵌（口径与取值均沿用
 * t400 裁定 3，见 t438 文档）。横幅报「已嵌 N 张／还有 M 张未嵌入」并指路（标签或
 * 日期筛选分次看），触发与 M 只按**预算跳过计数**（文件缺失不进横幅，见 §一 整改）；
 * 超出张数走占位态写明原因；**复制数据仍是全量行**（只截断内嵌，不截断数据）。
 * 缺失明示与三态占位口径一字未改。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
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

function figureHtml(p: PhotoCard, e: PhotoEmbed | undefined, skipReason: string | undefined): string {
  const tags = p.tagList.length > 0 ? p.tagList.map(escapeHtml).join('、') : '无标签';
  const exists = p.fileExists === null ? '文件未校验' : p.fileExists ? '文件存在' : '文件缺失';
  const fileName = e?.fileName ?? fileNameOf(p.photoPath);
  const img = e?.dataUri != null
    ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" />'
    : '<div>照片未内嵌（' + escapeHtml(skipReason ?? e?.missing ?? '未知原因') + '）</div>';
  return '<figure data-id="' + p.id + '">' + img +
    '<figcaption>#' + p.id + ' ' + escapeHtml(p.date) + ' ' + escapeHtml(p.time ?? '') +
    ' ' + tags + ' · ' + escapeHtml(fileName) + ' · ' + exists + '</figcaption></figure>';
}

/** 体积横幅（老正本 `body_photo_gallery.html:143-151` 口径：N／M 两数＋替代操作指路）。
 *  M 与触发一律取**预算跳过计数**（老正本 `embed_skipped_count`）：文件缺失态由缺失明示行
 *  承担、不进横幅——否则「3 张正常照＋1 张缺文件」也会弹预算横幅并写错归因。 */
function budgetBannerHtml(embeddedCount: number, budgetSkippedCount: number): string {
  if (budgetSkippedCount <= 0) return '';
  return '<div class="budget-banner">照片较多：已嵌 ' + embeddedCount + ' 张／还有 ' +
    budgetSkippedCount + ' 张未嵌入（按体积预算，单页上限 ' + PHOTO_LIST_PAGE_MAX_BYTES +
    ' 字节）。替代操作：用「标签」或日期筛选分次查看。</div>';
}

/** 本窗张数明细句：缺失 N 张（缺文件／不可读）＋超单页预算 M 张。 */
function detailOf(g: GalleryData, embeds: PhotoEmbed[], skipReason: ReadonlyMap<string, string>): string {
  const missing = g.photos.filter((p) => {
    const e = embeds.find((x) => x.fileName === fileNameOf(p.photoPath));
    return skipReason.get(fileNameOf(p.photoPath)) === undefined && isNonBudgetSkip(e);
  }).length;
  const skipped = skipReason.size;
  if (missing === 0 && skipped === 0) return '无缺失';
  const seg: string[] = [];
  if (missing > 0) seg.push('缺失 ' + missing + ' 张');
  if (skipped > 0) seg.push('超预算未嵌 ' + skipped + ' 张');
  return seg.join(' · ');
}

function contentOf(
  g: GalleryData,
  embeds: PhotoEmbed[],
  skipReason: ReadonlyMap<string, string>,
): string {
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const embeddedCount = embeds.filter((e) => e.dataUri !== null).length;
  const missingCount = embeds.filter((e) => isNonBudgetSkip(e) && skipReason.get(e.fileName) === undefined).length;
  const restCount = embeds.length - embeddedCount;
  const parts: string[] = [];
  // 横幅的 M＝`skipReason` 活表（预算挑选＋兜底轮都记这里），不是本窗总张数减内嵌数。
  parts.push(budgetBannerHtml(embeddedCount, skipReason.size));
  parts.push(renderKpiGrid([
    { label: '共', value: g.totalCount + ' 张', detail: g.filters.dateFrom + ' ~ ' + g.filters.dateTo },
    { label: '标签筛选', value: g.filters.tag || '全部' },
    { label: '距上次拍照', value: g.daysSinceLast === null ? '—' : g.daysSinceLast + ' 天' },
    { label: '内嵌', value: embeddedCount + '/' + embeds.length + ' 张', detail: detailOf(g, embeds, skipReason) },
  ]));
  parts.push('<div>' + g.photos.map((p) => {
    const key = fileNameOf(p.photoPath);
    return figureHtml(p, byName.get(key), skipReason.get(key));
  }).join('') + '</div>');
  const missing = g.photos.filter((p) => {
    const key = fileNameOf(p.photoPath);
    return skipReason.get(key) === undefined && isNonBudgetSkip(byName.get(key));
  });
  parts.push(missing.length === 0
    ? '<div>' + (restCount === 0
      ? '照片齐全（' + embeds.length + ' 张均已内嵌）'
      : '本窗照片文件齐全（' + restCount + ' 张因体积预算未嵌入，见上方横幅）') + '</div>'
    : '<div>缺失照片 ' + missingCount + ' 张：' + missing.map((p) => {
      const key = fileNameOf(p.photoPath);
      const e = byName.get(key);
      return '#' + p.id + ' ' + escapeHtml(key) + '（' + escapeHtml(e?.missing ?? '文件缺失') + '）';
    }).join('；') + '</div>');
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
      status: p.fileExists === null ? '未校验' : p.fileExists ? '存在' : '缺失',
    })),
    caption: '身材照明细（' + g.filters.dateFrom + ' ~ ' + g.filters.dateTo + '，共 ' + g.totalCount + ' 张）',
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

/** 看身材照整页：完整文档（doctype 起、charset、版面、复制区）＋按预算内嵌＋缺失明示。 */
export function buildPhotoListDoc(g: GalleryData, photosDir?: string | null): string {
  const shell = (content: string): string => assembleDocPage({
    docTitle: DOC_TITLE,
    title: '看身材照 · ' + g.totalCount + ' 张',
    eyebrow: 'calorie.photo.list · 身材照片域',
    subtitle: g.filters.tag ? '标签 ' + g.filters.tag : null,
    content,
    charts: false,
  });
  // 两步：先算**不含任何内嵌字节**的页面底子，再把剩下的预算按顺序分给逐张照片。
  const baseBytes = Buffer.byteLength(shell(contentOf(g, embedPhotos(null, g.photos), new Map())), 'utf8');
  const picks = embedPhotosWithinBudget(photosDir ?? null, g.photos, baseBytes, PHOTO_LIST_PAGE_MAX_BYTES);
  let html = shell(contentOf(g, picks.embeds, picks.skipReason));
  // 兜底：底子或版面开销估偏时，逐张收回最大的内嵌（最多 3 轮）直到回到上限内。
  for (let round = 0; round < 3 && Buffer.byteLength(html, 'utf8') > PHOTO_LIST_PAGE_MAX_BYTES; round += 1) {
    const rest = picks.embeds.filter((e) => e.dataUri !== null && !picks.skipReason.has(e.fileName))
      .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
    if (rest.length === 0) break;
    const victim = rest[0] as PhotoEmbed;
    picks.skipReason.set(victim.fileName, '体积预算未内嵌');
    html = shell(contentOf(g, picks.embeds, picks.skipReason));
  }
  return html;
}
