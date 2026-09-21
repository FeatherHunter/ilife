// #833 开工前的一次性产物驱动（住 tooling/，不作为交付物，也不入提交）。
// 用途：在隔离家目录下把 init 域两格产物落进 .scratch/t833/pages/，供四门与读数链读。
// 跑法（仓根）：node tooling/t833-page-driver.mjs
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, copyFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve('.');
const CLI = join(ROOT, 'packages', 'skill-memo-ilife', 'dist', 'cli', 'cmd_read.js');
const OUT = join(ROOT, '.scratch', 't833', 'pages');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
// 页群重建 ⇒ 上一跑的读数一律作废（同 t827 的教训：读数链缺件才现产，旧读数会被复用）。
for (const stale of ['sep.json', 'resp.json', 'fmt.json', 'facts.json']) {
  rmSync(join(ROOT, '.scratch', 't833', stale), { force: true });
}

// 家目录隔离（#695／#763 口径）：配置落 <家>/.ilife/memo.yaml，绝不碰真家目录。
const home = mkdtempSync(join(tmpdir(), 'memo833-driver-'));
mkdirSync(join(home, '.ilife'), { recursive: true });
writeFileSync(
  join(home, '.ilife', 'memo.yaml'),
  ['db:', '  dir: ' + JSON.stringify(join(home, 'db').replace(/\\/g, '/')), '  name: memo.db',
   'html:', '  dir: memo_html', 'files:', '  help: 备忘录_HELP', '  lookup: 备忘录_速查表',
   'media:', '  dir: media', 'lark:', '  cliPath: ""', '  qrDir: ""', ''].join('\n'),
  'utf8',
);

// 诊断载荷：与 test/t833-init-domain.test.mjs 的 DIAG 同形（三态各一 ＋ 待办 ＋ 验证两形）。
const DIAG = {
  items: [
    { name: '运行环境', status: 'ok', desc: 'Node 可用', action: '' },
    { name: '数据存储', status: 'warn', desc: '全文搜索扩展未装', action: '装全文搜索扩展后重跑' },
    { name: '飞书联动', status: 'err', desc: '未安装飞书 CLI', action: '按指引安装并授权' },
  ],
  todos: [{ title: '装飞书 CLI', steps: ['下安装包', '跑授权'] }],
  verify: ['重跑首次使用看环境检查全绿', { text: '看提醒列表能读出调度结果', status: 'skip' }],
};

const SCENES = [
  { seq: 30, wake: '首次使用', params: { data: DIAG }, cell: '首次使用', kind: '结果页·报告族' },
  { seq: 34, wake: '首次使用-向导', params: { data: DIAG, mode: 'wizard' }, cell: '首次使用-向导', kind: '过程页·向导族' },
];

const run = (params) => {
  try {
    const out = execFileSync(process.execPath, [CLI, 'memo.init', '--params', JSON.stringify(params)], {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, USERPROFILE: home, HOME: home },
    });
    const j = JSON.parse(out);
    return { exit: 0, delivery: j.delivery ?? null, message: j.message ?? '' };
  } catch (e) {
    return { exit: e.status ?? '?', delivery: null, error: String(e.stderr ?? e.message).trim().split('\n')[0] };
  }
};

console.log('隔离家目录: ' + home);
console.log('');
console.log('序  册子格'.padEnd(24) + '退出码  产物');
console.log('-'.repeat(110));
const rows = [];
for (const sc of SCENES) {
  const res = run(sc.params);
  let copied = '';
  if (res.delivery?.path && existsSync(res.delivery.path)) {
    copied = join(OUT, res.delivery.path.replace(/\\/g, '/').split('/').pop());
    copyFileSync(res.delivery.path, copied);
  }
  console.log(String(sc.seq).padEnd(4) + sc.cell.padEnd(20) + String(res.exit).padEnd(8)
    + (copied ? copied.replace(ROOT + '\\', '') : (res.error ?? '（无 delivery）')));
  rows.push({ ...sc, ...res, copied });
}
const files = readdirSync(OUT).filter((f) => f.endsWith('.html'));
console.log('');
console.log('落盘 ' + rows.filter((r) => r.copied !== '').length + '/' + rows.length + ' 格；pages/ 下 ' + files.length + ' 件');
writeFileSync(join(ROOT, '.scratch', 't833', 'init-pages.json'), JSON.stringify({ home, rows, files }, null, 2), 'utf8');
