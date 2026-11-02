/** #384 · 报告子形态页渲染·目标追踪族（蛋白／水分同构 ＋ TDEE ＋ BMR）。
 *
 * 形状依据（编排者裁决 3）：命令层 8 条独立命令、渲染层 1 个多态底座；本件是底座的
 * 第二个分片（首个＝`./reportDoc.ts` 的 BMI，评分／趋势／对比族＝`./reportDocScore.ts`）。
 *
 * 照搬的老侧文案契约：
 * - 蛋白／水分同构＝`markLine` 目标线 ＋「日均／目标／达标天数／达标率」四件套
 *   （老侧 `health_report.html:229-258`）；
 * - TDEE ＝ 4 KPI（总消耗／日均摄入／静态缺口／计算假设）＋ `Mifflin-St Jeor` 口径，
 *   老侧此处**无图**（清单「缺口 6」）——新侧补「总消耗随体重变化」曲线；
 * - BMR ＝ 危险信号段（低于基础代谢 ≥3 天告警 ＋ 危险日期表，老侧 `health_report.html:216-228`）
 *   ＋ 摄入折线对照基础代谢水平线。
 *
 * 纪律：颜色字面量 0（走 `base-paint` 令牌）；不碰公共层契约。
 *
 * ── #519 在本件改了什么（W2） ─────────────────────────────────────────────────
 * ① 四个装配件改回 `ReportSection[]`（`id`／导航文案／区块 HTML 同源，导航由底座派生，J8）；
 * ② 判据 R5 销账：`missing` 缺项清单原先用 `、` 连接上屏（`（缺：身高、年龄）`）⇒ 改空格分隔；
 * ③ 判据 R3 销账：口径表里「身高 / 年龄 / 性别」拿斜杠把三件事串成一格 ⇒ 拆成**一条一行**
 *    （#516 §3.2 D09：身份类并列拆成键值行）——这是同一个 `kvTable` 的调用口径变了，不是新形状；
 * ④ 徽章列：蛋白／水分页在逐日表下补一行达标／未达标的天数（与表内「是否达标」那一列同源同算，
 *    同族先例＝缺口页的 `deficitStatusChips`），BMR 页在概览下补一行低于基础代谢的天数。
 */
import { renderChips, renderDataTable, renderEmptyBlock, renderKpiGrid } from 'base-paint/blocks';
import { fmt, fmtInt, foldedTable, kvTable, lineOf, sec, tableOf } from './reportDocParts.js';
import type { ReportSection } from './reportDocParts.js';
/* #717 批④：BMR 算式只读共用位那一份（本件原写 10*w + 6.25*h - 5*a + sign）。 */
import { mifflinStJeorBmr } from './utils.js';
import type { ReportPlate } from './reportPlate.js';
import { m } from '../entries/index.js';

/** 缺项清单上屏口径：本用 `、` 连接（判据 R5 的债）⇒ 空格分隔（同一个 `missing` 数组，不另算一份）。 */
const missText = (missing: readonly string[]): string => missing.join(' ');

/** 窗口内最后一次称重（与对比页 `#384f` 同源口径；缺即 null，不编数）。 */
function lastWeightOf(plate: ReportPlate): number | null {
  return plate.base.series.reduce<number | null>((acc, s) => (s.weightKg === null ? acc : s.weightKg), null);
}

/** 目标追踪族（蛋白／水分）：两页同构，只换单位与目标源。
 *  R-39／R-46：两页统一用「达标」（蛋白／水分同词），不再各叫各的。 */
