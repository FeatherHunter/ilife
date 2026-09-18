#!/usr/bin/env node
// #380 A-list 真出口锁：combined 71＋趋势 15＋对照 2＝88 全量程序锁。
// 口径：判定①文件存在（真出口跑一次，断言落盘／绝对路径／可打开／字节如实，照 139）
// ＋判定②内容字段正确（结构化断言：包络 stat／指标全有限数／输出逐字消费输入，照 139＋134）；
// 判定③视觉留 #381，本文件不做视觉判断。固定种子库可复算（t81-seed＋CALORIE_TODAY 钉死）；
// 负向非法输入一律大声非 0（防 #154 式静默回退）。字节/sha 只记录不钉死（工作区多票并发会漂移）。
// A-list 定义：routes.ts 中 key 为 combined／multi-trend／long-trend／calorie-trend 的全部（A-FIXED＝88，TOTAL＝169）。
// 用法：node packages/skill-calorie/test/t380-真出口.mjs --all（全量 88；验收用）
// 缺省为冒烟 6 条（首尾 combined 各 1＋multi 2＋对照 2＋负向 6）。
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { calorieConfigDir, freezeClock } from './helpers/config-test.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const ROUTES = join(ROOT, 'packages', 'skill-calorie', 'src', 'analysis', 'routes.ts');
const FULL = process.argv.includes('--all') || process.argv.includes('--check');
const NEGATIVES = [
  ['N1-未知配对', 'calorie.view.combined', '{"pair":"nope","window":"7d"}', '未知配对'],
  ['N2-非法窗口', 'calorie.view.combined', '{"pair":"weight_calorie","window":"bogus"}', 'window 非法'],
  ['N3-越界窗口', 'calorie.view.combined', '{"pair":"weight_calorie","window":"4000d"}', 'window 非法'],
  ['N4-非法分组', 'calorie.view.multi-trend', '{"window":"90d","group":"GX","compare":"target"}', 'group 仅支持'],
  ['N5-非法对照', 'calorie.view.multi-trend', '{"window":"90d","compare":"nope"}', 'compare 仅支持'],
  ['N6-非法趋势窗', 'calorie.view.multi-trend', '{"window":"bogus","compare":"target"}', 'window 非法'],
];

