/** 查询域详情页装配件（#415 专属版式，也是本域页型表里「详情页」那一份的地址）：
 *  结论句 → 页内导航 → 徽章列 → 读数卡（金额＋状态）→ 字段表（10 行全，窄屏替键值列表）→
 *  口径说明行 → 复制区 → 来源脚注。
 *
 * 谁在用（一个调用点，指名）：`src/query/read.ts` 的 `viewRecordDetail`（查账单详情）——
 *   today／range／search 三支仍走 `./list.js` 的 `queryListDoc`，本件不动它们。
 *
 * **块序在本件只写一份**：块清单 `blocks` 既拼正文也派生页内导航（见 `./pageParts.js`）。
 *
 * 三源融合（老 `templates/query_view.html` 无 detail 分支，注入 `type=detail` 落未知类型错误回执——
 *   `t411-查询域-老模板逐块清单.md §1`；这是新仓补的读链）：
 *   - **留**：复制数据／日志两条通道（老页动作区）＋ 页头三件套；
 *   - **舍**：KPI 四格（单条笔数恒 1 是废话，支出／收入／净额三格对单条互斥其二为零）＋
 *     七列表格（币种／创建时间／软删态三列无处可放）；
 *   - **改**：金额卡＋状态卡（两格）＋ 字段明细（10 行，币种与两时间列首次可见）——
 *     桌面端是字段／值两列竖表，移动端是同一数据源派生的键值列表（t403-P2：窄屏行卡化会逐行
 *     重复表头标签，键值列表每行即「字段名＋值」，两套显隐见 `../shared/docPage.js` 的 KV_CSS）。
 *
 * 页型归属（`docs/skills/skill-bill/688-融合基准.md` §5.1）：本页属**⑥ 结果型汇总／进度／状态页**
 *   （「读数卡 ＋ 进度条或状态判定」——本页是那支**状态判定**）。该类的第 13 行「分类聚合／占比条」
 *   与第 15 行「进度条」在单条记录页**无内容可画**，本件不出，理由与读数记在该域差异表里（不写成对上）。
 */
import { renderCaliberLine, renderChips, renderConclusionBar, renderDataTable, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { escapeHtml } from '../render/html.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { sourceLine } from '../shared/sourceLine.js';
import { commandLine } from '../shared/writeParts.js';
import { pageBody, pageNav } from './pageParts.js';
import type { QueryPageBlock } from './pageParts.js';
import type { BillRow } from '../fetch/index.js';

/** 详情页的入参：这一页是谁（命令名／唤醒词／窗口）＋ 查到哪一条 ＋ 复制日志与来源脚注的取数。 */
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
  /** 来源脚注上屏的人话来源（**不许带脚本路径与库文件名**，裁定 1）。 */
  readonly sourceText: string;
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
    { field: '币种', value: row.currency !== '' ? row.currency : EMPTY_CELL },
    { field: '备注', value: textOrDash(row.note) },
    { field: '创建时间', value: row.created_at !== '' ? row.created_at : EMPTY_CELL },
    { field: '删除时间', value: deleted ? String(row.deleted_at) : EMPTY_CELL },
  ];
}

/** 移动端键值列表（与字段表**同一数据源派生、只转形状**：字段名与值只在 `detailRows` 定义一处，
 *  本件不重写第二份）。桌面端藏、窄屏替表格（显隐见 `../shared/docPage.js` 的 KV_CSS，每端恰出一套）；
 *  转义与表格单元格同口径（`../render/html.js` 的 `escapeHtml`，与 `renderDataTable` 的单元格同为五字符）。 */
function kvList(rows: readonly Record<string, unknown>[]): string {
  return '<dl class="ilife-query-kv-list">' + rows.map((r) =>
    '<div><dt>' + escapeHtml(String(r.field)) + '</dt><dd>' + escapeHtml(String(r.value)) + '</dd></div>',
  ).join('') + '</dl>';
}

/** 结论句一行（§五 第 3 行，⑥ 类恒出）：说的**不是**金额卡那个数（那是同一件事说两遍），
 *  而是「这一条现在能不能用」这一句判定——已撤销的那一条最要紧的就是这句话。 */
function conclusionOf(deleted: boolean): string {
  if (deleted) return '这一条已经撤销，不再计进任何读数。';
  return '这一条有效，正着记在账上。';
}

/** 详情页的口径说明行（裁定 2）。全角竖线分段，段间分隔交给版式（t154-r3），不拿标点当版式。 */
function detailCaliber(): string {
  return renderCaliberLine('字段值照库里存的原文写，空值写 ' + EMPTY_CELL + ' 不写 0'
    + '｜已撤销的记录仍可按编号查到，删除时间那一行就是撤销时刻'
    + '｜窄屏把字段表换成键值列表，两份内容同源');
}

/** 查询详情页：一整页（页头 ＋ 八块正文）。 */
export function queryDetailDoc(input: QueryDetailInput): string {
  const deleted = input.row.deleted_at !== null && input.row.deleted_at !== '';
  const rows = detailRows(input.row, deleted);
  const blocks: readonly QueryPageBlock[] = [
    { html: renderChips({ items: input.chips.map((text) => ({ text })) }), nav: { anchor: 'sec-summary', navText: '结果' } },
    { html: renderKpiGrid(detailCards(input.row, deleted)), nav: { anchor: 'sec-kpi', navText: '读数' } },
    {
      html: '<div class="ilife-query-kv-table">'
        + renderDataTable({ columns: DETAIL_COLUMNS, rows, caption: '字段明细' }) + '</div>'
        + kvList(rows),
      nav: { anchor: 'sec-fields', navText: '字段' },
    },
    { html: detailCaliber(), nav: { anchor: 'sec-caliber', navText: '读数口径' } },
    {
      html: copyArea({
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
      nav: { anchor: 'sec-copy', navText: '复制' },
    },
    { html: sourceLine({ source: input.sourceText, start: input.row.time, end: input.row.time, count: 1 }) },
  ];
  const content = renderConclusionBar(conclusionOf(deleted)) + pageNav(blocks) + pageBody(blocks);
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
