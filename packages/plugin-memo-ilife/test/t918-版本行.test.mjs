/**
 * #918 面板版本行（阶段二）：宿主按包名读**已装**的包，客户端只渲染。
 *
 * 被测真件（不是替身）：
 *   · 宿主半 `dist/bridge.js`：`readInstalledVersions` ＋ `readViaCli` 的版本魔键分支；
 *   · 客户端真产物 `dist/client.js`：`fetchVersions`／`formatVersionLine`／`VersionLine`（按 DSH loader 语义物化）。
 * 走过的是一条跨 host／client 的路：两份 `package.json` → 宿主读 → RPC（同一条 READ 端点 ＋ 版本魔键）→ 面板那行文本。
 *
 * 与既有门的关系：`test/smoke.test.mjs` 那条「版本行与双 package.json 一致」咬**宿主读数**；
 * 本文件咬**客户端那一半**（取数键与渲染、unknown 降级）＋「版本字面量零回潮」。
 *
 * 运行：`node --test packages/plugin-memo-ilife/test/t918-版本行.test.mjs`
 * （需先编宿主侧 `tsc -b` 与产物侧 `pnpm run build:client`）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClientBundle } from '../../../test/helpers/client-bundle.mjs';
import { readInstalledVersions, readViaCli } from '../dist/bridge.js';
import { VERSION_READ_KEY, VERSION_UNKNOWN } from '../dist/contract.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = resolve(HERE, '..');
const REPO = resolve(PKG_DIR, '..', '..');
const DIST = join(PKG_DIR, 'dist');
const requirePkg = createRequire(import.meta.url);

/** 装机真相：插件自己那份 manifest ＋ 已装技能包那份（两侧都按包名解析，与宿主侧同一条路）。 */
const PLUGIN_PKG = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const SKILL_VERSION = requirePkg('skill-memo-ilife/package.json').version;
const WANT = { plugin: PLUGIN_PKG.version, skill: SKILL_VERSION };
const line = (p, s) => `${p} · 技能 ${s}`;

const CLIENT = loadClientBundle(PKG_DIR);

/** 复刻宿主那条 READ 端点（`index.ts` handleMemoRpc → `bridge.readViaCli` → `contract.ok` 信封）：
 *  让客户端取数真的打到宿主读值实现上，而不是只喂假值。 */
function makeRpcCall() {
  const seen = [];
  return {
    seen,
    call: async (path, channel, message) => {
      seen.push({ path, channel, message });
      return { ok: true, value: readViaCli(message.payload.key, message.payload.params ?? {}) };
    },
  };
}

/** 目录下指定后缀的全部文件（递归）：回潮扫描用。 */
function listFiles(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(path, exts));
    else if (exts.some((x) => entry.name.endsWith(x))) out.push(path);
  }
  return out;
}

