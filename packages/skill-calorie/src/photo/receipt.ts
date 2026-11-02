/** #282 · 身材照片写后回执整页（完整文档＋内嵌照片＋复制区）；#476 按文本纪律整页过一遍。
 *
 * 7 条写入类场景（记身材照×3／删身材照／改·加·删照片标签）共用这一件装配：
 * 内容照老实物 `body_photo_receipt.html`（242 行），长相走新仓共用件
 * `assembleDocPage`（`src/shared/docPage.ts`）＋ `copyArea`／`copyLog`／`notice`
 * （`src/shared/copyArea.ts`）＋ `statusCard`（`src/shared/receiptParts.ts`）。
 *
 * ══ #528 窄席位 A（2026-09-15）：重排「记身材照」「删身材照」两页 ══
 *
 * 本席位**只做这两页**：09-09 记身材照（`buildPhotoAddDoc`）／09-13 删身材照
 * （`buildPhotoRemoveDoc`）。同票的**标签三态三页**（09-10／11／12，`buildPhotoTagDoc`）归
 * 另一席位——为免两席位同时改一份产物，本席位把老壳原封留给它（`shellOf`／`summaryCards`／
 * `badgeBlock`／`idCardTable`／`doneTextOf`／`writtenDetailOf`／`SOURCE_TEXTS`／`FIELD_LABELS`
 * 七件一字未动），两页改走新壳 `writeShell`。两席位落地后老壳连同 `statusCard` 一起退休。
 *
 * 四条改动（判据逐条可复核）：
 *  ① **重复收敛**（用户第 4 条）：旧页同一件事说四遍——副标题（回执摘要）／状态卡（「照片已存入」）／
 *     徽章行（`存入回执 · 批量存照片`）／反馈条（「3 张照片都存好了」）。新页**只留一处说清**：
 *     反馈条说结果、读数卡给数字、徽章列给类型，**副标题整行删**（摘要仍在复制区载荷里，机器面不变）。
 *  ② **分隔符债归零**（用户第 5 条）：判据是 `scripts/audit-separators.mjs` 的**节点级命中全零**。
 *     逐处换形状——`#36` 改「编号 36」（`#N` 形状算内部标识符）／`A · B · C` 串改键值行与读数卡／
 *     `照片路径、标签、备注、日期、时间` 改……整块删（见 ④）／逐张结果由「图＋表两份同数据」改
 *     一行一张（`renderListRows`，左中右三槽）；「这次改了」那张卡印的是库内字段名（内部口径），
 *     整套撤掉，读者要看的是**值**（标签／备注／拍摄日期）不是**列名**。
 *  ③ **形状化**（用户第 5 条）：两页各自成套——删身材照＝徽章列 ＋ 警示块（`renderFeedbackBlock`）
 *     ＋ 删除前快照块（图 ＋ 键值行）；记身材照＝读数卡（入库张数／拍照节奏）＋ 反馈条 ＋
 *     逐张结果行（成功绿、失败红，失败张逐张写「源文件：」「失败原因：」）＋ 批次键值行。
 *     「永久删除，无法恢复」**全页只 1 处**（警示块的判语，旧页在副标题与快照标题各印一遍）。
 *  ④ **文案纪律**（用户第 4 条）：去库表名与内部叫法（老壳的 `body_photos (写库回执)` 人话映射表
 *     在新页整套不用——「来源 照片记录（存了新照片）」读者拿不到信息，两页都不印）；单位不重复；
 *     符号不顶替文字。
 *
 * **机器口径一字不动**：`receipt.summary` 与 `items[].status` 原样进复制区载荷（写链「prose／items／
 * 库内行」三源一致判据 `cmd-write-40-persist` 钉的就是这两串），页内可见文本另写人话。
 *
 * 体积沿用 t341 首定 `PHOTO_LIST_PAGE_MAX_BYTES = 1048576`（定义地
 * `src/photo/galleryDoc.ts`，本件不另定值；改值走 t341 同步清单）。
 * `src/render/html.ts`（647 行，已超线）只读：本件不调它的照片段。
 */
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import { renderChangeRows, renderDataTable, renderDisclosure, renderKpiGrid, renderListRows } from 'base-paint/blocks';
import type { ChangeRowInput, KpiCardInput } from 'base-paint/blocks';
import type { CrudReceipt } from '../render/receipt.js';
import { assembleDocPage } from '../shared/docPage.js';
import { copyArea, copyLog, notice } from '../shared/copyArea.js';
import type { PhotoEmbed } from './photoThumb.js';
import { chipRow, factRows, labelChips, receiptUiCss, sectionTitle, shotBlock } from './receiptUi.js';
import { m } from '../entries/index.js';
import { currentRenderLanguage, listJoin } from 'base-entries';

