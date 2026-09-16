/** 查询域详情页装配件（#415 专属版式）：金额卡＋状态卡 ＋ 字段表（10 列全）＋ 复制区 ＋ 页壳。
 *
 * 谁在用（一个调用点，指名）：`src/query/read.ts` 的 `viewRecordDetail`（查账单详情）——
 *   today／range／search 三支仍走 `./list.js` 的 `queryListDoc`，本件不动它们。
 *
 * 三源融合（老 `templates/query_view.html` 无 detail 分支，注入 `type=detail` 落未知类型错误回执——
 *   `t411-查询域-老模板逐块清单.md §1`；这是新仓补的读链）：
 *   - **留**：复制数据／日志两条通道（老页动作区）＋ 页头三件套；
 *   - **舍**：KPI 四格（单条笔数恒 1 是废话，支出／收入／净额三格对单条互斥其二为零）＋
 *     七列表格（币种／创建时间／软删态三列无处可放）；
 *   - **改**：金额卡＋状态卡（两格）＋ 字段／值两列竖表（10 行，币种与两时间列首次可见）。
 *
 * 分工：取数与阻断在 `read.ts`（含删态读 `includeDeleted`），本件只做**整页装配**；
 *   载荷那一份（`detailEnvelope`）由调用方拼好传进来，本件不重拼（形状与载荷成对，见 `./list.js:173-175`）。
 */
import { renderChips, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { commandLine } from '../shared/writeParts.js';
import type { BillRow } from '../fetch/index.js';

/** 详情页的入参：这一页是谁（命令名／唤醒词／窗口）＋ 查到哪一条 ＋ 复制日志的取数。 */
export interface QueryDetailInput {
  /** 对外命令名（`bill.record.detail`），页标记与复制日志的调用链都读它。 */
  readonly key: string;
  /** 本次参数（复制日志那行命令原文照它拼，可照抄重跑）。 */
  readonly params: Record<string, unknown>;
  /** 页标题＝用户说的那条唤醒词（本页恒为 `查账单详情`）。 */
  readonly wakeWord: string;
  /** 副标题：这条记录的时刻。编号与已撤销态不在这里——它们各是一枚胶囊（行内 `·` 不许进版式位）。 */
  readonly window: string;
  /** 结果胶囊：首枚恒为 `记录编号 <id>`；已撤销再加一枚 `已撤销`（状态卡已有徽，胶囊只说事实）。 */
  readonly chips: readonly string[];
  /** 查到的那一条（含软删列，调用方已按 `includeDeleted` 取到）。 */
  readonly row: BillRow;
  /** 复制载荷：**本次查询的 envelope 本身**（`detailEnvelope`，复制区直接序列化它）。 */
  readonly envelope: SerializableEnvelope;
  /** 本次数据来源（复制日志第 3 段）。 */
  readonly source: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
}

/** 字段表的列（**唯一定义地**）：字段／值两列，表头文本与每格 `data-label` 同源。表题叫「字段明细」：
 *  H1 已是「查账单详情」，caption 再叫「账单详情」就是同一句话说两遍。 */
const DETAIL_COLUMNS: readonly DataTableColumn[] = [
  { key: 'field', label: '字段' },
  { key: 'value', label: '值' },
];

/** 空值占位（字段行永不缺席，无值即此符，空行不算交代）。 */
const EMPTY_CELL = '—';

/** 文本或占位（空串／全空格即占位，前后空格不进页）。 */
function textOrDash(v: string): string {
  return v.trim() === '' ? EMPTY_CELL : v;
}

/** 金额卡＋状态卡（两格）：单条 KPI 四格语义弱（笔数恒 1），本页只留金额与状态。
 *  金额文案与载荷数值逐字一致（两位小数，符号照库）；状态徽正常 `ok`／已撤销 `danger`。
 *  正常态不写 detail：值「正常」＋ ok 徽已是两遍，第三遍「记录有效」是同一件事说三遍；
 *  已撤销才写 detail（撤销时间是新增事实）。 */
function detailCards(row: BillRow, deleted: boolean): readonly KpiCardInput[] {
  const amount = row.amount.toFixed(2);
  return [
    {
      label: '金额',
      value: amount,
      detail: row.amount < 0 ? '支出' : row.amount > 0 ? '收入' : '零金额',
    },
    {
      label: '状态',
      value: deleted ? '已撤销' : '正常',
      status: deleted ? 'danger' : 'ok',
      statusText: deleted ? '已撤销' : '正常',
      ...(deleted ? { detail: '撤销时间 ' + String(row.deleted_at) } : {}),
    },
  ];
}

/** 字段表十行（库行 10 列全交代）：编号／时间／分类／金额／账户／账本／币种／备注／创建时间／删除时间。
 *  金额两位小数与载荷同字；币种缺省也是读数（默认人民币）；删除时间无值即占位（无后缀即正常）。 */
function detailRows(row: BillRow, deleted: boolean): readonly Record<string, unknown>[] {
  return [
    { field: '编号', value: String(row.id) },
    { field: '时间', value: row.time },
    { field: '分类', value: row.category },
    { field: '金额', value: row.amount.toFixed(2) },
    { field: '账户', value: textOrDash(row.account) },
    { field: '账本', value: textOrDash(row.ledger) },
    { field: '币种', value: row.currency !== '' ? row.currency : '—' },
    { field: '备注', value: textOrDash(row.note) },
    { field: '创建时间', value: row.created_at !== '' ? row.created_at : '—' },
    { field: '删除时间', value: deleted ? String(row.deleted_at) : '—' },
  ];
}

/** 查询详情页：一整页（页头 ＋ 结果胶囊 ＋ 金额卡＋状态卡 ＋ 字段表 ＋ 复制区）。 */
export function queryDetailDoc(input: QueryDetailInput): string {
  const deleted = input.row.deleted_at !== null && input.row.deleted_at !== '';
  const content = [
    renderChips({ items: input.chips.map((text) => ({ text })) }),
    renderKpiGrid(detailCards(input.row, deleted)),
    renderDataTable({ columns: DETAIL_COLUMNS, rows: detailRows(input.row, deleted), caption: '字段明细' }),
    copyArea({
      data: { envelope: input.envelope, title: input.wakeWord },
      log: {
        envelope: input.envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: input.source,
          detail: '详情 1 笔 · 记录编号 ' + input.row.id + (deleted ? ' · 已撤销' : ' · 正常'),
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }),
  ].join('');
  return pageShell({
    docTitle: DOC_TITLE + '·查询',
    title: input.wakeWord,
    subtitle: input.window,
    slot: 'list',
    page: 'list',
    shape: 'detail',
    key: input.key,
    domain: 'query',
    content,
  });
}
