/** 目标域模板之二 · **进度视图页型**（`t685-按域页型表.md` §2.4 第 2 行／#688 §五 5.1 的 ⑥ 结果型汇总／进度／状态页）。
 *
 * **本件是这一片页型的块位序列唯一住所**：块序、每块的出现条件、每块吃的数据都写在这里；
 *  场景件（`scene-{budget,saving}.ts`）只给差异值——结论句、空态句、来源、日志。改一次只动本件一处。
 *
 * 盖住的场景：看预算 `budget` · 看目标 `saving`。
 *
 * **块位序列＝判地的序列**（#1118 收官轮；判地 `proto/acct-goal/g05`／`g06`）：
 *  店头 → 主数字（眉标药丸 ＋ 百分比 ＋ 结论句）→ 落点 LEDGER（分类／账本／时间／编号）
 *  → 进度 DETAIL（预算：总预算／实际支出／剩余｜日均／预计月底；目标：目标｜总额／累计已存／还差／几个目标）
 *  → 对账 CHECK → 按钮区（主按钮 ＋ 复制数据／复制日志）→ ✂ 裁切线 → 纸外脚注。
 *  **判地没有的块一律不出**（页内导航／读数卡网格／占比条／口径行／对账折叠区／来源脚注）；
 *  一条都没有时中段走空态块（判地没有空态那一页，空表仍要给整页）。
 *
 * 谁在用（两个调用点，指名）：`src/goal/scene-{budget,saving}.ts`——两件的 `view` 都是
 *  `bindGoalProgressPage(spec)` 的产物，本件不自己出页。
 */
import { buildDataText } from 'base-paint';
import { renderEntryCard } from 'base-paint/blocks';
import type { EntryCardEntry } from 'base-paint/blocks';
import { ticketPrimaryButton } from '../shared/docPage.js';
import { DOC_TITLE } from '../shared/pageIdentity.js';
import { listSheetPage } from '../shared/票据纸页型.js';
import type { TicketSheetRow } from '../shared/票据纸页型.js';
import { SAVING_STATUS_META, clampPct, copyZoneOf, emptyOf, goalStyleTag, listEnvelopeOf, money } from './pageParts.js';
import type { GoalProgressInput, GoalReadScene } from './scene.js';

/** 场景给模板件的**差异声明**：值、文案与「哪个可选块出不出」，**不含任何块位拼装**。
 *
 *  #1118 收官轮起**判地没有那些块**（读数卡网格／每条进度卡／占比条／口径行／对账折叠区）本件不再读；
 *  对应字段留着不删（场景件随下一轮清理一起收），本件只读：`word`／`docSuffix`／`window`／`conclusion`／
 *  `cardsTitle`（中段段标题）／`counts`／`empty`／`source`／`logDetail`。 */
export interface GoalProgressSpec {
  /** 唤醒词（页标题、复制日志的场景标识都读它）。 */
  readonly word: string;
  /** 文档标题的后缀（如「·预算执行」）。 */
  readonly docSuffix: string;
  /** 副标题（这一页看的是哪一段）。 */
  readonly window: (input: GoalProgressInput) => string;
  /** 结论句一行（判地主数字下面那句小字）。 */
  readonly conclusion: (input: GoalProgressInput) => string;
  /** 结果胶囊那几枚（**本件已不读**）。 */
  readonly caliber: (input: GoalProgressInput) => string;
  /** 读数行（**本件已不读**：主数字由域事实现算）。 */
  readonly kpi: (input: GoalProgressInput) => readonly unknown[];
  /** 中段段标题（判地：预算执行／目标进度）。 */
  readonly cardsTitle: string;
  /** 每条进度卡（**本件已不读**）。 */
  readonly cards: (input: GoalProgressInput) => readonly unknown[];
  /** 占比条（**本件已不读**）。 */
  readonly bars: (input: GoalProgressInput) => { readonly title: string; readonly rows: readonly unknown[] };
  /** 这一页有几条与看了几条记录（对账那一句与空态读它）。 */
  readonly counts: (input: GoalProgressInput) => { readonly items: number; readonly records: number };
  /** 一条都没有时那三句（空态句 ＋ 引导句 ＋ 图标）。 */
  readonly empty: (input: GoalProgressInput) => { readonly icon: string; readonly text: string; readonly next: string };
  /** 口径说明行（**本件已不读**）。 */
  readonly caliberLines: string;
  /** 本次数据来源：复制日志第 3 段那句。 */
  readonly source: string;
  /** 来源脚注那句（**本件已不读**：判地没有来源脚注）。 */
  readonly sourceText: string;
  /** 复制日志第 4 段后半（这一页干了什么）。 */
  readonly logDetail: (input: GoalProgressInput) => string;
}

/** 场景件拿到手的那张整页（`GoalReadScene` 的 `view` 一格）。 */
export function bindGoalProgressPage(spec: GoalProgressSpec): Pick<GoalReadScene, 'view'> {
  return { view: (input) => progressPage(spec, input) };
}

