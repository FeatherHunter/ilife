/** #448 · 公共层清障：整页装配补 `printable` 透传位（`assembleDocPage` → `renderPageShell`）。
 *
 * 背景（#423 回执族）：`shared/docPage.ts::assembleDocPage` 没有透传位，回执族只能在装配后对版面根
 * 做**字符串定点替换**（`receipt.ts::withPrintableRoot`）。本票把那个临时手段换成正当透传位：
 * `DocPageInput.printable?: boolean` 为真时，A线（`renderPageShell`）与 B线（`metaLeft` 老A壳两条路）
 * 都在版面根带上 `ilife-page-printable`（类名与打印规则见 `base-render/src/blocks.ts` #420 段）。
 *
 * 判据（机器读，逐条对上票面）：
 *   ① 老调用方零变：不给该位／给假 → 结构 sha 与「改动前」同值（金标见 `GOLDEN`；三件样本＝
 *      回执族真产物 ＋ A线整页 ＋ B线整页），且与 `.scratch/t448/cases-before/` 改前产物逐字节相同（在场才比）；
 *   ② 给真才加类：给 `printable: true` → 版面根恰一次 `ilife-page-printable`，标记面别处零次，
 *      样式段（资产）逐字节不变（不新增 CSS、不碰 `extraCss`）；
 *   ③ 回执族零变：新透传位的产物与「老字符串手术 ＋ 老路装配」逐字节相同（等价替换）；
 *      且 `src/exercise/receipt.ts` 里那处手术已删净。
 *
 * 运行：先 `pnpm build`（判据读 `dist/`），再 `node --test packages/skill-calorie/test/docpage-printable-448.test.mjs`。
 */
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { openDb } from '../dist/index.js';
import { buildExerciseReceiptDoc } from '../dist/exercise/receipt.js';
import { assembleDocPage } from '../dist/shared/docPage.js';
import { assertDocPage } from './doc-page-assert.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const REPO = join(PKG, '..', '..');
/** 改前产物留档（`.scratch/t448/cases-before/`，不进版本库）：在场即逐字节比，不在场只跑金标。 */
const BASELINE_DIR = process.env['T448_BASELINE'] ?? join(REPO, '.scratch', 't448', 'cases-before');
const PRINTABLE_CLASS = 'ilife-page-printable';
/** 老手术的两个锚点（#423 临时手段的逐字抄写；本票拿它做「等价替换」对照，不作实现）。 */
const OLD_ROOT = '<section class="ilife-block ilife-block-page-shell">';
const OLD_ROOT_PRINTABLE = '<section class="ilife-block ilife-block-page-shell ilife-page-printable">';

/** 金标（改动前 `pnpm build` 后实跑取得；`struct` ＝ 剔掉样式段／脚本段后的结构 sha）。 */
const GOLDEN = {
  'receipt': {
    bytes: 64942,
    sha: 'ddf5e8daa3f7dda5684b5a24ac56c9685e0a7f3da26f22fbf1e88f26c7615166',
    struct: 'f39a8fce69c54c9f6c33df9a71b55853e034a54489d8d3c0bd086a42ccf17847',
  },
  'a-line': {
    bytes: 58206,
    sha: 'e0e258406e4c61eb71ece71b9d83d2a25f93a87b9a724fa2abbe1b5e6c6d2015',
    struct: '305ff02569e874f003341b73604cbdf31d60d83e1ef5834d2ae0cf07920a3f7e',
  },
  'b-line': {
    bytes: 59028,
    sha: '7e1710abc8b342261be6a0d82c5645e68ba9965ef634f957d6ee71cba21c9d00',
    struct: '5b7c62dbf8d90b1adf54d4c859b46fe13015860231dfea675db6526c988965ff',
  },
};

const SAMPLE_CONTENT = '<section id="sec-sample"><p>既有页正文样例</p></section>';

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
/** 结构 sha：剔掉样式段与脚本段两份资产，只留装配产物的形状（不随 base-baint 资产改动漂移）。 */
function structSha(html) {
  return sha256(html.replace(/<style>[\s\S]*?<\/style>/g, '<style/>').replace(/<script>[\s\S]*?<\/script>/g, '<script/>'));
}
/** 标记面（剔掉样式段与脚本段）里某串的出现次数：判「别处零次」只认标记，不认常驻样式规则。 */
function markupOccurrences(html, needle) {
  const markup = html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script>[\s\S]*?<\/script>/g, '');
  return markup.split(needle).length - 1;
}
/** 类名落在 `class="…"` 上的次数（按空格逐段精确比，不吃 `ilife-page-printable-x` 这类前缀命中）。 */
function classAttrHits(html, name) {
  return [...html.matchAll(/class="([^"]*)"/g)].filter((m) => m[1].split(/\s+/).includes(name)).length;
}
/** 版面根那一段标记（`ilife-block-page-shell` 的 `<section>`）。 */
function rootTag(html) {
  return (/<section class="ilife-block ilife-block-page-shell[^"]*">/.exec(html) ?? [''])[0];
}
function styleText(html) {
  return (/<style>[\s\S]*?<\/style>/.exec(html) ?? [''])[0];
}
/** 老手术：把版面根锚点换成带 `ilife-page-printable` 的那一段（锚点须恰命中一次，抄 #423 的口径）。 */
function oldSurgery(html) {
  const hits = html.split(OLD_ROOT).length - 1;
  assert.equal(hits, 1, '老手术锚点在样本里应恰命中 1 次，实际 ' + hits + ' 次');
  return html.replace(OLD_ROOT, OLD_ROOT_PRINTABLE);
}

