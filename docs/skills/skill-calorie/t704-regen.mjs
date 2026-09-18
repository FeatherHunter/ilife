/**
 * #704 搬家（第一批：计划编辑器簇）的一次性重出器 —— 判据的产物来源。
 *
 * 判据：**搬迁前后逐页逐字节相同**（票面主判据）。做法照 `docs/skills/skill-calorie/t518-W1-搬家-证据.md` 的先例：
 *   逐页 sha256 ＋ bytes 双比，脚本对每一条逐条比，不抽样。
 *
 * 覆盖口径按「搬迁面能影响到的页」定，不按页数好看定：
 *   - 被搬的 5 件（`planEditorPort`／`planEditorDocs`／`planEditor`／`planEditorCss`／`planEditorRuntime`）
 *     只喂一条产出：`calorie.view.plan-wizard`（`src/workout/commands.ts:45`）。
 *   - 所以重出器把**这一页的每个分支**各出一遍（不是把一条分支出 N 遍）：
 *     有周／空态／空态词版周／带动作库／带周页签／有氧 session／锁定周。
 *   - 另出一条**对照页** `calorie.view.plan-write-preview`（产出者 `render/planWizardDocs.ts` **不在搬迁面**）：
 *     它必须也逐字节不变——它变了就说明抖动来自重出器本身，不是来自搬家。
 *
 * 只写 `.scratch/t704/`（本票独占草稿目录）。零源码改动、零 git 动作、真库零触碰。
 * 用法：node .scratch/t704/regen.mjs [--out <目录>] [--baseline <json>]
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const require = createRequire(import.meta.url);
const { openDb } = require(join(ROOT, 'packages/skill-calorie/dist/index.js'));
const BIN = join(ROOT, 'packages/skill-calorie/dist/cli/cmd_read.js');
const DB_DIR = join(HERE, 'db');
const argOf = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt; };
const OUT_DIR = join(ROOT, argOf('--out', '.scratch/t704/产物'));
const BASE_JSON = join(ROOT, argOf('--baseline', '.scratch/t704/基线.json'));
const TMP = join(HERE, 'tmp-out');

/* ── 1. 种子库：本批的页不取库（`viewPlanEditor(params, _db)` 的 db 参数未使用），
   只需一层空库让 CLI 的取数层能开库；对照页也不读库。真库零触碰。 ─────────────── */
rmSync(DB_DIR, { recursive: true, force: true });
mkdirSync(DB_DIR, { recursive: true });
const db = openDb(join(DB_DIR, 'calorie_data.db'));
db.close();
console.log('SEED: 空库 → ' + DB_DIR);

/* ── 2. 本案：`calorie.view.plan-wizard` 的各分支 ＋ 一条对照页 ─────────────── */
const WEEK_FULL = {
  week_number: 1,
  days: [
    { day_of_week: 1, sessions: [{ session_label: '上肢', movements: [{ name: '俯卧撑', part: '胸', type: '力量', sets: [{ reps: 12, weight: 0, rest_seconds: 60 }] }] }] },
    { day_of_week: 3, sessions: [{ session_label: '有氧', movements: [{ name: '慢跑', part: '全身', type: '有氧', sets: [{ reps: 30, unit: '分钟', weight: 0 }] }] }] },
  ],
};
const WEEK_LOCKED = {
  week_number: 2,
  days: [{ day_of_week: 2, sessions: [{ session_label: '下肢', movements: [{ name: '深蹲', part: '腿', type: '力量', sets: [] }] }] }],
};
const PLAN_FULL = {
  config: { title: '减脂4周', start_date: '2026-09-14', user_level: '中手', available_equipment: ['瑜伽垫'] },
  weeks: [WEEK_FULL, WEEK_LOCKED],
};

