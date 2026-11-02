/** 分析域复制人话门（**唯一定义地**）：场景事实 → 人话三份（纯文本／JSON／CSV）。
 *
 * 为什么单立一门：base 冻结面（stat 投影把 metrics 原键直投纯文本、analysis 投影把换行压成空格）
 * 不动，bill 内分析侧的人话口径从此只住这一件。复制三份一律走本门，不再经 buildDataText。
 *
 * 谁在用（三处，指名）：scene-monthly.ts／scene-range-compare.ts／scene-trend.ts——三件场景
 * 各自把**同一份 kpi／agg 结果**（页面已经在用的那一份，只搬家不重算）组装成事实，调本门一次
 * 得三份；模板经 copyZoneOf 的覆写位把三份送进复制区（缺省仍走 buildDataText，余下 22 页零回归）。
 *
 * 口径出处：
 *   - 金额两位／百分比一位／缺值 —／带符号差：本域 ./pageParts.ts 的 money／pctText／signedMoney／MISSING；
 *   - 单行化／CSV RFC4180：共用件 `../shared/copyText.js`（唯一定义地），本件只喂分析行式；
 *   - 文本绝对值＋方向词、CSV 保留符号、JSON 数仍数照写域口径，不另抄第二套；
 *   - 纯文本无英文键：metrics 原键（count／expense／income／net／l1.*）与分类键只进 JSON／CSV 键位，
 *     不进纯文本行；对比／趋势不断行（一行一期／一类／一月）。
 */
import type { Kpi } from './agg.js';
import { csvCell, oneLine } from '../shared/copyText.js';
import { MISSING, money, pctText, signedMoney } from './pageParts.js';
import { m } from '../entries/index.js';

/** 单期事实（看月度；kpi 即场景给页面的同一份，top 即条卡头一名，无支出类即 null）。 */
export interface PeriodCopyFacts {
  readonly kind: 'period';
  readonly word: string;
  readonly label: string;
  readonly kpi: Kpi;
  readonly topKey: string | null;
  readonly topValue: number;
}

/** 对比一侧（区间标签＋该侧读数，取自 compareTwo 两侧的同一份 kpi）。 */
export interface CopySide {
  readonly label: string;
  readonly count: number;
  readonly expense: number;
  readonly income: number;
}

/** 分类差异一行（两段金额与笔数，取自场景已排好序的那一份 diffs，只搬家不重排）。 */
export interface RangeRowCopy {
  readonly key: string;
  readonly a: number;
  readonly b: number;
  readonly diff: number;
  readonly aCount: number;
  readonly bCount: number;
}

/** 双区间事实（diff／pct／change 照 compareTwo 同数同向：差＝A 支出−B 支出，场景定方向词）。 */
export interface RangeCopyFacts {
  readonly kind: 'range';
  readonly word: string;
  readonly a: CopySide;
  readonly b: CopySide;
  readonly diff: number;
  readonly pct: number;
  readonly change: string;
  readonly rows: readonly RangeRowCopy[];
}

/** 趋势一个月（有记录的月才进，照场景逐月明细同一份 recorded）。 */
export interface TrendPointCopy {
  readonly month: string;
  readonly count: number;
  readonly expense: number;
  readonly income: number;
}

/** 趋势事实（kpi／avg／peakMonth／peak 照场景同一份值，只搬家不重算）。 */
export interface TrendCopyFacts {
  readonly kind: 'trend';
  readonly word: string;
  readonly months: number;
  readonly kpi: Kpi;
  readonly avg: number;
  readonly peakMonth: string;
  readonly peak: number;
  readonly points: readonly TrendPointCopy[];
}

/** 本门吃的事实（三场景一门，kind 分流）。 */
export type AnalysisCopyFacts = PeriodCopyFacts | RangeCopyFacts | TrendCopyFacts;

/** 本门吐的三份（一次调用同源产出：text 即 json.lines 的换行连接，csv 值与 text 同串）。 */
export interface AnalysisCopy {
  readonly text: string;
  readonly json: string;
  readonly csv: string;
}

/** 页身份行（饼干记账＋唤醒词；照 copyTextReceipt 页身份三段式，分析侧无回执尾段）。 */
function pageLine(word: string): string {
  return m('skill-bill.analysis-copyTextAnalysis.c001', { p0: String(word) });
}



/** 标签值（空走缺值占位，否则单行化；分类键与期间标签都经它，不裸奔）。 */
function pickLabel(s: string): string {
  const t = oneLine(s);
  return t === '' ? MISSING : t;
}



/* ── 看月度（单期人话行） ─────────────────────────────── */

