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

/** 形态中文名（页面正文与徽标都用它；取自 HELP 下一级「健康报告」的词面）。
 *  括号一律**全角**（同族先例 #518 W5 §A2：H1 里出现半角括号即红）。 */
export const KIND_LABELS: Record<ReportKind, string> = {
  bmi: 'BMI 报告', tdee: 'TDEE 报告', bmr: 'BMR 报告', protein: '蛋白质摄入报告',
  water: '水分摄入报告', score: '综合评分', trend: '健康趋势', compare: '健康报告（含对比）',
};

/** 页头胶囊中间那一格（读者语的主题词）：页型与归属词不再拿 `·` 串进题名（#516 §3.2 D01／D02）。 */
const TOPIC_OF: Record<ReportKind, string> = {
  bmi: 'BMI', tdee: '每日总消耗', bmr: '基础代谢', protein: '蛋白质摄入',
  water: '水分摄入', score: '综合评分', trend: '健康趋势', compare: '两期对比',
};

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
  const label = KIND_LABELS[kind];
  const sections: ReportSection[] = [
    ...bodyOf(plate),
    sec('sec-data', '数据与日志', footerOf(plate, label, command)),
  ];
  return assembleDocPage({
    docTitle: '卡路里 ' + label,
    title: label,
    eyebrow: '',
    subtitle: null,
    content: pageChromeCss(1120)
      + reportAlignCss()
      + reportChips(TOPIC_OF[kind])
      + renderConclusionBar(conclusionOf(plate))
      + navOf(sections)
      + sectionsHtml(sections)
      + calibersOf(plate).map((line) => renderCaliberLine(line)).join('')
      + sourceFootnoteOf(plate),
    metaLeft: metaLeftOf(plate),
    badge: '报告',
    summary: null,
  });
}

/** 结论条那句话（J2／J9 三条恒出之一；`t425-融合基准.md` 裁定 2：结论句紧跟标题）。
 *
 *  **只用页里已有的数**，不引第二个真相源；一句人话、不含任何并列分隔符
 *  （#516 §三：拿 `；`／`·` 把多个语义串成一行的写法一律判债）。 */
function conclusionOf(plate: ReportPlate): string {
  const p = plate.base;
  switch (p.kind) {
    case 'bmi': {
      const withBmi = plate.bandPoints.filter((x): x is { date: string; kg: number; bmi: number } => x.bmi !== null);
      const last = withBmi[withBmi.length - 1];
      return last === undefined
        ? '这段时间没有可算 BMI 的称重记录'
        : '最近一次称重是 ' + last.date + '，BMI ' + String(last.bmi) + '，' + bandSentence(plate);
    }
    case 'tdee': {
      const tdee = p.profile.tdee;
      if (tdee === null) return '档案四要素不全，出不了每日总消耗（缺：' + missText(p.profile.missing) + '）';
      const intake = avgCalories(plate);
      if (intake === null) return '每日总消耗约 ' + fmtInt(tdee) + ' 卡，窗口里没有可算的摄入记录';
      /* #519 W5（视觉席 D2）：结论句原来印 `+1044.1 卡`、同页 KPI 印 `1044 卡`——同一量两种精度，
       * 那一位小数没有任何信息量（摄入与消耗都是整数语义的量）。结论句按 **KPI 同一档**取整。 */
      const gap = Math.round(tdee - intake);
      return '每日总消耗约 ' + fmtInt(tdee) + ' 卡，日均摄入 ' + fmtInt(intake) + ' 卡，静态缺口 '
        + (gap > 0 ? '+' : '') + String(gap) + ' 卡';
    }
    case 'bmr': {
      const d = plate.bmrDanger;
      if (d === null) return '档案四要素不全，算不了基础代谢';
      return d.underDays.length >= 3
        ? '窗口里有 ' + String(d.underDays.length) + ' 天摄入低于基础代谢 ' + fmtInt(d.threshold) + ' 卡，长期如此会压低基础代谢'
        : '窗口里没有低于基础代谢的日子（基础代谢 ' + fmtInt(d.threshold) + ' 卡）';
    }
    case 'protein': return trackedConclusion(plate, '蛋白', 'g');
    case 'water': return trackedConclusion(plate, '饮水', 'ml');
    case 'score': {
      const avg = plate.trend === null ? null : plate.trend.lateAvg;
      return avg === null
        ? '这段时间算不出综合评分'
        : '综合评分 ' + String(avg) + ' 分（满分 100，六因素等距折算）';
    }
    case 'trend': {
      const t = plate.trend;
      return t === null
        ? '这段时间算不出变化方向'
        : '变化方向 ' + t.direction + '，前段均分 ' + fmt(t.earlyAvg) + ' 到后段均分 ' + fmt(t.lateAvg)
          + '，序列里有 ' + String(t.turns) + ' 个拐点';
    }
    case 'compare': {
      const c = plate.compare;
      return c === null
        ? '这个窗口取不到可对比的两期数据'
        : '本期 ' + c.cur.start + ' 至 ' + c.cur.end + '，对比期是本窗口之前同样长的 '
          + String(p.days) + ' 天（' + c.prev.start + ' 至 ' + c.prev.end + '）';
    }
    default: return '未知报告形态';
  }
}

