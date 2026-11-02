#!/usr/bin/env node
/** #1197 · 回填器：从 zh.ts 出待译清单，再把译文按 key 写进 en.ts（**只填空串**）。
 *
 *  用法：
 *    node tooling/i18n-fill.mjs --pkg skill-bill --list-pending --out .scratch/pending-skill-bill.json
 *    node tooling/i18n-fill.mjs --pkg skill-bill --map .scratch/en-skill-bill.json [--dry]
 *    node tooling/i18n-fill.mjs --pkg skill-bill --selftest
 *  末行固定：RESULT: pkg=<包> mode=<list|fill> pending=<n> filled=<n> blanks=<n> keys=<n>
 *
 *  三条红线（§5.2）：① 只填空串——已有译文的条目**不覆盖**，撞上一律报错不写；
 *  ② key 集合的权威是 zh.ts——未知 key（拼错）、map 内重复 key、空白译文一律报错、一个字节都不写；
 *  ③ 写回 en.ts 时按 zh.ts 的 key 顺序与分节注释落，未改动的行**逐字保留原样**（引号风格不动），重跑幂等。
 *
 *  规格：docs/agents/多语言-渲染语言上下文.md 第 5.2 节。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { placeholdersOf } from './i18n-tables.mjs';
import { backupFile, parseTableText, quoteKey, quoteLiteral, readTable, renderTable } from './i18n-migrate/table.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

function flagOf(argv, name, fallback) {
  const at = argv.indexOf(name);
  return at >= 0 && argv[at + 1] !== undefined && !argv[at + 1].startsWith('--') ? argv[at + 1] : fallback;
}

/** 待译清单：zh 有的 key 里，en 缺这一条、或它的值是空串／纯空白。按 zh 顺序。 */
export function pendingOf(zh, en) {
  const have = new Map(en.entries.map((entry) => [entry.key, entry.value]));
  const out = [];
  for (const entry of zh.entries) {
    const value = have.get(entry.key);
    if (value === undefined) out.push({ key: entry.key, zh: entry.value, placeholders: placeholdersOf(entry.value), state: 'missing' });
    else if (value.trim() === '') out.push({ key: entry.key, zh: entry.value, placeholders: placeholdersOf(entry.value), state: 'blank' });
  }
  return out;
}

/** 读 --map：接受「key→译文」的平表、「[{key, en}]」、「[{key, value}]」，也接受 --list-pending 落的那种带 entries 的包。 */
export function readMap(root, path) {
  const abs = path.startsWith(root) ? path : join(root, path);
  const data = JSON.parse(readFileSync(abs, 'utf8'));
  let rows;
  if (Array.isArray(data)) rows = data;
  else if (data.entries !== undefined && Array.isArray(data.entries)) rows = data.entries;
  else rows = Object.keys(data).map((key) => ({ key, en: data[key] }));
  return rows.map((row) => ({
    key: String(row.key),
    text: row.en === undefined ? (row.value === undefined ? row.zh : row.value) : row.en,
  }));
}

/**
 * 把译文并进 en 表：校验（未知 key／重复／已有译文／空白／占位符）→ 生成新文本。
 * 返回 {ok, errors, text, filled, blanks, keys}；有任一错误时 text 为 null（调用方**不许**写盘）。
 */
export function applyMap({ zh, en, rows }) {
  const errors = [];
  const zhByKey = new Map(zh.entries.map((entry) => [entry.key, entry]));
  const enByKey = new Map(en.entries.map((entry) => [entry.key, entry]));
  const seen = new Set();
  const filled = new Map();
  for (const row of rows) {
    const key = row.key;
    if (seen.has(key)) { errors.push('map 里同一个 key 出现两次：' + key); continue; }
    seen.add(key);
    const zhEntry = zhByKey.get(key);
    if (zhEntry === undefined) { errors.push('map 里的 key 不在 zh.ts 里（拼错了？）：' + key); continue; }
    const text = row.text === undefined || row.text === null ? '' : String(row.text);
    if (text.trim() === '') { errors.push('译文是空白（要留空就别写这一条）：' + key); continue; }
    const want = placeholdersOf(zhEntry.value).join(',');
    const got = placeholdersOf(text).join(',');
    if (want !== got) { errors.push('占位符与 zh 不一致（zh：' + (want === '' ? '无' : want) + '；en：' + (got === '' ? '无' : got) + '）：' + key); continue; }
    const current = enByKey.get(key);
    if (current !== undefined && current.value.trim() !== '') {
      errors.push('en.ts 里这一条已有译文，不覆盖：' + key + '（现有 「' + current.value + '」）');
      continue;
    }
    filled.set(key, text);
  }
  const orphans = en.entries.filter((entry) => !zhByKey.has(entry.key)).map((entry) => entry.key);
  if (orphans.length > 0) errors.push('en.ts 有 zh.ts 里没有的 key（key 集合的权威是 zh）：' + orphans.join('、'));
  if (errors.length > 0) return { ok: false, errors, text: null, filled: 0, blanks: 0, keys: 0 };
  const items = [];
  const blanks = [];
  for (const item of zh.items) {
    if (item.kind === 'section') { items.push(item.raw); continue; }
    if (item.kind !== 'entry') continue;
    const current = enByKey.get(item.key);
    let value;
    if (filled.has(item.key)) value = filled.get(item.key);
    else value = current === undefined ? '' : current.value;
    if (value.trim() === '') blanks.push(item.key);
    const raw = current !== undefined && current.value === value
      ? current.raw
      : '  ' + quoteKey(item.key) + ': ' + quoteLiteral(value) + ',';
    items.push(raw);
  }
  const text = [...en.head, ...items, ...en.tail].join('\n');
  return { ok: true, errors: [], text, filled: filled.size, blanks: blanks.length, keys: items.length };
}

