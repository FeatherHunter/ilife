#!/usr/bin/env node
// 门：显示面列表连接符逐处台账（票 #1311）。
//
// 为什么要有这道门：全仓曾有 157 处 join('、')／join('＋') 混在页面、回执、复制载荷里，
// 其中 146 处是显示面（en 下必须换成 ', ' 与 ' and '），其余是注释、生成物字符串、
// 语言解析期报错、实现本体与存储/文件名契约。这张台账把每一处的处置写死，
// 门负责三件事：
//   ① 盘上不该再有**未登记**的裸 join（新写的代码、或有人把 listJoin 又改回 join）；
//   ② display 条目在盘上**必须已经消失**（改回 join 当场红）；
//   ③ keep／data 条目在盘上**必须还在**（有人顺手把它们也改了，当场红）。
//
// 用法：
//   node tooling/check-i18n-join.mjs              # 本体（无参运行＝真门禁）
//   node tooling/check-i18n-join.mjs --selftest   # 自证（夹具在临时目录里造，不碰仓库）
//   node tooling/check-i18n-join.mjs --root <dir> --ledger <file>   # 夹具与变异用
//
// 出口：全绿 exit 0 并打 PASS/RESULT；任一条红 exit 1，逐条点名叫法与修法。
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..');
const DEFAULT_LEDGER = path.join(DEFAULT_ROOT, 'tooling', 'i18n-join-sites.json');

/** 扫描口径：台账里写的 glob 必须与这里一致（口径漂了就不许拿旧台账冒充绿）。 */
const SCAN_GLOB = 'packages/*/src/**/*.ts';
const SCAN_EXCLUDE = ['**/*.d.ts', '**/dist/**', '**/node_modules/**'];
/** 裸 join：单引号／双引号都算；连接符只认这两个（其余符号不在本票范围）。 */
const RAW_JOIN = new RegExp("\\.join\\(\\s*(['\"])(、|＋)\\1\\s*\\)", 'g');
const CLASSES = new Set(['display', 'data', 'keep']);

const norm = (s) => s.replace(/\s+/g, ' ').trim();

function occurrences(hay, needle) {
  if (!needle) return 0;
  let n = 0, i = hay.indexOf(needle);
  while (i >= 0) { n++; i = hay.indexOf(needle, i + needle.length); }
  return n;
}

/** 走 packages/<包>/src 下的 .ts（不含 .d.ts）；dist／node_modules 一律不进。 */
function scanFiles(root) {
  const out = [];
  const pkgs = path.join(root, 'packages');
  if (!fs.existsSync(pkgs)) return out;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === 'dist') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) out.push(full);
    }
  };
  for (const p of fs.readdirSync(pkgs)) {
    const src = path.join(pkgs, p, 'src');
    if (fs.existsSync(src) && fs.statSync(src).isDirectory()) walk(src);
  }
  return out;
}

function readLedger(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return JSON.parse(raw);
}

/**
 * 本体：读台账 → 扫盘 → 三条判据 → 返回 { reds, stats }。
 * 抽成纯函数（不读 argv、不 exit），供 --selftest 直接调。
 */