/** 单期结论行（X月共N笔支出X收入X净额X，最多X类X元；无支出类即整句收尾）。
 *  #1210：原先是「基础句 ＋ 另一条拼『；花得最多的是…』」的两段拼接、末句号还在源码里另拼，
 *  英文那一列会落一个中文句号——故**整句化**：两条各自是完整句子（各自的句号住词条里）。 */
function periodLine(f: PeriodCopyFacts): string {
  const params = {
    p0: String(f.label),
    p1: String(f.kpi.count),
    p2: String(money(f.kpi.expense)),
    p3: String(money(f.kpi.income)),
    p4: String(money(f.kpi.net)),
  };
  if (f.topKey === null) return m('skill-bill.analysis-copyTextAnalysis.c002', params);
  return m('skill-bill.analysis-copyTextAnalysis.c003', {
    ...params,
    p5: String(pickLabel(f.topKey)),
    p6: String(money(f.topValue)),
  });
}

function periodCopy(f: PeriodCopyFacts): AnalysisCopy {
  const lines = f.kpi.count === 0
    ? [pageLine(f.word), m('skill-bill.analysis-copyTextAnalysis.c004', { p0: String(f.label) })]
    : [pageLine(f.word), periodLine(f)];
  const text = lines.join('\n');
  const json = JSON.stringify({
    version: '1.0', skill: 'bill', shape: 'stat', key: 'bill.analysis.overview',
    data: {
      label: f.label, count: f.kpi.count, expense: f.kpi.expense, income: f.kpi.income, net: f.kpi.net,
      top: f.topKey === null ? null : { key: f.topKey, value: f.topValue },
      lines,
    },
  }, null, 2);
  const rows: ReadonlyArray<readonly [string, string]> = [
    [m('skill-bill.analysis-copyTextAnalysis.c026'), lines[1]], [m('skill-bill.analysis-copyTextAnalysis.c005'), f.label], [m('skill-bill.analysis-copyTextAnalysis.c006'), String(f.kpi.count)],
    [m('skill-bill.analysis-copyTextAnalysis.c007'), money(f.kpi.expense)], [m('skill-bill.analysis-copyTextAnalysis.c008'), money(f.kpi.income)], [m('skill-bill.analysis-copyTextAnalysis.c009'), money(f.kpi.net)],
    [m('skill-bill.analysis-copyTextAnalysis.c010'), f.topKey === null ? MISSING : pickLabel(f.topKey)],
    [m('skill-bill.analysis-copyTextAnalysis.c011'), f.topKey === null ? MISSING : money(f.topValue)],
  ];
  const csv = ['field,value', ...rows.map(([k, v]) => csvCell(k) + ',' + csvCell(v))].join('\n');
  return { text, json, csv };
}

/* ── 看双区间（一行一期＋一行一类） ───────────────────── */

/** 一侧正文（标签＋共N笔支出X收入X；字段名由调用方配，文本行自带「区间一／二」）。 */
function sideBody(s: CopySide): string {
  return m('skill-bill.analysis-copyTextAnalysis.c012', {
    p0: String(s.label),
    p1: String(String(s.count)),
    p2: String(money(s.expense)),
    p3: String(money(s.income)),
  });
}

/** 支出变化行（方向词＋绝对值＋百分比；持平即 0.0%，符号照差值方向）。
 *  #1210：判据位改控制位——原先拿**显示文本** `change === '持平'` 判持平（中文列比中文字面量），
 *  换语言就判歪；持平的控制位是 `diff === 0`，两支同值（`pctText(0)`＝`0.0%`）。 */
function changeLine(change: string, diff: number, pct: number): string {
  const pctTextOf = diff === 0 ? pctText(0) : (diff > 0 ? '+' : diff < 0 ? '-' : '') + pctText(Math.abs(pct));
  return m('skill-bill.analysis-copyTextAnalysis.c013', {
    p0: String(change),
    p1: String(money(Math.abs(diff))),
    p2: String(pctTextOf),
  });
}

/** CSV 行标签：分类名前面那一枚字段名（分类名是数据，只有这个前缀是文案）。 */
function catRowLabel(r: RangeRowCopy): string {
  return m('skill-bill.analysis-copyTextAnalysis.c027', { p0: String(pickLabel(r.key)) });
}

/** 分类差异一行（一类一行：两段读数＋带符号差＋两段笔数）。 */
function catBody(r: RangeRowCopy): string {
  return m('skill-bill.analysis-copyTextAnalysis.c014', {
    p0: String(money(r.a)),
    p1: String(money(r.b)),
    p2: String(signedMoney(r.diff)),
    p3: String(String(r.aCount)),
    p4: String(String(r.bCount)),
  });
}

