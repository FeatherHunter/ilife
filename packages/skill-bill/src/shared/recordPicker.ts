/** 候选记录列表（**唯一定义地**）：改记录／撤销／恢复三条唤醒词共用的「挑哪一条记录」那一格，连它的取数。
 *
 * 谁在用（本票实数，三个调用点，指名）：
 *   ① `src/record/scene-update.ts`——缺 `id` 时列候选（未撤销的那些），挑完再说改哪个字段；
 *   ② `src/record/scene-undo.ts`——缺 `id` 时列候选（未撤销的那些；撤销＝软删打标，打完还能恢复）；
 *   ③ `src/record/scene-restore.ts`——缺 `id` 时列候选（**只列已打标撤销的那些**）。
 *  三条词挑的是同一件事（「哪一条记录」），不同的只是过筛条件：换 `mode`，不换件。
 *
 * 本件对外的名字**五个**（照 `docs/agents/structure.md` 的「一个文件对外给的东西不多于五个」）：
 *   `pickModeOf`（`params.op` 落哪种过筛条件）、`pickerBlock`（那一格整块）、`readRowById`（按编号读一条，
 *   连「是否已打标撤销」一次给全）、`snapshotTable`（一条记录的只读回显）、`diffRowsFor`（本次打算改的字段对照）。
 *   其余五样收在件内、不外给：`PickMode`／`CandidateRead`（两个内部别名）、`isDeleted`（软删口径的唯一定义地）、
 *   `readCandidates`（`pickerBlock` 的取数那一半）、`snapshotRows`（`snapshotTable` 的行）。
 *   计数口径：只数真被本目录之外的件引用的名字，零跨目录引用的导出不算。
 *
 * 取数用**写入侧已有的读能力**（`src/fetch/` 的 `openBillDb`／`fetchAll`／`closeBillDb`）：
 *  不新增查询命令、不等查询图 #403——列候选是写入流程内部的一步（挑完仍走同一条写命令）。
 *  「撤销候选＝未删记录／恢复候选＝已软删记录」这条口径住本件，页面不再各判一次：
 *  `fetchAll` 传 `includeDeleted: true` 才看得到软删行（`fetchAll` 的缺省口径把软删排除在外）。
 *
 * 一件不自造：单选与记录表走 `./candidatePick.js`（它自己包 base 的 `renderDataTable` 与
 *  `renderParamForm` 的单选项），空态走 `./emptyNote.js`，金额文本走 `./summaryRow.js` 的 `money2`，
 *  原值与新值的比对走 `./diffTable.js` 的 `diffOf`——三条词与改记录的回执都用同一份判定。
 *
 * 读不通不许静默：库路径没设、库打不开这些情形由本件报出来（`ok:false` ＋ `reason`），
 *  页面据此出空态并把原因写在话里，不拿一张空表冒充「库里没有记录」。
 */
import { renderCaliberLine, renderDataTable } from 'base-paint/blocks';
import type { BillRow, BillDb } from '../fetch/db.js';
import { closeBillDb, fetchAll, openBillDb } from '../fetch/index.js';
import { resolveDbPath } from '../fetch/paths.js';
import { candidatePick } from './candidatePick.js';
import type { CandidateItem } from './candidatePick.js';
import { diffOf } from './diffTable.js';
import type { DiffRow } from './diffTable.js';
import { emptyNote } from './emptyNote.js';
import { money2 } from './summaryRow.js';
import { fieldLabelOf } from './userWording.js';

/** 三条词的三种过筛条件（一条词一种）。**收在本件内**：对外那五个名字里不暴露它，签名的联合类型逐字写。 */
type PickMode = 'update' | 'undo' | 'restore';

/** 候选列表一页最多列几条（按时间倒序取最近的这些条）。 */
const PICK_LIMIT = 20;

/** 一种 `mode` 在页面上怎么称呼：那一格叫什么、候选是什么、挑的时候该说什么。 */
interface PickLabels {
  readonly label: string;
  readonly what: string;
  readonly hint: string;
}

const LABELS: Record<PickMode, PickLabels> = {
  update: {
    label: '要改的那条记录',
    what: '没撤销过的记录',
    hint: '从下面列出的记录里挑一条，再说清要改哪一项、改成什么，跟助手说一遍。',
  },
  undo: {
    label: '要撤销的那条记录',
    what: '没撤销过的记录',
    hint: '从下面列出的记录里挑一条：撤销只是打个标记，记录还在，随时可以恢复。',
  },
  restore: {
    label: '要恢复的那条记录',
    what: '已经撤销过的记录',
    hint: '只列已经撤销过的那些：恢复＝把撤销标记清掉，这一笔回到查询与统计里。',
  },
};

