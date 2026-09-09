/** #83 · 真机证据探针：三态交付（M4 HTML-First）＋ 渲染失败回执 ＋ envelope `delivery` 字段。
 *
 * 运行（协议 §2.4：持锁包装器）：
 *   node tooling/run-locked.mjs --ticket 83 -- node docs/research/t83-evidence.mjs
 * 前置：`pnpm build` 已产出 dist（本脚本只消费 CLI 出口，不 import 技能源码）。
 * 输出：逐条 `PASS/FAIL <id> …` ＋ 末尾 `RESULT: n/m`（机器可读摘要行）。
 */
import { spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDataText } from '../../packages/base-render/dist/index.js';
import { openDb } from '../../packages/skill-calorie/dist/index.js';
import { buildDeliveredEnvelope } from '../../packages/skill-calorie/dist/cli/cmd_read.js';
import { routesFor } from '../../packages/skill-calorie/dist/triggers/routing.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BIN = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';

let pass = 0;
let fail = 0;
const notes = [];
function check(id, cond, detail) {
  if (cond) { pass += 1; console.log('PASS ' + id + (detail ? ' · ' + detail : '')); } else { fail += 1; console.log('FAIL ' + id + (detail ? ' · ' + detail : '')); }
}
function note(line) { notes.push(line); console.log('NOTE ' + line); }

/* ── 夹具 ─────────────────────────────────────────────────────────────────── */
function mkDb(tag, seed = false) {
  const dir = mkdtempSync(join(tmpdir(), 't83-ev-' + tag + '-'));
  const db = openDb(join(dir, 'calorie_data.db'));
  if (seed) {
    db.prepare("INSERT OR REPLACE INTO user_profile (id, age, gender, height_cm, activity_level) VALUES (1, 30, 'male', 175, 'moderate')").run();
    db.prepare('INSERT OR REPLACE INTO daily_goal (id, calorie_goal, protein_goal, carbs_goal, fat_goal, water_goal) VALUES (1, 1800, 150, 200, 50, 2000)').run();
    for (const [d, t, n, g, cal, p, cb, f] of [
      ['2026-09-05', '08:00:00', '粥', 300, 150, 3, 30, 2],
      ['2026-09-06', '12:30:00', '米饭', 200, 500, 10, 80, 5],
      ['2026-09-07', '19:00:00', '鸡胸', 150, 200, 35, 2, 4],
    ]) {
      db.prepare('INSERT INTO food_log (date, time, food_name, grams, calories, protein, carbs, fat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(d, t, n, g, cal, p, cb, f);
    }
    db.prepare("INSERT OR REPLACE INTO weight_log (date, weight_kg) VALUES ('2026-09-05', 70.5)").run();
    db.prepare("INSERT OR REPLACE INTO weight_log (date, weight_kg) VALUES ('2026-09-07', 70.0)").run();
  }
  db.close();
  return dir;
}

function run(dir, key, params, extra = []) {
  const args = [key];
  if (params !== undefined) args.push('--params', JSON.stringify(params));
  args.push(...extra);
  const r = spawnSync(NODE_BIN, [BIN, ...args], {
    encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, SKILLS_DB_PATH: dir },
  });
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch { env = null; }
  return { status: r.status, stdout: String(r.stdout), stderr: String(r.stderr), env };
}

function receiptOf(stderr) {
  const line = String(stderr).split('\n').find((l) => l.startsWith('RECEIPT '));
  return line ? JSON.parse(line.slice('RECEIPT '.length)) : null;
}

function makeDirReadOnly(dir) {
  if (process.platform === 'win32') {
    const r = spawnSync('icacls', [dir, '/deny', '*S-1-1-0:(W,AD,WD)'], { encoding: 'utf8' });
    if (r.status !== 0) return null;
    return () => spawnSync('icacls', [dir, '/remove:d', '*S-1-1-0'], { encoding: 'utf8' });
  }
  try { chmodSync(dir, 0o555); } catch { return null; }
  return () => { try { chmodSync(dir, 0o755); } catch { /* 尽力还原 */ } };
}

