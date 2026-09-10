/** S1 发布包体干净安装冒烟门（base-paint/blocks 发布必崩回放）。
 *
 * 根因（见报告）：skill-calorie dist 有 7 个文件 import 'base-paint/blocks'，
 * 而 registry base-paint@0.2.0 的 exports 仅含 "."（0.2.0 发布于 blocks 落盘
 * #104 约 1 小时前，包内连 dist/blocks.js 都没有）→ 干净安装必崩
 * ERR_PACKAGE_PATH_NOT_EXPORTED，而仓内 pnpm link 指向自带导出的工作区包，
 * 发布门 G3 又是 13 个工作区 tarball 一起装（base-paint 永远取到工作区新包，
 * 且其模板段明写"版本偏斜待发版后补"、公开出口探针只 NOTE 不判定）→ 仓库全绿。
 *
 * 本门双断言（均只消费工作区现打 tarball，不碰 registry、不改仓库）：
 *  ① 静态：dist 引用的每个 base-paint/* 子路径都必须在 base-paint 的
 *     exports 内，且映射文件随包真实存在（防"只加 exports 忘发文件"）；
 *  ② 动态：skill + base-paint 双 tarball 在仓外隔离目录安装（模拟发版后
 *     registry 已有新 base-paint 的用户态），跑 calorie.help.center 断言
 *     exit 0 + envelope key/shape。
 * 约束：安装目录一律在仓外（协议 §2.1）；spawn npm 的 cwd 永不取仓库根
 * （npm arborist 以 pnpm 树根为 cwd 必崩 edgesOut，实测——故取隔离目录自身）。
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const here = dirname(fileURLToPath(import.meta.url));
const skillDir = join(here, '..');
const baseDir = resolve(skillDir, '..', 'base-render');
const repoRoot = resolve(skillDir, '..', '..');
const CONTRACT_KEY = 'calorie.help.center';
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const SHELL = process.platform === 'win32'; // .cmd 须经 shell 起（同 tooling/check-publish.mjs）

// 真 node 定位（沿 test/cli-smoke-t41.test.mjs 范式）：防 DSH 宿主 Electron 冒充。
function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch { /* 试下一个 */ }
  }
  return process.execPath;
}
const NODE = nodeBin();

function sh(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', shell: SHELL, ...opts });
}

/** 递归列出 dir 下全部 .js（不含 .map）。 */
function listDistJs(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listDistJs(p));
    else if (e.isFile() && e.name.endsWith('.js') && !e.name.endsWith('.js.map')) out.push(p);
  }
  return out;
}

function usedBasePaintSubpaths() {
  const found = new Map(); // subpath -> 首见文件
  const res = [/from\s+['"](base-paint(?:\/[^'"]*)?)['"]/g, /import\s*\(\s*['"](base-paint(?:\/[^'"]*)?)['"]\s*\)/g];
  for (const f of listDistJs(join(skillDir, 'dist'))) {
    const text = readFileSync(f, 'utf8');
    for (const re of res) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const spec = m[1];
        const sub = spec === 'base-paint' ? '.' : '.' + spec.slice('base-paint'.length);
        if (!found.has(sub)) found.set(sub, f);
      }
    }
  }
  return found;
}

function exportTarget(pkg, sub) {
  const v = pkg.exports?.[sub];
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') return v.import ?? v.default ?? v.require ?? null;
  return null;
}