export function buildTrackedBlocks(plate: ReportPlate): ReportSection[] {
  const f = plate.fourPiece;
  const isProtein = plate.base.kind === 'protein';
  const which = isProtein
    ? { unit: 'g', label: m('skill-calorie.analysis-reportDocTracked.c001'), line: m('skill-calorie.analysis-reportDocTracked.c002'), value: m('skill-calorie.analysis-reportDocTracked.c003'), rate: m('skill-calorie.analysis-reportDocTracked.c004'), hitWord: m('skill-calorie.analysis-reportDocTracked.c005') }
    : { unit: 'ml', label: m('skill-calorie.analysis-reportDocTracked.c006'), line: m('skill-calorie.analysis-reportDocTracked.c007'), value: m('skill-calorie.analysis-reportDocTracked.c008'), rate: m('skill-calorie.analysis-reportDocTracked.c009'), hitWord: m('skill-calorie.analysis-reportDocTracked.c010') };
  if (f === null) {
    return [sec('sec-overview', m('skill-calorie.analysis-reportDocTracked.c011'), renderEmptyBlock({
      title: which.line,
      text: m('skill-calorie.analysis-reportDocTracked.c012', { p0: String(which.label) }),
    }))];
  }
  const rateDetail = f.hitRate === null
    ? m('skill-calorie.analysis-reportDocTracked.c013', { p0: String(which.label) })
    /* #625 B团（27/28 达标率精度差，与 29-3 同档：整数补 `.0`）。 */
    : m('skill-calorie.analysis-reportDocTracked.c014', {
      p0: String(f.hitRate.toFixed(1)),
      p1: String(f.loggedDays),
    });
  const missed = f.target === null ? 0 : f.loggedDays - f.hitDays;
  return [
    sec('sec-overview', m('skill-calorie.analysis-reportDocTracked.c016'), renderKpiGrid([
      { label: m('skill-calorie.analysis-reportDocTracked.c017', { p0: String(which.label) }), value: fmt(f.avg), unit: which.unit, detail: m('skill-calorie.analysis-reportDocTracked.c018', { p0: String(f.loggedDays) }) },
      /* #620 增量3c：`来自目标设置` 与口径行 `目标取目标设置里那一项` 同一事实两处，
       * 来源只住口径行；卡上只留 `未设目标` 这一态（空串是既有形态，见评分族弱项卡）。 */
      { label: m('skill-calorie.analysis-reportDocTracked.c019'), value: fmt(f.target), unit: f.target === null ? '' : which.unit, detail: f.target === null ? m('skill-calorie.analysis-reportDocTracked.c020') : '' },
      /* R-45：达标天数与达标率是同一事实两卡 ⇒ 合并进一卡（值位达标天数，说明带达标率），空出的一卡给有记录天数。 */
      { label: m('skill-calorie.analysis-reportDocTracked.c021', { p0: String(which.hitWord) }), value: String(f.hitDays), unit: m('skill-calorie.analysis-reportDocTracked.c022'), detail: f.target === null ? m('skill-calorie.analysis-reportDocTracked.c023') : rateDetail },
      { label: m('skill-calorie.analysis-reportDocTracked.c024'), value: String(f.loggedDays), unit: m('skill-calorie.analysis-reportDocTracked.c025'), detail: m('skill-calorie.analysis-reportDocTracked.c026', { p0: String(plate.base.days) }) },
    ])),
    sec('sec-chart', which.line, lineOf(plate.points, m('skill-calorie.analysis-reportDocTracked.c027', { p0: String(which.line) }), { target: plate.target })),
    sec('sec-detail', m('skill-calorie.analysis-reportDocTracked.c028'),
      tableOf(plate.points, which.value, which.line, [
        {
          label: m('skill-calorie.analysis-reportDocTracked.c029', { p0: String(which.hitWord) }),
          values: plate.points.map((p) => (plate.target === null || p.value === null ? null : (p.value >= plate.target ? which.hitWord : m('skill-calorie.analysis-reportDocTracked.c030', { p0: String(which.hitWord) })))),
        },
      ])
      /* 徽章列（#516 §3.1）：与上表「是否达标」那一列同源同算——表内逐日文字仍是逐日的，
       * 这一行给的是「整窗口达标几天、差几天」这一类扫一眼就够的并列读数。 */
      + (f.target === null ? '' : renderChips({
        items: [{ text: m('skill-calorie.analysis-reportDocTracked.c031', {
          p0: String(which.hitWord),
          p1: String(String(f.hitDays)),
        }) }, { text: m('skill-calorie.analysis-reportDocTracked.c032', {
          p0: String(which.hitWord),
          p1: String(String(missed)),
        }) }],
      }))),
  ];
}

