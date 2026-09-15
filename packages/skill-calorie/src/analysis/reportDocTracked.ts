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
import { fmt, fmtInt, kvTable, lineOf, sec, tableOf } from './reportDocParts.js';
import type { ReportSection } from './reportDocParts.js';
import type { ReportPlate } from './reportPlate.js';

/** 缺项清单上屏口径：本用 `、` 连接（判据 R5 的债）⇒ 空格分隔（同一个 `missing` 数组，不另算一份）。 */
const missText = (missing: readonly string[]): string => missing.join(' ');

/** 目标追踪族（蛋白／水分）：两页同构，只换单位与目标源。
 *  达标率／达成率两个词是两张页原本的叫法（蛋白＝达标率、水分＝达成率），不合并成一个词。 */
export function buildTrackedBlocks(plate: ReportPlate): ReportSection[] {
  const f = plate.fourPiece;
  const isProtein = plate.base.kind === 'protein';
  const which = isProtein
    ? { unit: 'g', label: '蛋白', line: '每日蛋白量', value: '蛋白g', rate: '达标率', hitWord: '达标' }
    : { unit: 'ml', label: '饮水', line: '每日饮水量', value: '饮水ml', rate: '达成率', hitWord: '达成' };
  if (f === null) {
    return [sec('sec-overview', '概览', renderEmptyBlock({
      title: which.line,
      text: '这段窗口里没有' + which.label + '记录，先记一次再来看',
    }))];
  }
  const rate = f.hitRate === null
    ? { label: which.rate, value: '—', unit: '', detail: '还没有设' + which.label + '目标（先去定目标）' }
    : { label: which.rate, value: String(f.hitRate), unit: '%', detail: f.hitDays + ' / ' + f.loggedDays + ' 天' + which.hitWord };
  const missed = f.target === null ? 0 : f.loggedDays - f.hitDays;
  return [
    sec('sec-overview', '概览', renderKpiGrid([
      { label: '日均' + which.label, value: fmt(f.avg), unit: which.unit, detail: '有记录 ' + f.loggedDays + ' 天' },
      { label: '目标', value: fmt(f.target), unit: f.target === null ? '' : which.unit, detail: f.target === null ? '未设目标' : '来自目标设置' },
      { label: which.hitWord + '天数', value: String(f.hitDays), unit: '天', detail: f.target === null ? '未设目标，无从判定' : '共 ' + f.loggedDays + ' 天有记录' },
      rate,
    ])),
    sec('sec-chart', which.line, lineOf(plate.points, which.line + '（虚线为目标）', { target: plate.target })),
    sec('sec-detail', '逐日明细',
      tableOf(plate.points, which.value, which.line, [
        {
          label: '是否' + which.hitWord,
          values: plate.points.map((p) => (plate.target === null || p.value === null ? null : (p.value >= plate.target ? which.hitWord : '未' + which.hitWord))),
        },
      ])
      /* 徽章列（#516 §3.1）：与上表「是否达标」那一列同源同算——表内逐日文字仍是逐日的，
       * 这一行给的是「整窗口达标几天、差几天」这一类扫一眼就够的并列读数。 */
      + (f.target === null ? '' : renderChips({
        items: [{ text: which.hitWord + ' ' + String(f.hitDays) + ' 天' }, { text: '未' + which.hitWord + ' ' + String(missed) + ' 天' }],
      }))),
  ];
}

/** TDEE 形态：4 KPI ＋ 总消耗随体重变化曲线（老侧无图，新侧补齐）。 */
export function buildTdeeBlocks(plate: ReportPlate): ReportSection[] {
  const p = plate.base.profile;
  const intake = avgIntakeOf(plate);
  const tdee = p.tdee;
  const gap = tdee === null || intake === null ? null : Math.round((tdee - intake) * 10) / 10;
  return [
    sec('sec-overview', '概览', renderKpiGrid([
      { label: '每日总消耗', value: fmtInt(tdee), unit: '卡', detail: '基础代谢加日常活动，算式见下方口径表' },
      { label: '日均摄入', value: fmtInt(intake), unit: '卡', detail: '窗口 ' + plate.base.days + ' 天里 ' + loggedDaysOf(plate) + ' 天有记录' },
      {
        label: '静态缺口', value: fmtInt(gap), unit: '卡',
        detail: gap === null ? '缺数算不了' : (gap > 0 ? '消耗大于摄入（在缺口）' : '摄入大于消耗（无缺口）'),
        ...(gap === null ? {} : { status: gap > 0 ? 'ok' as const : 'warn' as const }),
      },
      {
        label: '活动量系数', value: p.activityFactor === null ? '—' : String(p.activityFactor),
        detail: '档位：' + p.activityLabel,
      },
    ])),
    sec('sec-caliber', '计算口径', kvTable('计算口径' + (p.missing.length === 0 ? '' : '（缺：' + missText(p.missing) + '）'), [
      { k: '公式', v: 'Mifflin-St Jeor：基础代谢 × 活动系数' },
      { k: '基础代谢', v: fmtInt(p.bmr, ' 卡') },
      { k: '活动系数', v: p.activityFactor === null ? '—' : String(p.activityFactor) + '（' + p.activityLabel + '）' },
      /* #516 §3.2 D09：三件事不再拿斜杠串进一格，一条一行。 */
      { k: '身高', v: fmt(p.heightCm, ' cm') },
      { k: '年龄', v: fmt(p.age, ' 岁') },
      { k: '性别', v: p.genderLabel },
      { k: '缺口口径', v: '静态缺口 ＝ 每日总消耗 − 日均摄入（运动消耗另计，不含在内）' },
    ])),
    sec('sec-chart', '总消耗曲线', tdeeCurve(plate)),
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
      title: '总消耗随体重变化',
      text: '档案四要素不全，画不了这条曲线（缺：' + missText(p.missing) + '）',
    });
  }
  const sign = p.gender === 'male' ? 5 : -161;
  const points = plate.base.series.map((s) => ({
    date: s.date,
    value: s.weightKg === null ? null
      : Math.round((10 * s.weightKg + 6.25 * (p.heightCm as number) - 5 * (p.age as number) + sign) * (p.activityFactor as number)),
  }));
  return lineOf(points, '总消耗随体重变化（同样四要素下，体重变 → 总消耗变）', { format: (v) => String(Math.round(v)) });
}