const DOC_VERSION = '0.1.0';
const DOC_SKILL = 'calorie';
/** 本页 head 标题（整页模板住 `src/shared/docPage.ts`，标题走参数）。
 *  取词在**调用时**发生（模块级常量不得在顶层取词：语言由运行期上下文决定）。 */
function docTitle(): string {
  return m('skill-calorie.photo-receipt.c068');
}

/** op 三态徽章（老实物 `:155-156` 配色；色值住本域，公共层色档徽章另用于逐张照片的状态）。 */
function opBadgeOf(op: CrudReceipt['op']): { badge: string; color: string } {
  if (op === 'delete') return { badge: m('skill-calorie.photo-receipt.c001'), color: '#ff3b30' };
  if (op === 'update') return { badge: m('skill-calorie.photo-receipt.c002'), color: '#ff9500' };
  return { badge: m('skill-calorie.photo-receipt.c003'), color: '#34c759' };
}

/** 编号的人话形状：`#36` 是**内部标识符**（判据 R7 的票号形状），两页一律写「编号 36」。 */
function idTextOf(id: number | undefined | null): string {
  return id === undefined || id === null ? m('skill-calorie.photo-receipt.c004') : m('skill-calorie.photo-receipt.c005', { p0: String(id) });
}

/** 空标签印「无标签」（#476 统一）；多标签走徽章列，**不再用 `、` 串**。 */
function tagListOf(tags: readonly string[] | undefined): string[] {
  const kept = (tags ?? []).map(String).filter((t) => t !== '');
  return kept.length === 0 ? [m('skill-calorie.photo-receipt.c006')] : kept;
}

/* ══════════════════════════════════════════════════════════════
 * 标签三态三页（09-10／11／12）：#528 窄席位 B
 * ══════════════════════════════════════════════════════════════ */

/** 对照列头随场景换（老实物 `:215-219`）：改照片标签＝改前改后／加照片标签＝加前加后／
 *  删照片标签＝删除前删除后。 */
function changeHeadOf(scene: string): { before: string; after: string } {
  if (scene === '加照片标签') return { before: m('skill-calorie.photo-receipt.c007'), after: m('skill-calorie.photo-receipt.c008') };
  if (scene === '删照片标签') return { before: m('skill-calorie.photo-receipt.c009'), after: m('skill-calorie.photo-receipt.c010') };
  return { before: m('skill-calorie.photo-receipt.c011'), after: m('skill-calorie.photo-receipt.c012') };
}

/** 标签逐行三态：**一行一个标签**，改前／改后两列按状态填——保留＝两列都写状态词（中性），
 *  新增＝新值槽写标签名（绿＋加粗），移除＝旧值槽写标签名（红＋删除线）。行首「变化」列写三态词；
 *  箭位恒空（`arrow: false` 仍占位），三列栅格由 `.phr-tags` 收口（`receiptUi.ts`）。 */
