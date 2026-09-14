// #431 独立对抗审查席探针（**只读**，不改任何工作区件）。
//
// 读法：`node docs/base/base-render/t431-review-probe.mjs`（仓根运行；读 `dist/`，先跑 `pnpm build` 或
// `pnpm -C packages/base-render exec tsc -b`）。每条读一行 `PROBE <编号> …读数=…`；末行给结论，读数与
// 预期不符即 exit 1。变异两条（改坏必红／改回必绿）不在本件：那是改工作区的动作，走
// `tooling/run-locked.mjs`，脚本与日志落 `.scratch/t431-review/`（见 t431-review-报告.md 机器证据段）。
//
// 本件对应的被审交付：提交 3e2a9b7（`packages/base-render/src/blocks.ts`／`test/page-viz-421.test.mjs`／
// `docs/base/base-render/t431-四件判据补硬.md`）。探针只做交叉核对：判据说的值是不是当刻产物的值、
// 允许清单收拒是不是真如注释所写、闭集是不是仍是 11＋12。
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const readText = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');
const loadDist = async (rel) => import(new URL(rel, ROOT).href);

const fails = [];
let checked = 0;

/** 一条读数：读数原样打出来（不只打成败）；`want` 不符即红。 */
function read(id, label, got, want) {
  checked += 1;
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails.push(id + ' ' + label + '：读数 ' + JSON.stringify(got) + ' ≠ 预期 ' + JSON.stringify(want));
  console.log('PROBE ' + id + ' ' + label + ' 读数=' + JSON.stringify(got) + (pass ? '' : ' ✖'));
}
/** 同上，预期由一个判定函数给（读数很长时用）。 */
function readOk(id, label, got, fn) {
  checked += 1;
  const pass = fn(got);
  if (!pass) fails.push(id + ' ' + label + '：读数 ' + JSON.stringify(got));
  console.log('PROBE ' + id + ' ' + label + ' 读数=' + JSON.stringify(got) + (pass ? '' : ' ✖'));
}
const lineOf = (text, needle) => text.slice(0, text.indexOf(needle)).split('\n').length;

const blocks = await loadDist('packages/base-render/dist/blocks.js');
const index = await loadDist('packages/base-render/dist/index.js');
const { BLOCK_STYLE_SECTIONS, blocksCss, renderMiniBar, renderDistributionRows, renderChips, renderChangeRows, BlocksError } = blocks;
const { CSS_VAR_TOKENS } = index;

const SRC = 'packages/base-render/src/blocks.ts';
const TEST = 'packages/base-render/test/page-viz-421.test.mjs';
const DOC = 'docs/base/base-render/t431-四件判据补硬.md';
const srcText = readText(SRC);
const testText = readText(TEST);
const docText = readText(DOC);
const css = blocksCss();

/** 规则体（`{` 与 `}` 之间）。 */
const ruleBody = (cls) => new RegExp('\\.' + cls + ' \\{([^}]*)\\}').exec(css)[1];
/** 规则体逐条声明。 */
const ruleDecls = (cls) => ruleBody(cls).split(';').map((d) => d.trim()).filter((d) => d !== '');
/** 规则体里某条声明的值。 */
const ruleDecl = (cls, prop) => {
  const hit = ruleDecls(cls).find((d) => d.startsWith(prop + ':'));
  return hit === undefined ? undefined : hit.slice(prop.length + 1).trim();
};
/** 产物里的色值字面量（与判据同一支正则）。 */
const literals = (html) => [...html.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)].map((m) => m[0]);

