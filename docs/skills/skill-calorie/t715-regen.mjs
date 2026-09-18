/**
 * #715 搬家（第二批：运动网页单件 `sportPortDocs`）的一次性重出器 —— 判据的产物来源。
 *
 * 判据：**搬迁前后逐页逐字节相同**（票面主判据）。做法照
 * `docs/skills/skill-calorie/t704-搬家-证据.md` 与 `t518-W1-搬家-证据.md` 的先例：
 * 逐页 `sha256 ＋ bytes` 双比，脚本对每一条逐条比，不抽样。
 *
 * 覆盖口径按「搬迁面能影响到的页」定，不按页数好看定：
 *   - 被搬的 `sportPortDocs.ts` 正是产出这**五键**的那一件
 *     （`calorie.view.exercise-cardio`／`-distribution`／`-recap`／`-strength`／`-trend`，
 *     声明在 `src/exercise/commands.ts:35-41`）；
 *   - 所以五键各按**路由表上的唤醒词与参数**出全（`src/exercise/routes.ts:42-56`：
 *     分布／力量／有氧 7d，趋势 30d，复盘 本周／本月／90d），另补
 *     窗档（今日／本月／今年）、空窗那一态、跨年窗（366 天，逼出逐日表截断与跨年轴）、
 *     `offset` 平移（-1d／-1y 逼出相对空窗）；
 *   - 另出两条**对照页**（`calorie.view.weight` 体重盘、`calorie.diet.review` 饮食复盘，
 *     产出者都**不在搬迁面**）：它们必须也逐字节不变——它们变了就说明抖动来自重出器或种子库本身，
 *     不是来自搬家。
 *
 * 只写 `.scratch/t715/`（本票独占草稿目录）。零源码改动、零 git 动作、真库零触碰
 * （库与配置都住本票草稿目录，由 `ILIFE_CONFIG_DIR` 指过去）。
 *
 * 用法：
 *   node .scratch/t715/seed.mjs                                  # 先建种子库
 *   node .scratch/t715/regen.mjs                                 # 存基线
 *   node .scratch/t715/regen.mjs --tag MOVE --compare 基线.json   # 比对
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { docSite, renderEmptyViews, emptyWindowCliProbe } from './empty.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BIN = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
const DB_DIR = join(HERE, 'db');
const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const OUT_DIR = join(ROOT, argOf('--out', '.scratch/t715/产物'));
const BASE_JSON = join(ROOT, argOf('--baseline', '.scratch/t715/基线.json'));
const TMP = join(HERE, 'tmp-out');

/* ── 条款：五键（搬迁面）＋ 两条对照页（不在搬迁面） ────────────────────────────
   `wake` 是路由表上的唤醒词（`src/exercise/routes.ts`）；`key` 是交付键。 */
const cases = [
  // ① 分布（唤醒词 167／new 35）
  ['01-看运动类型分布(7d)', 'calorie.view.exercise-distribution', { window: '7d' }],
  ['02-看运动类型分布(30d)', 'calorie.view.exercise-distribution', { window: '30d' }],
  ['03-看运动类型分布(本月)', 'calorie.view.exercise-distribution', { window: '本月' }],
  ['04-看运动类型分布(今年)', 'calorie.view.exercise-distribution', { window: '今年' }],
  // ② 力量（唤醒词 168／new 33）
  ['05-看力量训练总览(7d)', 'calorie.view.exercise-strength', { window: '7d' }],
  ['06-看力量训练总览(30d)', 'calorie.view.exercise-strength', { window: '30d' }],
  ['07-看力量训练总览(366d 跨年)', 'calorie.view.exercise-strength', { window: '366d' }],
  ['08-看力量训练总览(本月)', 'calorie.view.exercise-strength', { window: '本月' }],
  // ③ 有氧（唤醒词 169／new 34）
  ['09-看有氧训练总览(7d)', 'calorie.view.exercise-cardio', { window: '7d' }],
  ['10-看有氧训练总览(90d)', 'calorie.view.exercise-cardio', { window: '90d' }],
  ['11-看有氧训练总览(今日)', 'calorie.view.exercise-cardio', { window: '今日', offset: '-1d' }],
  ['12-看有氧训练总览(今年)', 'calorie.view.exercise-cardio', { window: '今年' }],
  // ④ 趋势（唤醒词 170，路由给的窗口就是 30d）
  ['13-看运动趋势(30d)', 'calorie.view.exercise-trend', { window: '30d' }],
  ['14-看运动趋势(7d)', 'calorie.view.exercise-trend', { window: '7d' }],
  ['15-看运动趋势(366d 跨年截断)', 'calorie.view.exercise-trend', { window: '366d' }],
  ['16-看运动趋势(本月)', 'calorie.view.exercise-trend', { window: '本月' }],
  // ⑤ 复盘（唤醒词 171～175／new 36）
  ['17-运动复盘(本周)', 'calorie.view.exercise-recap', { window: '本周' }],
  ['18-运动复盘(本月)', 'calorie.view.exercise-recap', { window: '本月' }],
  ['19-运动复盘(最近90天)', 'calorie.view.exercise-recap', { window: '90d' }],
  ['20-运动复盘(今年)', 'calorie.view.exercise-recap', { window: '今年' }],
  ['21-运动复盘(自定义时间)', 'calorie.view.exercise-recap', { window: 'custom', start: '2026-06-01', end: '2026-09-18' }],
  ['22-运动复盘(去年)', 'calorie.view.exercise-recap', { window: '去年' }],
  ['23-运动复盘(366d 跨年)', 'calorie.view.exercise-recap', { window: '366d' }],
  // 对照页（产出者不在搬迁面；它们红了就说明抖动来自重出器或种子库）
  ['90-对照-体重盘(30d)', 'calorie.view.weight', { window: '30d' }],
  ['91-对照-饮食复盘(7d)', 'calorie.view.diet-review', { window: '7d' }],
];