function check(root, ledger) {
  const reds = [];
  const red = (code, msg, fix) => reds.push({ code, msg, fix });

  // ---- 台账形状
  if (!ledger || !Array.isArray(ledger.sites)) {
    red('ledger-shape', '台账没有 sites 数组', '修：tooling/i18n-join-sites.json 按 { scan, summary, sites[] } 写');
    return { reds, stats: {} };
  }
  const sites = ledger.sites;
  for (const [i, s] of sites.entries()) {
    const bad = !s || typeof s.path !== 'string' || typeof s.snippet !== 'string'
      || typeof s.line !== 'number' || !CLASSES.has(s.class);
    if (bad) red('ledger-entry', '台账第 ' + (i + 1) + ' 条缺 path/line/snippet/class（class 只收 display｜data｜keep）',
      '修：补齐该条；snippet 用该行 join 片段的原文（空白可压成单空格）');
  }
  if (reds.length) return { reds, stats: {} };

  // ---- 扫描口径
  const scan = ledger.scan || {};
  if (scan.glob !== SCAN_GLOB) red('scan-glob', '台账 scan.glob=' + JSON.stringify(scan.glob) + '，门实现的是 ' + JSON.stringify(SCAN_GLOB),
    '修：把台账 scan.glob 改回 ' + SCAN_GLOB + '（口径与实现必须同一句）');
  const ex = Array.isArray(scan.exclude) ? scan.exclude : [];
  for (const want of SCAN_EXCLUDE) {
    if (!ex.includes(want)) red('scan-exclude', '台账 scan.exclude 缺 ' + JSON.stringify(want), '修：补齐该排除项（build 产物不该被点名）');
  }

  // ---- 扫盘
  const files = new Map(); // rel -> { text, normText, raw: [idx...] }
  for (const full of scanFiles(root)) {
    const rel = path.relative(root, full).replace(/\\/g, '/');
    const text = fs.readFileSync(full, 'utf8');
    const raw = [];
    const re = new RegExp(RAW_JOIN.source, 'g');
    let m;
    while ((m = re.exec(text))) raw.push({ idx: m.index, len: m[0].length });
    files.set(rel, { text, normText: norm(text), raw });
  }

  // ---- 判据 ①②③（逐条）
  const covered = new Map(); // rel -> 已登记的裸 join 出现次数
  let displayLeft = 0, missing = 0;
  for (const s of sites) {
    const f = files.get(s.path);
    if (!f) {
      if (s.class === 'display') { displayLeft++; red('display-file-gone', '台账点名的文件不存在：' + s.path, '修：文件改名／搬家后同步台账（或删掉这条）'); }
      else { missing++; red('entry-file-gone', '台账点名的文件不存在：' + s.path + '（' + s.class + '）', '修：改台账 path，或把该条换成实况'); }
      continue;
    }
    const n = occurrences(f.normText, norm(s.snippet));
    if (s.class === 'display') {
      if (n > 0) { displayLeft++; red('display-residue', '显示面残留裸 join：' + s.path + ':' + s.line + ' :: ' + s.snippet,
        '修：改成 listJoin(currentRenderLanguage(), <收件表达式>)（加号走 plusJoin）'); }
    } else {
      if (n === 0) { missing++; red('entry-missing', '台账条目盘上找不到：' + s.path + ':' + s.line + '（' + s.class + '）:: ' + s.snippet,
        '修：若这处已改成 listJoin，把该条改成 display；若只是行号变了，snippet 应仍然对得上，检查是否被改写'); }
      else covered.set(s.path, (covered.get(s.path) || 0) + n);
    }
  }

  // ---- 判据④：盘上每一处裸 join 都必须被某个 keep／data 条目认领
  let live = 0, extra = 0;
  for (const [rel, f] of files) {
    if (!f.raw.length) continue;
    live += f.raw.length;
    const cov = covered.get(rel) || 0;
    if (f.raw.length !== cov) {
      extra += f.raw.length - cov;
      const lines = [...new Set(f.raw.map((r) => f.text.slice(0, r.idx).split('\n').length))];
      red('unregistered-site', '未登记的裸 join：' + rel + ' 现场 ' + f.raw.length + ' 处、台账认领 ' + cov + ' 处（行 ' + lines.join('／') + '）',
        '修：在 tooling/i18n-join-sites.json 补条目；显示面的改成 listJoin/plusJoin，不许留裸 join');
    }
  }

  // ---- 判据⑤：summary 与台账、实况对账
  const sum = ledger.summary || {};
  const byClass = { display: 0, data: 0, keep: 0 };
  for (const s of sites) byClass[s.class]++;
  if (sum.raw_total !== sites.length) red('summary-total', 'summary.raw_total=' + sum.raw_total + '，台账实有 ' + sites.length + ' 条', '修：raw_total 改成台账条数');
  if (sum.display !== byClass.display) red('summary-display', 'summary.display=' + sum.display + '，台账实有 ' + byClass.display + ' 条', '修：改成实有数');
  if (sum.keep !== byClass.keep) red('summary-keep', 'summary.keep=' + sum.keep + '，台账实有 ' + byClass.keep + ' 条', '修：改成实有数');
  if (sum.data !== byClass.data) red('summary-data', 'summary.data=' + sum.data + '，台账实有 ' + byClass.data + ' 条', '修：改成实有数');
  if (sum.remaining_raw !== byClass.keep + byClass.data) red('summary-remaining', 'summary.remaining_raw=' + sum.remaining_raw + '，按台账应剩 ' + (byClass.keep + byClass.data) + ' 处', '修：改成 keep＋data 的条数');
  if (live !== byClass.keep + byClass.data) red('summary-live', '盘上裸 join ' + live + ' 处，台账登记的 keep／data ' + (byClass.keep + byClass.data) + ' 处', '修：逐条看──多出来的是新写的裸 join（改成 listJoin），少掉的是被改写的登记条目（改 class）');

  return { reds, stats: { sites: sites.length, live, display: byClass.display, keep: byClass.keep, data: byClass.data, extra, displayLeft, missing } };
}

