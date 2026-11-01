/** #384 · 报告子形态页渲染入口（1 个多态底座 8 个 kind 的薄分派）。
 *
 * 形状依据（编排者裁决 3）：命令层 8 条独立命令、渲染层 1 个多态底座。
 * 本件只做四件事：按 `kind` 选区块、给形态一句结论摘要、给形态一条口径行、交给 `assembleDocPage`
 * 包成完整文档。各形态的区块组装住三个分片（按「同一批改动一起改」切）：
 *   `./reportDocParts.ts`（公共原语＋**页框**）／`./reportDocBmi.ts`（先验件 BMI）／
 *   `./reportDocTracked.ts`（蛋白／水分／TDEE／BMR）／`./reportDocScore.ts`（评分／趋势／对比）。
 *
 * 纪律：样式一律走 `assembleDocPage`（内部＝`buildStyleSheet().css + blocksCss()`，不走 `extraCss`）；
 * 全族颜色字面量为 0（主色取既有令牌 `--blue`，不新增表、不改值）；
 * 不碰老侧 token（`--ink`／`--r-sm`／`--ease` 本仓零命中，只作设计意图参考）。
 *
 * ── #519（场景 10 · 报告族 8 页重排）在本件补了什么 ─────────────────────────────
 * 病根（#516 基准件 §4.2 实测）：报告族 8 页与预测族一样**一处没接**公共层的形状件，
 * 且页框是「逐形态各拼一段字符串」——页内导航／口径行／来源脚注**一条都没有**。
 *
 * 改法**不是**把 8 页各写一份（票面硬指标：多态底座不许拆），而是**在这一个底座上补一套页框**：
 *   ① 三个分片改回 `ReportSection[]`（`id`／导航文案／区块 HTML 同源），底座统一套锚点外壳；
 *   ② 导航由 `navOf(sections)` 派生 ⇒ href 与 id 双向自洽是**结构保证**，不是靠逐页对齐；
 *   ③ 结论条／页头胶囊／口径行／来源脚注四件都住这一处，8 个形态共用同一份；
 *   ④ 题名去 `·`（判据 R1）、区间写「至」（判据 R6）、内部命令原文撤出可见文本（判据 R7）、
 *      页宽走包内既有件 `pageChromeCss(1120)`（J6：1440 档主列 1120／两侧余量各 160 对称）。
 */
import { renderCaliberLine, renderConclusionBar } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { pageChromeCss } from '../render/pageChromeCss.js';
import { buildBmiBlocks } from './reportDocBmi.js';
import { buildCompareBlocks, buildScoreBlocks, buildTrendBlocks } from './reportDocScore.js';
import { buildBmrBlocks, buildTdeeBlocks, buildTrackedBlocks } from './reportDocTracked.js';
import {
  fmt, fmtInt, footerOf, metaLeftOf, navOf, reportChips, sec, sectionsHtml, sourceFootnoteOf,
} from './reportDocParts.js';
import type { ReportSection } from './reportDocParts.js';
import { bmiBandOf } from './reportPlate.js';
import type { ReportKind, ReportPlate } from './reportPlate.js';
import { m } from '../entries/index.js';

/** 形态中文名（页面正文与徽标都用它；取自 HELP 下一级「健康报告」的词面）。
 *  括号一律**全角**（同族先例 #518 W5 §A2：H1 里出现半角括号即红）。 */
export function kindLabels(): Record<ReportKind, string> {
  return {
    bmi: m('skill-calorie.analysis-reportDoc.c012'), tdee: m('skill-calorie.analysis-reportDoc.c013'), bmr: m('skill-calorie.analysis-reportDoc.c014'), protein: m('skill-calorie.analysis-reportDoc.c015'),
    water: m('skill-calorie.analysis-reportDoc.c016'), score: m('skill-calorie.analysis-reportDoc.c017'), trend: m('skill-calorie.analysis-reportDoc.c018'), compare: m('skill-calorie.analysis-reportDoc.c019'),
  };
}

/** 页头胶囊中间那一格（读者语的主题词）：页型与归属词不再拿 `·` 串进题名（#516 §3.2 D01／D02）。 */
function topicOf(kind: ReportKind): string {
  const table: Record<ReportKind, string> = {
    bmi: 'BMI', tdee: m('skill-calorie.analysis-reportDoc.c020'), bmr: m('skill-calorie.analysis-reportDoc.c021'), protein: m('skill-calorie.analysis-reportDoc.c022'),
    water: m('skill-calorie.analysis-reportDoc.c023'), score: m('skill-calorie.analysis-reportDoc.c024'), trend: m('skill-calorie.analysis-reportDoc.c025'), compare: m('skill-calorie.analysis-reportDoc.c026'),
  };
  return table[kind];
}

