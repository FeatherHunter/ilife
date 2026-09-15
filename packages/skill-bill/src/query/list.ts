/** 通用查询列表页（查询域的**列表装配件**）：KPI 行 ＋ 数据表（零行走空态）＋ 复制数据／日志 ＋ 页壳。
 *
 * 谁在用（两个调用点，指名）：`src/query/read.ts` 的四条读命令各出一页——
 *   `viewRecordToday`（查今天那一族）与 `viewRecordRange`（查区间那一族）走列表，
 *   `viewRecordSearch`（搜备注那一族）同形，`viewRecordDetail`（查账单详情）本票先借用同一种版式
 *   （单条也出一行；详情页的专属版式是 #415 那张票的事）。
 *
 * 三源融合（老 `templates/query_view.html` ＋ 新迁移产物 ＋ 外界取法；判据沿写入域 R1 的三源融合原则）：
 *   - **留**（老页留用的块）：KPI 四项（笔数／支出／收入／净额，老页 `recordsList` 上那排 `kpi-grid`）＋
 *     记录行的事实（时间／分类／备注／金额带符号与颜色）＋ 空态 ＋ 复制数据／日志两条通道；
 *   - **舍**（老页不搬的部分）：客户端 JS 渲染（老页把 payload 注入 `<script id="payload">` 再由
 *     `recordsList`／`kpiCard` 当场拼 DOM；新架构在 Node 侧渲染成静态页，产物不依赖运行时）＋
 *     `CHARTS-HELPERS`（查询列表不出图表）＋ 自绘 `.records/.record` 版式（改走公共层组件）；
 *   - **外界取法**（新页比老页多的）：语义表格（`renderDataTable`：`table/thead/th/td` ＋ 窄屏每格
 *     `data-label` 行卡化）＝老自绘 grid 拿不到的可访问性与手机端表现；KPI 卡走公共层 `renderKpiGrid`
 *     （数值 `tnum` 等宽对齐）；空态用 `renderEmptyBlock`（多一句「下一步说什么」的引导）；
 *     复制区走公共层三格式菜单（纯文本／JSON／CSV）。
 *
 * 数据表的列（本页**唯一一处**定义；表头文本与每格 `data-label` 同源，不存在两处文案）：
 *   时间／分类／金额／账户／账本／备注／编号——「编号」列留着是为了说得出口的下一步：
 *   用户拿它就能说「查账单详情」。
 */
