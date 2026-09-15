/** #448 独立对抗审查探针（票号 #448；写集允许路径之一）。
 *
 * 这不是实施席那条测试的抄写：本探针**不看金标**、不读改前留档，只按票面三条判据的**可判形状**
 * 在当刻 `dist/` 上独立取值，另外把两条容易漏的负向面也钉住：
 *   A. 版面根恰一次（点名：整段标记 `<section class="ilife-block ilife-block-page-shell ilife-page-printable">`
 *      在整篇里恰出现 1 次，且它自己就是版面根），且**别处零次**（标记面里类名总次数 1）；
 *   B. 规格未动：给与不给 `printable` 两态的**样式段逐字节相同**、脚本段逐字节相同，且「给真」的产物
 *      恒等于「不给的产物 ＋ 根上一个类名」（逐字节等式）；
 *   C. `src/exercise/receipt.ts` 里 `withPrintableRoot`／`PAGE_SHELL_ROOT`／`PRINTABLE_ROOT` 三个标识符
 *      命中数**全为 0**；
 *   D. 判真的口径：`undefined`／`false`／`0`（假值）＝老路；`true`＝加类。B 线用真值转换（`input.printable ?`）
 *      就是**分叉**（`0` 会分叉），故 `0` 只作**记数**：值不属 `boolean` 时记一行 DIVERGE-NOTE，不判红
 *      （那处在票面写集外，且调用方类型本就不该给非布尔）。
 *
 * 前跑：`pnpm build`（本探针读 `dist/`）。运行：`node docs/skills/skill-calorie/t448-review-probe.mjs`。
 */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..', '..');
const PKG = join(REPO, 'packages', 'skill-calorie');
const DIST = join(PKG, 'dist');
const RECEIPT_SRC = join(PKG, 'src', 'exercise', 'receipt.ts');
const CLASS = 'ilife-page-printable';
const ROOT_OFF = '<section class="ilife-block ilife-block-page-shell">';
const ROOT_ON = '<section class="ilife-block ilife-block-page-shell ' + CLASS + '">';
const SAMPLE = '<section id="sec-sample"><p>既有页正文样例</p></section>';
const CONTENT = SAMPLE;

const { assembleDocPage } = await import(new URL('file:///' + join(DIST, 'shared', 'docPage.js').replace(/\\/g, '/')).href);
const { buildExerciseReceiptDoc } = await import(new URL('file:///' + join(DIST, 'exercise', 'receipt.js').replace(/\\/g, '/')).href);
const { openDb } = await import(new URL('file:///' + join(DIST, 'index.js').replace(/\\/g, '/')).href);

const A_IN = { docTitle: '卡路里·分析', title: 'A线整页样例', eyebrow: '分析 · 样例', subtitle: '副标题样例', content: CONTENT };
const B_IN = { ...A_IN, subtitle: null, title: 'B线整页样例', metaLeft: '今日 · 分析 · 对照 最近 7 天', badge: '卡路里 · 分析', summary: '一句话结论样例' };
const A = (extra) => assembleDocPage({ ...A_IN, ...extra });
const B = (extra) => assembleDocPage({ ...B_IN, ...extra });

const sha256 = (s) => createHash('sha256').update(Buffer.from(s, 'utf8')).digest('hex');
const count = (hay, needle) => hay.split(needle).length - 1;
const stripAssets = (html) => html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, '');
const styleText = (html) => (/<style>[\s\S]*?<\/style>/.exec(html) ?? [''])[0];
const scriptText = (html) => (/<script>[\s\S]*?<\/script>/.exec(html) ?? [''])[0];
const classAttrHits = (html, name) => [...html.matchAll(/class="([^"]*)"/g)].filter((m) => m[1].split(/\s+/).includes(name)).length;
const rootTag = (html) => (/<section class="ilife-block ilife-block-page-shell[^"]*">/.exec(html) ?? [''])[0];

