/** #281 · 对比两张照片整页文档（完整文档＋内嵌照片＋复制区）。
 *
 * 取数仍是 `photo.ts` 的 `buildCompareData`（并排＋间隔天数＋跨标签警告口径不变），
 * 本件只做呈现组装：间隔条（N 等于两张照片日期差）＋标签不一样时的提醒＋双卡对照（内嵌
 * `data:image/`，缺失明示哪张，缺失不牵连正常照片）＋两张照片的原始记录表＋复制区，
 * 经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 *
 * **#473（B 组）**：「间隔 N 天」只留一处；「跨标签／可比性／按日期正序」这类词出页面；图注同
 * 详情页口径；表注与副标题去掉 `#27 vs #32` 这种裸 id。复制区（给 AI 的机器内容）一字不动。
 *
 * 体积沿用 t341 首定 `PHOTO_LIST_PAGE_MAX_BYTES`（定义只在 `galleryDoc.ts`，本件只
 * 引用不另定；超预算即逐张弃最大者，页面出**人话**提示块报「哪张没显示／为什么」＋替代操作，
 * 见 `budgetNoticeHtml`；#499 前是「超预算横幅：已嵌 N 张／还有 M 张未嵌入（单页上限 1 MiB）」
 * 那套开发口吻，同域 #472 换口径时漏了本页，故那票补齐）。
 *
 * **#526（读侧族重排 · 本票）**——四条改动，体积退让行为（逐张弃最大者，`#438`／`#499` 口径）
 * 一行未改：
 *   ① **分隔符债归零**（节点级命中 5 → 0）：标题 `对比两张照片 · 间隔 48 天` 那半句 ⇒ 独立成
 *      `intervalStrip()`（大数字 ＋ 两张日期块）；图注 `#19 2026-05-30 17:44 · 4 个月前 正面 ·
 *      文件名` 五件事串一行 ⇒ 时刻＋徽章列＋文件名各自成形；
 *   ② **文案去冗余**：同一件事原本在页头标题、KPI 卡、提醒句（以及标签两处）说四遍 —— KPI 那
 *      两格（`角度一致吗`／`照片 2/2 张`）删掉，判语与建议合成**一条结论条**一处说；
 *   ③ **表格收列**：六列（含备注）窄屏被撑爆 ⇒ 收成四列，**状态列在两行都正常时整列不出现**
 *      （不印零信息列）；备注改由每张卡片自己的形状承载，一条信息不丢；
 *   ④ **手机端**：本族页内样式住 `photoUi.ts`（断点 820／640，触摸区 ≥44px），卡片宽屏并排、
 *      窄屏自动上下排列（可压窄的 flex 项，`min-width:0`）。
 *
 * **#654（读页复制日志 · 本席位）**：底部 ghost 行补回**真**「复制日志」——本页以前只有
 * `dataCopyArea`（只出数据那颗），日志那颗靠公共层 #336 兜底补的禁用占位（#654 已撤那条兜底路径）。
 * 现在本页自己给：`copyArea({ data, log })` 双位齐全，第 4 段＝本次命令原文（命令层 `compare.ts` 传
 * `commandLine()`）。取值口径与体积退让行为一行未改。
 */
import { escapeHtml, renderMediaPlaceholder } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderConclusionBar, renderDataTable } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { nowStamp } from '../render/receipt.js';
import { todayISO } from '../analysis/utils.js';
import { PHOTO_LIST_PAGE_MAX_BYTES } from './galleryDoc.js';
import { embedPhotos, type PhotoEmbed } from './photoThumb.js';
import { chipRow, intervalStrip, noteSegments, photoUiCss } from './photoUi.js';
import type { CompareData, PhotoCard } from './photo.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #526：`卡路里·身材照片` 里的 `·` 是符号顶替版面，改空格。 */
const DOC_TITLE = '卡路里 身材照片';

/** 本页小节标题的类名（#467 先例那把尺，不新造样式）。 */
const H2_CLASS = 'ilife-block-kpi-card-title';

/** 复制日志第 3 段后半的数据来源（前半＝库文件名，由 `shared/copyArea.ts` 的 `copyLog` 拼）。 */
const LOG_SOURCE = 'body_photos（两张照片记录）';

/** 标签不一样时给读者的判语与建议（#473 那句人话的语义，#526 收成**一条结论条**：
 *  原来同一件事在 KPI 卡、提醒行两处各说一遍；括号里那对 `正面／侧面` 改由卡片自己的徽章说）。 */
const CROSS_TAG_TEXT = '这两张的标签不一样，放在一起看不出真实变化。建议挑同角度的两张再对比。';
const SAME_TAG_TEXT = '两张标签一样，放在一起可以直接对照看变化。';

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

/** 什么时候拍的：`2026-05-30 17:44`（秒位不进页面）。 */
function whenText(p: PhotoCard): string {
  const hhmm = (p.time ?? '').slice(0, 5);
  return p.date + (hhmm === '' ? '' : ' ' + hhmm);
}

