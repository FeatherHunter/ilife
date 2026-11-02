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
import { badge, docTitle, DOC_SKILL, DOC_VERSION, PAGE_UI } from './compare.js';
import type { BodyMeasureCompareView } from './compare.js';
import { m } from '../entries/index.js';

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
    ? m('skill-calorie.body-compareMeasureDoc.c001')
    : m('skill-calorie.body-compareMeasureDoc.c002', { p0: String(nonZero) });
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
    // #539 收口：`围度变了 N` 与 `两个日期都比过 N` 两格同值并列（终审指控同义反复，成立），
    // 撤掉后者——eligibility（两个日期都有记录才比）已由下面那条口径行说一处，不在这里说第二遍。
    items: [
      { label: m('skill-calorie.body-compareMeasureDoc.c003'), value: m('skill-calorie.body-compareMeasureDoc.c004', { p0: String(String(nonZero)) }) },
      { label: m('skill-calorie.body-compareMeasureDoc.c005'), value: v.date1 },
      { label: m('skill-calorie.body-compareMeasureDoc.c006'), value: v.date2 },
    ],
  }));
  parts.push(bar);
  parts.push(renderConclusionBar(m('skill-calorie.body-compareMeasureDoc.c007', { p0: String(verdict), p1: String(v.date2) })));
  parts.push(renderDataTable({
    columns: [
      { key: 'part', label: m('skill-calorie.body-compareMeasureDoc.c008') },
      { key: 'before', label: m('skill-calorie.body-compareMeasureDoc.c009'), align: 'right' },
      { key: 'after', label: m('skill-calorie.body-compareMeasureDoc.c010'), align: 'right' },
      { key: 'delta', label: m('skill-calorie.body-compareMeasureDoc.c011'), align: 'right' },
      { key: 'rate', label: m('skill-calorie.body-compareMeasureDoc.c012'), align: 'right' },
    ],
    rows: v.rows.map((r) => ({
      part: r.zh,
      before: cm(r.before),
      after: cm(r.after),
      delta: signed(r.delta, ''),
      rate: signed(r.ratePct, '%'),
    })),
    caption: m('skill-calorie.body-compareMeasureDoc.c013'),
    emptyText: m('skill-calorie.body-compareMeasureDoc.c014'),
  }));
  // 口径行只补表格读法（部位名单已在表内逐行，不在这里再列一遍——同一事实一页一处）。
  parts.push(renderCaliberLine(
    m('skill-calorie.body-compareMeasureDoc.c015'),
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
    docTitle: docTitle(),
    title: m('skill-calorie.body-compareMeasureDoc.c016'),
    eyebrow: m('skill-calorie.body-compareMeasureDoc.c017'),
    badge: badge(),
    summary: m('skill-calorie.body-compareMeasureDoc.c018'),
    // 同上：B 线路的结论行走 `summary`，A 线的 `subtitle` 位不写。
    subtitle: null,
    metaLeft: m('skill-calorie.body-compareMeasureDoc.c019'),
    content: parts.join(''),
    charts: false,
    pageUi: PAGE_UI,
  });
}
