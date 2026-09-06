#!/usr/bin/env node
// skilllink CLI 冻结（P9 #10）：四步 skilllink + 唯一出口 cmd_read(read) + argv+JSON+exit + doctor。
// 退出码冻结：0 ok；1 doctor fail；2 用法/参数；3 读表/registry/key；4 取数；5 envelope/形状/渲染/HTML落盘；6 dist 未构建（先跑 pnpm build）。
// stdout 纯净：read 成功只打 envelope JSON 一行；进度与错误一律 stderr。
import { accessSync, constants, statSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const cmd = args[0];
const rest = args.slice(1);
let strict = false;

function fail(code, msg) { console.error('ERR ' + code + ': ' + msg); process.exit(code); }
function dies(msg) { console.error('FAIL: ' + msg); process.exitCode = 1; }
function warn(msg) { console.error('WARN: ' + msg); }
function ok(msg) { console.log('OK: ' + msg); }
function step(n, msg) { console.error('STEP ' + n + '/4: ' + msg); }

function checkNode() {
  const v = process.versions.node.split('.').map(Number);
  const major = v[0], minor = v[1];
  const atLeast = (mj, mn) => major > mj || (major === mj && minor >= mn);
  if (!atLeast(22, 13)) {
    if (major === 22 && minor >= 5) warn('node ' + process.versions.node + ' 需 --experimental-sqlite，仅过渡');
    else dies('node ' + process.versions.node + ' 低于 22.13，请升级（日常用 22.13+/24）');
    return;
  }
  ok('node ' + process.versions.node + ' >= 22.13');
}

function checkDb() {
  const p = process.env.SKILLS_DB_PATH;
  if (!p) {
    if (strict) dies('SKILLS_DB_PATH 未设置（docs/env.md：无默认值，必设）');
    else warn('SKILLS_DB_PATH 未设置（无默认值，必设；默认 warn，--strict 升 fail）');
    return;
  }
  try {
    const st = statSync(p);
    if (!st.isDirectory()) return dies('SKILLS_DB_PATH 非目录：' + p);
    accessSync(p, constants.W_OK);
    ok('SKILLS_DB_PATH 可写：' + p);
  } catch (e) { dies('SKILLS_DB_PATH 不可用：' + p + '（换 DB 需重连）'); }
}

function checkLark() {
  // 存在+版本探测冻结于此；登录/写权限/端到端按技能逐包验收（迁移图），此处只 warn 不判。
  try {
    const ver = execFileSync('lark-cli', ['--version'], { stdio: 'pipe', encoding: 'utf8' }).trim().split('\n')[0];
    ok('lark-cli 存在：' + ver);
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      if (strict) dies('lark-cli 未找到：缺失阻断取数，不返空数组');
      else warn('lark-cli 未找到：缺失阻断取数，不返空数组（默认 warn，--strict 升 fail）');
    } else warn('lark-cli 存在但探测失败（登录/写权限/端到端待迁移图验收）：' + (e.message || e));
  }
}

// STEP 1 读表：只认 P9 冻结子集，其余行大声失败。
function loadCombosTable() {
  const p = join(root, 'packages/base-combos/combos.yaml');
  let text = '';
  try { text = readFileSync(p, 'utf8'); } catch (e) { fail(3, '读表失败：' + p); }
  const rows = [];
  let cur = null;
  for (const ln of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(ln) || /^\s*$/.test(ln)) continue;
    if (/^combos:\s*$/.test(ln)) continue;
    let m = ln.match(/^  - key: (\S+)\s*$/);
    if (m) { cur = { key: m[1] }; rows.push(cur); continue; }
    m = ln.match(/^    (skill|shape|title|cmd): (.+?)\s*$/);
    if (m && cur) { cur[m[1]] = m[2]; continue; }
    fail(3, 'combos.yaml 含冻结格式外行：' + JSON.stringify(ln));
  }
  if (!rows.length) fail(3, 'combos.yaml 为空表');
  return rows;
}