/** 回执族真产物：真调用 `buildExerciseReceiptDoc`（输入冻结，产物与库路径无关）。 */
function receiptDoc() {
  const dir = join(REPO, '.scratch', 't448-review', 'probe-db');
  mkdirSync(dir, { recursive: true });
  const db = openDb(join(dir, 'calorie_data.db'));
  try {
    return buildExerciseReceiptDoc(db, 'calorie.exercise.add', {
      scene: '运动', action: '记运动', op: 'create', recordId: 7, summary: '已写入运动记录',
      items: [], tagDiff: null, distance: null, noChange: false,
      meta: { actionAt: '2026-09-14 20:00:00', entityType: 'exercise_log', wakeWord: '记运动', source: 'exercise_log (写库回执)' },
      m5Contract: '1', affectedRows: 1, affectedRowsSource: 'sqlite:total_changes',
      ids: [7], idSource: 'record', writtenFields: ['type'],
      m5Line: 'id=7 | 日期 2026-09-14 20:00:00 | 影响 1 行 | 字段 type',
    }, 'calorie-cmd-read calorie.exercise.add', { rows: [{ id: 7, exercise_type: '慢跑', date: '2026-09-05', duration_minutes: 30, calories_burned: 320, note: '夜跑' }] });
  } finally {
    db.close();
  }
}

let failed = 0;
function probe(name, fn) {
  try {
    fn();
    console.log('PROBE-OK  ' + name);
  } catch (err) {
    failed++;
    console.log('PROBE-RED ' + name + ' :: ' + (err && err.message));
  }
}

/* ── A. 版面根恰一次、别处零次 ─────────────────────────────────────────────── */
probe('A1 给真：整段版面根标记恰 1 次，且它就是版面根', () => {
  for (const [tag, html] of [['A', A({ printable: true })], ['B', B({ printable: true })], ['receipt', receiptDoc()]]) {
    const hits = count(html, ROOT_ON);
    console.log('  ROOT ' + tag + ' rootOnHits=' + hits + ' root=' + rootTag(html) + ' classAttrHits=' + classAttrHits(html, CLASS) + ' markupHits=' + count(stripAssets(html), CLASS));
    assert.equal(hits, 1, tag + ' 带类的版面根标记出现次数应恰 1，实际 ' + hits);
    assert.equal(rootTag(html), ROOT_ON, tag + ' 被数中的那段不是版面根：' + rootTag(html));
    assert.equal(classAttrHits(html, CLASS), 1, tag + ' 类属性上带该类的元素应恰 1 个');
    assert.equal(count(stripAssets(html), CLASS), 1, tag + ' 标记面里类名出现次数应为 1');
  }
});
probe('A2 不给／给假：标记面与整段版面根标记都是 0 次', () => {
  for (const [tag, html] of [['A', A()], ['A(false)', A({ printable: false })], ['A(undefined)', A({ printable: undefined })], ['B', B()], ['B(false)', B({ printable: false })], ['B(undefined)', B({ printable: undefined })]]) {
    const m = count(stripAssets(html), CLASS);
    console.log('  OFF ' + tag + ' markupHits=' + m + ' rootOnHits=' + count(html, ROOT_ON) + ' rootOffHits=' + count(html, ROOT_OFF) + ' bytes=' + Buffer.byteLength(html, 'utf8') + ' sha256=' + sha256(html));
    assert.equal(m, 0, tag + ' 不给该位却在标记面出现 ' + CLASS);
    assert.equal(count(html, ROOT_ON), 0, tag + ' 不给该位却出现带类的版面根标记');
  }
});
probe('A3 老锚点（不带类的版面根标记）在给真后消失、不给时恰 1 次', () => {
  assert.equal(count(A(), ROOT_OFF), 1, 'A线不给该位时老锚点应恰 1 次');
  assert.equal(count(B(), ROOT_OFF), 1, 'B线不给该位时老锚点应恰 1 次');
  assert.equal(count(A({ printable: true }), ROOT_OFF), 0, 'A线给真后老锚点应消失');
  assert.equal(count(B({ printable: true }), ROOT_OFF), 0, 'B线给真后老锚点应消失');
});

/* ── B. 规格未动：只加类名 ─────────────────────────────────────────────────── */
probe('B1 给与不给两态：样式段、脚本段逐字节相同，且「给真」≡「不给 ＋ 根上一个类名」', () => {
  for (const [tag, off, on] of [['A', A(), A({ printable: true })], ['B', B(), B({ printable: true })]]) {
    assert.equal(styleText(on), styleText(off), tag + ' 两态样式段不同（本票不许新增 CSS）');
    assert.equal(scriptText(on), scriptText(off), tag + ' 两态脚本段不同');
    assert.equal(on, off.replace(ROOT_OFF, ROOT_ON), tag + ' 「给真」的产物不是「不给的产物 ＋ 根上一个类名」');
    console.log('  SPEC ' + tag + ' off-bytes=' + Buffer.byteLength(off, 'utf8') + ' on-bytes=' + Buffer.byteLength(on, 'utf8') + ' delta=' + (Buffer.byteLength(on, 'utf8') - Buffer.byteLength(off, 'utf8')) + ' styleEqual=true scriptEqual=true');
  }
});
probe('B2 老锚点在产物里恰命中 1 次（不做全局替换也不可能漏替换）', () => {
  for (const [tag, html] of [['A', A()], ['B', B()]]) {
    assert.equal(count(html, ROOT_OFF), 1, tag + ' 老锚点命中次数应恰 1');
  }
});
probe('B3 回执族真产物与「同一输入的非回执 B 线」走的是同一条加类口径', () => {
  const r = receiptDoc();
  assert.ok(count(r, ROOT_ON) === 1 && rootTag(r) === ROOT_ON, '回执族版面根没带类或带类处不是版面根');
  console.log('  RECEIPT bytes=' + Buffer.byteLength(r, 'utf8') + ' sha256=' + sha256(r) + ' classAttrHits=' + classAttrHits(r, CLASS));
});

