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
 *   ③ **大页呈现（#461 起改口径）**：候选的「嵌不嵌」由**整页预算**定——照 #438 的
 *      `embedPhotosWithinBudget(…, PHOTO_LIST_PAGE_MAX_BYTES)` 逐张试嵌 ＋ 最多三轮退让，
 *      没进这一页的那张在自己的格位上出**同规格占位件**（写明哪一份文件、为什么、下一步），
 *      页字节因此**真有上限**（#527 当时只给单张 400 KB 上限，整页仍可被多张累加撑破，见 #461）；
 *      页内导航（`renderTocBlock`）给长页两条锚点；
 *   ④ **手机端**：本族页内样式住 `photoUi.ts`（断点 820／640，触摸区 ≥44px，表头 ≥12px）。
 *
 * **#654（读页复制日志 · 本席位）**：底部 ghost 行补回**真**「复制日志」（09-08 全窗与 09-14 快照两态
 * 同一支装配，两态一起有）——本页以前只有 `dataCopyArea`（只出数据那颗），日志那颗靠公共层 #336 兜底
 * 补的禁用占位（#654 已撤那条兜底路径）。现在本页自己给：`copyArea({ data, log })` 双位齐全，
 * 第 4 段＝本次命令原文（命令层 `picker.ts` 传 `commandLine()`）。prompt 那颗与取值口径一字未动。
 */
import { renderDataTable, renderEmptyBlock, renderKpiGrid, renderTocBlock } from 'base-paint/blocks';
import { escapeHtml, renderMediaPlaceholder, renderStatusBadge } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog, notice, promptCopyArea } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { todayISO } from '../analysis/utils.js';
import { EMBED_BUDGET_REASON, embedPhoto, embedPhotosWithinBudget, type PhotoEmbed } from './photoThumb.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import { chipRow, factRows, photoUiCss } from './photoUi.js';
import type { PhotoCard } from './photo.js';
import type { PhotoPickerView } from './picker.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  取词在**调用时**发生（模块级常量不得在顶层取词：语言由运行期上下文决定）。 */
function docTitle(): string {
  return m('skill-calorie.photo-pickerDoc.c057');
}

/** 复制日志第 3 段后半的数据来源（前半＝库文件名，由 `shared/copyArea.ts` 的 `copyLog` 拼）。 */
/** 复制日志第 3 段后半的数据来源（前半＝库文件名，由 `shared/copyArea.ts` 的 `copyLog` 拼）。
 *  取词在**调用时**发生（模块级常量不得在顶层取词）。 */
function logSource(): string {
  return m('skill-calorie.photo-pickerDoc.c058');
}

/** 逐张内嵌的**大小上限**：#527 首定。超过它的候选**不内嵌字节**、改出同规格占位件——
 *  这是呈现层的退让（页面字节有界），不改 `photoThumb` 的 `PHOTO_EMBED_MAX_BYTES`（那是能力上限），
 *  也不动 `PHOTO_LIST_PAGE_MAX_BYTES`（体积口径归 #461／#438）。 */
export const PICKER_INLINE_MAX_BYTES = 400 * 1024;

/** 短日期（`07-17`）＋相对时间（今天／昨天／N 天前／N 个月前／N 年前）；算不出只留短日期。
 *  「今天」取自共用件 `todayISO()`（同族页同一个出处；#718 起「今天」由真实时钟给，钉钟走 `test/helpers/config-test.mjs` 的 `pinProcessClock`）。
 *  （与 `viewerDoc`／`compareDoc` 各自的同名小函数同口径；三处合一归公共小件，另票。） */
function relTime(date: string, today: string): string {
  const days = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(date + 'T12:00:00Z')) / 86400000);
  if (!Number.isFinite(days) || days < 0) return '';
  if (days === 0) return m('skill-calorie.photo-pickerDoc.c063');
  if (days === 1) return m('skill-calorie.photo-pickerDoc.c001');
  if (days < 30) return m('skill-calorie.photo-pickerDoc.c002', { p0: String(days) });
  if (days < 365) return m('skill-calorie.photo-pickerDoc.c003', { p0: String(Math.round(days / 30)) });
  return m('skill-calorie.photo-pickerDoc.c004', { p0: String(Math.round(days / 365)) });
}

/** 拍的日子只留 `07-17`（年份这一页用不上）；相对时间单独一条事实。 */
function shortDate(date: string): string {
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  return m ? m[1] + '-' + m[2] : date;
}

