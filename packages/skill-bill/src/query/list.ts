/** 通用查询列表页（查询域的**列表装配件**，也是本域页型表里「列表页」那一份的地址）：
 *  结论句 → 页内导航 → 徽章列 → 读数行 → 主表（零行走空态）→ 分类聚合卡 → 截断明示 →
 *  口径说明行 → 复制区 → 来源脚注。
 *
 * 谁在用（一个能力、四个调用点，指名）：`src/query/read.ts` 的四条读命令各出一页——
 *   `viewRecordToday`（查今天那一族）／`viewRecordRange`（查区间那一族）／`viewRecordSearch`
 *   （搜备注那一族）三条走本件；`viewRecordDetail`（查账单详情）走 `./detail.js`。
 *
 * **块序在本件只写一份**（本域页型表的第二层）：块清单 `blocks` 既拼正文也派生页内导航，
 *  锚点与条目不由两处各写一次（见 `./pageParts.js`）。列序同理，只住下面的 `COLUMNS`。
 *
 * 三源融合（逐块对照见 `docs/skills/skill-bill/t411-查询域-老模板逐块清单.md`）：
 *   - **留**：KPI 行（老页 6 处共用一套数：笔数／支出／收入／净额）＋ 明细列表（老页 `recordsList`）＋
 *     **分类聚合卡**（老页 `categoryBar` 前 8 类 `:261-266`／`:294-299`／`:509-520`：分类名＋金额／
 *     笔数／占比／均额＋宽度条）＋ 空态（老页 8 处 `emptyState`）＋ 复制数据／日志两条通道（老页动作区）；
 *   - **舍**：客户端 JS 渲染（老页注入 payload 再当场拼 DOM；新架构在 Node 侧渲染静态页）＋ 自绘样式层
 *     与 `.records/.record` 版式（改走公共层组件）＋ `CHARTS-HELPERS` 与环形图挂钩（老页只有 breakdown
 *     用，17 词里没有该路径）＋ 对比卡（老页 `compareCard`，属分析域）＋ 离线提示条与页脚的 `type`
 *     代码与源脚本路径（老侧机制块；裁定 1 禁止脚本路径上屏）；
 *   - **改**：语义表格（`renderDataTable`：`table/thead/th/td` ＋ 窄屏每格 `data-label` 行卡化）＝老自绘
 *     grid 拿不到的可访问性与手机端表现；KPI 走 `renderKpiGrid`；空态用 `renderEmptyBlock`（多一句
 *     「下一步说什么」）；复制区走三格式菜单；分类聚合的条形版式换公共层 `renderDistributionRows`；
 *     老页 200 条的显示上限改成「按体积预算截 ＋ 折叠区明示 ＋ 口径行」（老页 `:524` `slice(0,200)`
 *     ＋ `:533` 一行提示属**优点**——不静默截断——故继承其意图、换实现，理由见 `PAGE_BYTE_BUDGET`）；
 *   - **不另出**：老侧 `data.filter` 那排筛选条件芯片——筛选条件已由副标题交代（本域既有口径，
 *     t413／t414 逐条钉着），再出一排就是同一件事说两遍（裁定 6 同口径）。
 *
 * 数据表的列（本页**唯一一处**定义；表头文本与每格 `data-label` 同源）：
 *   时间／分类／金额／账户／账本／备注／编号——「编号」列留着是为了说得出口的下一步：
 *   用户拿它就能说「查账单详情」（老页没有这一列、也没有 detail 分支；这是新仓补的读链）。
 */
import { renderCaliberLine, renderChips, renderConclusionBar, renderDataTable, renderDistributionRows, renderDisclosure, renderEmptyBlock, renderKpiGrid } from 'base-paint/blocks';
import type { DataTableColumn, KpiCardInput } from 'base-paint/blocks';
import type { SerializableEnvelope } from 'base-paint';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { DOC_SKILL, DOC_TITLE, DOC_VERSION, sceneKeyOf } from '../shared/pageIdentity.js';
import { pageShell } from '../shared/pageShell.js';
import { sourceLine } from '../shared/sourceLine.js';
import { commandLine } from '../shared/writeParts.js';
import { estimateBytes } from '../render/html.js';
import { pageBody, pageNav } from './pageParts.js';
import type { QueryPageBlock } from './pageParts.js';

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

/** 分类聚合卡的一行（＝老页 `categoryBar` 的一个分类；本件只排版、不聚合）。
 *  `pct`＝该分类支出占本页支出合计的比例（0–100，越界由公共层夹取）。 */
export type QueryCategoryRow = {
  readonly label: string;
  readonly amount: number;
  readonly count: number;
  readonly pct: number;
};

