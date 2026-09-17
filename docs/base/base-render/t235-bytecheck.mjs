#!/usr/bin/env node
/** #235 搬迁探针：blocks／style 公开面产物逐字节哈希。
 * 用法（仓根）：
 *   node docs/base/base-render/t235-bytecheck.mjs --save .scratch/t235/baseline.json
 *   node docs/base/base-render/t235-bytecheck.mjs --compare .scratch/t235/baseline.json
 * 口径：文本归一化（去 BOM，CRLF→LF）后 sha256（与 tooling/skill-html-snapshot.mjs 同口径）。
 * 读构建产物 dist（与测试一致）；比较范围＝两入口全部值出口＋公开常量。
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const blocksUrl = new URL('../../../packages/base-render/dist/blocks.js', import.meta.url);
const styleUrl = new URL('../../../packages/base-render/dist/style.js', import.meta.url);
const blocks = await import(blocksUrl);
const style = await import(styleUrl);

function normalize(text) {
  return String(text).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}
function sha(text) {
  return createHash('sha256').update(normalize(text), 'utf8').digest('hex');
}

const P = [];
function add(id, value) {
  P.push([id, typeof value === 'string' ? sha(value) : sha(JSON.stringify(value))]);
}

const {
  renderPageShell, renderTocBlock, renderCaliberLine, renderConclusionBar,
  renderMiniBar, renderDistributionRows, renderChips, renderChangeRows,
  renderKpiCard, renderKpiGrid, renderDataTable, renderChartBlock, renderListRows,
  renderPreBlock, renderDetailSection, renderDisclosure, renderParamForm,
  renderEmptyBlock, renderCopyBlock, renderFeedbackBlock, blocksCss,
  BLOCK_STYLE_SECTIONS, ACTION_ID_ATTR, COPY_ACTION_IDS, DEFAULT_DATA_ATTR, TOAST_DEFAULTS,
} = blocks;
const { buildStyleSheet, STYLE_PREFIX, STYLE_VERSION, STYLE_TOKENS, cx, token } = style;

// B-01／页面级
add('pageShell.base', renderPageShell({ title: '基线标题', subtitle: '副', eyebrow: '眉', content: '<p>正文</p>' }));
add('pageShell.printable', renderPageShell({ title: 'T', content: '<p>c</p>', printable: true }));
add('toc.full', renderTocBlock({ items: [{ id: 'a1', text: '甲' }, { id: 'a2', text: '乙' }] }));
add('toc.empty', renderTocBlock({ items: [] }));
add('caliber.split', renderCaliberLine('甲｜乙｜丙'));
add('caliber.plain', renderCaliberLine('无分隔行'));
add('conclusion', renderConclusionBar('结论句'));
// 融合四件
add('miniBar.base', renderMiniBar({ pct: 42 }));
add('miniBar.token', renderMiniBar({ pct: 120, color: '--blue' }));
add('miniBar.hex', renderMiniBar({ pct: 33, color: '#ff0000' }));
add('distRows.full', renderDistributionRows({ rows: [{ label: '甲', value: 12, pct: 50 }, { label: '乙', value: null, pct: 100, color: 'red', labelClass: 'x-y' }] }));
add('distRows.empty', renderDistributionRows({ rows: [] }));
add('chips.full', renderChips({ items: [{ text: '甲' }, { text: '乙' }] }));
add('chips.empty', renderChips({ items: [] }));
add('changeRows.full', renderChangeRows({ rows: [{ label: '体重', before: '70kg', after: '68kg' }, { label: '围度', before: null, after: '80cm', arrow: false }] }));
// B-02／B-03
add('kpiCard.base', renderKpiCard({ label: 'L', value: '12', unit: 'U', detail: 'D' }));
add('kpiCard.bar', renderKpiCard({ label: 'L', value: '1', status: 'ok', bar: { pct: 92 } }));
add('kpiCard.danger', renderKpiCard({ label: 'L', value: '1', status: 'danger' }));
add('kpiGrid.base', renderKpiGrid([{ label: 'A', value: '1' }, { label: 'B', value: '2' }]));
add('kpiGrid.titled', renderKpiGrid([{ label: 'A', value: '1' }], { title: '速览' }));
const columns = [{ key: 'k', label: 'K' }, { key: 'v', label: 'V', align: 'right' }];
add('dataTable.base', renderDataTable({ columns, rows: [{ k: 'a', v: 1 }, { k: null, v: 2, marker: '今' }] }));
add('dataTable.empty', renderDataTable({ columns, rows: [], emptyText: 'E' }));
// B-04（8 种全部分发）
const chartInputs = {
  bar: { items: [{ label: 'a', value: 1 }] },
  line: { items: [{ label: 'a', value: 1 }] },
  donut: { items: [{ label: 'a', value: 1 }] },
  progress: { pct: 0.5 },
  combo: { bars: [{ label: 'a', value: 1 }], lines: [{ label: 'a', value: 1 }] },
  sparkline: { items: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }] },
  gauge: { pct: 0.5 },
  scatter: { items: [{ x: 1, y: 2 }] },
};
for (const kind of Object.keys(chartInputs)) {
  add('chartBlock.' + kind, renderChartBlock({ kind, input: chartInputs[kind], title: kind }));
}
add('chartBlock.empty', renderChartBlock({ kind: 'bar', input: { items: [] } }));
// B-05〜B-09
add('listRows.full', renderListRows({ items: [{ left: '01', main: 'M', right: 'R', done: true }, { main: '次' }] }));
add('listRows.empty', renderListRows({ items: [], emptyText: 'E' }));
add('preBlock.base', renderPreBlock({ command: 'cmd --x', label: 'L' }));
add('preBlock.copy', renderPreBlock({ command: 'run', actionId: 'a1', copyText: 'run', copyLabel: '复制' }));
add('detail.base', renderDetailSection({
  scene: { id: 's1', title: '场景', wake_word: '查', status: '', prompt_template: '模板正文', types: ['甲', { text: '乙', bg: '#fff', fg: '#000' }] },
  cli: 'cli 入口',
}));
add('detail.dev', renderDetailSection({
  scene: { id: 's2', title: '场景二', wake_word: '看', status: '【待开发】', prompt_template: '正文' },
}));
add('disclosure.open', renderDisclosure({ title: 'T', contentHtml: '<p>c</p>', open: true }));
add('disclosure.closed', renderDisclosure({ title: 'T', contentHtml: '<p>c</p>' }));
add('paramForm.base', renderParamForm({ fields: [{ name: 'n', label: 'L', value: 'v', hint: 'h', required: true }], description: 'd', previewText: 'p' }));
add('paramForm.options', renderParamForm({ fields: [{ name: 's', label: 'S', options: ['a', 'b'], value: 'a' }] }));
add('paramForm.numeric', renderParamForm({ fields: [{ name: 'w', label: '体重', step: '0.1', min: 0, max: 100, readonly: true }] }));
// B-10〜B-12
add('emptyBlock.base', renderEmptyBlock({ text: '空' }));
add('emptyBlock.titled', renderEmptyBlock({ text: '空', title: '题' }));
add('copyBlock.base', renderCopyBlock({ title: 'T', dataText: 'd', logText: 'l' }));
add('copyBlock.ids', renderCopyBlock({ dataText: 'd', dataActionId: 'a1', logActionId: 'a2' }));
add('copyBlock.formats', renderCopyBlock({ dataFormats: { text: 't', json: '{}', csv: 'a,b' } }));
add('feedback.toast', renderFeedbackBlock({ toast: { msg: 'm', detail: 'd' } }));
add('feedback.static', renderFeedbackBlock({ toast: { msg: 'm', detail: 'd', icon: 'ok' }, staticNotice: true }));
add('feedback.error', renderFeedbackBlock({ error: { message: '错', retryPrompt: '重试', dataText: 'd', logText: 'l' } }));
// 样式资产
add('blocksCss.default', blocksCss());
add('blocksCss.prefix', blocksCss({ prefix: 'x-' }));
add('styleSheet.default', buildStyleSheet().css);
add('styleSheet.prefix', buildStyleSheet({ prefix: 'x-' }).css);
add('styleSheet.extra', buildStyleSheet({ extraCss: '.ilife-bill .ilife-toast { border-radius: 8px; }' }).css);
// 公开常量与拼接入口
add('const.BLOCK_STYLE_SECTIONS', [...BLOCK_STYLE_SECTIONS].join(','));
add('const.ACTION_ID_ATTR', ACTION_ID_ATTR);
add('const.COPY_ACTION_IDS', COPY_ACTION_IDS);
add('const.DEFAULT_DATA_ATTR', DEFAULT_DATA_ATTR);
add('const.TOAST_DEFAULTS', TOAST_DEFAULTS);
add('const.STYLE_PREFIX', STYLE_PREFIX);
add('const.STYLE_VERSION', STYLE_VERSION);
add('const.STYLE_TOKENS', STYLE_TOKENS);
add('fn.cx', cx('a', false, 'b'));
add('fn.token', token('radius'));
add('exports.blocks', Object.keys(blocks).sort().join(','));
add('exports.style', Object.keys(style).sort().join(','));

const manifest = Object.fromEntries(P);
const args = process.argv.slice(2);
if (args[0] === '--save' && args[1]) {
  writeFileSync(resolve(root, args[1]), JSON.stringify(manifest, null, 2) + '\n');
  console.log('saved ' + P.length + ' 件 → ' + args[1]);
} else if (args[0] === '--compare' && args[1]) {
  const base = JSON.parse(readFileSync(resolve(root, args[1]), 'utf8'));
  let bad = 0;
  for (const [id, h] of P) {
    if (base[id] !== h) { console.error('DIFF ' + id + '\n  基线 ' + base[id] + '\n  当刻 ' + h); bad++; }
  }
  for (const id of Object.keys(base)) {
    if (!(id in manifest)) { console.error('MISSING ' + id); bad++; }
  }
  console.log(bad === 0 ? 'OK: 产物逐字节一致（' + P.length + ' 件）' : 'FAIL: ' + bad + ' 处不一致');
  process.exit(bad === 0 ? 0 : 1);
} else {
  console.log(JSON.stringify(manifest, null, 2));
}