function rangeCopy(f: RangeCopyFacts): AnalysisCopy {
  const lines = [pageLine(f.word), m('skill-bill.analysis-copyTextAnalysis.c015', { p0: String(sideBody(f.a)) }), m('skill-bill.analysis-copyTextAnalysis.c016', { p0: String(sideBody(f.b)) }), changeLine(f.change, f.diff, f.pct)];
  if (f.rows.length === 0) {
    lines.push(m('skill-bill.analysis-copyTextAnalysis.c017'));
  } else {
    lines.push(m('skill-bill.analysis-copyTextAnalysis.c018', { p0: String(String(f.rows.length)) }));
    for (const r of f.rows) lines.push(pickLabel(r.key) + ' ' + catBody(r));
  }
  const text = lines.join('\n');
  const json = JSON.stringify({
    version: '1.0', skill: 'bill', shape: 'analysis', key: 'bill.analysis.compare',
    data: {
      labelA: f.a.label, labelB: f.b.label,
      a: { count: f.a.count, expense: f.a.expense, income: f.a.income },
      b: { count: f.b.count, expense: f.b.expense, income: f.b.income },
      diff: f.diff, pct: f.pct, change: f.change,
      rows: f.rows.map((r) => ({ key: r.key, a: r.a, b: r.b, diff: r.diff, aCount: r.aCount, bCount: r.bCount })),
      lines,
    },
  }, null, 2);
  const rows: ReadonlyArray<readonly [string, string]> = [
    [m('skill-bill.analysis-copyTextAnalysis.c026'), changeLine(f.change, f.diff, f.pct)], [m('skill-bill.analysis-copyTextAnalysis.c019'), sideBody(f.a)], [m('skill-bill.analysis-copyTextAnalysis.c020'), sideBody(f.b)],
    ...f.rows.map((r) => [catRowLabel(r), catBody(r)] as const),
  ];
  const csv = ['field,value', ...rows.map(([k, v]) => csvCell(k) + ',' + csvCell(v))].join('\n');
  return { text, json, csv };
}

/* ── 看趋势（一行一月） ─────────────────────────────── */

/** 趋势总结行（近N个月共N笔…平均…最高…；空窗与零支出各一句，不硬造峰值）。 */
function trendSummary(f: TrendCopyFacts): string {
  if (f.kpi.count === 0) return m('skill-bill.analysis-copyTextAnalysis.c021', { p0: String(String(f.months)) });
  const peak = f.peak > 0
    ? m('skill-bill.analysis-copyTextAnalysis.c022', { p0: String(f.peakMonth), p1: String(money(f.peak)) })
    : m('skill-bill.analysis-copyTextAnalysis.c023');
  return m('skill-bill.analysis-copyTextAnalysis.c024', {
    p0: String(String(f.months)),
    p1: String(String(f.kpi.count)),
    p2: String(money(f.kpi.expense)),
    p3: String(money(f.kpi.income)),
    p4: String(money(f.avg)),
    p5: String(peak),
  });
}

/** 一月一行（有记录的月才进，空月不出 0 笔行）。 */
function monthBody(p: TrendPointCopy): string {
  return m('skill-bill.analysis-copyTextAnalysis.c025', {
    p0: String(String(p.count)),
    p1: String(money(p.expense)),
    p2: String(money(p.income)),
  });
}

function trendCopy(f: TrendCopyFacts): AnalysisCopy {
  const lines = [pageLine(f.word), trendSummary(f)];
  for (const p of f.points) lines.push(p.month + ' ' + monthBody(p));
  const text = lines.join('\n');
  const json = JSON.stringify({
    version: '1.0', skill: 'bill', shape: 'analysis', key: 'bill.analysis.trend',
    data: {
      months: f.months, count: f.kpi.count, expense: f.kpi.expense, income: f.kpi.income,
      avg: f.avg, peakMonth: f.peakMonth, peak: f.peak,
      rows: f.points.map((p) => ({ month: p.month, count: p.count, expense: p.expense, income: p.income })),
      lines,
    },
  }, null, 2);
  const rows: ReadonlyArray<readonly [string, string]> = [
    [m('skill-bill.analysis-copyTextAnalysis.c026'), trendSummary(f)],
    ...f.points.map((p) => [p.month, monthBody(p)] as const),
  ];
  const csv = ['field,value', ...rows.map(([k, v]) => csvCell(k) + ',' + csvCell(v))].join('\n');
  return { text, json, csv };
}

/** 本门唯一出口：事实进，三份出（同一事实对象，三份数字同源；英文键只进 JSON／CSV 键位）。 */
export function buildAnalysisCopy(facts: AnalysisCopyFacts): AnalysisCopy {
  switch (facts.kind) {
    case 'period': return periodCopy(facts);
    case 'range': return rangeCopy(facts);
    case 'trend': return trendCopy(facts);
  }
}
