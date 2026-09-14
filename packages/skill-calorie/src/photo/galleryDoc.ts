/** #341 · 看身材照整页文档（完整文档＋内嵌照片＋复制区）。
 *
 * `gallery.ts` 的调用处（票面“gallery 调用处”即本件）：取数仍是 `photo.ts` 的
 * `buildGalleryData`，本件只做呈现组装——KPI＋内嵌照片＋缺失明示＋明细表＋复制区，
 * 经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 * 体重参考切片：`src/weight/plateDocs.ts`（KPI＋表＋`dataCopyArea`＋`assembleDocPage`）。
 */
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import type { GalleryData } from './photo.js';
import { embedPhotos, type PhotoEmbed } from './photoThumb.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

/** 单页体积上限（字节）：本票首定，供 281／282／352 复用（见 t341 文档）。
 * 实测 2 张小图约 60KB（含 ~60KB 文档壳）；1 MiB 直嵌仅容 3~4 张 200KB 实拍，
 * 超限即测试红，不静默放宽（超限策略见 t341 文档体积节）。 */
export const PHOTO_LIST_PAGE_MAX_BYTES = 1024 * 1024;

function figureHtml(
  p: { id: number; date: string; time: string | null; photoPath: string; tagList: string[]; note: string | null; fileExists: boolean | null },
  e: PhotoEmbed,
): string {
  const tags = p.tagList.length > 0 ? p.tagList.map(escapeHtml).join('、') : '无标签';
  const exists = p.fileExists === null ? '文件未校验' : p.fileExists ? '文件存在' : '文件缺失';
  const img = e.dataUri !== null
    ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" />'
    : '<div>照片未内嵌（' + escapeHtml(e.missing ?? '未知原因') + '）</div>';
  return '<figure data-id="' + p.id + '">' + img +
    '<figcaption>#' + p.id + ' ' + escapeHtml(p.date) + ' ' + escapeHtml(p.time ?? '') +
    ' ' + tags + ' · ' + escapeHtml(p.photoPath ?? (e.fileName)) + ' · ' + exists + '</figcaption></figure>';
}

/** 看身材照整页：完整文档（doctype 起、charset、版面、复制区）＋内嵌照片＋缺失明示。 */
export function buildPhotoListDoc(g: GalleryData, photosDir?: string | null): string {
  const embeds = embedPhotos(photosDir ?? null, g.photos);
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const okCount = embeds.filter((e) => e.dataUri !== null).length;
  const missingCount = embeds.length - okCount;
  const parts: string[] = [renderKpiGrid([
    { label: '共', value: g.totalCount + ' 张', detail: g.filters.dateFrom + ' ~ ' + g.filters.dateTo },
    { label: '标签筛选', value: g.filters.tag || '全部' },
    { label: '距上次拍照', value: g.daysSinceLast === null ? '—' : g.daysSinceLast + ' 天' },
    { label: '内嵌', value: okCount + '/' + embeds.length + ' 张', detail: missingCount === 0 ? '无缺失' : '缺失 ' + missingCount + ' 张' },
  ])];
  parts.push('<div>' + g.photos.map((p) => {
    const e = byName.get(p.photoPath.split('/').pop()?.split('\\').pop() ?? p.photoPath) as PhotoEmbed;
    return figureHtml({ ...p, photoPath: p.photoPath }, e);
  }).join('') + '</div>');
  const missing = g.photos.filter((p) => {
    const e = byName.get(p.photoPath.split('/').pop()?.split('\\').pop() ?? p.photoPath) as PhotoEmbed | undefined;
    return !e || e.dataUri === null;
  });
  parts.push(missing.length === 0
    ? '<div>照片齐全（' + embeds.length + ' 张均已内嵌）</div>'
    : '<div>缺失照片 ' + missing.length + ' 张：' + missing.map((p) => {
      const key = p.photoPath.split('/').pop()?.split('\\').pop() ?? p.photoPath;
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
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '看身材照 · ' + g.totalCount + ' 张',
    eyebrow: 'calorie.photo.list · 身材照片域',
    subtitle: g.filters.tag ? '标签 ' + g.filters.tag : null,
    content: parts.join(''),
    charts: false,
  });
}
