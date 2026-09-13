#!/usr/bin/env node
/**
 * docs/skills/skill-calorie/t313-routing-oracle.mjs —— 票 #313v 的**独立对照物（oracle）**。
 *
 * 目的：把 `packages/skill-calorie/src/triggers/routing.ts` 的**路由层执行面**在 #313 改造**前**
 * 的语义冻结成可复核证据，供 B 段（把 `routing.ts` 从手写改成生成物）与对抗式复核逐字段比对。
 * 本文件**不是** #313 的实施者产物，**不读 src**（只读 `dist/`，即构建后的真实执行面）。
 *
 * 用法（二选一）：
 *   1) 比对（默认快照路径）：`node docs/skills/skill-calorie/t313-routing-oracle.mjs`
 *      —— 读 `t313-routing-exec-face-before.json`（冻结件，**写入后不许再改**）逐面深比对；
 *         有差异即打印 `DIFF …` 明细并把 `process.exitCode` 置 1。
 *   2) 生成快照：`node docs/skills/skill-calorie/t313-routing-oracle.mjs --dump <路径>`
 *      —— 把当前执行面写成快照（只在建立对照物时用一次）。
 *   可选：`--snapshot <路径>` 指定比对用的快照；`--help` 用法。
 *
 * 前置：`pnpm build` 必须已跑过（脚本引 `packages/skill-calorie/dist/triggers/routing.js`；
 * `dist/` 与 `src/` 不一致时，比对结论只对当时那份 `dist` 成立）。
 *
 * 面（faces）＝ dist 实际导出的执行面，先枚举导出再写死清单：
 *   WAKE_ROUTES／NEW_KEY_ROUTES／COVERAGE_REPAIR_ROUTES／ALL_ROUTES／EXEC_ROUTES／
 *   HIT_NOT_EXEC_ROUTES／OUT_OF_SCOPE_ROUTES／NON_EXEC_REASONS／TWIN_WAKE_WORDS／T71_DIFFS／
 *   ROUTES_BY_WAKE_WORD／EXEC_ROUTE_BY_KEY／ROUTING_SUMMARY（routingSummary() 实调）／
 *   DIRECT_API_PROBES（routesFor／execCliForKey 直调观测）／RECORD_SHAPES（字段全量＋kind／scene 计数）。
 *
 * 比对口径：**顺序敏感**的结构式深比对——数组按下标逐位、对象按**键序**逐键（比
 * `assert.deepStrictEqual` 更严：后者不认键序），记录字段是**全量**（多一个字段也算差异）。
 * `meta` 段（时间戳／sha256）**不参与**比对，只作溯源信息。
 *
 * 输出：每面一行机器可读摘要 `RESULT: <面> before=<n> now=<n> DEEP-EQUAL=<yes|no>`，
 * 差异明细行 `DIFF <路径> field=<字段> before=<旧值> now=<新值>`（每面前若干条）。
 *
 * 反向探针（本脚本自身可被证伪的做法，写进 t313v 证据）：
 *   把冻结快照复制到 `.scratch/t313v/`，在副本上改任一字段 → 本脚本必须 `DEEP-EQUAL=no` 且 exit ≠ 0。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..');
const DIST_ROUTING = path.join(REPO_ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'routing.js');
const SRC_ROUTING = path.join(REPO_ROOT, 'packages', 'skill-calorie', 'src', 'triggers', 'routing.ts');
const DEFAULT_SNAPSHOT = path.join(HERE, 't313-routing-exec-face-before.json');

/** 数组面（逐条记录，顺序敏感） */
const ARRAY_FACES = [
  'WAKE_ROUTES',
  'NEW_KEY_ROUTES',
  'COVERAGE_REPAIR_ROUTES',
  'ALL_ROUTES',
  'EXEC_ROUTES',
  'HIT_NOT_EXEC_ROUTES',
  'OUT_OF_SCOPE_ROUTES',
  'TWIN_WAKE_WORDS',
  'T71_DIFFS',
];
/** 记录式面（由路由记录组成，参与 RECORD_SHAPES 字段全量统计） */
const RECORD_FACES = [
  'WAKE_ROUTES',
  'NEW_KEY_ROUTES',
  'COVERAGE_REPAIR_ROUTES',
  'ALL_ROUTES',
  'EXEC_ROUTES',
  'HIT_NOT_EXEC_ROUTES',
  'OUT_OF_SCOPE_ROUTES',
];
/** 单面差异打印上限 */
const MAX_DIFF_LINES = 12;
/** 单值打印截断长度 */
const MAX_VALUE_CHARS = 220;
/** 缺失标记 */
const ABSENT = '<缺失>';

