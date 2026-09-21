// #827 · search 域现状探针：本域 7 个场景逐条「唤醒词 → 真路由 → 真跑命令 → 看产物」。
//
// 口径（照 `research/probe-real-products.mjs` 与 `t822-现状链路表.md`）：
//   ① 唤醒词与场景取自官方源 `src/help/scenes/search.ts`（HELP 是官方源）；
//   ② 「真路由」＝把主名喂给 `routeWakeword()`（#855 重排后住 `dist/triggers/wakewords.js`），
//      两类错分开记：`POLICY_NO_MATCH`（表里没这条词）≠ `POLICY_MISSING_SLOT`（词命中了、槽位没给）；
//   ③ 每场景补齐它自己的槽位再跑一次真命令（临时库 ＋ 隔离配置，**绝不碰活库**）；
//   ④ 记退出码 ＋ 回执里 `delivery`（页外无 delivery ＝ 这次没落盘）。
//
// 跑法：node docs/skills/skill-memo-ilife/t827-probe-search.mjs
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { mkMemoDb, seedNote, seedReminder } from '../../../packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs';
import { routeWakeword } from '../../../packages/skill-memo-ilife/dist/triggers/wakewords.js';

const ROOT = resolve('.');
const CLI = join(ROOT, 'packages', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, '.scratch', 'memo-t827', 'probe');
mkdirSync(OUT, { recursive: true });

// ── 1 临时库 ＋ 覆盖本域 7 场景的种子数据 ───────────────────────────────────────
const dbDir = mkMemoDb('memo-827-');
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => iso(new Date(Date.now() + n * 86400000));

const seeded = [];
seeded.push(seedNote(dbDir, { content: '买菜：西红柿、鸡蛋、挂面', category: '备忘', sub: '家务' }));
seeded.push(seedNote(dbDir, { content: '咖啡豆快没了，记得补', category: '备忘', sub: '购物' }));
seeded.push(seedNote(dbDir, { content: '学会做提拉米苏', category: '心愿', sub: '个人', due: plus(30) }));
seeded.push(seedNote(dbDir, { content: '今天走了 8000 步，状态不错', category: '打卡' }));
seeded.push(seedNote(dbDir, { content: '项目评审过了，松了一口气', category: '情绪日记' }));
seedReminder(dbDir, { noteId: seeded[1], at: plus(1) + ' 09:00:00', content: '补咖啡豆' });

// ── 2 隔离配置（db.dir 指向临时库；#754 起配置只落 <家>/.ilife）────────────────
const cfgDir = join(OUT, 'config');
mkdirSync(join(cfgDir, '.ilife'), { recursive: true });
writeFileSync(
  join(cfgDir, '.ilife', 'memo.yaml'),
  ['db:', '  dir: ' + JSON.stringify(dbDir.replace(/\\/g, '/')), '  name: memo.db',
   'html:', '  dir: memo_html', 'files:', '  help: 备忘录_HELP', '  lookup: 备忘录_速查表',
   'media:', '  dir: media', 'lark:', '  cliPath: ""', '  qrDir: ""', ''].join('\n'),
  'utf8',
);

const run = (key, params) => {
  const args = [CLI, key];
  if (params) args.push('--params', JSON.stringify(params));
  try {
    const out = execFileSync(process.execPath, args, {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, USERPROFILE: cfgDir, HOME: cfgDir },
    });
    const j = JSON.parse(out);
    return { exit: 0, delivery: j.delivery ?? null, items: Array.isArray(j.data?.items) ? j.data.items.length : null, message: j.message ?? '' };
  } catch (e) {
    return { exit: e.status ?? '?', delivery: null, items: null, error: String(e.stderr ?? e.message).trim().split('\n')[0] };
  }
};

const route = (phrase, ctx) => {
  try { return { ok: true, ...routeWakeword(phrase, ctx) }; }
  catch (e) { return { ok: false, code: e.code ?? e.name, msg: e.message }; }
};

// 7 场景：主名 ＋ 它这次要补的槽位（照 HELP prompt 里的字段）＋ 真跑参数。
const SCENES = [
  { id: 'memo_search_keyword', wake: '搜备忘', ctx: { q: '咖啡' }, run: { key: 'memo.search', params: { q: '咖啡' } } },
  { id: 'memo_search_alias', wake: '查备忘', ctx: { q: '咖啡' }, run: { key: 'memo.search', params: { q: '咖啡' } } },
  { id: 'memo_get_detail', wake: '看备忘', ctx: { id: seeded[0] }, run: { key: 'memo.detail', params: { id: seeded[0] } } },
  { id: 'memo_search_by_date', wake: '按时间搜备忘', ctx: { start: plus(-7), end: plus(1) }, run: { key: 'memo.search', params: { start: plus(-7), end: plus(1) } } },
  { id: 'memo_search_wish', wake: '查心愿', ctx: {}, run: { key: 'memo.wish', params: {} } },
  { id: 'memo_search_checkin', wake: '查打卡', ctx: {}, run: { key: 'memo.search', params: { category: '打卡' } } },
  { id: 'memo_search_mood', wake: '查情绪', ctx: {}, run: { key: 'memo.search', params: { category: '情绪日记' } } },
];

console.log('临时库: ' + dbDir);
console.log('隔离配置: ' + cfgDir);
console.log('');
console.log('场景'.padEnd(26) + '唤醒词'.padEnd(14) + '路由'.padEnd(24) + '退出码  产物 / 错误');
console.log('-'.repeat(130));

const rows = [];
for (const s of SCENES) {
  const r1 = route(s.wake, {});
  const r2 = r1.ok ? r1 : route(s.wake, s.ctx);
  const routed = r1.ok ? r1.key + '（直接命中）' : r2.ok ? r2.key + '（按 needs 补槽位后命中）' : r1.code;
  const res = r2.ok ? run(s.run.key, s.run.params) : { exit: '-', delivery: null, error: '路由不到，未跑命令' };
  const tail = res.delivery ? '产物 ' + res.delivery.path + '（' + res.delivery.bytes + ' B）' : (res.error ?? '（无 delivery：本次未落盘）');
  console.log(s.id.padEnd(26) + s.wake.padEnd(14) + routed.padEnd(24) + String(res.exit).padEnd(8) + tail);
  rows.push({ ...s, routeNoSlot: r1.ok ? 'DIRECT' : r1.code, routeWithSlot: r2.ok ? r2.key : r2.code, run: res });
}

const htmlDir = join(dbDir, 'memo_html');
let files = [];
if (existsSync(htmlDir)) files = readdirSync(htmlDir).filter((f) => f.endsWith('.html'));
console.log('');
console.log('=== 本域产物 ===');
if (files.length === 0) console.log('  （memo_html 下 0 件 .html）');
for (const f of files) console.log('  ' + f + '  ' + statSync(join(htmlDir, f)).size + ' B');

const summary = {
  scenes: rows.length,
  routeNoSlotOk: rows.filter((r) => r.routeNoSlot === 'DIRECT').length,
  routeWithSlotOk: rows.filter((r) => r.routeWithSlot && !r.routeWithSlot.startsWith('POLICY_')).length,
  exitZero: rows.filter((r) => r.run.exit === 0).length,
  delivered: rows.filter((r) => r.run.delivery).length,
  files: files.length,
};
console.log('');
console.log('汇总：' + JSON.stringify(summary));
writeFileSync(join(OUT, 'search-probe.json'), JSON.stringify({ dbDir, cfgDir, seeded, rows, files, summary }, null, 2), 'utf8');