/** #573 R-61 · 报告族页面侧对齐（8 形态共用底座，只此一行，不碰分片与公共层）。
 *  表卡 `max-width:680px` 不动（归 #567），只把居中归位为左缘对齐（与 KPI 网格左缘共线）；
 *  窄档上限不触发，无变化。 */
function reportAlignCss(): string {
  return '<style>\n/* #573 R-61：报告表左缘归位（页面侧） */\n.ilife-block-page-shell .ilife-block-data-table{margin-left:0;margin-right:auto}\n</style>';
}

/** 缺项清单上屏口径：`missing` 里本用 `、` 连接（判据 R5 的债）⇒ 改空格分隔。 */
const missText = (missing: readonly string[]): string => missing.join(' ');

/** 8 形态总入口：底座 ＋ 命令原文 → 完整文档。
 *
 *  页框的落位（照 #517 缺口样板页的骨架）：页头胶囊 → 结论条 → 页内导航 → 各锚点区块 →
 *  口径行 → 来源脚注 → 复制区（复制区也是一个锚点区块，故也在导航里）。
 *  页头三件由 B 线老 A 壳承担：左格＝区间与天数（`metaLeftOf`），右徽章＝页型一个词「报告」
 *  （#516 §3.2 D04：徽章只写一个词，拿掉 `·` 串），H1＝人话名（`KIND_LABELS`，不带区间）。 */
export function buildReportDoc(plate: ReportPlate, command: string): string {
  const kind = plate.base.kind;
  const label = kindLabels()[kind];
  const sections: ReportSection[] = [
    ...bodyOf(plate),
    sec('sec-data', m('skill-calorie.analysis-reportDoc.c001'), footerOf(plate, label, command)),
  ];
  return assembleDocPage({
    docTitle: m('skill-calorie.analysis-reportDoc.c002', { p0: String(label) }),
    title: label,
    eyebrow: '',
    subtitle: null,
    content: pageChromeCss(1120)
      + reportAlignCss()
      + reportChips(topicOf(kind))
      + renderConclusionBar(conclusionOf(plate))
      + navOf(sections)
      + sectionsHtml(sections)
      + calibersOf(plate).map((line) => renderCaliberLine(line)).join('')
      + sourceFootnoteOf(plate),
    metaLeft: metaLeftOf(plate),
    badge: m('skill-calorie.analysis-reportDoc.c003'),
    summary: null, pageUi: true,
  });
}

/** 结论条那句话（J2／J9 三条恒出之一；`t425-融合基准.md` 裁定 2：结论句紧跟标题）。
 *
 *  **只用页里已有的数**，不引第二个真相源；一句人话、不含任何并列分隔符
 *  （#516 §三：拿 `；`／`·` 把多个语义串成一行的写法一律判债）。 */
