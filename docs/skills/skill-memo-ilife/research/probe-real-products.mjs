// #820 真产物探针：用仓里现成的测试库基座建临时库 → 跑 4 条**已接线**的页面路径 → 收产物。
// 只碰临时库，**绝不碰活库**（照 test/helpers/memo-sqlite.mjs 的铁律）。
// 跑法：node docs/skills/skill-memo-ilife/research/probe-real-products.mjs
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { mkMemoDb, seedNote, seedReminder } from '../../../../packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs';

const ROOT = resolve('.');
const CLI = join(ROOT, 'packages', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, '.scratch', 'memo-scene-map', 'real-products');
mkdirSync(OUT, { recursive: true });

// ── 1 临时库 ＋ 种子数据 ─────────────────────────────────────────────────────
const dbDir = mkMemoDb('memo-820-');
const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (n) => iso(new Date(today.getTime() + n * 86400000));

const seeded = [];
for (const [content, due, guid] of [
  ['把书房的书架整理一遍', null, null],
  ['学会做提拉米苏', null, null],
  ['去一趟敦煌', plus(30), 'guid-a'],
  ['给旧相机换镜头', plus(-5), null],
  ['读完《设计中的设计》', plus(7), 'guid-b'],
]) seeded.push(seedNote(dbDir, { content, category: '心愿', sub: '个人', due, guid }));
seeded.push(seedNote(dbDir, { content: '买菜：西红柿、鸡蛋、挂面', category: '备忘', sub: '家务' }));
seeded.push(seedNote(dbDir, { content: '今天走了 8000 步，状态不错', category: '打卡' }));
seeded.push(seedNote(dbDir, { content: '项目评审过了，松了一口气', category: '情绪日记' }));
const rid = seedReminder(dbDir, { noteId: seeded[0], at: plus(1) + ' 09:00:00', content: '整理书架' });

// ── 2 隔离配置（db.dir 指向临时库；#754 起配置只落 <家>/.ilife）─────────────────────────────
const cfgDir = join(OUT, 'config');
mkdirSync(join(cfgDir, '.ilife'), { recursive: true });
writeFileSync(
  join(cfgDir, '.ilife', 'memo.yaml'),
  ['db:', "  dir: " + JSON.stringify(dbDir.replace(/\\/g, '/')), '  name: memo.db',
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
      env: { ...process.env, USERPROFILE: cfgDir, HOME: cfgDir},
    });
    const j = JSON.parse(out);
    return { ok: true, exit: 0, delivery: j.delivery ?? null, message: j.message ?? '' };
  } catch (e) {
    return { ok: false, exit: e.status ?? '?', stderr: String(e.stderr ?? e.message).trim().split('\n')[0] };
  }
};

const CASES = [
  ['心愿排期（向导）', 'memo.wish', { wizard: 'plan' }],
  ['完成心愿（向导）', 'memo.wish', { wizard: 'complete' }],
  ['批量改分类（向导）', 'memo.batch', {}],
  ['备忘录同步（报告）', 'memo.sync', {}],
];

console.log('临时库: ' + dbDir);
console.log('隔离配置: ' + cfgDir);
console.log('');
console.log('命令'.padEnd(22) + '退出码   回执');
console.log('-'.repeat(96));
const results = [];
for (const [label, key, params] of CASES) {
  const r = run(key, params);
  results.push({ label, key, params, ...r });
  const tail = r.ok ? (r.delivery ? 'delivery.path=' + r.delivery.path + '  bytes=' + r.delivery.bytes : '（无 delivery）') : r.stderr;
  console.log(label.padEnd(22) + String(r.exit).padEnd(9) + tail);
}

const dirs = [join(dbDir, 'memo_html')];
console.log('');
console.log('=== 产物目录 ===');
let files = [];
for (const d of dirs) {
  if (!existsSync(d)) { console.log('  （不存在）' + d); continue; }
  files = readdirSync(d).filter((f) => f.endsWith('.html'));
  console.log('  ' + d);
  for (const f of files) console.log('    ' + f + '  ' + statSync(join(d, f)).size + ' B');
}
writeFileSync(join(OUT, 'probe-result.json'), JSON.stringify({ dbDir, cfgDir, seeded, rid, results, files }, null, 2), 'utf8');
console.log('');
console.log('汇总：' + results.filter((r) => r.ok).length + '/' + results.length + ' 条跑通；产物 ' + files.length + ' 件');
