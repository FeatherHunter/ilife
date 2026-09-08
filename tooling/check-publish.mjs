#!/usr/bin/env node
/** #48 发布门禁（R2 对抗 A+B 最严执行）。
 *
 * 三门（B③），全部只读校验、不写源码：
 *   --pre       G1：全仓各包 package.json 整文件零 'workspace:' 命中。
 *   --tarball   G2：npm pack --dry-run 清单断言——6 skill 必含 dist/cli/cmd_read.js；
 *               有运行时模板加载器的必含 templates/（#95：并逐件点名）；6 单品必含 dist/index.js + cordis.patch.yml。
 *   --fresh-tmp G3：打 13 实包 tarball → fresh tmp 目录 npm install（模拟用户安装态）→
 *               node 断言 6 单品 cliPath 落在 node_modules 下对应 skill 包内 + 契约键打通；
 *               #95 追加：模板包在安装态逐件 loadTemplate 真读（tsc 不复制资源，只靠 files 随包发）。
 *   --post      发布后复核：npm view 本地版本 dependencies，workspace: 零容忍（带重试）。
 *
 * 版本范围策略（B②）：同版本 ^ + 烟囱契约测试 + changeset 全链联动，不用 exact（见 docs/skill-landing-r2.md）。
 */
import { mkdirSync, readFileSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] || '--pre';
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const NPSH = process.platform === 'win32'; // .cmd 须经 shell 起（Node 直 spawn 不认 .cmd）
// 样板作用域（#48 收敛：先卡路里线）。例：--only dsh-calorie,skill-calorie,dsh-life-pack,base-paint。
// 省略则全量 13 包（复制到其余 5 对后用全量）。
const onlyIdx = process.argv.indexOf('--only');
const SCOPE = onlyIdx >= 0 ? new Set(process.argv[onlyIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)) : null;
const inScope = (n) => !SCOPE || SCOPE.has(n);

// #95 实测：Windows 中文用户目录（%TEMP% 含非 ASCII）下 `npm install <tgz>` 会空跑——
// 退出码 0 却不落 node_modules（ASCII 路径同命令必落）。故临时根优先 ASCII，非 ASCII 时退回
// 仓库内 .scratch/（已 gitignore）；并给安装目录补最小 package.json，否则 npm 会向上找到
// monorepo 根 package.json 而报 edgesOut（实测 c1 红 / c2 绿）。
const TMP_ASCII = /^[\x20-\x7e]+$/;
const TMP_ROOT = TMP_ASCII.test(tmpdir()) ? tmpdir() : join(root, '.scratch');
const mkTmp = (prefix) => { mkdirSync(TMP_ROOT, { recursive: true }); return mkdtempSync(join(TMP_ROOT, prefix)); };

const SKILLS = ['skill-calorie', 'skill-chef', 'skill-bill', 'skill-home', 'skill-memo-ilife', 'skill-schedule'];
const PLUGINS = ['dsh-calorie', 'dsh-chef', 'dsh-bill-ilife', 'dsh-home-ilife', 'dsh-memo-ilife', 'dsh-schedule-ilife'];
const COMBOS = ['base-combos'];
const PINNED = ['dsh-life-pack', 'base-link-core', 'base-paint', 'ilife-skills'];
const ALL13 = [...COMBOS, ...SKILLS, ...PLUGINS];
const WITH_TEMPLATES = ['skill-calorie', 'skill-chef', 'skill-bill', 'skill-home', 'skill-memo-ilife', 'skill-schedule'];
// #95：有模板装载器的包，其 templates/ 逐件点名（G2 只断言目录存在会漏「少发几件」）。
const TEMPLATE_NAMES = {
  'skill-calorie': ['diet', 'exercise', 'goal', 'help', 'home', 'photo-gallery'],
};
const CONTRACT_KEY = { 'dsh-calorie': 'calorie.help.center', 'dsh-chef': 'chef.help.lookup', 'dsh-bill-ilife': 'bill.help.lookup', 'dsh-home-ilife': 'home.help.lookup', 'dsh-memo-ilife': 'memo.stats', 'dsh-schedule-ilife': 'schedule.help.lookup' };
const PLUGIN_OF = { 'dsh-calorie': 'skill-calorie', 'dsh-chef': 'skill-chef', 'dsh-bill-ilife': 'skill-bill', 'dsh-home-ilife': 'skill-home', 'dsh-memo-ilife': 'skill-memo-ilife', 'dsh-schedule-ilife': 'skill-schedule' };
const DIRM = { 'dsh-calorie': 'plugin-calorie', 'dsh-chef': 'plugin-chef', 'dsh-bill-ilife': 'plugin-bill-ilife', 'dsh-home-ilife': 'plugin-home-ilife', 'dsh-memo-ilife': 'plugin-memo-ilife', 'dsh-schedule-ilife': 'plugin-schedule-ilife', 'dsh-life-pack': 'plugin-manager', 'skill-calorie': 'skill-calorie', 'skill-chef': 'skill-chef', 'skill-bill': 'skill-bill', 'skill-home': 'skill-home', 'skill-memo-ilife': 'skill-memo-ilife', 'skill-schedule': 'skill-schedule', 'base-combos': 'base-combos', 'base-link-core': 'base-link-core', 'base-paint': 'base-render', 'ilife-skills': 'ilife-skills' };
const pkgDir = (name) => join(root, 'packages', DIRM[name]);
const pkgJson = (name) => JSON.parse(readFileSync(join(pkgDir(name), 'package.json'), 'utf8'));

