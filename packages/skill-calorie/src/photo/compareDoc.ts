/** #281 · 对比两张照片整页文档（完整文档＋内嵌照片＋复制区）。
 *
 * 取数仍是 `photo.ts` 的 `buildCompareData`（并排＋间隔天数＋跨标签警告口径不变），
 * 本件只做呈现组装：间隔横幅（N 等于两张照片日期差）＋角度不一样的提醒（老实物
 * `body_photo_compare.html:75` 的行文按 #473 改成读者看得懂的话）＋双卡对照（内嵌
 * `data:image/`，缺失明示哪张，缺失不牵连正常照片）＋两张照片的原始记录表（缺值 `—`，
 * 复制数据保留原始空值）＋复制区，经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 *
 * **#473（B 组 · 文本精简／人话改写／展示升级）**：眉标整行删；「间隔 N 天」只留横幅那个
 * 大数字（KPI 里那一格是同一件事，删）；KPI 收成「角度一致吗」与「照片」两格；「跨标签／
 * 可比性／按日期正序」这类词出页面；图注同详情页口径（什么时候 ＋ 文件名小字块 ＋ 只在缺失时
 * 提示）；表注与副标题去掉 `#27 vs #32` 这种裸 id（副标题改日期对照）。复制区（给 AI 的机器内容）
 * 一字不动。
 *
 * 体积沿用 t341 首定 `PHOTO_LIST_PAGE_MAX_BYTES`（定义只在 `galleryDoc.ts`，本件只
 * 引用不另定；超预算即逐张弃最大者，页面出**人话**提示块报「哪张没显示／为什么」＋替代操作，
 * 见 `budgetNoticeHtml`；#499 前是「超预算横幅：已嵌 N 张／还有 M 张未嵌入（单页上限 1 MiB）」
 * 那套开发口吻，同域 #472 换口径时漏了本页，故本票补齐）。
 * `src/render/html.ts` 已超线只读：本件不调它的照片段。
 */
import { escapeHtml } from 'base-paint';
import { renderChips, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea, notice } from '../shared/copyArea.js';
import { todayISO } from '../analysis/utils.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import { embedPhotos, type PhotoEmbed } from './photoThumb.js';
import type { CompareData, PhotoCard } from './photo.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。 */
const DOC_TITLE = '卡路里·身材照片';

/** 两张角度不一样时的提醒行（#473 口径：老实物 `:75` 那句「跨标签对比警告……可比性较弱」改人话；
 *  本技能的照片标签就是角度，正面／侧面即两支的典型值）。 */
const CROSS_TAG_TEXT = '这两张的角度不一样（正面／侧面），放在一起看不出真实变化，建议用同角度对比';

function tagsText(p: PhotoCard): string {
  return p.tagList.length > 0 ? p.tagList.map(escapeHtml).join('、') : '无标签';
}

function fileKeyOf(photoPath: string): string {
  return photoPath.split('/').pop()?.split('\\').pop() ?? photoPath;
}

/** 相对时间（人话）：今天／昨天／N 天前／N 个月前／N 年前；按自然日粗算。
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

/** 单卡：内嵌图（`data:image/`）或缺失句（超预算弃嵌另注原因，正常照片不受牵连）；
 *  图注同详情页口径——什么时候 ＋ 标签 ＋ 文件名小字块（chip），文件只在缺失时提示。
 *  #484：图加宽度约束；卡本身是**可折行**的 flex 项（宽屏并排、窄屏自动上下排列）——
 *  `flex:1 1 240px` ＋ `min-width:0` 是让卡能被压窄的关键（少了 `min-width:0`，flex 项
 *  的下限仍是内容宽，窄屏照样撑破）。 */
function cardHtml(p: PhotoCard, e: PhotoEmbed | undefined, dropped: boolean, today: string): string {
  const img = !dropped && e?.dataUri
    ? '<img src="' + e.dataUri + '" alt="身材照#' + p.id + '" style="max-width:100%;height:auto" />'
    : '<div>照片没显示（' + escapeHtml(dropped ? '太大放不下：' + (e?.fileName ?? fileKeyOf(p.photoPath)) : (e?.missing ?? '未知原因')) + '）</div>';
  const gone = p.fileExists === false ? ' · 文件缺失' : '';
  return '<figure data-id="' + p.id + '" style="flex:1 1 240px;min-width:0">' + img +
    '<figcaption>#' + p.id + ' ' + whenText(p, today) + ' ' + tagsText(p) +
    ' · ' + renderChips({ items: [{ text: fileKeyOf(p.photoPath) }] }) + gone + '</figcaption></figure>';
}

