#!/usr/bin/env node
/** #884 · 两列表批量几何门（公共层判据封装，四家共用表的使用者共用一扇门）。
 *
 * 为什么要有这一件：单页群几何门（`check-two-col-align.mjs`，#879）只看**给它的那批页**，
 * 且有两处静默 —— 零表页直接跳过（不访问、不上报）、绿页无逐表读数。于是整组 22 页
 * 一列都没量也能 exit 0（私厨 `t873-录入` 实测：页数=22 含表页=0 受检列=0 全绿）。
 * 本件补的是**报法与名单**，判据口径仍是那一扇门的（按列实际对齐档分派，容差 2px）：
 * 汇总能力不重算别家的口径，只调它的公开接口（`--dir`＋`--json`）。
 *
 * 名单（roster）是什么：页 → 表的**结构快照**（`two-col-manifest.json`，与本件同包根）。
 * 只冻结构（表 id／列数／对齐档），不冻字节 —— 文案改动不红门，表结构漂移才红。
 * 表 id ＝ caption 文本；无题表回退列名拼接（备忘录的表无 caption，卡路里的表有，
 * 实测两类都有 ⇒ 回退是必备分支，不是兼容）。
 * 名单由 `--write-manifest` 从可信构建生成、人核后入仓（快照式：墙迁时随墙票更新，
 * 过期即显式红，不悄悄过）。零表页必须在名单里占一行空表 —— 访问并上报，不跳过。
 *
 * 用法（仓根）：
 *   node packages/base-render/scripts/check-two-col-batch.mjs [--manifest <名单>] [--batch <名>...]
 *   （零参数即跑包根默认名单 `packages/base-render/two-col-manifest.json`）
 *   node packages/base-render/scripts/check-two-col-batch.mjs --dir <页群> [--dir ...]（无名单模式：只跑读数，不核名单）
 *   node packages/base-render/scripts/check-two-col-batch.mjs --write-manifest <出> --dir <页群> [--dir ...] [--label <名>...]
 *   （--label 与 --dir 一一对应，缺省取目录基名，撞名即 exit 2）
 *   选项：`--widths 1280,768,390`（透传给几何门）／`--timeout <毫秒>`（透传）／
 *   `--no-browser`（只跑静态名单核对，几何未验 —— 单元测试与无浏览器 CI 用，屏幕逐行注明）。
 *
 * 报法：逐页逐表行（绿也印，不报平均）＋ 缺件／多件点名行 ＋ RESULT 汇总。
 * 退出码：0 全绿／1 判红或名单不符／2 输入缺失或无浏览器（几何门报 2 即透传 2，不静默变绿）。
 * 依赖：Node ≥ 22。浏览器判读要本机 headless Chrome／Edge（`DSH_BROWSER=<路径>` 可指定）。**零第三方依赖。**
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const LF = String.fromCharCode(10);
const HERE = dirname(fileURLToPath(import.meta.url));
const GATE = join(HERE, 'check-two-col-align.mjs');
const ROOT = resolve(HERE, '..', '..', '..');
const DEFAULT_MANIFEST = join(ROOT, 'packages', 'base-render', 'two-col-manifest.json');

function argOf(name, dflt) {
  const i = process.argv.indexOf(name);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
function argAll(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === name && process.argv[i + 1]) out.push(process.argv[i + 1]);
  }
  return out;
}
const WIDTHS = argOf('--widths', '1280,768,390');
const TIMEOUT = argOf('--timeout', '');
const NO_BROWSER = process.argv.includes('--no-browser');
const WRITE_OUT = argOf('--write-manifest', '');
const MANIFEST_ARG = argOf('--manifest', '');
const BATCHES = argAll('--batch');
const DIRS = argAll('--dir');
/** 批显名（可选，与 --dir 一一对应；缺省取目录基名，撞名即 exit 2）。 */
const LABELS = argAll('--label');

function die(code, msg) {
  console.log('RESULT: ABORT exit=' + code + ' :: ' + msg);
  process.exit(code);
}
/** 名单的正规形：只认装配器写死的类名（与 `renderDataTable` 同源），标签去内嵌件后比对。 */
const stripTags = (s) => String(s).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** 静态解析一页的表（无浏览器）：按文档序逐表取 id／列数／对齐档。 */
function parseTables(html) {
  const tables = [];
  const re = /<table[^>]*class="[^"]*ilife-block-data-table-table[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
  let m;
  let n = 0;
  while ((m = re.exec(html)) !== null) {
    n += 1;
    const body = m[1];
    const cap = /<caption[^>]*>([\s\S]*?)<\/caption>/.exec(body);
    const caption = cap ? stripTags(cap[1]).slice(0, 80) : '';
    const cols = [];
    const thre = /<th[^>]*class="[^"]*ilife-block-data-table-cell-(left|center|right)[^"]*"[^>]*>([\s\S]*?)<\/th>/g;
    let t;
    while ((t = thre.exec(body)) !== null) cols.push({ label: stripTags(t[2]).slice(0, 40), align: t[1] });
    const id = caption !== '' ? caption : (cols.length > 0 ? cols.map((c) => c.label).join('/') : '表' + n);
    tables.push({ id, columns: cols.length, aligns: cols.map((c) => c.align) });
  }
  return tables;
}