function tagChangeRowsOf(before: readonly string[], after: readonly string[]): string[] {
  const inBefore = new Set(before);
  const inAfter = new Set(after);
  const all = [...before, ...after.filter((t) => !inAfter.has(t) || !inBefore.has(t))];
  const uniq = all.filter((t, i) => all.indexOf(t) === i);
  return uniq.map((t) => {
    const b = inBefore.has(t);
    const a = inAfter.has(t);
    const state = b && a ? m('skill-calorie.photo-receipt.c013') : (a ? m('skill-calorie.photo-receipt.c014') : m('skill-calorie.photo-receipt.c015'));
    const row: ChangeRowInput = b && a
      ? { label: '\u2060', before: '', after: '', arrow: false }
      : { label: '\u2060', ...(a ? { after: t } : { before: t }), arrow: false };
    return '<div class="phr-tags-row phr-tag-' + (a ? 'add' : 'remove') + '">'
      + cellOf(state) + renderChangeRows({ rows: [row] }) + '</div>';
  });
}

/** 对照块的列头格（纯文本；列头随场景换）。 */
function cellOf(text: string): string {
  return '<span class="phr-tags-slot">' + escapeHtml(text) + '</span>';
}

/** 标签对照块：列头一行（改前／加前／删除前 ＆ 改后／加后／删除后）＋ 每个标签一行。
 *  空标签表也出一行（「没有标签」），免得读者分不清「没有标签」与「这块没渲染」。 */
function tagChangeBlock(receipt: CrudReceipt): string {
  const diff = receipt.tagDiff ?? { before: [], after: [] };
  const head = changeHeadOf(receipt.scene);
  const rows = tagChangeRowsOf(diff.before, diff.after);
  const body = rows.length === 0
    ? '<div class="phr-tags-row">' + cellOf(m('skill-calorie.photo-receipt.c016'))
      + renderChangeRows({ rows: [{ label: '\u2060', before: m('skill-calorie.photo-receipt.c017'), after: m('skill-calorie.photo-receipt.c018'), arrow: false }] })
      + '</div>'
    : rows.join('');  return '<div class="phr-tags">'
    + '<div class="phr-tags-row phr-tags-head">' + cellOf(m('skill-calorie.photo-receipt.c019')) + cellOf(head.before)
    + cellOf(head.after) + '<span class="phr-tags-arrow" aria-hidden="true"></span></div>'
    + body + '</div>';
}

/** 标签页的结果句：**这页唯一说清结果的地方**（徽章给类型、对照表给逐条，都不另说一遍）。
 *  无变化时不出这句（真话由无变化提示块说，免得同一页自相矛盾）。 */
function tagNoticeOf(receipt: CrudReceipt): string {
  if (receipt.noChange) {
    const tags = listJoin(currentRenderLanguage(), tagListOf((receipt.tagDiff ?? { before: [], after: [] }).after));
    return notice({ icon: 'info', title: m('skill-calorie.photo-receipt.c020'), msg: m('skill-calorie.photo-receipt.c021'), detail: m('skill-calorie.photo-receipt.c022', { p0: String(tags) }) });
  }
  const diff = receipt.tagDiff ?? { before: [], after: [] };
  const head = changeHeadOf(receipt.scene);
  const tail = m('skill-calorie.photo-receipt.c023', { p0: String(receipt.recordId ?? '—') });
  if (receipt.scene === '加照片标签') {
    const added = diff.after.filter((t) => !diff.before.includes(t));
    return notice({ icon: 'ok', msg: (added.length > 0 ? m('skill-calorie.photo-receipt.c024', { p0: String(listJoin(currentRenderLanguage(), added)) }) : m('skill-calorie.photo-receipt.c025')) + tail });
  }
  if (receipt.scene === '删照片标签') {
    const gone = diff.before.filter((t) => !diff.after.includes(t));
    return notice({ icon: 'ok', msg: (gone.length > 0 ? m('skill-calorie.photo-receipt.c026', { p0: String(listJoin(currentRenderLanguage(), gone)) }) : m('skill-calorie.photo-receipt.c027')) + tail });
  }
  return notice({ icon: 'ok', msg: head.after + '：' + listJoin(currentRenderLanguage(), tagListOf(diff.after)) + tail });
}