function conclusionOf(plate: ReportPlate): string {
  const p = plate.base;
  if (p.kind === 'bmi') {
    const withBmi = plate.bandPoints.filter((x): x is { date: string; kg: number; bmi: number } => x.bmi !== null);
    const last = withBmi[withBmi.length - 1];
    return last === undefined
      ? m('skill-calorie.analysis-reportDoc.c027')
      : m('skill-calorie.analysis-reportDoc.c028', {
        p0: String(last.date),
        p1: String(String(last.bmi)),
        p2: String(bandSentence(plate)),
      });
  }
  if (p.kind === 'tdee') {
    const tdee = p.profile.tdee;
    if (tdee === null) return m('skill-calorie.analysis-reportDoc.c029', { p0: String(missText(p.profile.missing)) });
    const intake = avgCalories(plate);
    if (intake === null) return m('skill-calorie.analysis-reportDoc.c030', { p0: String(fmtInt(tdee)) });
    /* #519 W5（视觉席 D2）：结论句原来印 `+1044.1 卡`、同页 KPI 印 `1044 卡`——同一量两种精度，
     * 那一位小数没有任何信息量（摄入与消耗都是整数语义的量）。结论句按 **KPI 同一档**取整。 */
    const gap = Math.round(tdee - intake);
    return m('skill-calorie.analysis-reportDoc.c031', {
      p0: String(fmtInt(tdee)),
      p1: String(fmtInt(intake)),
      p2: String(gap > 0 ? '+' : ''),
      p3: String(String(gap)),
    });
  }
  if (p.kind === 'bmr') {
    const d = plate.bmrDanger;
    if (d === null) return m('skill-calorie.analysis-reportDoc.c032');
    return d.underDays.length >= 3
      ? m('skill-calorie.analysis-reportDoc.c033', {
        p0: String(String(d.underDays.length)),
        p1: String(fmtInt(d.threshold)),
      })
      : m('skill-calorie.analysis-reportDoc.c034', { p0: String(fmtInt(d.threshold)) });
  }
  if (p.kind === 'protein') return trackedConclusion(plate, m('skill-calorie.analysis-reportDoc.c035'), 'g');
  if (p.kind === 'water') return trackedConclusion(plate, m('skill-calorie.analysis-reportDoc.c036'), 'ml');
  if (p.kind === 'score') {
    const avg = plate.trend === null ? null : plate.trend.lateAvg;
    return avg === null
      ? m('skill-calorie.analysis-reportDoc.c037')
      : m('skill-calorie.analysis-reportDoc.c038', { p0: String(String(avg)) });
  }
  if (p.kind === 'trend') {
    const t = plate.trend;
    /* #625 B团（30-4R）：结论句原复印四卡主值（方向／前段／后段／拐点数），卡上全有；
     * 结论只给方向判定，读数住卡（384 词针经卡标签满足）。 */
    return t === null
      ? m('skill-calorie.analysis-reportDoc.c039')
      : m('skill-calorie.analysis-reportDoc.c040', { p0: String(t.direction) });
  }
  if (p.kind === 'compare') {
    const c = plate.compare;
    return c === null
      ? m('skill-calorie.analysis-reportDoc.c041')
      : m('skill-calorie.analysis-reportDoc.c042', {
        p0: String(c.cur.start),
        p1: String(c.cur.end),
        p2: String(String(p.days)),
        p3: String(c.prev.start),
        p4: String(c.prev.end),
      });
  }
  return m('skill-calorie.analysis-reportDoc.c004');
}


/** BMI 那一页的落在哪一档（分级判据走 `reportPlate.bmiBandOf`，本件只取它的结果，不重写阈值）。 */
function bandSentence(plate: ReportPlate): string {
  const withBmi = plate.bandPoints.filter((x): x is { date: string; kg: number; bmi: number } => x.bmi !== null);
  const last = withBmi[withBmi.length - 1];
  if (last === undefined) return m('skill-calorie.analysis-reportDoc.c005');
  /* #625 B团（24-1R）：身高来源三处（结论括注／身高卡说明／页脚口径行）去结论这一处；
   * 窗口天数住页头左格，结论不重复。 */
  return m('skill-calorie.analysis-reportDoc.c006', { p0: String(bmiBandOf(last.bmi)) });
}

/** 窗口日均摄入（TDEE 页读的那个数；与此前 KPI 卡同源同算法，不另算一份）。 */
function avgCalories(plate: ReportPlate): number | null {
  const acc = plate.base.series.reduce<{ sum: number; n: number }>(
    (a, s) => (s.calories === null ? a : { sum: a.sum + s.calories, n: a.n + 1 }), { sum: 0, n: 0 });
  return acc.n === 0 ? null : Math.round((acc.sum / acc.n) * 10) / 10;
}

/** 蛋白／水分两页同构的结论句（单位随页切；R-39／R-46：两页统一用「达标」）。 */
function trackedConclusion(plate: ReportPlate, name: string, unit: string): string {
  const f = plate.fourPiece;
  if (f === null) return m('skill-calorie.analysis-reportDoc.c007', { p0: String(name) });
  if (f.target === null) {
    return m('skill-calorie.analysis-reportDoc.c008', {
      p0: String(String(f.loggedDays)),
      p1: String(name),
      p2: String(fmt(f.avg, ' ' + unit)),
    });
  }
  return m('skill-calorie.analysis-reportDoc.c009', {
    p0: String(String(f.loggedDays)),
    p1: String(name),
    p2: String(fmt(f.avg, ' ' + unit)),
    p3: String(fmt(f.target, ' ' + unit)),
    p4: String(String(f.hitDays)),
  });
}

/** 口径说明行（J2／J9 三条恒出之一）。
 *
 *  段间用**全角竖线**——`renderCaliberLine` 把它切成逐段 `<span>`、改由版式出细竖线，
 *  产物文本里不再有该字符（#516 判据 R4）。人话里不写全角加号（它在并列分隔符集里），写「加」。
 *  与各页「口径说明」小表**不重复**：小表管算式与入参，这几行管读者看不懂的那几条判定口径。 */