/* ── C. 三个标识符在 receipt.ts 里命中数 0 ─────────────────────────────────── */
probe('C1 receipt.ts 里 withPrintableRoot／PAGE_SHELL_ROOT／PRINTABLE_ROOT 命中数全 0', () => {
  const src = readFileSync(RECEIPT_SRC, 'utf8');
  const hits = { withPrintableRoot: count(src, 'withPrintableRoot'), PAGE_SHELL_ROOT: count(src, 'PAGE_SHELL_ROOT'), PRINTABLE_ROOT: count(src, 'PRINTABLE_ROOT') };
  const stray = count(src, 'ilife-page-printable');
  console.log('  GREP receipt.ts ' + JSON.stringify(hits) + ' ilife-page-printable-literal=' + stray + ' printable:true=' + count(src, 'printable: true'));
  for (const [k, v] of Object.entries(hits)) assert.equal(v, 0, 'receipt.ts 里 ' + k + ' 命中 ' + v + ' 次（应 0）');
  assert.equal(stray, 0, 'receipt.ts 里还留着类名字面 ' + stray + ' 次');
});
probe('C2 全包 src 里除透传位外没有别处做「装配后定点加类」的字符串手术', () => {
  const hits = { withPrintableRoot: 0, PAGE_SHELL_ROOT: 0, PRINTABLE_ROOT: 0 };
  const root = join(PKG, 'src');
  const walk = (d) => {
    for (const e of readdirSyncLite(d)) {
      if (e.isDirectory()) { walk(join(d, e.name)); continue; }
      if (!e.name.endsWith('.ts')) continue;
      const s = readFileSync(join(d, e.name), 'utf8');
      for (const k of Object.keys(hits)) hits[k] += count(s, k);
    }
  };
  walk(root);
  console.log('  GREP src/**/*.ts ' + JSON.stringify(hits));
  for (const [k, v] of Object.entries(hits)) assert.equal(v, 0, '全包 src 里 ' + k + ' 命中 ' + v + ' 次（应 0）');
});
function readdirSyncLite(d) {
  return readdirSync(d, { withFileTypes: true });
}

/* ── D. 判真口径（记数，不判红） ──────────────────────────────────────────── */
probe('D1 判真口径记数（0 等非布尔值：A 线走老路，B 线（真值转换）会分叉）', () => {
  const a0 = A({ printable: 0 });
  const b0 = B({ printable: 0 });
  const aOff = A();
  const bOff = B();
  // A 线经 renderPageShell（=== true，base-render 已定案）：0 与不给同产物 → 与 b-line 的真值转换口径分叉。
  assert.equal(a0, aOff, 'A线在 printable=0 时产物应与不给时相同（=== true 口径）');
  const diverge = b0 !== bOff;
  console.log('  DIVERGE-NOTE printable=0 → A线走老路=' + (a0 === aOff) + '，B线分叉=' + diverge
    + '（B线用真值转换 `input.printable ?`；`0`／空串会分叉，`null`／`undefined`／`false` 不分叉；'
    + '类型上 `printable?: boolean` 本就不该给非布尔，故只记数不判红）');
  assert.equal(A({ printable: null }).includes(ROOT_ON), false, 'A线 printable=null 不该加类');
  assert.equal(B({ printable: null }).includes(ROOT_ON), false, 'B线 printable=null 不该加类');
});

console.log(failed === 0 ? 'PROBE-RESULT PASS（全部判据绿）' : 'PROBE-RESULT FAIL（红 ' + failed + ' 条）');
process.exit(failed === 0 ? 0 : 1);
