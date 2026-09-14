/** #281 · 查身材照单张整页文档（完整文档＋内嵌照片＋复制区，兼任删流程快照）。
 *
 * 取数仍是 `photo.ts` 的 `buildViewerData`（同标签 prev／next，首尾 null 口径不变），
 * 本件只做呈现组装：上下张翻页链（可点，中张双链，首尾无空 href）→大图卡（黑底 75vh contain，
 * 老页 `body_photo_viewer.html:28-29` 规则）→这张照片的信息表→删这张照片＋回画廊（人话＋
 * 可复制命令块）→复制区，经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 *
 * **#473（B 组 · 文本精简／人话改写／展示升级）**：眉标整行删；「翻页禁用」「超预算未嵌」
 * 「未校验」「硬删除，不可恢复」这些系统口吻与专业话一律出页面；「快照明细（删前核对凭据）」
 * 与「本页即删身材照流程的快照」两处重复句删掉（同一件事只留大图卡上那一份）；图注收成
 * 「什么时候（绝对 ＋ 相对）＋ 标签 ＋ 文件名小字块」，文件在位时不再写「文件存在」。
 * 两条命令改 `renderPreBlock` 的可复制命令块——复制按钮取冻结表 `render/copy.ts` 的
 * `CALORIE_COPY_ACTION`，卡路里侧不自造按钮、不自造 id。复制区（给 AI 的机器内容）一字不动。
 *
 * 体积沿用 t341 首定 `PHOTO_LIST_PAGE_MAX_BYTES`（定义只在 `galleryDoc.ts`，本件只
 * 引用不另定；超预算即一句人话＋下方信息表里的文件名）。
 * `src/render/html.ts` 已超线只读：本件不调它的照片段。
 */
import { escapeHtml } from 'base-paint';
import { renderChips, renderDataTable, renderKpiGrid, renderPreBlock } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { todayISO } from '../analysis/utils.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import { embedPhoto, type PhotoEmbed } from './photoThumb.js';
import type { PhotoCard, ViewerData } from './photo.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

/** 删这张照片那两句（人话＋安全感）：全页「不可恢复」只说这一次，说成「找不回来」。 */
const DELETE_HEADING = '删掉这张照片';
const DELETE_SAFETY = '删了就找不回来，先确认上面那张是不是它';

/** 翻页命令原文（落盘静态页无稳定单图路由：锚点给可点形态，`data-command` 给照抄重跑命令）。 */
function detailCommand(id: number): string {
  return 'calorie-cmd-read calorie.photo.detail --params \'{"id": ' + id + '}\'';
}

/** 相对时间（人话）：今天／昨天／N 天前／N 个月前／N 年前；按自然日粗算，不追求精确日历。
 *  「今天」取自 `todayISO()`（唯一出处；`CALORIE_TODAY` 可把它钉死，测试与基线用得上）。 */
function relTime(date: string, today: string): string {
  const days = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(date + 'T12:00:00Z')) / 86400000);
  if (days <= 0) return '今天';
  if (days === 1) return '昨天';
  if (days < 30) return days + ' 天前';
  if (days < 365) return Math.round(days / 30) + ' 个月前';
  return Math.round(days / 365) + ' 年前';
}

/** 什么时候拍的：`2026-05-30 17:44`（秒位不进页面）＋相对时间。 */
function whenText(p: PhotoCard, today: string): string {
  const hhmm = (p.time ?? '').slice(0, 5);
  return p.date + (hhmm === '' ? '' : ' ' + hhmm) + ' · ' + relTime(p.date, today);
}

/** 上一张／下一张（老页 `:74-77` 链接＋`:137`／`:142` 置灰）：有邻即锚点，无邻即一句人话
 *  （无空 href，不出坏链；不写「翻页禁用」这种系统口吻）。
 *  #484：裸 `<a>` 在手机上只有 20px 高（低于 44px 下限）——给足触摸区（`min-height:44px` ＋
 *  行内 flex 居中），两邻共用同一条约束。 */
const NAV_LINK_STYLE = 'min-height:44px;display:inline-flex;align-items:center';