const num = (i) => String(i + 1).padStart(2, '0');
const fileWord = (w) => w.replace(/\s+/g, '').replace(/[\\/:*?"<>|]/g, '_');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

function renderAll(label) {
  const dir = join(TMP, label);
  mkdirSync(dir, { recursive: true });
  const rows = [];
  let bytesTotal = 0;
  cases.forEach(([wake, key, params], i) => {
    const stem = `${num(i)}-${fileWord(wake)}`;
    const pagePath = join(dir, `${stem}.html`);
    const r = spawnSync(process.execPath, ['--import', pathToFileURL(join(HERE, 'freeze.mjs')).href, BIN, key, '--params', JSON.stringify(params), '--html', pagePath], {
      encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: DB_DIR }, timeout: 120000,
    });
    const tail = (s, n) => String(s || '').trimEnd().split(/\r?\n/).slice(-n).join('\n');
    if (r.status !== 0) {
      console.log(`FAIL ${label} ${stem} exit=${r.status}\n  stdout=${tail(r.stdout, 3)}\n  stderr=${tail(r.stderr, 3)}`);
      process.exitCode = 1;
      return;
    }
    const html = readFileSync(pagePath, 'utf8');
    const trimmed = html.replace(/^\uFEFF/, '');
    const bytes = Buffer.byteLength(html, 'utf8');
    const sha256 = createHash('sha256').update(html, 'utf8').digest('hex');
    const probe = {
      doctype: /^\s*<!doctype html>/i.test(trimmed.slice(0, 300)),
      charset: /<meta[^>]+charset=["']?utf-8["']?/i.test(trimmed),
      closed: /<\/html>\s*$/.test(trimmed),
      noSlotResidue: !/\{\{[^}]*\}\}/.test(trimmed),
    };
    if (!Object.values(probe).every(Boolean)) {
      console.log(`FAIL ${label} ${stem} 文档完整性断言不过：${JSON.stringify(probe)}`);
      process.exitCode = 1;
    }
    bytesTotal += bytes;
    rows.push({ n: num(i), wake, key, params, exit: r.status, file: `${stem}.html`, bytes, sha256, sha256_12: sha256.slice(0, 12), probe });
  });
  return { dir, rows, bytesTotal };
}

/* 种子库必须先在位：缺了会让五键全走空态，判据覆盖不到有数据的那些分支而不报错。 */
try {
  readFileSync(join(DB_DIR, 'calorie.yaml'), 'utf8');
} catch {
  console.log(`FAIL 种子库缺配置（${join(DB_DIR, 'calorie.yaml')}）：先跑 node .scratch/t715/seed.mjs`);
  process.exit(1);
}

const passA = renderAll('A');
if (process.exitCode) { console.log('RESULT: 有失败条目，不落盘'); process.exit(process.exitCode); }
const passB = renderAll('B');
if (process.exitCode) { console.log('RESULT: 有失败条目，不落盘'); process.exit(process.exitCode); }

/* ── 空窗那一态：CLI 够不到（取数层一律抛阻断），改走五件直调（见 empty.mjs 头注） ── */
console.log(`DOC-SITE 本窗被搬的那一件产出在：${(docSite() || '（缺产物）').replace(/\\/g, '/').replace(ROOT.replace(/\\/g, '/') + '/', '')}`);
const emptyA = renderEmptyViews(join(TMP, 'E'));
const emptyB = renderEmptyViews(join(TMP, 'E2'));
if (emptyA.fails.length || emptyB.fails.length) {
  for (const f of [...emptyA.fails, ...emptyB.fails]) console.log('FAIL empty ' + f);
  console.log('RESULT: 空窗直调有失败条目，不落盘');
  process.exit(1);
}
const emptyDrift = emptyA.rows.filter((r, i) => r.sha256 !== emptyB.rows[i].sha256)
  .map((r, i) => `${r.n}(${r.sha256_12}->${emptyB.rows[i].sha256_12})`);
console.log(`EMPTY-DIRECT site=${emptyA.site.replace(/\\/g, '/').replace('D:/ilife/packages/skill-calorie/', '')} pages=${emptyA.rows.length} STABLE=${emptyDrift.length === 0}`);
if (emptyDrift.length) { console.log(`EMPTY-DIRECT 连出两遍不一致：DIFF=${emptyDrift.join(',')}`); process.exitCode = 1; }

/* 反证：空窗参数在 CLI 上必须仍是 ERR 4（搬迁不许把「取数阻断」变成「出页」或换失败码）。 */
const guardFails = emptyWindowCliProbe(BIN, DB_DIR, [
  ['分布(空窗)', 'calorie.view.exercise-distribution', { window: 'custom', start: '2024-03-01', end: '2024-03-07' }],
  ['力量(空窗)', 'calorie.view.exercise-strength', { window: 'custom', start: '2024-03-01', end: '2024-03-07' }],
  ['有氧(空窗)', 'calorie.view.exercise-cardio', { window: 'custom', start: '2024-03-01', end: '2024-03-07' }],
  ['趋势(空窗)', 'calorie.view.exercise-trend', { window: 'custom', start: '2024-03-01', end: '2024-03-07' }],
  ['复盘(空窗)', 'calorie.view.exercise-recap', { window: 'custom', start: '2024-03-01', end: '2024-03-07' }],
]);
if (guardFails.length) { for (const f of guardFails) console.log('FAIL empty-guard ' + f); process.exitCode = 1; }

/* A/B 自证：同一份源码连出两遍必须逐字节相同，否则判据本身不稳（时钟冻结就是为这一条）。 */
const drift = passA.rows.filter((r, i) => r.sha256 !== passB.rows[i].sha256)
  .map((r, i) => `${r.n}(${r.sha256_12}->${passB.rows[i].sha256_12})`);
console.log(`STABLE-A-vs-B ${drift.length === 0 ? `pages=${passA.rows.length}/${passA.rows.length} DIFF=none` : `DIFF=${drift.join(',')}`}`);

const rows = passA.rows;

/* ── 与给定基线逐页比（sha256 ＋ bytes 双比，不抽样；页 ＋ 空窗直调两面一起比） ── */
const allRows = [...rows, ...emptyA.rows];
const CMP = argOf('--compare', '');
if (CMP) {
  const prev = JSON.parse(readFileSync(join(ROOT, CMP), 'utf8'));
  const prevRows = [...prev.rows, ...(prev.empty ?? [])];
  const prevByN = new Map(prevRows.map((r) => [r.n, r]));
  const diff = [];
  for (const r of allRows) {
    const p = prevByN.get(r.n);
    if (!p) { diff.push(`${r.n}(基线缺这条)`); continue; }
    if (p.sha256 !== r.sha256 || p.bytes !== r.bytes) diff.push(`${r.n}(${p.sha256_12}->${r.sha256_12}, ${p.bytes}B->${r.bytes}B)`);
  }
  for (const p of prevRows) if (!allRows.some((r) => r.n === p.n)) diff.push(`${p.n}(本次缺这条)`);
  const bytesBefore = prev.bytesTotal + (prev.empty ?? []).reduce((a, r) => a + r.bytes, 0);
  const bytesAfter = passA.bytesTotal + emptyA.rows.reduce((a, r) => a + r.bytes, 0);
  console.log(`${argOf('--tag', 'CMP')} byte-identical pages=${diff.length === 0 ? `${allRows.length}/${allRows.length}` : `${allRows.length - diff.length}/${allRows.length}`} DIFF=${diff.length === 0 ? 'none' : diff.join(',')}`);
  console.log(`  total_before=${bytesBefore} total_after=${bytesAfter}`);
  if (diff.length !== 0) process.exitCode = 1;
}

rows.forEach((r) => writeFileSync(join(OUT_DIR, r.file), readFileSync(join(passA.dir, r.file))));
/* 只比对不落基线：否则变异轮的产物会把参照本身覆盖掉（t704 那轮吃到过这个坑）。 */
if (CMP) {
  console.log(`BASELINE 未改写（本次是比对轮）：${BASE_JSON}`);
} else {
  const baseline = {
    savedAt: new Date().toISOString(), head: argOf('--head', ''),
    site: emptyA.site.replace(/\\/g, '/').replace(ROOT.replace(/\\/g, '/') + '/', ''),
    pages: rows.length, bytesTotal: passA.bytesTotal, rows,
    empty: emptyA.rows, emptyBytesTotal: emptyA.rows.reduce((a, r) => a + r.bytes, 0),
  };
  writeFileSync(BASE_JSON, JSON.stringify(baseline, null, 2));
  console.log(`BASELINE: ${BASE_JSON}`);
}
console.log(`RESULT: ${rows.length}/${rows.length} 页 ＋ 空窗 ${emptyA.rows.length}/${emptyA.rows.length} 直调落盘 bytes_total=${passA.bytesTotal} → ${OUT_DIR}`);
if (drift.length) process.exitCode = 1;