/** 候选卡网格（#527 形状／#461 预算）：与画廊同一张等高卡（`.phu-card`＋`.phu-shot`）。
 *  嵌不嵌由**整页预算**先定好（`buildPhotoPickerDoc` 里跑 `embedPhotosWithinBudget`），本件只做呈现：
 *  拿到字节就上图，没拿到就在自己的格位上出**同规格占位件**——写明哪一份文件、为什么、下一步
 *  （不静默、不留白框、不印原因码）。 */
function candidateGridHtml(
  cands: PhotoCard[], embeds: readonly PhotoEmbed[], skipReason: ReadonlyMap<string, string>, today: string,
): string {
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const cards = cands.map((p) => {
    const key = p.photoPath.split('/').pop()?.split('\\').pop() ?? p.photoPath;
    const e: PhotoEmbed | undefined = byName.get(key);
    const shown = e?.dataUri != null;
    const missText = e?.missing ?? m('skill-calorie.photo-pickerDoc.c005');
    const stage = shown
      ? '<div class="phu-shot"><img src="' + (e as PhotoEmbed).dataUri + '" alt="' + m('skill-calorie.photo-pickerDoc.c059', { p0: String(p.id) })
        + '" style="max-width:100%;width:100%;height:100%;object-fit:cover" /></div>'
      : '<div class="phu-shot">' + renderMediaPlaceholder({
        alt: m('skill-calorie.photo-pickerDoc.c006', { p0: String(p.id) }),
        ratio: '4-5',
        // 两种「没上图」分开说：预算没排上（#461）说页面放不下，其余按读文件的失败原因说。
        reason: skipReason.has(key)
          ? m('skill-calorie.photo-pickerDoc.c007', { p0: String(key) })
          : m('skill-calorie.photo-pickerDoc.c008', { p0: String(key), p1: String(missText) }),
        next: skipReason.has(key) ? m('skill-calorie.photo-pickerDoc.c009') : m('skill-calorie.photo-pickerDoc.c010'),
      }) + '</div>';
    const tags = p.tagList.length > 0 ? [...p.tagList] : [m('skill-calorie.photo-pickerDoc.c011')];
    const rel = relTime(p.date, today);
    const bad = p.fileExists === false
      ? ' ' + renderStatusBadge({ status: 'danger', text: m('skill-calorie.photo-pickerDoc.c012') })
      : '';
    return '<figure class="phu-card" data-id="' + p.id + '">' + stage
      + '<figcaption class="phu-cap"><div class="phu-cap-no">' + m('skill-calorie.photo-pickerDoc.c040', { p0: String(p.id) }) + bad + '</div>'
      + chipRow([...tags, shortDate(p.date), rel])
      // #474 口径保留：候选卡不抄文件名（编号／标签／日期／缩略图已够认人）——文件名的落点
      // 是快照那一段的键值行；这一张看不见图时，文件名由上面占位件的原因行点名。
      + '</figcaption></figure>';
  });
  return '<h2 class="phu-sec" id="phu-candidates">' + m('skill-calorie.photo-pickerDoc.c032') + '</h2><div class="phu-grid">' + cards.join('') + '</div>';
}

/** 单张快照（#527）：大图 ＋ **键值行**的明细（原来六列小表；只读：选中与复制在此页，删除走写命令）。
 *  #461：这一张的字节由调用方先算好（`snapInlined` 与预算里那份**同一个判据**），本件不再自己读文件。 */