/** TDEE 形态：4 KPI ＋ 总消耗随体重变化曲线（老侧无图，新侧补齐）。 */
export function buildTdeeBlocks(plate: ReportPlate): ReportSection[] {
  const p = plate.base.profile;
  /* 口径行尾注：缺项一次算好再拼进整句（与 BMR 卡同一形态，不各算一遍）。 */
  const missSuffix = p.missing.length === 0
    ? ''
    : m('skill-calorie.analysis-reportDocTracked.c062', { p0: String(missText(p.missing)) });
  const intake = avgIntakeOf(plate);
  const tdee = p.tdee;
  const gap = tdee === null || intake === null ? null : Math.round((tdee - intake) * 10) / 10;
  return [
    sec('sec-overview', m('skill-calorie.analysis-reportDocTracked.c033'), renderKpiGrid([
      { label: m('skill-calorie.analysis-reportDocTracked.c034'), value: fmtInt(tdee), unit: m('skill-calorie.analysis-reportDocTracked.c035'), detail: m('skill-calorie.analysis-reportDocTracked.c036') },
      { label: m('skill-calorie.analysis-reportDocTracked.c037'), value: fmtInt(intake), unit: m('skill-calorie.analysis-reportDocTracked.c038'), detail: m('skill-calorie.analysis-reportDocTracked.c039', {
        p0: String(plate.base.days),
        p1: String(loggedDaysOf(plate)),
      }) },
      {
        label: m('skill-calorie.analysis-reportDocTracked.c040'), value: fmtInt(gap), unit: m('skill-calorie.analysis-reportDocTracked.c041'),
        /* #620 增量3b：`（在缺口）`三字与同卡徽标 `在缺口` 逐字重复，说明只留事实半句。 */
        detail: gap === null ? m('skill-calorie.analysis-reportDocTracked.c042') : (gap > 0 ? m('skill-calorie.analysis-reportDocTracked.c043') : m('skill-calorie.analysis-reportDocTracked.c044')),
        /* R-42：徽标写领域词，不用默认成功／警告。 */
        ...(gap === null ? {} : { status: gap > 0 ? 'ok' as const : 'warn' as const, statusText: gap > 0 ? m('skill-calorie.analysis-reportDocTracked.c045') : m('skill-calorie.analysis-reportDocTracked.c046') }),
      },
      {
        label: m('skill-calorie.analysis-reportDocTracked.c047'), value: p.activityFactor === null ? '—' : String(p.activityFactor),
        detail: m('skill-calorie.analysis-reportDocTracked.c048', { p0: String(p.activityLabel) }),
      },
    ])),
    sec('sec-caliber', m('skill-calorie.analysis-reportDocTracked.c049'), kvTable(m('skill-calorie.analysis-reportDocTracked.c050', { p0: String(missSuffix) }), [
      /* #620 增量3a：`公式`／`缺口口径`两行是通用定义，与底座口径行三段同义重复
       * （且 `Mifflin-St Jeor` 之名由口径行第一段承担，384 钉住它）；
       * 删表里这两行留口径行，表里只留带本页取值的行（基础代谢／活动系数／身高／年龄／性别）。 */
      { k: m('skill-calorie.analysis-reportDocTracked.c051'), v: fmtInt(p.bmr, m('skill-calorie.analysis-reportDocTracked.c052')) },
      { k: m('skill-calorie.analysis-reportDocTracked.c053'), v: p.activityFactor === null ? '—' : String(p.activityFactor) + '（' + p.activityLabel + '）' },
      { k: m('skill-calorie.analysis-reportDocTracked.c054'), v: fmt(p.heightCm, ' cm') },
      { k: m('skill-calorie.analysis-reportDocTracked.c055'), v: fmt(p.age, m('skill-calorie.analysis-reportDocTracked.c056')) },
      { k: m('skill-calorie.analysis-reportDocTracked.c057'), v: p.genderLabel },
    ])),
    sec('sec-chart', m('skill-calorie.analysis-reportDocTracked.c058'), tdeeCurve(plate)),
  ];
}