function invocationOf(route) {
  const m = /^calorie-cmd-read\s+(\S+)(?:\s+--params\s+'([\s\S]+)')?$/.exec(route.cli);
  if (!m) throw new Error('cli 形态异常：' + route.cli);
  return { key: m[1], params: m[2] ? JSON.parse(m[2]) : {} };
}

/* ── ① 文件态（默认） ─────────────────────────────────────────────────────── */
const fdir = mkDb('file', true);
for (const [key, params, tpl] of [
  ['calorie.help.lookup', { q: '看今日主页' }, 'fragment'],
  ['calorie.view.diet', { start: '2026-09-05', end: '2026-09-07' }, 'doc-shell'],
  ['calorie.help.center', undefined, 'help-shell'],
  ['calorie.water.log', { ml: 300 }, 'receipt'],
]) {
  const r = run(fdir, key, params);
  const d = r.env && r.env.delivery;
  check('①-file ' + key,
    r.status === 0 && d && d.mode === 'file' && isAbsolute(d.path) && existsSync(d.path)
      && d.path === r.env.data.output && d.bytes === statSync(d.path).size && d.template === tpl
      && !('html' in r.env.data) && !('text' in r.env.data)
      && Object.keys(r.env).join(',') === 'version,skill,shape,key,data,delivery',
    'mode=' + (d && d.mode) + ' template=' + (d && d.template) + ' bytes=' + (d && d.bytes));
}
{
  const r = run(fdir, 'calorie.help.lookup', { q: '看今日主页' });
  check('⑨-P9 成功态 stdout 恒一行 JSON', r.stdout.trim().split('\n').length === 1, 'lines=' + r.stdout.trim().split('\n').length);
}

/* ── ② 内联态（只读目录；真实文件系统拒绝写） ─────────────────────────────── */
const idir = mkDb('inline');
const ibase = run(idir, 'calorie.help.lookup', { q: '看今日主页' });
const baseline = readFileSync(ibase.env.data.output, 'utf8');
const ihtml = join(idir, 'calorie_html');
mkdirSync(ihtml, { recursive: true });
for (const f of readdirSync(ihtml)) rmSync(join(ihtml, f), { force: true });
const iRestore = makeDirReadOnly(ihtml);
if (iRestore === null) {
  check('②-inline 只读模拟可用', false, '本环境无法模拟只读目录');
} else {
  try {
    let probeDenied = false;
    try { writeFileSync(join(ihtml, '.probe'), 'x'); } catch { probeDenied = true; }
    check('②-inline 只读模拟生效（目录新建文件被拒）', probeDenied);
    const r = run(idir, 'calorie.help.lookup', { q: '看今日主页' });
    const d = r.env && r.env.delivery;
    check('②-inline 产物随 envelope 回传',
      r.status === 0 && d && d.mode === 'inline' && d.path === undefined && d.template === 'fragment'
        && typeof r.env.data.html === 'string' && !('output' in r.env.data) && !('text' in r.env.data)
        && d.bytes === Buffer.byteLength(r.env.data.html, 'utf8'),
      'mode=' + (d && d.mode) + ' bytes=' + (d && d.bytes) + ' stdout=' + r.stdout.length + 'B');
    check('②-inline 三态同源（与 ① 落盘产物逐字相同）', r.env.data.html === baseline);
    check('②-inline 严禁降级文字答', !('text' in r.env.data) && r.env.data.html.includes('<section'));
    check('⑨-P9 内联态 stdout 仍一行 JSON', r.stdout.trim().split('\n').length === 1);
  } finally { iRestore(); }
}

