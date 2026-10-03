/** 查询域·空窗口票据纸空态（`bill.record.today` 族零行，5 场景共用一份实现）。
 *
 * 判地（唯一）：`docs/skills/skill-bill/proto/query/w00-空态-查某天无记录-v2.1.html`（v2.1 票据纸空态）。
 * 本件逐部位照它的形状：
 *   纸头 `饼干记账 · {唤醒词}` ＋ H2 `{窗口}没有记录` ＋ 副题 `{唤醒词} · 空窗`
 *   ／主数字 `空态 · 0 笔` ＋ `0` ＋ 单位 `笔` ＋ 结论句 `本窗没有记录。{引导句}`
 *   ／落点 LEDGER 三行（笔数 0 ／ 币种 CNY ／ 说明 只看不改，转账不算收支）
 *   ／分类占比 SCALE 一句 `本窗无支出，无占比。`
 *   ／明细 DETAIL 空态块（空态句 ＋ 引导句，走公共层 `renderEmptyBlock`，与列表页空态同一件）
 *   ／对账 CHECK `笔数 0 ／ 查到 0 笔 ／ 异常：无` ／复制区（`copyArea` 三格式）／裁切线 `✂ 裁切线`／页脚。
 *
 * **空态句与引导句由调用方给**（`./read.js` 的 `todayEmpty()` 那四句是这几页的既有判地，一字不动）：
 *   今天＝`今天还没有记录`／昨天＝`昨天还没有记录`／某天＝`这一天没有记录`／最近＝`库里还没有记录`，
 *   各带下一步 hint。w00 是「查某天」的空态，它的两句与某天那两句同形（空态句逐字同）。
 *
 * 谁在用（一个调用点，指名）：`./read.js` 的 `viewRecordToday`——五个场景（查今天／查昨天／查某天／
 * 查最近／查账单）在同一条零行分支上收口到本件（查账单无参时投影回查今天，见 `./declaration.js`）。
 *
 * 载荷键与其它票据页同形：`{items, total, date, kpi}`（零行的 kpi 四项全 0），经 `./list.js` 的
 * `listEnvelope` 出；stdout 那份与页面同源。**本件只出空态**：有数仍走 `./ticketToday.js`／
 * `./ticketYesterday.js`／`./ticket-day.js`／`./ticketRecent.js` 各自那条路，一字不动。
 */
import { escapeHtml } from 'base-paint';
import { DB_FILENAME } from '../fetch/index.js';
import { renderEmptyBlock, renderLedgerRows, renderSheetFrame, renderSummaryHead } from 'base-paint/blocks';
import type { ViewOut } from '../shared/commandSpec.js';
import { actionStamp, copyArea, copyLog } from '../shared/copyArea.js';
import { calcKpi } from '../shared/kpi.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { listEnvelope } from './list.js';
import type { QueryListData } from './list.js';
import { queryStyleTag } from './pageParts.js';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { commandLine, writeSection } from '../shared/writeParts.js';

/** 本次数据来源（复制日志第 3 段；与其它查询页同字）。 */
const SOURCE_QUERY = DB_FILENAME + '（查询结果：只读，不改库）';

/** 主数字那一格（w00 判地逐字：空态 · 0 笔 ／ 0 ／ 笔）。 */
const SUMMARY_EYEBROW = '空态 · 0 笔';
const SUMMARY_UNIT = '笔';

/** 结论句第一句（w00 判地逐字；第二句＝调用方给的引导句）。 */
const NOTE_HEAD = '本窗没有记录。';

/** 落点 LEDGER 三行（w00 判地逐字）。 */
const LEDGER_ROWS = [
  { label: '笔数', value: '0' },
  { label: '币种', value: 'CNY' },
  { label: '说明', value: '只看不改，转账不算收支' },
] as const;

/** 分类占比那一句（w00 判地逐字）。 */
const SCALE_NOTE = '本窗无支出，无占比。';

/** 对账 CHECK 那一句（w00 判地逐字；分隔是全角斜线）。 */
const CHECK_TEXT = '笔数 0 ／ 查到 0 笔 ／ 异常：无';