test('S1-① dist 引用的 base-paint 子路径必须全在 base-paint exports 内且文件随包', () => {
  const used = usedBasePaintSubpaths();
  assert.ok(used.size > 0, 'dist 内未发现任何 base-paint 引用，扫描逻辑可能已过期');
  const basePkg = JSON.parse(readFileSync(join(baseDir, 'package.json'), 'utf8'));
  assert.ok(basePkg.exports && typeof basePkg.exports === 'object', 'base-paint 无 exports 映射');
  for (const [sub, file] of used) {
    const target = exportTarget(basePkg, sub);
    assert.ok(
      typeof target === 'string' && target.length > 0,
      `dist 引用 ${sub}（首见 ${file}）但 base-paint exports 缺该子路径——发布包必崩 ERR_PACKAGE_PATH_NOT_EXPORTED`,
    );
    const abs = join(baseDir, target);
    assert.ok(existsSync(abs) && statSync(abs).isFile(), `exports ${sub} → ${target} 在包内无对应文件（files 未随包发）`);
  }
  // 同版本线（与 publish 门 G1 B③ 同语义）：skill 的 floor 必须跟住工作区 base-paint 的 major.minor，
  // 否则发版后用户按 range 装到旧 base-paint 即复现本 S1。
  const skillPkg = JSON.parse(readFileSync(join(skillDir, 'package.json'), 'utf8'));
  const range = skillPkg.dependencies?.['base-paint'];
  const m = /^\^(\d+)\.(\d+)\.\d+$/.exec(String(range ?? ''));
  assert.ok(m, `skill 对 base-paint 的声明非 ^major.minor.patch 形：${range}`);
  const [maj, min] = String(basePkg.version).split('.');
  assert.equal(
    `${m[1]}.${m[2]}`,
    `${maj}.${min}`,
    `skill 声明 base-paint ${range} 与工作区 ${basePkg.version} 非同版本线`,
  );
});

test('S1-② 发布包体干净安装：calorie.help.center exit 0', { timeout: 180_000 }, () => {
  const packDir = mkdtempSync(join(tmpdir(), 'ilife-s1-pack-'));
  const instDir = mkdtempSync(join(tmpdir(), 'ilife-s1-fresh-'));
  // 仓外断言（协议 §2.1）：临时目录不得落在仓库内敏感路径。
  for (const p of [packDir, instDir]) {
    const abs = resolve(p);
    assert.ok(
      abs !== repoRoot && !abs.startsWith(repoRoot + sep),
      `临时目录必须在仓外，得到 ${abs}`,
    );
  }
  try {
    const tgzs = [];
    for (const dir of [skillDir, baseDir]) {
      const r = sh(NPM, ['pack', '--pack-destination', packDir], { cwd: dir });
      assert.equal(r.status, 0, `npm pack 失败（${dir}）：${(r.stderr || '').slice(-500)}`);
      const file = String(r.stdout || '').trim().split('\n').pop().trim();
      assert.ok(file && file.endsWith('.tgz'), `npm pack 输出异常：${r.stdout}`);
      tgzs.push(join(packDir, file));
    }
    writeFileSync(
      join(instDir, 'package.json'),
      JSON.stringify({ name: 'ilife-s1-fresh', version: '0.0.0', private: true }, null, 2) + '\n',
      'utf8',
    );
    const ins = sh(NPM, ['install', '--no-audit', '--no-fund', ...tgzs], { cwd: instDir });
    assert.equal(ins.status, 0, `隔离安装非 0：${(ins.stderr || '').slice(-800)}`);
    const cli = join(instDir, 'node_modules', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
    assert.ok(existsSync(cli), '安装态缺 dist/cli/cmd_read.js（files 未随包发）');
    const db = mkdtempSync(join(tmpdir(), 'ilife-s1-db-'));
    mkdirSync(db, { recursive: true });
    const r = spawnSync(
      NODE,
      [cli, CONTRACT_KEY, '--params', '{}'],
      { encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: db } },
    );
    assert.equal(r.status, 0, `安装态 ${CONTRACT_KEY} exit=${r.status}：${(r.stderr || '').slice(-800)}`);
    let env;
    assert.doesNotThrow(() => { env = JSON.parse(String(r.stdout)); }, '安装态回执非 JSON');
    assert.equal(env.key, CONTRACT_KEY, '回执 key 不符');
    assert.ok(typeof env.shape === 'string' && env.data !== null && env.data !== undefined, '回执缺 shape/data');
    rmSync(db, { recursive: true, force: true });
  } finally {
    // 用完即清（协议 §2.1④），失败也不留残留。
    for (const p of [packDir, instDir]) {
      try { rmSync(p, { recursive: true, force: true }); } catch { /* 尽力而为 */ }
    }
  }
});