/* ── ③ 文本态 ─────────────────────────────────────────────────────────────── */
{
  const tdir = mkDb('text');
  const r = run(tdir, 'calorie.help.center', { mode: 'text' });
  const d = r.env && r.env.delivery;
  check('③-text 渲染层已定文本（help.center mode=text）',
    r.status === 0 && d && d.mode === 'text' && d.template === 'text' && d.path === r.env.data.output
      && readFileSync(r.env.data.output, 'utf8') === r.env.data.text && !('html' in r.env.data)
      && !/<(section|style|script|div|button)\b/.test(r.env.data.text),
    'bytes=' + (d && d.bytes) + ' path=' + (d && d.path ? basename(d.path) : '-'));

  const g = run(tdir, 'calorie.help.lookup', { q: '看今日主页', delivery: 'text' });
  const gd = g.env && g.env.delivery;
  const projected = g.env && buildDataText({
    envelope: { version: g.env.version, skill: g.env.skill, shape: g.env.shape, key: g.env.key, data: g.env.data },
    format: 'text',
  });
  check('③-text 用户明确要文本（delivery:"text"，不落盘＋同源投影）',
    g.status === 0 && gd && gd.mode === 'text' && gd.template === 'text' && gd.path === undefined
      && !('output' in g.env.data) && g.env.data.text === projected
      && gd.bytes === Buffer.byteLength(g.env.data.text, 'utf8'),
    'text=' + JSON.stringify(String(g.env && g.env.data.text).slice(0, 24)));

  // 结构缝：「无对应模板」（`html` 为空 ⇒ 允许文字答）。**如实标注**：97 键全有渲染器，
  // 真机不可达；此处直接调交付装配层，证明该分支存在且产出结构化文本。
  const seam = buildDeliveredEnvelope({
    key: 'calorie.help.lookup', shape: 'list',
    out: { data: { items: [], total: 0 }, html: '' }, params: {}, explicit: undefined,
  });
  check('③-text 结构缝：无 HTML 产物 → 文本态（真机不可达，如实标注）',
    seam.delivery.mode === 'text' && seam.delivery.template === 'text'
      && typeof seam.data.text === 'string' && !('html' in seam.data),
    'template=' + seam.delivery.template);
}

/* ── ④ 渲染失败回执 ───────────────────────────────────────────────────────── */
{
  const bdir = mkDb('blocked');
  writeFileSync(join(bdir, 'calorie_html'), 'not a dir');
  const r = run(bdir, 'calorie.help.center');
  const rec = receiptOf(r.stderr);
  check('④-receipt 结构错落点 → exit 5 ＋ stdout 空 ＋ RECEIPT',
    r.status === 5 && r.stdout === '' && /ERR 5: 渲染失败/.test(r.stderr) && /calorie_html/.test(r.stderr)
      && !/未知失败/.test(r.stderr) && rec !== null,
    'exit=' + r.status);
  check('④-receipt 回执内容（原因＋建议＋建议命令＋模板化页面）',
    rec && rec.ok === false && String(rec.reason).includes('渲染失败')
      && Array.isArray(rec.suggestions) && rec.suggestions.length >= 1
      && /calorie-cmd-read/.test(String(rec.fixPrompt))
      && rec.delivery.template === 'receipt' && rec.delivery.mode === 'inline'
      && String(rec.html).includes('<section') && String(rec.html).includes('渲染失败回执'),
    'sceneName=' + (rec && rec.sceneName) + ' suggestions=' + (rec && rec.suggestions.length));
  check('④-receipt 占位文件未被改写', readFileSync(join(bdir, 'calorie_html'), 'utf8') === 'not a dir');

  const rdir = mkDb('receipt-file');
  writeFileSync(join(rdir, 'blocker'), 'x');
  const r2 = run(rdir, 'calorie.help.lookup', { q: '看今日主页' }, ['--output', join(rdir, 'blocker', 'x.html')]);
  const rec2 = receiptOf(r2.stderr);
  check('④-receipt 回执自身走三态：可写时落盘（#87 命名）',
    r2.status === 5 && rec2 && rec2.delivery.mode === 'file' && existsSync(rec2.delivery.path)
      && /^操作失败_\d{8}_\d{6}(_\d+)?\.html$/.test(basename(rec2.delivery.path))
      && readFileSync(rec2.delivery.path, 'utf8').includes('渲染失败回执'),
    'path=' + (rec2 && basename(rec2.delivery.path)));
}

