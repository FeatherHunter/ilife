/** #341 · 看身材照整页文档（完整文档＋内嵌照片＋复制区）。
 *
 * `gallery.ts` 的调用处（票面“gallery 调用处”即本件）：取数仍是 `photo.ts` 的
 * `buildGalleryData`，本件只做呈现组装——身份徽章＋读数卡＋照片网格＋明细表＋复制区，
 * 经共用件 `assembleDocPage` 包成 `<!doctype html>` 起的完整文档。
 * 体重参考切片：`src/weight/plateDocs.ts`（KPI＋表＋`dataCopyArea`＋`assembleDocPage`）。
 *
 * #438 · 体积退让：渲染期按 `PHOTO_LIST_PAGE_MAX_BYTES` 逐张试嵌（口径与取值均沿用
 * t400 裁定 3，见 t438 文档）。横幅的**触发与 M 只按预算跳过计数**（文件缺失不进横幅，
 * 见 t438 §一 整改），**复制数据仍是全量行**（只截断内嵌，不截断数据）。
 *
 * #472（读侧 A 组）· 文本与展示：眉标去掉内部命令名与「域」；三种态用同一套人话词汇；
 * 相对天数在**装配层**按 `todayISO()` 现算；文件名收成可复制小字块；明细表只标异常。
 * 取值口径（预算／缺失／未校验三态归属）与复制数据一字未改。
 *
 * **#526（读侧族重排 · 本票）**——四条改动，取值口径与体积退让行为一行未改：
 *   ① **形状化**：原来靠 `·`／`；` 串起来的四处全落成形状（节点级命中 34 → 0）——
 *      页头身份行改 `chipRow()` 徽章列（筛选／窗口）、图注三件事改徽章列、缺失清单的
 *      `编号 · 文件名 · 徽标` 三串一改由**网格里那张自己的占位**承担（同一事实一页一处）、
 *      KPI 明细 `8 张找不到文件 · 10 张太大未显示` 拆成两张卡各说一件事；
 *   ② **文案去冗余**：`内嵌 N/M 张` 这类内部叫法出页面（改「本页显示 N 张／共找到 M 张」）；
 *      同一事实（本窗张数）原本在页头、KPI、表注各说一遍 ⇒ 只留 KPI 与表注两处**各说各的**
 *      （KPI 说「共找到」，表注说「按时间倒序」）；缺失清单整块删（网格占位已逐张点名）；
 *   ③ **网格化**：照片改等高卡片网格（`aspect-ratio:4/5` ＋ `object-fit:cover`），
 *      没显示的那张在自己的格位上写明**哪一份文件**与**为什么**（退让不许静默，#438 口径）；
 *   ④ **手机端**：本族页内样式住 `photoUi.ts`（断点 820／640，触摸区 ≥44px），
 *      明细表窄屏给「可以左右滑」这一行提示。
 *   ⑤ **收口（本席位）**：逐张的复制按钮撤掉（一页 44 颗药丸按钮压过图注，其中 22 颗是公共层自动补的
 *      禁用「复制日志」）；表的 `caption` 槽在公共层窄屏行卡化里被挤成 32px 竖排（`dom.mjs` 实测），
 *      改成「照片清单」小节标题 ＋ 表下「按时间倒序」口径行。取值口径与体积退让一行未改。
 */
