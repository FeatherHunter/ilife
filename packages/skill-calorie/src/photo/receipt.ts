/** #282 · 身材照片写后回执整页（完整文档＋内嵌照片＋复制区）；#476 按文本纪律整页过一遍。
 *
 * 7 条写入类场景（记身材照×3／删身材照／改·加·删照片标签）共用这一件装配：
 * 内容照老实物 `body_photo_receipt.html`（242 行），长相走新仓共用件
 * `assembleDocPage`（`src/shared/docPage.ts`）＋ `copyArea`／`copyLog`／`notice`
 * （`src/shared/copyArea.ts`）＋ `statusCard`（`src/shared/receiptParts.ts`）。
 *
 * #476 的改造口径（逐条对票面）：
 * - **冗余必删**：回执标识表只留「编号＋时间」（摘要＝副标题、场景＝标题，两行删）；影响行数卡删
 *   （那句话并进页尾折叠区「数据库改了 N 行」）；删除页原来印的「写入字段 0 项／未设置」删，
 *   改印「删除的照片」卡；页尾不再复用 `reconcileDisclosure` 的默认三项（记录编号／写入时间／
 *   回执格式），本域自己出「给 AI 核对的信息」折叠块（内文只留记录号 ＋ 数据库改动）。
 * - **人话**：状态卡说明随场景切（标签页「照片标签已更新」／删除页「照片已删除」）；字段名走
 *   本域映射表 `FIELD_LABELS`；来源串去库表名（`SOURCE_TEXTS`）；徽章行删「徽章：」并改成一句
 *   「标签已改好（照片 #36）」；「硬删除，不可恢复」在**页面可见文本**里只留 1 处（删除快照块的
 *   标题，改词「永久删除，无法恢复」）。
 * - **版面**：标签表改三态（保留／新增 `+ x`／移除 `− x`，列头「改前｜改后」）；无变化改走
 *   `notice()` 静态提示块；删除快照改独立块（标题＋图＋一行元数据＋警示块）；照片明细表只在
 *   **≥3 张或存在失败**时才出（图与表不再同数据印两遍）；图题改两行＋状态徽标，失败张才出
 *   「失败原因」；「距上次拍照 N 天」做成状态卡旁的独立小卡（`photo.ts` 补传 `distance`）。
 * - **机器口径不动**：`receipt.summary` 与 `items[].status` 原样进复制区载荷（页内可见文本另写
 *   人话：删除页的副标题与状态都由本件自写），免得写链「prose／items／库内行」三源一致
 *   （`cmd-write-40-persist`）被改坏。
 *
 * 老→新对照（t400 §二序 1，裁定 1）：
 * - op 三态徽章（`body_photo_receipt.html:154-156`）：create＝存入回执（绿）／
 *   update＝变更回执（橙）／delete＝删除回执（红）。
 * - 标签对照词随 scene 换（`:215-219`）：改照片标签＝改前改后／加照片标签＝加前加后／
 *   删照片标签＝删除前删除后。
 * - 照片明细（`:186-209`）：存／删摆缩略快照（`data:image/`，缺失即明示原因）。
 * - 复制区（t400 裁定 5）：`copyArea({data, log})` 出「复制数据 ▾（纯文本／JSON／CSV 三选一）
 *   ＋复制日志」，空态不出按钮（`copyArea.ts:40-41`）。
 *
 * 体积沿用 t341 首定 `PHOTO_LIST_PAGE_MAX_BYTES = 1048576`（定义地
 * `src/photo/galleryDoc.ts`，本件不另定值；改值走 t341 同步清单）。
 * `src/render/html.ts`（647 行，已超线）只读：本件不调它的照片段。
 */
import { escapeHtml, renderStatusBadge } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderDataTable, renderDisclosure, renderKpiGrid } from 'base-paint/blocks';
import type { KpiCardInput } from 'base-paint/blocks';
import type { CrudReceipt, ReceiptItem } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import { statusCard } from '../shared/receiptParts.js';
import type { PhotoEmbed } from './photoThumb.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·身材照片回执';

/** 写库字段名 → 人话。**本域映射表**（#476 票面点了这六个）：公共层 `shared/writeParts.ts` 与
 *  跨域的 `shared/fieldLabel.ts` 本票不动，故表住这里；未登记的名字原样留（不编词、不吞字段）。 */
const FIELD_LABELS: Readonly<Record<string, string>> = Object.freeze({
  tags: '标签', srcPaths: '照片路径', tag: '标签', note: '备注', date: '日期', time: '时间',
});