/** 单卡：内嵌图（`data:image/`）或占位（超预算弃嵌另注原因，正常照片不受牵连）；
 *  卡本身是**可折行**的 flex 项（宽屏并排、窄屏自动上下排列）——`flex:1 1 240px` ＋
 *  `min-width:0` 是让卡能被压窄的关键（少了 `min-width:0`，flex 项的下限仍是内容宽，窄屏照样撑破）。
 *  #526：图注五件事串一行改成「时刻 ＋ 徽章列 ＋ 文件名」；备注（用户自己连写的那几件事）
 *  按段落到形状上，不再靠 `/` 把一长串符号塞进表格单元格。 */
function cardHtml(p: PhotoCard, e: PhotoEmbed | undefined, dropped: boolean, today: string, noticeCovers: boolean): string {
  const fileName = e?.fileName ?? fileKeyOf(p.photoPath);
  const shown = !dropped && e?.dataUri;
  const stage = shown
    ? '<div class="phu-shot"><img src="' + e?.dataUri + '" alt="身材照 ' + p.id
      + '" style="max-width:100%;width:100%;height:100%;object-fit:cover" /></div>'
    : (() => {
      // #526 收口第二轮：占位改用公共层同规格媒体占位件（`renderMediaPlaceholder`，与真图同一段框体装配）。
      // 「为什么没显示」由页顶那条提示块**一处**说；这一格说**哪一份文件 ＋ 这一张该怎么办**。
      const next = dropped ? '想看原图：自己打开这份文件' : '把文件放回照片目录就会有图';
      const why = dropped ? '这一张太大，没放进本页' : '照片记录还在，文件不在照片目录里';
      return '<div class="phu-shot">' + renderMediaPlaceholder({
        alt: '身材照 ' + p.id, ratio: '4-5',
        reason: '没显示：' + fileName, next: (noticeCovers ? '' : why + '。') + next,
      }) + '</div>';
    })();
  const tags = p.tagList.length > 0 ? [...p.tagList] : ['无标签'];
  return '<figure class="phu-card" data-id="' + p.id + '" style="flex:1 1 240px;min-width:0">' + stage
    + '<figcaption class="phu-cap"><div class="phu-when">' + escapeHtml(whenText(p)) + '</div>'
    + chipRow(['编号 ' + p.id, ...tags, relTime(p.date, today)])
    + '<div class="phu-file"><code>' + escapeHtml(fileName) + '</code></div>'
    + (p.note === null || p.note === '' ? ''
      : '<div class="phu-file"><span class="phu-segs">' + noteSegments(p.note) + '</span></div>')
    + '</figcaption></figure>';
}

/** 明细行（可见文本缺值一律 `—`）。#526：备注列下屏（它由每张卡片自己的形状承载），
 *  状态列只在真有事（缺文件／没核对／太大没显示）时才出。 */
function detailRows(c: CompareData, dropped: ReadonlySet<string>): Array<Record<string, unknown>> {
  return [c.photo1, c.photo2].map((p) => ({
    id: p.id, date: p.date, tags: p.tagList.join(' ') || '—',
    status: p.fileExists === false ? '缺文件'
      : (dropped.has(fileKeyOf(p.photoPath)) ? '太大没显示' : (p.fileExists === null ? '没核对' : '')),
  }));
}

/** 间隔条（老页 `body_photo_compare.html:98`）：大数字 N 等于两张照片日期差。
 *  #473：间隔只在这里出现一次（KPI 里那格与它是同一件事，已删）。
 *  #526：不再挂在页头标题里（`对比两张照片 · 间隔 48 天`），改由本件出形状。 */
function intervalOf(c: CompareData): string {
  return intervalStrip(c.intervalDays, c.photo1.date, c.photo2.date);
}

/** 超预算提示块（#499 改同域人话口径，与 #472 的 `galleryDoc.budgetNoticeHtml` 同族）：
 *  走公共层静态提示块 `notice()`，不暴露页内上限与字节数这类内部单位。**超限不许静默**
 *  （#438／#472 口径）：仍要点名**哪张没显示**（逐张列文件名）与**为什么**（放不下是因为太大），
 *  并给出替代操作。触发与张数仍只取**体积让位**这一路（`dropped` 由 `buildPhotoCompareDoc` 的
 *  逐张弃最大者填）；文件本身缺失走各卡自己的占位句，不并进这条。 */
function budgetNoticeHtml(embeds: readonly PhotoEmbed[], dropped: ReadonlySet<string>): string {
  const names = embeds.filter((e) => dropped.has(e.fileName)).map((e) => e.fileName);
  return notice({
    // #499 钉死的两句（`photo-shape-read-281` 逐字断言）：提示块**一处**点名哪张没显示＋替代操作。
    msg: '这两张里有一张太大，本页没显示：' + names.map(escapeHtml).join('，'),
    detail: '可以打开文件名自己看，或改查单张详情分开看',
  });
}