let bad = 0;
const ok = (m) => console.log('OK: ' + m);
const fail = (m) => { console.error('FAIL: ' + m); bad++; };

function gatePre() {
  const names = SCOPE ? [...SCOPE] : readdirSync(join(root, 'packages'), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => JSON.parse(readFileSync(join(root, 'packages', d, 'package.json'), 'utf8'))).filter((j) => j && j.name && !j.private).map((j) => j.name);
  for (const n of names) {
    if (!DIRM[n]) { fail('作用域含未知包：' + n); continue; }
    const text = readFileSync(join(pkgDir(n), 'package.json'), 'utf8');
    if (text.includes('workspace:')) fail(n + ' package.json 含 workspace: 外泄');
    else ok(n + ' 无 workspace: 外泄');
  }
  for (const plug of PLUGINS.filter(inScope)) {
    const dep = pkgJson(plug).dependencies || {};
    const skill = PLUGIN_OF[plug];
    if (!/^\^0\.1\./.test(dep['dsh-life-pack'] || '')) fail(plug + ' 未声明 dsh-life-pack ^0.1.x');
    else ok(plug + ' 声明 dsh-life-pack ' + dep['dsh-life-pack']);
    if (!/^\^0\.1\./.test(dep[skill] || '')) fail(plug + ' 未声明 ' + skill + ' ^0.1.x');
    else ok(plug + ' 声明 ' + skill + ' ' + dep[skill]);
  }
}

function packDryRun(name) {
  const r = spawnSync(NPM, ['pack', '--dry-run'], { cwd: pkgDir(name), encoding: 'utf8', shell: NPSH });
  const out = (r.stdout || '') + '\n' + (r.stderr || '');
  if (r.status !== 0) { fail(name + ' npm pack --dry-run 非 0'); return ''; }
  return out;
}

function gateTarball() {
  for (const s of SKILLS.filter(inScope)) {
    const out = packDryRun(s);
    if (!out) continue;
    if (!out.includes('dist/cli/cmd_read.js')) fail(s + ' tarball 缺 dist/cli/cmd_read.js');
    else ok(s + ' tarball 含 dist/cli/cmd_read.js');
    if (WITH_TEMPLATES.includes(s)) {
      if (!out.includes('templates/')) fail(s + ' tarball 缺 templates/（运行时模板加载器要读）');
      else ok(s + ' tarball 含 templates/');
      // #95：点名逐件（templates/ 目录在但少发文件 → 安装态 loadTemplate 必抛）
      const names = TEMPLATE_NAMES[s];
      if (names) {
        const miss = names.filter((n) => !out.includes('templates/' + n + '.html'));
        if (miss.length) fail(s + ' tarball 缺模板：' + miss.join(', '));
        else ok(s + ' tarball 含全部 ' + names.length + ' 件模板');
      }
    }
  }
  for (const p of PLUGINS.filter(inScope)) {
    const out = packDryRun(p);
    if (!out) continue;
    if (!out.includes('dist/index.js')) fail(p + ' tarball 缺 dist/index.js');
    else ok(p + ' tarball 含 dist/index.js');
    if (!out.includes('cordis.patch.yml')) fail(p + ' tarball 缺 cordis.patch.yml');
    else ok(p + ' tarball 含 cordis.patch.yml');
  }
}

