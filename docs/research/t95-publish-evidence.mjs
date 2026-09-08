#!/usr/bin/env node
/** #95 证据·打包与模板装载（可复跑，全部实测不推理）。
 *
 * 断言链：
 *   A files 口径   packages/skill-calorie/package.json 的 files 含 templates/*.html。
 *   B tarball 清单  npm pack 后逐件断言 templates/<6>.html ＋ dist/render/templates.js 在包内。
 *   C 安装态装载    把 tarball 解到 <tmp>/node_modules/skill-calorie（真实安装布局），
 *                  从 dist/render/templates.js 调 loadTemplate 逐件读 → 6 件皆非空且双标记各 1。
 *   D 变异自证      --mutate：把 files 里的 templates/*.html 摘掉重打 → B/C 必红（证明门有牙）。
 *
 * 用法：node docs/research/t95-publish-evidence.mjs [--mutate]
 *   --mutate  期望 B/C 双红；「变异被抓住」= exit 0，没抓住 = exit 1。
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const pkgSrc = join(root, 'packages', 'skill-calorie');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const SHELL = process.platform === 'win32';
const MUTATE = process.argv.includes('--mutate');
const EXPECT = ['diet', 'exercise', 'goal', 'help', 'home', 'photo-gallery'];
// 临时根：优先**仓外** os.tmpdir()；但 Windows 自带 bsdtar 实测打不开非 ASCII 路径下的 tgz
// （`tar.exe: Error opening archive`，同包复制到 ASCII 路径即可开），故非 ASCII 时退回仓库内 ASCII 的
// .scratch/t95/。两种情形**都只跑 npm pack**（不跑 npm install、不触碰 node_modules，协议 §2.1②不适用），
// 且所有 rmSync 经 guardEv 守卫（§2.1③）＋ 用完即清（§2.1④）。
const ASCII_PATH = /^[\x20-\x7e]+$/;
const EV_ROOT = ASCII_PATH.test(tmpdir())
  ? mkdtempSync(join(tmpdir(), 'ilife-t95-ev-'))
  : mkdtempSync(join(root, '.scratch', 't95', 'ev-'));
const mkEv = (prefix) => mkdtempSync(join(EV_ROOT, prefix));
// 清理守卫（协议 §2.1③）：目标必须在自己的独占临时根下，且不在 node_modules／packages／docs／test／tooling／.git 之下；守卫失败即抛。
const REPO_SENSITIVE = ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git'].map((d) => join(root, d));
function guardEv(p) {
  const abs = resolve(p), ev = resolve(EV_ROOT);
  if (!(abs === ev || abs.startsWith(ev + sep))) throw new Error('清理守卫拒绝：' + abs + ' 不在独占临时根 ' + ev + ' 下');
  for (const s of REPO_SENSITIVE) if (abs === s || abs.startsWith(s + sep)) throw new Error('清理守卫拒绝（仓库敏感路径）：' + abs);
  return abs;
}
const cleanup = [];
function cleanupAll() {
  for (const d of cleanup) rmSync(guardEv(d), { recursive: true, force: true });
  rmSync(guardEv(EV_ROOT), { recursive: true, force: true });
}
function bail(msg) {
  console.error(msg);
  try { cleanupAll(); } catch (e) { console.error('清理失败（守卫抛出）：' + e.message); process.exit(2); }
  process.exit(1);
}
process.on('uncaughtException', (e) => bail('未捕获异常：' + e.message));

// F2 自证：守卫必须有牙——仓库敏感路径／独占临时根之外的目标必须抛错，独占临时根内必须放行。
// 变异自证：把 guardEv 改成 `return resolve(p)`（去守卫）→ 本段必红。
if (process.argv.includes('--guard-selftest')) {
  const cases = [
    [join(root, 'node_modules', 'x'), false],
    [join(root, 'packages', 'skill-calorie'), false],
    [join(root, 'docs', 'x'), false],
    [join(root, 'test', 'x'), false],
    [join(root, 'tooling', 'x'), false],
    [join(root, '.git', 'x'), false],
    [root, false],
    [join(tmpdir(), 'ilife-t95-elsewhere-' + Date.now()), false],
    [join(EV_ROOT, 'child-ok'), true],
    [EV_ROOT, true],
  ];
  let gbad = 0;
  for (const [p, shouldPass] of cases) {
    let threw = false;
    try { guardEv(p); } catch { threw = true; }
    if (threw === shouldPass) { console.error('FAIL(guard): ' + p + ' 期望' + (shouldPass ? '放行' : '抛错') + '，实际' + (threw ? '抛错' : '放行')); gbad++; }
    else console.log('OK(guard): ' + (shouldPass ? '放行 ' : '拦住 ') + p);
  }
  cleanupAll();
  if (gbad) { console.error('t95 清理守卫自证：' + gbad + ' 处红'); process.exit(1); }
  console.log('t95 清理守卫自证：PASS');
  process.exit(0);
}

let aBad = 0, bBad = 0, cBad = 0;
const ok = (m) => console.log('OK: ' + m);
const failA = (m) => { console.error('FAIL(A): ' + m); aBad++; };
const failB = (m) => { console.error('FAIL(B): ' + m); bBad++; };
const failC = (m) => { console.error('FAIL(C): ' + m); cBad++; };

// ── A：files 口径 ─────────────────────────────────────────────────────────────
const files = JSON.parse(readFileSync(join(pkgSrc, 'package.json'), 'utf8')).files || [];
if (files.includes('templates/*.html')) ok('A files 含 templates/*.html（' + JSON.stringify(files) + '）');
else failA('files 缺 templates/*.html（' + JSON.stringify(files) + '）');

// ── 造包：变异态把 templates/*.html 从 files 里摘掉 ────────────────────────────
const stage = mkEv('src-');
cleanup.push(stage);
cpSync(join(pkgSrc, 'package.json'), join(stage, 'package.json'));
cpSync(join(pkgSrc, 'SKILL.md'), join(stage, 'SKILL.md'));
cpSync(join(pkgSrc, 'dist'), join(stage, 'dist'), { recursive: true });
cpSync(join(pkgSrc, 'templates'), join(stage, 'templates'), { recursive: true });
if (MUTATE) {
  const j = JSON.parse(readFileSync(join(stage, 'package.json'), 'utf8'));
  j.files = j.files.filter((f) => f !== 'templates/*.html');
  writeFileSync(join(stage, 'package.json'), JSON.stringify(j, null, 2) + '\n', 'utf8');
  ok('变异态：staged files 摘掉 templates/*.html → ' + JSON.stringify(j.files));
}

const packDir = mkEv('pack-');
cleanup.push(packDir);
const r = spawnSync(NPM, ['pack', '--pack-destination', packDir], { cwd: stage, encoding: 'utf8', shell: SHELL });
const tgzName = (r.stdout || '').trim().split('\n').pop();
if (r.status !== 0 || !tgzName) bail('npm pack 失败：' + (r.stderr || '').slice(-500));
const tgz = join(packDir, tgzName);
ok('造包 ' + tgzName);

// ── B：tarball 清单逐件 ───────────────────────────────────────────────────────
const tf = spawnSync('tar', ['-tf', tgz], { encoding: 'utf8' });
if (tf.status !== 0) bail('tar -tf 失败：' + (tf.stderr || '').slice(-300));
const entries = tf.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
const wantTpl = EXPECT.map((n) => 'package/templates/' + n + '.html');
const missTpl = wantTpl.filter((p) => !entries.includes(p));
if (!missTpl.length) ok('B tarball 含全部 ' + wantTpl.length + ' 件模板');
else failB('tarball 缺模板：' + missTpl.join(', '));
if (entries.includes('package/dist/render/templates.js')) ok('B tarball 含 dist/render/templates.js');
else failB('tarball 缺 dist/render/templates.js');
ok('B tarball templates/ 条目 ' + entries.filter((e) => e.startsWith('package/templates/')).length + ' 个，全包条目 ' + entries.length + ' 个');

// ── C：真实安装布局下的装载器 ─────────────────────────────────────────────────
const inst = mkEv('inst-');
cleanup.push(inst);
mkdirSync(join(inst, 'node_modules'), { recursive: true });
const xf = spawnSync('tar', ['-xzf', tgz, '-C', inst], { encoding: 'utf8' });
if (xf.status !== 0) bail('tar -xzf 失败：' + (xf.stderr || '').slice(-300));
const installed = join(inst, 'node_modules', 'skill-calorie');
renameSync(join(inst, 'package'), installed);
let mod = null;
try { mod = await import(pathToFileURL(join(installed, 'dist', 'render', 'templates.js')).href); }
catch (e) { failC('安装布局导入 dist/render/templates.js 失败：' + e.message); }

if (mod) {
  let onDisk = null;
  try { onDisk = readdirSync(join(installed, 'templates')).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\.html$/, '')).sort(); }
  catch (e) { failC('安装布局无 templates/ 目录（files 未随包发）：' + e.code); }
  if (onDisk) {
    if (JSON.stringify(onDisk) === JSON.stringify([...EXPECT].sort())) ok('C 安装布局 templates/ = ' + onDisk.join(','));
    else failC('安装布局 templates/ 异常：' + JSON.stringify(onDisk));
  }
  for (const n of EXPECT) {
    let html;
    try { html = mod.loadTemplate(n); }
    catch (e) { failC('loadTemplate(' + n + ') 抛：' + e.code + ' ' + e.message); continue; }
    const css = html.split('<!--SHARED-CSS-->').length - 1;
    const hlp = html.split('<!--SHARED-HELPERS-->').length - 1;
    if (html.length > 500 && css === 1 && hlp === 1) ok('C loadTemplate(' + n + ') → ' + html.length + ' 字节，双标记各 1');
    else failC('loadTemplate(' + n + ') 内容异常 len=' + html.length + ' css=' + css + ' helpers=' + hlp);
  }
} else {
  failC('装载器未能从安装布局导入（模板不可达）');
}

cleanupAll();
console.log('临时根已清（守卫 ' + EV_ROOT + '）：' + (existsSync(EV_ROOT) ? '仍存在（异常）' : '无残留'));

// ── D：变异态必须被抓 ─────────────────────────────────────────────────────────
if (MUTATE) {
  if (bBad > 0 && cBad > 0) { console.log('t95 打包实证：变异被抓住（B红 ' + bBad + ' 处、C红 ' + cBad + ' 处）→ PASS'); process.exit(0); }
  console.error('FAIL(D): 变异未被抓住（B红 ' + bBad + ' 处、C红 ' + cBad + ' 处）——门无牙');
  process.exit(1);
}
const total = aBad + bBad + cBad;
if (total) { console.error('t95 打包实证：' + total + ' 处红'); process.exit(1); }
console.log('t95 打包实证：PASS');