import { renderCaliberLine, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import { escapeHtml, renderStatusBadge } from 'base-paint';
import { assembleDocPage } from '../shared/docPage.js';
import { dataCopyArea, notice } from '../shared/copyArea.js';
import { todayISO } from '../analysis/utils.js';
import type { GalleryData, PhotoCard } from './photo.js';
import { embedPhotos, embedPhotosWithinBudget, type PhotoEmbed } from './photoThumb.js';
import { chipRow, photoUiCss } from './photoUi.js';

/** envelope 头（值冻结对齐 cli/keys.ts ENVELOPE_VERSION／CALORIE_SKILL；测试钉死一致）。 */
const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';

/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  #526：`卡路里·身材照片` 里的 `·` 是符号顶替版面（题名不是并列语义），改空格。 */
const DOC_TITLE = '卡路里 身材照片';

/** 本页小节标题的类名（#467 先例：KPI 区那把尺，同 `viewerDoc`／`compareDoc`，不新造样式）。 */
const H2_CLASS = 'ilife-block-kpi-card-title';

/** 单页体积上限（字节）：本票首定，供 281／282／352 复用（见 t341 文档）。
 *  实测 2 张小图约 60KB（含 ~60KB 文档壳）；1 MiB 直嵌仅容 3~4 张 200KB 实拍。
 *  #438 起本值**真的被渲染路径引用**：`buildPhotoListDoc` 逐张试嵌，超限即退让
 *  （横幅明示＋占位态），不再无声全量内嵌（改值须同步四处引用件与 t341 体积节）。 */
export const PHOTO_LIST_PAGE_MAX_BYTES = 1024 * 1024;

/** 文件名键：库内 `photoPath` 可能与内嵌件取的名字不同（补全路径口径），两处都试。 */
function fileNameOf(photoPath: string): string {
  return photoPath.split('/').pop()?.split('\\').pop() ?? photoPath;
}

/** 未内嵌的归属：文件缺失／读取失败／文件过大（内嵌件判的），与体积预算（本件判的）。 */
function isNonBudgetSkip(e: PhotoEmbed | undefined): boolean {
  return e === undefined || e.dataUri === null;
}

/** 没显示的那张：**一句话说为什么** ＋ 一句读者能做的下一步（原来这两句串在一行里）。
 *  #526 收口时试过把「为什么」撤掉（理由：页顶提示块与读数卡各有一处「主」），但**占位必须写明原因**
 *  是本票目标第 5 条的硬要求，且既有测试（`photo-budget-438`／`photo-shape-341`）逐字钉着这两句；
 *  故保留「为什么」，页顶提示块说**这一窗有多少张**、这一格说**这一张为什么**，两处各说各的。 */
function missReason(e: PhotoEmbed | undefined, skipReason: string | undefined): { badge: string; why: string; what: string } {
  if (skipReason !== undefined) {
    return { badge: '原图太大', why: '超过一页能装的量，没进这一页', what: '想看这一张：自己打开下面的文件' };
  }
  const raw = e?.missing ?? '';
  if (raw === '') return { badge: '没显示', why: '这一张没能放上页面', what: '下面留着它的文件名' };
  if (raw.includes('过大')) return { badge: '原图太大', why: '超过一页能装的量，没进这一页', what: '想看这一张：自己打开下面的文件' };
  if (raw.includes('未配照片目录')) return { badge: '读不到', why: '还没有设照片目录，读不到文件', what: '设好照片目录再跑一次' };
  if (raw.includes('文件缺失')) return { badge: '找不到文件', why: '照片记录还在，文件不在照片目录里', what: '把文件放回照片目录就会有图' };
  return { badge: '读不出', why: '这一张读不出来', what: '下面留着它的文件名' };
}

/** 相对天数（#472 图注第三段）：**装配层**按当刻「今天」现算；未到／算不出即不出这一段。 */
function relativeDays(date: string, today: string): string {
  const days = Math.round((Date.parse(today + 'T12:00:00Z') - Date.parse(date + 'T12:00:00Z')) / 86400000);
  if (!Number.isFinite(days) || days < 0) return '';
  return days === 0 ? '今天' : days + ' 天前';
}

/** 窗口天数（页头身份行那一枚徽章）：取头尾真实区间，不拿 `days` 参数冒充。 */
function windowDaysOf(g: GalleryData): number {
  const from = Date.parse(g.filters.dateFrom + 'T12:00:00Z');
  const to = Date.parse(g.filters.dateTo + 'T12:00:00Z');
  if (!Number.isFinite(from) || !Number.isFinite(to)) return 0;
  return Math.round((to - from) / 86400000) + 1;
}

/** 一张照片的格位（#526）：能看的走 `aspect-ratio` 图片框，没显示的走占位（**哪一份文件 ＋ 为什么**）。
 *  图注＝时刻（一行粗体）＋ 徽章列（编号／标签／相对时间）＋ 文件名小字块，三件事各有各的形状。
 *
 *  #526 收口：**逐张的复制按钮撤掉**。原来每张卡调 `copyActionHtml()`，一页 22 张就是 44 颗药丸按钮
 *  （其中 22 颗是公共层 `renderActionBar` 自动补的**禁用「复制日志」**，见 `controls.ts:1367` 的 #336 兜底），
 *  按钮比图注还抢眼，而「复制日志」在单张卡里没有所指。文件名仍是可选中的小字块（同 #472 的「小字块」本意），
 *  机器面由页尾的「复制数据」承担（envelope 逐张带 `photoPath`）。公共层的兜底按钮不在本票写集，故从**调用面**收。 */
function figureHtml(p: PhotoCard, e: PhotoEmbed | undefined, skipReason: string | undefined, today: string): string {
  const fileName = e?.fileName ?? fileNameOf(p.photoPath);
  const shown = e?.dataUri != null;
  const stage = shown
    ? '<div class="phu-shot"><img src="' + (e as PhotoEmbed).dataUri
      + '" alt="身材照 ' + p.id + '" style="max-width:100%;width:100%;height:100%;object-fit:cover" /></div>'
    : (() => {
      const m = missReason(e, skipReason);
      return '<div class="phu-shot"><div class="phu-miss">'
        + renderStatusBadge({ status: m.badge === '原图太大' ? 'warn' : 'danger', text: m.badge })
        + '<code>' + escapeHtml(fileName) + '</code><div>' + escapeHtml(m.why) + '</div>'
        + '<div>' + escapeHtml(m.what) + '</div></div></div>';
    })();
  const rel = relativeDays(p.date, today);
  const when = p.date + (p.time === null ? '' : ' ' + p.time.slice(0, 5));
  const tags = p.tagList.length > 0 ? [...p.tagList] : ['无标签'];
  return '<figure class="phu-card" data-id="' + p.id + '">' + stage
    + '<figcaption class="phu-cap"><div class="phu-when">' + escapeHtml(when) + '</div>'
    + chipRow(['编号 ' + p.id, ...tags, rel])
    + '<div class="phu-file"><code>' + escapeHtml(fileName) + '</code></div>'
    + '</figcaption></figure>';
}

/** 「这一页缺什么 ＋ 怎么办」那一块（#472 改公共层静态提示块；#526 拆成两句、去掉分号；
 *  **收口再并一格**）：原来「找不到文件 N 张」自占一张读数卡，加上预算提示块，首屏是「三张卡＋一块」，
 *  读者一眼看不出先看什么。收口把两件事并成**一块**放在页头（徽章列之后、读数卡之前）——
 *  阅读顺序变成「这一页是什么（标题＋徽章）→ 缺什么／怎么办（本块）→ 有多少（读数卡）→ 图」。
 *
 *  触发口径照旧：#438 要求「预算提示块只按预算跳过计数」——`还有 M 张原图太大` 这句**只在有预算跳过时出**，
 *  仅文件缺失时出的是另一句（`N 张照片的文件不在照片目录里，图放不出来`），两态的归因不混。 */
function missNoticeHtml(budgetSkippedCount: number, missingCount: number): string {
  if (budgetSkippedCount <= 0 && missingCount <= 0) return '';
  if (budgetSkippedCount <= 0) {
    return notice({
      msg: missingCount + ' 张照片的文件不在照片目录里，图放不出来',
      detail: '把文件放回照片目录就会有图',
    });
  }
  return notice({
    msg: '还有 ' + budgetSkippedCount + ' 张原图太大，没进这一页',
    detail: (missingCount > 0 ? '另有 ' + missingCount + ' 张文件不在照片目录里。' : '')
      + '想全看：按标签挑，或者按日期挑一段时间',
  });
}

/** 没显示的张数（同一把尺：`skipReason` 活表里的不算——那部分由提示块说）。 */
function missingOf(g: GalleryData, embeds: PhotoEmbed[], skipReason: ReadonlyMap<string, string>): PhotoCard[] {
  return g.photos.filter((p) => {
    const key = fileNameOf(p.photoPath);
    return skipReason.get(key) === undefined && isNonBudgetSkip(embeds.find((x) => x.fileName === key));
  });
}

/** 本窗最近一张的日期（读数卡用；行序按日期倒序，仍取最大值，不依赖行序）。 */
function latestDateOf(g: GalleryData): string {
  return g.photos.reduce((acc, p) => (p.date > acc ? p.date : acc), g.photos[0]?.date ?? '');
}

/** 读数卡（#526 重排；收口再收一格）：本页显示／最近一张——一格一件事，明细位不串第二件事。
 *  「找不到文件 N 张」那一格**并入页头的「缺什么」块**（`missNoticeHtml`）：首屏少一张卡，
 *  缺什么集中在一条里说，读数卡只留「这一页有多少、最近一张是哪天」。 */
function kpiCards(g: GalleryData, embeddedCount: number, daysSince: number | null): KpiCardInput[] {
  return [
    { label: '本页显示', value: embeddedCount + ' 张', detail: '共找到 ' + g.totalCount + ' 张' },
    {
      label: '最近一张', value: latestDateOf(g),
      detail: daysSince === null ? '日期算不出来' : (daysSince === 0 ? '就是今天拍的' : daysSince + ' 天前拍的'),
    },
  ];
}

/** 明细表：只标异常（正常行留空——「存在」是零信息值）。#526 收成四列（文件名列下屏：
 *  网格里每张照片下面就是文件名），窄屏另给一行「可以左右滑」的提示。
 *
 *  #526 收口：**表题行换成「小节标题 ＋ 表下的口径行」**。`renderDataTable` 的 `caption` 槽在公共层
 *  窄屏行卡化（`blocks.ts:1691` 那段 `@media (max-width:640px)`，t154-r3 在途）里实测被挤成
 *  **32×106 px 的竖排**（`dom.mjs` 读数：`caption.box.w=32`，6 行），一句话读不了；改成小节标题
 *  「照片清单」＋表下一行口径「按时间倒序」，两处都走公共层既有的文字形状，不写死字号内距。 */
function detailTable(g: GalleryData, skipReason: ReadonlyMap<string, string>): string {
  const rows = g.photos.map((p) => {
    const key = fileNameOf(p.photoPath);
    const status = p.fileExists === false ? '缺文件'
      : (skipReason.get(key) !== undefined ? '太大没显示' : (p.fileExists === null ? '没核对' : ''));
    return { id: p.id, date: p.date, tags: p.tagList.join(' '), status };
  });
  return '<section><h2 class="' + H2_CLASS + '">照片清单</h2>'
    + renderDataTable({
      columns: [
        { key: 'id', label: '编号', align: 'right' },
        { key: 'date', label: '日期' },
        { key: 'tags', label: '标签' },
        { key: 'status', label: '状态' },
      ],
      rows,
      emptyText: '本窗无身材照',
    })
    + renderCaliberLine('按时间倒序') + '</section>';
}

function contentOf(
  g: GalleryData,
  embeds: PhotoEmbed[],
  skipReason: ReadonlyMap<string, string>,
  today: string,
): string {
  const byName = new Map(embeds.map((e) => [e.fileName, e]));
  const embeddedCount = embeds.filter((e) => e.dataUri !== null).length;
  const missingCount = missingOf(g, embeds, skipReason).length;
  const win = windowDaysOf(g);
  const parts: string[] = [photoUiCss()];
  parts.push(chipRow([g.filters.tag ? '标签 ' + g.filters.tag : '全部标签', win > 0 ? '近 ' + win + ' 天' : '']));
  // 阅读顺序（收口定）：① 这一页是什么＝标题＋徽章列；② 缺什么／怎么办＝这一块；③ 有多少＝读数卡；④ 图。
  parts.push(missNoticeHtml(skipReason.size, missingCount));
  parts.push(renderKpiGrid(kpiCards(g, embeddedCount, g.daysSinceLast)));
  parts.push('<div class="phu-grid">' + g.photos.map((p) => {
    const key = fileNameOf(p.photoPath);
    return figureHtml(p, byName.get(key), skipReason.get(key), today);
  }).join('') + '</div>');
  parts.push(detailTable(g, skipReason));
  parts.push('<div class="phu-scroll-hint">表格宽，手机上按住左右滑可以看全</div>');
  const items = g.photos.map((p) => ({
    id: p.id, date: p.date, photoPath: p.photoPath, tagList: [...p.tagList], fileExists: p.fileExists,
  }));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: 'calorie.photo.list',
      data: { items, total: g.totalCount },
    },
  }));
  return parts.join('');
}