/** 列表页的出口载荷（＝envelope `data`）：`items`／`total` 是表里形状的要求，其余是本域给页面看的窗口事实。
 *  `items` 是**搬迁前那一份行**（`../render/views.js` 的 `toBillItem` 形状：`id`／`amount` 是数，
 *  下游拿它回查详情），与页面表格行（`QueryTableRow`，文本化）是两件事——一份给机器、一份给人。
 *  **显示上限只截页面那一份**：`items` 照老侧语义仍是本窗全量（老侧 `slice(0,200)` 也只截显示）。 */
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

/** 列表页的入参：这一页是谁（命令名／唤醒词／窗口）＋ 查到什么（行与 KPI 与分类聚合）
 *  ＋ 空态说什么 ＋ 复制日志与来源脚注的取数。 */
export interface QueryListInput {
  /** 对外命令名（`bill.record.today`），页标记与复制日志的调用链都读它。 */
  readonly key: string;
  /** 本次参数（复制日志那行命令原文照它拼，可照抄重跑）。 */
  readonly params: Record<string, unknown>;
  /** 本次 envelope 的形状（`list`／`detail`，页标记 `data-shape` 取它，是契约）。 */
  readonly shape: string;
  /** 页标题＝用户说的那条唤醒词（能判出来的那几条按参数判，判不出的按本命令的代表词）。 */
  readonly wakeWord: string;
  /** 这一页查的是哪一段（副标题）：日期／区间／条件说明。笔数不在这里——它有自己的胶囊行。 */
  readonly window: string;
  /** 结果胶囊（副标题之下、KPI 之上）：如 `共 8 笔`。行内 `·` 不许进版式位（t407 用户语言整改同口径），
   *  有几个事实就出几枚胶囊，不用一行串拼起来。
   *  **筛选条件不在这里**：它住副标题（`window`）——那是本域既有口径，t413／t414 逐条钉着
   *  （「窗口说清条件＋全部时间」「窗口说清关键词」…）；同一件事在页上写两遍是裁定 6 同款毛病，
   *  故老侧那排 `data.filter` 芯片**不另出**，只把老侧「占比芯片」那一枚（`category_pct`）补进本行。 */
  readonly chips: readonly string[];
  /** 数据表的行**全量**（已文本化）。显示上限由本件截（老侧 `slice(0,200)` 同数），
   *  KPI 与分类聚合按同一份全量算——截的是表，不是读数。 */
  readonly rows: readonly QueryTableRow[];
  readonly kpi: QueryKpi;
  /** 分类聚合卡的行（**全量**：已按支出降序）；空数组＝这一页没有支出，不出这一块。
   *  显示上限（前 8 类）由本件截，类数与老页 `categoryBar` 的 `slice(0,8)` 同。 */
  readonly categories: readonly QueryCategoryRow[];
  /** 零行时那句话。 */
  readonly emptyText: string;
  /** 零行时那句引导（说清下一步该说什么词）。 */
  readonly emptyHint: string;
  /** 复制载荷：**本次查询的 envelope 本身**（`skill`／`shape`／`key`／`data`），复制区直接序列化它。 */
  readonly envelope: SerializableEnvelope;
  /** 本次数据来源（复制日志第 3 段）。 */
  readonly source: string;
  /** 来源脚注上屏的人话来源（**不许带脚本路径与库文件名**，裁定 1）。 */
  readonly sourceText: string;
  /** 来源脚注的窗口起止（日期或「不限」）。 */
  readonly windowStart: string;
  readonly windowEnd: string;
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

/** 一张表最多画多少条（**上限**，老侧 `query_view.html:524` 的 `slice(0,200)` 同数）。
 *  真正的约束在 `PAGE_BYTE_BUDGET`：这个数是天花板，实际画多少由体积算出来（见 `queryListDoc`）。 */
const DISPLAY_LIMIT = 200;

/** 一整页的**体积预算**（字节）。交付路对写下去的那一串跑 `assertHtmlSize`
 *  （`../render/html.ts:46`，上限 `BILL_HTML_MAX_BYTES = 262,144`），超了 **exit 5、整页不出**。
 *
 *  **口径重拍**，理由是固定条数保不住这条门：① 本页体积由**复制载荷**主导——复制区按 #247 给三种格式，
 *  同一份数据落三处，实测每条约 1.6 KB；② 一行的体积**随内容长短变**——100 条普通备注 235 KB（过），
 *  100 条 200 字长备注 **497 KB（撞门）**。故改成按当刻产物的真实字节定条数：
 *  先按 `min(本窗条数, DISPLAY_LIMIT)` 试画，放不下就用**二分**找「放得下的最大条数」
 *  （回退按比例猜会多扔两成版面）。于是页大小与查询规模、与单条内容长短**双重解耦**。
 *  **出口载荷（stdout 那份 `data.items`）仍全量**，机器契约一字不动。 */
const PAGE_BYTE_BUDGET = 240_000;

/** 分类聚合卡的类数上限（老侧 `categoryBar` 的 `slice(0,8)` 同数）。 */
const CATEGORY_LIMIT = 8;

/** 合计金额的文本（两位小数）。**不是** `src/write/summaryRow.ts` 的 `money2`：那一件是「用户给的
 *  那一笔金额」的口径（0 与缺省都写「未给」），这里是**合计**——合计为 0 是真实读数（这一天没花钱），
 *  写成「未给」就是撒谎。两件事，两个定义。 */
function sumText(n: number): string {
  return (Number.isFinite(n) ? n : 0).toFixed(2);
}

/** KPI 行四格：笔数／支出／收入／净额（口径由 `calcKpi` 算好，本件只摆版式）。 */
function kpiCards(kpi: QueryKpi): readonly KpiCardInput[] {
  return [
    { label: '笔数', value: String(kpi.count), detail: '转账不计进收支' },
    { label: '支出', value: sumText(kpi.expense), detail: '本页支出合计' },
    { label: '收入', value: sumText(kpi.income), detail: '本页收入合计' },
    { label: '净额', value: sumText(kpi.net), detail: '收入减支出' },
  ];
}

/** 结论句一行（裁定 2／§五 第 3 行「结论句一行」，⑤ 类恒出）。说的**不是**读数卡那四个数
 *  （那是同一件事说两遍），而是「这批账主要是什么」这一句人话判定；没有支出时说清只有收入。 */
function conclusionOf(input: QueryListInput): string {
  if (input.rows.length === 0) return '本窗没有记录。';
  const top = input.categories[0];
  if (top === undefined) return '本页只有收入，没有支出。';
  return '主要花在「' + top.label + '」，' + sumText(top.amount) + ' 元，占本页支出 '
    + String(Math.round(top.pct)) + '%。';
}

/** 分类聚合卡的每一行：`名称 ｜ 占比条 ｜ 金额 · 笔数 · 均额`（老页 `categoryBar` 的四件事全在）。
 *  占比由条长承载；均额＝该分类支出合计 ÷ 笔数。类数上限在本件截（老页 `slice(0,8)` 同数），
 *  截掉了什么由紧跟其后那行口径说清——不静默截断。 */
function categoryRows(input: QueryListInput): readonly QueryPageBlock[] {
  if (input.categories.length === 0) return [];
  const shown = input.categories.slice(0, CATEGORY_LIMIT);
  const hidden = input.categories.length - shown.length;
  const rows = shown.map((c) => {
    const parts = [sumText(c.amount) + ' 元', String(c.count) + ' 笔'];
    if (c.count > 0) parts.push('均 ' + sumText(c.amount / c.count));
    return { label: c.label, value: parts.join(' · '), pct: c.pct };
  });
  const caliber = hidden > 0
    ? renderCaliberLine('这一页只列支出最多的前 ' + String(CATEGORY_LIMIT) + ' 类，还有 ' + String(hidden) + ' 类没列')
    : '';
  return [{
    nav: { anchor: 'sec-categories', navText: '分类聚合' },
    heading: '分类聚合',
    html: renderDistributionRows({ rows }) + caliber,
  }];
}

/** 截断明示（§五 第 21 行，⑤ 类恒出）：表只画了一部分时，跟一个折叠区把「为什么只画这些、
 *  怎么看到其余的」讲清，再跟一行口径（条数报的是**当刻真画了几条**）。老页「不静默截断」的意图继承。 */
function truncatedBlocks(hidden: number, total: number, shownCount: number): readonly QueryPageBlock[] {
  if (hidden <= 0) return [];
  return [{
    nav: { anchor: 'sec-truncated', navText: '没显示的记录' },
    heading: '没显示的记录',
    html: renderDisclosure({
      title: '还有 ' + String(hidden) + ' 条没显示（这一页画了前 ' + String(shownCount) + ' 条）',
      contentHtml: renderCaliberLine('要看其余的，把区间收窄再查一次；上面那几格读数与分类聚合不受影响，'
        + '它们一直按本窗全部 ' + String(total) + ' 条算'),
    }) + renderCaliberLine('本页的表与复制区都只带前面 ' + String(shownCount) + ' 条，'
      + '其余 ' + String(hidden) + ' 条按上面那一块说得出口'),
  }];
}

/** 页面的复制载荷：**画出来的那一窗**（`items` 与表同截，序号一一对应——两者由同一个 `records`
 *  按同一序号派生）。出口载荷（stdout 那份）仍全量，本件不动它。 */
function pageEnvelopeOf(input: QueryListInput, shownCount: number): SerializableEnvelope {
  const data = input.envelope.data as QueryListData;
  return {
    ...input.envelope,
    data: {
      ...data,
      items: data.items.slice(0, shownCount),
      total: data.total,
    } as QueryListData,
  };
}

/** 列表页的口径说明行（裁定 2）。用全角竖线分段：公共层按它拆段、段间分隔交给版式（t154-r3）。 */
function listCaliber(): string {
  return renderCaliberLine('笔数与收支合计按本窗全部记录算，转账不计进收支'
    + '｜分类聚合的条长＝该分类支出占本页支出合计的比例'
    + '｜均额＝该分类支出合计 ÷ 该分类笔数');
}

/** 通用查询列表页：一整页。块序在本件只写一份（`blocks` 既拼正文也派生导航）。
 *  **画多少条由体积算，不由死数定**（见 `PAGE_BYTE_BUDGET`）：判的是**真交付的那一串**，
 *  先试上限，放不下就二分找「放得下的最大条数」。 */
export function queryListDoc(input: QueryListInput): string {
  const ceiling = Math.min(input.rows.length, DISPLAY_LIMIT);
  if (ceiling === 0) return renderQueryList(input, 0);
  /** 画 n 条；放得下就把那一串给出来，放不下给 `null`。 */
  const drawIfFits = (n: number): string | null => {
    const html = renderQueryList(input, n);
    return estimateBytes(html) <= PAGE_BYTE_BUDGET ? html : null;
  };
  const atCeiling = drawIfFits(ceiling);
  if (atCeiling !== null) return atCeiling;
  // 二分：`lo` 恒可放（1 条），`hi` 恒放不下（上限那一次已经试过了）。
  let lo = 1;
  let loHtml = drawIfFits(1);
  let hi = ceiling;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    const html = drawIfFits(mid);
    if (html === null) hi = mid;
    else { lo = mid; loHtml = html; }
  }
  // 连 1 条都超预算（正常内容不会；真发生也不静默丢整页——把 1 条那一版交出去，让体积门自己说话）。
  return loHtml ?? renderQueryList(input, 1);
}