/** BMI 那一页的落在哪一档（分级判据走 `reportPlate.bmiBandOf`，本件只取它的结果，不重写阈值）。 */
function bandSentence(plate: ReportPlate): string {
  const withBmi = plate.bandPoints.filter((x): x is { date: string; kg: number; bmi: number } => x.bmi !== null);
  const last = withBmi[withBmi.length - 1];
  if (last === undefined) return '还没有分档';
  return '落在' + bmiBandOf(last.bmi) + '区间（身高取档案里那一个值，'
    + String(plate.base.days) + ' 天窗口内不变）';
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
  if (f === null) return '这段时间没有' + name + '记录';
  if (f.target === null) {
    return String(f.loggedDays) + ' 天有' + name + '记录，日均 ' + fmt(f.avg, ' ' + unit) + '，还没有设目标（先去定目标）';
  }
  return String(f.loggedDays) + ' 天有' + name + '记录，日均 ' + fmt(f.avg, ' ' + unit)
    + '，目标 ' + fmt(f.target, ' ' + unit) + '，达标 ' + String(f.hitDays) + ' 天';
}

/** 口径说明行（J2／J9 三条恒出之一）。
 *
 *  段间用**全角竖线**——`renderCaliberLine` 把它切成逐段 `<span>`、改由版式出细竖线，
 *  产物文本里不再有该字符（#516 判据 R4）。人话里不写全角加号（它在并列分隔符集里），写「加」。
 *  与各页「口径说明」小表**不重复**：小表管算式与入参，这几行管读者看不懂的那几条判定口径。 */
function calibersOf(plate: ReportPlate): string[] {
  const p = plate.base;
  switch (p.kind) {
    case 'bmi':
      /* #519 W5（视觉席 D1）：原先是一条长行（三段），在 1440／390 都会折行，段间的 hairline
       * 分隔在折行处看不出来。拆成两条短行——每行都读得完整句，分隔也都在行内可见（同页
       * 另有来源脚注那条口径行，J2／J9 的「≥1 条口径行」不受影响）。 */
      return [
        'BMI＝体重（kg）÷ 身高（m）的平方｜身高取档案里那一个值',
        '窗口里没有称重的日子不参与均值',
      ];
    case 'tdee':
      /* #620 增量3a：`Mifflin-St Jeor` 之名由口径行第一段承担（384 钉住它），
       * `sec-caliber计算口径` kvTable 的 `公式`／`缺口口径`两通用行已删（见 `reportDocTracked.ts`），
       * 表里只留带本页取值的行。 */
      return ['总消耗＝基础代谢（Mifflin-St Jeor）× 活动系数｜系数取档案里的活动量档位｜静态缺口＝每日总消耗减日均摄入，运动消耗另计'];
    case 'bmr':
      /* R-43：判据细则只住口径表，页脚只留算式与指引（两处不互为子串；保留竖线分段）。 */
      return ['基础代谢按 Mifflin-St Jeor 算式｜四项齐备才算，危险信号见上方判据表'];
    case 'protein':
    case 'water': {
      /* #620 增量3c：`目标取目标设置里那一项` 与目标卡说明 `来自目标设置` 同一事实两处，
       * 来源只住口径行（卡上那句已删）；`没有设目标时不判达标` 在已设目标时是永不触发的条件句，
       * 只在未设目标时出现（两段不断 span 结构）。 */
      const noGoal = plate.fourPiece === null || plate.fourPiece.target === null;
      return noGoal
        ? ['达标判定＝当天记录值达到目标值｜目标取目标设置里那一项', '没有设目标时不判达标']
        : ['达标判定＝当天记录值达到目标值｜目标取目标设置里那一项'];
    }
    case 'score':
      return ['分项命中率＝该项命中天数 ÷ 有记录天数｜综合评分＝六因素命中数与项数之比折算成 0–100 分，不另算第二套权重'];
    case 'trend':
      return ['前段与后段＝把窗口按天三等分后取首段与末段｜变化量超过 1 分才算上升或下降，其余记平稳'];
    case 'compare':
      /* #620 增量3a：原第一条（变化量／对比期）与 `sec-caliber口径说明` kvTable 的
       * `对比期怎么取`／`变化量 Δ` 两行同义重复，删口径行这一条留表；
       * 原第二条（日均总消耗两期同源，D-13）与 kvTable `日均总消耗怎么算` 那一行同义，
       * 那一行随本增量一并删除（见 `reportDocScore.ts`），此处保留这一条。
       * 拆成两段（同一事实不断成两处，只是落成两个 span，J1 影子判据要求口径行有 span 分段）。 */
      return [
        '日均总消耗两期同源｜都按档案四要素加该期窗口内最后一次称重算，体重有变这一行就会变',
      ];
    default:
      return [];
  }
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
      return [sec('sec-note', '说明', renderCaliberLine('未知报告形态：' + String(plate.base.kind)))];
  }
}