function gateFreshTmp() {
  const packDir = mkTmp('ilife-pack-');
  const tgzs = [];
  for (const name of ALL13.filter(inScope)) {
    const r = spawnSync(NPM, ['pack', '--pack-destination', packDir], { cwd: pkgDir(name), encoding: 'utf8', shell: NPSH });
    const file = (r.stdout || '').trim().split('\n').pop();
    if (r.status !== 0 || !file) { fail(name + ' npm pack 失败'); return; }
    tgzs.push(join(packDir, file));
    ok(name + ' 打包 ' + file);
  }
  const inst = mkTmp('ilife-fresh-');
  console.log('STEP: fresh-tmp 安装目录 ' + inst);
  // #95：模拟用户工程（缺此文件 npm 会向上吃 monorepo 根 package.json，Windows 实测报 edgesOut）
  writeFileSync(join(inst, 'package.json'), JSON.stringify({ name: 'ilife-fresh-install', version: '0.0.0', private: true }, null, 2) + '\n', 'utf8');
  const ins = spawnSync(NPM, ['install', '--no-audit', '--no-fund', ...tgzs], { cwd: inst, encoding: 'utf8', shell: NPSH });
  if (ins.status !== 0) { fail('fresh-tmp npm install 非 0：' + (ins.stderr || '').slice(-800)); return; }
  ok('fresh-tmp npm install ' + tgzs.length + ' 实包成功');
  const scopedPlugs = PLUGINS.filter(inScope);
  const AL = [
    "import { mkdtempSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';",
    "import { tmpdir } from 'node:os';",
    "import { join, basename, dirname } from 'node:path';",
    "import { pathToFileURL } from 'node:url';",
    "import { spawnSync } from 'node:child_process';",
    "const CONTRACT = " + JSON.stringify(Object.fromEntries(Object.entries(CONTRACT_KEY).filter(([k]) => scopedPlugs.includes(k)))) + ";",
    "const PLUGIN_OF = " + JSON.stringify(Object.fromEntries(Object.entries(PLUGIN_OF).filter(([k]) => scopedPlugs.includes(k)))) + ";",
    'let bad = 0;',
    'for (const [plug, key] of Object.entries(CONTRACT)) {',
    '  const skill = PLUGIN_OF[plug];',
    '  const mod = await import(plug);',
    '  const p = mod.cliPath();',
    "  const segs = p.split(/[\/\\\\]/);",
    "  const nm = segs.lastIndexOf('node_modules');",
    "  if (nm < 0 || segs[nm + 1] !== skill) { console.error('FAIL: ' + plug + ' cliPath 不在安装态 skill 包内：' + p); bad++; continue; }",
    "  if (basename(dirname(p)) !== 'cli' || !p.endsWith('cmd_read.js')) { console.error('FAIL: ' + plug + ' cliPath 尾段异常：' + p); bad++; continue; }",
    "  try { mod.assertCliPresent(); } catch (e) { console.error('FAIL: ' + plug + ' assertCliPresent 抛：' + e.message); bad++; continue; }",
    "  const db = mkdtempSync(join(tmpdir(), 'ilife-g3-'));",
    "  // #50 memo 对 harness 侧 arranging（非产品语义变更）：memo 全键先 openMemoDb（缺目录 exit 4 系设计态阻断，不碰），",
    "  // 其余五对契约键皆静态 help 键不碰 DB；仅 memo 分支预建 memo/ 空目录（对标 skill-memo-ilife 单测同款前置）。",
    "  if (skill === 'skill-memo-ilife') mkdirSync(join(db, 'memo'), { recursive: true });",
    "  const r = spawnSync(process.execPath, [p, key, '--params', '{}'], { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: db } });",
    "  if (r.status !== 0) { console.error('FAIL: ' + plug + ' 契约键 ' + key + ' exit' + r.status); bad++; continue; }",
    '  let env;',
    "  try { env = JSON.parse(String(r.stdout)); } catch { console.error('FAIL: ' + plug + ' 契约回执非 JSON'); bad++; continue; }",
    "  if (env.key !== key || env.data === null || env.data === undefined || typeof env.shape !== 'string') { console.error('FAIL: ' + plug + ' envelope 契约破'); bad++; continue; }",
    "  console.log('OK: ' + plug + ' SKILL直执行 契约键 ' + key + ' shape=' + env.shape);",
    "  process.env.SKILLS_DB_PATH = db;",
    "  let data;",
    "  try { data = mod.readViaCli(key, {}); } catch (e) { console.error('FAIL: ' + plug + ' 面板路 readViaCli 抛：' + e.message); bad++; continue; }",
    "  if (data === null || data === undefined) { console.error('FAIL: ' + plug + ' 面板路返空'); bad++; continue; }",
    "  console.log('OK: ' + plug + ' 面板路 readViaCli 打通');",
    '}',
    "// #95：模板资产安装态实证——安装产物内逐件 loadTemplate 真读（不是看清单，是真读文件）。",
    'const TPL_SKILLS = ' + JSON.stringify(WITH_TEMPLATES.filter(inScope)) + ';',
    'for (const s of TPL_SKILLS) {',
    '  let files;',
    "  try { files = readdirSync(join(process.cwd(), 'node_modules', s, 'templates')).filter((f) => f.endsWith('.html')).sort(); }",
    "  catch (e) { console.error('FAIL: ' + s + ' 安装态无 templates/ 目录（files 未随包发）：' + e.message); bad++; continue; }",
    "  if (!files.length) { console.error('FAIL: ' + s + ' 安装态 templates/ 为空'); bad++; continue; }",
    '  let rmod;',
    "  // 走安装态 dist/render/templates.js（与 exports['./render'] 同目录、只依赖 node 内置 ＋ errors.js）。",
    "  // 不经 s + '/render'：那会连带加载 base-paint，而 registry 上的 base-paint 可能落后工作区（实测缺",
    "  // ACTION_ID_ATTR）——那是版本偏斜，与本票「模板是否随包且可读」无关，不把 G3 绑在它上面。",
    "  const pj = JSON.parse(readFileSync(join(process.cwd(), 'node_modules', s, 'package.json'), 'utf8'));",
    "  const rel = (pj.exports && pj.exports['./render']) || './dist/render/index.js';",
    "  const loaderAbs = join(process.cwd(), 'node_modules', s, String(rel).replace(/[^/]+$/, 'templates.js'));",
    "  try { rmod = await import(pathToFileURL(loaderAbs).href); }",
    "  catch (e) { console.error('FAIL: ' + s + ' 安装态装载器导入失败（' + loaderAbs + '）：' + e.message); bad++; continue; }",
    "  if (typeof rmod.loadTemplate !== 'function') { console.error('FAIL: ' + s + ' 安装态装载器未导出 loadTemplate'); bad++; continue; }",
    '  let tbad = 0;',
    '  for (const f of files) {',
    "    const nm = f.replace(/\\.html$/, '');",
    '    let html;',
    "    try { html = rmod.loadTemplate(nm); } catch (e) { console.error('FAIL: ' + s + ' loadTemplate(' + nm + ') 抛：' + e.message); tbad++; continue; }",
    "    if (typeof html !== 'string' || html.length < 100) { console.error('FAIL: ' + s + ' 模板 ' + nm + ' 装载内容异常 len=' + (typeof html === 'string' ? html.length : 'n/a')); tbad++; }",
    '  }',
    '  if (tbad) { bad += tbad; continue; }',
    "  console.log('OK: ' + s + ' 安装态 templates/ ' + files.length + ' 件经 loadTemplate 全部装载成功');",
    '}',
    'if (bad) process.exit(1);',
    "console.log('G3 安装态断言全绿');",
  ];
  const assertFile = join(inst, 'assert-g3.mjs');
  writeFileSync(assertFile, AL.join('\n'), 'utf8');
  const a = spawnSync(process.execPath, [assertFile], { cwd: inst, encoding: 'utf8' });
  console.log(a.stdout || '');
  if (a.status !== 0) { console.error(a.stderr || ''); fail('G3 安装态断言红'); return; }
  ok('G3 安装态 cliPath 解析 + 契约键打通');
}

function gatePost() {
  for (const name of [...ALL13, ...PINNED].filter(inScope)) {
    const local = pkgJson(name);
    let shown = null;
    for (let i = 0; i < 3; i++) {
      try {
        const out = execFileSync(NPM, ['view', name + '@' + local.version, 'dependencies', '--json'], { encoding: 'utf8', shell: NPSH });
        shown = out.trim() ? JSON.parse(out) : {};
        break;
      } catch (e) { if (i === 2) fail(name + '@' + local.version + ' npm view 失败（未发布或复制延迟）'); }
    }
    if (!shown) continue;
    if (JSON.stringify(shown).includes('workspace:')) fail(name + '@' + local.version + ' registry 仍含 workspace:');
    else ok(name + '@' + local.version + ' registry 无 workspace:');
  }
}

if (mode === '--pre') gatePre();
else if (mode === '--tarball') gateTarball();
else if (mode === '--fresh-tmp') gateFreshTmp();
else if (mode === '--post') gatePost();
else { console.error('用法：check-publish.mjs [--pre|--tarball|--fresh-tmp|--post]'); process.exit(2); }
if (bad) { console.error('check-publish ' + mode + '：' + bad + ' 处红'); process.exit(1); }
console.log('check-publish ' + mode + '：PASS');