/** #283 · 删照候选整页文档（候选列表＋单张快照＋可复制 prompt）。
 *
 * 取数与 prompt 由 `picker.ts` 备齐，本件只做呈现组装：读数卡＋候选卡网格（缩略图 ＋ 日期 ＋ 标签）
 * ＋快照（大图＋键值行，只读，无删除动作）＋prompt 复制区＋复制数据，经共用件 `assembleDocPage`
 * 包成 `<!doctype html>` 起的完整文档。缩略体内嵌走 `photoThumb.ts`；单页体积上限
 * 沿用 t341 体积节口径（定义只在 `galleryDoc.ts` 的 `PHOTO_LIST_PAGE_MAX_BYTES`，本件不另定）。
 *
 * **#527（过程与结果族 · 本票）**——四条改动，取值口径与写命令行为一行未改：
 *   ① **形状化**：候选行原来是一行 `#编号 标签 · 短日期 · 相对时间` 的 `·` 串，
 *      快照的表注也是一句 `；` 串；现在候选走**等高卡片格**（编号／标签徽章／日期三行各有各的形状）、
 *      快照的六列小表改**键值行**（一行一件事，窄屏塌成上下两行）；
 *   ② **文案去冗余**：`#19` 这种票号式内部写法出页面（改「照片 19」），`；` 串的
 *      安全感说明拆两句；`本页不删任何东西` 与眉标的「只看不删」不再重复第三遍；
 *   ③ **大页呈现**：候选图逐张**带大小上限内嵌**（`PICKER_INLINE_MAX_BYTES`）——
 *      超过上限的那张在自己的格位上出**同规格占位件**（写明哪一份文件、为什么、下一步），
 *      页字节因此有界；页内导航（`renderTocBlock`）给长页两条锚点；
 *   ④ **手机端**：本族页内样式住 `photoUi.ts`（断点 820／640，触摸区 ≥44px，表头 ≥12px）。
 */
import { renderDataTable, renderEmptyBlock, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import { escapeHtml, renderMediaPlaceholder, renderStatusBadge } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea, promptCopyArea } from '../shared/copyArea.js';
import { todayISO } from '../analysis/utils.js';
import { embedPhoto, embedPhotos, type PhotoEmbed } from './photoThumb.js';
import { chipRow, factRows, photoUiCss } from './photoUi.js';
import type { PhotoCard } from './photo.js';
import type { PhotoPickerView } from './picker.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #527：`·` 是符号顶替版面（题名不是并列语义），改空格。 */
const DOC_TITLE = '卡路里 身材照片';

/** 逐张内嵌的**大小上限**：#527 首定。超过它的候选**不内嵌字节**、改出同规格占位件——
 *  这是呈现层的退让（页面字节有界），不改 `photoThumb` 的 `PHOTO_EMBED_MAX_BYTES`（那是能力上限），
 *  也不动 `PHOTO_LIST_PAGE_MAX_BYTES`（体积口径归 #461／#438）。 */
export const PICKER_INLINE_MAX_BYTES = 400 * 1024;

/** 短日期（`07-17`）＋相对时间（今天／昨天／N 天前／N 个月前／N 年前）；算不出只留短日期。
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

/** 拍的日子只留 `07-17`（年份这一页用不上）；相对时间单独一条事实。 */
function shortDate(date: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  return m ? m[1] + '-' + m[2] : date;
}

/** 候选卡网格（#527）：与画廊同一张等高卡（`.phu-card`＋`.phu-shot`）。
 *  图能内嵌就内嵌；读不到或超过 `PICKER_INLINE_MAX_BYTES` 的那张，在自己的格位上出
 *  **同规格占位件**——写明哪一份文件、为什么没放上来、下一步做什么（不静默、不留白框、不印原因码）。 */
function candidateGridHtml(cands: PhotoCard[], photosDir: string | null, today: string): string {
  const embeds = embedPhotos(photosDir, cands);
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const cards = cands.map((p) => {
    const key = p.photoPath.split('/').pop()?.split('\\').pop() ?? p.photoPath;
    const e: PhotoEmbed | undefined = byName.get(key);
    const tooBig = e !== undefined && e.dataUri !== null && (e.bytes ?? 0) > PICKER_INLINE_MAX_BYTES;
    const shown = e?.dataUri != null && !tooBig;
    const stage = shown
      ? '<div class="phu-shot"><img src="' + (e as PhotoEmbed).dataUri + '" alt="身材照 ' + p.id
        + '" style="max-width:100%;width:100%;height:100%;object-fit:cover" /></div>'
      : '<div class="phu-shot">' + renderMediaPlaceholder({
        alt: '身材照 ' + p.id,
        ratio: '4-5',
        reason: tooBig
          ? ('这张原图太大，没放进这一页：' + key)
          : ('照片没放进这一页：' + key + '（' + (e?.missing ?? '未知原因') + '）'),
        next: tooBig ? '想先看它：按文件名自己打开，确认过再按下面的编号让我删' : '把文件放回照片目录再跑一次',
      }) + '</div>';
    const tags = p.tagList.length > 0 ? [...p.tagList] : ['无标签'];
    const rel = relTime(p.date, today);
    const bad = p.fileExists === false
      ? ' ' + renderStatusBadge({ status: 'danger', text: '找不到文件' })
      : '';
    return '<figure class="phu-card" data-id="' + p.id + '">' + stage
      + '<figcaption class="phu-cap"><div class="phu-cap-no">照片 ' + p.id + bad + '</div>'
      + chipRow([...tags, shortDate(p.date), rel])
      // #474 口径保留：候选卡不抄文件名（编号／标签／日期／缩略图已够认人）——文件名的落点
      // 是快照那一段的键值行；这一张看不见图时，文件名由上面占位件的原因行点名。
      + '</figcaption></figure>';
  });
  return '<h2 class="phu-sec" id="phu-candidates">候选照片</h2><div class="phu-grid">' + cards.join('') + '</div>';
}