/** 递归列页（相对路径 POSIX 式，排序保证名单确定性；表可能住在子目录，如私厨实图对照页）。 */
function htmlFiles(dir) {
  const out = [];
  const walk = (d, prefix) => {
    for (const f of readdirSync(d)) {
      const abs = join(d, f);
      if (statSync(abs).isDirectory()) walk(abs, prefix + f + '/');
      else if (f.toLowerCase().endsWith('.html')) out.push(prefix + f);
    }
  };
  walk(dir, '');
  return out.sort();
}

const toRootRel = (p) => relative(ROOT, resolve(p)).replace(/\\/g, '/');

/* ── --write-manifest：静态扫描批量目录，写名单（供人核后入仓） ── */
if (WRITE_OUT !== '') {
  if (DIRS.length === 0) die(2, '没有输入目录：--write-manifest 需配 --dir <页群>（可重复）');
  if (LABELS.length > 0 && LABELS.length !== DIRS.length) die(2, '--label 须与 --dir 一一对应');
  const batches = {};
  for (let di = 0; di < DIRS.length; di += 1) {
    const d = DIRS[di];
    const dir = resolve(d);
    if (!existsSync(dir) || !statSync(dir).isDirectory()) die(2, '目录不存在：' + dir);
    const files = htmlFiles(dir);
    if (files.length === 0) die(2, '目录内无 HTML：' + dir);
    const label = LABELS.length > 0 ? LABELS[di] : basename(dir);
    if (batches[label]) die(2, '批名重复：' + label + ' —— 加 --label 区分');
    const pages = {};
    for (const f of files) {
      const html = readFileSync(join(dir, f), 'utf8');
      if (!/<!doctype html/i.test(html) || !/<\/head>/i.test(html)) {
        console.log('  · ' + f + ' 无文档壳（片段？冻名单前先确认它是不是发布页）');
      }
      pages[f] = { tables: parseTables(html) };
    }
    batches[label] = { dir: toRootRel(dir), pages };
  }
  const out = resolve(WRITE_OUT);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify({
    version: 1, generatedAt: new Date().toISOString(),
    generator: 'packages/base-render/scripts/check-two-col-batch.mjs --write-manifest',
    batches,
  }, null, 2) + LF, 'utf8');
  const nPages = Object.values(batches).reduce((a, b) => a + Object.keys(b.pages).length, 0);
  console.log('MANIFEST-WROTE ' + out + ' batches=' + Object.keys(batches).join('、') + ' pages=' + nPages);
  process.exit(0);
}

/* ── 核对模式：名单（必给）或无名单 --dir ── */
let batches = {};
/** 未给输入时回退包根默认名单（入仓即冻，全仓只此一处）；没有它才报缺输入。 */
const EFFECTIVE_MANIFEST = MANIFEST_ARG !== '' ? resolve(MANIFEST_ARG)
  : (DIRS.length === 0 && existsSync(DEFAULT_MANIFEST) ? DEFAULT_MANIFEST : '');
if (EFFECTIVE_MANIFEST !== '') {
  const mpath = EFFECTIVE_MANIFEST;
  if (!existsSync(mpath)) die(2, '名单不存在：' + mpath);
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(mpath, 'utf8'));
  } catch (e) {
    die(2, '名单不是合法 JSON：' + mpath + '（' + String(e.message).slice(0, 120) + '）');
  }
  if (!manifest || typeof manifest !== 'object' || !manifest.batches) die(2, '名单缺 batches：' + mpath);
  const want = BATCHES.length > 0 ? BATCHES : Object.keys(manifest.batches);
  for (const b of want) {
    if (!manifest.batches[b]) die(2, '名单无此批：' + b + '（名单内：' + Object.keys(manifest.batches).join('、') + '）');
    batches[b] = manifest.batches[b];
  }
} else {
  if (DIRS.length === 0) die(2, '没有输入且无默认名单：给 --manifest <名单>，或 --dir <页群>（可重复，无名单模式）');
  for (const d of DIRS) batches[basename(resolve(d))] = { dir: toRootRel(d), pages: null };
}

