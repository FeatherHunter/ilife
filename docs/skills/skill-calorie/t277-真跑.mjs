/** #277 可复跑：四条词**路由真 cli** 逐条实跑 ＋ 三张页的老实物块读数 ＋ 确认→执行链路 ＋ 两态。
 *  日志落 `.scratch/t277/`（本脚本自己写 `.scratch/t277/真跑-结果.json`）。
 *
 *  跑法（仓根，先 `npx tsc -b packages/skill-calorie`）：
 *    node docs/skills/skill-calorie/t277-真跑.mjs
 *  末行摘要：`RESULT-ALL: PASS|FAIL`。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUTDIR = join(ROOT, '.scratch', 't277');
mkdirSync(OUTDIR, { recursive: true });

const { openDb } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);

/** 四条词的路由真值（`src/diet/routes.ts`，逐字照抄）；两条过程型词跑写命令 ＋ `entry:"precheck"`。 */
const CASES = [
  ['批量导入食品', 'calorie.product.import', { items: [{ productName: '测试导入燕麦', calories: 389, protein: 13, fat: 7, carbohydrates: 66, sodium: 5 }], entry: 'precheck' }, '📥 批量导入预览'],
  ['校验批量导入', 'calorie.view.batch-import-preview', { items: [{ foodName: '粥', calories: 150, protein: 3 }], entry: 'validate' }, '📥 批量导入校验'],
  ['拍营养表记一餐', 'calorie.diet.add', { foodName: '鸡胸', calories: 200, protein: 35, carbohydrates: 2, fat: 4, note: '营养表识别', source: 'photo', entry: 'precheck' }, '📷 营养表识别确认'],
  ['拍营养表补记一餐', 'calorie.diet.add', { foodName: '米饭', calories: 500, protein: 10, carbohydrates: 85, fat: 5, date: SEED_TODAY, time: '12:30:00', note: '营养表补记', source: 'photo', entry: 'precheck' }, '📷 营养表识别确认'],
];

function fresh(tag, seed = true) {
  const dir = mkdtempSync(join(tmpdir(), 't277r-' + tag + '-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  if (seed) seedFull(db);
  db.close();
  return dir;
}
const countOf = (dir, t) => {
  const db = openDb(join(dir, 'calorie_data.db'));
  const n = db.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n;
  db.close();
  return Number(n);
};

function run(dir, key, params) {
  const r = spawnSync(process.execPath, [CLI, key, '--params', JSON.stringify(params)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout || '').trim()); } catch { env = null; }
  const out = env?.data?.output ?? null;
  return {
    exit: r.status, stderr: String(r.stderr || '').trim().slice(-240), out,
    bytes: env?.delivery?.bytes ?? null,
    html: out !== null && existsSync(out) ? readFileSync(out, 'utf8') : '',
  };
}

/** 完整文档四条硬事实（判据 1）。 */
function docFacts(html) {
  return {
    doctype0: html.startsWith('<!doctype html>\n<html lang="zh-CN">'),
    charset: html.includes('<meta charset="utf-8">'),
    style: html.includes('<style>'),
    close: html.trimEnd().endsWith('</html>'),
  };
}
const payloads = (html) => [...html.matchAll(/data-t="([^"]*)"/g)].map((m) => m[1]
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));

/** 复制日志第 4 段后半那句「确认后执行 …」＝用户确认后要跑的那条写命令（不带入口标记）。 */
function writeCommandOf(html, key) {
  const prefix = '确认后执行 ';
  const head = 'calorie-cmd-read ' + key + " --params '";
  for (const p of payloads(html)) {
    const i = p.indexOf(prefix + head);
    if (i < 0) continue;
    const start = i + prefix.length;
    const j = p.indexOf("'", start + head.length);
    if (j > 0) return p.slice(start, j + 1);
  }
  return null;
}
function runLine(dir, line) {
  const tok = [];
  let cur = '';
  let q = null;
  for (const ch of line) {
    if (q) { if (ch === q) q = null; else cur += ch; } else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { tok.push(cur); cur = ''; } } else cur += ch;
  }
  if (cur) tok.push(cur);
  return spawnSync(process.execPath, [CLI, ...tok.slice(1)], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: dir, CALORIE_TODAY: SEED_TODAY },
  });
}

