/** #536 路 对比体脂页装配（`calorie.view.body-composition-compare`）。
 *
 *  为什么另立一件：`compare.ts` 在本票重排里同时住着「两页取数」与「两页整页装配」，
 *  加完对照带／事实条／页内样式接线之后越过 350 行告警线（367 LF）。按页族把**装配面**
 *  分出来：本件住体脂对比页，姊妹件 `compareMeasureDoc.ts` 住围度对比页；
 *  `compare.ts` 留两页的取数与参数解析，并薄转出本件，出口位不变。
 *
 *  小件口径（全角减号、`rangeText`、页内样式）与测域那一页同源，取自 `./compare.js` 的导出。 */
import { renderCaliberLine, renderConclusionBar, renderDataTable, renderDistributionRows } from 'base-paint/blocks';
import { renderFactStrip } from 'base-paint';
import { assembleDocPage, metricsOf } from '../shared/docPage.js';
import { dataCopyArea } from '../shared/copyArea.js';
import { compareUiCss } from './compareUi.js';
import { badge, docTitle, DOC_SKILL, DOC_VERSION, PAGE_UI, rangeText } from './compare.js';
import type { BodyCompositionCompareView } from './compare.js';
import { m } from '../entries/index.js';

/** 全角减号（U+2212）：负值不用半角 `-`，与仓内数面口径一致。 */
const pct = (n: number | null): string => (n === null ? '—' : String(n).replace('-', '−') + '%');
const signed = (n: number | null, unit: string): string =>
  (n === null ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + unit);

export function buildBodyCompositionCompareDoc(v: BodyCompositionCompareView): string {
  const dTxt = v.delta === null ? '' : v.delta > 0 ? m('skill-calorie.body-compareCompositionDoc.c026', { p0: String(v.delta) })
    : v.delta < 0 ? m('skill-calorie.body-compareCompositionDoc.c001', { p0: String(Math.abs(v.delta)) }) : m('skill-calorie.body-compareCompositionDoc.c002');
  const sourceTxt = v.source ?? m('skill-calorie.body-compareCompositionDoc.c003');
  /** 结论条：一句判语（两段的均值、差值、相对幅度都由这一句说清，不再各印一遍）。 */
  const summary = v.delta === null
    ? m('skill-calorie.body-compareCompositionDoc.c004')
    : m('skill-calorie.body-compareCompositionDoc.c005', {
      p0: String(pct(v.beforeAvg)),
      p1: String(pct(v.afterAvg)),
      p2: String(dTxt),
      p3: String(signed(v.ratePct, '%')),
    });
  /** 事实条：三格，读者先看的三个数（负责人第 4／5 条：别用两张大卡各装三行小字）。 */
  const head = renderFactStrip({
    items: [
      { label: m('skill-calorie.body-compareCompositionDoc.c006'), value: pct(v.beforeAvg) },
      { label: m('skill-calorie.body-compareCompositionDoc.c007'), value: pct(v.afterAvg) },
      { label: m('skill-calorie.body-compareCompositionDoc.c008'), value: signed(v.delta, m('skill-calorie.body-compareCompositionDoc.c009')) },
    ],
  });
  /** 对照带：名称栏一眼看到「从多少到多少」，中间那条按后一段占前一段的比例撑宽，右栏给差值。 */
  const afterPct = v.beforeAvg === null || v.beforeAvg === 0 || v.afterAvg === null
    ? 100
    : Math.round((Math.abs(v.afterAvg) / Math.abs(v.beforeAvg)) * 100);
  const bar = v.beforeAvg === null || v.afterAvg === null
    ? ''
    : renderDistributionRows({
      rows: [{
        label: pct(v.beforeAvg) + ' → ' + pct(v.afterAvg),
        value: signed(v.delta, m('skill-calorie.body-compareCompositionDoc.c010')),
        pct: Math.max(0, Math.min(100, afterPct)),
      }],
    });
  const parts: string[] = [compareUiCss()];
  parts.push(head + bar + renderConclusionBar(summary));
  parts.push(renderDataTable({
    columns: [
      { key: 'period', label: m('skill-calorie.body-compareCompositionDoc.c011') },
      { key: 'range', label: m('skill-calorie.body-compareCompositionDoc.c027') },
      { key: 'avg', label: m('skill-calorie.body-compareCompositionDoc.c012'), align: 'right' },
      { key: 'n', label: m('skill-calorie.body-compareCompositionDoc.c013'), align: 'right' },
      { key: 'delta', label: m('skill-calorie.body-compareCompositionDoc.c014'), align: 'right' },
      { key: 'rate', label: m('skill-calorie.body-compareCompositionDoc.c015'), align: 'right' },
    ],
    rows: [
      {
        period: m('skill-calorie.body-compareCompositionDoc.c016'), range: rangeText(v.p1Start, v.p1End),
        avg: pct(v.beforeAvg), n: v.beforeN, delta: m('skill-calorie.body-compareCompositionDoc.c017'), rate: '—',
      },
      {
        period: m('skill-calorie.body-compareCompositionDoc.c018'), range: rangeText(v.p2Start, v.p2End),
        avg: pct(v.afterAvg), n: v.afterN, delta: signed(v.delta, '%'), rate: signed(v.ratePct, '%'),
      },
    ],
    // 表题只交代表格的读法（两段的均值／差值由卡下事实条与结论条说，不再抄一遍）。
    caption: m('skill-calorie.body-compareCompositionDoc.c019'),
    emptyText: m('skill-calorie.body-compareCompositionDoc.c020'),
  }));
  parts.push(renderCaliberLine(m('skill-calorie.body-compareCompositionDoc.c021', { p0: String(sourceTxt) })));
  parts.push(dataCopyArea('复制数据', {
    envelope: {
      version: DOC_VERSION, skill: DOC_SKILL, shape: 'stat', key: 'calorie.view.body-composition-compare',
      data: {
        metrics: metricsOf({
          beforeAvg: v.beforeAvg ?? undefined, afterAvg: v.afterAvg ?? undefined,
          delta: v.delta ?? undefined, ratePct: v.ratePct ?? undefined,
        }),
      },
    },
  }));
  return assembleDocPage({
    docTitle: docTitle(),
    title: m('skill-calorie.body-compareCompositionDoc.c022'),
    eyebrow: m('skill-calorie.body-compareCompositionDoc.c023'),
    badge: badge(),
    summary: m('skill-calorie.body-compareCompositionDoc.c024'),
    // B 线路（给了 `metaLeft`）的正文用 `summary` 当结论行；A 线的 `subtitle` 位不写（写两处＝同一事实两处）。
    subtitle: null,
    metaLeft: m('skill-calorie.body-compareCompositionDoc.c025'),
    content: parts.join(''),
    charts: false,
    pageUi: PAGE_UI,
  });
}