let fileCount = 0;
let tableCount = 0;
let staticDiffs = 0;
let gateReds = 0;
for (const [label, batch] of Object.entries(batches)) {
  const dir = resolve(ROOT, batch.dir);
  console.log('＝ ' + label + ' ' + batch.dir);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.log('  ✗ 批目录不存在：' + batch.dir);
    staticDiffs += 1;
    continue;
  }
  const onDisk = htmlFiles(dir);
  if (onDisk.length === 0) die(2, '批目录内无 HTML：' + batch.dir);
  const roster = batch.pages ?? null;
  if (roster !== null) {
    for (const f of Object.keys(roster)) {
      if (!onDisk.includes(f)) {
        console.log('  ✗ ' + f + ' 缺页（名单有，盘上无）');
        staticDiffs += 1;
      }
    }
    for (const f of onDisk) {
      if (!Object.hasOwn(roster, f)) {
        console.log('  ✗ ' + f + ' 多页（盘上有，名单无 —— 补名单或删页）');
        staticDiffs += 1;
      }
    }
  }
  const actual = {};
  for (const f of onDisk) {
    fileCount += 1;
    const tables = parseTables(readFileSync(join(dir, f), 'utf8'));
    actual[f] = tables;
    tableCount += tables.length;
    if (roster !== null && Object.hasOwn(roster, f)) {
      const wantById = new Map(roster[f].tables.map((t) => [t.id, t]));
      const gotById = new Map(tables.map((t) => [t.id, t]));
      for (const [id, w] of wantById) {
        if (!gotById.has(id)) {
          console.log('  ✗ ' + f + ' 缺表「' + id + '」（名单有，页上无）');
          staticDiffs += 1;
        } else {
          const g = gotById.get(id);
          if (g.columns !== w.columns || g.aligns.join('/') !== w.aligns.join('/')) {
            console.log('  ✗ ' + f + ' 表「' + id + '」漂移（名单 ' + w.columns + '列 ' + w.aligns.join('/')
              + '，页上 ' + g.columns + '列 ' + g.aligns.join('/') + '）');
            staticDiffs += 1;
          }
        }
      }
      for (const [id] of gotById) {
        if (!wantById.has(id)) {
          console.log('  ✗ ' + f + ' 多表「' + id + '」（页上有，名单无 —— 补名单或删表）');
          staticDiffs += 1;
        }
      }
    }
    if (tables.length === 0) {
      console.log('  · ' + f + ' 无表' + (roster !== null ? '（名单亦无，已访问）' : '（已访问）'));
    } else {
      for (let i = 0; i < tables.length; i += 1) {
        console.log('  ✓ ' + f + ' 表' + (i + 1) + '「' + tables[i].id + '」（'
          + tables[i].columns + '列 ' + tables[i].aligns.join('/') + '，静态结构）');
      }
    }
  }
  if (NO_BROWSER) {
    console.log('  · 本批跳过浏览器（--no-browser：几何未验）');
    continue;
  }
  if (staticDiffs > 0) {
    console.log('  · 本批静态已红，跳过浏览器（先对名单）');
    continue;
  }
  /** 显式文件表（不用 --dir）：几何门只读顶层，子目录页必须逐个点名，否则静默漏测。 */
  const files = onDisk.map((f) => join(dir, f));
  const tmp = join(tmpdir(), 'two-col-batch-' + process.pid + '-' + Buffer.from(label).length + '.json');
  const r = spawnSync(process.execPath, [GATE, ...files, '--widths', WIDTHS, ...(TIMEOUT === '' ? [] : ['--timeout', TIMEOUT]), '--json', tmp], { stdio: 'inherit' });
  if (r.error) die(2, '起几何门失败：' + String(r.error.message).slice(0, 160));
  if (r.status === 2) process.exit(2);
  if (r.status !== 0 && r.status !== 1) die(2, '几何门异常退出码：' + r.status);
  try {
    const data = JSON.parse(readFileSync(tmp, 'utf8'));
    gateReds += (data.reds ?? []).length;
  } catch {
    die(2, '几何门机器输出读不到：' + tmp);
  }
}

const bad = staticDiffs + gateReds;
console.log('RESULT: ' + (bad === 0 ? '批量全绿' : '判红 ' + bad + ' 条（名单差异 ' + staticDiffs + '／几何判红 ' + gateReds + '）')
  + '；批数=' + Object.keys(batches).length + ' 页数=' + fileCount + ' 静态表数=' + tableCount
  + (NO_BROWSER ? ' BROWSER-SKIPPED' : '') + ' 容差=2px');
process.exit(bad === 0 ? 0 : 1);