describe('#918 面板版本行：宿主读装机包，客户端只渲染', () => {
  it('① 面板那条真通路：客户端取数（同 READ 端点 ＋ 版本魔键）→ 宿主读 → 版本行 ≡ 双 package.json', async () => {
    const { call, seen } = makeRpcCall();
    const versions = await CLIENT.exports.fetchVersions(call);
    assert.equal(seen.length, 1, '版本读取须是单次调用（不轮询）');
    assert.equal(seen[0].path, '/api', '载体基段（#735 那条 404 教训）');
    assert.equal(seen[0].channel, 'ilife-memo', '同一条既有通道');
    assert.equal(seen[0].message.method, 'read', '同一条既有 READ 端点');
    assert.equal(seen[0].message.payload.key, VERSION_READ_KEY, '版本键须为 port 那份 VERSION_READ_KEY');
    assert.deepEqual(versions, WANT, '面板那两个号 ≡ 装机两份 package.json 的 version');
    const text = CLIENT.exports.formatVersionLine(versions.plugin, versions.skill);
    assert.equal(text, line(WANT.plugin, WANT.skill), '面板那行文本');
    // VersionLine 就是面板那行：宿主给什么画什么（没有任何版本字面量参与）。
    assert.deepEqual(CLIENT.exports.VersionLine({ pluginVersion: versions.plugin, skillVersion: versions.skill }).children, [text]);
  });

  it('② 两条读法同值：readInstalledVersions ≡ readViaCli(版本魔键) ≡ 装机两份 package.json', () => {
    assert.deepEqual(readInstalledVersions(), WANT);
    assert.deepEqual(readViaCli(VERSION_READ_KEY, {}), WANT,
      '版本键回执须是 {plugin, skill}（不是 CLI envelope 的 key/data 形状），且不经技能 CLI spawn');
  });

  it('③ 降级：取不到／只取到一格 ⇒ unknown，永不抛、骨架不断', async () => {
    for (const bad of [undefined, null, 'not-a-function', 42]) {
      assert.deepEqual(await CLIENT.exports.fetchVersions(bad), { plugin: VERSION_UNKNOWN, skill: VERSION_UNKNOWN },
        '非函数调用口 ⇒ 双 unknown（' + String(bad) + '）');
    }
    const cases = [
      ['传输抛错', async () => { throw new Error('传输炸了'); }],
      ['错误信封', async () => ({ ok: false, error: { code: 'internal', message: 'x', details: {} } })],
      ['值为 null', async () => ({ ok: true, value: null })],
      ['值非对象', async () => ({ ok: true, value: 'nonsense' })],
      ['对象无字段', async () => ({ ok: true, value: {} })],
    ];
    for (const [name, call] of cases) {
      assert.deepEqual(await CLIENT.exports.fetchVersions(call), { plugin: VERSION_UNKNOWN, skill: VERSION_UNKNOWN }, name + ' ⇒ 双 unknown');
    }
    // 单侧降级与归一：只坏一侧不连坐；空白串视同缺失。
    assert.deepEqual(await CLIENT.exports.fetchVersions(async () => ({ ok: true, value: { plugin: WANT.plugin } })),
      { plugin: WANT.plugin, skill: VERSION_UNKNOWN });
    assert.deepEqual(await CLIENT.exports.fetchVersions(async () => ({ ok: true, value: { plugin: '  ' + WANT.plugin + '  ', skill: '   ' } })),
      { plugin: WANT.plugin, skill: VERSION_UNKNOWN });
    // 渲染这一侧不抛：props 缺席（初值态）也照画 unknown 骨架。
    assert.equal(CLIENT.exports.formatVersionLine(VERSION_UNKNOWN, VERSION_UNKNOWN), line(VERSION_UNKNOWN, VERSION_UNKNOWN));
    assert.deepEqual(CLIENT.exports.VersionLine({}).children, [line(VERSION_UNKNOWN, VERSION_UNKNOWN)]);
    assert.equal(typeof CLIENT.exports.apply, 'function', '面板装配不受版本通路影响');
  });

  it('④ 版本字面量零回潮：源码与产物里没有与两份 package.json 全等的字面量，slot 的两个常量彻底出局', async () => {
    const versions = [WANT.plugin, WANT.skill];
    const files = [...listFiles(join(PKG_DIR, 'src'), ['.ts']), ...listFiles(DIST, ['.js', '.d.ts'])];
    assert.ok(files.length >= 8, '扫描面异常，实际 ' + files.length + ' 个文件');
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const v of versions) {
        const quoted = new RegExp('[\'"`]' + v.replace(/\./g, '\\.') + '[\'"`]');
        assert.equal(quoted.test(text), false, relative(REPO, file) + ' 含与 package.json 版本全等的字面量 ' + v + '（#918 禁回潮）');
      }
    }
    const slotMod = await import('../dist/slot.js');
    assert.equal('PLUGIN_VERSION' in slotMod, false, 'slot.ts 不得再手写版本常量');
    assert.equal('SKILL_VERSION' in slotMod, false, 'slot.ts 不得再手写版本常量');
    const clientSrc = readFileSync(join(PKG_DIR, 'src', 'client.ts'), 'utf8');
    assert.doesNotMatch(clientSrc, /PLUGIN_VERSION|SKILL_VERSION/, '客户端不得再引版本常量');
    assert.doesNotMatch(clientSrc, /from\s+['"][^'"]*bridge\.js['"]/, 'client.ts 不得 import bridge（node 依赖会进浏览器束）');
  });
});