/** 看身材照整页：完整文档（doctype 起、charset、版面、复制区）＋按预算内嵌＋缺失明示。
 *  #472：眉标（内部命令名＋内部词「域」）整行去掉；相对天数按当刻「今天」现算（`todayISO()`）。
 *  #526：标题去掉 `·`（张数改由身份徽章之外的读数卡说），副标题并入身份徽章行。 */
export function buildPhotoListDoc(g: GalleryData, photosDir?: string | null): string {
  const today = todayISO();
  const shell = (content: string): string => assembleDocPage({
    docTitle: DOC_TITLE,
    title: '看身材照',
    eyebrow: '',
    subtitle: null,
    content,
    charts: false,
    // #526 收口：接上 #525 的页面级移动端配方（`viewport-fit=cover`／安全区／44px 触摸区／
    // 窄屏字号下限与表格卡片化／页内定位）。不传即老路，本票传真——用户第 2 条要的就是它。
    pageUi: true,
  });
  // 两步：先算**不含任何内嵌字节**的页面底子，再把剩下的预算按顺序分给逐张照片。
  const baseBytes = Buffer.byteLength(shell(contentOf(g, embedPhotos(null, g.photos), new Map(), today)), 'utf8');
  const picks = embedPhotosWithinBudget(photosDir ?? null, g.photos, baseBytes, PHOTO_LIST_PAGE_MAX_BYTES);
  let html = shell(contentOf(g, picks.embeds, picks.skipReason, today));
  // 兜底：底子或版面开销估偏时，逐张收回最大的内嵌（最多 3 轮）直到回到上限内。
  for (let round = 0; round < 3 && Buffer.byteLength(html, 'utf8') > PHOTO_LIST_PAGE_MAX_BYTES; round += 1) {
    const rest = picks.embeds.filter((e) => e.dataUri !== null && !picks.skipReason.has(e.fileName))
      .sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0));
    if (rest.length === 0) break;
    const victim = rest[0] as PhotoEmbed;
    picks.skipReason.set(victim.fileName, '体积预算未内嵌');
    html = shell(contentOf(g, picks.embeds, picks.skipReason, today));
  }
  return html;
}
