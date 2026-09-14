/** #281 · 对比两张照片整页文档（完整文档＋内嵌照片＋复制区）。
 *
 * 取数仍是 `photo.ts` 的 `buildCompareData`（并排＋间隔天数＋跨标签警告口径不变），
 * 本件只做呈现组装：间隔横幅（N 等于两张照片日期差）＋跨标签警告（老实物
 * `body_photo_compare.html:75` 行文保留）＋双卡对照（内嵌 `data:image/`，缺失明示
 * 哪张，缺失不牵连正常照片）＋明细表（缺值 `—`，复制数据保留原始空值）＋复制区，
 * 经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 * 体积沿用 t341 首定 `PHOTO_LIST_PAGE_MAX_BYTES`（定义只在 `galleryDoc.ts`，本件只
 * 引用不另定；超预算即横幅「已嵌 N 张／还有 M 张未嵌入」＋替代操作，逐张弃最大者）。
 * `src/render/html.ts` 已超线只读：本件不调它的照片段。
 */
import { escapeHtml } from 'base-paint';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import { embedPhotos, type PhotoEmbed } from './photoThumb.js';
import type { CompareData, PhotoCard } from './photo.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

/** 跨标签警告行文案（老实物 `:75` 保留＋本仓 `html.ts:173-175` 同义句合并）。 */
const CROSS_TAG_TEXT = '跨标签对比警告：两张照片标签不同，非同标签对比，可比性较弱，建议对比同角度(同标签)照片';

function tagsText(p: PhotoCard): string {
  return p.tagList.length > 0 ? p.tagList.map(escapeHtml).join('、') : '无标签';
}

function existsText(p: PhotoCard): string {
  return p.fileExists === null ? '文件未校验' : p.fileExists ? '文件存在' : '文件缺失';
}

function fileKeyOf(photoPath: string): string {
  return photoPath.split('/').pop()?.split('\\').pop() ?? photoPath;
}

/** 单卡：内嵌图（`data:image/`）或缺失句（超预算弃嵌另注原因，正常照片不受牵连）。 */
function cardHtml(p: PhotoCard, e: PhotoEmbed | undefined, dropped: boolean): string {
  const img = !dropped && e?.dataUri
    ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" />'
    : '<div>照片未内嵌（' + escapeHtml(dropped ? '超预算未内嵌：' + (e?.fileName ?? fileKeyOf(p.photoPath)) : (e?.missing ?? '未知原因')) + '）</div>';
  return '<figure data-id="' + p.id + '">' + img +
    '<figcaption>#' + p.id + ' ' + escapeHtml(p.date) + ' ' + escapeHtml(p.time ?? '') +
    ' ' + tagsText(p) + ' · ' + escapeHtml(fileKeyOf(p.photoPath)) + ' · ' + existsText(p) + '</figcaption></figure>';
}

/** 明细行（可见文本缺值一律 `—`）。 */
function detailRows(c: CompareData): Array<Record<string, unknown>> {
  return [c.photo1, c.photo2].map((p) => ({
    id: p.id, date: p.date, tags: p.tagList.join('、') || '—',
    note: p.note ?? '—', file: fileKeyOf(p.photoPath),
    status: p.fileExists === null ? '未校验' : p.fileExists ? '存在' : '缺失',
  }));
}

function contentOf(c: CompareData, embeds: readonly PhotoEmbed[], dropped: ReadonlySet<string>): string {
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const okCount = embeds.filter((e) => e.dataUri !== null && !dropped.has(e.fileName)).length;
  const parts: string[] = [renderKpiGrid([
    { label: '间隔', value: c.intervalDays + ' 天', detail: c.orderByDate ? '按日期正序' : '按日期倒序' },
    { label: '可比性', value: c.crossTagWarning ? '跨标签' : '同标签', detail: c.crossTagWarning ? '可比性较弱' : '同角度可比' },
    { label: '内嵌', value: okCount + '/' + embeds.length + ' 张', detail: dropped.size === 0 ? '无缺失' : '超预算未嵌 ' + dropped.size + ' 张' },
  ])];
  // 间隔横幅（老页 `body_photo_compare.html:98`）：大数字 N 等于两张照片日期差。
  parts.push('<div>间隔 <b>' + c.intervalDays + '</b> 天</div>');
  if (c.crossTagWarning) parts.push('<div>' + escapeHtml(CROSS_TAG_TEXT) + '</div>');
  if (dropped.size > 0) {
    parts.push('<div>超预算横幅：已嵌入 ' + okCount + ' 张，还有 ' + dropped.size +
      ' 张未嵌入（单页上限 1 MiB）· 替代操作：改查单张详情分看，或换小图后重跑</div>');
  }
  parts.push('<div>' + [c.photo1, c.photo2].map((p) =>
    cardHtml(p, byName.get(fileKeyOf(p.photoPath)), dropped.has(fileKeyOf(p.photoPath))),
  ).join('') + '</div>');
  parts.push(renderDataTable({
    columns: [
      { key: 'id', label: 'ID', align: 'right' },
      { key: 'date', label: '日期' },
      { key: 'tags', label: '标签' },
      { key: 'note', label: '备注' },
      { key: 'file', label: '文件' },
      { key: 'status', label: '状态' },
    ],
    rows: detailRows(c),
    caption: '对照明细（照片 #' + c.photo1.id + ' vs #' + c.photo2.id + '）',
    emptyText: '无对照明细',
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.photo.compare',
      data: {
        items: [c.photo1, c.photo2].map((p) => ({ id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists })),
        total: 2,
      },
    },
  }));
  return parts.join('');
}

function shellOf(c: CompareData, content: string): string {
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '对比两张照片 · 间隔 ' + c.intervalDays + ' 天',
    eyebrow: 'calorie.photo.compare · 身材照片域',
    subtitle: '照片 #' + c.photo1.id + ' vs #' + c.photo2.id,
    content,
    charts: false,
  });
}

/** 对比整页：完整文档（doctype 起、charset、版面、复制区）＋双卡内嵌＋超预算横幅。 */
export function buildPhotoCompareDoc(c: CompareData, photosDir?: string | null): string {
  const embeds = embedPhotos(photosDir ?? null, [c.photo1, c.photo2]);
  // 超预算即逐张弃最大者（最多两轮），横幅报「已嵌 N／还有 M」＋替代操作。
  const dropped = new Set<string>();
  let html = shellOf(c, contentOf(c, embeds, dropped));
  for (let round = 0; round < 2; round += 1) {
    if (Buffer.byteLength(html, 'utf8') <= PHOTO_LIST_PAGE_MAX_BYTES) break;
    const rest = embeds.filter((e) => e.dataUri !== null && !dropped.has(e.fileName))
      .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
    if (rest.length === 0) break;
    dropped.add((rest[0] as PhotoEmbed).fileName);
    html = shellOf(c, contentOf(c, embeds, dropped));
  }
  return html;
}