function snapshotHtml(sel: PhotoCard | null, e: PhotoEmbed | null, snapInlined: boolean, today: string): string {
  if (!sel) {
    return '<h2 class="phu-sec" id="phu-snapshot">' + m('skill-calorie.photo-pickerDoc.c061') + '</h2>'
      + renderEmptyBlock({ text: m('skill-calorie.photo-pickerDoc.c013') });
  }
  // #484：快照是「放大给你看」的那一张（页内文案就这么写的），故不跟着候选缩略图一起收小。
  const missWord = e?.missing ?? m('skill-calorie.photo-pickerDoc.c014');
  const stage = snapInlined
    ? '<div class="phu-snap"><img src="' + (e?.dataUri ?? '') + '" alt="' + m('skill-calorie.photo-pickerDoc.c060', { p0: String(sel.id) })
      + '" style="max-width:100%;max-height:60vh;width:100%;height:auto;object-fit:contain" /></div>'
    : renderMediaPlaceholder({
      alt: m('skill-calorie.photo-pickerDoc.c015', { p0: String(sel.id) }),
      ratio: '4-5',
      reason: m('skill-calorie.photo-pickerDoc.c016', {
        p0: String(e?.fileName ?? sel.photoPath),
        p1: String(missWord),
      }),
      next: m('skill-calorie.photo-pickerDoc.c017'),
    });
  const rel = relTime(sel.date, today);
  return '<h2 class="phu-sec" id="phu-snapshot">' + m('skill-calorie.photo-pickerDoc.c061') + '</h2>'
    + '<figure class="phu-card" data-snapshot="' + sel.id + '">' + stage
    + '<figcaption class="phu-cap">'
    + '<div class="phu-cap-no">' + m('skill-calorie.photo-pickerDoc.c062', { p0: String(sel.id) }) + '</div>'
    + factRows([
      { k: m('skill-calorie.photo-pickerDoc.c018'), v: sel.date + (sel.time === null ? '' : ' ' + sel.time) },
      { k: m('skill-calorie.photo-pickerDoc.c019'), v: rel === '' ? m('skill-calorie.photo-pickerDoc.c020') : rel },
      { k: m('skill-calorie.photo-pickerDoc.c021'), v: listJoin(currentRenderLanguage(), sel.tagList) || m('skill-calorie.photo-pickerDoc.c022') },
      ...(sel.note === null || sel.note === '' ? [] : [{ k: m('skill-calorie.photo-pickerDoc.c023'), v: sel.note }]),
      { k: m('skill-calorie.photo-pickerDoc.c024'), v: sel.photoPath },
      ...(sel.fileExists === false ? [{ k: m('skill-calorie.photo-pickerDoc.c025'), v: m('skill-calorie.photo-pickerDoc.c026') }] : []),
    ])
    + '</figcaption></figure>';
}

/** 复制区（#654）：prompt 那颗照旧（`promptCopyArea` 在前面），这里出**数据 ＋ 日志**双位：
 *  数据＝候选全量（照旧不随预算截断），日志＝六段（`log` 位收 `LogTextInput`＝`{ envelope, copyLog }`，
 *  给错形状那颗按钮就落成点不动的死按钮）。 */
function copyAreaOf(v: PhotoPickerView, command: string): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.view.photo-picker',
    data: {
      items: v.candidates.map((p) => ({
        id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists,
      })),
      total: v.fullCount,
    },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, source: logSource(), actionAt: nowStamp(), version: DOC_VERSION }),
    },
  });
}

/** 删照候选整页：完整文档（doctype 起、charset、版面、复制区）＋候选卡网格＋快照＋prompt。
 *  **#461：整页预算**——底子先算（不含任何候选内嵌字节，快照那一份按固定开销计入），
 *  再照 #438 的 `embedPhotosWithinBudget(…, PHOTO_LIST_PAGE_MAX_BYTES)` 逐张试嵌，
 *  兜底最多三轮逐张收回最大的内嵌；口径与 `galleryDoc.buildPhotoListDoc` 一致，不另起一套。
 *  #654：`command`＝本次命令原文（命令层 `picker.ts` 的 `commandLine()` 派生），进复制日志第 4 段。 */
