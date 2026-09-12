/** 发版窗口前置门：**第三方安装态**能不能 import 得起来。
 *
 * 为什么需要它（2026-09-12 实测的假绿）：
 *   工作区里 `base-paint` 的 `exports` 有 `./help-shell`，于是 `skill-memo-ilife` /
 *   `skill-schedule` 的 HELP 交付链在本仓**全绿**；但 registry 上的 `base-paint@0.3.0`
 *   只有 `.` 与 `./blocks`，**没有 `./help-shell`** ⇒ 第三方按 `^0.3.0` 装到 0.3.0 后
 *   `memo-cmd-read` 直接 `ERR_PACKAGE_PATH_NOT_EXPORTED` 起不来。
 *   实测原始报错（隔离安装后直跑 CLI）：
 *     Error [ERR_PACKAGE_PATH_NOT_EXPORTED]: Package subpath './help-shell' is not defined
 *     by "exports" in .../node_modules/base-paint/package.json
 *     imported from .../node_modules/skill-memo-ilife/dist/help/helpFile.js
 *   六个包的门禁（--pre / --tarball / 各包单测）**全部放过**了它 —— 因为它们比对的都是工作区，
 *   没有一条去看 registry 上那份 tarball 的 exports。本脚本补这一条。
 *
 * 做什么（只读 registry 与 %TEMP%）：
 *   ① 每个待发/已发包：查 registry 上**当前最新版**（＝第三方 `^range` 今天会装到的版本）；
 *   ② 抓它的 tarball，用 node 自解 gzip ＋ 极简 tar 读 `package/package.json`
 *      （**不用系统 tar**：中文用户名路径下 tar 打不开文件，实测踩过）；
 *   ③ 扫该包工作区 `dist/` 里所有 `from '<本仓依赖>/<子路径>'` 导入；
 *   ④ 断言每个子路径都能在**依赖在 registry 上那份**的 exports 里解析出来（含 `*` 通配）；
 *   ⑤ 报「工作区有、registry 没有」的差集 —— 那正是假绿的形态。
 *
 * 用法：
 *   node tooling/check-registry-exports.mjs --only skill-memo-ilife,skill-schedule,skill-calorie
 *   node tooling/check-registry-exports.mjs --json
 * 退出码：0 = registry 安装态 import 得起来；1 = 有子路径缺失（**先补发依赖包再发**）。
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REG = 'https://registry.npmjs.org';
const argv = process.argv.slice(2);
const argOf = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
const asJson = argv.includes('--json');

/** npm 名 → 仓内目录名（本仓发布闭包） */
const DIRM = {
  'dsh-calorie': 'plugin-calorie', 'dsh-chef': 'plugin-chef', 'dsh-bill-ilife': 'plugin-bill-ilife',
  'dsh-home-ilife': 'plugin-home-ilife', 'dsh-memo-ilife': 'plugin-memo-ilife',
  'dsh-schedule-ilife': 'plugin-schedule-ilife', 'dsh-life-pack': 'plugin-manager',
  'skill-calorie': 'skill-calorie', 'skill-chef': 'skill-chef', 'skill-bill': 'skill-bill',
  'skill-home': 'skill-home', 'skill-memo-ilife': 'skill-memo-ilife', 'skill-schedule': 'skill-schedule',
  'base-combos': 'base-combos', 'base-link-core': 'base-link-core', 'base-paint': 'base-render',
};

const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
/** Windows 上 npm 是 npm.cmd ⇒ 必须经 shell 才能 execFileSync（否则 ENOENT 被吞成「查不到」） */
const run = (args) => execFileSync(NPM, args, {
  encoding: 'utf8', shell: true, stdio: ['ignore', 'pipe', 'ignore'],
});

const npmViewJson = (spec, field) => {
  try {
    const out = run(['view', spec, field, '--json', `--registry=${REG}`, '--prefer-online']).trim();
    return out ? JSON.parse(out) : null;
  } catch { return null; }
};

const packInto = (spec, dest) => {
  try {
    run(['pack', spec, '--pack-destination', dest, '--silent', `--registry=${REG}`]);
    return true;
  } catch { return false; }
};

