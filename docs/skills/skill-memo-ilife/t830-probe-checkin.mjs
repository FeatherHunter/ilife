// #830 打卡域：开工前现状探针（只碰临时库，绝不连活库）。
// 1) 三条唤醒词真喂 routeWakeword 看路由；2) 三条命令真跑 CLI 看退出码／delivery／产物；
// 3) 字段名对照：HELP 场景字段（content／sub_category／id／reminder_id）vs 今天命令面认的名。
// 跑法：node docs/skills/skill-memo-ilife/t830-probe-checkin.mjs
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve('.');
/** 仓根相对导入（本件住 docs/ 下，相对路径会指错；一律经仓根拼绝对路径）。 */
const load = (rel) => import(pathToFileURL(join(ROOT, rel)).href);
const { mkMemoDb, seedNote } = await load('packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs');
const CLI = join(ROOT, 'packages', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, '.scratch', 't830', 'now');
mkdirSync(OUT, { recursive: true });

// ── 1 临时库 ＋ 打卡种子 ────────────────────────────────────────────────────
const dbDir = mkMemoDb('memo-830-');
const noteId = seedNote(dbDir, { content: '今天跑步 5 公里', category: '打卡', sub: '跑步' });
seedNote(dbDir, { content: '备忘：买菜', category: '备忘' });

// ── 2 隔离配置（照 research/probe-real-products.mjs 的形状）──────────────────
const cfgDir = join(OUT, 'config');
mkdirSync(join(cfgDir, '.ilife'), { recursive: true });
writeFileSync(
  join(cfgDir, '.ilife', 'memo.yaml'),
  ['db:', '  dir: ' + JSON.stringify(dbDir.replace(/\\/g, '/')), '  name: memo.db',
   'html:', '  dir: memo_html', 'files:', '  help: 备忘录_HELP', '  lookup: 备忘录_速查表',
   'media:', '  dir: media', 'lark:', '  cliPath: ""', '  qrDir: ""', ''].join('\n'),
  'utf8',
);

// ── 3 路由：三条唤醒词（#858：路由件的家从 `triggers/wakewords.js` 改指 `triggers/routing.js`，只改路径）
const { routeWakeword } = await load('packages/skill-memo-ilife/dist/triggers/routing.js');
const CASES_ROUTE = [
  ['记打卡', { content: '今天跑步 5 公里', sub_category: '跑步' }],
  ['改打卡', { id: String(noteId), content: '今天跑步 6 公里' }],
  ['删打卡', { id: String(noteId) }],
  ['查打卡', {}],
];
console.log('=== 一 路由（真喂 routeWakeword）===');
const routes = [];
for (const [w, ctx] of CASES_ROUTE) {
  try {
    const r = routeWakeword(w, ctx);
    routes.push({ wake: w, ok: true, key: r.key, params: r.params });
    console.log(w.padEnd(8) + ' -> ' + r.key + '  ' + JSON.stringify(r.params));
  } catch (e) {
    routes.push({ wake: w, ok: false, code: e.code, message: e.message });
    console.log(w.padEnd(8) + ' -> ERR ' + e.code + ' ' + e.message);
  }
}

// ── 4 真跑：HELP 字段名 vs 今天命令面认的名 ─────────────────────────────────
const run = (key, params) => {
  const args = [CLI, key];
  if (params) args.push('--params', JSON.stringify(params));
  try {
    const out = execFileSync(process.execPath, args, {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, USERPROFILE: cfgDir, HOME: cfgDir },
    });
    const j = JSON.parse(out);
    return { ok: true, exit: 0, delivery: j.delivery ?? null, message: j.message ?? '', data: j.data };
  } catch (e) {
    return { ok: false, exit: e.status ?? '?', stderr: String(e.stderr ?? e.message).trim().split('\n')[0] };
  }
};

console.log('');
console.log('=== 二 真跑（临时库 ' + dbDir + '）===');
const CASES = [
  ['记打卡（HELP 字段名）', 'memo.create', { content: '今天跑步 7 公里', category: '打卡', sub_category: '跑步' }],
  ['记打卡（今天命令面认的名）', 'memo.create', { body: '今天跑步 7 公里', category: '打卡', sub: '跑步' }],
  ['改打卡（HELP 字段名）', 'memo.update', { id: noteId, content: '今天跑步 8 公里' }],
  ['改打卡（今天命令面认的名）', 'memo.update', { id: noteId, body: '今天跑步 8 公里' }],
  ['删打卡（带 confirm）', 'memo.remove', { id: noteId, confirm: true }],
];
const results = [];
for (const [label, key, params] of CASES) {
  const r = run(key, params);
  results.push({ label, key, params, ...r });
  const tail = r.ok
    ? (r.delivery ? 'delivery.path=' + r.delivery.path + '  bytes=' + r.delivery.bytes : '（无 delivery）') + '  msg=' + r.message
    : r.stderr;
  console.log(label.padEnd(26) + String(r.exit).padEnd(4) + tail);
}

// ── 5 产物目录 ─────────────────────────────────────────────────────────────
const htmlDir = join(dbDir, 'memo_html');
console.log('');
console.log('=== 三 产物目录（' + htmlDir + '）===');
if (!existsSync(htmlDir)) console.log('  （不存在）');
else {
  const files = readdirSync(htmlDir).filter((f) => f.endsWith('.html'));
  if (files.length === 0) console.log('  （空）');
  for (const f of files) console.log('  ' + f + '  ' + statSync(join(htmlDir, f)).size + ' B');
}

writeFileSync(join(OUT, 'probe-result.json'), JSON.stringify({ dbDir, noteId, routes, results }, null, 2), 'utf8');
console.log('');
console.log('读数落盘：' + join(OUT, 'probe-result.json'));
