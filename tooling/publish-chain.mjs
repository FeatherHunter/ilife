#!/usr/bin/env node
/** #48 发布链重建（publish-all 已删，此为替代流程；R2 A2）。
 *
 * 用法：
 *   node tooling/publish-chain.mjs --plan [--only a,b]   打印发布计划（默认，不写 registry）
 *   node tooling/publish-chain.mjs --live [--only a,b]   真发布（先过 G1，随后按序 npm publish）
 *
 * 顺序（依赖先行）：base-link-core → base-paint → base-combos/6 skill → dsh-life-pack → 6 单品。
 * 样板期 --only dsh-calorie,skill-calorie,dsh-life-pack,base-paint（仅 skill-calorie 与
 * dsh-calorie 需重发 0.1.1；dsh-life-pack/base-paint 仅复核在位）。全量复制后去掉 --only。
 * 发布后跑：node tooling/check-publish.mjs --post [--only ...]（registry 侧复核）。
 */
import { readFileSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const live = process.argv.includes('--live');
const onlyIdx = process.argv.indexOf('--only');
const SCOPE = onlyIdx >= 0 ? new Set(process.argv[onlyIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null;
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NPSH = process.platform === 'win32';
const DIRM = { 'dsh-calorie': 'plugin-calorie', 'dsh-chef': 'plugin-chef', 'dsh-bill-ilife': 'plugin-bill-ilife', 'dsh-home-ilife': 'plugin-home-ilife', 'dsh-memo-ilife': 'plugin-memo-ilife', 'dsh-schedule-ilife': 'plugin-schedule-ilife', 'dsh-life-pack': 'plugin-manager', 'skill-calorie': 'skill-calorie', 'skill-chef': 'skill-chef', 'skill-bill': 'skill-bill', 'skill-home': 'skill-home', 'skill-memo-ilife': 'skill-memo-ilife', 'skill-schedule': 'skill-schedule', 'base-combos': 'base-combos', 'base-link-core': 'base-link-core', 'base-paint': 'base-render' };
const ORDER = ['base-link-core', 'base-paint', 'base-combos', 'skill-calorie', 'skill-chef', 'skill-bill', 'skill-home', 'skill-memo-ilife', 'skill-schedule', 'dsh-life-pack', 'dsh-calorie', 'dsh-chef', 'dsh-bill-ilife', 'dsh-home-ilife', 'dsh-memo-ilife', 'dsh-schedule-ilife'];
const NEED_BUMP_48 = new Set(['skill-calorie', 'dsh-calorie']); // 样板线：仅此二包内容变更需 0.1.1（其余复制时按 changeset 定）
const pkgJson = (n) => JSON.parse(readFileSync(join(root, 'packages', DIRM[n], 'package.json'), 'utf8'));
const regVer = (n) => { try { return execFileSync(NPM, ['view', n, 'version'], { encoding: 'utf8', shell: NPSH }).trim().replace(/'/g, ''); } catch { return '(registry 未见)'; } };

const list = ORDER.filter((n) => !SCOPE || SCOPE.has(n));
console.log((live ? 'LIVE 发布' : 'PLAN 预演') + '：' + list.join(' → '));
let bad = 0;
for (const n of list) {
  const local = pkgJson(n);
  const rv = regVer(n);
  const action = NEED_BUMP_48.has(n) ? 'PUBLISH（#48 样板重发，changeset 定版后，本地现 ' + local.version + '）' : 'VERIFY 在位（registry ' + rv + '，本地 ' + local.version + '）';
  console.log(' - ' + n + ': ' + action);
  if (live && NEED_BUMP_48.has(n)) {
    const r = spawnSync(NPM, ['publish', '--access', 'public'], { cwd: join(root, 'packages', DIRM[n]), encoding: 'utf8', shell: NPSH });
    if (r.status !== 0) { console.error('FAIL: ' + n + ' publish 非 0：' + (r.stderr || '').slice(-400)); bad++; }
    else console.log('OK: ' + n + ' 已发布');
  }
}
if (!live) console.log('预演结束：未写 registry。真发布用 --live（先合入 master，changeset 定版后跑）。');
if (bad) { console.error('publish-chain：' + bad + ' 处红'); process.exit(1); }
console.log('publish-chain：PASS');