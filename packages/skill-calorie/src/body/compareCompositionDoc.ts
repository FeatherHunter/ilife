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
import { BADGE, DOC_SKILL, DOC_TITLE, DOC_VERSION, PAGE_UI, rangeText } from './compare.js';
import type { BodyCompositionCompareView } from './compare.js';

/** 全角减号（U+2212）：负值不用半角 `-`，与仓内数面口径一致。 */
const pct = (n: number | null): string => (n === null ? '—' : String(n).replace('-', '−') + '%');
const signed = (n: number | null, unit: string): string =>
  (n === null ? '—' : (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n) + unit);

export function buildBodyCompositionCompareDoc(v: BodyCompositionCompareView): string {
  const dTxt = v.delta === null ? '' : v.delta > 0 ? '上升 ' + v.delta
    : v.delta < 0 ? '下降 ' + Math.abs(v.delta) : '没变';
  const sourceTxt = v.source ?? '全部来源';
  /** 结论条：一句判语（两段的均值、差值、相对幅度都由这一句说清，不再各印一遍）。 */
  const summary = v.delta === null
    ? '两段都缺体脂率均值，算不出变化'
    : '体脂率均值从 ' + pct(v.beforeAvg) + ' 到 ' + pct(v.afterAvg) + '，' + dTxt + ' 个百分点，'
      + '相对 ' + signed(v.ratePct, '%') + '。';
  /** 事实条：三格，读者先看的三个数（负责人第 4／5 条：别用两张大卡各装三行小字）。 */
  const head = renderFactStrip({
    items: [
      { label: '第一段均值', value: pct(v.beforeAvg) },
      { label: '第二段均值', value: pct(v.afterAvg) },
      { label: '差值', value: signed(v.delta, ' 个百分点') },
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
        value: signed(v.delta, ' 个百分点'),
        pct: Math.max(0, Math.min(100, afterPct)),
      }],
    });
  const parts: string[] = [compareUiCss()];
  parts.push(head + bar + renderConclusionBar(summary));
  parts.push(renderDataTable({
    columns: [
      { key: 'period', label: '期别' },
      { key: 'range', label: '日期' },
      { key: 'avg', label: '体脂率均值', align: 'right' },
      { key: 'n', label: '记录条数', align: 'right' },
      { key: 'delta', label: '比基准', align: 'right' },
      { key: 'rate', label: '变化率', align: 'right' },
    ],
    rows: [
      {
        period: '第一段', range: rangeText(v.p1Start, v.p1End),
        avg: pct(v.beforeAvg), n: v.beforeN, delta: '基准', rate: '—',
      },
      {
        period: '第二段', range: rangeText(v.p2Start, v.p2End),
        avg: pct(v.afterAvg), n: v.afterN, delta: signed(v.delta, '%'), rate: signed(v.ratePct, '%'),
      },
    ],
    // 表题只交代表格的读法（两段的均值／差值由卡下事实条与结论条说，不再抄一遍）。
    caption: '第一段是基准，第二段的差值与变化率都以它为准。',
    emptyText: '对比期无数据',
  }));
  parts.push(renderCaliberLine('两段的体脂率按各自那段的记录求平均，' + sourceTxt + '都算在内。'));
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
    docTitle: DOC_TITLE,
    title: '对比体脂',
    eyebrow: '身体细节 · 两期对比',
    badge: BADGE,
    summary: '把两段的体脂率记录各自求平均，看这一段比上一段变了多少。',
    // B 线路（给了 `metaLeft`）的正文用 `summary` 当结论行；A 线的 `subtitle` 位不写（写两处＝同一事实两处）。
    subtitle: null,
    metaLeft: '体脂率两期对比',
    content: parts.join(''),
    charts: false,
    pageUi: PAGE_UI,
  });
}