function runCheck(root, ledgerFile) {
  const ledger = readLedger(ledgerFile);
  const { reds, stats } = check(root, ledger);
  console.log('SCAN-ROOT: ' + root);
  console.log('LEDGER: ' + ledgerFile);
  if (!reds.length) {
    console.log('PASS: 显示面列表连接符台账一致（盘上裸 join ' + stats.live + ' 处，全部登记为非 display；显示面残留 0）');
    console.log('RESULT: 5/5');
    return 0;
  }
  for (const r of reds) {
    console.log('RED [' + r.code + '] ' + r.msg);
    console.log('  ' + r.fix);
  }
  console.log('RESULT: ' + (5 - Math.min(reds.length, 5)) + '/5');
  return 1;
}

// ---------------------------------------------------------------- selftest
function selftest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-join-'));
  const root = tmp;
  const mk = (rel, body) => { const p = path.join(root, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, body, 'utf8'); };
  const base = () => {
    fs.rmSync(path.join(root, 'packages'), { recursive: true, force: true });
    mk('packages/alpha/src/display.ts', "export const s = listJoin(currentRenderLanguage(), xs);\n");
    mk('packages/alpha/src/keep.ts', "export const k = xs.join('、');\n");
  };
  const baseLedger = () => ({
    scan: { glob: SCAN_GLOB, exclude: SCAN_EXCLUDE.slice() },
    summary: { raw_total: 2, display: 1, keep: 1, data: 0, remaining_raw: 1 },
    sites: [
      { path: 'packages/alpha/src/display.ts', line: 1, snippet: "xs.join('、')", class: 'display' },
      { path: 'packages/alpha/src/keep.ts', line: 1, snippet: "xs.join('、')", class: 'keep' },
    ],
  });
  const cases = [];
  const add = (name, setup, mutate, expect) => cases.push({ name, setup, mutate, expect });
  const noop = () => {};

  add('baseline 全绿', base, noop, null);
  add('display 条目盘上仍有裸 join（改回 join）', base, (L) => {
    mk('packages/alpha/src/display.ts', "export const s = xs.join('、');\n");
  }, 'display-residue');
  add('keep 条目盘上找不到（被顺手改了）', base, () => {
    mk('packages/alpha/src/keep.ts', "export const k = listJoin(currentRenderLanguage(), xs);\n");
  }, 'entry-missing');
  add('未登记的新站点', base, () => {
    mk('packages/alpha/src/new.ts', "export const n = ys.join('、');\n");
  }, 'unregistered-site');
  add('summary 对不上', base, (L) => { L.summary.remaining_raw = 9; }, 'summary-remaining');
  add('台账点名的文件不存在', base, (L) => { L.sites.push({ path: 'packages/alpha/src/gone.ts', line: 1, snippet: "zs.join('、')", class: 'keep' }); }, 'entry-file-gone');
  add('扫描口径漂了（glob 改错）', base, (L) => { L.scan.glob = 'packages/*/src/*.ts'; }, 'scan-glob');

  let ok = 0;
  for (const [i, c] of cases.entries()) {
    c.setup();
    const L = baseLedger();
    c.mutate(L);
    const { reds } = check(root, L);
    const codes = reds.map((r) => r.code);
    const pass = c.expect === null ? reds.length === 0 : codes.includes(c.expect);
    if (pass) ok++;
    else console.log('SELFTEST 失败 #' + (i + 1) + ' ' + c.name + ' → 期望 ' + (c.expect || '全绿') + '，实得 ' + (codes.join(',') || '全绿'));
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  if (ok === cases.length) {
    console.log('PASS: 自证 ' + ok + '/' + cases.length + '（合规变异必红、原样必绿）');
    console.log('SELFTEST: ' + ok + '/' + cases.length);
    return 0;
  }
  console.log('SELFTEST: ' + ok + '/' + cases.length);
  return 1;
}

// ---------------------------------------------------------------- 入口
const argv = process.argv.slice(2);
const argOf = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
if (argv.includes('--selftest')) {
  process.exit(selftest());
} else {
  const root = argOf('--root') ? path.resolve(argOf('--root')) : DEFAULT_ROOT;
  const ledgerFile = argOf('--ledger') ? path.resolve(argOf('--ledger')) : path.join(root, 'tooling', 'i18n-join-sites.json');
  process.exit(runCheck(root, ledgerFile));
}