const rel = (p) => path.relative(REPO_ROOT, p).split(path.sep).join('/');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const clone = (v) => JSON.parse(JSON.stringify(v));

function usage() {
  const text = readFileSync(fileURLToPath(import.meta.url), 'utf8');
  const block = text.match(/\/\*\*([\s\S]*?)\*\*\//);
  return block ? block[1].replace(/^\s*\*?/gm, '').trim() : 't313-routing-oracle.mjs';
}

function parseArgs(argv) {
  const opts = { dump: '', snapshot: DEFAULT_SNAPSHOT, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { opts.help = true; continue; }
    if (arg === '--dump') {
      const value = argv[i + 1];
      if (value === undefined) throw new Error('--dump 缺少取值（快照输出路径）');
      opts.dump = value;
      i += 1;
      continue;
    }
    if (arg === '--snapshot') {
      const value = argv[i + 1];
      if (value === undefined) throw new Error('--snapshot 缺少取值（快照路径）');
      opts.snapshot = path.resolve(REPO_ROOT, value);
      i += 1;
      continue;
    }
    throw new Error(`未知参数：${arg}（用法见 --help）`);
  }
  return opts;
}

/** 执行面：从 dist 模块取每个面的值；缺导出即记哨兵（比对时必然报差异）。 */
function buildFaces(m) {
  const faces = {};
  const take = (name) => {
    if (m[name] === undefined) return { __missingExport: `${name} 未从 dist/triggers/routing.js 导出` };
    return clone(m[name]);
  };
  for (const name of ARRAY_FACES) faces[name] = take(name);
  faces.NON_EXEC_REASONS = take('NON_EXEC_REASONS');
  faces.ROUTES_BY_WAKE_WORD = take('ROUTES_BY_WAKE_WORD');
  faces.EXEC_ROUTE_BY_KEY = take('EXEC_ROUTE_BY_KEY');
  faces.ROUTING_SUMMARY = typeof m.routingSummary === 'function'
    ? clone(m.routingSummary())
    : { __missingExport: 'routingSummary 未从 dist/triggers/routing.js 导出' };
  faces.DIRECT_API_PROBES = buildProbes(m);
  faces.RECORD_SHAPES = buildShapes(m);
  return faces;
}

/** 直调 API 观测（routesFor／execCliForKey 的边界行为，非只读表数据）。 */
function buildProbes(m) {
  const probes = [];
  const probe = (label, fn) => {
    try {
      probes.push({ probe: label, value: fn() });
    } catch (err) {
      probes.push({ probe: label, value: `<throw ${err && err.message}>` });
    }
  };
  if (typeof m.routesFor !== 'function' || typeof m.execCliForKey !== 'function') {
    return [{ probe: 'api-exports', value: '<routesFor／execCliForKey 未导出>' }];
  }
  probe("routesFor('看今日主页')", () => m.routesFor('看今日主页'));
  probe("routesFor(' 看今日主页 ')（trim）", () => m.routesFor(' 看今日主页 '));
  probe("routesFor('记身材照')（三条记录）", () => m.routesFor('记身材照'));
  probe("routesFor('这个唤醒词不存在')", () => m.routesFor('这个唤醒词不存在'));
  probe("routesFor('')", () => m.routesFor(''));
  probe('routesFor(undefined)', () => m.routesFor(undefined));
  probe("execCliForKey('calorie.view.home')", () => m.execCliForKey('calorie.view.home'));
  probe("execCliForKey('calorie.view.goal-recommend')（覆盖修复键）", () => m.execCliForKey('calorie.view.goal-recommend'));
  probe("execCliForKey('calorie.not.a.key')", () => m.execCliForKey('calorie.not.a.key'));
  probe("execCliForKey('')", () => m.execCliForKey(''));
  return probes;
}

/** 字段全量＋kind／scene 计数（人读面；差异必然伴随数据差异）。 */
function buildShapes(m) {
  const shapes = {};
  for (const name of RECORD_FACES) {
    const list = m[name];
    if (!Array.isArray(list)) { shapes[name] = { __missingExport: `${name} 非数组或未导出` }; continue; }
    const fields = new Set();
    const kinds = {};
    const scenes = {};
    let wakeWords = 0;
    for (const r of list) {
      if (r && typeof r === 'object') {
        for (const k of Object.keys(r)) fields.add(k);
        if (typeof r.kind === 'string') kinds[r.kind] = (kinds[r.kind] ?? 0) + 1;
        if (typeof r.scene === 'string') scenes[r.scene] = (scenes[r.scene] ?? 0) + 1;
        if (typeof r.wakeWord === 'string') wakeWords += 1;
      }
    }
    shapes[name] = { count: list.length, fields: [...fields].sort(), kinds, scenes, wakeWords };
  }
  return shapes;
}

function isPlain(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

function brief(v) {
  let text;
  if (v === undefined) text = 'undefined';
  else if (typeof v === 'string') text = JSON.stringify(v);
  else text = JSON.stringify(v);
  if (text === undefined) text = String(v);
  return text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS)}…<截断>` : text;
}

/** 顺序敏感结构式深比对：差异落进 out（{at, field, before, now}）。 */
function walk(before, now, at, out) {
  if (isPlain(before) && isPlain(now)) {
    const bk = Object.keys(before);
    const nk = Object.keys(now);
    if (bk.length !== nk.length || bk.some((k, i) => k !== nk[i])) {
      out.push({ at, field: '(键序/键集)', before: bk.join(' | ') || '<空>', now: nk.join(' | ') || '<空>' });
    }
    for (const k of [...new Set([...bk, ...nk])]) {
      const hasB = Object.prototype.hasOwnProperty.call(before, k);
      const hasN = Object.prototype.hasOwnProperty.call(now, k);
      if (hasB && hasN) walk(before[k], now[k], `${at}.${k}`, out);
      else out.push({ at: `${at}.${k}`, field: k, before: hasB ? brief(before[k]) : ABSENT, now: hasN ? brief(now[k]) : ABSENT });
    }
    return;
  }
  if (Array.isArray(before) && Array.isArray(now)) {
    if (before.length !== now.length) {
      out.push({ at, field: '(长度)', before: String(before.length), now: String(now.length) });
    }
    const n = Math.max(before.length, now.length);
    for (let i = 0; i < n; i += 1) {
      if (i < before.length && i < now.length) walk(before[i], now[i], `${at}[${i}]`, out);
      else {
        out.push({
          at: `${at}[${i}]`,
          field: '(元素)',
          before: i < before.length ? brief(before[i]) : ABSENT,
          now: i < now.length ? brief(now[i]) : ABSENT,
        });
      }
    }
    return;
  }
  if (!Object.is(before, now)) {
    out.push({ at, field: '(值)', before: brief(before), now: brief(now) });
  }
}

function faceSize(v) {
  if (Array.isArray(v)) return v.length;
  if (isPlain(v)) return Object.keys(v).length;
  return 1;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) { console.log(usage()); return 0; }

  if (!existsSync(DIST_ROUTING)) {
    console.error(`FAIL: 缺 ${rel(DIST_ROUTING)}——请先在该仓跑 \`pnpm build\`（持锁：node tooling/run-locked.mjs --ticket <票号> -- pnpm build）。`);
    return 2;
  }
  const distSha = sha256(readFileSync(DIST_ROUTING));
  const srcSha = existsSync(SRC_ROUTING) ? sha256(readFileSync(SRC_ROUTING)) : '<无 src>';
  const m = await import(pathToFileURL(DIST_ROUTING).href);
  const faces = buildFaces(m);

  console.log(`INFO: dist=${rel(DIST_ROUTING)} sha256=${distSha}`);
  console.log(`INFO: src=${rel(SRC_ROUTING)} sha256=${srcSha}`);

  const snapshot = {
    generatedBy: 'docs/skills/skill-calorie/t313-routing-oracle.mjs',
    ticket: '313v',
    purpose: '#313 路由层执行面「改造前」冻结快照：B 段（routing.ts 手写→生成物）必须逐字段等价。',
    frozen: '本文件写入后不许再改；后续任何差异不许靠改它抹平。',
    compare: '顺序敏感结构式深比对；meta 段不参与比对。',
    meta: {
      generatedAt: new Date().toISOString(),
      dist: rel(DIST_ROUTING),
      distSha256: distSha,
      src: rel(SRC_ROUTING),
      srcSha256: srcSha,
      faceNames: Object.keys(faces),
      faceSizes: Object.fromEntries(Object.entries(faces).map(([k, v]) => [k, faceSize(v)])),
    },
    faces,
  };

  if (opts.dump) {
    const outPath = path.resolve(REPO_ROOT, opts.dump);
    mkdirSync(path.dirname(outPath), { recursive: true });
    const content = `${JSON.stringify(snapshot, null, 2)}\n`;
    writeFileSync(outPath, content, 'utf8');
    for (const [name, value] of Object.entries(faces)) {
      console.log(`RESULT: ${name} before=0 now=${faceSize(value)} DEEP-EQUAL=n/a（dump 新建，无对照）`);
    }
    console.log(`RESULT: DUMP path=${rel(outPath)} faces=${Object.keys(faces).length} bytes=${Buffer.byteLength(content)} sha256=${sha256(content)}`);
    return 0;
  }

  if (!existsSync(opts.snapshot)) {
    console.error(`FAIL: 缺快照 ${rel(opts.snapshot)}——用 --dump <路径> 生成，或 --snapshot <路径> 指定。`);
    return 2;
  }
  const snapRaw = readFileSync(opts.snapshot);
  const snap = JSON.parse(snapRaw.toString('utf8'));
  const snapFaces = snap && snap.faces ? snap.faces : null;
  if (!snapFaces || typeof snapFaces !== 'object') {
    console.error(`FAIL: 快照 ${rel(opts.snapshot)} 无 faces 段（不是本 oracle 生成的快照？）`);
    return 2;
  }
  console.log(`INFO: snapshot=${rel(opts.snapshot)} sha256=${sha256(snapRaw)}`);
  console.log(`INFO: snapshot.meta.distSha256=${(snap.meta && snap.meta.distSha256) || '<无>'}`);

  const names = [...new Set([...Object.keys(snapFaces), ...Object.keys(faces)])];
  let diffFaces = 0;
  let diffTotal = 0;
  for (const name of names) {
    const before = Object.prototype.hasOwnProperty.call(snapFaces, name) ? snapFaces[name] : ABSENT;
    const now = Object.prototype.hasOwnProperty.call(faces, name) ? faces[name] : ABSENT;
    const diffs = [];
    walk(before, now, name, diffs);
    const equal = diffs.length === 0;
    if (!equal) { diffFaces += 1; diffTotal += diffs.length; }
    console.log(`RESULT: ${name} before=${faceSize(before)} now=${faceSize(now)} DEEP-EQUAL=${equal ? 'yes' : 'no'}`);
    for (const d of diffs.slice(0, MAX_DIFF_LINES)) {
      console.log(`DIFF ${d.at} field=${d.field} before=${d.before} now=${d.now}`);
    }
    if (diffs.length > MAX_DIFF_LINES) {
      console.log(`DIFF … ${name} 另有 ${diffs.length - MAX_DIFF_LINES} 条差异（明细不逐条打印）`);
    }
  }

  const pass = diffTotal === 0;
  console.log(`RESULT: SUMMARY faces=${names.length} diffFaces=${diffFaces} diffs=${diffTotal} DEEP-EQUAL=${pass ? 'yes' : 'no'}`);
  if (!pass) {
    console.error(`FAIL: 执行面与冻结快照 ${rel(opts.snapshot)} 不一致（${diffFaces} 面／${diffTotal} 条差异）——改造前后不等价，须逐条处置，禁止改快照抹平。`);
    process.exitCode = 1;
  }
  return pass ? 0 : 1;
}

try {
  const code = await main();
  if (process.exitCode === undefined) process.exitCode = code;
} catch (err) {
  console.error(`FAIL: ${err && err.message ? err.message : err}`);
  process.exitCode = 2;
}