/** 从 .tgz 读 package/package.json：node 自解 gzip + 极简 tar（中文路径下系统 tar 会失败） */
async function readTarballManifest(tgz) {
  const { createGunzip } = await import('node:zlib');
  const { Readable } = await import('node:stream');
  const chunks = [];
  for await (const c of Readable.from(readFileSync(tgz)).pipe(createGunzip())) chunks.push(c);
  const buf = Buffer.concat(chunks);
  let off = 0;
  while (off + 512 <= buf.length) {
    const name = buf.toString('utf8', off, off + 100).replace(/\0.*$/, '');
    if (!name) break;
    const size = parseInt(buf.toString('utf8', off + 124, off + 136).replace(/\0.*$/, '').trim() || '0', 8);
    if (name === 'package/package.json') {
      return JSON.parse(buf.subarray(off + 512, off + 512 + size).toString('utf8'));
    }
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return null;
}

/** exports map 里 subpath 是否可达（对象条件形态／数组／`./x/*` 通配） */
function exportReachable(exports, subpath) {
  if (!exports) return false;
  if (Array.isArray(exports)) return exports.some((v) => exportReachable(v, subpath));
  if (typeof exports !== 'object') return false;
  const keys = Object.keys(exports);
  if (keys.some((k) => k.startsWith('.'))) {
    if (Object.prototype.hasOwnProperty.call(exports, subpath)) return true;
    for (const k of keys) {
      if (!k.includes('*')) continue;
      const [pre, post = ''] = k.split('*');
      if (subpath.startsWith(pre) && subpath.endsWith(post) && subpath.length >= pre.length + post.length) return true;
    }
    return false;
  }
  return Object.values(exports).some((v) => exportReachable(v, subpath));
}

/** 扫工作区 dist：收集 `from '<本仓依赖>/<子路径>'` */
function subpathImportsOf(distDir) {
  const found = new Map();
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(m?js)$/.test(e.name)) continue;
      const text = readFileSync(p, 'utf8');
      for (const m of text.matchAll(/from\s*['"]([^'".][^'"]*?)['"]|import\s*\(\s*['"]([^'".][^'"]*?)['"]/g)) {
        const spec = m[1] ?? m[2];
        if (!spec || spec.startsWith('node:') || spec.startsWith('.')) continue;
        const parts = spec.split('/');
        const pkg = spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
        if (!DIRM[pkg]) continue;
        const sub = spec.slice(pkg.length);
        if (!sub) continue;
        if (!found.has(spec)) found.set(spec, new Set());
        found.get(spec).add(e.name);
      }
    }
  };
  walk(distDir);
  return found;
}

async function main() {
  const only = (argOf('--only') ?? Object.keys(DIRM).join(','))
    .split(',').map((s) => s.trim()).filter(Boolean);
  const tmp = mkdtempSync(join(tmpdir(), 'ilife-regexports-'));
  const results = [];
  const depExportsCache = new Map();  // dep -> {version, exports}
  let bad = 0;

  const depExportsOf = async (dep) => {
    if (depExportsCache.has(dep)) return depExportsCache.get(dep);
    const version = npmViewJson(dep, 'version');
    let exports = npmViewJson(`${dep}@${version}`, 'exports');
    if (version && exports === null) {
      const dest = join(tmp, dep.replace(/[@/\\:]/g, '_') + '-dep');
      mkdirSync(dest, { recursive: true });
      if (packInto(`${dep}@${version}`, dest)) {
        const tgz = readdirSync(dest).find((f) => f.endsWith('.tgz'));
        if (tgz) { const m = await readTarballManifest(join(dest, tgz)); if (m) exports = m.exports ?? {}; }
      }
    }
    const rec = { version, exports };
    depExportsCache.set(dep, rec);
    return rec;
  };

  for (const pkg of only) {
    const dir = DIRM[pkg];
    if (!dir) { results.push({ pkg, skip: '不在本仓包清单' }); continue; }
    const wsManifest = JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'));
    const regVersion = npmViewJson(pkg, 'version');
    if (!regVersion) { results.push({ pkg, skip: 'registry 上查不到（未发布？）' }); continue; }

    const imports = subpathImportsOf(join(root, 'packages', dir, 'dist'));
    const missing = [];
    for (const [spec] of imports) {
      const dep = spec.split('/')[0];
      const depDir = DIRM[dep];
      if (!depDir) continue;
      const { version: depRegVer, exports: depExports } = await depExportsOf(dep);
      const wsExports = JSON.parse(readFileSync(join(root, 'packages', depDir, 'package.json'), 'utf8')).exports;
      const sub = spec.slice(dep.length);
      if (!exportReachable(depExports, sub)) {
        missing.push({ spec, dep, depRegVersion: depRegVer, workspaceHasIt: exportReachable(wsExports, sub) });
      }
    }
    if (missing.length) bad++;
    results.push({ pkg, workspaceVersion: wsManifest.version, registryVersion: regVersion, imports: imports.size, missing });
  }

  if (asJson) {
    console.log(JSON.stringify({ ok: bad === 0, results }, null, 2));
  } else {
    for (const r of results) {
      if (r.skip) { console.log(`SKIP  ${r.pkg}：${r.skip}`); continue; }
      if (!r.missing.length) {
        console.log(`OK    ${r.pkg}（工作区 ${r.workspaceVersion}／registry 最新 ${r.registryVersion}）：` +
          `${r.imports} 处子路径导入全在 registry 版 exports 里`);
        continue;
      }
      console.log(`FAIL  ${r.pkg}（工作区 ${r.workspaceVersion}／registry 最新 ${r.registryVersion}）：`);
      for (const m of r.missing) {
        console.log(`        ${m.spec} —— registry 上 ${m.dep}@${m.depRegVersion} 的 exports 里没有该子路径` +
          (m.workspaceHasIt ? '（**工作区有** ⇒ 本仓全绿、第三方必挂，典型假绿）' : ''));
      }
    }
    console.log(bad === 0
      ? 'check-registry-exports：PASS'
      : `check-registry-exports：FAIL（${bad} 个包按 registry 装起来就 import 不了；先补发缺子路径的依赖包）`);
  }
  process.exit(bad === 0 ? 0 : 1);
}

await main();