import { renderDataTable, renderEmptyBlock, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { commandLine } from '../shared/writeParts.js';

/** 数据表的一行（值一律是已文本化的字符串：表格不吃对象，也不做二次格式化）。
 *  写成 `type` 别名而不是 `interface`：公共层的表格与复制载荷收 `Record<string, unknown>`，
 *  别名形态自带隐式索引签名、能直接过，interface 会被「缺索引签名」挡住。 */
export type QueryTableRow = {
  readonly id: string;
  readonly time: string;
  readonly category: string;
  readonly amount: string;
  readonly account: string;
  readonly ledger: string;
  readonly note: string;
};

/** KPI 行四格的事实（口径来自 `../render/views.js` 的 `calcKpi`，本件只排版、不重算）。 */
export type QueryKpi = {
  readonly count: number;
  readonly expense: number;
  readonly income: number;
  readonly net: number;
};

/** 列表页的出口载荷（＝envelope `data`）：`items`／`total` 是表里形状的要求，其余是本域给页面看的窗口事实。
 *  `items` 是**搬迁前那一份行**（`../render/views.js` 的 `toBillItem` 形状：`id`／`amount` 是数，
 *  下游拿它回查详情），与页面表格行（`QueryTableRow`，文本化）是两件事——一份给机器、一份给人。 */
export type QueryListData = {
  items: unknown[];
  total: number;
  kpi: QueryKpi;
  /** 单日查（查今天那一族）：这一页查的是哪一天；`recent` 那支写 `'recent'`（与搬迁前同值）。 */
  date?: string;
  /** 区间查（查区间那一族）：起止日；单条件那支两支都写空串（与搬迁前同值）。 */
  start?: string;
  end?: string;
  /** 条件查（搜备注那一族）：`search:<词>`／`tag:<标签>`／`debt`／`reimburse`／`installment`（与搬迁前同值）。 */
  kind?: string;
};

/** 详情页的出口载荷（＝envelope `data`）：`item` 是搬迁前那一份（`toBillItem` 的形状）。 */
export type QueryDetailData = {
  item: Record<string, unknown>;
};

/** 列表页的入参：这一页是谁（命令名／唤醒词／窗口）＋ 查到什么（行与 KPI）＋ 空态说什么 ＋ 复制日志的取数。 */
export interface QueryListInput {
  /** 对外命令名（`bill.record.today`），页标记与复制日志的调用链都读它。 */
  readonly key: string;
  /** 本次参数（复制日志那行命令原文照它拼，可照抄重跑）。 */
  readonly params: Record<string, unknown>;
  /** 本次 envelope 的形状（`list`／`detail`，页标记 `data-shape` 取它，是契约）。 */
  readonly shape: string;
  /** 页标题＝用户说的那条唤醒词（能判出来的那几条按参数判，判不出的按本命令的代表词）。 */
  readonly wakeWord: string;
  /** 这一页查的是哪一段（副标题）：日期／区间／条件说明 ＋ 笔数。 */
  readonly window: string;
  /** 数据表的行。 */
  readonly rows: readonly QueryTableRow[];
  readonly kpi: QueryKpi;
  /** 零行时那句话。 */
  readonly emptyText: string;
  /** 零行时那句引导（说清下一步该说什么词）。 */
  readonly emptyHint: string;
  /** 复制载荷：**本次查询的 envelope 本身**（`skill`／`shape`／`key`／`data`），复制区直接序列化它。 */
  readonly envelope: SerializableEnvelope;
  /** 本次数据来源（复制日志第 3 段）。 */
  readonly source: string;
  /** 本次执行时刻（复制日志第 5 段）。 */
  readonly actionAt: string;
}

/** 数据表的列（**唯一定义地**）：表头文本、列序与对齐档。 */
const COLUMNS: readonly DataTableColumn[] = [
  { key: 'time', label: '时间' },
  { key: 'category', label: '分类' },
  { key: 'amount', label: '金额', align: 'right' },
  { key: 'account', label: '账户' },
  { key: 'ledger', label: '账本' },
  { key: 'note', label: '备注' },
  { key: 'id', label: '编号' },
];

/** 合计金额的文本（两位小数）。
 *  **不是** `src/shared/summaryRow.ts` 的 `money2`：那一件是「用户给的那一笔金额」的口径（0 与缺省都写「未给」），
 *  这里是**合计**——合计为 0 是一个真实读数（这一天没花钱），写成「未给」就是撒谎。两件事，两个定义。 */
function sumText(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** KPI 行四格：笔数／支出／收入／净额（净额＝收入−支出，口径由 `calcKpi` 算好，本件只摆版式）。 */
function kpiCards(kpi: QueryKpi): readonly KpiCardInput[] {
  return [
    { label: '笔数', value: String(kpi.count), unit: '笔', detail: '转账不计进收支' },
    { label: '支出', value: sumText(kpi.expense), detail: '这一段的支出合计' },
    { label: '收入', value: sumText(kpi.income), detail: '这一段的收入合计' },
    { label: '净额', value: sumText(kpi.net), detail: '收入减支出' },
  ];
}

/** 通用查询列表页：一整页（页头 ＋ KPI 行 ＋ 数据表或空态 ＋ 复制区）。 */
export function queryListDoc(input: QueryListInput): string {
  const table = input.rows.length === 0
    ? renderEmptyBlock({ text: input.emptyText, hint: input.emptyHint })
    : renderDataTable({ columns: COLUMNS, rows: input.rows, caption: '查到的记录', emptyText: input.emptyText });
  const content = [
    renderKpiGrid(kpiCards(input.kpi)),
    table,
    copyArea({
      data: { envelope: input.envelope, title: input.wakeWord },
      log: {
        envelope: input.envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: input.source,
          detail: '查到 ' + input.rows.length + ' 笔',
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
    shape: input.shape,
    key: input.key,
    domain: 'query',
    content,
  });
}

/** 复制载荷那份 envelope 的取值口径（**唯一定义地**）：技能名／版本由公共标识给、场景名过 `sceneKeyOf`，
 *  `data` 就是本次命令返回给出口的那一份载荷（同一件事不在页里再拼一遍）。列表与详情各一支——
 *  形状与载荷必须成对，两支分开就写不出「list 配 detail 载荷」这种错。 */
export function listEnvelope(key: string, data: QueryListData): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'list', key: sceneKeyOf(key), data };
}

export function detailEnvelope(key: string, data: QueryDetailData): SerializableEnvelope {
  return { version: DOC_VERSION, skill: DOC_SKILL, shape: 'detail', key: sceneKeyOf(key), data };
}