/* ══════════════════════════════════════════════════════════════
 * 两页共用：给 AI 核对的折叠块 ＋ 复制区（机器面，一字不动）
 * ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
 * 两页共用：给 AI 核对的折叠块 ＋ 复制区（机器面，一字不动）
 * ══════════════════════════════════════════════════════════════ */

/** 页尾「给 AI 核对的信息」折叠块（本域自渲染：内文只留记录号＋数据库改动）。 */
function aiCheckDisclosure(receipt: CrudReceipt): string {
  return renderDisclosure({
    title: m('skill-calorie.photo-receipt.c028'),
    contentHtml: renderDataTable({
      columns: [{ key: 'k', label: m('skill-calorie.photo-receipt.c029') }, { key: 'v', label: m('skill-calorie.photo-receipt.c030') }],
      rows: [
        { k: m('skill-calorie.photo-receipt.c031'), v: receipt.recordId === null ? m('skill-calorie.photo-receipt.c032') : String(receipt.recordId) },
        { k: m('skill-calorie.photo-receipt.c033'), v: m('skill-calorie.photo-receipt.c034', { p0: String(receipt.affectedRows) }) },
      ],
    }),
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

/* ══════════════════════════════════════════════════════════════
 * 新壳（记身材照／删身材照两页）
 * ══════════════════════════════════════════════════════════════ */

/** 新壳：眉标＝族名、H1＝这次做的动作（回执场景名，如「批量存照片」「删身材照」）、
 *  **副标题整行删**（它印的是回执摘要——与反馈条说的是同一件事）。`pageUi: true` 接 #525 的
 *  手机端配方（断点／44px 触摸区／安全区／窄屏表格卡片化）；页内样式第一项。 */
function writeShell(input: {
  receipt: CrudReceipt; command: string; parts: readonly string[];
}): string {
  return assembleDocPage({
    docTitle: docTitle(),
    title: input.receipt.scene,
    eyebrow: m('skill-calorie.photo-receipt.c035'),
    subtitle: null,
    pageUi: true,
    content: [receiptUiCss(), ...input.parts, aiCheckDisclosure(input.receipt),
      receiptCopyArea(input.receipt, input.command)].join(''),
  });
}

/* ── 09-09 记身材照 ───────────────────────────────────────────── */

/** 读数卡：成功时 = **入库张数 ＋ 绿徽章「照片已存入」**（这页的结果就在这一处说清）；
 *  有失败时 = **本次要存 N 张 ＋ 橙徽章「M 张没存进来」**，存好的张数让给下面的反馈条说——
 *  同一事实不许在卡上与条上各说一遍（收拢前的老页在四处说同一件事）。一格一件事，卡槽吃纯文本。 */
function addCardsOf(receipt: CrudReceipt): KpiCardInput[] {
  const failed = receipt.items.filter((it) => it.reason !== '').length;
  const ok = receipt.items.length - failed;
  const cards: KpiCardInput[] = [failed > 0
    ? {
      label: m('skill-calorie.photo-receipt.c036'), value: String(receipt.items.length), unit: m('skill-calorie.photo-receipt.c037'),
      status: 'warn', statusText: m('skill-calorie.photo-receipt.c038', { p0: String(failed) }),
    }
    : {
      label: m('skill-calorie.photo-receipt.c039'), value: String(ok), unit: m('skill-calorie.photo-receipt.c040'),
      status: 'ok', statusText: m('skill-calorie.photo-receipt.c041'),
    }];
  if (receipt.distance) {
    cards.push({
      label: m('skill-calorie.photo-receipt.c042'),
      value: m('skill-calorie.photo-receipt.c043', {
        p0: String(receipt.distance.tag),
        p1: String(receipt.distance.days),
      }),
    });
  }
  return cards;
}

/** 反馈条：**只在有事要说的时候出**——全成功时结果已经在读数卡的绿徽章上说清了，这一条不再重复；
 *  有失败时它报「存好了几张」，卡上报「没进来几张」，失败原因落在逐张那一块里。 */
function addNoticeOf(receipt: CrudReceipt): string {
  const failed = receipt.items.filter((it) => it.reason !== '').length;
  const ok = receipt.items.length - failed;
  if (failed === 0) return '';
  if (ok === 0) return notice({ icon: 'warn', msg: m('skill-calorie.photo-receipt.c044', { p0: String(failed) }), detail: m('skill-calorie.photo-receipt.c045') });
  return notice({ icon: 'warn', msg: m('skill-calorie.photo-receipt.c046', { p0: String(ok) }), detail: m('skill-calorie.photo-receipt.c047') });
}

/** 逐张结果：**一张一块**——图（存不进来的那一张只给文字位）＋这一张的三槽列表行
 *  （左＝编号、中＝文件名、右＝结果）；失败张多一行「失败原因：」。图上行下同住一块，
 *  **不是同一份数据印两遍**（#476 的老债是「缩略图 ＋ 明细表」两份同数据）。 */
function shotRowsOf(receipt: CrudReceipt, byName: ReadonlyMap<string, PhotoEmbed>): string {
  const blocks: string[] = [];
  for (const it of receipt.items) {
    if (it.reason !== '') {
      blocks.push(shotBlock('fail', renderListRows({
        items: [
          { left: m('skill-calorie.photo-receipt.c048'), main: m('skill-calorie.photo-receipt.c049', { p0: String(it.file ?? '—') }), right: m('skill-calorie.photo-receipt.c050') },
          { main: m('skill-calorie.photo-receipt.c051', { p0: String(it.reason) }) },
        ],
      })));
      continue;
    }
    const e = byName.get(it.file ?? '');
    // #484：图给宽度约束＋缩略级上限（判据钉死这一处 240px）；没内嵌的写明为什么，不留白框。
    const media = e !== undefined && e.dataUri !== null
      ? '<img src="' + e.dataUri + '" alt="' + m('skill-calorie.photo-receipt.c069') + '"'
        + ' style="max-width:100%;max-height:240px;height:auto" />'
      : '<div class="phr-shot-miss">这一张的原图没能放进页面</div>';
    blocks.push(shotBlock('ok', media + renderListRows({
      items: [{ left: idTextOf(it.id), main: it.file ?? '—', right: m('skill-calorie.photo-receipt.c052') }],
    })));
  }
  if (blocks.length === 0) return '';
  return (receipt.items.length > 1 ? sectionTitle(m('skill-calorie.photo-receipt.c053')) : '') + blocks.join('');
}

/** 批次键值行：这次存进去的值（标签走徽章列，不串 `、`）。**写入时间不再单列一行**——
 *  它与「拍摄日期」在样张上同一天，读者看着像同一件事说两遍；回执时间仍在复制区载荷与
 *  「给 AI 核对的信息」里（机器面一行未动）。 */
function addFactsOf(opts: { tag: string; note?: string; date: string }): string {
  return labelChips(m('skill-calorie.photo-receipt.c054'), [opts.tag])
    + factRows([
      { k: m('skill-calorie.photo-receipt.c055'), v: opts.note ?? '' },
      { k: m('skill-calorie.photo-receipt.c056'), v: opts.date },
    ]);
}

/** 存身材照回执整页（3 变体同形：单张／含备注／批量；失败张逐张上页，带失败原因）。 */
export function buildPhotoAddDoc(
  receipt: CrudReceipt,
  opts: { embeds: readonly PhotoEmbed[]; tag: string; note?: string; date: string; command: string },
): string {
  const byName = new Map(opts.embeds.map((e) => [e.fileName, e]));
  return writeShell({
    receipt,
    command: opts.command,
    parts: [
      chipRow([opBadgeOf(receipt.op).badge]),
      renderKpiGrid(addCardsOf(receipt)),
      addNoticeOf(receipt),
      shotRowsOf(receipt, byName),
      addFactsOf(opts),
    ],
  });
}

/* ── 09-13 删身材照 ───────────────────────────────────────────── */

/** 删除前的样子：图（内嵌原图是永久删除的唯一凭据）＋这张照片的键值行。
 *  旧页把「编号 · 日期 · 标签 · 文件名」串成一行图注，这里一行一件事。 */
function removeSnapshotOf(receipt: CrudReceipt, embed: PhotoEmbed | null): string {
  const it = receipt.items[0];
  const img = embed && embed.dataUri !== null
    // #484：图给宽度约束＋缩略级上限（判据钉死这一处 240px）。
    ? '<div class="phr-shot-stage"><img src="' + embed.dataUri + '" alt="' + m('skill-calorie.photo-receipt.c070') + '"'
      + ' style="max-width:100%;max-height:240px;height:auto" /></div>'
    : '<div class="phr-shot-stage"><span>这张图没能留下来（原图已经随删除一起移走了）</span></div>';
  return sectionTitle(m('skill-calorie.photo-receipt.c057')) + img
    + labelChips(m('skill-calorie.photo-receipt.c058'), tagListOf(it?.tagList))
    + factRows([
      { k: m('skill-calorie.photo-receipt.c059'), v: it?.id === undefined || it?.id === null ? '' : String(it.id) },
      { k: m('skill-calorie.photo-receipt.c060'), v: it?.date ?? '' },
      { k: m('skill-calorie.photo-receipt.c061'), v: it?.photoPath ?? embed?.fileName ?? '' },
      { k: m('skill-calorie.photo-receipt.c062'), v: receipt.meta.actionAt },
    ]);
}

/** 删身材照回执整页：徽章列 ＋ 警示块（「永久删除，无法恢复」全页只此一处）＋ 删除前快照块。 */
export function buildPhotoRemoveDoc(
  receipt: CrudReceipt,
  opts: { embed: PhotoEmbed | null; command: string },
): string {
  const warn = notice({
    icon: 'warn',
    msg: m('skill-calorie.photo-receipt.c063'),
    detail: m('skill-calorie.photo-receipt.c064'),
  });
  return writeShell({
    receipt,
    command: opts.command,
    parts: [chipRow([opBadgeOf(receipt.op).badge]), warn, removeSnapshotOf(receipt, opts.embed)],
  });
}

/* ── 09-10／11／12 标签三态（#528 窄席位 B） ─────────────────────── */

/** 改／加／删照片标签回执整页：徽章（回执类型）＋ 结果句（这页唯一说清结果的地方，带照片编号）＋
 *  标签对照块（`renderChangeRows`：改前／改后两列，逐标签一行，行首「变化」列写三态词）
 *  ＋ 记录标识（编号 ＋ 时间）。
 *  无变化时不出对照表，只出静态提示块「这次没有改动任何东西」。 */
export function buildPhotoTagDoc(receipt: CrudReceipt, opts: { command: string }): string {
  return writeShell({
    receipt,
    command: opts.command,
    parts: [
      chipRow([opBadgeOf(receipt.op).badge]),
      tagNoticeOf(receipt),
      receipt.noChange ? '' : sectionTitle(m('skill-calorie.photo-receipt.c065')) + tagChangeBlock(receipt),
      factRows([
        { k: m('skill-calorie.photo-receipt.c066'), v: receipt.recordId === null ? '' : String(receipt.recordId) },
        { k: m('skill-calorie.photo-receipt.c067'), v: receipt.meta.actionAt },
      ]),
    ],
  });
}
