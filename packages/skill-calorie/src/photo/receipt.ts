/** #282 · 身材照片写后回执整页（完整文档＋内嵌照片＋复制区）。
 *
 * 7 条写入类场景（记身材照×3／删身材照／改·加·删照片标签）共用这一件装配：
 * 内容照老实物 `body_photo_receipt.html`（242 行），长相走新仓共用件
 * `assembleDocPage`（`src/shared/docPage.ts`）＋ `copyArea`／`copyLog`
 * （`src/shared/copyArea.ts`）＋ `statusCard`／`reconcileDisclosure`
 * （`src/shared/receiptParts.ts`）。
 *
 * 老→新对照（t400 §二序 1，裁定 1）：
 * - op 三态徽章（`body_photo_receipt.html:154-156`）：create＝存入回执（绿）／
 *   update＝变更回执（橙）／delete＝删除回执（红）；图标 ✓／✎／✕ 与标题
 *   存入成功／修改成功／删除成功随 op 切（`:158-159` sub 徽章、`:161-165` id 卡）。
 * - 标签对照词随 scene 换（`:215-219`）：改照片标签＝改前改后／加照片标签＝
 *   加前加后／删照片标签＝删除前删除后；`html.ts:148` 硬编码改前改后在此终结。
 * - 无变化降级（`:227`）：`noChange` 即印「未产生实际变化」＋标题改「标签(未变化)」。
 * - 空标签灰底 `无`（`:195`）：before／after 空数组即印「无」。
 * - 照片明细（`:186-209`）：存／删摆缩略快照（`data:image/`，缺失即明示原因）＋
 *   标签＋编号日期＋备注＋状态；删前快照是硬删除唯一凭据（t400 §三序 7）。
 * - 间隔行（新保留 §三序 6）：`distance` 即印「距上次「tag」照已隔 N 天」。
 * - 自证行（t400 §六 C-6）：影响行数＋记录号＋契约版本经 `statusCard`／
 *   `reconcileDisclosure`／复制日志 `m5Line` 落页。
 * - 复制区（t400 裁定 5）：`copyArea({data, log})` 出「复制数据 ▾（纯文本／JSON／
 *   CSV 三选一）＋复制日志」，空态不出按钮（`copyArea.ts:40-41`）。
 *
 * 体积沿用 t341 首定 `PHOTO_LIST_PAGE_MAX_BYTES = 1048576`（定义地
 * `src/photo/galleryDoc.ts`，本件不另定值；改值走 t341 同步清单）。
 * `src/render/html.ts`（645 行，已超线）只读：本件不调它的照片段。
 */
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { reconcileDisclosure, statusCard } from '../shared/receiptParts.js';
import type { PhotoEmbed } from './photoThumb.js';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
const DOC_TITLE = '卡路里·身材照片回执';

/** op 三态徽章（老实物 `:155-156` 配色、`:158-159` sub 徽章、`:163-165` 标题图标）。 */
function opBadgeOf(op: CrudReceipt['op']): { badge: string; title: string; icon: string; verb: string; done: string; color: string } {
  if (op === 'delete') return { badge: '删除回执', title: '删除成功', icon: '✕', verb: '删除', done: '已删除', color: '#ff3b30' };
  if (op === 'update') return { badge: '变更回执', title: '修改成功', icon: '✎', verb: '修改', done: '已更新', color: '#ff9500' };
  return { badge: '存入回执', title: '存入成功', icon: '✓', verb: '新增', done: '已存入', color: '#34c759' };
}

/** 徽章行（徽章＋标题＋图标＋动词，配色随 op 切）。 */
function badgeBlock(receipt: CrudReceipt): string {
  const b = opBadgeOf(receipt.op);
  return '<div>徽章：<span style="background:' + b.color + '">' + escapeHtml(b.badge) + ' · ' + escapeHtml(receipt.scene) + '</span></div>'
    + '<div>' + escapeHtml(b.icon) + ' ' + escapeHtml(b.title) + ' · ' + escapeHtml(b.verb) + ' ' + escapeHtml(receipt.scene) + ' ' + escapeHtml(b.done) + '</div>';
}

/** id 卡（老实物 `:161-163`：编号＋场景＋摘要＋时间来源）。 */
function idCardTable(receipt: CrudReceipt): string {
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [
      { k: '编号', v: receipt.recordId === null ? '未设置' : '#' + receipt.recordId },
      { k: '场景', v: receipt.scene },
      { k: '摘要', v: receipt.summary },
      { k: '时间', v: receipt.meta.actionAt + ' · ' + receipt.meta.source },
    ],
    caption: '回执标识（记录号＋场景＋摘要＋时间来源）',
  });
}

/** 标签词随 scene 换（老实物 `:215-219`）。 */
function tagLabelsOf(scene: string): [string, string] {
  if (scene === '加照片标签') return ['加前', '加后'];
  if (scene === '删照片标签') return ['删除前', '删除后'];
  return ['改前', '改后'];
}

/** 空标签印「无」（老实物 `:195` 灰底 `无` 的新栈同形）。 */
function tagText(tags: readonly string[]): string {
  return tags.length > 0 ? tags.map(String).join('、') : '无';
}