/** 窗口日均摄入（KPI 卡与底座结论句同源：只此一份算式）。 */
function avgIntakeOf(plate: ReportPlate): number | null {
  const acc = plate.base.series.reduce<{ sum: number; n: number }>(
    (a, s) => (s.calories === null ? a : { sum: a.sum + s.calories, n: a.n + 1 }), { sum: 0, n: 0 });
  return acc.n === 0 ? null : Math.round((acc.sum / acc.n) * 10) / 10;
}

/** 窗口里有摄入记录的天数（与上一条同源：同一个 `series`，不另查一次库）。 */
function loggedDaysOf(plate: ReportPlate): number {
  return plate.base.series.filter((s) => s.calories !== null).length;
}

/** 总消耗随体重变化：逐日体重 × 档案四要素 → 当日 BMR → × 系数（缺项即断点，不编数）。 */
function tdeeCurve(plate: ReportPlate): string {
  const p = plate.base.profile;
  if (p.heightCm === null || p.age === null || p.activityFactor === null || p.gender === null) {
    return renderEmptyBlock({
      title: m('skill-calorie.analysis-reportDocTracked.c059'),
      text: m('skill-calorie.analysis-reportDocTracked.c060', { p0: String(missText(p.missing)) }),
    });
  }
  const points = plate.base.series.map((s) => ({
    date: s.date,
    value: s.weightKg === null ? null
      : Math.round(mifflinStJeorBmr(s.weightKg, p.heightCm, p.age, p.gender) * (p.activityFactor as number)),
  }));
  return lineOf(points, m('skill-calorie.analysis-reportDocTracked.c061'), { format: (v) => String(Math.round(v)) });
}