// ── P1 判据条数（既有 22 条不许删，现 27 条）────────────────────────────────────────
const itTitles = [...testText.matchAll(/^\s*it\('([^']+)'/gm)].map((m) => m[1]);
read('P1.a', '判据条数（`it(`）', itTitles.length, 27);
console.log('PROBE P1.b 判据清单 读数=' + JSON.stringify(itTitles));

// ── P2 甲法三处说法（实现注释／判据名／证据件）＋判据真钉住「缺省产物零色值字面量」──
const srcLine = lineOf(srcText, '色值口径（#431 定稿）');
read('P2.a', '实现注释 ' + SRC + ':' + srcLine + ' 同口径',
  ['区块自身不写死任何色值字面量', '缺省色走冻结 token'].every(
    (p) => srcText.split('\n').slice(srcLine - 1, srcLine + 3).join('').includes(p)), true);
const nameLine = lineOf(testText, '不给色值 → 填充只有宽度一条声明');
read('P2.b', '判据名 ' + TEST + ':' + nameLine + '（判据 3 见 ' + lineOf(testText, '3. 色值口径（甲法') + '）',
  ['缺省填充色走样式段冻结 token', '产物零色值字面量'].every((p) => testText.includes(p)), true);
const docLine = lineOf(docText, '缺省填充色走样式段冻结 token');
read('P2.c', '证据件 ' + DOC + ':' + docLine + ' 同口径',
  ['甲法', '缺省填充色走样式段冻结 token', '缺省产物零色值字面量'].every((p) => docText.includes(p)), true);

const defaults = [
  renderMiniBar({ pct: 42 }),
  renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 42 }] }),
  renderChips({ items: [{ text: '甲' }] }),
  renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2' }] }),
];
read('P2.d', '四件缺省产物色值字面量', defaults.map(literals), [[], [], [], []]);
const FILL_VAR = 'var(--blue)';
read('P2.e', '两条 -fill 规则缺省色（样式段）',
  [ruleDecl('ilife-block-mini-bar-fill', 'background'), ruleDecl('ilife-block-dist-row-fill', 'background')],
  [FILL_VAR, FILL_VAR]);
read('P2.f', '缺省填充内联声明（只宽度一条）', defaults[0].match(/style="([^"]*)"/)[1], 'width:42%');

// ── P3 色值允许清单：六种写法收＋逐字透传；清单外拒 ───────────────────────────────
const bgOf = (color) => renderMiniBar({ pct: 42, color })
  .match(/ilife-block-mini-bar-fill[^>]*style="([^"]*)"/)[1].replace('width:42%;', '').replace(/^background:/, '');
const ACCEPT = ['#f00', '#ff0000', 'rgb(1,2,3)', 'rgba(1,2,3,.5)', 'var(--blue)', 'tomato'];
read('P3.a', '清单内六种写法逐字透传', ACCEPT.map(bgOf), ACCEPT);
read('P3.b', '裸冻结 token 名包 var()', bgOf('--blue'), 'var(--blue)');
read('P3.c', '引用到的 token 名都在冻结集内', ['--blue'].every((n) => Object.hasOwn(CSS_VAR_TOKENS, n)), true);
const reject = (color) => {
  try {
    renderMiniBar({ pct: 42, color });
    return '未抛（收了）';
  } catch (err) {
    return err instanceof BlocksError && err.code === 'bad-input' ? 'bad-input' : '其它错误：' + String(err && err.code);
  }
};
const REJECT = [
  ['`;` 注入', 'red;background:url(https://x/a.png)'],
  ['`expression(`', 'expression(alert(1))'],
  ['`url(`', 'url(https://x/a.png)'],
  ['未定义 token 名', '--nope'],
  ['未定义 token 名的 var()', 'var(--nope)'],
  ['具名色带尾注', 'tomato/*'],
  ['八位十六进制', '#ff000080'],
  ['数字串', '7'],
  ['空串', ''],
];
read('P3.d', '清单外一律 bad-input：' + REJECT.map(([l]) => l).join('／'),
  REJECT.map(([, v]) => reject(v)), REJECT.map(() => 'bad-input'));
read('P3.e', '非串色值（数字 7）', reject(7), 'bad-input');
read('P3.f', '分布条行逐行色值同一把尺子（--nope）', (() => {
  try {
    renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 10, color: '--nope' }] });
    return '未抛（收了）';
  } catch (err) { return err && err.code; }
})(), 'bad-input');

// ── P4 样式快照：13 类声明数＋判据表里的 17 条关键属性 == 当刻产物 ─────────────────
const consts = {};
for (const m of testText.matchAll(/^const ([A-Z][A-Z_0-9]*) = (.+);$/gm)) {
  const rhs = m[2].trim();
  const lit = /^'([^']*)'$/.exec(rhs);
  if (lit !== null) { consts[m[1]] = lit[1]; continue; }
  const cat = /^([A-Z][A-Z_0-9]*) \+ '([^']*)'$/.exec(rhs);
  if (cat !== null && consts[cat[1]] !== undefined) consts[m[1]] = consts[cat[1]] + cat[2];
}
/** 判据文件里某张表（`keyword` 起到 `];` 止）按正则取行。 */
const table = (keyword, pattern) => {
  const body = testText.slice(testText.indexOf(keyword));
  return [...body.slice(0, body.indexOf('];')).matchAll(pattern)].map((m) => m.slice(1));
};
const counts = table('const counts = [', /\[([A-Z][A-Z_0-9]*), (\d+), (\d+)\]/g)
  .map(([ref, measured, floor]) => [consts[ref] ?? ref, Number(measured), Number(floor)]);