const cases = [
  ['01-定训练计划(样例计划)', 'calorie.view.plan-wizard', { plan: PLAN_FULL }],
  ['02-定训练计划(空态)', 'calorie.view.plan-wizard', {}],
  ['03-定训练计划(plan 非对象)', 'calorie.view.plan-wizard', { plan: '不是对象' }],
  ['04-定训练计划(有周无 session)', 'calorie.view.plan-wizard', { plan: { config: { title: '空周' }, weeks: [{ week_number: 1, days: [] }] } }],
  ['05-定训练计划(带动作库)', 'calorie.view.plan-wizard', { plan: PLAN_FULL, catalog: ['俯卧撑', '慢跑', '深蹲'] }],
  ['06-定训练计划(带周页签)', 'calorie.view.plan-wizard', { plan: PLAN_FULL, openWeek: 2 }],
  ['07-定训练计划(有氧 session)', 'calorie.view.plan-wizard', { plan: { config: { title: '有氧周' }, weeks: [WEEK_FULL] } }],
  ['08-定训练计划(锁定周)', 'calorie.view.plan-wizard', { plan: { config: { title: '锁定周' }, weeks: [WEEK_LOCKED] } }],
];

/* ── 3. 逐条真跑（先落临时目录，断言全过才认定）；跑两遍做 A/B 自证 ─────────── */
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
      encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB_DIR }, timeout: 60000,
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

const passA = renderAll('A');
if (process.exitCode) { console.log('RESULT: 有失败条目，不落盘'); process.exit(process.exitCode); }
const passB = renderAll('B');
if (process.exitCode) { console.log('RESULT: 有失败条目，不落盘'); process.exit(process.exitCode); }

/* A/B 自证：同一份源码连出两遍必须逐字节相同，否则判据本身不稳。 */
const drift = passA.rows.filter((r, i) => r.sha256 !== passB.rows[i].sha256)
  .map((r, i) => `${r.n}(${r.sha256_12}->${passB.rows[i].sha256_12})`);
console.log(`STABLE-A-vs-B ${drift.length === 0 ? `pages=${passA.rows.length}/${passA.rows.length} DIFF=none` : `DIFF=${drift.join(',')}`}`);

const rows = passA.rows;

/* ── 4. 与给定基线逐页比（sha256 ＋ bytes 双比，不抽样） ───────────────── */
const CMP = argOf('--compare', '');
if (CMP) {
  const prev = JSON.parse(readFileSync(join(ROOT, CMP), 'utf8'));
  const prevByN = new Map(prev.rows.map((r) => [r.n, r]));
  const diff = [];
  for (const r of rows) {
    const p = prevByN.get(r.n);
    if (!p) { diff.push(`${r.n}(基线缺这条)`); continue; }
    if (p.sha256 !== r.sha256 || p.bytes !== r.bytes) diff.push(`${r.n}(${p.sha256_12}->${r.sha256_12}, ${p.bytes}B->${r.bytes}B)`);
  }
  for (const p of prev.rows) if (!rows.some((r) => r.n === p.n)) diff.push(`${p.n}(本次缺这条)`);
  console.log(`${argOf('--tag', 'CMP')} byte-identical pages=${diff.length === 0 ? `${rows.length}/${rows.length}` : `${rows.length - diff.length}/${rows.length}`} DIFF=${diff.length === 0 ? 'none' : diff.join(',')}`);
  console.log(`  total_before=${prev.bytesTotal} total_after=${passA.bytesTotal}`);
  if (diff.length !== 0) process.exitCode = 1;
}

rows.forEach((r) => writeFileSync(join(OUT_DIR, r.file), readFileSync(join(passA.dir, r.file))));
/* 只比对不落基线：否则变异轮的产物会把参照本身覆盖掉（本轮就吃到过这个坑）。 */
if (CMP) {
  console.log(`BASELINE 未改写（本次是比对轮）：${BASE_JSON}`);
} else {
  const baseline = { savedAt: new Date().toISOString(), head: argOf('--head', ''), pages: rows.length, bytesTotal: passA.bytesTotal, rows };
  writeFileSync(BASE_JSON, JSON.stringify(baseline, null, 2));
  console.log(`BASELINE: ${BASE_JSON}`);
}
console.log(`RESULT: ${rows.length}/${rows.length} 页落盘 bytes_total=${passA.bytesTotal} → ${OUT_DIR}`);
console.log(`BASELINE: ${BASE_JSON}`);
if (drift.length) process.exitCode = 1;