/* ───────────────────────────── 三件样本（输入冻结、无时钟依赖） ───────────────────────────── */

const RECEIPT = {
  scene: '运动', action: '记运动', op: 'create', recordId: 7, summary: '已写入运动记录',
  items: [], tagDiff: null, distance: null, noChange: false,
  meta: { actionAt: '2026-09-14 20:00:00', entityType: 'exercise_log', wakeWord: '记运动', source: 'exercise_log (写库回执)' },
  m5Contract: '1', affectedRows: 1, affectedRowsSource: 'sqlite:total_changes',
  ids: [7], idSource: 'record', writtenFields: ['type'],
  m5Line: 'id=7 | 日期 2026-09-14 20:00:00 | 影响 1 行 | 字段 type',
};
const RECEIPT_ROWS = [{ id: 7, exercise_type: '慢跑', date: '2026-09-05', duration_minutes: 30, calories_burned: 320, note: '夜跑' }];

/** ① 回执族真产物（真调用 `buildExerciseReceiptDoc`；库是空的新库，产物与库路径无关）。 */
function receiptDoc() {
  const dir = mkdtempSync(join(tmpdir(), 't448-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  try {
    return buildExerciseReceiptDoc(db, 'calorie.exercise.add', RECEIPT, 'calorie-cmd-read calorie.exercise.add', { rows: RECEIPT_ROWS });
  } finally {
    db.close();
  }
}
/** ② A线整页（`assembleDocPage` 不给 `metaLeft`）。 */
function aLine(extra = {}) {
  return assembleDocPage({
    docTitle: '卡路里·分析', title: 'A线整页样例', eyebrow: '分析 · 样例', subtitle: '副标题样例',
    content: SAMPLE_CONTENT, ...extra,
  });
}
/** ③ B线整页（给 `metaLeft`／`badge`／`summary` 三字段，老A壳两行式）。 */
function bLine(extra = {}) {
  return assembleDocPage({
    docTitle: '卡路里·分析', title: 'B线整页样例', eyebrow: '分析 · 样例', subtitle: null,
    content: SAMPLE_CONTENT, metaLeft: '今日 · 分析 · 对照 最近 7 天', badge: '卡路里 · 分析', summary: '一句话结论样例',
    ...extra,
  });
}

/* ───────────────────────────── 判据① 老调用方零变 ───────────────────────────── */

test('#448 判据①：不给该位／给假 → 结构 sha 与改动前同值（三件样本）', () => {
  const cases = {
    'receipt': receiptDoc(),
    'a-line': aLine(),
    'a-line(false)': aLine({ printable: false }),
    'b-line': bLine(),
    'b-line(false)': bLine({ printable: false }),
  };
  for (const [name, html] of Object.entries(cases)) {
    assertDocPage(html, name);
    const base = name.replace('(false)', '');
    console.log('T448-READ ' + name + ' bytes=' + Buffer.byteLength(html, 'utf8')
      + ' sha256=' + sha256(html) + ' struct=' + structSha(html));
    assert.equal(structSha(html), GOLDEN[base].struct, name + ' 的结构 sha 与改动前不同（老调用方产物被改动了）');
  }
  // 不给＝给假：逐字节相同（新增位的三态里「不给」与「给假」走同一条老路）。
  assert.equal(cases['a-line(false)'], cases['a-line'], 'A线：printable: false 与不给该位不是同一份产物');
  assert.equal(cases['b-line(false)'], cases['b-line'], 'B线：printable: false 与不给该位不是同一份产物');
  assert.ok(!markupOccurrences(cases['a-line'], PRINTABLE_CLASS) && !markupOccurrences(cases['b-line'], PRINTABLE_CLASS),
    '不给该位的版面根上出现了 ilife-page-printable');
});

test('#448 判据①：改前留档在场 → 三件样本逐字节相同', () => {
  if (!existsSync(BASELINE_DIR)) {
    console.log('T448-SKIP 改前留档不在场（' + BASELINE_DIR + '），只跑金标结构 sha');
    return;
  }
  const now = { 'receipt': receiptDoc(), 'a-line': aLine(), 'b-line': bLine() };
  for (const [name, html] of Object.entries(now)) {
    const before = readFileSync(join(BASELINE_DIR, name + '.html'), 'utf8');
    console.log('T448-BASELINE ' + name + ' before-bytes=' + Buffer.byteLength(before, 'utf8')
      + ' after-bytes=' + Buffer.byteLength(html, 'utf8')
      + ' before-sha256=' + sha256(before) + ' after-sha256=' + sha256(html)
      + ' equal=' + (before === html));
    assert.equal(html, before, name + ' 与改前留档不是逐字节相同');
  }
});

/* ───────────────────────────── 判据② 给真才加类 ───────────────────────────── */

test('#448 判据②：给 printable: true → 版面根恰一次类，标记面别处零次', () => {
  for (const [name, html] of Object.entries({ 'receipt': receiptDoc(), 'a-line': aLine({ printable: true }), 'b-line': bLine({ printable: true }) })) {
    assertDocPage(html, name);
    console.log('T448-READ ' + name + '(printable) bytes=' + Buffer.byteLength(html, 'utf8')
      + ' sha256=' + sha256(html) + ' 根=' + rootTag(html)
      + ' classAttrHits=' + classAttrHits(html, PRINTABLE_CLASS)
      + ' markupHits=' + markupOccurrences(html, PRINTABLE_CLASS));
    assert.equal(classAttrHits(html, PRINTABLE_CLASS), 1, name + ' 的 ilife-page-printable 不在版面根上（或不止一个类属性带它）');
    assert.ok(rootTag(html).includes(PRINTABLE_CLASS), name + ' 的 ilife-page-printable 没有落在版面根上');
    assert.equal(markupOccurrences(html, PRINTABLE_CLASS), 1, name + ' 的标记面里 ilife-page-printable 出现次数不是 1');
  }
  // 不给／给假：标记面零次（样式段里的常驻规则不算命中）。
  assert.equal(markupOccurrences(aLine(), PRINTABLE_CLASS), 0, '不给该位却在标记面出现类名');
  assert.equal(markupOccurrences(bLine(), PRINTABLE_CLASS), 0, '不给该位却在标记面出现类名');
});

test('#448 判据②：只加一个类名——样式段（资产）逐字节不变，不新增 CSS', () => {
  for (const build of [aLine, bLine]) {
    const off = build();
    const on = build({ printable: true });
    assert.equal(styleText(on), styleText(off), '给 printable 后样式段变了（本票不许新增 CSS／碰 extraCss）');
    assert.equal(on, off.replace(OLD_ROOT, OLD_ROOT_PRINTABLE), '给 printable 的产物不是「老路产物＋根上一个类名」');
  }
});

/* ───────────────────────────── 判据③ 回执族零变（等价替换） ───────────────────────────── */

test('#448 判据③：新透传位的产物 ≡ 老字符串手术后的产物（逐字节）', () => {
  for (const [name, off, on] of [
    ['a-line', aLine(), aLine({ printable: true })],
    ['b-line', bLine(), bLine({ printable: true })],
  ]) {
    assert.equal(on, oldSurgery(off), name + '：透传位产物与老手术产物不是逐字节相同');
  }
  // 回执族真产物：本票只把「装配后定点替换」搬成透传位，产物必须与改前逐字节相同（金标读数）。
  const receipt = receiptDoc();
  console.log('T448-READ receipt(printable) bytes=' + Buffer.byteLength(receipt, 'utf8') + ' sha256=' + sha256(receipt));
  assert.equal(sha256(receipt), GOLDEN['receipt'].sha, '回执族产物与改前不是逐字节相同');
  assert.equal(classAttrHits(receipt, PRINTABLE_CLASS), 1, '回执族版面根上的可打印类不是恰一次');
  assert.ok(rootTag(receipt).includes(PRINTABLE_CLASS), '回执族版面根上没有可打印类');
});

test('#448 判据③：receipt.ts 里的字符串手术已删净，改走透传位', () => {
  const src = readFileSync(join(PKG, 'src', 'exercise', 'receipt.ts'), 'utf8');
  assert.ok(!src.includes('withPrintableRoot'), 'receipt.ts 里还留着 withPrintableRoot');
  assert.ok(!src.includes('PRINTABLE_ROOT'), 'receipt.ts 里还留着 PRINTABLE_ROOT 锚点常量');
  assert.ok(!src.includes('PAGE_SHELL_ROOT'), 'receipt.ts 里还留着 PAGE_SHELL_ROOT 锚点常量');
  assert.match(src, /printable:\s*true/, 'receipt.ts 没有把 printable: true 透传给 assembleDocPage');
});