/** 数据来源串 → 人话（去库表名「body_photos」）；三条来源在 `photo.ts` 给出，未登记的原样留。 */
const SOURCE_TEXTS: Readonly<Record<string, string>> = Object.freeze({
  'body_photos (写库回执)': '照片记录 · 存了新照片',
  'body_photos (删除快照)': '照片记录 · 删掉了',
  'body_photos (标签更新)': '照片记录 · 改了标签',
});

/** op 三态徽章（老实物 `:155-156` 配色；色值住本域，公共层色档徽章另用于逐张照片的状态）。 */
function opBadgeOf(op: CrudReceipt['op']): { badge: string; color: string } {
  if (op === 'delete') return { badge: '删除回执', color: '#ff3b30' };
  if (op === 'update') return { badge: '变更回执', color: '#ff9500' };
  return { badge: '存入回执', color: '#34c759' };
}

/** 干完的那一句人话（原来是「✎ 修改成功 · 修改 改照片标签 已更新」这种拼装）。
 *  「没有变化」的那次不出这句（真话由无变化提示块说），免得同一页自相矛盾。 */
function doneTextOf(receipt: CrudReceipt): string {
  if (receipt.op === 'delete') return '照片已删除（#' + (receipt.recordId ?? '—') + '）';
  if (receipt.op === 'update') return '标签已改好（照片 #' + (receipt.recordId ?? '—') + '）';
  const n = receipt.items.filter((it) => it.reason === '').length;
  return n > 1 ? n + ' 张照片都存好了' : '照片已经存好（#' + (receipt.recordId ?? '—') + '）';
}

/** 状态卡说明随场景切（删除页原来写「已写入身材照片」，与语义相反）。 */
function writtenDetailOf(receipt: CrudReceipt): string {
  if (receipt.op === 'delete') return '照片已删除';
  if (receipt.op === 'update') return '照片标签已更新';
  return '照片已存入';
}

/** 空标签印「无标签」（#476 统一：删除页本来就写「无标签」，标签表那边原来写「无」——「无」不知所指）。 */
function tagText(tags: readonly string[]): string {
  return tags.length > 0 ? tags.map(String).join('、') : '无标签';
}

/** 每次写后必看的两格：状态 ＋（删除页＝删掉的那张／其余＝这次改了哪些字段）＋（有前照时的节奏卡）。 */
function summaryCards(receipt: CrudReceipt): KpiCardInput[] {
  const cards: KpiCardInput[] = [statusCard(receipt, writtenDetailOf(receipt))];
  if (receipt.op === 'delete') {
    const it = receipt.items[0];
    cards.push({
      label: '删除的照片',
      value: '#' + (it?.id ?? '—') + ' · ' + (it?.date ?? '—') + ' · ' + tagText(it?.tagList ?? []),
    });
  } else {
    cards.push({
      label: '这次改了',
      value: receipt.writtenFields.map((f) => FIELD_LABELS[f] ?? f).join('、') || '—',
    });
  }
  // 专用小卡（原来那张表是死支：`distance` 位没人传，副标题里却印了一遍）。
  if (receipt.distance) {
    cards.push({ label: '拍照节奏', value: '距上次「' + receipt.distance.tag + '」拍照 ' + receipt.distance.days + ' 天' });
  }
  return cards;
}

/** 徽章行（op 徽章 ＋ 一句干完了的人话）：开发字样「徽章：」与拼装不通的动词串都不再出现。 */
function badgeBlock(receipt: CrudReceipt): string {
  const b = opBadgeOf(receipt.op);
  const pill = '<div><span style="background:' + b.color + '">'
    + escapeHtml(b.badge) + ' · ' + escapeHtml(receipt.scene) + '</span></div>';
  return receipt.noChange ? pill : pill + notice({ icon: 'ok', msg: doneTextOf(receipt) });
}

/** 回执标识表（#476：摘要＝副标题、场景＝标题，两行删；来源串去库表名改人话）。 */
function idCardTable(receipt: CrudReceipt): string {
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '编号', v: receipt.recordId === null ? '未设置' : '#' + receipt.recordId },
      { k: '时间', v: receipt.meta.actionAt + ' · ' + (SOURCE_TEXTS[receipt.meta.source] ?? receipt.meta.source) },
    ],
    caption: '记录标识（编号 ＋ 时间）',
  });
}