/** 原始记录表（#526 收列）：编号／日期／标签，真有事时才多一列状态。 */
function recordTable(c: CompareData, dropped: ReadonlySet<string>): string {
  const rows = detailRows(c, dropped);
  const withStatus = rows.some((r) => r['status'] !== '');
  const columns = [
    { key: 'id', label: '编号', align: 'right' as const },
    { key: 'date', label: '日期' },
    { key: 'tags', label: '标签' },
    ...(withStatus ? [{ key: 'status', label: '状态' }] : []),
  ];
  return '<section><h2 class="' + H2_CLASS + '">两张照片的原始记录</h2>'
    + renderDataTable({ columns, rows, emptyText: '无对照明细' }) + '</section>';
}

/** 复制区（#654）：三格式数据 ＋ 复制日志六段（口径与 `galleryDoc.copyAreaOf` 同形：
 *  `log` 位收 `LogTextInput`＝`{ envelope, copyLog }`，给错形状那颗按钮就落成点不动的死按钮）。 */
function copyAreaOf(c: CompareData, command: string): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.photo.compare',
    data: {
      items: [c.photo1, c.photo2].map((p) => ({
        id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists,
      })),
      total: 2,
    },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({ command, source: LOG_SOURCE, actionAt: nowStamp(), version: DOC_VERSION }),
    },
  });
}

function contentOf(c: CompareData, embeds: readonly PhotoEmbed[], dropped: ReadonlySet<string>, command: string): string {
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const today = todayISO();
  const parts: string[] = [photoUiCss()];
  // 判语一处说（#526）：标签一样／不一样＋该怎么做，原来这层意思在 KPI 卡与提醒行各说一遍。
  parts.push(renderConclusionBar(c.crossTagWarning ? CROSS_TAG_TEXT : SAME_TAG_TEXT));
  parts.push(intervalOf(c));
  if (dropped.size > 0) parts.push(budgetNoticeHtml(embeds, dropped));
  // #484：两张并排（宽屏）／上下排列（窄屏）——折行容器＋可压窄的卡，两卡都放得下才不溢出。
  // #526 收口第二轮（对抗审查必改 ②）：容器挂 `.phu-compare`，`align-items:stretch` 让两栏**等高**。
  // 原来是一行内联 `display:flex`，卡高按各自内容定——一边有图一边是占位时，短的那栏底下留一大片
  // 空灰（审查 @1280 给 55 分的那处）。等高之后，短栏的图注与舞台按格拉伸，两栏下沿齐平。
  parts.push('<div class="phu-compare">' + [c.photo1, c.photo2].map((p) =>
    cardHtml(p, byName.get(fileKeyOf(p.photoPath)), dropped.has(fileKeyOf(p.photoPath)), today, dropped.size > 0),
  ).join('') + '</div>');
  parts.push(recordTable(c, dropped));
  parts.push(copyAreaOf(c, command));
  return parts.join('');
}

function shellOf(c: CompareData, content: string): string {
  return assembleDocPage({
    docTitle: DOC_TITLE,
    // #526：标题不再挂「· 间隔 N 天」（那半句已成间隔条），副标题也不再写 `日期 vs 日期`
    //（两张日期就在间隔条的两端，同一事实不第二遍）。
    title: '对比两张照片',
    eyebrow: '',
    subtitle: null,
    content,
    charts: false,
    // #526 收口：接上 #525 的页面级移动端配方（`viewport-fit=cover`／安全区／44px 触摸区／
    // 窄屏字号下限／页内定位）。不传即老路，本票传真——用户第 2 条要的就是它。
    pageUi: true,
  });
}

/** 对比整页：完整文档（doctype 起、charset、版面、复制区）＋双卡内嵌＋体积让位提示块。
 *  #654：`command`＝本次命令原文（命令层 `compare.ts` 的 `commandLine()` 派生），进复制日志第 4 段。 */
export function buildPhotoCompareDoc(c: CompareData, photosDir: string | null | undefined, command: string): string {
  const embeds = embedPhotos(photosDir ?? null, [c.photo1, c.photo2]);
  // 超预算即逐张弃最大者（最多两轮），提示块报「哪张没显示／为什么」＋替代操作。
  const dropped = new Set<string>();
  let html = shellOf(c, contentOf(c, embeds, dropped, command));
  for (let round = 0; round < 2; round += 1) {
    if (Buffer.byteLength(html, 'utf8') <= PHOTO_LIST_PAGE_MAX_BYTES) break;
    const rest = embeds.filter((e) => e.dataUri !== null && !dropped.has(e.fileName))
      .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
    if (rest.length === 0) break;
    dropped.add((rest[0] as PhotoEmbed).fileName);
    html = shellOf(c, contentOf(c, embeds, dropped, command));
  }
  return html;
}
