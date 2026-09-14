/** #384 · 报告子形态页渲染入口（1 个多态底座 8 个 kind 的薄分派）。
 *
 * 形状依据（编排者裁决 3）：命令层 8 条独立命令、渲染层 1 个多态底座。
 * 本件只做三件事：按 `kind` 选区块、给形态一句结论摘要、交给 `assembleDocPage` 包成完整文档。
 * 各形态的区块组装住三个分片（按「同一批改动一起改」切）：
 *   `./reportDocParts.ts`（公共原语）／`./reportDocBmi.ts`（先验件 BMI）／
 *   `./reportDocTracked.ts`（蛋白／水分／TDEE／BMR）／`./reportDocScore.ts`（评分／趋势／对比）。
 *
 * 纪律：样式一律走 `assembleDocPage`（内部＝`buildStyleSheet().css + blocksCss()`，不走 `extraCss`）；
 * 全族颜色字面量为 0（主色取既有令牌 `--blue`，不新增表、不改值）；
 * 不碰老侧 token（`--ink`／`--r-sm`／`--ease` 本仓零命中，只作设计意图参考）。
 */
import { renderDataTable } from 'base-paint/blocks';
import { assembleDocPage } from '../shared/docPage.js';
import { buildBmiBlocks } from './reportDocBmi.js';
import { buildCompareBlocks, buildScoreBlocks, buildTrendBlocks } from './reportDocScore.js';
import { buildBmrBlocks, buildTdeeBlocks, buildTrackedBlocks } from './reportDocTracked.js';
import { commandNote, fmt, footerOf, metaLeftOf } from './reportDocParts.js';
import type { ReportKind, ReportPlate } from './reportPlate.js';

/** 形态中文名（页面正文与徽标都用它；取自 HELP 下一级「健康报告」的词面）。 */
export const KIND_LABELS: Record<ReportKind, string> = {
  bmi: 'BMI 报告', tdee: 'TDEE 报告', bmr: 'BMR 报告', protein: '蛋白质摄入报告',
  water: '水分摄入报告', score: '综合评分', trend: '健康趋势', compare: '健康报告(含对比)',
};

/** 8 形态总入口：底座 ＋ 命令原文 → 完整文档。 */
export function buildReportDoc(plate: ReportPlate, command: string): string {
  const label = KIND_LABELS[plate.base.kind];
  return assembleDocPage({
    docTitle: '卡路里·' + label,
    title: label,
    eyebrow: '',
    subtitle: null,
    content: bodyOf(plate) + footerOf(plate, label) + commandNote(command),
    metaLeft: metaLeftOf(plate),
    badge: '卡路里 · 报告',
    summary: summaryOf(plate),
  });
}

/** 结论摘要（一句话人话；各形态自己给，不套同一句）。 */
function summaryOf(plate: ReportPlate): string | null {
  const p = plate.base;
  switch (p.kind) {
    case 'bmi': {
      const last = p.weightPoints[p.weightPoints.length - 1];
      return last === undefined || last.bmi === null
        ? '这段时间没有可算 BMI 的称重记录'
        : '最近一次 BMI ' + last.bmi + '（' + last.date + '）';
    }
    case 'tdee':
      return p.profile.tdee === null ? '档案四要素不全，出不了总消耗' : '每日总消耗约 ' + p.profile.tdee + ' 卡';
    case 'bmr': {
      const d = plate.bmrDanger;
      if (d === null) return null;
      return d.underDays.length >= 3
        ? '⚠️ 有 ' + d.underDays.length + ' 天摄入低于基础代谢'
        : '没有连续低于基础代谢的日子';
    }
    case 'protein':
      return plate.fourPiece === null ? null
        : '日均 ' + fmt(plate.fourPiece.avg, ' g') + ' · 目标 ' + fmt(plate.fourPiece.target, ' g') + ' · 达标 ' + plate.fourPiece.hitDays + ' 天';
    case 'water':
      return plate.fourPiece === null ? null
        : '日均 ' + fmt(plate.fourPiece.avg, ' ml') + ' · 目标 ' + fmt(plate.fourPiece.target, ' ml') + ' · 达标 ' + plate.fourPiece.hitDays + ' 天';
    case 'score':
      return plate.trend === null || plate.trend.lateAvg === null
        ? null
        : '综合评分 ' + plate.trend.lateAvg + ' 分（0–100，六因素等距折算）';
    case 'trend':
      return plate.trend === null ? null
        : '变化方向 ' + plate.trend.direction + '（前段 ' + fmt(plate.trend.earlyAvg) + ' → 后段 ' + fmt(plate.trend.lateAvg) + '）';
    case 'compare':
      return plate.compare === null ? null
        : '本期 ' + plate.compare.cur.start + ' ~ ' + plate.compare.cur.end + ' 对比期 ' + plate.compare.prev.start + ' ~ ' + plate.compare.prev.end;
    default:
      return null;
  }
}

function bodyOf(plate: ReportPlate): string {
  switch (plate.base.kind) {
    case 'bmi': return buildBmiBlocks(plate);
    case 'protein': case 'water': return buildTrackedBlocks(plate);
    case 'tdee': return buildTdeeBlocks(plate);
    case 'bmr': return buildBmrBlocks(plate);
    case 'score': return buildScoreBlocks(plate);
    case 'trend': return buildTrendBlocks(plate);
    case 'compare': return buildCompareBlocks(plate);
    default:
      return renderDataTable({
        columns: [{ key: 'note', label: '说明' }],
        rows: [{ note: '未知报告形态：' + String(plate.base.kind) }],
        caption: '报告',
      });
  }
}
