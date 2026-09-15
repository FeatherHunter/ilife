/** #281 · 查身材照单张整页文档（完整文档＋内嵌照片＋复制区，兼任删流程快照）。
 *
 * 取数仍是 `photo.ts` 的 `buildViewerData`（同标签 prev／next，首尾 null 口径不变），
 * 本件只做呈现组装：上下张翻页链（可点，中张双链，首尾无空 href）→大图卡（黑底 75vh contain，
 * 老页 `body_photo_viewer.html:28-29` 规则）→这张照片的信息→删这张照片＋回画廊→复制区，
 * 经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 *
 * **#473（B 组）**：眉标整行删；「翻页禁用」「超预算未嵌」「未校验」「硬删除，不可恢复」这些系统
 * 口吻与专业话一律出页面；图注收成「什么时候 ＋ 标签 ＋ 文件名」；文件在位时不再写「文件存在」。
 * 复制区（给 AI 的机器内容）一字不动。
 *
 * **#526（读侧族重排 · 本票）**——四条改动，体积退让行为（超 1 MiB 不内嵌，`#438` 口径）一行未改：
 *   ① **分隔符债归零**（节点级命中 10 → 0）：图注四件事串一行 ⇒ 拆成「时刻（一行）＋ 徽章列
 *      （编号／标签／相对时间）」；`← 上一张 #16 · 下一张 #23 →` 两个动作串一行 ⇒ 两枚各自的
 *      翻页块；标题 `身材照查看 #19` 与读数卡 `编号 #19` 的裸 `#` 号 ⇒ 页头改人话标题
 *      （`2026-05-30 的身材照`）＋身份徽章 `编号 19`；
 *   ② **机器话下屏**：两条命令原文（`calorie-cmd-read …`）从可见的 `<pre>` 撤到复制按钮的
 *      `data-t` 里——读者要的是「点一下复制、粘给我就能跑」，不是让一条命令占半屏；
 *   ③ **文案去冗余**：删掉「内嵌 0/1 张」这种内部读数、「照片没显示（太大放不下：…）」与
 *      「这张图太大放不下（超过 1 MB）…」两句同一件事、以及六列单行表（一张照片用六列表，
 *      窄屏被备注列撑爆）；改由一句结论条（多大／放没放进本页）＋键值行（文件／备注）承担；
 *   ④ **手机端**：本族页内样式住 `photoUi.ts`（断点 820／640，触摸区 ≥44px），键值行窄屏塌纵向。
 */
import { escapeHtml, renderStatusBadge } from 'base-paint';
import { renderConclusionBar } from 'base-paint/blocks';
import { COPY_ACTION_IDS, renderActionBar } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { CALORIE_COPY_ACTION } from '../render/copy.js';
import { todayISO } from '../analysis/utils.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import { embedPhoto, type PhotoEmbed } from './photoThumb.js';
import { chipRow, factRows, noteSegments, photoUiCss } from './photoUi.js';
import type { PhotoCard, ViewerData } from './photo.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #526：`卡路里·身材照片` 里的 `·` 是符号顶替版面，改空格。 */
const DOC_TITLE = '卡路里 身材照片';

/** 本页小节标题的类名（#467 先例：KPI 区那把尺，不新造样式）。 */
const H2_CLASS = 'ilife-block-kpi-card-title';

/** 删这张照片那两句（人话＋安全感）：全页「不可恢复」只说这一次，说成「找不回来」。 */
const DELETE_HEADING = '删掉这张照片';
const DELETE_SAFETY = '删了就找不回来，先确认上面那张是不是它';
const DELETE_HINT = '点一下复制，粘到对话里发我就能跑';

/** 翻页命令原文（落盘静态页无稳定单图路由：锚点给可点形态，`data-command` 给照抄重跑命令）。
 *  #526：命令原文只住属性（`<pre>` 那两处已撤，见件头 ②）——读者可见的是两枚复制按钮。 */
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

