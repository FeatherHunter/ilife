// #827 · 查找域 7 场景真产物驱动器：临时库 ＋ 隔离配置 → 逐场景真跑唯一出口 → 收 7 件产物。
//
// 与 `t827-probe-search.mjs` 的分工：那是**开工前**的现状读数（含路由三档），本件是**交付后**的产物驱动
// （跑完把产物抄进一个目录，供分隔符门／响应式门／墙／链路表读）。
//
// 跑法（仓根）：node .scratch/t827/gen-search-pages.mjs
import { mkdirSync, writeFileSync, readdirSync, statSync, existsSync, copyFileSync, rmSync, renameSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { mkMemoDb, seedNote } from '../../../packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs';
import { bookletFileStem } from '../../../packages/skill-memo-ilife/dist/help/booklet.js';

const ROOT = resolve('.');
const CLI = join(ROOT, 'packages', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, '.scratch', 't827', 'pages');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// 页群重建 ⇒ 上一跑的读数一律作废：读数链（`t867-facts.mjs`）缺件才现产，留着旧的会被「复用」，
// 而旧读数记的是旧页名，装配器当场对不上（2026-09-21 实测踩过一次，42 条 FAIL）。
for (const stale of ['sep.json', 'resp.json', 'fmt.json', 'facts.json', 'engine-score.json', 'sep-探针汇总.json']) {
  rmSync(join(ROOT, '.scratch', 't827', stale), { force: true });
}

const dbDir = mkMemoDb('memo-827-pages-');
const DAY = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const ids = [];
ids.push(seedNote(dbDir, { content: '买菜：西红柿、鸡蛋、挂面', category: '备忘', sub: '家务' }));
ids.push(seedNote(dbDir, { content: '咖啡豆快没了，记得补', category: '备忘', sub: '购物' }));
ids.push(seedNote(dbDir, { content: '学会做提拉米苏', category: '心愿', sub: '个人', due: DAY(30) }));
ids.push(seedNote(dbDir, { content: '今天走了 8000 步，状态不错', category: '打卡' }));
ids.push(seedNote(dbDir, { content: '项目评审过了，松了一口气', category: '情绪日记' }));
ids.push(seedNote(dbDir, { content: '读完《设计中的设计》', category: '备忘', due: DAY(7) }));

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
    return { exit: 0, delivery: j.delivery ?? null, total: j.data?.total ?? (j.data?.item ? 1 : null), message: j.message ?? '' };
  } catch (e) {
    return { exit: e.status ?? '?', delivery: null, error: String(e.stderr ?? e.message).trim().split('\n')[0] };
  }
};

// 7 场景（册子 seq 7–13）：唤醒词 ／ 命令 ／ 这一次真跑的参数 ／ 期望主体（＝册子主体）。
const SCENES = [
  { seq: 7, wake: '搜备忘', scene: 'memo_search_keyword', key: 'memo.search', params: { q: '咖啡' } },
  { seq: 8, wake: '查备忘', scene: 'memo_search_alias', key: 'memo.search', params: { q: '咖啡', scene: 'memo_search_alias' } },
  { seq: 9, wake: '看备忘', scene: 'memo_get_detail', key: 'memo.detail', params: { id: ids[1] } },
  { seq: 10, wake: '按时间搜备忘', scene: 'memo_search_by_date', key: 'memo.search', params: { start: DAY(-7), end: DAY(1) } },
  { seq: 11, wake: '查心愿', scene: 'memo_search_wish', key: 'memo.wish', params: { category: '心愿', scene: 'memo_search_wish' } },
  { seq: 12, wake: '查打卡', scene: 'memo_search_checkin', key: 'memo.search', params: { category: '打卡' } },
  { seq: 13, wake: '查情绪', scene: 'memo_search_mood', key: 'memo.search', params: { category: '情绪日记' } },
];

console.log('临时库: ' + dbDir);
console.log('');
console.log('序  唤醒词'.padEnd(20) + '命令'.padEnd(15) + '退出码  命中  产物');
console.log('-'.repeat(120));
const rows = [];
for (const sc of SCENES) {
  const res = run(sc.key, sc.params);
  const want = bookletFileStem(sc.scene);
  let copied = '';
  if (res.delivery?.path && existsSync(res.delivery.path)) {
    copied = join(OUT, res.delivery.path.replace(/\\/g, '/').split('/').pop());
    copyFileSync(res.delivery.path, copied);
  }
  // 撞格防线（#829 未按 `scene` 分格前的现状）：产物主体**不是**本格要的册子主体时，
  // 把它挪进 `out-of-scope/`——它属别人那一格，不能污染本域页群门（分隔符门／响应式门按目录跑）的读数。
  const stem = copied === '' ? '' : copied.replace(/\\/g, '/').split('/').pop().replace(/_\d{8}_\d{6}(_\d+)?\.html$/, '');
  let wrongCell = '';
  if (copied !== '' && stem !== want) {
    const os = join(ROOT, '.scratch', 't827', 'out-of-scope');
    mkdirSync(os, { recursive: true });
    wrongCell = join(os, copied.replace(/\\/g, '/').split('/').pop());
    renameSync(copied, wrongCell);
    copied = '';
  }
  console.log(
    String(sc.seq).padEnd(4) + sc.wake.padEnd(16) + sc.key.padEnd(15) + String(res.exit).padEnd(8)
    + String(res.total ?? '-').padEnd(6)
    + (copied ? copied.replace(ROOT + '\\', '') : wrongCell ? '撞格 → ' + wrongCell.replace(ROOT + '\\', '') + '（要 ' + want + '，实得 ' + stem + '）' : (res.error ?? '（无 delivery）')),
  );
  rows.push({ ...sc, want, ...res, copied, wrongCell });
}

const landed = rows.filter((r) => r.copied !== '').length;
const files = readdirSync(OUT).filter((f) => f.endsWith('.html'));
console.log('');
console.log('落盘 ' + landed + '/' + rows.length + ' 格；pages/ 下 ' + files.length + ' 件');
writeFileSync(join(ROOT, '.scratch', 't827', 'search-pages.json'),
  JSON.stringify({ dbDir, cfgDir, ids, rows, files }, null, 2), 'utf8');
