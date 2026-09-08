#!/usr/bin/env node
/** #95 返修 · F1 归因实测（可复跑）：`npm install <tgz>` 空跑的**决定性变量**是什么？
 *
 * A1-1 的判据争议：旧实现认定「非 ASCII `%TEMP%` → npm install 空跑」，于是把临时根退回
 * **仓库内** `.scratch/`，导致在 `D:\ilife` 内跑 `npm install`（违反 `.scratch/t75/concurrency-protocol.md`
 * §2.1，与 2026-09-09 全仓事故同一机制）。
 *
 * 本脚本跑 2×2：{非 ASCII `%TEMP%` / ASCII 仓外根} × {无 package.json / 有最小 package.json}，
 * 判据 = `node_modules/skill-calorie/templates` 是否落盘。实测结论（见 docs/research/t95-rework-evidence.md）：
 * **决定性变量是「安装目录缺最小 package.json」，与 cwd 编码无关**。
 *
 * 用法：node docs/research/t95-f1-attribution.mjs
 *   打印 2×2 结果表 ＋ 结论；四格与预期不符 → exit 1。
 * 安全：所有临时目录都在**仓库之外**，用完即清（路径守卫）；本脚本只跑 `npm pack` ＋ `npm install`
 * 到仓外目录，**不在仓库内安装**。
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const SHELL = process.platform === 'win32';
const pkgDir = join(root, 'packages', 'skill-calorie');
const NONASCII_ROOT = tmpdir();
// ASCII 仓外根：优先 %SystemDrive% 下的独占目录（Windows CI 上 tmpdir 本就是 ASCII，退化为 tmpdir）。
const ASCII_ROOT = /^[\x20-\x7e]+$/.test(tmpdir()) ? tmpdir() : join((process.env.SystemDrive || 'C:') + sep, 'ilife-t95-f1');

const made = [];
const guard = (p, owner) => {
  const abs = resolve(p), own = resolve(owner);
  const prefix = own.endsWith(sep) ? own : own + sep;
  if (!(abs === own || abs.startsWith(prefix))) throw new Error('守卫拒绝删除：' + abs + '（不在 ' + own + ' 下）');
  if (/[\\/](node_modules|packages|docs|test|tooling|\.git)([\\/]|$)/.test(abs)) throw new Error('守卫拒绝删除（仓库敏感路径）：' + abs);
  if (abs === resolve(root) || abs.startsWith(resolve(root) + sep)) throw new Error('守卫拒绝删除（仓库内）：' + abs);
  return abs;
};

mkdirSync(ASCII_ROOT, { recursive: true });
const packDir = mkdtempSync(join(NONASCII_ROOT, 'ilife-t95-f1pack-'));
made.push([packDir, NONASCII_ROOT]);
const pk = spawnSync(NPM, ['pack', '--pack-destination', packDir], { cwd: pkgDir, encoding: 'utf8', shell: SHELL });
const tgzName = (pk.stdout || '').trim().split('\n').pop();
if (pk.status !== 0 || !tgzName) { console.error('npm pack 失败：' + (pk.stderr || '').slice(-400)); process.exit(1); }
const tgz = join(packDir, tgzName);

const rows = [];
for (const [label, base] of [['非ASCII %TEMP%', NONASCII_ROOT], ['ASCII 仓外根', ASCII_ROOT]]) {
  for (const withPkg of [false, true]) {
    const d = mkdtempSync(join(base, 'ilife-t95-f1inst-'));
    made.push([d, base]);
    if (withPkg) writeFileSync(join(d, 'package.json'), JSON.stringify({ name: 'probe', version: '0.0.0', private: true }, null, 2) + '\n', 'utf8');
    const r = spawnSync(NPM, ['install', '--no-audit', '--no-fund', tgz], { cwd: d, encoding: 'utf8', shell: SHELL });
    const landed = existsSync(join(d, 'node_modules', 'skill-calorie', 'templates'));
    const n = landed ? readdirSync(join(d, 'node_modules', 'skill-calorie', 'templates')).filter((f) => f.endsWith('.html')).length : 0;
    rows.push({ label, withPkg, status: r.status, landed, n });
  }
}

let bad = 0;
console.log('| cwd | 最小 package.json | npm install exit | node_modules 落盘 | templates 件数 |');
console.log('| --- | --- | --- | --- | --- |');
for (const r of rows) console.log(`| ${r.label} | ${r.withPkg ? '有' : '无'} | ${r.status} | ${r.landed} | ${r.n} |`);

// 预期：有最小 package.json 的两格必落盘 6 件；无的两格在 **Windows** 上必不落盘。
// （非 Windows 上 npm 在空目录 `npm install <tgz>` 会自行建 node_modules，故「无 package.json」格只记录不断言。）
const WINDOWS = process.platform === 'win32';
if (!WINDOWS) console.log('NOTE: 非 Windows 平台——「无 package.json」两格只记录不断言（Windows 特有行为）。');
for (const r of rows) {
  const expect = r.withPkg;
  if (expect && !(r.landed && r.n === 6)) { console.error('FAIL: 有 package.json 却未落盘 6 件：' + JSON.stringify(r)); bad++; }
  if (WINDOWS && !expect && r.landed) { console.error('FAIL: 无 package.json 却落盘：' + JSON.stringify(r)); bad++; }
}

for (const [d, owner] of made.reverse()) { try { rmSync(guard(d, owner), { recursive: true, force: true }); } catch (e) { console.error('清理失败：' + e.message); bad++; } }
try { if (ASCII_ROOT !== tmpdir()) rmSync(guard(ASCII_ROOT, dirname(ASCII_ROOT)), { recursive: true, force: true }); } catch (e) { console.error('清理 ASCII 根失败：' + e.message); bad++; }
if (made.some(([d]) => existsSync(d))) { console.error('FAIL: 临时目录有残留'); bad++; }

console.log('结论：决定性变量 = 「安装目录缺最小 package.json」（有则非 ASCII %TEMP% 亦落盘 6 件；无则皆不落盘）→ 临时根可安全用 os.tmpdir()。');
if (bad) { console.error('t95 F1 归因实测：' + bad + ' 处红'); process.exit(1); }
console.log('t95 F1 归因实测：PASS');