/* ── ⑤ 与 #81 联动：唤醒词命中即渲染 ──────────────────────────────────────── */
{
  const wdir = mkDb('wake', true);
  const words = ['看今日主页', '看今日饮食概览', '看今日体重概览', '看今日目标进度', '看今日热量预算'];
  const hits = [];
  for (const w of words) {
    const route = routesFor(w).find((r) => r.kind === 'exec');
    if (!route) { hits.push(w + ':无 exec 路由'); continue; }
    const { key, params } = invocationOf(route);
    const r = run(wdir, key, params);
    const d = r.env && r.env.delivery;
    hits.push(w + '→' + key + ':' + (r.status === 0 && d && d.mode === 'file' && existsSync(d.path) && !('text' in r.env.data) ? 'file' : 'FAIL'));
  }
  check('⑤-81 联动 命中即渲染（exec 路由 → CLI → 文件态）',
    hits.every((h) => h.endsWith(':file')), hits.join(' | '));
}

/* ── ⑥ envelope 契约（只追加） ────────────────────────────────────────────── */
{
  const cdir = mkDb('shape', true);
  {
    const db = openDb(join(cdir, 'calorie_data.db'));
    db.prepare("INSERT INTO body_photos (date, time, photo_path, tag, note) VALUES ('2026-09-05', '08:00:00', 'C:/tmp/t83-front.jpg', '正面', '')").run();
    db.prepare("INSERT INTO body_photos (date, time, photo_path, tag, note) VALUES ('2026-09-07', '08:00:00', 'C:/tmp/t83-front2.jpg', '正面', '')").run();
    db.close();
  }
  const shapes = new Map();
  for (const [key, params] of [
    ['calorie.view.home', { date: '2026-09-07' }],
    ['calorie.help.lookup', { q: '看今日主页' }],
    ['calorie.photo.list', {}],
    ['calorie.photo.detail', { id: 1 }],
    ['calorie.photo.gif', { tag: '正面' }],
    ['calorie.water.log', { ml: 200 }],
  ]) {
    const r = run(cdir, key, params);
    if (r.env) shapes.set(key, r.env);
  }
  const ok = [...shapes.entries()].every(([, e]) => Object.keys(e).join(',') === 'version,skill,shape,key,data,delivery');
  const shapeSet = [...new Set([...shapes.values()].map((e) => e.shape))].sort();
  check('⑥-envelope 顶层恒六字段且既有五字段序不变', ok,
    [...shapes.entries()].map(([k, e]) => k + '=' + e.shape).join(' '));
  check('⑥-envelope 形状覆盖（stat／list／detail／analysis／receipt；fallback 无 CLI 出口见 #93）',
    ['analysis', 'detail', 'list', 'receipt', 'stat'].every((s) => shapeSet.includes(s)), shapeSet.join('/'));
  const modes = new Set([...shapes.values()].map((e) => e.delivery.mode));
  check('⑥-delivery 闭集', [...modes].every((m) => ['file', 'inline', 'text'].includes(m)), [...modes].join(''));
  note('交付注入范围：97 键全部产出 HTML 产物（99 键含写键 receipt），故每次成功交付都有 delivery；'
    + '当前不存在「不产出 HTML 的键」（#83 证据 §4 逐键核对）。');
}

console.log('RESULT: ' + pass + '/' + (pass + fail) + (fail === 0 ? ' PASS' : ' FAIL'));
if (notes.length > 0) console.log('NOTES: ' + notes.length);
process.exit(fail === 0 ? 0 : 1);