read('P4.a', '13 类声明数下限表条数', counts.length, 13);
read('P4.b', '13 类当刻声明数（对表列实测值）', counts.map(([cls]) => ruleDecls(cls).length),
  counts.map(([, m]) => m));
readOk('P4.c', '13 类声明数 ≥ 表列下限', counts.map(([cls]) => ruleDecls(cls).length),
  (got) => got.every((n, i) => n >= counts[i][2]));
const snap = table('const snapshot = [', /\[([A-Z][A-Z_0-9]*), '([^']+)', ('[^']*'|[A-Z][A-Z_0-9]*)\]/g)
  .map(([ref, prop, want]) => [consts[ref] ?? ref, prop,
    want.startsWith("'") ? want.slice(1, -1) : (consts[want] ?? want)]);
read('P4.d', '关键属性快照条数', snap.length, 17);
readOk('P4.e', '判据快照值 == 当刻产物值（逐条）',
  snap.map(([cls, prop]) => cls + '.' + prop + '=' + String(ruleDecl(cls, prop))),
  (got) => snap.every(([cls, prop, want], i) => got[i] === cls + '.' + prop + '=' + want));
read('P4.f', '13 类规则体色值字面量', counts.map(([cls]) => literals(ruleBody(cls))), counts.map(() => []));

// ── P5 a11y 读数（有则逐条锚、没有则零读数）──────────────────────────────────────
const a11y = (html) => [...html.matchAll(/\s(?:role|aria-[a-z-]+)="[^"]*"/g)].map((m) => m[0].trim());
read('P5.a', '迷你条 a11y（含夹取后）', [a11y(renderMiniBar({ pct: 42 })), a11y(renderMiniBar({ pct: 120 }))],
  [['role="img"', 'aria-label="42%"'], ['role="img"', 'aria-label="100%"']]);
read('P5.b', '变更行箭头 a11y 三态', [undefined, true, false].map((arrow) =>
  a11y(renderChangeRows({ rows: [{ label: '甲', before: '1', after: '2', arrow }] }))),
  [['aria-hidden="true"'], ['aria-hidden="true"'], ['aria-hidden="true"']]);
read('P5.c', '分布条行／徽章 a11y 读数（零）', [
  a11y(renderDistributionRows({ rows: [{ label: '甲', value: '1', pct: 42 }] })),
  a11y(renderChips({ items: [{ text: '甲' }] })),
], [[], []]);

// ── P6 空态口径（[] 与 undefined 两种）────────────────────────────────────────────
const threw = (fn) => {
  try { fn(); return false; } catch (err) { return err instanceof BlocksError && err.code === 'bad-input'; }
};
read('P6.a', '空数组 → 空串（三件）', [
  renderDistributionRows({ rows: [] }), renderChips({ items: [] }), renderChangeRows({ rows: [] }),
], ['', '', '']);
read('P6.b', '缺失（undefined）→ bad-input（三件＋迷你条缺 input）', [
  threw(() => renderDistributionRows({ rows: undefined })), threw(() => renderChips({ items: undefined })),
  threw(() => renderChangeRows({ rows: undefined })), threw(() => renderMiniBar()),
], [true, true, true, true]);

// ── P7 闭集（11 冻结 token／12 区）＋样式段 var() 只引冻结名 ───────────────────────
read('P7.a', '冻结 token 个数', Object.keys(CSS_VAR_TOKENS).length, 11);
console.log('PROBE P7.b 冻结 token 名单 读数=' + JSON.stringify(Object.keys(CSS_VAR_TOKENS)));
read('P7.c', '12 区样式闭集个数', BLOCK_STYLE_SECTIONS.length, 12);
console.log('PROBE P7.d 12 区名单 读数=' + JSON.stringify(BLOCK_STYLE_SECTIONS));
read('P7.e', '样式段 var() 引用名里不在冻结集内的', [...new Set([...css.matchAll(/var\((--[A-Za-z0-9-]+)\)/g)]
  .map((m) => m[1]))].filter((n) => !Object.hasOwn(CSS_VAR_TOKENS, n)), []);

console.log('PROBE 结论 ' + (fails.length === 0 ? 'PASS' : 'FAIL') + ' 检查 ' + checked + ' 条，红 '
  + fails.length + ' 条' + (fails.length === 0 ? '' : '\n' + fails.join('\n')));
process.exit(fails.length === 0 ? 0 : 1);
