#!/usr/bin/env node
/** #272 复核席 · worktree 依赖链接补齐（环境准备缺口，只在 wf155-c 内建链）。
 *
 * 事实：本 worktree 的 `node_modules` 是指向 `D:\ilife\node_modules` 的目录联接（只给第三方件），
 * 但 pnpm 隔离布局还需要**每个包自己的 `node_modules/<本地包名>` 链接**（26 条），工作区准备时没建
 * ⇒ `tsc` 解析不到 `base-paint`／`base-link-core` 等，`pnpm build` 起不来。
 *
 * 本脚本只做一件事：按各包 `package.json` 里**声明过的本地依赖**建目录链接，
 * 目标一律指向**本 worktree 的 `packages/<目录>`**（绝不指向 `D:\ilife`），语义与 pnpm 会建的链接一致。
 * 不装任何包、不删任何东西（§2.1：装包禁用；本脚本不是安装命令）。
 *
 * 跑法（在本检出根目录）：`node docs/skills/skill-calorie/t272-收口复核-环境补齐.mjs`
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PKGS = path.join(ROOT, 'packages');

if (path.basename(ROOT) !== 'wf155-c') {
  throw new Error('路径守卫：只允许在 wf155-c 这个隔离检出里建链，当前 ' + ROOT);
}

const dirs = fs.readdirSync(PKGS).filter((d) => fs.existsSync(path.join(PKGS, d, 'package.json')));
const byName = new Map();
for (const d of dirs) {
  const j = JSON.parse(fs.readFileSync(path.join(PKGS, d, 'package.json'), 'utf8'));
  byName.set(j.name, d);
}

let made = 0;
const skipped = [];
for (const d of dirs) {
  const j = JSON.parse(fs.readFileSync(path.join(PKGS, d, 'package.json'), 'utf8'));
  const need = new Set();
  for (const sec of ['dependencies', 'devDependencies', 'peerDependencies']) {
    for (const k of Object.keys(j[sec] ?? {})) if (byName.has(k)) need.add(k);
  }
  if (need.size === 0) continue;
  const nm = path.join(PKGS, d, 'node_modules');
  fs.mkdirSync(nm, { recursive: true });
  for (const dep of need) {
    const target = path.join(PKGS, byName.get(dep));
    const link = path.join(nm, dep);
    if (fs.existsSync(link)) { skipped.push(d + '/' + dep); continue; }
    if (!fs.existsSync(target)) throw new Error('目标不在：' + target);
    fs.symlinkSync(target, link, 'junction');
    made += 1;
  }
}

console.log('RESULT: made=' + made + ' skipped=' + skipped.length);
console.log('SKIPPED: ' + (skipped.join(',') || 'none'));