/** 标签对照卡（改前改后／加前加后／删除前删除后＋无变化降级 `:227`）。 */
function tagDiffTable(receipt: CrudReceipt): string {
  const diff = receipt.tagDiff ?? { before: [], after: [] };
  const [lb, la] = tagLabelsOf(receipt.scene);
  const title = receipt.noChange ? '标签(未变化)' : '标签变更';
  const rows = [
    { k: lb, v: tagText(diff.before) },
    { k: la, v: tagText(diff.after) },
  ];
  const table = renderDataTable({
    columns: [{ key: 'k', label: '对照' }, { key: 'v', label: '标签' }],
    rows,
    caption: title + '（' + lb + ' → ' + la + '）',
  });
  return table + (receipt.noChange ? '<div>未产生实际变化</div>' : '');
}

/** 间隔行（新保留：距上次同 tag N 天）。 */
function distanceBlock(receipt: CrudReceipt): string {
  if (!receipt.distance) return '';
  return renderDataTable({
    columns: [{ key: 'k', label: '项' }, { key: 'v', label: '值' }],
    rows: [{ k: '拍照节奏', v: '距上次「' + receipt.distance.tag + '」照已隔 ' + receipt.distance.days + ' 天' }],
    caption: '规律拍照提示',
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

function shellOf(receipt: CrudReceipt, command: string, bodyParts: string[]): string {
  const parts = [
    renderKpiGrid([
      statusCard(receipt, '已写入身材照片'),
      { label: '影响行数', value: receipt.affectedRows + ' 行', detail: '本次写入的行数' },
      {
        label: '写入字段',
        value: receipt.writtenFields.length + ' 项',
        detail: receipt.writtenFields.join('、') || '未设置',
      },
    ]),
    badgeBlock(receipt),
    idCardTable(receipt),
    ...bodyParts,
    distanceBlock(receipt),
    reconcileDisclosure(receipt),
    receiptCopyArea(receipt, command),
  ].join('');
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: receipt.scene + ' · 回执',
    eyebrow: '身材照片 · 写后回执',
    subtitle: receipt.summary,
    content: parts,
  });
}

/** 存身材照回执整页（3 变体同形：单张／含备注／批量，明细逐张快照）。 */
export function buildPhotoAddDoc(
  receipt: CrudReceipt,
  opts: { embeds: readonly PhotoEmbed[]; tag: string; note?: string; date: string; command: string },
): string {
  const byName = new Map(opts.embeds.map((e) => [e.fileName, e]));
  const figures = receipt.items.map((it) => {
    const file = it.file ?? '';
    const e = byName.get(file);
    const img = e && e.dataUri !== null
      ? '<img src="' + e.dataUri + '" alt="身材照#' + (it.id ?? '') + '" />'
      : '<div>照片未内嵌（' + escapeHtml(e?.missing ?? '未知原因') + '）</div>';
    const meta = '#' + (it.id ?? '—') + ' · ' + opts.date + ' · 标签 ' + opts.tag + (opts.note ? ' · ' + opts.note : '');
    return '<figure data-id="' + (it.id ?? '') + '">' + img
      + '<figcaption>' + escapeHtml(meta) + ' · ' + escapeHtml(file) + ' · ' + escapeHtml(it.status) + '</figcaption></figure>';
  }).join('');
  const table = renderDataTable({
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
  });
  return shellOf(receipt, opts.command, ['<div>' + figures + '</div>', table]);
}

/** 删身材照回执整页（删前快照是硬删除唯一凭据；快照字节由调用方删前内嵌传入）。 */
export function buildPhotoRemoveDoc(
  receipt: CrudReceipt,
  opts: { embed: PhotoEmbed | null; command: string },
): string {
  const it = receipt.items[0];
  const e = opts.embed;
  const img = e && e.dataUri !== null
    ? '<img src="' + e.dataUri + '" alt="身材照#' + (it?.id ?? '') + '" />'
    : '<div>照片未内嵌（' + escapeHtml(e?.missing ?? '文件已随硬删除移除，快照仅保留文字行') + '）</div>';
  const tags = it?.tagList && it.tagList.length > 0 ? it.tagList.join('、') : '无标签';
  const fig = '<figure data-id="' + (it?.id ?? '') + '">' + img
    + '<figcaption>#' + (it?.id ?? '—') + ' ' + escapeHtml(it?.date ?? '') + ' ' + escapeHtml(tags)
    + ' · ' + escapeHtml(it?.photoPath ?? e?.fileName ?? '') + ' · ' + escapeHtml(it?.status ?? '') + '</figcaption></figure>';
  const table = renderDataTable({
    columns: [
      { key: 'id', label: '编号' },
      { key: 'date', label: '日期' },
      { key: 'file', label: '文件' },
      { key: 'status', label: '状态' },
    ],
    rows: receipt.items.map((x) => ({
      id: x.id === undefined || x.id === null ? '—' : String(x.id),
      date: x.date ?? '—',
      file: x.photoPath ?? '—',
      status: x.status,
    })),
    caption: '删除快照（删前取值，硬删除，不可恢复）',
    emptyText: '本次没有删除快照行',
  });
  return shellOf(receipt, opts.command, [fig, table, '<div>硬删除，不可恢复</div>']);
}

/** 改／加／删照片标签回执整页（对照词随 scene 换，无变化降级，空标签印「无」）。 */
export function buildPhotoTagDoc(receipt: CrudReceipt, opts: { command: string }): string {
  return shellOf(receipt, opts.command, [tagDiffTable(receipt)]);
}
