/** 目标域模板之二 · **进度视图页型**（`docs/skills/skill-bill/t685-按域页型表.md` §2.4 第 2 行／
 *  #688 §五 5.1 的 ⑥ 结果型汇总／进度／状态页）。
 *
 * **本件是这一片页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里；
 *  场景件（`scene-{budget,saving}.ts`）只给差异值——结论句、读数卡、每条进度卡、占比条、空态句、口径行。
 *  改一次这一片页型的版式只动本件一处，两张结果页（预算执行／目标进度）同时跟着改。
 *
 * 盖住的场景（老侧两张模板，本仓按「一族两件共用一份装配件」办）：
 *   看预算 `budget`（老 `目标/budget_view.html`）· 看目标 `saving`（老 `目标/saving_view.html`）。
 *
 * **块位序列**（照 #688 §五 5.2 的 ⑥ 汇总／进度／状态 列；● 恒出、○ 有内容才出）：
 *   类型徽章 ●（表序第 6 行，结果胶囊在最前）→ 结论句 ●（第 3 行）→ 页内导航 ●（第 4 行）
 *     → 读数行 ●（第 5 行，有目标的那一格带完成度条）→ 每条进度卡 ●／空态 ●（第 12、23 行）
 *     → 占比条 ○（第 13 行）→ 口径说明行 ●（第 24 行）→ 对账折叠区 ●（第 21 行）
 *     → 复制区 ●（第 25 行）→ 来源脚注 ●（第 26 行）
 *   本页**不出**的两块（表序里点了 ⑥ 但这一域没有对应事实）：第 14 行图表（目标域零图表）、
 *   第 15 行的独立进度条区块（进度条由读数卡的 `bar` 槽承载，不另立一块——那是同一件事的第二处画法）。
 *
 * **空表时不出读数卡**（照 #688 裁定 6 的同一条判法：没有预算／没有目标就没有执行可报，
 *  四张全 0 的读数卡只是把「什么都没有」说四遍）——那一支出空态句 ＋ 引导句，页仍然是完整的。
 *
 * 谁在用（两个调用点，指名）：`src/goal/scene-{budget,saving}.ts`——两件的 `view` 都是
 *  `bindGoalProgressPage(spec)` 的产物，本件不自己出页。
 */
import { renderCaliberLine, renderConclusionBar, renderDistributionRows, renderKpiGrid } from 'base-paint/blocks';
import type { DistributionRowInput, KpiCardInput } from 'base-paint/blocks';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { navBlock, pageBody, pageNav } from '../shared/pageSections.js';
import type { PageBlock } from '../shared/pageSections.js';
import { badgeOf, copyZoneOf, emptyOf, goalPageShell, listEnvelopeOf, reconcileOf, sourceNoteOf } from './pageParts.js';
import type { GoalProgressInput, GoalReadScene } from './scene.js';

/** 场景给模板件的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。 */
export interface GoalProgressSpec {
  /** 唤醒词（页标题、徽章第一枚、复制日志的场景标识都读它）。 */
  readonly word: string;
  /** 文档标题的后缀（如「·预算执行」）。 */
  readonly docSuffix: string;
  /** 副标题（这一页看的是哪一段）。 */
  readonly window: (input: GoalProgressInput) => string;
  /** 结论句一行（表序第 3 行）：说的不是读数卡那几个数，而是这批目标现在是什么局面。 */
  readonly conclusion: (input: GoalProgressInput) => string;
  /** 结果胶囊那几枚（第二枚胶囊那句：有几条、几条超支／几个已完成）。 */
  readonly caliber: (input: GoalProgressInput) => string;
  /** 读数行（表序第 5 行）。 */
  readonly kpi: (input: GoalProgressInput) => readonly KpiCardInput[];
  /** 每条进度卡的标题（如「各条预算执行」）。 */
  readonly cardsTitle: string;
  /** 每条进度卡：一条一张带进度条的读数卡。 */
  readonly cards: (input: GoalProgressInput) => readonly KpiCardInput[];
  /** 占比条的标题（如「各条预算占了多少」）与行。 */
  readonly bars: (input: GoalProgressInput) => { readonly title: string; readonly rows: readonly DistributionRowInput[] };
  /** 这一页有几条（进度卡张数）与看了几条记录（对账与脚注读它）。 */
  readonly counts: (input: GoalProgressInput) => { readonly items: number; readonly records: number };
  /** 一条都没有时那三句（空态句 ＋ 引导句 ＋ 图标）。 */
  readonly empty: (input: GoalProgressInput) => { readonly icon: string; readonly text: string; readonly next: string };
  /** 口径说明行（表序第 24 行）。 */
  readonly caliberLines: string;
  /** 本次数据来源：复制日志第 3 段那句（可带载体名）与来源脚注那句（只写人话）。 */
  readonly source: string;
  readonly sourceText: string;
  /** 复制日志第 4 段后半（这一页干了什么）。 */
  readonly logDetail: (input: GoalProgressInput) => string;
}

/** 场景件拿到手的那张整页（`GoalReadScene` 的 `view` 一格）。 */
export function bindGoalProgressPage(spec: GoalProgressSpec): Pick<GoalReadScene, 'view'> {
  return { view: (input) => progressPage(spec, input) };
}

/** 进度视图整页（结果型 ⑥）：块序在本件只写一份（`blocks` 既拼正文也派生页内导航）。 */
function progressPage(spec: GoalProgressSpec, input: GoalProgressInput): string {
  const counts = spec.counts(input);
  const hasItems = counts.items > 0;
  const empty = spec.empty(input);
  const envelope = listEnvelopeOf(input.key, input.data);
  const bars = spec.bars(input);
  const barHtml = bars.rows.length === 0 ? '' : renderConclusionBar(bars.title) + renderDistributionRows({ rows: bars.rows });
  const blocks: readonly PageBlock[] = [
    ...(hasItems
      ? [
        navBlock(renderKpiGrid(spec.kpi(input)), 'sec-kpi', '读数'),
        navBlock(renderKpiGrid(spec.cards(input), { title: spec.cardsTitle }), 'sec-items', spec.cardsTitle),
        { html: barHtml },
      ]
      : []),
    ...(hasItems ? [] : [navBlock(emptyOf(empty), 'sec-empty', '现在的情况')]),
    { html: renderCaliberLine(spec.caliberLines) },
    navBlock(reconcileOf({
      actionAt: input.actionAt, changed: 0,
      note: '这一页看了 ' + String(counts.records) + ' 条记录、' + String(counts.items) + ' 条' + spec.cardsTitle
        + '；只读，没有改动任何数据。',
    }), 'sec-reconcile', '对账'),
    navBlock(copyZoneOf({
      envelope, title: input.wakeWord, key: input.key, params: input.params,
      source: spec.source, detail: spec.logDetail(input), actionAt: input.actionAt,
    }), 'sec-copy', '复制'),
  ];
  const content = badgeOf({
    word: input.wakeWord,
    caliber: spec.caliber(input),
    status: hasItems ? 'ok' : 'empty',
    statusText: hasItems ? '查到了' : '一条都还没有',
    next: '',
  }) + renderConclusionBar(spec.conclusion(input))
    + pageNav(blocks) + pageBody(blocks)
    + sourceNoteOf({
      sourceText: spec.sourceText, start: input.windowStart, end: input.windowEnd, count: counts.records,
    });
  return goalPageShell({
    docTitle: DOC_TITLE + spec.docSuffix,
    title: input.wakeWord,
    subtitle: spec.window(input),
    slot: 'list', page: 'list', shape: 'list', key: input.key, content,
  });
}