/** 人读报告。 */
function formatReport(report) {
  const lines = [];
  lines.push('# i18n-fill · pkg=' + report.pkg + ' · mode=' + report.mode + (report.dry ? ' · dry=yes' : ''));
  for (const error of report.errors) lines.push('error ' + error);
  for (const entry of report.entries) lines.push('pending  ' + entry.key + '  ' + entry.state + '  「' + entry.zh + '」');
  for (const key of report.filledKeys) lines.push('fill  ' + key);
  lines.push('RESULT: pkg=' + report.pkg + ' mode=' + report.mode + ' pending=' + report.pending + ' filled=' + report.filled + ' blanks=' + report.blanks + ' keys=' + report.keys);
  return lines.join('\n');
}

function loadPair(root, pkg) {
  const zh = readTable(root, pkg, 'zh');
  if (!zh.ok) return { ok: false, why: zh.why };
  const en = readTable(root, pkg, 'en');
  if (!en.ok) return { ok: false, why: en.why };
  return { ok: true, zh, en };
}

function runListPending(root, pkg, out) {
  const pair = loadPair(root, pkg);
  if (!pair.ok) { console.error(pair.why); process.exitCode = 1; return undefined; }
  const pending = pendingOf(pair.zh, pair.en);
  const payload = { pkg, table: 'packages/' + pkg + '/src/entries/en.ts', count: pending.length, entries: pending.map((entry) => ({ key: entry.key, zh: entry.zh, placeholders: entry.placeholders })) };
  if (out === null) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    const abs = join(root, out);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, JSON.stringify(payload, null, 2) + '\n', 'utf8');
    console.log('# 待译清单已落 ' + out + '（' + pending.length + ' 条）');
  }
  console.log('RESULT: pkg=' + pkg + ' mode=list pending=' + pending.length + ' filled=0 blanks=' + pending.length + ' keys=' + pair.zh.entries.length);
  return payload;
}

function runFill(root, pkg, mapPath, dry) {
  const pair = loadPair(root, pkg);
  if (!pair.ok) { console.error(pair.why); process.exitCode = 1; return; }
  let rows;
  try { rows = readMap(root, mapPath); } catch (e) { console.error('读不出 --map：' + e.message); process.exitCode = 1; return; }
  const result = applyMap({ zh: pair.zh, en: pair.en, rows });
  const keys = rows.map((row) => row.key).filter((key, at, all) => all.indexOf(key) === at);
  if (!result.ok) {
    console.error(formatReport({ pkg, mode: 'fill', dry, errors: result.errors, entries: [], filledKeys: [], pending: keys.length, filled: 0, blanks: 0, keys: 0 }));
    console.error('（有一条不合格就整批不写：一个字节都没动）');
    process.exitCode = 1;
    return;
  }
  if (!dry) {
    backupFile(root, 'packages/' + pkg + '/src/entries/en.ts');
    writeFileSync(join(root, 'packages', pkg, 'src', 'entries', 'en.ts'), result.text, 'utf8');
  }
  console.log(formatReport({ pkg, mode: 'fill', dry, errors: [], entries: [], filledKeys: keys, pending: result.blanks + result.filled, filled: result.filled, blanks: result.blanks, keys: result.keys }));
}

function main() {
  const argv = process.argv.slice(2);
  const pkg = flagOf(argv, '--pkg', null);
  const out = flagOf(argv, '--out', null);
  const mapPath = flagOf(argv, '--map', null);
  const root = resolve(flagOf(argv, '--root', ROOT));
  if (argv.includes('--selftest')) {
    import('./test/i18n-migrate-selftest.mjs').then((mod) => {
      const result = mod.runFillSelftest({ root: ROOT, applyMap, pendingOf });
      console.log(result.text);
      process.exitCode = result.failed === 0 ? 0 : 1;
    });
    return;
  }
  if (pkg === null) {
    console.error('用法：node tooling/i18n-fill.mjs --pkg <包> (--list-pending [--out <json>] | --map <json>) [--dry] [--selftest]');
    process.exitCode = 2;
    return;
  }
  if (argv.includes('--list-pending')) { runListPending(root, pkg, out); return; }
  if (mapPath === null) {
    console.error('要么 --list-pending，要么 --map <json>');
    process.exitCode = 2;
    return;
  }
  runFill(root, pkg, mapPath, argv.includes('--dry'));
}

if (process.argv[1] !== undefined && process.argv[1].replace(/\\/g, '/').endsWith('tooling/i18n-fill.mjs')) {
  main();
}