/** 页尾「给 AI 核对的信息」折叠块（#476 本域自渲染：不复用共用件的默认三项，内文只留记录号＋数据库改动）。 */
function aiCheckDisclosure(receipt: CrudReceipt): string {
  return renderDisclosure({
    title: '给 AI 核对的信息',
    contentHtml: renderDataTable({
      columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
      rows: [
        { k: '记录号', v: receipt.recordId === null ? '未设置' : String(receipt.recordId) },
        { k: '数据库改动', v: '数据库改了 ' + receipt.affectedRows + ' 行（给 AI 核对用）' },
      ],
    }),
  });
}

/** 标签词随 scene 换（老实物 `:215-219`）。 */
function tagLabelsOf(scene: string): [string, string] {
  if (scene === '加照片标签') return ['加前', '加后'];
  if (scene === '删照片标签') return ['删除前', '删除后'];
  return ['改前', '改后'];
}

/** 标签三态行（#476）：两列看不出增删，改成逐标签一行——保留（中性）／新增（`+ 侧身`）／移除（`− 晨起`）。 */
function tagRowsOf(before: readonly string[], after: readonly string[]): Array<Record<string, unknown>> {
  const inBefore = new Set(before);
  const inAfter = new Set(after);
  const all = [...before, ...after.filter((t) => !inBefore.has(t))];
  return all.map((t) => {
    const b = inBefore.has(t);
    const a = inAfter.has(t);
    const state = b && a ? '保留' : (a ? '新增' : '移除');
    return {
      tag: (state === '新增' ? '+ ' : (state === '移除' ? '− ' : '')) + t,
      before: b ? '✓' : '—',
      after: a ? '✓' : '—',
      state,
    };
  });
}

/** 标签变更表（三态对照；列头写业务说法，不再是空的「对照／标签」）＋无变化提示块。 */
function tagDiffTable(receipt: CrudReceipt): string {
  const diff = receipt.tagDiff ?? { before: [], after: [] };
  const [lb, la] = tagLabelsOf(receipt.scene);
  const rows = tagRowsOf(diff.before, diff.after);
  const table = renderDataTable({
    columns: [
      { key: 'tag', label: '标签' },
      { key: 'before', label: lb },
      { key: 'after', label: la },
      { key: 'state', label: '变化' },
    ],
    rows: rows.length > 0 ? rows : [{ tag: '无标签', before: '—', after: '—', state: '—' }],
    caption: '标签变更（' + lb + ' → ' + la + '）',
  });
  if (!receipt.noChange) return table;
  return table + notice({
    icon: 'info',
    title: '没有变化',
    msg: '这次没有改动任何东西',
    detail: '标签还是：' + tagText(diff.after),
  });
}

/** 复制区（裁定 5：复制数据＋复制日志，三件位置照基准骨架）。 */
function receiptCopyArea(receipt: CrudReceipt, command: string): string {
  const envelope: SerializableEnvelope = {
    version: DOC_VERSION, skill: DOC_SKILL, shape: 'receipt', key: receipt.meta.wakeWord,
    data: { ok: true, message: receipt.summary },
  };
  return copyArea({
    data: { envelope },
    log: {
      envelope,
      copyLog: copyLog({
        command, source: receipt.meta.source, m5Line: receipt.m5Line,
        actionAt: receipt.meta.actionAt, version: DOC_VERSION,
      }),
    },
  });
}

/** 副标题：删除页自写人话（机器摘要里那串「硬删除，不可恢复」不上可见文本），其余页沿用回执摘要。 */
function subtitleOf(receipt: CrudReceipt): string {
  if (receipt.op !== 'delete') return receipt.summary;
  const it = receipt.items[0];
  const bits = ['已删除照片 #' + (it?.id ?? '—'), it?.date ?? '—', tagText(it?.tagList ?? [])];
  if (it?.photoPath) bits.push(it.photoPath);
  return bits.join(' · ');
}

/** 单张照片的图题（两行式）：① 编号 · 日期 ＋状态徽标 ② 标签 · 文件名；只有失败张才出「失败原因」。 */
function photoFigureOf(
  it: ReceiptItem,
  byName: ReadonlyMap<string, PhotoEmbed>,
  opts: { tag: string; note?: string; date: string },
): string {
  const file = it.file ?? '';
  const e = byName.get(file);
  const failed = it.reason !== '';
  const media = failed
    ? '<div>这张没有存进来</div>'
    : (e && e.dataUri !== null
      // #484：图给宽度约束＋缩略级上限（存照回执可一次带多张，图别把页撑破）。
      ? '<img src="' + e.dataUri + '" alt="身材照#' + (it.id ?? '') + '" style="max-width:100%;max-height:240px;height:auto" />'
      : '<div>照片未内嵌（' + escapeHtml(e?.missing ?? '未知原因') + '）</div>');
  const line1 = '<div>' + (it.id === undefined || it.id === null ? '没有编号' : '#' + it.id)
    + ' · ' + escapeHtml(opts.date) + ' '
    + renderStatusBadge({ status: failed ? 'danger' : 'ok', text: it.status }) + '</div>';
  const line2 = '<div>' + (failed
    ? '源文件：' + escapeHtml(file)
    : escapeHtml('标签 ' + opts.tag + (opts.note ? ' · ' + opts.note : '') + (file ? ' · ' + file : ''))) + '</div>';
  const line3 = failed ? '<div>失败原因：' + escapeHtml(it.reason) + '</div>' : '';
  return '<figure data-id="' + (it.id ?? '') + '">' + media
    + '<figcaption>' + line1 + line2 + line3 + '</figcaption></figure>';
}

