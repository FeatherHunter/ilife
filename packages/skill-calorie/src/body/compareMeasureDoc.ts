/** #536 路 对比围度页装配（`calorie.view.body-measure-compare`）。
 *
 *  为什么另立一件：同姊妹件 `compareCompositionDoc.ts` 的理由——`compare.ts` 越过 350 行告警线，
 *  按页族把装配面分出来；本件住围度对比页，`compare.ts` 留取数并薄转出。
 *  13 个部位的中文名由取数层（`fetch/body.ts` 的 `MEASUREMENT_ZH`）随视图带进来，本件不自持字表。 */
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderDistributionRows } from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { compareUiCss } from './compareUi.js';
import { BADGE, DOC_SKILL, DOC_TITLE, DOC_VERSION, PAGE_UI } from './compare.js';
import type { BodyMeasureCompareView } from './compare.js';

/** 全角减号（U+2212）＋ 单位尾缀：负值不写半角 `-`。 */
const signed = (n: number | null, unit: string): string =>
  (n === null ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + unit);
const cm = (n: number | null): string => (n === null ? '—' : String(n) + 'cm');

/** 变化最大的几个部位进对照带（列表太长会把结论条推走，取前 6 个已够看出方向）。 */
const TOP_N = 6;

export function buildBodyMeasureCompareDoc(v: BodyMeasureCompareView): string {
  const nonZero = v.rows.filter((r) => r.delta !== null && r.delta !== 0).length;
  const maxAbs = Math.max(...v.rows.map((r) => (r.delta === null ? 0 : Math.abs(r.delta))), 0);
  /** 结论条：一句判语（部位口径只说这一处，事实条不再抄一遍）。 */
  const verdict = nonZero === 0
    ? '两个日期的围度一个部位都没变'
    : '两个日期之间有 ' + nonZero + ' 个部位的围度变了';
  const bar = maxAbs === 0
    ? ''
    : renderDistributionRows({
      rows: v.rows
        .filter((r) => r.delta !== null && r.delta !== 0)
        .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
        .slice(0, TOP_N)
        .map((r) => ({
          label: r.zh,
          value: signed(r.delta, 'cm'),
          pct: Math.round((Math.abs(r.delta ?? 0) / maxAbs) * 100),
        })),
    });
  const parts: string[] = [compareUiCss()];
  parts.push(renderFactStrip({
    items: [
      { label: '围度变了', value: String(nonZero) + ' 个部位' },
      { label: '两个日期都比过', value: String(v.nCompared) + ' 个部位' },
      { label: '前一次记录', value: v.date1 },
      { label: '后一次记录', value: v.date2 },
    ],
  }));
  parts.push(bar);
  parts.push(renderConclusionBar(verdict + '，后一次记录是 ' + v.date2 + '。'));
  parts.push(renderDataTable({
    columns: [
      { key: 'part', label: '部位' },
      { key: 'before', label: '前一次(cm)', align: 'right' },
      { key: 'after', label: '后一次(cm)', align: 'right' },
      { key: 'delta', label: '差值(cm)', align: 'right' },
      { key: 'rate', label: '变化率', align: 'right' },
    ],
    rows: v.rows.map((r) => ({
      part: r.zh,
      before: cm(r.before),
      after: cm(r.after),
      delta: signed(r.delta, ''),
      rate: signed(r.ratePct, '%'),
    })),
    caption: '前一次记录是基准，差值与变化率都以后一次减前一次算。',
    emptyText: '两期无可比部位',
  }));
  // 口径行只补表格读法（部位名单已在表内逐行，不在这里再列一遍——同一事实一页一处）。
  parts.push(renderCaliberLine(
    '只有两个日期都有记录的部位才比。差值与变化率都是后一次减前一次，单位厘米。',
  ));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.body-measure-compare',
      data: {
        metrics: metricsOf({ nCompared: v.nCompared, nonZero }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: DOC_TITLE,
    title: '对比围度',
    eyebrow: '身体细节 · 两期对比',
    badge: BADGE,
    summary: '把两个日期的围度记录摆在一起，逐部位看变了多少。',
    // 同上：B 线路的结论行走 `summary`，A 线的 `subtitle` 位不写。
    subtitle: null,
    metaLeft: '围度两期对比',
    content: parts.join(''),
    charts: false,
    pageUi: PAGE_UI,
  });
}
