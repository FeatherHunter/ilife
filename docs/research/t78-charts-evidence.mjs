// #78 施工 A1b（图表层返修）· 可复跑证据脚本
//
// 用法（在仓库根 `D:\ilife` 执行）：
//   node .scratch/t78/a1-evidence.mjs            # 产出快照 + 覆盖清单 + 纯度/幂等自证 + 返修点自证
//   node .scratch/t78/a1-evidence.mjs --mutate   # 变异测试自证（改错实现 → 期望用例红 → 还原 → 全绿）
//
// 本脚本只读 `src/charts.ts`／`test/charts.test.mjs`／`dist/charts.js`；变异模式会**临时**改写
// `src/charts.ts`（或测试文件）并在每次跑完立即还原（逐条 try/finally），不写其它任何文件、不碰 git。
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const SRC = join(ROOT, 'packages', 'base-render', 'src', 'charts.ts');
const TEST = 'packages/base-render/test/charts.test.mjs';
const DIST = join(ROOT, 'packages', 'base-render', 'dist', 'charts.js');
const require = createRequire(import.meta.url);
const TSC = require.resolve('typescript/bin/tsc');

const {
  charts,
  buildChartsHelpersJs,
  ChartError,
} = await import(new URL('../../packages/base-render/dist/charts.js', import.meta.url));

const {
  ACTION_ID_ATTR,
  CHART_BREAKPOINTS,
  CHART_COORD_RULE,
  CHART_EMPTY_RULE,
  CHART_ERROR_CODES,
  CHART_KINDS,
  CHART_PALETTE,
  CHART_STRUCTURE_RULE,
  CHARTS_STYLE_ID,
  SHARED_HELPERS_JS_RULE,
  STYLE_PREFIX,
} = await import(new URL('../../packages/base-render/dist/index.js', import.meta.url));

const LF = String.fromCharCode(10);
const P = STYLE_PREFIX;
const line = (s = '') => console.log(s);

function build() {
  execFileSync(process.execPath, [TSC, '-b', '--force'], { cwd: ROOT, stdio: 'pipe' });
}

/** 构建失败**不**抛出：区分「本次变异导致」（错误在 charts.ts）与「并行施工导致」（错误在别的文件）。 */
function buildSafe() {
  try {
    build();
    return { ok: true, errors: '' };
  } catch (err) {
    return { ok: false, errors: String(err.stdout ?? '') + String(err.stderr ?? '') };
  }
}

/** 跑行为测试，返回 `{ code, failed: string[], pass }`（TAP：`not ok N - 名字`，含缩进子测试）。 */
function runTests() {
  let out = '';
  let code = 0;
  try {
    out = execFileSync(process.execPath, ['--test', '--test-reporter=tap', TEST], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    code = typeof err.status === 'number' ? err.status : 1;
    out = String(err.stdout ?? '') + String(err.stderr ?? '');
  }
  const failed = [...out.matchAll(/^[ \t]*not ok \d+ - (.+)$/gm)].map((m) => m[1].trim());
  const passMatch = out.match(/^# pass (\d+)$/m);
  const pass = passMatch === null ? 0 : Number(passMatch[1]);
  return { code, failed, pass, out };
}

/* ── 小件（与 test/charts.test.mjs 同口径） ───────────────────────────── */

function tagsOf(html, tag) {
  return [...html.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'g'))].map((m) => m[0]);
}

function attrOf(tag, name) {
  return (tag.match(new RegExp(name + '="([^"]*)"')) ?? [])[1];
}

