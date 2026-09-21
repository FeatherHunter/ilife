// #831 · 情绪域 3 场景真产物驱动器（交付后）：临时库 ＋ 隔离配置 → 逐场景真跑唯一出口 → 收 3 件产物。
//
// 形状照同族先例 `docs/skills/skill-memo-ilife/t827-gen-pages.mjs`（查找域）：产物收进 `.scratch/memo-831/pages/`，
// 供分隔符门／响应式门／六列机审／五维尺读数链读。库侧落点仍是 `<库目录>/memo_html/`。
//
// 跑法（仓根）：node docs/skills/skill-memo-ilife/t831-gen-pages.mjs
import { mkdirSync, writeFileSync, readdirSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { mkMemoDb, seedNote } from '../../../packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs';
import { bookletFileStem } from '../../../packages/skill-memo-ilife/dist/help/booklet.js';

const ROOT = resolve('.');
const CLI = join(ROOT, 'packages', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
const WORK = join(ROOT, '.scratch', 'memo-831');
const OUT = join(WORK, 'pages');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// 页群重建 ⇒ 上一跑的读数一律作废（`t867-facts.mjs` 缺件才现产，留着旧的会被「复用」而页名对不上）。
for (const stale of ['sep.json', 'resp.json', 'fmt.json', 'facts.json', 'engine-score.json']) {
  rmSync(join(WORK, stale), { force: true });
}

const dbDir = mkMemoDb('memo-831-pages-');

// 两条情绪日记：一条供「改」、一条供「删」（删完取不到那一行，故「删」必须有自己的对象）。
const forUpdate = seedNote(dbDir, { content: '今天有点累', category: '情绪日记', sub: '疲惫' });
const forDelete = seedNote(dbDir, { content: '被论文卡住，有点烦', category: '情绪日记', sub: '烦躁' });

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
  const args = [CLI, key, '--params', JSON.stringify(params)];
  try {
    const out = execFileSync(process.execPath, args, {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, USERPROFILE: cfgDir, HOME: cfgDir },
    });
    const j = JSON.parse(out);
    return { exit: 0, delivery: j.delivery ?? null, message: j.message ?? '', receipt: j.data ?? null };
  } catch (e) {
    return { exit: e.status ?? '?', delivery: null, error: String(e.stderr ?? e.message).trim().split('\n')[0] };
  }
};

// 3 场景（册子 seq 26／27／28，族「通用回执」）：唤醒词 ／ 场景 id ／ 命令 ／ 这一次真跑的参数。
const SCENES = [
  { seq: 26, wake: '记情绪', scene: 'memo_add_mood', key: 'memo.create', params: { title: '今天心情不错', body: '今天心情不错', category: '情绪日记', sub: '开心' } },
  { seq: 28, wake: '改情绪', scene: 'memo_update_mood', key: 'memo.update', params: { id: forUpdate, body: '今天有点累（改后）' } },
  { seq: 27, wake: '删情绪', scene: 'memo_delete_mood', key: 'memo.remove', params: { id: forDelete, confirm: true } },
];

console.log('临时库: ' + dbDir);
console.log('');
console.log('序  唤醒词'.padEnd(18) + '命令'.padEnd(15) + '退出码  回执  产物');
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
  const stem = copied === '' ? '' : copied.replace(/\\/g, '/').split('/').pop().replace(/_\d{8}_\d{6}(_\d+)?\.html$/, '');
  const ok = copied !== '' && stem === want;
  console.log(
    String(sc.seq).padEnd(4) + sc.wake.padEnd(14) + sc.key.padEnd(15) + String(res.exit).padEnd(8)
    + String(res.message ?? '-').padEnd(16)
    + (copied ? copied.replace(ROOT + '\\', '') + (ok ? '  ✓主体=' + want : '  ✗主体=' + stem + '（要 ' + want + '）')
      : (res.error ?? '（无 delivery）')),
  );
  rows.push({ ...sc, want, ...res, copied, stemOk: ok });
}

// 按域配置由本件现产（判分引擎只许「路径 ＋ 名单」）：产物名带时间戳，手抄一次就必然发霉——
// 由产出者写名单，判分件的 `instances` 与页群永远逐字对齐（形状照 `t827-按域配置.json`）。
const CONFIG = join(ROOT, 'docs', 'skills', 'skill-memo-ilife', 't831-按域配置.json');
writeFileSync(CONFIG, JSON.stringify({
  packagePath: 'packages/skill-memo-ilife',
  readingsDir: '.',
  instances: rows.filter((r) => r.copied !== '').map((r) => ({ file: r.copied.replace(/\\/g, '/').split('/').pop(), key: r.want })),
}, null, 2) + '\n', 'utf8');

const landed = rows.filter((r) => r.copied !== '').length;
const named = rows.filter((r) => r.stemOk).length;
const files = readdirSync(OUT).filter((f) => f.endsWith('.html'));
console.log('');
console.log('落盘 ' + landed + '/' + rows.length + ' 格；主体对册子 ' + named + '/' + rows.length + '；pages/ 下 ' + files.length + ' 件');
console.log('按域配置：' + CONFIG.replace(ROOT + '\\', ''));
writeFileSync(join(WORK, 'mood-pages.json'), JSON.stringify({ dbDir, cfgDir, forUpdate, forDelete, rows, files }, null, 2), 'utf8');
process.exit(landed === rows.length && named === rows.length ? 0 : 1);
