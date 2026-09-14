/** #283 · 删照候选整页文档（候选列表＋单张快照＋可复制 prompt）。
 *
 * 取数与 prompt 由 `picker.ts` 备齐，本件只做呈现组装：KPI＋候选（缩略图＋日期＋标签）
 * ＋快照（只读，无删除动作）＋prompt 复制区＋复制数据，经共用件 `assembleDocPage`
 * 包成 `<!doctype html>` 起的完整文档。缩略体内嵌走 `photoThumb.ts`；单页体积上限
 * 沿用 t341 体积节口径（定义只在 `galleryDoc.ts` 的 `PHOTO_LIST_PAGE_MAX_BYTES`，本件不另定）。
 */
import { renderDataTable, renderEmptyBlock, renderKpiGrid } from 'base-paint/blocks';
import { escapeHtml, renderStatusBadge } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea, promptCopyArea } from '../shared/copyArea.js';
import { todayISO } from '../analysis/utils.js';
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

/** 相对时间（人话）：今天／昨天／N 天前／N 个月前／N 年前；按自然日粗算，不追求精确日历。
 *  「今天」取自共用件 `todayISO()`（同族页同一个出处；`CALORIE_TODAY` 可把它钉死）。
 *  （与 `viewerDoc`／`compareDoc` 各自的同名小函数同口径；三处合一归公共小件，另票。） */
function relTime(date: string, today: string): string {
  const days = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(date + 'T12:00:00Z')) / 86400000);
  if (!Number.isFinite(days) || days < 0) return '';
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return days + ' 天前';
  if (days < 365) return Math.round(days / 30) + ' 个月前';
  return Math.round(days / 365) + ' 年前';
}

/** #474：拍的日子只留 `07-17`（年份这一页用不上），后面跟相对时间；算不出就只留日期。 */
function dayText(date: string, today: string): string {
  const short = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  const head = short ? short[1] + '-' + short[2] : date;
  const rel = relTime(date, today);
  return rel === '' ? head : head + ' · ' + rel;
}

/** 候选列表：一行只留「#编号 标签 · 短日期 · 相对时间」（缩略图独立成败）。
 *  #474：文件名与「文件存在」都不再逐行喊——文件名在图下有，正常照片喊「存在」是零信息值；
 *  **异常才出声**（找不到文件才挂状态徽标）。 */
function candidateListHtml(cands: PhotoCard[], photosDir: string | null, today: string): string {
  const embeds = embedPhotos(photosDir, cands);
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const items = cands.map((p) => {
    const key = p.photoPath.split('/').pop()?.split('\\').pop() ?? p.photoPath;
    const e = byName.get(key);
    const img = e?.dataUri
      ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" style="max-width:100%;max-height:160px;height:auto;object-fit:cover" />'
      : '<div>照片没放进这一页（' + escapeHtml(e?.missing ?? '未知原因') + '）</div>';
    const bad = p.fileExists === false
      ? ' ' + renderStatusBadge({ status: 'danger', text: '找不到文件' })
      : '';
    return '<li data-id="' + p.id + '">' + img +
      '<div>#' + p.id + ' ' + tagsText(p) + ' · ' + escapeHtml(dayText(p.date, today)) + bad + '</div></li>';
  }).join('');
  return '<ol>' + items + '</ol>';
}

/** 单张快照：大图＋明细（只读：选中与复制在此页，删除走写命令）。 */
function snapshotHtml(sel: PhotoCard | null, photosDir: string | null): string {
  if (!sel) {
    return renderEmptyBlock({ text: '还没说要删哪张：把上面某个 #号说给我（例如 #19），我放大给你看' });
  }
  const e = embedPhoto(photosDir, sel.photoPath);
  // #484：快照是「放大给你看」的那一张（页内文案就这么写的），故上限取**跟详情页同族的 60vh**，
  // 不跟着候选缩略图一起收到 160px——收到那个数就把「放大」两字说反了。
  const img = e.dataUri !== null
    ? '<img src="' + e.dataUri + '" alt="快照#' + sel.id + '" style="max-width:100%;max-height:60vh;height:auto;object-fit:contain" />'
    : '<div>这张图放不进这一页（' + escapeHtml(e.missing ?? '未知原因') + '）</div>';
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
        { key: 'status', label: '照片文件' },
      ],
      rows: [{
        id: sel.id, date: sel.date, tags: sel.tagList.join('、') || '—',
        note: sel.note ?? '—', file: sel.photoPath,
        status: sel.fileExists === null ? '没核对' : sel.fileExists ? '' : '找不到（删不掉）',
      }],
      // #474：删是不可逆操作，表注先说清「本页不删」＋「要删得复制下面那段指令」（安全感）。
      caption: '这张的基本信息。本页不删任何东西；要删得你复制下面那段指令',
      emptyText: '无快照',
    });
}

/** 删照候选整页：完整文档（doctype 起、charset、版面、复制区）＋候选＋快照＋prompt。 */
export function buildPhotoPickerDoc(v: PhotoPickerView, photosDir: string | null): string {
  const today = todayISO();
  const embeds = embedPhotos(photosDir, v.candidates);
  const okCount = embeds.filter((e) => e.dataUri !== null).length;
  // #474：「内嵌」是技术词（读者看不出是把图放进这一页），且逐行念 6 遍 → KPI 只说「能看几张」，
  //  剩下的走状态徽标（异常才出声），逐行不再重复「文件找不到」那句话。
  const cantSee = v.candidates.length - okCount;
  const parts: string[] = [renderKpiGrid([
    { label: '本页显示', value: String(v.candidates.length), unit: '张', detail: v.truncated ? '库里还有 ' + (v.fullCount - v.candidates.length) + ' 张没列出来' : '全部列出来了' },
    { label: '已选', value: v.selected ? '#' + v.selected.id : '未选', detail: v.selected ? (v.selectedInList ? '在候选窗内' : '不在当前候选窗内') : '先选再看快照' },
    cantSee > 0
      ? { label: '能看', value: String(okCount), unit: '张', detail: cantSee + ' 张文件找不到', status: 'warn', statusText: '缺文件' }
      : { label: '能看', value: String(okCount), unit: '张', detail: '全部都能看' },
  ])];
  parts.push(candidateListHtml(v.candidates, photosDir, today));
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
    // #474：原 H1「删照候选 · 22 张」与 KPI 逐字重复 → H1 只留页名，张数由 KPI 一格承担。
    title: '删照候选',
    // #474：原眉标直接印内部命令名 `calorie.view.photo-picker · 身材照片域` → 改人话（好看不吓人）；
    //  副标题也不再说「复制 prompt」「走写命令」这种系统口吻。
    eyebrow: '删照片 · 只看不删',
    subtitle: '先看候选 → 点开一张确认 → 复制指令让我删',
    content: parts.join(''),
  });
}