/** 明细行（可见文本缺值一律 `—`）。 */
function detailRows(c: CompareData): Array<Record<string, unknown>> {
  return [c.photo1, c.photo2].map((p) => ({
    id: p.id, date: p.date, tags: p.tagList.join('、') || '—',
    note: p.note ?? '—', file: fileKeyOf(p.photoPath),
    status: p.fileExists === null ? '文件没核对' : p.fileExists ? '存在' : '缺失',
  }));
}

/** 超预算横幅（#499 改同域人话口径，与 #472 的 `galleryDoc.budgetNoticeHtml` 同族）：
 *  走公共层静态提示块 `notice()`，不再暴露页内上限与字节数这类内部单位，也不写「超预算横幅」
 *  这种开发前缀。**超限不许静默**（#438／#472 口径）：仍要点名**哪张没显示**（逐张列文件名）
 *  与**为什么**（放不下是因为太大），并给出替代操作。触发与张数仍只取**体积让位**这一路
 *  （`dropped` 由 `buildPhotoCompareDoc` 的逐张弃最大者填）；文件本身缺失走各卡自己的占位句，
 *  不并进这条——否则「一张太大 ＋ 一张文件不见」会被这条横幅一口说成同一回事。 */
function budgetNoticeHtml(embeds: readonly PhotoEmbed[], dropped: ReadonlySet<string>): string {
  const names = embeds.filter((e) => dropped.has(e.fileName)).map((e) => e.fileName);
  return notice({
    msg: '这两张里有一张太大，本页没显示：' + names.map(escapeHtml).join('、'),
    detail: '可以打开文件名自己看，或改查单张详情分开看',
  });
}

function contentOf(c: CompareData, embeds: readonly PhotoEmbed[], dropped: ReadonlySet<string>): string {
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const okCount = embeds.filter((e) => e.dataUri !== null && !dropped.has(e.fileName)).length;
  const today = todayISO();
  const parts: string[] = [renderKpiGrid([
    {
      label: '角度一致吗', value: c.crossTagWarning ? '不一致' : '一致',
      detail: c.crossTagWarning ? '两张标签不同' : '两张标签相同',
    },
    {
      label: '照片', value: okCount + '/' + embeds.length + ' 张',
      detail: okCount === embeds.length ? '2 张都已显示' : '有 ' + (embeds.length - okCount) + ' 张没显示',
    },
  ])];
  // 间隔横幅（老页 `body_photo_compare.html:98`）：大数字 N 等于两张照片日期差。
  // #473：间隔只在这里出现一次（KPI 里那格与它是同一件事，已删）。
  parts.push('<div>间隔 <b>' + c.intervalDays + '</b> 天</div>');
  if (c.crossTagWarning) parts.push('<div>' + escapeHtml(CROSS_TAG_TEXT) + '</div>');
  if (dropped.size > 0) parts.push(budgetNoticeHtml(embeds, dropped));
  // #484：两张并排（宽屏）／上下排列（窄屏）——折行容器＋可压窄的卡，两卡都放得下才不溢出。
  parts.push('<div style="display:flex;flex-wrap:wrap;gap:12px">' + [c.photo1, c.photo2].map((p) =>
    cardHtml(p, byName.get(fileKeyOf(p.photoPath)), dropped.has(fileKeyOf(p.photoPath)), today),
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
    caption: '两张照片的原始记录',
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
    // #473：眉标（`calorie.photo.compare · 身材照片域`）整行删——空串即不写这一行。
    eyebrow: '',
    // #473：副标题不再写裸 id（`#27 vs #32`），改两张照片的日期对照。
    subtitle: c.photo1.date + ' vs ' + c.photo2.date,
    content,
    charts: false,
  });
}

/** 对比整页：完整文档（doctype 起、charset、版面、复制区）＋双卡内嵌＋体积让位提示块。 */
export function buildPhotoCompareDoc(c: CompareData, photosDir?: string | null): string {
  const embeds = embedPhotos(photosDir ?? null, [c.photo1, c.photo2]);
  // 超预算即逐张弃最大者（最多两轮），提示块报「哪张没显示／为什么」＋替代操作。
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