function parseRoutes(src) {
  const records = [];
  for (const line of src.split('\n')) {
    if (!line.includes('wakeWord')) continue;
    const wake = line.match(/wakeWord:\s*'((?:\\'|[^'])*)'/);
    const kind = line.match(/kind:\s*'(exec|non-exec)'/);
    if (!wake || !kind) continue;
    const key = line.match(/key:\s*'([^']+)'/);
    const cli = line.match(/cli:\s*'((?:\\'|[^'])*)'/);
    records.push({ wake: wake[1].replace(/\\'/g, "'"), kind: kind[1], key: key ? key[1] : null, cli: cli ? cli[1].replace(/\\'/g, "'") : null });
  }
  const isA = (r) => r.key === 'calorie.view.combined' || r.key === 'calorie.view.multi-trend' || r.key === 'calorie.view.long-trend' || r.key === 'calorie.view.calorie-trend';
  return { records, aList: records.filter(isA) };
}

function tokenize(cli) {
  const out = [];
  let cur = '';
  let q = null;
  for (const ch of String(cli)) {
    if (q) { if (ch === q) q = null; else cur += ch; }
    else if (ch === "'" || ch === '"') q = ch;
    else if (ch === ' ') { if (cur) { out.push(cur); cur = ''; } }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

const fixPlaceholders = (cli) => String(cli).replaceAll('<开始日期>', '2026-09-01').replaceAll('<结束日期>', '2026-09-07').replaceAll('<日期>', '2026-09-06');
function paramsOf(cli) {
  const toks = tokenize(fixPlaceholders(cli));
  const i = toks.indexOf('--params');
  return i >= 0 && toks[i + 1] ? toks[i + 1] : null;
}

const seedMod = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const distIndex = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const seedDir = mkdtempSync(join(tmpdir(), 't380-seed-'));
const photos = join(seedDir, 'photos');
mkdirSync(photos, { recursive: true });
const dbPath = join(seedDir, distIndex.DB_FILENAME);
const seedDb = distIndex.openDb(dbPath);
seedMod.seedFull(seedDb);
seedDb.close();

function runCli(key, paramsJson) {
  const runDir = mkdtempSync(join(tmpdir(), 't380-out-'));
  copyFileSync(dbPath, join(runDir, basename(dbPath)));
  return { r: spawnSync(process.execPath, [CLI, key, '--params', paramsJson], { encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(runDir, { photos: { dir: photos } }), ...freezeClock('2026-09-07') } }), runDir };
}

function checkOne(rec) {
  const paramsJson = paramsOf(rec.cli);
  if (!paramsJson) return 'cli 取不出 --params: ' + rec.cli;
  const toks = tokenize(fixPlaceholders(rec.cli));
  const key = toks[1];
  if (key !== rec.key) return 'cli 与 key 不一致: ' + rec.cli;
  const { r } = runCli(key, paramsJson);
  if (r.status !== 0) return 'exit=' + r.status + ' stderr=' + String(r.stderr || '').slice(0, 160);
  const lines = String(r.stdout || '').trim().split('\n');
  if (lines.length !== 1) return 'stdout 非一行 JSON（P9）';
  let env = null;
  try { env = JSON.parse(lines[0]); } catch { return 'envelope 非 JSON'; }
  if (env.version !== '0.1.0' || env.shape !== 'stat' || env.key !== rec.key) return '包络 version/shape/key 不对';
  const out = env?.data?.output;
  if (typeof out !== 'string' || !isAbsolute(out)) return '回执非绝对路径';
  if (!existsSync(out)) return '落盘不可读';
  const buf = readFileSync(out);
  if (buf.length === 0) return '空页 0 字节';
  if (statSync(out).size !== buf.length) return '字节链断裂';
  if (env?.delivery?.path !== out || env?.delivery?.bytes !== buf.length) return 'delivery 与 output 不同源';
  const html = buf.toString('utf8');
  if (!html.toLowerCase().startsWith('<!doctype html>')) return '非完整文档';
  if (!html.includes('复制数据')) return '复制区缺失';
  const metrics = env?.data?.metrics;
  if (!metrics || !Object.values(metrics).every((v) => typeof v === 'number' && Number.isFinite(v))) return '指标非全有限数';
  const p = JSON.parse(paramsJson);
  if (rec.key === 'calorie.view.combined') {
    if (!html.includes(p.pair)) return '输出未消费 pair=' + p.pair;
    if (p.window === 'custom') { if (!html.includes(p.start) || !html.includes(p.end)) return '自定义起止未落盘'; }
    else if (!html.includes(p.window)) return '输出未消费 window=' + p.window;
  } else if (rec.key === 'calorie.view.multi-trend') {
    if (!html.includes(p.window)) return '输出未消费 window=' + p.window;
    if (p.group && p.group !== 'comprehensive' && !html.includes(p.group)) return '输出未消费 group=' + p.group;
    if (p.compare && !html.includes(p.compare)) return '输出未消费 compare=' + p.compare;
  } else if (rec.key === 'calorie.view.long-trend') {
    if (p.group && !html.includes(p.group)) return '输出未消费 group=' + p.group;
    if (!html.includes(rec.key)) return '输出未消费 key=' + rec.key;
  } else {
    if (!html.includes(rec.key)) return '输出未消费 key=' + rec.key;
    if (!html.includes('window')) return '输出未带窗口表单';
  }
  return null;
}

function main() {
  const src = readFileSync(ROUTES, 'utf8');
  const { records, aList } = parseRoutes(src);
  const failures = [];
  if (records.length !== 169) failures.push('TOTAL 期望 169 实际 ' + records.length);
  if (aList.length !== 88) failures.push('A-FIXED 期望 88 实际 ' + aList.length);
  const kinds = new Set(aList.map((r) => r.kind));
  if (kinds.size !== 1 || !kinds.has('exec')) failures.push('A-list 须全 exec');
  let jobs = aList;
  if (!FULL) jobs = [aList[0], aList[aList.length - 1], ...aList.filter((r) => r.key === 'calorie.view.multi-trend').slice(0, 2), ...aList.filter((r) => r.key === 'calorie.view.long-trend' || r.key === 'calorie.view.calorie-trend')];
  const records2 = [];
  for (const rec of jobs) {
    const err = checkOne(rec);
    if (err) { failures.push(rec.wake + ' :: ' + err); console.log('FAIL ' + rec.wake + ' :: ' + err); }
    else {
      const paramsJson = paramsOf(rec.cli);
      const { r } = runCli(tokenize(fixPlaceholders(rec.cli))[1], paramsJson);
      const env = JSON.parse(String(r.stdout || '').trim());
      const buf = readFileSync(env.data.output);
      const sha = createHash('sha256').update(buf).digest('hex');
      records2.push({ wake: rec.wake, bytes: buf.length, sha });
      console.log('OK ' + rec.wake + ' bytes=' + buf.length + ' sha=' + sha.slice(0, 16) + '…');
    }
  }
  for (const [tag, key, paramsJson, needle] of NEGATIVES) {
    const { r } = runCli(key, paramsJson);
    if (r.status === 0) { failures.push(tag + ' 非法输入竟 exit 0（静默回退）'); console.log('FAIL ' + tag + ' 静默回退'); }
    else if (!String(r.stderr || '').includes(needle)) { failures.push(tag + ' stderr 缺“' + needle + '”'); console.log('FAIL ' + tag + ' 缺针'); }
    else console.log('OK ' + tag + ' 大声 exit=' + r.status);
  }
  if (FULL && failures.length === 0 && records2.length > 0) {
    const first = jobs[0];
    const paramsJson = paramsOf(first.cli);
    const a = runCli(tokenize(fixPlaceholders(first.cli))[1], paramsJson);
    const b = runCli(tokenize(fixPlaceholders(first.cli))[1], paramsJson);
    const shaA = createHash('sha256').update(readFileSync(JSON.parse(String(a.r.stdout).trim()).data.output)).digest('hex');
    const shaB = createHash('sha256').update(readFileSync(JSON.parse(String(b.r.stdout).trim()).data.output)).digest('hex');
    if (shaA !== shaB) { failures.push('固定种子复算不一致'); console.log('FAIL determinism'); }
    else console.log('OK determinism 同一种子同 sha(' + shaA.slice(0, 16) + '…)');
  }
  const total = jobs.length + NEGATIVES.length + (FULL ? 1 : 0);
  console.log('TRUE-OUTLET: ' + (total - failures.length) + '/' + total);
  console.log('A-FIXED: ' + aList.length + ' (TOTAL ' + records.length + ')');
  if (failures.length > 0) { console.log('CHECK: FAIL'); for (const f of failures) console.log('FAIL-DETAIL: ' + f); process.exit(1); }
  console.log('CHECK: PASS');
}

main();