const rows = [];
let pass = 0;
for (const [word, key, params, title] of CASES) {
  const dir = fresh('run');
  const r = run(dir, key, params);
  const f = docFacts(r.html);
  const okDoc = r.exit === 0 && isAbsolute(r.out) && statSync(r.out).size === r.bytes
    && f.doctype0 && f.charset && f.style && f.close
    && statSync(r.out).size > 1000 && r.html.includes(title);
  if (okDoc) pass += 1;
  const size = r.out !== null && existsSync(r.out) ? statSync(r.out).size : 0;
  console.log((okDoc ? 'OK   ' : 'FAIL ') + word.padEnd(10) + ' key=' + key + ' exit=' + r.exit
    + ' bytes=' + size + ' 完整文档=' + [f.doctype0, f.charset, f.style, f.close].join('/')
    + '\n     path=' + r.out + (okDoc ? '' : '\n     stderr=' + r.stderr));
  rows.push({ word, key, exit: r.exit, bytes: size, path: r.out, doc: f, title: r.html.includes(title) });
}

/* 确认 → 执行链路：把确认页给的那条写命令原样跑一遍，写后回读计数变化。 */
const chain = [];
for (const [word, pageKey, pageParams, table] of [
  ['批量导入食品', 'calorie.product.import', CASES[0][2], 'nutrition_products'],
  ['拍营养表记一餐', 'calorie.diet.add', CASES[2][2], 'food_log'],
]) {
  const dir = fresh('chain');
  const r = run(dir, pageKey, pageParams);
  const line = writeCommandOf(r.html, pageKey);
  if (line === null) { console.log('FAIL ' + word + ' 确认页没给出「确认后执行」那条命令'); chain.push({ word, ok: false }); continue; }
  const before = countOf(dir, table);
  const w = runLine(dir, line);
  const after = countOf(dir, table);
  const ok = w.status === 0 && after === before + 1;
  if (ok) pass += 0;
  console.log((ok ? 'OK   ' : 'FAIL ') + word.padEnd(10) + ' 确认→执行 exit=' + w.status
    + ' ' + table + ' ' + before + ' → ' + after);
  chain.push({ word, ok, line, exit: w.status, table, before, after });
  rows.push({ word: word + '·确认→执行', key: pageKey, exit: w.status, before, after, ok });
}

/* 两态：库为空仍出完整页；一条都进不了库时出空态句 ＋ 引导句。 */
const twoState = [];
{
  const dir = fresh('emptydb', false);
  const r = run(dir, 'calorie.view.batch-import-preview', { items: [{ productName: '燕麦', calories: 389 }] });
  const f = docFacts(r.html);
  const ok = r.exit === 0 && f.doctype0 && f.close;
  console.log((ok ? 'OK   ' : 'FAIL ') + '库为空'.padEnd(10) + ' exit=' + r.exit + ' bytes=' + r.bytes + ' 完整文档=' + (f.doctype0 && f.close));
  twoState.push({ state: '库为空', exit: r.exit, ok });
}
{
  const dir = fresh('allempty');
  const r = run(dir, 'calorie.product.import', { items: [{ productName: '只有名字' }], entry: 'precheck' });
  const ok = r.exit === 0 && r.html.includes('这次一条都进不了食品库') && r.html.includes('再说一次「批量导入食品」');
  console.log((ok ? 'OK   ' : 'FAIL ') + '一条都进不了库'.padEnd(6) + ' exit=' + r.exit + ' 空态句＋引导句=' + ok);
  twoState.push({ state: '一条都进不了库', exit: r.exit, ok });
}

writeFileSync(join(OUTDIR, '真跑-结果.json'), JSON.stringify({
  at: new Date().toISOString(), seedToday: SEED_TODAY, rows, chain, twoState,
}, null, 2), 'utf8');
const allOk = rows.every((r) => r.ok !== false && r.exit === 0) && chain.every((c) => c.ok) && twoState.every((s) => s.ok);
console.log('RESULT-ALL: ' + (allOk ? 'PASS' : 'FAIL'));
process.exit(allOk ? 0 : 1);