/** 本页自有标记的样式（作用域限 `.ilife-ticket-detail`，与 `./ticket-day.js` 同一套手法）。 */
const EMPTY_TICKET_CSS = [
  '.ilife-ticket-detail .ilife-empty-shop-sub { margin: 8px 0 0; font-size: 12.5px; line-height: 1.6; color: var(--ilife-ink-2); text-align: center; overflow-wrap: anywhere; }',
  '.ilife-ticket-detail .ilife-empty-check { display: flex; align-items: center; gap: 8px; background: var(--ilife-ok-soft); border-radius: var(--ilife-radius-sm); padding: 10px 12px; font-size: 13px; line-height: 1.6; overflow-wrap: anywhere; }',
  '.ilife-ticket-detail .ilife-empty-check-dot { flex: 0 0 auto; width: 8px; height: 8px; border-radius: 999px; background: var(--ilife-ok); }',
  '.ilife-empty-foot { text-align: center; color: var(--ilife-ink-3); font-size: 11.5px; padding: 10px 0 2px; letter-spacing: .4px; line-height: 1.7; }',
].join(String.fromCharCode(10));

/** 空窗口票据纸的入参。 */
export interface EmptyTicketInput {
  readonly key: string;
  readonly params: Record<string, unknown>;
  readonly wakeWord: string;
  /** 窗口短语（与有数页同一处口径：单日支＝`{date} 这一天`、最近＝`最近 N 笔（按时间倒序）`）。 */
  readonly window: string;
  /** 载荷 `date` 键（单日支＝具体日期；最近＝`recent`）。 */
  readonly date: string;
  /** 空态句（明细空态块主行，也是各场景既有判地那四句之一）。 */
  readonly emptyText: string;
  /** 引导句（明细空态块次行，也是结论句第二句）。 */
  readonly emptyHint: string;
}

/** 零行载荷（与 `./list.js` 的 `listOut` 同形：`items` 空、`total` 0、kpi 四项全 0）。 */
function emptyData(date: string): QueryListData {
  return { items: [], total: 0, date, kpi: calcKpi([]) };
}

/** 空窗口票据纸：一整页（画面照 w00 判地；载荷与其它票据页同形）。 */
export function queryEmptyTicketDoc(input: EmptyTicketInput): string {
  const data = emptyData(input.date);
  const envelope = listEnvelope(input.key, data);
  const paper = queryStyleTag() + '<style>' + EMPTY_TICKET_CSS + '</style>'
    + sheetHead(DOC_TITLE + ' · ' + input.wakeWord, escapeHtml(input.window + '没有记录'))
    + '<p class="ilife-empty-shop-sub">' + escapeHtml(input.wakeWord + ' · 空窗') + '</p>'
    + ticketRule()
    + ticketSummary(renderSummaryHead({
      eyebrow: SUMMARY_EYEBROW,
      value: '0',
      unit: SUMMARY_UNIT,
      layout: 'ticket',
    }), '<p class="ilife-ticket-summary-note">' + escapeHtml(NOTE_HEAD + input.emptyHint) + '</p>')
    + ticketRule()
    + ticketSection({
      title: '落点', tag: 'LEDGER',
      content: '<div class="ilife-block-ledger-rows is-ticket">' + renderLedgerRows({ rows: [...LEDGER_ROWS], layout: 'ticket' }) + '</div>',
    })
    + ticketRule()
    + ticketSection({ title: '分类占比', tag: 'SCALE', content: '<p class="ilife-ticket-scale-note">' + SCALE_NOTE + '</p>' })
    + ticketRule()
    + ticketSection({
      title: '明细', tag: 'DETAIL',
      content: renderEmptyBlock({ text: input.emptyText, hint: input.emptyHint }),
    })
    + ticketRule()
    + ticketSection({
      title: '对账', tag: 'CHECK',
      content: '<div class="ilife-empty-check"><span class="ilife-empty-check-dot" aria-hidden="true"></span>'
        + '<span>' + CHECK_TEXT + '</span></div>',
    })
    + ticketRule()
    + ticketActions(copyArea({
      data: { envelope, title: input.wakeWord },
      log: {
        envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: SOURCE_QUERY,
          detail: '查到 0 笔',
          actionAt: actionStamp(),
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: 'list', key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', content: paper })
      + '<div class="ilife-empty-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</div>',
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}

/** 空窗口那一支的出口：载荷与其它票据页同形，页走本件票据纸空态。 */
export function emptyTicketOut(input: EmptyTicketInput): ViewOut {
  return {
    data: emptyData(input.date),
    page: { wakeWord: input.wakeWord, kind: 'single' },
    html: queryEmptyTicketDoc(input),
  };
}
