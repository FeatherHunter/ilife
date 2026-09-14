/** #281 · 查身材照单张整页文档（完整文档＋内嵌照片＋复制区，兼任删流程快照）。
 *
 * 取数仍是 `photo.ts` 的 `buildViewerData`（同标签 prev／next，首尾 null 口径不变），
 * 本件只做呈现组装：徽章→上下张翻页链（可点，中张双链，首尾禁用无空 href）→大图卡
 * （黑底 75vh contain，老页 `body_photo_viewer.html:28-29` 规则）→快照明细（本页即
 * 删身材照流程的快照：删前先核对本页再删；删记录按新硬删除口径，不可恢复，老页
 * `:98`「文件保留」提示作废）→删改链（删命令 confirm＋返回画廊带标签筛选）＋复制区，
 * 经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 * 体积沿用 t341 首定 `PHOTO_LIST_PAGE_MAX_BYTES`（定义只在 `galleryDoc.ts`，本件只
 * 引用不另定；超预算即横幅「已嵌 N／还有 M」＋替代操作）。
 * `src/render/html.ts` 已超线只读：本件不调它的照片段。
 */
import { escapeHtml } from 'base-paint';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import { embedPhoto, type PhotoEmbed } from './photoThumb.js';
import type { PhotoCard, ViewerData } from './photo.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

/** 翻页命令原文（落盘静态页无稳定单图路由：锚点给可点形态，`data-command` 给照抄重跑命令）。 */
function detailCommand(id: number): string {
  return 'calorie-cmd-read calorie.photo.detail --params \'{"id": ' + id + '}\'';
}

/** 上一张／下一张（老页 `:74-77` 链接＋`:137`／`:142` 置灰）：有邻即锚点，无邻即禁用 span（无空 href，不出坏链）。 */
function navHtml(v: ViewerData): string {
  const prev = v.prevId === null
    ? '<span aria-disabled="true">上一张：无（已到首张，翻页禁用）</span>'
    : '<a href="#photo-' + v.prevId + '" data-command="' + escapeHtml(detailCommand(v.prevId)) + '">← 上一张 #' + v.prevId + '</a>';
  const next = v.nextId === null
    ? '<span aria-disabled="true">下一张：无（已到尾张，翻页禁用）</span>'
    : '<a href="#photo-' + v.nextId + '" data-command="' + escapeHtml(detailCommand(v.nextId)) + '">下一张 #' + v.nextId + ' →</a>';
  return '<div data-nav>' + prev + ' · ' + next + '</div>';
}

/** 大图卡（黑底 75vh contain，老页 `:28-29` 规则；行在库但文件不在即缺失句，不回半页）。 */
function figureHtml(p: PhotoCard, e: PhotoEmbed, dropped: boolean): string {
  const img = !dropped && e.dataUri !== null
    ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" style="max-width:100%;max-height:75vh;object-fit:contain" />'
    : '<div>照片未内嵌（' + escapeHtml(dropped ? '超预算未内嵌：' + e.fileName : (e.missing ?? '未知原因')) + '）</div>';
  const tags = p.tagList.length > 0 ? p.tagList.map(escapeHtml).join('、') : '无标签';
  const exists = p.fileExists === null ? '文件未校验' : p.fileExists ? '文件存在' : '文件缺失';
  return '<figure data-id="' + p.id + '" id="photo-' + p.id + '">' +
    '<div style="background:#000;display:flex;align-items:center;justify-content:center;max-height:75vh;overflow:hidden">' + img + '</div>' +
    '<figcaption>#' + p.id + ' ' + escapeHtml(p.date) + ' ' + escapeHtml(p.time ?? '') +
    ' ' + tags + ' · ' + escapeHtml(p.photoPath) + ' · ' + exists + '</figcaption></figure>';
}

/** 删改链（B-6 新口径）：删走回执流程（confirm＋删命令）＋返回画廊带标签筛选。 */
function actionHtml(p: PhotoCard): string {
  const tag = p.tagList[0] ?? '';
  const backParams = tag ? '{"tag": "' + tag + '"}' : '{}';
  const backCmd = 'calorie-cmd-read calorie.photo.list --params \'' + backParams + '\'';
  const delCmd = 'calorie-cmd-read calorie.photo.remove --params \'{"id": ' + p.id + '}\'';
  return '<div>删除这张：先核对本页快照，确认后再跑（硬删除，不可恢复）</div>' +
    '<pre>' + escapeHtml(delCmd) + '</pre>' +
    '<div>返回画廊（带筛选：标签 ' + escapeHtml(tag || '全部') + '）</div>' +
    '<pre>' + escapeHtml(backCmd) + '</pre>';
}

function contentOf(v: ViewerData, e: PhotoEmbed, dropped: boolean): string {
  const p = v.photo;
  const parts: string[] = [renderKpiGrid([
    { label: '编号', value: '#' + p.id, detail: p.date + ' ' + (p.time ?? '') },
    { label: '标签', value: p.tagList.join('、') || '无标签' },
    {
      label: '内嵌', value: !dropped && e.dataUri !== null ? '1/1 张' : '0/1 张',
      detail: !dropped && e.dataUri !== null ? '无缺失' : (dropped ? '超预算未嵌' : (e.missing ?? '未知原因')),
    },
  ])];
  parts.push(navHtml(v));
  parts.push(figureHtml(p, e, dropped));
  if (dropped) {
    parts.push('<div>超预算横幅：已嵌入 0 张，还有 1 张未嵌入（单页上限 1 MiB）· 替代操作：换小图后重跑，或只看本页文字快照</div>');
  }
  parts.push(renderDataTable({
    columns: [
      { key: 'id', label: 'ID', align: 'right' },
      { key: 'date', label: '日期' },
      { key: 'tags', label: '标签' },
      { key: 'note', label: '备注' },
      { key: 'file', label: '文件' },
      { key: 'status', label: '状态' },
    ],
    rows: [{
      id: p.id, date: p.date, tags: p.tagList.join('、') || '—',
      note: p.note ?? '—', file: p.photoPath,
      status: p.fileExists === null ? '未校验' : p.fileExists ? '存在' : '缺失',
    }],
    caption: '快照明细（删前核对凭据，硬删除，不可恢复）',
    emptyText: '无快照',
  }));
  parts.push('<div>本页即删身材照流程的快照：删前先核对本页，再跑删命令；删后不可恢复</div>');
  parts.push(actionHtml(p));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'detail', key: 'calorie.photo.detail',
      data: {
        item: { id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists, prevId: v.prevId, nextId: v.nextId },
      },
    },
  }));
  return parts.join('');
}

function shellOf(v: ViewerData, content: string): string {
  const p = v.photo;
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '身材照查看 #' + p.id,
    eyebrow: 'calorie.photo.detail · 身材照片域',
    subtitle: p.date + ' · ' + (p.tagList.join('、') || '无标签'),
    content,
    charts: false,
  });
}

/** 单张整页：完整文档（doctype 起、charset、版面、复制区）＋大图内嵌＋翻页链＋快照。 */
export function buildPhotoViewerDoc(v: ViewerData, photosDir?: string | null): string {
  const e = embedPhoto(photosDir ?? null, v.photo.photoPath);
  let dropped = false;
  let html = shellOf(v, contentOf(v, e, dropped));
  if (Buffer.byteLength(html, 'utf8') > PHOTO_LIST_PAGE_MAX_BYTES && e.dataUri !== null) {
    dropped = true;
    html = shellOf(v, contentOf(v, e, dropped));
  }
  return html;
}