/** 单张快照（#527）：大图 ＋ **键值行**的明细（原来六列小表；只读：选中与复制在此页，删除走写命令）。 */
function snapshotHtml(sel: PhotoCard | null, photosDir: string | null, today: string): string {
  if (!sel) {
    return '<h2 class="phu-sec" id="phu-snapshot">快照</h2>'
      + renderEmptyBlock({ text: '还没说要删哪张：把上面某张的编号说给我（例如 19），我放大给你看' });
  }
  const e = embedPhoto(photosDir, sel.photoPath);
  const big = e.dataUri !== null && (e.bytes ?? 0) <= PICKER_INLINE_MAX_BYTES;
  // #484：快照是「放大给你看」的那一张（页内文案就这么写的），故不跟着候选缩略图一起收小。
  const stage = big
    ? '<div class="phu-snap"><img src="' + e.dataUri + '" alt="快照' + sel.id
      + '" style="max-width:100%;max-height:60vh;width:100%;height:auto;object-fit:contain" /></div>'
    : renderMediaPlaceholder({
      alt: '快照 ' + sel.id,
      ratio: '4-5',
      reason: '这一张放不进页面：' + e.fileName + '（' + (e.missing ?? '原图太大') + '）',
      next: '想删它：按文件名自己打开最后确认一次，再复制下面的指令',
    });
  const rel = relTime(sel.date, today);
  return '<h2 class="phu-sec" id="phu-snapshot">快照</h2>'
    + '<figure class="phu-card" data-snapshot="' + sel.id + '">' + stage
    + '<figcaption class="phu-cap">'
    + '<div class="phu-cap-no">快照 照片 ' + sel.id + '</div>'
    + factRows([
      { k: '拍摄', v: sel.date + (sel.time === null ? '' : ' ' + sel.time) },
      { k: '距今天数', v: rel === '' ? '算不出来' : rel },
      { k: '标签', v: sel.tagList.join('、') || '无标签' },
      ...(sel.note === null || sel.note === '' ? [] : [{ k: '备注', v: sel.note }]),
      { k: '文件', v: sel.photoPath },
      ...(sel.fileExists === false ? [{ k: '文件核对', v: '照片记录还在，文件不在照片目录里（删不掉）' }] : []),
    ])
    + '</figcaption></figure>';
}

/** 删照候选整页：完整文档（doctype 起、charset、版面、复制区）＋候选卡网格＋快照＋prompt。 */
export function buildPhotoPickerDoc(v: PhotoPickerView, photosDir: string | null): string {
  const today = todayISO();
  const embeds = embedPhotos(photosDir, v.candidates);
  const okCount = embeds.filter((e) => e.dataUri !== null).length;
  const cantSee = v.candidates.length - okCount;
  const parts: string[] = [photoUiCss()];
  parts.push(chipRow(['本页列 ' + v.candidates.length + ' 张', v.truncated ? '库里还有 ' + (v.fullCount - v.candidates.length) + ' 张' : '']));
  parts.push(renderTocBlock({ items: v.selected === null
    ? [{ id: 'phu-candidates', text: '候选照片' }]
    : [{ id: 'phu-candidates', text: '候选照片' }, { id: 'phu-snapshot', text: '快照' }] }));
  parts.push(renderKpiGrid([
    { label: '本页显示', value: String(v.candidates.length), unit: '张', detail: v.truncated ? '库里还有 ' + (v.fullCount - v.candidates.length) + ' 张没列出来' : '全部列出来了' },
    { label: '已选', value: v.selected ? '照片 ' + v.selected.id : '未选', detail: v.selected ? (v.selectedInList ? '在候选窗内' : '不在当前候选窗内') : '先选再看快照' },
    cantSee > 0
      ? { label: '能看', value: String(okCount), unit: '张', detail: cantSee + ' 张文件找不到', status: 'warn', statusText: '缺文件' }
      : { label: '能看', value: String(okCount), unit: '张', detail: '全部都能看' },
  ]));
  parts.push(candidateGridHtml(v.candidates, photosDir, today));
  parts.push(snapshotHtml(v.selected, photosDir, today));
  if (v.selected && !v.selectedInList) {
    parts.push(renderEmptyBlock({ text: '已选照片 ' + v.selected.id + ' 不在当前候选窗内（快照照常显示，候选按筛选条件列出）' }));
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
    title: '删照候选',
    // #530：眉标原来是 `删照片 · 只看不删`（探针 R1 命中：`·` 串两件事）→ 改括号式。
    eyebrow: '删照片（只看不删）',
    subtitle: '先看候选，点开一张确认，再复制指令让我删',
    content: parts.join(''),
    // #527 收口：本页原先漏了 `pageUi` 位（同 `gifDoc`）⇒ 公共层媒体件的规则整段没进页，
    //  超预算候选走的 `renderMediaPlaceholder`（公共件）因此没有框体样式。家族其余页都接了，
    //  本页补齐后与它们同档。
    pageUi: true,
  });
}