/** 什么时候拍的：`2026-05-30 17:44`（秒位不进页面）。 */
function whenText(p: PhotoCard): string {
  const hhmm = (p.time ?? '').slice(0, 5);
  return p.date + (hhmm === '' ? '' : ' ' + hhmm);
}

/** 文件大小（人话）：一位小数的 MB／整数 KB／「字节」兜底；读不出即空串。 */
function sizeText(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return '';
  if (bytes < 1024) return bytes + ' 字节';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** 上一张／下一张（老页 `:74-77` 链接＋`:137`／`:142` 置灰）：有邻即锚点，无邻即一句人话
 *  （无空 href，不出坏链；不写「翻页禁用」这种系统口吻）。
 *  #484：裸 `<a>` 在手机上只有 20px 高（低于 44px 下限）——给足触摸区（`min-height:44px` ＋
 *  行内 flex 居中），两邻共用同一条约束。
 *  #526：两个动作各自成形（不再是 `上一张 #16 · 下一张 #23` 那一行），编号进小字块。 */
const NAV_LINK_STYLE = 'min-height:44px;display:inline-flex;align-items:center';

function navHtml(v: ViewerData): string {
  const prev = v.prevId === null
    ? '<span aria-disabled="true">已是第一张</span>'
    : '<a style="' + NAV_LINK_STYLE + '" href="#photo-' + v.prevId + '" data-command="' + escapeHtml(detailCommand(v.prevId)) + '">← 上一张<span class="phu-nav-id">编号 ' + v.prevId + '</span></a>';
  const next = v.nextId === null
    ? '<span aria-disabled="true">已是最后一张</span>'
    : '<a style="' + NAV_LINK_STYLE + '" href="#photo-' + v.nextId + '" data-command="' + escapeHtml(detailCommand(v.nextId)) + '"><span class="phu-nav-id">编号 ' + v.nextId + '</span>下一张 →</a>';
  return '<div data-nav>' + prev + next + '</div>';
}

/** 结论条那一句（全页只此一处说「能不能看／多大」）：三态各归各的说法。 */
function verdictOf(e: PhotoEmbed, dropped: boolean, p: PhotoCard): string {
  const size = sizeText(e.bytes);
  if (p.fileExists === false) return '这份原图不在照片目录里，图放不出来';
  if (dropped) return '这张原图 ' + (size === '' ? '' : size + '，') + '一页装不下，图没放进本页';
  if (e.dataUri !== null) return '这张原图 ' + size + '，已经放在本页，可以直接看';
  if (e.missing !== null && e.missing.includes('未配照片目录')) return '还没设照片目录，读不到这份原图';
  return '这张原图读不出来，下面留着文件名';
}

/** 大图卡（黑底 75vh contain，老页 `:28-29` 规则）；没图那态给占位——**明写哪一份文件与为什么**，
 *  原来那两句（占位句 ＋ 卡下那句「超过 1 MB…」）是同一件事说两遍，本票合成一句。 */
function figureHtml(p: PhotoCard, e: PhotoEmbed, dropped: boolean): string {
  const fileName = e.fileName;
  if (!dropped && e.dataUri !== null) {
    return '<figure data-id="' + p.id + '" id="photo-' + p.id + '">'
      + '<div style="background:#000;display:flex;align-items:center;justify-content:center;max-height:75vh;overflow:hidden">'
      + '<img src="' + e.dataUri + '" alt="身材照 ' + p.id
      + '" style="max-width:100%;max-height:75vh;object-fit:contain" /></div></figure>';
  }
  const badge = dropped ? { status: 'warn' as const, text: '原图太大' } : { status: 'danger' as const, text: '找不到文件' };
  return '<figure data-id="' + p.id + '" id="photo-' + p.id + '"><div class="phu-hero-miss" style="display:flex;align-items:center;justify-content:center">'
    + '<div class="phu-miss">' + renderStatusBadge(badge)
    + '<code>' + escapeHtml(fileName) + '</code>'
    + '<div>' + escapeHtml(dropped ? '超过一页能装的量，没进这一页' : (p.fileExists === false ? '照片记录还在，文件不在照片目录里' : '这一张读不出来')) + '</div>'
    + '<div>' + escapeHtml(dropped ? '想看原图：自己打开这份文件' : '把文件放回照片目录就会有图') + '</div>'
    + '</div></div></figure>';
}

/** 这张照片的信息（#526 把六列单行表换成键值行）：文件（含它到底在不在）＋ 备注（用户自己
 *  连写的那几件事按段落到形状上，见 `photoUi.noteSegments`）。 */
function infoHtml(p: PhotoCard, e: PhotoEmbed): string {
  const exists = p.fileExists === false
    ? renderStatusBadge({ status: 'danger', text: '不在照片目录里' })
    : (p.fileExists === null ? renderStatusBadge({ status: 'empty', text: '没核对' })
      : renderStatusBadge({ status: 'ok', text: '在照片目录里' }));
  const rows = [
    { k: '文件', vHtml: '<code>' + escapeHtml(e.fileName) + '</code> ' + exists },
    { k: '备注', vHtml: p.note === null || p.note === '' ? '' : '<span class="phu-segs">' + noteSegments(p.note) + '</span>' },
  ];
  return '<section><h2 class="' + H2_CLASS + '">这张照片的信息</h2>' + factRows(rows) + '</section>';
}

/** 删这张照片 ＋ 回画廊（#526）：两句人话 ＋ 一条动作行（两颗复制按钮，命令住 `data-t`，
 *  可见面上不出现命令原文）。actionId 取**冻结表**：删那条走 `CALORIE_COPY_ACTION`（「复制指令」
 *  的既有 id），回画廊那条借冻结的日志位 id——同一次渲染内两颗 id 必须不同，
 *  「复制回画廊指令」这个标签由本页给。 */
function actionHtml(p: PhotoCard): string {
  const tag = p.tagList[0] ?? '';
  const backParams = tag ? '{"tag": "' + tag + '"}' : '{}';
  const backCmd = 'calorie-cmd-read calorie.photo.list --params \'' + backParams + '\'';
  const delCmd = 'calorie-cmd-read calorie.photo.remove --params \'{"id": ' + p.id + '}\'';
  return '<section><h2 class="' + H2_CLASS + '">' + DELETE_HEADING + '</h2>'
    + '<p class="phu-act-s">' + DELETE_SAFETY + '</p>'
    + renderActionBar({
      copyData: { actionId: CALORIE_COPY_ACTION.actionId, label: '复制删除指令', text: delCmd },
      copyLog: { actionId: COPY_ACTION_IDS.actionBar.copyLog, label: '复制回画廊指令', text: backCmd },
    })
    + '<p class="phu-note">' + DELETE_HINT + '</p></section>';
}

function contentOf(v: ViewerData, e: PhotoEmbed, dropped: boolean): string {
  const p = v.photo;
  const today = todayISO();
  const parts: string[] = [photoUiCss()];
  parts.push(chipRow(['编号 ' + p.id, ...(p.tagList.length > 0 ? [...p.tagList] : ['无标签']),
    whenText(p), relTime(p.date, today)]));
  parts.push(renderConclusionBar(verdictOf(e, dropped, p)));
  parts.push(navHtml(v));
  parts.push(figureHtml(p, e, dropped));
  parts.push(infoHtml(p, e));
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
    // #526：标题改人话（原来是「身材照查看 #19」——`#19` 既撞内部标识符判据，也是给机器看的编号）；
    // 编号与标签改由页头身份徽章承载，两处各说各的、不重复。
    title: p.date + ' 的身材照',
    eyebrow: '',
    subtitle: null,
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