// 技能出口取数（M7 联动）：spawn 包内 cmd_read，stdout JSON 再过 envelope 全字段；错即 fail，不返空。
// 本机 node 定位：execPath（能跑本代码者必能自举）优先，PATH 之 node 次之，npm shim 再次之；.cmd 走引号包裹的 cmd /s /c（路径含空格必包，否则截断）。
function spawnNode(args, opts) {
  const cands = [];
  if (process.execPath && !/\.cmd$/i.test(process.execPath)) cands.push({ file: process.execPath, wrap: false });
  cands.push({ file: 'node', wrap: false });
  const shim = process.env.npm_node_execpath;
  if (shim) cands.push({ file: shim, wrap: process.platform === 'win32' && /\.cmd$/i.test(shim) });
  let last = null;
  for (const c of cands) {
    try {
      let r = null;
      if (c.wrap) {
        const q = (s) => '"' + String(s).replace(/"/g, '""') + '"';
        r = spawnSync('cmd.exe', ['/d', '/s', '/c', q(c.file) + ' ' + args.map(q).join(' ')], opts);
      } else {
        r = spawnSync(c.file, args, opts);
      }
      if (r.error && (r.error.code === 'ENOENT' || r.error.code === 'EINVAL')) { last = r; continue; }
      return r;
    } catch (e) { last = { error: e, status: null }; }
  }
  return last;
}
function skillFetch(entry, params) {
  const bin = join(root, 'packages', entry.cmd, 'dist', 'cli', 'cmd_read.js');
  const r = spawnNode([bin, entry.key, '--params', JSON.stringify(params)], { encoding: 'utf8' });
  if (r.error) throw new Error('出口 spawn 失败：' + r.error.message);
  if (r.status !== 0) throw new Error('出口非 0（' + r.status + '）：' + String(r.stderr || '').trim().split('\n').pop());
  let env = null;
  try { env = JSON.parse(String(r.stdout)); } catch (e) { throw new Error('出口非 JSON'); }
  if (!env || env.key !== entry.key) throw new Error('出口回执 key 不符');
  return env.data;
}

// 试点取数器：仅 calorie.today；其余已注册 key 大声失败（待技能迁移落包，不返空）。
function pilotFetch(entry) {
  if (entry.key === 'calorie.today') return { items: [] };
  throw new Error('无试点取数器：' + entry.key + '（待技能迁移落包）');
}

async function cmdRead(key, opts) {
  if (!key) fail(2, '用法：node tooling/skilllink.mjs read <skill.combo> [--params JSON对象] [--html 输出路径]');
  step(1, '读表 packages/base-combos/combos.yaml');
  const table = loadCombosTable();
  let core = null, render = null;
  try {
    core = await import(pathToFileURL(join(root, 'packages/base-link-core/dist/index.js')).href);
    render = await import(pathToFileURL(join(root, 'packages/base-render/dist/index.js')).href);
  } catch (e) { fail(6, 'dist 未构建，先跑 pnpm build（' + e.message + '）'); }
  for (const t of table) {
    if (!t.skill || !t.shape || !t.title) fail(3, 'combos.yaml 条目缺字段：' + t.key);
    try { core.parseRegistryKey(t.key); } catch (e) { fail(3, 'combos.yaml 非法 key：' + e.message); }
    if (!core.ENVELOPE_SHAPES.includes(t.shape)) fail(5, 'combos.yaml 未知 shape：' + t.key + '=' + t.shape);
    if (t.cmd !== undefined) {
      if (!/^[a-z][a-z0-9-]*$/.test(t.cmd)) fail(3, 'combos.yaml 非法 cmd：' + t.key + '=' + t.cmd);
      try { accessSync(join(root, 'packages', t.cmd, 'dist', 'cli', 'cmd_read.js'), constants.R_OK); }
      catch (e) { fail(3, 'combos.yaml cmd 出口缺失（先构建对应包）：' + t.key + ' -> packages/' + t.cmd); }
    }
  }
  step(2, 'registry 解析 + envelope 全字段');
  let entry = null;
  try {
    const reg = core.createRegistry(table.map((t) => t.key));
    const parsed = reg.resolve(key);
    entry = table.find((t) => t.key === parsed.key) || null;
  } catch (e) { fail(3, 'key 对不上 registry：' + e.message); }
  if (!entry) fail(3, 'key 不在 combos.yaml：' + key);
  let params = {};
  if (opts.params !== undefined) {
    try { params = JSON.parse(opts.params); } catch (e) { fail(2, '--params 须为 JSON：' + e.message); }
    if (typeof params !== 'object' || params === null || Array.isArray(params)) fail(2, '--params 须为 JSON 对象');
  }
  step(3, entry.cmd ? ('取数（技能出口 packages/' + entry.cmd + '）') : '取数（试点取数器）');
  let data = null;
  try { data = entry.cmd ? skillFetch(entry, params) : await pilotFetch(entry, params); }
  catch (e) { fail(4, '取数失败：' + e.message); }
  let env = null;
  try { env = core.createEnvelope({ skill: entry.skill, shape: entry.shape, key: entry.key, data }); }
  catch (e) { fail(5, '载荷未过 envelope 全字段：' + e.message); }
  step(4, '合并渲染结果页');
  let html = '';
  try {
    const page = { skill: entry.skill, slotId: 'ilife:' + entry.skill, order: 0, title: entry.title, kind: 'page' };
    html = render.renderPage(page, env).html;
  } catch (e) { fail(5, '渲染失败：' + e.message); }
  if (opts.html) {
    try { writeFileSync(opts.html, html, 'utf8'); }
    catch (e) { fail(5, 'HTML 写盘失败：' + opts.html + '（' + e.message + '）'); }
    console.error('HTML 已写：' + opts.html + '（utf8）');
  }
  process.stdout.write(JSON.stringify(env) + '\n');
}

function parseReadArgs(a) {
  const o = { key: a[0], params: undefined, html: undefined };
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--params' && i + 1 < a.length) o.params = a[++i];
    else if (a[i] === '--html' && i + 1 < a.length) o.html = a[++i];
    else fail(2, '未知参数：' + a[i] + '（用法：read <skill.combo> [--params JSON对象] [--html 输出路径]）');
  }
  return o;
}

if (cmd === 'doctor') {
  strict = rest.includes('--strict');
  checkNode();
  checkDb();
  checkLark();
  ok('CLI 契约：argv+JSON(stdout)+exit；HTML 用 --html 显式落盘（utf8，路径/编码待定中转方案）');
  if (process.exitCode) console.error('doctor: FAIL');
  else console.log('doctor: PASS');
} else if (cmd === 'read') {
  await cmdRead(rest[0], parseReadArgs(rest));
} else {
  console.error('用法：node tooling/skilllink.mjs doctor [--strict] | read <skill.combo> [--params JSON对象] [--html 输出路径]');
  process.exit(2);
}