function attrsOf(html, tag, cls) {
  return tagsOf(html, tag)
    .filter((t) => cls === undefined || new RegExp('class="[^"]*' + cls + '[^"]*"').test(t))
    .map((t) => Object.fromEntries([...t.matchAll(/([a-zA-Z0-9-:]+)="([^"]*)"/g)].map((m) => [m[1], m[2]])));
}

function textsOf(html, cls) {
  return [...html.matchAll(new RegExp('<text[^>]*class="[^"]*' + cls + '[^"]*"[^>]*>([^<]*)</text>', 'g'))]
    .map((m) => m[1]);
}

function countOf(html, needle) {
  return html.split(needle).length - 1;
}

/* ── 模式 1：产出快照 + 自证 ─────────────────────────────────────────── */

function snapshot() {
  const fixtures = {
    line: charts.line({
      items: [{ label: 'A', value: 0 }, { label: 'B', value: 50 }, { label: 'C', value: 100 }],
      options: { width: 320, height: 210, yMin: 0, yMax: 100, labels: 'none', showValues: false, grid: false },
    }),
    barStacked: charts.bar({
      items: [{ label: 'A', values: [1, 1], value: 2 }, { label: 'B', values: [3, 1], value: 4 }],
      options: { stacked: true, labels: 'none', showValues: false, grid: false, width: 320, height: 170 },
    }),
    donut: charts.donut({ items: [{ label: 'A', value: 50 }, { label: 'B', value: 50 }], options: { size: 200, ringWidth: 20 } }),
    progress: charts.progress({ pct: 150, options: { gradient: true } }),
    gauge: charts.gauge({ pct: 50, options: { size: 200, label: '达标' } }),
    scatter: charts.scatter({
      items: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }],
      options: { labels: 'none', grid: false, width: 320, height: 180 },
    }),
    sparkline: charts.sparkline({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 3 }] }),
    combo: charts.combo({
      bars: [{ label: 'A', value: 10 }],
      lines: [{ label: 'A', value: 100 }],
      options: { labels: 'none', showValues: false, grid: false, width: 320, height: 170 },
    }),
    empty: charts.bar({ items: [], options: { emptyText: '无记录' } }),
  };
  line('## 1. 8 接口产出快照（kind / empty / points / viewBox）');
  for (const [name, out] of Object.entries(fixtures)) {
    const vb = (out.html.match(/viewBox="([^"]+)"/) ?? [])[1] ?? '(空态无 viewBox)';
    line('- ' + name + ': kind=' + out.kind + ' empty=' + out.empty + ' points=' + out.points + ' viewBox=' + vb);
  }
  line();
  line('## 2. 关键产出片段（逐字段可观察效果）');
  const samples = {
    'line 路径 d（yMin0/yMax100, h210 → y=202-v/100*194）': (fixtures.line.html.match(/class="ilife-charts-line" d="([^"]*)"/) ?? [])[1],
    'bar stacked 段（percent：A 合计 2）': (fixtures.barStacked.html.match(/<rect class="ilife-charts-seg"[^>]*data-seg="1"[^>]*>/) ?? [])[0],
    'donut 弧 dasharray': (fixtures.donut.html.match(/stroke-dasharray="([^"]*)"/) ?? [])[1],
    'progress 收敛 data-pct + 渐变': (fixtures.progress.html.match(/data-pct="([^"]*)"/) ?? [])[1] + ' / linearGradient=' + fixtures.progress.html.includes('<linearGradient'),
    'gauge 前景弧 d': (fixtures.gauge.html.match(/class="ilife-charts-gauge-fg" d="([^"]*)"/) ?? [])[1],
    'scatter 回归线端点': (fixtures.scatter.html.match(/class="ilife-charts-regression"[^>]*y1="([^"]*)"[^>]*y2="([^"]*)"/) ?? []).slice(1).join(' → '),
    'sparkline 涨绿': (fixtures.sparkline.html.match(/stroke="([^"]*)"/) ?? [])[1],
    'combo 柱（共享域无 padding → 10/100*154 = 15.4）': (fixtures.combo.html.match(/class="ilife-charts-bar"[^>]*height="([^"]*)"/) ?? [])[1],
    '空态文本': (fixtures.empty.html.match(/empty-text">([^<]*)</) ?? [])[1],
  };
  for (const [k, v] of Object.entries(samples)) line('- ' + k + ': ' + v);
  line();
  line('## 3. 冻结常量（逐值）');
  line('- CHART_KINDS: ' + JSON.stringify([...CHART_KINDS]));
  line('- CHARTS_STYLE_ID: ' + CHARTS_STYLE_ID);
  line('- CHART_STRUCTURE_RULE / CHART_EMPTY_RULE / CHART_COORD_RULE: ' + CHART_STRUCTURE_RULE + ' / ' + CHART_EMPTY_RULE + ' / ' + CHART_COORD_RULE);
  line('- CHART_BREAKPOINTS: ' + JSON.stringify({ ...CHART_BREAKPOINTS }));
  line('- CHART_PALETTE: ' + JSON.stringify([...CHART_PALETTE]));
  line('- CHART_ERROR_CODES: ' + JSON.stringify([...CHART_ERROR_CODES]));
  line('- ACTION_ID_ATTR: ' + ACTION_ID_ATTR);
  line('- SHARED_HELPERS_JS_RULE: ' + JSON.stringify({ ...SHARED_HELPERS_JS_RULE }));
  line();
  line('## 4. A1b 返修点自证（逐条可观察效果）');
  const BAR_FIXED = { width: 320, height: 170, labels: 'none', showValues: false, grid: false };
  const SCATTER_FIXED = { width: 320, height: 180, labels: 'none', grid: false };
  const bar = charts.bar({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }], options: BAR_FIXED }).html;
  const bars = attrsOf(bar, 'rect', P + 'charts-bar');
  line('- 01 bar 域无 padding：柱底 ' + bars.map((b) => Number(b.y) + Number(b.height)).join('/')
    + '（绘图区底 162）／柱高 ' + bars.map((b) => b.height).join('/') + '（绘图区高 154）');
  const absTotals = charts.bar({
    items: [{ label: 'A', values: [1, 2], value: 3 }, { label: 'B', values: [3, 1], value: 4 }],
    options: { ...BAR_FIXED, stacked: true, stackMode: 'absolute', showValues: true },
  }).html;
  line('- 04 absolute 合计标签 y：' + attrsOf(absTotals, 'text', P + 'charts-value-total').map((t) => t.y).join('/') + '（同尺度 = 52.5/17.0）');
  const sc20 = attrsOf(charts.scatter({ items: [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 2 }], options: { ...SCATTER_FIXED, dotSize: 20 } }).html, 'circle', P + 'charts-dot');
  line('- 02 scatter dotSize:20 → r=' + sc20[0].r + ' / style=' + sc20[0].style
    + '（缺省 style=' + attrsOf(charts.scatter({ items: [{ x: 0, y: 0 }], options: SCATTER_FIXED }).html, 'circle', P + 'charts-dot')[0].style + '）');
  const hl = charts.line({
    items: [{ label: 'A', value: 0 }, { label: 'B', value: 50 }, { label: 'C', value: 100 }],
    options: { width: 320, height: 210, labels: 'none', showValues: false, grid: false, highlightLast: true },
  }).html;
  line('- 03 highlightLast + showValues:false → 末值标签数 ' + countOf(hl, P + 'charts-value-last') + '（门控生效；showValues:true 时为 1）');
  const avgSeries = charts.line({
    items: [1, 2, 3, 4, 5].map((v, i) => ({ label: String(i), value: v })),
    options: {
      width: 320, height: 210, labels: 'none', showValues: false, grid: false, yMin: 1, yMax: 5, avgLine: 3,
      series: [{ name: '甲', items: [1, 2, 3, 4, 5].map((v, i) => ({ label: String(i), value: v })) }],
    },
  }).html;
  line('- 05 avgLine + 单条 series → chart-avg 数 ' + countOf(avgSeries, P + 'charts-avg') + '（不叠加）');
  const barSelect = charts.bar({
    items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }, { label: 'C', value: 9 }, { label: 'D', value: 3 }, { label: 'E', value: 4 }],
    options: { ...BAR_FIXED, labels: 'select' },
  }).html;
  line('- 06 bar labels:select → X 标签 ' + JSON.stringify(textsOf(barSelect, P + 'charts-xlabel')) + '（旧语义 = 首尾）');
  const aspect = (html) => attrOf(tagsOf(html, 'svg')[0], 'preserveAspectRatio');
  line('- 07 preserveAspectRatio：line ' + aspect(fixtures.line.html) + ' / combo ' + aspect(fixtures.combo.html)
    + ' / scatter ' + aspect(fixtures.scatter.html) + ' / bar ' + aspect(charts.bar({ items: [{ label: 'A', value: 1 }] }).html));
  line('- 08 progress svg 内联高度：' + attrOf(tagsOf(charts.progress({ pct: 50 }).html, 'svg')[0], 'style')
    + '（height:20 → ' + attrOf(tagsOf(charts.progress({ pct: 50, options: { height: 20 } }).html, 'svg')[0], 'style') + '）');
  const css = buildChartsHelpersJs();
  line('- 09 CSS 字号规则：tick 9.5px=' + css.includes('.' + P + 'charts-tick{font-size:9.5px}')
    + '／gauge-value 26px=' + css.includes('.' + P + 'charts-gauge-value{font-size:26px;font-weight:800}')
    + '／center-value 13px=' + css.includes('.' + P + 'charts-center-value{font-size:13px;font-weight:700}'));
  line('- 10 donut 百分比取整：' + JSON.stringify([...charts.donut({ items: [{ label: 'A', value: 1 }, { label: 'B', value: 2 }] }).html.matchAll(/charts-legend-pct">([^<]*)</g)].map((m) => m[1])));
  const g1 = charts.progress({ pct: 40, options: { gradient: true } }).html;
  const g2 = charts.progress({ pct: 40, options: { gradient: true } }).html;
  const g3 = charts.progress({ pct: 40, options: { gradient: true, color: '#123456' } }).html;
  const gradId = (h) => (h.match(/<linearGradient id="([^"]*)"/) ?? [])[1];
  line('- 11 渐变 id 确定性：' + gradId(g1) + ' / ' + gradId(g2) + '（逐字节相同 ' + (g1 === g2) + '）／换色 → ' + gradId(g3));
  const throws = (fn) => { try { fn(); return 'NO-THROW'; } catch (err) { return err.name + '/' + err.code; } };
  line('- 12 multi 缺 value → ' + throws(() => charts.bar({ items: [{ label: 'A', values: [1, 2] }], options: { stacked: true } }))
    + '／value:null → ' + throws(() => charts.bar({ items: [{ label: 'A', value: null, values: [1, 2] }], options: { stacked: true } })));
  line('- 14 CSS 以 JSON 字面量嵌入：' + (() => {
    const lit = (css.match(/^  var CSS = (.*);$/m) ?? [])[1];
    return lit.startsWith('"') && lit === JSON.stringify(JSON.parse(lit));
  })() + '（敌意 prefix x";y 引号转义：' + buildChartsHelpersJs({ prefix: 'x";y' }).includes('\\"') + '）');
  line('- 15 派表 satisfies ChartDispatch（无 as 断言）：' + !readFileSync(SRC, 'utf8').includes('}) as ChartsApi;'));
  line('- 16 scatter 缺省 Y 刻度：' + textsOf(fixtures.scatter.html, P + 'charts-tick').join('/') + '（4 条）');
  const allHtml = Object.values(fixtures).map((o) => o.html).join('');
  line('- 13 类名命名空间：产出 class="' + P + 'charts 命中 ' + countOf(allHtml, 'class="' + P + 'charts')
    + '／残留 class="' + P + 'chart" 命中 ' + countOf(allHtml, 'class="' + P + 'chart"')
    + '／残留 ' + P + 'chart- 命中 ' + countOf(allHtml, P + 'chart-')
    + '／CSS 根类 .' + P + 'charts{ 命中 ' + countOf(css, '.' + P + 'charts{')
    + '／' + P + 'chartss 命中 ' + countOf(css, P + 'chartss')
    + '／CHARTS_STYLE_ID=' + CHARTS_STYLE_ID);
  line();
  line('## 5. 纯度扫描（产出 HTML 与 helpers JS）');
  const htmls = Object.values(fixtures).map((o) => o.html);
  const js = buildChartsHelpersJs();
  const code = js.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const needles = ['<canvas', '<script', 'onclick=', 'node:', 'http://', 'https://'];
  for (const needle of needles) {
    const hits = htmls.reduce((n, h) => n + h.split(needle).length - 1, 0);
    line('- HTML 含 ' + needle + '：' + hits + ' 次');
  }
  line('- helpers JS：node: ' + /(?:from|import\s*\(|require\s*\(|import)\s*['"]node:/.test(code)
    + '／隐式全局赋值 ' + /\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/.test(code)
    + '／import|export ' + /\b(?:import|export)\b/.test(code)
    + '／DOM 读取 ' + code.includes('document.'));
  line();
  line('## 6. 幂等自注入自证（假 DOM 连跑三次）');
  const fake = () => {
    const store = new Map();
    const head = { children: [], appendChild(node) { this.children.push(node); store.set(node.id, node); return node; } };
    return { head, getElementById: (id) => (store.has(id) ? store.get(id) : null), createElement: (t) => ({ tagName: t, id: '', textContent: '' }), addEventListener: () => {} };
  };
  const doc = fake();
  const run = new Function('document', js);
  run(doc); run(doc); run(doc);
  line('- 注入 3 次后的 <style> 数：' + doc.head.children.length + '（期望 1）');
  line('- <style> id：' + doc.head.children[0].id + '（期望 ' + CHARTS_STYLE_ID + '）');
  line('- 覆盖 styleId：' + (() => { const d = fake(); new Function('document', buildChartsHelpersJs({ styleId: 'x' }))(d); return d.head.children[0].id; })());
  line('- 覆盖 prefix：' + (() => { const d = fake(); new Function('document', buildChartsHelpersJs({ prefix: 'y-' }))(d); return d.head.children[0].textContent.slice(0, 12); })());
  line('- kind-unknown 可达：' + (() => { try { charts['pie']({}); return 'no-throw'; } catch (err) { return err.name + '/' + err.code + '（' + (err instanceof ChartError) + '）'; } })());
  line('- 空态 data-chart-empty：' + fixtures.empty.html.includes('data-chart-empty="1"'));
  line('- vector-effect 出现次数（line）：' + countOf(fixtures.line.html, 'vector-effect="non-scaling-stroke"'));
  line('- 容器零 padding（CSS 文本）：' + buildChartsHelpersJs().includes('.' + P + 'charts{position:relative;margin:0;padding:0;'));
  line();
  line('## 7. dist 产物');
  line('- dist/charts.js 存在：' + existsSync(DIST) + '（' + (existsSync(DIST) ? readFileSync(DIST, 'utf8').length : 0) + ' 字节）');
  line('- src/charts.ts 行数：' + readFileSync(SRC, 'utf8').split(LF).length);
  line('- test/charts.test.mjs 行数：' + readFileSync(join(ROOT, TEST), 'utf8').split(LF).length);
}

/* ── 模式 2：变异测试自证 ─────────────────────────────────────────────── */

const MUTATIONS = [
  {
    id: 'M1 yTicks 收敛上下界',
    why: '把 `Math.max(2, Math.min(6, …))` 放宽为 1..9',
    from: 'return Math.max(2, Math.min(6, Math.round(value)));',
    to: 'return Math.max(1, Math.min(9, Math.round(value)));',
    expect: 'B.yTicks',
  },
  {
    id: 'M2 共享域 6% padding',
    why: '把折线/散点的 6% 外扩改成 10%',
    from: 'const pad = (hi - lo) * padRatio;',
    to: 'const pad = (hi - lo) * 0.1;',
    expect: 'B.yTicks',
  },
  {
    id: 'M3 stacked × grouped 优先级',
    why: '把多值分支的「先判 stacked」改成「先判 grouped」',
    from: '    const values = item.values as readonly number[];\n    const total = values.reduce((a, b) => a + b, 0);\n    if (stacked) {',
    to: '    const values = item.values as readonly number[];\n    const total = values.reduce((a, b) => a + b, 0);\n    if (grouped) {',
    expect: 'C.stacked × C.grouped',
  },
  {
    id: 'M4 connectNulls 跨空',
    why: '把 `polyPath` 的 connect 分支短路',
    from: 'function polyPath(pts: readonly Pt[], connect: boolean): string {\n  if (connect) {',
    to: 'function polyPath(pts: readonly Pt[], connect: boolean): string {\n  if (connect && false) {',
    expect: 'B.connectNulls',
  },
  {
    id: 'M5 fillBetween 越界校验',
    why: '删掉 a/b 越界抛错',
    from: '    if (ia < 0 || ia >= seriesPts.length || ib < 0 || ib >= seriesPts.length) {',
    to: '    if (false) {',
    expect: 'B.fillBetween',
  },
  {
    id: 'M6 空态 empty/points 口径',
    why: '把空态 points 由 0 改成 1',
    from: '  return { kind, html, empty: true, points: 0 };',
    to: '  return { kind, html, empty: true, points: 1 };',
    expect: 'H.ChartOutput',
  },
  {
    id: 'M7 ownScale 不参与共享域',
    why: '让 ownScale 序列并入共享域',
    from: '    if (s.ownScale) continue;\n    for (const item of s.items) if (item.value !== null) sharedValues.push(item.value);',
    to: '    for (const item of s.items) if (item.value !== null) sharedValues.push(item.value);',
    expect: 'B.series[].ownScale',
  },
  {
    id: 'M8 markPoint 缺省最大值点',
    why: '把「取最大」改成「取最小」',
    from: '        if (item.value !== null && (best === null || item.value > best)) {',
    to: '        if (item.value !== null && (best === null || item.value < best)) {',
    expect: 'B.markPoint',
  },
  {
    id: 'M9 actionId 属性名',
    why: '把 ACTION_ID_ATTR 写错',
    from: 'function actionAttrs(common: ResolvedCommon, index?: number): string {\n  let out = \'\';\n  if (common.actionId !== undefined) out += \' \' + ACTION_ID_ATTR + \'="\' + esc(common.actionId) + \'"\';',
    to: 'function actionAttrs(common: ResolvedCommon, index?: number): string {\n  let out = \'\';\n  if (common.actionId !== undefined) out += \' data-action=\\\"\' + esc(common.actionId) + \'"\';',
    expect: 'A.actionId',
  },
  {
    id: 'M10 段取色顺序',
    why: 'segColorFor 取色偏移 1',
    from: '  return CHART_PALETTE[index % CHART_PALETTE.length];\n}',
    to: '  return CHART_PALETTE[(index + 1) % CHART_PALETTE.length];\n}',
    expect: 'H.CHART_PALETTE',
  },
  {
    id: 'M11 grouped 子柱间距',
    why: '把冻结的 3px 间距改成 5',
    from: '  const gap = CHART_BREAKPOINTS.stackedGapPx;',
    to: '  const gap = 5;',
    expect: 'C.grouped',
  },
  {
    id: 'M12 helpers JS 幂等早退',
    why: '删掉 `getElementById` 幂等早退',
    from: "    '    if (document.getElementById(STYLE_ID)) return;',",
    to: "    '    if (false) return;',",
    expect: 'H.buildChartsHelpersJs',
  },
  {
    id: 'M13 覆盖清单绑定性（改测试标题）',
    why: '把 A.compact 用例标题改名 → 覆盖清单必须红（证明它不是恒真断言）',
    file: 'test',
    from: "it('A.compact：内边距收紧 → 首点 x 由 14.0 收到 6.0'",
    to: "it('X.compact：内边距收紧 → 首点 x 由 14.0 收到 6.0'",
    expect: 'H.覆盖清单',
  },
  /* ── A1b 本轮新增（覆盖 FX-78-A1b-01/02/03/04/05/06/07/09/10/11/12/15/16） ── */
  {
    id: 'M14【01】单柱域 padding 回归 6%',
    why: '把单柱分支的 `domainOf(..., 0)` 改回默认 6%',
    from: '    const values = items.map((item) => item.value as number);\n    const [dlo, dhi] = domainOf(values, common.yMin, common.yMax, true, 0);',
    to: '    const values = items.map((item) => item.value as number);\n    const [dlo, dhi] = domainOf(values, common.yMin, common.yMax, true);',
    expect: 'C.缺省',
  },
  {
    id: 'M15【01】combo 域 padding 回归 6%',
    why: '把 combo 的 `domainOf(..., 0)` 改回默认 6%',
    from: '  const [lo, hi] = domainOf(values, common.yMin, common.yMax, true, 0);',
    to: '  const [lo, hi] = domainOf(values, common.yMin, common.yMax, true);',
    expect: 'F.combo 共享域',
  },
  {
    id: 'M16【02】scatter 显式 dotSize 去掉内联样式',
    why: '只留 SVG 呈现属性 r（会被 CSS 几何属性覆盖）',
    from: '      + \'" r="\' + dotSize / 2 + \'"\' + (dotSizeExplicit ? \' style="r:\' + dotSize / 2 + \'"\' : \'\')',
    to: '      + \'" r="\' + dotSize / 2 + \'"\'',
    expect: 'G.dotSize',
  },
  {
    id: 'M17【05】avgLine 判据回到 series.length',
    why: '把「未传 series」改回「series 长度 !== 1」',
    from: '  const avgWindow = line.avgLine === undefined || line.series !== undefined',
    to: '  const avgWindow = line.avgLine === undefined || series.length !== 1',
    expect: 'B.avgLine',
  },
  {
    id: 'M18【06】bar select 回到「首+峰值+尾」',
    why: '去掉 bar 专用的 select=edge 口径',
    from: "    + xLabelsSvg(common, frame, items, 'edge')",
    to: '    + xLabelsSvg(common, frame, items)',
    expect: 'C.labels',
  },
  {
    id: 'M19【11】渐变 id 回到跨调用漂移',
    why: '用随机值代替「由渐变参数派生」的稳定 id',
    from: "    const id = STYLE_PREFIX + 'charts-grad-' + hash32(color + '|' + CHART_PALETTE[5]);",
    to: "    const id = STYLE_PREFIX + 'charts-grad-' + String(Math.random());",
    expect: 'E.gradient',
  },
  {
    id: 'M20【12】multi 模式 value 校验关掉',
    why: '让 values 模式不再要求 `value`（回到旧 `_barMulti` 宽松行为）',
    from: '      if (!isNum(value)) {\n        badStructure(field + \'.value 无效（缺省/非数字）: \' + JSON.stringify(value === undefined ? null : value));\n      }\n      if (!Array.isArray(item.values) || item.values.length === 0) badStructure(field + \'.values 必须是非空数组\');',
    to: '      if (false) {\n        badStructure(field + \'.value 无效（缺省/非数字）: \' + JSON.stringify(value === undefined ? null : value));\n      }\n      if (!Array.isArray(item.values) || item.values.length === 0) badStructure(field + \'.values 必须是非空数组\');',
    expect: 'C.values[]',
  },
  {
    id: 'M21【03】highlightLast 门控去掉',
    why: '末值标签回到无条件追加',
    from: "      if (line.showValues !== false || line.labels === 'select') {",
    to: '      if (true) {',
    expect: 'B.highlightLast',
  },
  {
    id: 'M22【04】absolute 合计标签回到 yAt(带 padding 域)',
    why: '把同尺度柱顶改回 `yAt(frame, total, lo, hi)`',
    from: "        const top = stackMode === 'percent' ? frame.y0 : frame.y1 - total * unit;",
    to: "        const top = stackMode === 'percent' ? frame.y0 : Math.min(yZero, yAt(frame, total, lo, hi));",
    expect: 'C.stackMode',
  },
  {
    id: 'M23【07】line 的 preserveAspectRatio 回到 meet',
    why: '移动端 150px 高度下会等比缩放留白',
    from: "    + svgOpen(line, undefined, 'none')",
    to: '    + svgOpen(line)',
    expect: 'H.移动端满宽',
  },
  {
    id: 'M24【10】donut 百分比回到 round2',
    why: '把 `Math.round` 改回两位小数',
    from: "            + Math.round((value / total) * 100) + '%</span>' : '') + '</span>';",
    to: "            + round2((value / total) * 100) + '%</span>' : '') + '</span>';",
    expect: 'D.showPercent',
  },
  {
    id: 'M25【16】scatter Y 刻度去掉',
    why: '删掉 scatter 的 ticksSvg 调用',
    from: '    + ticksSvg(frame, ylo, yhi, SCATTER_Y_TICKS, common.format)',
    to: "    + ''",
    expect: 'G.yTicks',
  },
  {
    id: 'M26【09】字号规则改错一条',
    why: '把 tick 的 9.5px 改成 9px',
    from: "    '.' + p + 'charts-tick{font-size:9.5px}',",
    to: "    '.' + p + 'charts-tick{font-size:9px}',",
    expect: 'H.图表文本字号',
  },
  {
    id: 'M27【15】派表键错配（编译期红）',
    why: '把 progress 挂到 renderBar（入参类型不兼容）→ tsc 必须报错',
    kind: 'compile',
    from: '  progress: renderProgress,',
    to: '  progress: renderBar,',
    expect: '(编译期)',
  },
  /* ── A1b 追加（FX-78-A1b-13：类名命名空间） ── */
  {
    id: 'M28【13】根类改回 ilife-chart',
    why: '把容器根类改回单数（产出里就不再出现 class="ilife-charts）',
    from: "  const cls = [STYLE_PREFIX + 'charts'];",
    to: "  const cls = [STYLE_PREFIX + 'chart'];",
    expect: 'H.类名命名空间',
  },
  {
    id: 'M29【13】CSS 根类改回 .ilife-chart{',
    why: '把样式根类规则改回单数',
    from: "    '.' + p + 'charts{position:relative;margin:0;padding:0;box-sizing:border-box;",
    to: "    '.' + p + 'chart{position:relative;margin:0;padding:0;box-sizing:border-box;",
    expect: 'H.类名命名空间',
  },
  {
    id: 'M30【13】单个类名残留 ilife-chart-line',
    why: '把折线类名改回单数（产出出现 ilife-chart- 精确形态）',
    from: "      pathsSvg += '<path class=\"' + STYLE_PREFIX + 'charts-line'",
    to: "      pathsSvg += '<path class=\"' + STYLE_PREFIX + 'chart-line'",
    expect: 'H.类名命名空间',
  },
];

function mutate() {
  const SRC_TEST = join(ROOT, TEST);
  const rows = [];
  line('## 变异测试自证（' + MUTATIONS.length + ' 处）');
  line('基线：先确认原实现全绿。');
  build();
  const base = runTests();
  line('- 基线：pass=' + base.pass + ' fail=' + base.failed.length + (base.failed.length ? ' → ' + base.failed.join(', ') : ''));
  if (base.failed.length > 0 || base.pass < 70) {
    line('基线非全绿（或 pass 计数异常），终止变异自证。');
    process.exitCode = 1;
    return;
  }
  for (const m of MUTATIONS) {
    const target = m.file === 'test' ? SRC_TEST : SRC;
    const original = readFileSync(target, 'utf8');
    let compileOk = true;
    let compileErrors = '';
    let result = { pass: 0, failed: [] };
    try {
      if (!original.includes(m.from)) {
        rows.push({ id: m.id, status: 'PATTERN-NOT-FOUND', expect: m.expect, red: [] });
        continue;
      }
      writeFileSync(target, original.replace(m.from, m.to));
      const mutated = buildSafe();
      compileOk = mutated.ok;
      compileErrors = mutated.errors;
      if (compileOk) result = runTests();
      const red = result.failed;
      const hit = red.some((name) => name.includes(m.expect));
      rows.push({
        id: m.id,
        status: compileOk
          ? (hit ? 'RED(命中期望)' : 'RED(未命中期望)')
          : (compileErrors.includes('charts.ts') ? 'COMPILE-RED(本次变异)' : 'BLOCKED(外部文件编译错误)'),
        expect: m.expect,
        red: compileOk ? red : [compileErrors.trim().split(LF)[0]],
      });
    } finally {
      writeFileSync(target, original);
    }
    const restoredBuild = buildSafe();
    if (!restoredBuild.ok) {
      rows.push({ id: m.id + ' · 还原后', status: 'BUILD-FAIL(外部)：' + restoredBuild.errors.trim().split(LF)[0], expect: m.expect, red: [] });
      continue;
    }
    const restored = runTests();
    rows.push({ id: m.id + ' · 还原后', status: restored.failed.length === 0 ? 'GREEN' : 'STILL-RED', expect: m.expect, red: restored.failed });
  }
  line();
  line('| 变异 | 期望命中用例 | 结果 | 红掉的用例 |');
  line('|---|---|---|---|');
  for (const r of rows) {
    line('| ' + r.id + ' | ' + r.expect + ' | ' + r.status + ' | ' + (r.red.length ? r.red.join('；') : '—') + ' |');
  }
  line();
  line('原始失败名单（JSON，供核对）：');
  for (const r of rows) line('- ' + r.id + ': ' + JSON.stringify(r.red));
  const expectedFor = (id) => {
    const m = MUTATIONS.find((x) => id.startsWith(x.id));
    return m !== undefined && m.kind === 'compile' ? 'COMPILE-RED(本次变异)' : 'RED(命中';
  };
  const mutatedRows = rows.filter((r) => !r.id.includes('还原后'));
  const allGood = mutatedRows.every((r) => r.status.startsWith(expectedFor(r.id)))
    && rows.filter((r) => r.id.includes('还原后')).every((r) => r.status === 'GREEN');
  line();
  line('变异自证结论：' + (allGood ? 'PASS（每处改错都红在期望用例，还原后全绿）' : 'FAIL（见上表）'));
  if (!allGood) process.exitCode = 1;
}

if (process.argv.includes('--mutate')) mutate();
else snapshot();
