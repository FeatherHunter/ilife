/** 查标签列表页的票据纸呈现（w13 · 域 query，本页段落唯一定义地）。
 *
 * 谁在用（一个调用点，指名）：`./list.ts` 的 `renderQueryList`——`bill.record.search` 且
 *  `params.kind === 'tag'`（即唤醒词「查标签」）时走本件，其余查询页仍走老列表路。
 *  本件只做呈现分支，不改取数与口径（`../shared/kpi.js` 的 `calcKpi`、分类聚合、精确匹配
 *  取数仍在 `./read.ts`；结论句读 `./list.ts` 的 `conclusionOf`，本件不写第二份）。
 *
 * 原型（逐像素对照源）：`.scratch/1019-p-query/w13-查标签-v2.1.html`（v2.1 头注 1039：
 *  两钮块居中＋文本居中＋两行左缘对齐；1045 起口径段整段删除；纸外脚注按 v2.1 出一行静态脚注，
 *  与详情页 `./detail.ts` 同式）。八部位落点：
 *  纸头（品牌＋`标签「X」N 笔，支出 Y 元`＋副题窗口）／主数字（`标签命中 · X`＋支出唯一＋
 *  结论句）／落点 LEDGER（收入／净额／落点账本／币种）／分类占比 SCALE（条宽整数和 100，
 *  下见 `intPcts`）／明细 DETAIL（备注＋分类·账户·时刻·编号＋右对齐金额）／对账 CHECK
 *  （编号全列／共 N 笔／异常无）／复制区（数据三格式＋日志，原样走 `copyArea`）／
 *  页脚注（纸外一行 `饼干记账 · 查标签`，与详情页同式）／口径（无口径段，1045 全删）。
 *
 * 载荷一字不动：复制区直接序列化调用方给的 `envelope`（已按显示截断、与表同截，
 *  由 `./list.ts` 的 `pageEnvelopeOf` 算好传进来）；`items`／`total`／`kind:tag:*`／`kpi`
 *  键与类型照旧。落点账本多值时按记录先后 ` · ` 并列（w08 同例）；币种取载荷行自带值，
 *  缺省 `CNY`。对账编号按全窗（与 KPI 同口径，不随表截断，见内注）。
 */
import { escapeHtml } from 'base-paint';
import type { SerializableEnvelope } from 'base-paint';
import {
  renderCaliberLine,
  renderDistributionRows,
  renderEmptyBlock,
  renderLedgerRows,
  renderSheetFrame,
  renderSummaryHead,
} from 'base-paint/blocks';
import { assembleSheetPage, sheetHead, ticketActions, ticketRule, ticketSection, ticketSummary } from '../shared/docPage.js';
import { copyArea, copyLog } from '../shared/copyArea.js';
import { buildListCopyCsv, buildListCopyJson, buildListCopyText } from './list-copy.js';
import { DOC_TITLE, DOC_VERSION } from '../shared/pageIdentity.js';
import { commandLine, writeSection } from '../shared/writeParts.js';
import { queryStyleTag } from './pageParts.js';
import type { QueryListInput, QueryTableRow } from './list.js';

/** 本页是不是查标签（`./list.ts` 分支判据，唯一定义地）。 */
export function isTagList(input: { readonly key: string; readonly params: Record<string, unknown> }): boolean {
  return input.key === 'bill.record.search' && input.params.kind === 'tag';
}

/** 票据纸入参（`./list.ts` 已算好的直接拿来：结论句与截断后载荷不进本件重算）。 */
export interface TagTicketArgs {
  readonly input: QueryListInput;
  readonly shown: readonly QueryTableRow[];
  readonly conclusion: string;
  readonly envelope: SerializableEnvelope;
}



