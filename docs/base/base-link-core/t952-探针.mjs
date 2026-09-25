#!/usr/bin/env node
/** #952 对抗探针（随证据件入仓；跑法：`node docs/base/base-link-core/t952-探针.mjs`；仓根写死 `D:/ilife`，换机改 `REPO`）。
 *  P1 老形状行为「逐字节不变」——把**改前**的 envelope.ts（`0be75be3^`）取到仓外临时目录，
 *     与当刻 dist 并排跑：六个老形状的 createEnvelope JSON、parseEnvelope 回环、坏输入报文
 *     逐字节比对。差异一律打出来。
 *  P2 strict 门是否被放宽——当刻 base-paint 的 `fillTemplate({strict:true})` 喂一个 resultset 载荷，
 *     看它是抛 `strict-invalid` 还是放行；并打印 `STRICT_ENVELOPE_SHAPES` 成员。
 * 读数留档：`t952-探针-读数.txt`（P1 same=24 diff=0；P2 list 与 resultset 都放行）。
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = 'D:/ilife';
const TMP = join(process.env.TEMP || '/tmp', 't952-old');
mkdirSync(TMP, { recursive: true });

// ── 取出改前源码（只读 git），配一份当刻 dist 的 errors.js ──
const oldTs = join(TMP, 'envelope.ts');
if (!existsSync(oldTs)) {
  const src = execFileSync('git', ['-C', REPO, 'show', '0be75be3^:packages/base-link-core/src/envelope.ts'], { encoding: 'utf8' });
  writeFileSync(oldTs, src, 'utf8');
}
if (!existsSync(join(TMP, 'errors.js'))) {
  const errJs = execFileSync('git', ['-C', REPO, 'show', '0be75be3^:packages/base-link-core/src/errors.ts'], { encoding: 'utf8' });
  writeFileSync(join(TMP, 'errors.ts'), errJs, 'utf8');
}

const old = await import(pathToFileURL(oldTs).href);
const cur = await import(pathToFileURL(join(REPO, 'packages/base-link-core/dist/envelope.js')).href);

const GOOD = {
  list: { items: [{ a: 1 }], total: 1 },
  detail: { item: { id: 'x' } },
  stat: { metrics: { n: 3 } },
  receipt: { ok: true, message: 'done' },
  analysis: { summary: 's' },
  fallback: { reason: 'timeout', degraded: true },
};
const BAD = [
  ['list', {}], ['list', { items: [], total: 'x' }], ['detail', { item: null }], ['detail', { item: [] }],
  ['stat', { metrics: { n: 'x' } }], ['stat', { metrics: null }], ['receipt', { ok: true }],
  ['receipt', { ok: 1, message: 'x' }], ['analysis', { summary: '' }], ['fallback', { reason: 'r' }],
  ['fallback', { reason: '', degraded: true }], ['list', []],
];
const errOf = (fn) => { try { fn(); return '<NO-THROW>'; } catch (e) { return e.name + '|' + (e.code ?? '') + '|' + e.message; } };

let same = 0;
let diff = 0;
console.log('P1 老形状逐字节不变（改前 0be75be3^ vs 当刻 dist）');
for (const shape of Object.keys(GOOD)) {
  const mk = (m) => JSON.stringify(m.createEnvelope({ skill: 'calorie', shape, key: 'calorie.today', data: GOOD[shape] }));
  const round = (m) => JSON.stringify(m.parseEnvelope(JSON.parse(mk(m))));
  for (const [tag, a, b] of [
    ['createEnvelope', mk(old), mk(cur)],
    ['parseEnvelope 回环', round(old), round(cur)],
  ]) {
    const ok = a === b;
    ok ? same++ : diff++;
    console.log(`  ${ok ? 'SAME' : 'DIFF'} ${shape}/${tag}${ok ? '' : '\n    改前=' + a + '\n    当刻=' + b}`);
  }
}
console.log('P1 坏输入报文逐条比对');
for (const [shape, data] of BAD) {
  const a = errOf(() => old.createEnvelope({ skill: 'c', shape, key: 'c.today', data }));
  const b = errOf(() => cur.createEnvelope({ skill: 'c', shape, key: 'c.today', data }));
  const a2 = errOf(() => old.assertShapeData(shape, data));
  const b2 = errOf(() => cur.assertShapeData(shape, data));
  const ok = a === b && a2 === b2;
  ok ? same++ : diff++;
  console.log(`  ${ok ? 'SAME' : 'DIFF'} ${shape} ${JSON.stringify(data)}${ok ? '' : '\n    改前=' + a + ' / ' + a2 + '\n    当刻=' + b + ' / ' + b2}`);
}
console.log(`P1 RESULT: same=${same} diff=${diff}`);
console.log(`P1 形状表：改前=${JSON.stringify([...old.ENVELOPE_SHAPES])}`);
console.log(`P1 形状表：当刻=${JSON.stringify([...cur.ENVELOPE_SHAPES])}`);

// ── P2 strict 门 ──
const paint = await import(pathToFileURL(join(REPO, 'packages/base-render/dist/index.js')).href);
console.log('P2 STRICT_ENVELOPE_SHAPES=' + JSON.stringify([...paint.STRICT_ENVELOPE_SHAPES]));
const template = '<html><head><!--SHARED-CSS--></head><body><main><script id="payload" type="application/json"><!--INJECT-DATA--></script></main><!--SHARED-HELPERS--></body></html>';
const assets = { sharedCssText: 'body{color:#000}', sharedHelpersJs: 'var ilifeProbe=1;' };
const payload = (shape, data) => ({ version: '0.1.0', skill: 'calorie', shape, key: 'calorie.data.query', data });
for (const [shape, data] of [['list', { items: [] }], ['resultset', { results: [] }]]) {
  const r = errOf(() => paint.fillTemplate({ template, assets, data: payload(shape, data), strict: true }));
  console.log(`P2 strict:true shape=${shape} → ${r === '<NO-THROW>' ? '放行（未抛）' : r}`);
}