/** `params.op` 落哪一种过筛条件（缺省＝改字段那一条）。 */
export function pickModeOf(op: unknown): 'update' | 'undo' | 'restore' {
  return op === 'undo' ? 'undo' : op === 'restore' ? 'restore' : 'update';
}

/** 一条记录是不是打过软删标记。**软删口径的唯一定义地**：取数（`keeps`）与读一条（`readRowById`）都走它。 */
function isDeleted(row: BillRow): boolean {
  return row.deleted_at !== null && String(row.deleted_at).trim() !== '';
}

/** 这一条算不算这种 `mode` 的候选：恢复只认已打标的，其余两种只认没打标的。 */
function keeps(mode: PickMode, row: BillRow): boolean {
  return mode === 'restore' ? isDeleted(row) : !isDeleted(row);
}

/** 时间倒序（同一时刻按编号倒序）：最近的一条摆在最前面。 */
function byTimeDesc(a: BillRow, b: BillRow): number {
  if (a.time === b.time) return b.id - a.id;
  return a.time < b.time ? 1 : -1;
}

/** 取数结果：读通了没有、读不通的原因、候选（已按上限截好）、截之前共有几条。 */
interface CandidateRead {
  readonly ok: boolean;
  readonly reason: string;
  readonly items: readonly CandidateItem[];
  readonly total: number;
}

/** 一条候选为什么是它（**必填**：写不出依据的候选，用户没法判断该不该选）。
 *  本轮整改把工程话换成用户说法（原文见 `docs/skills/skill-bill/t407-文字审查.md` 第 25、30 条）：
 *  `未撤销（deleted_at 为空）· 就躺在库里等你处置` → 「还没撤销过 可以改」；
 *  `已于 X 打标撤销（软删：行还在库里，置 NULL 即可恢复）` → 「已于 X 撤销过（记录还在，点恢复就回来）」。 */
function whyOf(mode: PickMode, row: BillRow): string {
  if (mode === 'restore') {
    return '已于 ' + String(row.deleted_at) + ' 撤销过（记录还在，点恢复就回来）';
  }
  return mode === 'update' ? '还没撤销过 可以改' : '还没撤销过 可以撤';
}

/** 候选行那一列的摘要：分类 ＋ 备注。
 *  **不带账户**（本轮整改）：账户就在同页那张只读回显表的「账户」那一项里逐项列着，
 *  候选表再抄一遍，同一句话在页上就印了两遍（机审判成重复句）。 */
function pickLabelOf(row: BillRow): string {
  return row.category + (row.note.trim() === '' ? '' : '　' + row.note.trim());
}

/** 单选选项那一格用的全量摘要：分类 ＋ 账户 ＋ 备注（分隔符用全角空格，行内不再拿 `·` 当版式）。 */
function labelOf(row: BillRow): string {
  const note = row.note.trim() === '' ? '' : '　' + row.note.trim();
  return row.category + (row.account.trim() === '' ? '' : '　' + row.account) + note;
}

/** 读候选：开库读一遍、按 `mode` 过筛、按时间倒序取最近 `PICK_LIMIT` 条，读完关库。读不通照实报。 */
function readCandidates(mode: PickMode): CandidateRead {
  let handle: BillDb | null = null;
  try {
    handle = openBillDb(resolveDbPath());
    const kept = fetchAll(handle, { includeDeleted: true }).filter((r) => keeps(mode, r));
    const sorted = [...kept].sort(byTimeDesc);
    const items = sorted.slice(0, PICK_LIMIT).map((r) => ({
      id: r.id,
      label: pickLabelOf(r),
      amount: money2(r.amount),
      time: r.time,
      why: whyOf(mode, r),
    }));
    return { ok: true, reason: '', items, total: sorted.length };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e), items: [], total: 0 };
  } finally {
    if (handle !== null) closeBillDb(handle);
  }
}