/** 落点那几行（判地 g05／g06 各四行）。 */
function ledgerOf(input: GoalProgressInput, counts: { readonly items: number }): readonly TicketSheetRow[] {
  const month = typeof input.params['month'] === 'string' ? String(input.params['month']).trim() : '';
  const end = input.windowEnd.trim() === '' ? '不限' : input.windowEnd;
  if (input.budget !== null) {
    return [
      { label: '分类', value: '总预算' },
      { label: '账本', value: '目标和当月支出' },
      { label: '时间', value: (month === '' ? input.budget.month : month) + '（已过 ' + String(input.budget.budgets[0]?.days_elapsed ?? 0) + ' 天）' },
      { label: '编号', value: '预算 ' + String(counts.items) + ' 条' },
    ];
  }
  return [
    { label: '分类', value: '—（储蓄目标）' },
    { label: '账本', value: '目标和账本累计' },
    { label: '时间', value: '账本算到 ' + end },
    { label: '编号', value: '目标 ' + String(counts.items) + ' 个' },
  ];
}

/** 中段那一串行（判地：预算执行四行／目标进度四行）。 */
function detailRowsOf(input: GoalProgressInput): readonly EntryCardEntry[] {
  const e = input.budget;
  if (e !== null && e.budgets.length > 0) {
    const b = e.budgets[0];
    const projection = b.month_end_proj === null ? '' : money(b.month_end_proj);
    return [
      { title: '总预算 ' + money(b.amount), sub: '上限（金额仅此一处）' },
      { title: '实际支出 ' + money(b.actual) + ' ｜ ' + String(b.count) + ' 笔', sub: '当月所有支出都在内' },
      {
        title: (b.remaining >= 0 ? '剩余 ' + money(b.remaining) : '超出 ' + money(Math.abs(b.remaining)) + ' 元')
          + (b.daily_avg === null ? '' : ' ｜ 日均 ' + money(b.daily_avg)),
      },
      { title: '预计月底 ' + (projection === '' ? '—' : projection), sub: '按当前日均推算，仅供参考' },
    ];
  }
  const s = input.saving;
  const one = s?.savings[0];
  if (s === null || one === undefined) return [];
  return [
    { title: one.name + ' ｜ 总额 ' + money(one.amount), sub: '存够就算达成' },
    { title: '累计已存 ' + money(one.saved), sub: '相当于总额的进度见主数字' },
    { title: '还差 ' + money(one.remaining) },
    {
      title: String(s.count) + ' 个目标 · 已完成 ' + String(s.done_count) + ' 个',
      sub: s.done_count === 0 ? '都没达成，再加把劲' : String(s.done_count) + ' 个已经达成',
    },
  ];
}

/** 对账那一句（判地：预算「N 条预算 · 状态」／目标「N 条记录参与累计」）。 */
function checkOf(input: GoalProgressInput, counts: { readonly items: number; readonly records: number }): string {
  const e = input.budget;
  if (e !== null) {
    const state = e.totals.over_count > 0 ? String(e.totals.over_count) + ' 条超支' : '都在预算内';
    return String(counts.items) + ' 条预算 · ' + state + ' ／ 没有异常';
  }
  return String(counts.records) + ' 条记录参与累计 ／ 没有异常';
}

/** 进度视图整页（结果型 ⑥）。 */
function progressPage(spec: GoalProgressSpec, input: GoalProgressInput): string {
  const counts = spec.counts(input);
  const hasItems = counts.items > 0;
  const envelope = listEnvelopeOf(input.key, input.data);
  const rows = detailRowsOf(input);
  const detailHtml = hasItems && rows.length > 0
    ? renderEntryCard({ entries: rows })
    : emptyOf(spec.empty(input));
  const e = input.budget;
  const one = input.saving?.savings[0];
  const eyebrow = e !== null
    ? (e.totals.over_count > 0 ? '有超支' : '都在预算内')
    : (one === undefined ? '暂无进度' : SAVING_STATUS_META[one.status].label);
  const pct = e !== null
    ? (e.totals.budget > 0 ? clampPct(e.totals.actual / e.totals.budget * 100) : 0)
    : (one === undefined ? 0 : clampPct(one.pct));
  return listSheetPage({
    docTitle: DOC_TITLE + spec.docSuffix,
    brand: '饼干记账 · ' + input.wakeWord,
    title: input.wakeWord,
    subtitle: spec.window(input),
    summary: {
      eyebrow: hasItems ? eyebrow : '一条都还没有',
      value: hasItems ? pct.toFixed(1) : '0.0',
      unit: '%',
      note: spec.conclusion(input),
    },
    ledgerTitle: e !== null ? '预算落点' : '目标落点',
    ledger: ledgerOf(input, counts),
    detailTitle: spec.cardsTitle,
    detailTag: 'DETAIL',
    detailHtml,
    check: checkOf(input, counts),
    actions: ticketPrimaryButton({
      label: e !== null ? '复制这份执行进度去对账' : '复制这份目标进度去对账',
      actionId: 'ilife-copy-progress',
      text: buildDataText({ envelope, title: input.wakeWord, format: 'text' }),
    }) + copyZoneOf({
      envelope, title: input.wakeWord, key: input.key, params: input.params,
      source: spec.source, detail: spec.logDetail(input), actionAt: input.actionAt,
    }),
    foot: '饼干记账 · ' + input.wakeWord,
    styleHtml: goalStyleTag(),
    slot: 'list', page: 'list', shape: 'list', key: input.key, paper: 'detail',
  });
}
