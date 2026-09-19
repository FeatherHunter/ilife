/** 分析域模板之三 · **读数＋表**（`t685-按域页型表.md` §2.3 第三族；3 个场景）。
 *
 * **本件是这一族页型的块位序列唯一住所**。盖住的场景：看借贷／看报销／看分期。
 *
 * **块位序列**（照 #688 §五 5.2 的 ⑦ 列顺序）：
 *   页头 ● → 结论句 ● → 页内导航 ● → 读数行 ●（本族三页都有总读数：未还总额／待报销额／分期进度）
 *     → 芯片列 ○（看分期那两枚「进行中 N 项／已还清 N 项」）→ 小表卡 ●（对象列表／历史报销／分期明细）
 *     → 事实行卡 ○（每张表下面那几行读数）→ 空态 ● → 口径说明行 ● → 复制区 ● → 来源脚注 ●
 *
 * 谁在用（一个调用点，指名）：`src/analysis/read.ts`——`family === 'tables'` 那 3 个场景出页时调它。
 */
import { cardBlock, emptyHtml, factCardHtml, kpiGridHtml, mergedChips, tableCardHtml } from './cards.js';
import { NO_WINDOW, SOURCE_READ, analysisDocOf, docTitleOf } from './pageParts.js';
import type { DocInput, TablesPage } from './scene.js';
import type { PageBlock } from '../shared/pageSections.js';

export function tablesDoc(input: DocInput<TablesPage>): string {
  const r = input.result;
  const p = r.page;
  const nothing = p.kpis.length === 0
    && p.tables.every((t) => t.rows.length === 0) && p.factCards.every((c) => c.rows.length === 0);
  const blocks: readonly PageBlock[] = [
    ...(p.kpis.length === 0 ? [] : [cardBlock(kpiGridHtml(p.kpis), 'sec-kpi', '读数')]),
    ...(p.chips.length === 0 && r.chips.length === 0 ? [] : [{ html: mergedChips(p.chips, r.chips) }]),
    ...(p.tables.length === 0 ? [] : p.tables.map((t, i) => cardBlock(
      tableCardHtml(t), 'sec-table-' + String(i + 1), t.title,
    ))),
    ...(p.factCards.length === 0 ? [] : p.factCards.map((c, i) => cardBlock(
      factCardHtml(c), 'sec-facts-' + String(i + 1), c.title,
    ))),
    ...(nothing ? [{ html: emptyHtml(p.empty) }] : []),
  ];
  return analysisDocOf({
    key: input.key,
    params: input.params,
    wakeWord: input.wakeWord,
    docTitle: docTitleOf(r.title),
    subtitle: r.label,
    shape: input.envelope.shape,
    wordCaliber: '',
    status: nothing ? 'empty' : 'ok',
    statusText: nothing ? '这一段没有这类记录' : '看完了',
    next: nothing ? p.empty.hint : '',
    conclusion: r.conclusion,
    caliber: r.caliber,
    blocks,
    envelope: input.envelope,
    source: SOURCE_READ,
    detail: '取到 ' + String(r.count) + ' 条记录',
    actionAt: input.actionAt,
    windowStart: r.from === '' ? NO_WINDOW : r.from,
    windowEnd: r.to === '' ? NO_WINDOW : r.to,
    count: r.count,
  });
}
