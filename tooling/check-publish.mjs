#!/usr/bin/env node
/** #48 发布门禁（R2 对抗 A+B 最严执行）。
 *
 * 三门（B③），全部只读校验、不写源码：
 *   --pre       G1：全仓各包 package.json 整文件零 'workspace:' 命中。
 *   --tarball   G2：npm pack --dry-run 清单断言——6 skill 必含 dist/cli/cmd_read.js；
 *               有运行时模板加载器的必含 templates/（#95：并逐件点名）；6 单品必含 dist/index.js + cordis.patch.yml。
 *   --fresh-tmp G3：打 13 实包 tarball → **仓外** fresh tmp 目录 npm install（模拟用户安装态）→
 *               node 断言 6 单品 cliPath 落在 node_modules 下对应 skill 包内 + 契约键打通；
 *               #95 追加：模板包在安装态**按应发清单逐件** loadTemplate 真读（tsc 不复制资源，只靠 files 随包发）。
 *               结论按 scope 分支：没跑的断言显式打印「未跑」，不冒充全绿（#95 F4）。
 *   --tmp-hygiene #95 F1/F9 回归守卫：临时根须在仓库外，且仓内无 ilife-fresh-*／ilife-pack-* 残留。
 *   --post      发布后复核：npm view 本地版本 dependencies，workspace: 零容忍（带重试）。
 *
 * 版本范围策略（B②）：同版本 ^ + 烟囱契约测试 + changeset 全链联动，不用 exact（见 docs/skill-landing-r2.md）。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname, basename, resolve, sep } from 'node:path';
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

// #95 返修 F1：临时根**必须在仓库之外**（`.scratch/t75/concurrency-protocol.md` §2.1）。
// 归因实测（`.scratch/t95-fix/probe-f1.txt`，2×2）：`npm install <tgz>` 空跑的**决定性变量是安装目录
// 缺最小 package.json**，与 cwd 是否非 ASCII **无关**——非 ASCII `%TEMP%` ＋ 最小 package.json 实测
// 落盘 6 件模板；ASCII 仓外根 ＋ 无 package.json 同样不落盘。旧实现把非 ASCII 时的临时根退回仓库内
// `.scratch/`，等于在 `D:\ilife` 内跑 `npm install`（会把包装进共享根 `node_modules`，与 2026-09-09
// 全仓事故同一机制）→ 现一律 `os.tmpdir()`，只保留「写最小 package.json」这一必要动作。
const TMP_ROOT = tmpdir();
const mkTmp = (prefix) => { mkdirSync(TMP_ROOT, { recursive: true }); return mkdtempSync(join(TMP_ROOT, prefix)); };

// 清理守卫（协议 §2.1③）：目标必须在自己声明的临时根下、且不在仓库内任何敏感路径之下；守卫失败即抛。
const REPO_SENSITIVE = ['node_modules', 'packages', 'docs', 'test', 'tooling', '.git'].map((d) => join(root, d));
function assertTmpTarget(p, ownerRoot) {
  const abs = resolve(p), own = resolve(ownerRoot);
  if (!(abs === own || abs.startsWith(own + sep))) throw new Error('清理守卫拒绝：' + abs + ' 不在临时根 ' + own + ' 下');
  for (const s of REPO_SENSITIVE) if (abs === s || abs.startsWith(s + sep)) throw new Error('清理守卫拒绝（仓库敏感路径）：' + abs);
  if (abs === resolve(root) || abs.startsWith(resolve(root) + sep)) throw new Error('清理守卫拒绝（仓库内）：' + abs);
  return abs;
}
function rmTmp(p, ownerRoot) { rmSync(assertTmpTarget(p, ownerRoot), { recursive: true, force: true }); }

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
  const inst = mkTmp('ilife-fresh-');
  try {
    const tgzs = [];
    for (const name of ALL13.filter(inScope)) {
      const r = spawnSync(NPM, ['pack', '--pack-destination', packDir], { cwd: pkgDir(name), encoding: 'utf8', shell: NPSH });
      const file = (r.stdout || '').trim().split('\n').pop();
      if (r.status !== 0 || !file) { fail(name + ' npm pack 失败'); return; }
      tgzs.push(join(packDir, file));
      ok(name + ' 打包 ' + file);
    }
    console.log('STEP: fresh-tmp 安装目录 ' + inst + '（仓外临时根 ' + TMP_ROOT + '）');
    // #95 F1：最小 package.json 是「npm install 是否真落盘」的**决定性变量**（与路径编码无关，见顶部实测）。
    writeFileSync(join(inst, 'package.json'), JSON.stringify({ name: 'ilife-fresh-install', version: '0.0.0', private: true }, null, 2) + '\n', 'utf8');
    const ins = spawnSync(NPM, ['install', '--no-audit', '--no-fund', ...tgzs], { cwd: inst, encoding: 'utf8', shell: NPSH });
    if (ins.status !== 0) { fail('fresh-tmp npm install 非 0：' + (ins.stderr || '').slice(-800)); return; }
    ok('fresh-tmp npm install ' + tgzs.length + ' 实包成功');
    const scopedPlugs = PLUGINS.filter(inScope);
    const tplSkills = WITH_TEMPLATES.filter(inScope);
    const tplExpect = Object.fromEntries(Object.entries(TEMPLATE_NAMES).filter(([k]) => inScope(k)));
    const AL = [
    "import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';",
    "import { tmpdir } from 'node:os';",
    "import { join, basename, dirname } from 'node:path';",
    "import { pathToFileURL } from 'node:url';",
    "import { spawnSync } from 'node:child_process';",
    "const CONTRACT = " + JSON.stringify(Object.fromEntries(Object.entries(CONTRACT_KEY).filter(([k]) => scopedPlugs.includes(k)))) + ";",
    "const PLUGIN_OF = " + JSON.stringify(Object.fromEntries(Object.entries(PLUGIN_OF).filter(([k]) => scopedPlugs.includes(k)))) + ";",
    "const TPL_EXPECT = " + JSON.stringify(tplExpect) + ";",
    'let bad = 0, contractRan = 0, tplRan = 0, tplBad = 0;',
    'const dbs = [];',
    'for (const [plug, key] of Object.entries(CONTRACT)) {',
    '  contractRan++;',
    '  const skill = PLUGIN_OF[plug];',
    '  const mod = await import(plug);',
    '  const p = mod.cliPath();',
    "  const segs = p.split(/[\/\\\\]/);",
    "  const nm = segs.lastIndexOf('node_modules');",
    "  if (nm < 0 || segs[nm + 1] !== skill) { console.error('FAIL: ' + plug + ' cliPath 不在安装态 skill 包内：' + p); bad++; continue; }",
    "  if (basename(dirname(p)) !== 'cli' || !p.endsWith('cmd_read.js')) { console.error('FAIL: ' + plug + ' cliPath 尾段异常：' + p); bad++; continue; }",
    "  try { mod.assertCliPresent(); } catch (e) { console.error('FAIL: ' + plug + ' assertCliPresent 抛：' + e.message); bad++; continue; }",
    "  const db = mkdtempSync(join(tmpdir(), 'ilife-g3-'));",
    '  dbs.push(db);',
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
    "// F8：**逐件按「应发清单」断言**（旧实现只遍历磁盘上发现的文件 → 少发几件时静默 PASS）。",
    'const TPL_SKILLS = ' + JSON.stringify(tplSkills) + ';',
    'for (const s of TPL_SKILLS) {',
    '  let files;',
    "  try { files = readdirSync(join(process.cwd(), 'node_modules', s, 'templates')).filter((f) => f.endsWith('.html')).map((f) => f.replace(/\\.html$/, '')).sort(); }",
    "  catch (e) { console.error('FAIL: ' + s + ' 安装态无 templates/ 目录（files 未随包发）：' + e.message); bad++; continue; }",
    '  const want = TPL_EXPECT[s];',
    '  if (want) {',
    "    const miss = want.filter((n) => !files.includes(n));",
    "    const extra = files.filter((n) => !want.includes(n));",
    "    if (miss.length) { console.error('FAIL: ' + s + ' 安装态少发模板 ' + miss.length + ' 件（应 ' + want.length + ' 件）：' + miss.join(',')); bad += miss.length; continue; }",
    "    if (extra.length) console.log('NOTE: ' + s + ' 安装态另有未登记模板：' + extra.join(','));",
    "  } else if (!files.length) { console.error('FAIL: ' + s + ' 安装态 templates/ 为空'); bad++; continue; }",
    "  else console.log('NOTE: ' + s + ' 未登记应发清单（TEMPLATE_NAMES 无此包），仅断言非空：' + files.length + ' 件');",
    '  let rmod;',
    "  // 走安装态 dist/render/templates.js（与 exports['./render'] 同目录、只依赖 node 内置 ＋ errors.js）。",
    "  // 不经 s + '/render'：那会连带加载 base-paint，而 registry 上的 base-paint 落后工作区（实测缺",
    "  // ACTION_ID_ATTR）——版本偏斜是**真崩**（非假红），但与本票「模板是否随包且可读」无关；",
    "  // 该公开出口断言按 F3 记账为「未跑，待 base-paint 发版后补」，不冒充已跑。",
    "  const pj = JSON.parse(readFileSync(join(process.cwd(), 'node_modules', s, 'package.json'), 'utf8'));",
    "  const rel = (pj.exports && pj.exports['./render']) || './dist/render/index.js';",
    "  const loaderAbs = join(process.cwd(), 'node_modules', s, String(rel).replace(/[^/]+$/, 'templates.js'));",
    "  try { rmod = await import(pathToFileURL(loaderAbs).href); }",
    "  catch (e) { console.error('FAIL: ' + s + ' 安装态装载器导入失败（' + loaderAbs + '）：' + e.message); bad++; continue; }",
    "  if (typeof rmod.loadTemplate !== 'function') { console.error('FAIL: ' + s + ' 安装态装载器未导出 loadTemplate'); bad++; continue; }",
    '  const names = want || files;',
    '  let tbad = 0;',
    '  for (const nm of names) {',
    '    let html;',
    "    try { html = rmod.loadTemplate(nm); } catch (e) { console.error('FAIL: ' + s + ' loadTemplate(' + nm + ') 抛：' + e.message); tbad++; continue; }",
    "    if (typeof html !== 'string' || html.length < 100) { console.error('FAIL: ' + s + ' 模板 ' + nm + ' 装载内容异常 len=' + (typeof html === 'string' ? html.length : 'n/a')); tbad++; }",
    '  }',
    '  if (tbad) { bad += tbad; continue; }',
    '  tplRan++;',
    "  console.log('OK: ' + s + ' 安装态 templates/ ' + names.length + ' 件经 loadTemplate 全部装载成功');",
    '}',
    "// 公开出口探针（只记录、不判定）：F3 定性 = registry base-paint 版本偏斜下 import(<skill>/render) **真崩**。",
    'for (const s of TPL_SKILLS) {',
    "  try { const m = await import(s + '/render'); console.log('NOTE: ' + s + ' 公开出口 import(\\'' + s + '/render\\') 成功，导出 ' + Object.keys(m).length + ' 项'); }",
    "  catch (e) { console.log('NOTE: ' + s + ' 公开出口 import(\\'' + s + '/render\\') 抛（版本偏斜，非本票红）：' + String(e.message).split('\\n')[0]); }",
    '}',
    "for (const d of dbs) { if (d.startsWith(tmpdir())) rmSync(d, { recursive: true, force: true }); }",
    'if (bad) process.exit(1);',
    "console.log('G3 内部断言：' + (TPL_SKILLS.length ? '模板 ' + tplRan + '/' + TPL_SKILLS.length + ' 包逐件装载全绿' : '模板 未跑（本 scope 无模板包）') + '；' + (contractRan ? '契约 ' + contractRan + ' 键已跑全绿' : '契约 未跑（本 scope 无契约键）'));",
  ];
  const assertFile = join(inst, 'assert-g3.mjs');
  writeFileSync(assertFile, AL.join('\n'), 'utf8');
  const a = spawnSync(process.execPath, [assertFile], { cwd: inst, encoding: 'utf8' });
  console.log(a.stdout || '');
  if (a.status !== 0) { console.error(a.stderr || ''); fail('G3 安装态断言红'); return; }
  // F4：结论**按 scope 分支**——没跑的断言不许说成「全绿」。
  const tplMsg = tplSkills.length
    ? '模板断言 ' + tplSkills.length + ' 包逐件装载全绿（应发清单逐件比对）'
    : '模板断言 未跑（本 scope 不含模板包）';
  const contractMsg = scopedPlugs.length
    ? '契约断言 ' + scopedPlugs.length + ' 键全绿（cliPath 解析 + 契约回执 + 面板路 readViaCli）'
    : '契约断言 未跑（本 scope 不含插件包，无 cliPath／契约键可断）';
  ok('G3 安装态：' + tplMsg + '；' + contractMsg);
  console.log('NOTE: 公开出口断言（安装态 import(<skill>/render)）**未跑**——受 registry base-paint 版本偏斜阻塞，待 base-paint 发版后补（#95 F3 记账，见 docs/research/t95-packaging-and-template-loading.md）。');
  } finally {
    for (const [d, label] of [[inst, '安装目录'], [packDir, '打包目录']]) {
      try { rmTmp(d, TMP_ROOT); } catch (e) { fail('临时根清理失败（' + label + '）：' + e.message); }
    }
  }
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

// #95 F1／F9 回归守卫：临时根必须在仓库之外；且仓内不得留下 `ilife-fresh-*`／`ilife-pack-*` 施工残留
// （协议 §2.1④：临时目录用完即清；历史事故正是残留 8.1MB ＋ 仓内 npm install）。
function gateTmpHygiene() {
  if (resolve(TMP_ROOT) === resolve(root) || resolve(TMP_ROOT).startsWith(resolve(root) + sep)) fail('临时根落在仓库内：' + TMP_ROOT);
  else ok('临时根在仓库之外：' + TMP_ROOT);
  const leftovers = [];
  for (const base of [root, join(root, '.scratch')]) {
    if (!existsSync(base)) continue;
    for (const d of readdirSync(base, { withFileTypes: true })) {
      if (d.isDirectory() && /^ilife-(fresh|pack|g3)-/.test(d.name)) leftovers.push(join(base, d.name));
    }
  }
  if (leftovers.length) fail('仓内残留临时目录（用完即清，见协议 §2.1④）：' + leftovers.join(', '));
  else ok('仓内无 ilife-fresh-*／ilife-pack-*／ilife-g3-* 残留');
}

if (mode === '--pre') gatePre();
else if (mode === '--tarball') gateTarball();
else if (mode === '--fresh-tmp') gateFreshTmp();
else if (mode === '--tmp-hygiene') gateTmpHygiene();
else if (mode === '--post') gatePost();
else { console.error('用法：check-publish.mjs [--pre|--tarball|--fresh-tmp|--tmp-hygiene|--post]'); process.exit(2); }
if (bad) { console.error('check-publish ' + mode + '：' + bad + ' 处红'); process.exit(1); }
console.log('check-publish ' + mode + '：PASS');