/** BMR 形态：基础代谢与低于基础代谢天数 ＋ 危险日期表（老侧生理安全护栏，原样搬）。 */
export function buildBmrBlocks(plate: ReportPlate): ReportSection[] {
  const p = plate.base.profile;
  const d = plate.bmrDanger;
  const under = d === null ? [] : d.underDays;
  const th = d === null ? null : d.threshold;
  const danger = under.length >= 3;
  return [
    sec('sec-overview', '概览', renderKpiGrid([
      { label: '基础代谢', value: fmtInt(p.bmr), unit: '卡', detail: 'Mifflin-St Jeor（四要素齐备才算）' },
      { label: '每日总消耗', value: fmtInt(p.tdee), unit: '卡', detail: '基础代谢 × 活动系数 ' + (p.activityFactor === null ? '—' : String(p.activityFactor)) },
      {
        label: '低于基础代谢', value: String(under.length), unit: '天',
        detail: under.length === 0 ? '窗口内没有低于基础代谢的日子' : '阈值为 ' + fmtInt(th, ' 卡'),
        ...(under.length === 0 ? {} : { status: (danger ? 'danger' : 'warn') as 'danger' | 'warn' }),
      },
      { label: '有摄入记录', value: String(plate.points.filter((x) => x.value !== null).length), unit: '天', detail: '共 ' + plate.base.days + ' 天窗口' },
    ])
      + renderChips({ items: [
        { text: '低于基础代谢 ' + String(under.length) + ' 天' },
        { text: '告警线 3 天' },
      ] })),
    sec('sec-danger', '危险信号', danger
      ? renderDataTable({
        columns: [{ key: 't', label: '⚠️ 危险信号' }],
        rows: [{ t: '连续多日低于基础代谢：共 ' + under.length + ' 天低于 ' + fmtInt(th, ' 卡') + '，长期如此会压低基础代谢，建议把摄入提到基础代谢之上。' }],
        caption: '低于基础代谢（老侧口径：3 天及以上即告警）',
      })
      : renderEmptyBlock({
        title: '危险信号',
        text: '窗口内没有低于基础代谢的日子（告警线是连续 3 天及以上）',
      })),
    sec('sec-chart', '每日摄入', lineOf(plate.points, '每日摄入（水平线为基础代谢 ' + fmtInt(th, ' 卡') + '）', { target: th })),
    sec('sec-days', '低于基础代谢的日期', renderDataTable({
      columns: [
        { key: 'date', label: '低于基础代谢的日期' },
        { key: 'cal', label: '当日摄入卡', align: 'right' },
        { key: 'gap', label: '距基础代谢', align: 'right' },
      ],
      rows: under.map((u) => ({ date: u.date, cal: u.calories, gap: th === null ? null : Math.round(u.calories - th) + ' 卡' })),
      caption: '低于基础代谢的日期表',
      emptyText: '窗口内没有低于基础代谢的日子',
    })),
    sec('sec-caliber', '计算口径', kvTable('计算口径' + (p.missing.length === 0 ? '' : '（缺：' + missText(p.missing) + '）'), [
      { k: '公式', v: 'Mifflin-St Jeor：10×体重 加 6.25×身高 减 5×年龄 ' + (p.gender === 'male' ? '加 5' : '减 161') },
      { k: '身高', v: fmt(p.heightCm, ' cm') },
      { k: '年龄', v: fmt(p.age, ' 岁') },
      { k: '性别', v: p.genderLabel },
      { k: '活动量档位', v: p.activityLabel + (p.activityFactor === null ? '' : '（系数 ' + String(p.activityFactor) + '）') },
      { k: '危险信号判据', v: '窗口内摄入低于基础代谢的天数达到 3 天即告警（老侧口径）' },
    ])),
  ];
}
