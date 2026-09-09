// t-chartfix 复现探针（只读 dist，不写仓内）：量化三处肉眼可见排版缺陷。
// 用法：node docs/research/t-chartfix-repro.mjs
import { charts, buildChartsHelpersJs } from '../../packages/base-render/dist/charts.js';

const bar = charts.bar({
  items: [
    { label: '周一', value: 120 },
    { label: '周二', value: 200 },
    { label: '周三', value: 150 },
  ],
}).html;

const rects = [...bar.matchAll(/<rect[^>]*class="[^"]*ilife-charts-bar[^"]*"[^>]*>/g)].map((m) => m[0]);
const centers = rects.map((t) => Number((t.match(/ x="([^"]*)"/) ?? [])[1]) + Number((t.match(/ width="([^"]*)"/) ?? [])[1]) / 2);
const xlabels = [...bar.matchAll(/<text[^>]*class="[^"]*ilife-charts-xlabel[^"]*"[^>]*>/g)].map((m) => m[0]);
const labelXs = xlabels.map((t) => Number((t.match(/ x="([^"]*)"/) ?? [])[1]));
const labelTexts = [...bar.matchAll(/ilife-charts-xlabel[^>]*>([^<]*)</g)].map((m) => m[1]);
const values = [...bar.matchAll(/ilife-charts-value"[^>]*>([^<]*)</g)].map((m) => m[1]);

const css = buildChartsHelpersJs();
const fontRule = (sel) => (css.match(new RegExp(sel.replace(/\./g, '\\.') + '\\{font-size:([^;}]+)')) ?? [])[1] ?? 'MISSING';

console.log('BAR_CENTERS=' + centers.map((c) => c.toFixed(1)).join(','));
console.log('XLABEL_X=' + labelXs.map((x) => x.toFixed(1)).join(',') + ' TEXTS=' + labelTexts.join('/'));
console.log('VALUES=' + values.join('/'));
console.log('DELTA=' + centers.map((c, i) => Math.abs(c - labelXs[i]).toFixed(1)).join(','));
console.log('FONT_XLABEL=' + fontRule('.ilife-charts-xlabel'));
console.log('FONT_VALUE=' + fontRule('.ilife-charts-value'));
console.log('FONT_BAR_XLABEL=' + fontRule('.ilife-charts-bar .ilife-charts-xlabel'));
console.log('FONT_BAR_VALUE=' + fontRule('.ilife-charts-bar .ilife-charts-value'));

const prog = charts.progress({ pct: 65 }).html;
const svgTag = (prog.match(/<svg[^>]*>/) ?? [])[0] ?? 'MISSING';
const track = (prog.match(/<rect[^>]*ilife-charts-track[^>]*>/) ?? [])[0] ?? (prog.match(/<rect[^>]*ilife-charts-track[^>]*\/>/) ?? [])[0] ?? 'MISSING';
const fill = (prog.match(/<rect[^>]*ilife-charts-fillbar[^>]*\/>/) ?? [])[0] ?? 'MISSING';
console.log('PROG_SVG=' + svgTag);
console.log('PROG_TRACK=' + track);
console.log('PROG_FILL=' + fill);
console.log('PROG_VIEWBOX=' + ((prog.match(/viewBox="([^"]*)"/) ?? [])[1] ?? 'MISSING'));
console.log('PROG_PCT_TEXT=' + ((prog.match(/ilife-charts-pct[^>]*>([^<]*)</) ?? [])[1] ?? 'MISSING'));