function calibersOf(plate: ReportPlate): string[] {
  const p = plate.base;
  /* #519 W5（视觉席 D1）：BMI 那条原是一行（三段），在 1440／390 都会折行，段间的 hairline
   * 分隔在折行处看不出来。拆成两条短行——每行都读得完整句，分隔也都在行内可见（同页
   * 另有来源脚注那条口径行，J2／J9 的「≥1 条口径行」不受影响）。 */
  if (p.kind === 'bmi') {
    return [
      m('skill-calorie.analysis-reportDoc.c043'),
      m('skill-calorie.analysis-reportDoc.c044'),
    ];
  }
  /* #620 增量3a：`Mifflin-St Jeor` 之名由口径行第一段承担（384 钉住它），
   * `sec-caliber计算口径` kvTable 的 `公式`／`缺口口径`两通用行已删（见 `reportDocTracked.ts`），
   * 表里只留带本页取值的行。 */
  if (p.kind === 'tdee') {
    return [m('skill-calorie.analysis-reportDoc.c045')];
  }
  /* R-43：判据细则只住口径表，页脚只留算式与指引（两处不互为子串；保留竖线分段）。
   * #625 B团（26-4R）：`四项` 与别处 `四要素` 混用，统一为四要素。 */
  if (p.kind === 'bmr') {
    return [m('skill-calorie.analysis-reportDoc.c046')];
  }
  if (p.kind === 'protein' || p.kind === 'water') {
    /* #620 增量3c：`目标取目标设置里那一项` 与目标卡说明 `来自目标设置` 同一事实两处，
     * 来源只住口径行（卡上那句已删）；`没有设目标时不判达标` 在已设目标时是永不触发的条件句，
     * 只在未设目标时出现（两段不断 span 结构）。 */
    const noGoal = plate.fourPiece === null || plate.fourPiece.target === null;
    return noGoal
      ? [m('skill-calorie.analysis-reportDoc.c047'), m('skill-calorie.analysis-reportDoc.c048')]
      : [m('skill-calorie.analysis-reportDoc.c049')];
  }
  /* #625 B团（29-2R 收口＋29-6R）：表头数是后段均值，页脚公式须同口径
   * （原全段口径实算 69.4 与 68.4 并存无对账）；`不另算第二套权重` 内口吻删除。
   * 注：两公式仍在同一行——J1 影子判据要求页上至少一条口径行落成 span 分段，
   * 单段行不产 span；本行两段都短，1440 档一行可读。 */
  if (p.kind === 'score') {
    return [
      m('skill-calorie.analysis-reportDoc.c050'),
    ];
  }
  /* #620 增量6：前段／后段取的是有评分记录的日子（缺记录日不参与），不是窗口天数；
   * 点名口径，卡面 70.1／69.3 按可评分序列复现时才对得上（30-1）。 */
  if (p.kind === 'trend') {
    return [m('skill-calorie.analysis-reportDoc.c051')];
  }
  /* #620 增量3a：原第一条（变化量／对比期）与 `sec-caliber口径说明` kvTable 的
   * `对比期怎么取`／`变化量 Δ` 两行同义重复，删口径行这一条留表；
   * 原第二条（日均总消耗两期同源，D-13）与 kvTable `日均总消耗怎么算` 那一行同义，
   * 那一行随本增量一并删除（见 `reportDocScore.ts`），此处保留这一条。
   * #625 B团（31-10R）：`四要素` 一词无定义行，括号内点名四个要素（逗号枚举，非并列串）。
   * 拆成两段（同一事实不断成两处，只是落成两个 span，J1 影子判据要求口径行有 span 分段）。 */
  if (p.kind === 'compare') {
    return [
      m('skill-calorie.analysis-reportDoc.c052'),
    ];
  }
  return [];
}


function bodyOf(plate: ReportPlate): ReportSection[] {
  switch (plate.base.kind) {
    case 'bmi': return buildBmiBlocks(plate);
    case 'protein': case 'water': return buildTrackedBlocks(plate);
    case 'tdee': return buildTdeeBlocks(plate);
    case 'bmr': return buildBmrBlocks(plate);
    case 'score': return buildScoreBlocks(plate);
    case 'trend': return buildTrendBlocks(plate);
    case 'compare': return buildCompareBlocks(plate);
    default:
      return [sec('sec-note', m('skill-calorie.analysis-reportDoc.c010'), renderCaliberLine(m('skill-calorie.analysis-reportDoc.c011', { p0: String(String(plate.base.kind)) })))];
  }
}