function shellOf(receipt: CrudReceipt, command: string, bodyParts: string[]): string {
  const parts = [
    renderKpiGrid(summaryCards(receipt)),
    badgeBlock(receipt),
    idCardTable(receipt),
    ...bodyParts,
    aiCheckDisclosure(receipt),
    receiptCopyArea(receipt, command),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '身材照片 · 写后回执',
    subtitle: subtitleOf(receipt),
    content: parts,
  });
}

/** 存身材照回执整页（3 变体同形：单张／含备注／批量；失败张也逐张上页，带失败原因）。 */
export function buildPhotoAddDoc(
  receipt: CrudReceipt,
  opts: { embeds: readonly PhotoEmbed[]; tag: string; note?: string; date: string; command: string },
): string {
  const byName = new Map(opts.embeds.map((e) => [e.fileName, e]));
  const figures = receipt.items.map((it) => photoFigureOf(it, byName, opts)).join('');
  const fails = receipt.items.filter((it) => it.reason !== '').length;
  // #476：图与「照片明细」表同数据印两遍，表只在张数多（≥3）或本次有失败（要横向对账）时才出。
  const table = receipt.items.length >= 3 || fails > 0
    ? renderDataTable({
      columns: [
        { key: 'id', label: '编号' },
        { key: 'file', label: '文件' },
        { key: 'tag', label: '标签' },
        { key: 'status', label: '状态' },
      ],
      rows: receipt.items.map((it) => ({
        id: it.id === undefined || it.id === null ? '—' : String(it.id),
        file: it.file ?? '—',
        tag: opts.tag + (opts.note ? ' · ' + opts.note : ''),
        status: it.status,
      })),
      caption: receipt.items.length > 1 ? '照片明细 · ' + receipt.items.length + ' 张' : '照片明细',
      emptyText: '本次没有照片明细',
    })
    : '';
  return shellOf(receipt, opts.command, ['<div>' + figures + '</div>', table]);
}

/** 删身材照回执整页：删除快照独立块（标题＋图＋一行元数据＋警示块）——删前快照是永久删除的唯一凭据。 */
export function buildPhotoRemoveDoc(
  receipt: CrudReceipt,
  opts: { embed: PhotoEmbed | null; command: string },
): string {
  const it = receipt.items[0];
  const e = opts.embed;
  const img = e && e.dataUri !== null
    ? '<img src="' + e.dataUri + '" alt="身材照#' + (it?.id ?? '') + '" style="max-width:100%;max-height:240px;height:auto" />'
    : '<div>照片未内嵌（' + escapeHtml(e?.missing ?? '文件已随删除移除，快照仅保留文字行') + '）</div>';
  const meta = '#' + (it?.id ?? '—') + ' · ' + (it?.date ?? '—') + ' · ' + tagText(it?.tagList ?? [])
    + ' · ' + (it?.photoPath ?? e?.fileName ?? '—');
  const snapshot = renderDisclosure({
    title: '删除前是这样的（永久删除，无法恢复）',
    open: true,
    contentHtml: '<figure data-id="' + (it?.id ?? '') + '">' + img
      + '<figcaption>' + escapeHtml(meta) + '</figcaption></figure>'
      + notice({ icon: 'warn', msg: '照片和记录都已经删掉了', detail: '还想留底的话，下次删之前先另存一份' }),
  });
  return shellOf(receipt, opts.command, [snapshot]);
}

/** 改／加／删照片标签回执整页（三态对照，对照词随 scene 换，无变化走提示块）。 */
export function buildPhotoTagDoc(receipt: CrudReceipt, opts: { command: string }): string {
  return shellOf(receipt, opts.command, [tagDiffTable(receipt)]);
}