function navHtml(v: ViewerData): string {
  const prev = v.prevId === null
    ? '<span aria-disabled="true">已是第一张</span>'
    : '<a style="' + NAV_LINK_STYLE + '" href="#photo-' + v.prevId + '" data-command="' + escapeHtml(detailCommand(v.prevId)) + '">← 上一张 #' + v.prevId + '</a>';
  const next = v.nextId === null
    ? '<span aria-disabled="true">已是最后一张</span>'
    : '<a style="' + NAV_LINK_STYLE + '" href="#photo-' + v.nextId + '" data-command="' + escapeHtml(detailCommand(v.nextId)) + '">下一张 #' + v.nextId + ' →</a>';
  return '<div data-nav>' + prev + ' · ' + next + '</div>';
}

/** 大图卡（黑底 75vh contain，老页 `:28-29` 规则）；图注＝什么时候 ＋ 标签 ＋ 文件名小字块。
 *  文件名走公共层 chip（`renderChips`，12px 小字块，文本可选中复制，不自造样式类）；
 *  文件只在确实不在时才提示（在位时不再写「文件存在」）。 */
function figureHtml(p: PhotoCard, e: PhotoEmbed, dropped: boolean, today: string): string {
  const img = !dropped && e.dataUri !== null
    ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" style="max-width:100%;max-height:75vh;object-fit:contain" />'
    : '<div>照片没显示（' + escapeHtml(dropped ? '太大放不下：' + e.fileName : (e.missing ?? '未知原因')) + '）</div>';
  const tags = p.tagList.length > 0 ? p.tagList.map(escapeHtml).join('、') : '无标签';
  const gone = p.fileExists === false ? ' · 文件缺失' : '';
  return '<figure data-id="' + p.id + '" id="photo-' + p.id + '">' +
    '<div style="background:#000;display:flex;align-items:center;justify-content:center;max-height:75vh;overflow:hidden">' + img + '</div>' +
    '<figcaption>#' + p.id + ' ' + whenText(p, today) + ' · ' + tags +
    ' · ' + renderChips({ items: [{ text: p.photoPath }] }) + gone + '</figcaption></figure>';
}

/** 删这张照片 ＋ 回画廊：两句人话 ＋ 两条可复制即跑的命令块（复制按钮取冻结表，不自造 id）。 */
function actionHtml(p: PhotoCard): string {
  const tag = p.tagList[0] ?? '';
  const backParams = tag ? '{"tag": "' + tag + '"}' : '{}';
  const backCmd = 'calorie-cmd-read calorie.photo.list --params \'' + backParams + '\'';
  const delCmd = 'calorie-cmd-read calorie.photo.remove --params \'{"id": ' + p.id + '}\'';
  return '<div>' + DELETE_HEADING + '</div>' +
    '<div>' + DELETE_SAFETY + '</div>' +
    renderPreBlock({ label: '删它的命令（复制给 AI 就能跑）', command: delCmd, actionId: CALORIE_COPY_ACTION.actionId, copyLabel: CALORIE_COPY_ACTION.label }) +
    renderPreBlock({ label: '返回画廊（带筛选：标签 ' + (tag || '全部') + '）', command: backCmd, actionId: CALORIE_COPY_ACTION.actionId, copyLabel: CALORIE_COPY_ACTION.label });
}

function contentOf(v: ViewerData, e: PhotoEmbed, dropped: boolean): string {
  const p = v.photo;
  const today = todayISO();
  const shown = !dropped && e.dataUri !== null;
  const parts: string[] = [renderKpiGrid([
    { label: '编号', value: '#' + p.id },
    { label: '标签', value: p.tagList.join('、') || '无标签' },
    {
      label: '内嵌', value: shown ? '1/1 张' : '0/1 张',
      detail: shown ? '无缺失' : (dropped ? '太大放不下' : (e.missing ?? '未知原因')),
    },
  ])];
  parts.push(navHtml(v));
  parts.push(figureHtml(p, e, dropped, today));
  if (dropped) {
    parts.push('<div>这张图太大放不下（超过 1 MB）：可以打开下面的文件名自己看</div>');
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
      status: p.fileExists === null ? '文件没核对' : p.fileExists ? '存在' : '缺失',
    }],
    caption: '这张照片的信息',
    emptyText: '无快照',
  }));
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
    // #473：眉标（`calorie.photo.detail · 身材照片域`）整行删——命令名与域名的组合对读者零信息，
    // 空串即不写这一行（`docPage.ts` 的口径）。
    eyebrow: '',
    subtitle: p.date + ' · ' + (p.tagList.join('、') || '无标签'),
    content,
    charts: false,
  });
}

/** 单张整页：完整文档（doctype 起、charset、版面、复制区）＋大图内嵌＋翻页链＋这张照片的信息。 */
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
