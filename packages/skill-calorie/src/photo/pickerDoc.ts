/** #283 · 删照候选整页文档（候选列表＋单张快照＋可复制 prompt）。
 *
 * 取数与 prompt 由 `picker.ts` 备齐，本件只做呈现组装：KPI＋候选（缩略图＋日期＋标签）
 * ＋快照（只读，无删除动作）＋prompt 复制区＋复制数据，经共用件 `assembleDocPage`
 * 包成 `<!doctype html>` 起的完整文档。缩略体内嵌走 `photoThumb.ts`；单页体积上限
 * 沿用 t341 体积节口径（定义只在 `galleryDoc.ts` 的 `PHOTO_LIST_PAGE_MAX_BYTES`，本件不另定）。
 */
import { renderDataTable, renderEmptyBlock, renderKpiGrid } from 'base-paint/blocks';
import { escapeHtml } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea, promptCopyArea } from '../shared/copyArea.js';
import { embedPhoto, embedPhotos } from './photoThumb.js';
import type { PhotoCard } from './photo.js';
import type { PhotoPickerView } from './picker.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

function tagsText(p: PhotoCard): string {
  return p.tagList.length > 0 ? p.tagList.map(escapeHtml).join('、') : '无标签';
}

function existsText(p: PhotoCard): string {
  return p.fileExists === null ? '文件未校验' : p.fileExists ? '文件存在' : '文件缺失';
}

/** 候选列表：缩略图＋日期＋标签（逐张独立成败，坏图不明示牵连正常照片）。 */
function candidateListHtml(cands: PhotoCard[], photosDir: string | null): string {
  const embeds = embedPhotos(photosDir, cands);
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const items = cands.map((p) => {
    const key = p.photoPath.split('/').pop()?.split('\\').pop() ?? p.photoPath;
    const e = byName.get(key);
    const img = e?.dataUri
      ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" />'
      : '<div>照片未内嵌（' + escapeHtml(e?.missing ?? '未知原因') + '）</div>';
    return '<li data-id="' + p.id + '">' + img +
      '<div>#' + p.id + ' ' + escapeHtml(p.date) + ' ' + tagsText(p) +
      ' · ' + escapeHtml(key) + ' · ' + existsText(p) + '</div></li>';
  }).join('');
  return '<ol>' + items + '</ol>';
}

/** 单张快照：大图＋明细（只读：选中与复制在此页，删除走写命令）。 */
function snapshotHtml(sel: PhotoCard | null, photosDir: string | null): string {
  if (!sel) {
    return renderEmptyBlock({ text: '未选中照片（从候选列表记下 #ID，带上 {"id": <ID>} 重跑本命令看快照）' });
  }
  const e = embedPhoto(photosDir, sel.photoPath);
  const img = e.dataUri !== null
    ? '<img src="' + e.dataUri + '" alt="快照#' + sel.id + '" />'
    : '<div>快照未内嵌（' + escapeHtml(e.missing ?? '未知原因') + '）</div>';
  return '<figure data-snapshot="' + sel.id + '">' + img +
    '<figcaption>快照 #' + sel.id + ' ' + escapeHtml(sel.date) + ' ' + escapeHtml(sel.time ?? '') +
    ' ' + tagsText(sel) + '</figcaption></figure>' +
    renderDataTable({
      columns: [
        { key: 'id', label: 'ID', align: 'right' },
        { key: 'date', label: '日期' },
        { key: 'tags', label: '标签' },
        { key: 'note', label: '备注' },
        { key: 'file', label: '文件' },
        { key: 'status', label: '状态' },
      ],
      rows: [{
        id: sel.id, date: sel.date, tags: sel.tagList.join('、') || '—',
        note: sel.note ?? '—', file: sel.photoPath,
        status: sel.fileExists === null ? '未校验' : sel.fileExists ? '存在' : '缺失',
      }],
      caption: '快照明细（只读，删除走写命令）',
      emptyText: '无快照',
    });
}

/** 删照候选整页：完整文档（doctype 起、charset、版面、复制区）＋候选＋快照＋prompt。 */
export function buildPhotoPickerDoc(v: PhotoPickerView, photosDir: string | null): string {
  const embeds = embedPhotos(photosDir, v.candidates);
  const okCount = embeds.filter((e) => e.dataUri !== null).length;
  const parts: string[] = [renderKpiGrid([
    { label: '候选', value: v.fullCount + ' 张', detail: v.truncated ? '本页 ' + v.candidates.length + ' 张，还有 ' + (v.fullCount - v.candidates.length) + ' 张未列出' : '全部列出' },
    { label: '已选', value: v.selected ? '#' + v.selected.id : '未选', detail: v.selected ? (v.selectedInList ? '在候选窗内' : '不在当前候选窗内') : '先选再看快照' },
    { label: '内嵌', value: okCount + '/' + embeds.length + ' 张', detail: okCount === embeds.length ? '无缺失' : '缺失 ' + (embeds.length - okCount) + ' 张' },
  ])];
  parts.push(candidateListHtml(v.candidates, photosDir));
  parts.push(snapshotHtml(v.selected, photosDir));
  if (v.selected && !v.selectedInList) {
    parts.push(renderEmptyBlock({ text: '已选 #' + v.selected.id + ' 不在当前候选窗内（快照照常显示，候选按筛选条件列出）' }));
  }
  parts.push(promptCopyArea(v.prompt));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.photo-picker',
      data: {
        items: v.candidates.map((p) => ({ id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists })),
        total: v.fullCount,
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '删照候选 · ' + v.fullCount + ' 张',
    eyebrow: 'calorie.view.photo-picker · 身材照片域',
    subtitle: '先列候选 → 快照确认 → 复制 prompt → 再走写命令',
    content: parts.join(''),
  });
}