/** 去重（保首次出现序）：落点账本／币种多值并列用。 */
function distinct(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v.trim();
    if (t === '' || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

/** 占比整数（和 100 的最大余数法；原型 manifest 的 60/40 与 41/24/19/7/5/4 即此算出）。 */
function intPcts(weights: readonly number[]): number[] {
  const floors = weights.map((w) => Math.max(0, Math.floor(w)));
  let rest = 100 - floors.reduce((a, b) => a + b, 0);
  const order = weights.map((_, i) => i).sort((a, b) => (weights[b] - floors[b]) - (weights[a] - floors[a]));
  const out = [...floors];
  for (const i of order) {
    if (rest <= 0) break;
    out[i] += 1;
    rest -= 1;
  }
  return out;
}

/** 载荷行自带的币种（`./items.ts` 的 `toBillItem` 形状；读不到即空，由调用方兜 `CNY`）。 */
function currenciesOf(envelope: SerializableEnvelope): string[] {
  const data = envelope.data as { readonly items?: readonly unknown[] };
  const items = Array.isArray(data.items) ? data.items : [];
  const out: string[] = [];
  for (const it of items) {
    if (typeof it !== 'object' || it === null) continue;
    const c = (it as Record<string, unknown>).currency;
    if (typeof c === 'string' && c.trim() !== '') out.push(c.trim());
  }
  return distinct(out);
}

/** 落点 LEDGER（收入／净额两位小数；账本多值 ` · ` 并列；币种读载荷行）。 */
function ledgerHtml(input: QueryListInput): string {
  const ledgers = distinct(input.rows.map((r) => r.ledger));
  const currencies = currenciesOf(input.envelope);
  return renderLedgerRows({
    rows: [
      { label: '收入', value: input.kpi.income.toFixed(2) },
      { label: '净额', value: input.kpi.net.toFixed(2) },
      { label: '落点账本', value: ledgers.length === 0 ? '—' : ledgers.join(' · ') },
      { label: '币种', value: currencies.length === 0 ? 'CNY' : currencies.join(' · ') },
    ],
    layout: 'ticket',
  });
}

/** 分类占比 SCALE（w13 无附加注记；类超 8 时跟一行口径，与 `./list.ts` 同句）。 */
function scaleHtml(input: QueryListInput): string {
  if (input.categories.length === 0) return '<p class="ilife-ticket-scale-note">本窗无支出，无占比。</p>';
  const shownCats = input.categories.slice(0, 8);
  const pcts = intPcts(shownCats.map((c) => c.pct));
  const rows = shownCats.map((c, i) => ({ label: c.label, value: c.amount.toFixed(2) + ' 元', pct: pcts[i] }));
  const hidden = input.categories.length - shownCats.length;
  return renderDistributionRows({ rows })
    + (hidden > 0 ? renderCaliberLine('这一页只列支出最多的前 8 类，还有 ' + hidden + ' 类没列') : '');
}

/** 明细行（原型 `备注 · 笔记` 主行＋`分类 · 账户 · 时刻 · #编号` 次行＋右对齐金额；序号由票据纸计数器出）。 */
function detailRowHtml(r: QueryTableRow): string {
  const note = r.note.trim() === '' ? '—' : r.note.trim();
  return '<li><span class="ilife-ticket-entry-text">' + escapeHtml('备注 · ' + note)
    + '<span class="ilife-ticket-entry-sub">' + escapeHtml(r.category + ' · ' + r.account + ' · ')
    + '<span class="mono">' + escapeHtml(r.time) + '</span>' + escapeHtml(' · #' + r.id) + '</span></span>'
    + '<span class="ilife-ticket-entry-amt">' + escapeHtml(r.amount) + '</span></li>';
}

/** 明细 DETAIL（零行走空态，文案读调用方给的本页空态句）。 */
function detailHtml(args: TagTicketArgs): string {
  if (args.shown.length === 0) {
    return '<div class="ilife-ticket-card">'
      + renderEmptyBlock({ text: args.input.emptyText, hint: args.input.emptyHint }) + '</div>';
  }
  return '<div class="ilife-ticket-card"><ol class="ilife-ticket-entries">'
    + args.shown.map(detailRowHtml).join('') + '</ol></div>';
}

/** 对账 CHECK（编号按全窗列，KPI 与结论同口径；表截断只截明细表，不截对账）。 */
function checkHtml(input: QueryListInput): string {
  const ids = input.rows.map((r) => r.id);
  const text = ids.length === 0
    ? '共 0 笔 ／ 异常：无'
    : '编号 ' + ids.join('、') + ' ／ 共 ' + input.rows.length + ' 笔 ／ 异常：无';
  return '<div class="check-mini"><span class="dot"></span><span>' + escapeHtml(text) + '</span></div>';
}

/** 查标签票据纸整页（非本页即 `null`，调用方走老路；标记位 `slot/page/shape/key` 与老页同值）。 */
export function queryTagDoc(args: TagTicketArgs): string | null {
  const { input } = args;
  const rawTag = input.params.tag;
  const tag = typeof rawTag === 'string' ? rawTag.trim() : '';
  if (!isTagList(input) || tag === '') return null;
  const total = input.rows.length;
  const expense = input.kpi.expense;
  const head = sheetHead('饼干记账 · ' + input.wakeWord, escapeHtml('标签「' + tag + '」' + total + ' 笔，支出 ' + expense.toFixed(2) + ' 元'))
    + '<p class="shop-sub">' + escapeHtml(input.window) + '</p>';
  const summary = ticketSummary(
    renderSummaryHead({ eyebrow: '标签命中 · ' + tag, value: expense.toFixed(2), unit: '元', layout: 'ticket', size: 'l' }),
    '<p class="ilife-ticket-summary-note">' + escapeHtml(args.conclusion) + '</p>',
  );
  const paper = queryStyleTag() + head
    + ticketRule() + summary
    + ticketRule() + ticketSection({ title: '落点', tag: 'LEDGER', content: ledgerHtml(input) })
    + ticketRule() + ticketSection({ title: '分类占比', tag: 'SCALE', content: scaleHtml(input) })
    + ticketRule() + ticketSection({ title: '明细', tag: 'DETAIL', content: detailHtml(args) })
    + ticketRule() + ticketSection({ title: '对账', tag: 'CHECK', content: checkHtml(input) })
    + ticketRule() + ticketActions(copyArea({
      data: { envelope: args.envelope, title: input.wakeWord },
      dataText: buildListCopyText({ title: input.wakeWord, window: input.window, total: input.rows.length, shown: args.shown }),
      dataJson: buildListCopyJson({ title: input.wakeWord, window: input.window, total: input.rows.length, shown: args.shown }),
      dataCsv: buildListCopyCsv({ title: input.wakeWord, window: input.window, total: input.rows.length, shown: args.shown }),
      log: {
        envelope: args.envelope,
        copyLog: copyLog({
          command: commandLine(input.key, input.params),
          source: input.source,
          detail: '查到 ' + total + ' 笔',
          actionAt: input.actionAt,
          version: DOC_VERSION,
        }),
      },
    }));
  const content = writeSection({
    slot: 'list', page: 'list', shape: input.shape, key: input.key,
    content: renderSheetFrame({ variant: 'ticket', cutLine: true, cutLineText: '✂ 裁切线', extraClass: 'ilife-taglist', content: paper })
      + '<p class="ilife-ticket-foot">' + escapeHtml(DOC_TITLE + ' · ' + input.wakeWord) + '</p>',
  });
  return assembleSheetPage({ docTitle: DOC_TITLE + '·查询', bodyHtml: content, paper: 'detail' });
}
