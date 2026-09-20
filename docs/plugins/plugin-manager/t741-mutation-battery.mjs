// 票 #741 变异电池（协议 §2.4.5：持锁窗口内直调，不嵌套包装器）。
//
// 三枪：
//   MUT-741-A／B —— 打**取数口**那半（上一手带来的两枪：一家落定就回调／回调抛错不许拖下水）。
//   MUT-741-C    —— 打**面板**那半：把 `health-panel.ts` 改回「等整批落定才一次写」，
//                   也就是维护者真机看到的那条写法（「所有插件全部体检好后全量提示出来的」）。
//
// 为什么要有 C：A／B 都在 `health-fetch.ts` 上，面板那一格原先没有任何枪看守——
// 改回「攒齐了一次写」时 B 组照样绿，而屏上的表现正是用户报的那条。
//
// 用法（一律经持有锁的窗口调用）：
//   node .scratch/<窗口>/…            # 被包装器持锁时直调
//   node docs/plugins/plugin-manager/t741-变异电池.mjs [--only C]
//
// 纪律（协议 §5）：每枪「改坏 → 必红 → 逐文件还原 → 必绿」；脚本末尾复核三个受版本控制的件
// 与开跑前**逐字节相同**（`FINAL: all-restored=`），非 true 即非 0 退出（不许带着脏树释放锁）。
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const REPO = new URL('../../../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
/** 仓根下的相对路径 → 本脚本目录起算的 URL（本脚本住 `docs/plugins/plugin-manager/`）。 */
const fileOf = (rel) => new URL('../../../' + rel, import.meta.url);
const TSC = ['node', 'node_modules/typescript/bin/tsc', '-b', 'packages/plugin-manager'];
const TSDOWN = ['pnpm', '--filter', 'dsh-life-pack', 'run', 'build:client'];
const TEST = ['node', '--test', 'packages/plugin-manager/test/health-706.test.mjs'];

const MUTATIONS = [
  {
    id: 'MUT-741-A',
    why: '把「一家落定就回调」改回「攒齐了一起给」（真机那条全量冒出来的写法）',
    file: 'packages/plugin-manager/src/health-fetch.ts',
    from: '    const row: HealthFetchRow = { id: tab.id, report: one.report, error: one.error };\n    // 回调里的异常不许把整批拖下水：这是画图的旁路，不是取数本身。\n    try {\n      onRow?.(row);\n    } catch {\n      /* 旁路失败不影响整批结果 */\n    }\n    return row;',
    to: '    const row: HealthFetchRow = { id: tab.id, report: one.report, error: one.error };\n    return row;',
    extra: 'needle',
    needleFrom: '  return { rows, error: null };\n}',
    needleTo: '  for (const row of rows) onRow?.(row);\n  return { rows, error: null };\n}',
  },
  {
    id: 'MUT-741-B',
    why: '让「画图旁路」的异常把整批取数拖下水（旁路不该是取数的一部分）',
    file: 'packages/plugin-manager/src/health-fetch.ts',
    from: '    try {\n      onRow?.(row);\n    } catch {\n      /* 旁路失败不影响整批结果 */\n    }',
    to: '    onRow?.(row);',
  },
  {
    id: 'MUT-741-C',
    why: '把**面板**改回「等整批落定才一次写」（真机那条「全量冒出来」的写法）',
    file: 'packages/plugin-manager/src/health-panel.ts',
    from: '      const loaded = await loadHealthReports(getCall(), targets, patch);',
    to: '      const loaded = await loadHealthReports(getCall(), targets);\n      for (const row of loaded.rows) patch(row);',
  },
];

const onlyAt = process.argv.indexOf('--only');
const only = onlyAt >= 0 ? String(process.argv[onlyAt + 1] ?? '').toUpperCase() : '';
const picked = only === '' ? MUTATIONS : MUTATIONS.filter((m) => m.id.endsWith('-' + only));
if (picked.length === 0) {
  console.log('RESULT: 0/0 没有匹配 --only ' + only);
  process.exit(2);
}

function run(args) {
  const r = spawnSync(args[0], args.slice(1), { cwd: REPO, encoding: 'utf8', shell: process.platform === 'win32' });
  return { code: r.status, out: String(r.stdout ?? '') + String(r.stderr ?? '') };
}

const before = new Map(MUTATIONS.map((m) => [m.file, readFileSync(fileOf(m.file), 'utf8')]));
let red = 0;
let restored = 0;

for (const m of picked) {
  const original = before.get(m.file);
  const fileUrl = fileOf(m.file);
  const hits = original.split(m.from).length - 1;
  if (hits !== 1) { console.log(m.id + ': GUARD-FAIL hits=' + hits); continue; }
  let mutated = original.replace(m.from, m.to);
  if (m.extra === 'needle') {
    const nh = mutated.split(m.needleFrom).length - 1;
    if (nh !== 1) { console.log(m.id + ': GUARD-FAIL needle hits=' + nh); continue; }
    mutated = mutated.replace(m.needleFrom, m.needleTo);
  }
  writeFileSync(fileUrl, mutated);
  const b1 = run(TSC);
  // 面板那半的判据读的是**产物** `dist/client.js`（G 组物化真产物），而它是 `build:client` 出的，
  // `tsc -b` 只管 dist/*.js 那几个模块 —— 少这一步，面板的变体会拿到**没带变异**的旧包，假绿。
  const c1 = run(TSDOWN);
  const t1 = run(TEST);
  writeFileSync(fileUrl, original);
  const b2 = run(TSC);
  const c2 = run(TSDOWN);
  const t2 = run(TEST);
  const same = readFileSync(fileUrl, 'utf8') === original;
  const ok = b1.code === 0 && c1.code === 0 && t1.code !== 0;
  if (ok) red += 1;
  if (b2.code === 0 && c2.code === 0 && t2.code === 0 && same) restored += 1;
  console.log(m.id + ' ' + m.why);
  console.log(m.id + ': MUTATED build=' + b1.code + ' client=' + c1.code + ' test=' + t1.code + ' => ' + (ok ? 'RED-OK' : 'NOT-RED'));
  console.log(m.id + ': RESTORED build=' + b2.code + ' client=' + c2.code + ' test=' + t2.code + ' => ' + (b2.code === 0 && c2.code === 0 && t2.code === 0 ? 'GREEN-OK' : 'NOT-GREEN'));
  console.log(m.id + ': SAME-BYTES=' + String(same));
}

// 产物按当刻源码复位（协议 §5：回滚必须连生成物一起）
const bf = run(TSC);
const cf = run(TSDOWN);
const allRestored = MUTATIONS.every((m) => readFileSync(fileOf(m.file), 'utf8') === before.get(m.file));
console.log('FINAL: host-build=' + bf.code + ' client-build=' + cf.code + ' all-restored=' + String(allRestored));
console.log('RESULT: ' + String(red) + '/' + String(picked.length) + ' RED-OK, ' + String(restored) + '/' + String(picked.length) + ' GREEN-OK+SAME-BYTES');
process.exit(red === picked.length && restored === picked.length && allRestored && bf.code === 0 && cf.code === 0 ? 0 : 1);