export function buildPhotoPickerDoc(v: PhotoPickerView, photosDir: string | null, command: string): string {
  const today = todayISO();
  // 快照那一张先读（它要进预算：它是本页「放大给你看」的价值核心，#461 不许削）。
  const snap = v.selected === null ? null : embedPhoto(photosDir, v.selected.photoPath);
  // **只有真会上页的字节才算进底子**：超过单张上限（`PICKER_INLINE_MAX_BYTES`）的那张仍按 #527 口径
  // 走占位，它的字节不许计入——否则一张 3 MB 原图会把整页预算吃光，候选一张都嵌不进来
  //（本席位首版即栽在此处：09-14 变成「一张图都看不见」）。
  const snapInlined = snap !== null && snap.dataUri !== null && (snap.bytes ?? 0) <= PICKER_INLINE_MAX_BYTES;
  const snapBytes = snapInlined ? Buffer.byteLength(snap?.dataUri ?? '', 'utf8') : 0;
  const shell = (content: string): string => assembleDocPage({
    docTitle: docTitle(),
    title: m('skill-calorie.photo-pickerDoc.c027'),
    // #530：眉标原来是 `删照片 · 只看不删`（探针 R1 命中：`·` 串两件事）→ 改括号式。
    eyebrow: m('skill-calorie.photo-pickerDoc.c028'),
    subtitle: m('skill-calorie.photo-pickerDoc.c029'),
    content,
    // #527 收口：本页原先漏了 `pageUi` 位（同 `gifDoc`）⇒ 公共层媒体件的规则整段没进页，
    //  超预算候选走的 `renderMediaPlaceholder`（公共件）因此没有框体样式。家族其余页都接了，
    //  本页补齐后与它们同档。
    pageUi: true,
  });
  const contentOf = (embeds: readonly PhotoEmbed[], skipReason: ReadonlyMap<string, string>): string => {
    const okCount = embeds.filter((e) => e.dataUri !== null).length;
    const cantSee = v.candidates.length - okCount;
    const missCount = v.candidates.filter((p) => p.fileExists === false).length;
    const budgetCount = cantSee - missCount;
    const parts: string[] = [photoUiCss()];
    parts.push(chipRow([m('skill-calorie.photo-pickerDoc.c030', { p0: String(v.candidates.length) }), v.truncated ? m('skill-calorie.photo-pickerDoc.c031', { p0: String(v.fullCount - v.candidates.length) }) : '']));
    parts.push(renderTocBlock({ items: v.selected === null
      ? [{ id: 'phu-candidates', text: m('skill-calorie.photo-pickerDoc.c032') }]
      : [{ id: 'phu-candidates', text: m('skill-calorie.photo-pickerDoc.c033') }, { id: 'phu-snapshot', text: m('skill-calorie.photo-pickerDoc.c034') }] }));
    parts.push(renderKpiGrid([
      { label: m('skill-calorie.photo-pickerDoc.c035'), value: String(v.candidates.length), unit: m('skill-calorie.photo-pickerDoc.c036'), detail: v.truncated ? m('skill-calorie.photo-pickerDoc.c037', { p0: String(v.fullCount - v.candidates.length) }) : m('skill-calorie.photo-pickerDoc.c038') },
      { label: m('skill-calorie.photo-pickerDoc.c039'), value: v.selected ? m('skill-calorie.photo-pickerDoc.c040', { p0: String(v.selected.id) }) : m('skill-calorie.photo-pickerDoc.c041'), detail: v.selected ? (v.selectedInList ? m('skill-calorie.photo-pickerDoc.c042') : m('skill-calorie.photo-pickerDoc.c043')) : m('skill-calorie.photo-pickerDoc.c044') },
      cantSee > 0
        ? { label: m('skill-calorie.photo-pickerDoc.c045'), value: String(okCount), unit: m('skill-calorie.photo-pickerDoc.c046'), detail: missCount > 0 ? m('skill-calorie.photo-pickerDoc.c047', { p0: String(missCount) }) : m('skill-calorie.photo-pickerDoc.c048'), status: 'warn', statusText: m('skill-calorie.photo-pickerDoc.c049') }
        : { label: m('skill-calorie.photo-pickerDoc.c050'), value: String(okCount), unit: m('skill-calorie.photo-pickerDoc.c051'), detail: m('skill-calorie.photo-pickerDoc.c052') },
    ]));
    // 页顶提示块（#438 口径：计数一处说 ＋ 给替代操作；本页的替代操作是「按编号挑着删」）。
    // 「这一页放不下」的件数只在这里说一次——读数卡的说明栏只说文件缺失那一档（同一事实一页一处）。
    if (budgetCount > 0) {
      parts.push(notice({
        msg: m('skill-calorie.photo-pickerDoc.c053', { p0: String(budgetCount) }),
        detail: m('skill-calorie.photo-pickerDoc.c054'),
      }));
    }
    parts.push(candidateGridHtml(v.candidates, embeds, skipReason, today));
    parts.push(snapshotHtml(v.selected, snap, snapInlined, today));
    if (v.selected && !v.selectedInList) {
      parts.push(renderEmptyBlock({ text: m('skill-calorie.photo-pickerDoc.c055', { p0: String(v.selected.id) }) }));
    }
    parts.push(promptCopyArea(v.prompt));
    parts.push(copyAreaOf(v, command));
    return parts.join('');
  };
  const baseBytes = Buffer.byteLength(shell(contentOf([], new Map())), 'utf8') + snapBytes;
  const picks = embedPhotosWithinBudget(photosDir, v.candidates, baseBytes, PHOTO_LIST_PAGE_MAX_BYTES);
  let html = shell(contentOf(picks.embeds, picks.skipReason));
  for (let round = 0; round < 3 && Buffer.byteLength(html, 'utf8') > PHOTO_LIST_PAGE_MAX_BYTES; round += 1) {
    const rest = picks.embeds.filter((e) => e.dataUri !== null && !picks.skipReason.has(e.fileName))
      .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
    if (rest.length === 0) break;
    picks.skipReason.set((rest[0] as PhotoEmbed).fileName, EMBED_BUDGET_REASON);
    html = shell(contentOf(picks.embeds, picks.skipReason));
  }
  return html;
}