/** BMR 形态：基础代谢与低于基础代谢天数 ＋ 危险日期表（老侧生理安全护栏，原样搬）。 */
export function buildBmrBlocks(plate: ReportPlate): ReportSection[] {
  const p = plate.base.profile;
  const d = plate.bmrDanger;
  const under = d === null ? [] : d.underDays;
  const th = d === null ? null : d.threshold;
  const danger = under.length >= 3;
  const missSuffix = p.missing.length === 0 ? '' : m('skill-calorie.analysis-reportDocTracked.c062', { p0: String(missText(p.missing)) });
  const thText = fmtInt(th, m('skill-calorie.analysis-reportDocTracked.c063'));
  const genderClause = p.gender === 'male' ? m('skill-calorie.analysis-reportDocTracked.c064') : m('skill-calorie.analysis-reportDocTracked.c065');
  return [
    sec('sec-overview', m('skill-calorie.analysis-reportDocTracked.c066'), renderKpiGrid([
      { label: m('skill-calorie.analysis-reportDocTracked.c067'), value: fmtInt(p.bmr), unit: m('skill-calorie.analysis-reportDocTracked.c068'), detail: m('skill-calorie.analysis-reportDocTracked.c069') },
      { label: m('skill-calorie.analysis-reportDocTracked.c070'), value: fmtInt(p.tdee), unit: m('skill-calorie.analysis-reportDocTracked.c071'), detail: m('skill-calorie.analysis-reportDocTracked.c072', {
        p0: String(p.activityFactor === null ? '—' : String(p.activityFactor)),
      }) },
      {
        label: m('skill-calorie.analysis-reportDocTracked.c073'), value: String(under.length), unit: m('skill-calorie.analysis-reportDocTracked.c074'),
        detail: under.length === 0 ? m('skill-calorie.analysis-reportDocTracked.c075') : m('skill-calorie.analysis-reportDocTracked.c076', { p0: String(thText) }),
        /* R-42：徽标写领域词＋天数，不用默认失败／警告。 */
        ...(under.length === 0 ? {} : { status: (danger ? 'danger' : 'warn') as 'danger' | 'warn', statusText: m('skill-calorie.analysis-reportDocTracked.c077', { p0: String(String(under.length)) }) }),
      },
      { label: m('skill-calorie.analysis-reportDocTracked.c078'), value: String(plate.points.filter((x) => x.value !== null).length - under.length), unit: m('skill-calorie.analysis-reportDocTracked.c079'), detail: m('skill-calorie.analysis-reportDocTracked.c080', { p0: String(plate.base.days) }) },
    ])),
    sec('sec-danger', m('skill-calorie.analysis-reportDocTracked.c081'), danger
      ? renderDataTable({
        columns: [{ key: 't', label: m('skill-calorie.analysis-reportDocTracked.c082') }],
        /* #519 W5（视觉席 D3）：这一格原来把「N 天低于 X 卡」整句又印一遍，与页顶结论行、
         * 「低于基础代谢」KPI 卡**同一事实写三遍**。改法：正文只留**该怎么办**，
         * 天数与阈值各留在它自己的那一处（结论行讲事实、KPI 卡讲读数）——同一事实一页一处。 */
        rows: [{ t: m('skill-calorie.analysis-reportDocTracked.c083') }],
        /* #620 增量3b：`（3 天及以上即告警）` 与口径表 `危险信号判据` 行同规则，
         * 判据细则只住口径表（R-43），标题只留主题。 */
        caption: m('skill-calorie.analysis-reportDocTracked.c084'),
      })
      : renderEmptyBlock({
        title: m('skill-calorie.analysis-reportDocTracked.c085'),
        text: m('skill-calorie.analysis-reportDocTracked.c086'),
      })),
    sec('sec-chart', m('skill-calorie.analysis-reportDocTracked.c087'), lineOf(plate.points, m('skill-calorie.analysis-reportDocTracked.c088', { p0: String(thText) }), { target: th })),
    sec('sec-days', m('skill-calorie.analysis-reportDocTracked.c089'), foldedTable({
      columns: [
        { key: 'date', label: m('skill-calorie.analysis-reportDocTracked.c090') },
        { key: 'cal', label: m('skill-calorie.analysis-reportDocTracked.c091'), align: 'right' },
        /* #625 B团（26-6R）：差值列行行重复 `卡`，单位收进表头；数值列保持右对齐。 */
        { key: 'gap', label: m('skill-calorie.analysis-reportDocTracked.c092'), align: 'right' },
      ],
      rows: under.map((u) => ({ date: u.date, cal: u.calories, gap: th === null ? null : Math.round(u.calories - th) })),
      caption: m('skill-calorie.analysis-reportDocTracked.c093'),
      emptyText: m('skill-calorie.analysis-reportDocTracked.c094'),
    })),
    sec('sec-caliber', m('skill-calorie.analysis-reportDocTracked.c095'), kvTable(m('skill-calorie.analysis-reportDocTracked.c096', { p0: String(missSuffix) }), [
      /* #625 B团（26-5R）：公式行 `×` 与加减汉字混排，统一汉字运算符。 */
      { k: m('skill-calorie.analysis-reportDocTracked.c097'), v: m('skill-calorie.analysis-reportDocTracked.c098', { p0: String(genderClause) }) },
      { k: m('skill-calorie.analysis-reportDocTracked.c099'), v: fmt(p.heightCm, ' cm') },
      { k: m('skill-calorie.analysis-reportDocTracked.c100'), v: fmt(p.age, m('skill-calorie.analysis-reportDocTracked.c101')) },
      { k: m('skill-calorie.analysis-reportDocTracked.c102'), v: p.genderLabel },
      /* #625 B团（26-4R）：算式用体重，表里却无体重行——补窗口内最后一次称重（与对比页同源口径）。 */
      { k: m('skill-calorie.analysis-reportDocTracked.c103'), v: lastWeightOf(plate) === null ? '—' : m('skill-calorie.analysis-reportDocTracked.c104', { p0: String(fmt(lastWeightOf(plate), ' kg')) }) },
      { k: m('skill-calorie.analysis-reportDocTracked.c105'), v: p.activityLabel + (p.activityFactor === null ? '' : m('skill-calorie.analysis-reportDocTracked.c106', { p0: String(String(p.activityFactor)) })) },
      { k: m('skill-calorie.analysis-reportDocTracked.c107'), v: m('skill-calorie.analysis-reportDocTracked.c108') },
    ])),
  ];
}