/** 候选格整块：单选 ＋ 候选记录表 ＋「为什么是它」＋ 一行口径；候选为空或读不通都出空态（不拿最近一笔兜底）。 */
export function pickerBlock(input: {
  readonly mode: 'update' | 'undo' | 'restore';
  /** 本次已经认准的那条（不给＝不预选）。 */
  readonly selectedId?: number | null;
  /** 换一句话说这一格（不给＝按 `mode` 的缺省那句）。 */
  readonly hint?: string;
}): string {
  const meta = LABELS[input.mode];
  const read = readCandidates(input.mode);
  if (!read.ok) {
    return emptyNote({
      title: '候选读不出来',
      text: '这一格要的候选没能从库里读出来：' + read.reason + '。',
      next: '请先在能读库的环境里跑（库路径指向那个库），再说一遍。',
    });
  }
  if (read.items.length === 0) {
    return emptyNote({
      title: '没有可选的' + meta.label,
      text: '这一格要的是' + meta.what + '，库里一条都没有。',
      next: '不拿最近一笔顶替。请先说清是哪一笔（或先记一笔），再说一遍。',
    });
  }
  return candidatePick({
    name: 'id',
    label: meta.label,
    candidates: read.items,
    selectedId: input.selectedId ?? null,
    hint: input.hint ?? meta.hint,
  }) + renderCaliberLine(
    '库里共 ' + read.total + ' 条' + (input.mode === 'restore' ? '已打标撤销' : '未撤销')
      + '的记录，本页列最近 ' + read.items.length + ' 条（按时间倒序）。',
  );
}

/** 按编号读一条记录（**含已打标撤销的**，`getById` 读不到软删行，故本件走 `fetchAll` 自己筛）。
 *  `deleted` 与 `row` 一次给全：软删口径只有 `isDeleted` 一处定义，调用方不再各判一次。 */
export function readRowById(id: number): {
  readonly ok: boolean;
  readonly reason: string;
  readonly row: BillRow | null;
  readonly deleted: boolean;
} {
  let handle: BillDb | null = null;
  try {
    handle = openBillDb(resolveDbPath());
    const hit = fetchAll(handle, { includeDeleted: true }).find((r) => r.id === id) ?? null;
    return { ok: true, reason: '', row: hit, deleted: hit !== null && isDeleted(hit) };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e), row: null, deleted: false };
  } finally {
    if (handle !== null) closeBillDb(handle);
  }
}

/** 一条记录的只读回显（改记录的原记录那一格、撤销／恢复选定后那一格都用它）。
 *  行名走 `./userWording.js` 的 `fieldLabelOf`（库列名不上屏）；撤销标记那一格照实说有没有打标。 */
function snapshotRows(row: BillRow): readonly { readonly k: string; readonly v: string }[] {
  return [
    { k: fieldLabelOf('id'), v: String(row.id) },
    { k: fieldLabelOf('category'), v: row.category },
    { k: fieldLabelOf('amount'), v: row.amount.toFixed(2) },
    { k: fieldLabelOf('time'), v: row.time },
    { k: fieldLabelOf('account'), v: row.account },
    { k: fieldLabelOf('ledger'), v: row.ledger },
    { k: fieldLabelOf('currency'), v: row.currency },
    { k: fieldLabelOf('note'), v: row.note },
    {
      k: fieldLabelOf('deleted_at'),
      v: isDeleted(row) ? '已撤销（' + String(row.deleted_at) + '）' : '没撤销过',
    },
  ];
}

/** 一条记录的只读表（列名与 `renderDataTable` 的两列同形）。
 *  表头说明里那个 `·` 改全角空格（本轮整改：表头说明是版式位，行内不再拿 `·` 当版式）。 */
export function snapshotTable(row: BillRow, caption?: string): string {
  return renderDataTable({
    columns: [{ key: 'k', label: '哪一项' }, { key: 'v', label: '记成什么' }],
    rows: snapshotRows(row),
    caption: caption ?? '这一条记录（记录编号 ' + row.id + '　只读回显）',
  });
}

/** 库内那一行是不是给了这一格（`undefined`／`null`／空白串都不算给，0 算给）。 */
function given(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  return !(typeof v === 'string' && v.trim() === '');
}

/** 本次打算改的那几个字段的对照：**只比给了的那些字段**。
 *  没给的字段不许进这张表——拿「未设置」当新值比，会把「这一格没动」算成「把这一格清空了」。 */
export function diffRowsFor(input: {
  readonly row: BillRow;
  readonly params: Record<string, unknown>;
  /** 允许改的字段名单（取自槽位表，本件不另抄一份）。 */
  readonly fields: readonly string[];
}): readonly DiffRow[] {
  const fields = input.fields;
  return diffOf({ fields, before: { ...input.row }, after: input.params });
}