/** 一整页拼一次（入参给「画几条」）。体积回退那条循环按不同条数反复调本件。 */
function renderQueryList(input: QueryListInput, shownCount: number): string {
  const shown = input.rows.slice(0, shownCount);
  const hidden = input.rows.length - shown.length;
  const table = input.rows.length === 0
    ? renderEmptyBlock({ text: input.emptyText, hint: input.emptyHint })
    : '<div class="bill-query-wide">' + renderDataTable({
      columns: COLUMNS,
      rows: shown,
      caption: hidden > 0 ? '查到的记录（前 ' + String(shownCount) + ' 条）' : '查到的记录',
      emptyText: input.emptyText,
    }) + '</div>';
  const blocks = blocksOf(input, table, hidden, shownCount);
  const content = renderConclusionBar(conclusionOf(input)) + pageNav(blocks) + pageBody(blocks);
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

/** 正文块清单（**块序唯一定义地**）：结论句与页内导航之外的八块。导航由本清单派生（见 `./pageParts.js`）。 */
function blocksOf(input: QueryListInput, table: string, hidden: number, shownCount: number): readonly QueryPageBlock[] {
  const pageEnvelope = pageEnvelopeOf(input, shownCount);
  return [
    {
      html: renderChips({ items: input.chips.map((text) => ({ text })) }),
      nav: { anchor: 'sec-summary', navText: '结果' },
    },
    { html: renderKpiGrid(kpiCards(input.kpi)), nav: { anchor: 'sec-kpi', navText: '读数' } },
    { html: table, nav: { anchor: 'sec-records', navText: '记录' }, heading: '记录' },
    ...categoryRows(input),
    ...truncatedBlocks(hidden, input.rows.length, shownCount),
    { html: listCaliber(), nav: { anchor: 'sec-caliber', navText: '读数口径' } },
    {
      html: copyArea({
        data: { envelope: pageEnvelope, title: input.wakeWord },
        log: {
          envelope: pageEnvelope,
          copyLog: copyLog({
            command: commandLine(input.key, input.params),
            source: input.source,
            detail: '查到 ' + String(input.rows.length) + ' 笔',
            actionAt: input.actionAt,
            version: DOC_VERSION,
          }),
        },
      }),
      nav: { anchor: 'sec-copy', navText: '复制' },
    },
    { html: sourceLine({ source: input.sourceText, start: input.windowStart, end: input.windowEnd, count: input.rows.length }) },
  ];
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
