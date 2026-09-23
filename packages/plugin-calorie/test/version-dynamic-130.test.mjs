// #130 面板版本号动态读取已安装版本 —— 逐条机器锁票面验收 5 条。
//   #918 阶段三（本文件同步改）：读值口径迁到总管共用件 `dsh-life-pack.installedVersionOf(包名, from)`，
//   自家 `readOneVersion` 与 `pluginPackageJsonPath`／`skillPackageJsonPath` 两个 path 函数已删。
//   故本文件的**注入缝**跟着换：不再有 pluginPath／skillPath／logger 三个注入口（那是删掉的自家读法才有的），
//   失败态一律用「模拟安装里那份 manifest 坏掉／缺席」注入；断言的**事实**一条不减
//   （单侧坏只影响该侧、双坏双 unknown、永不抛、warn 留痕含包名与原因、落点＝已装的那两份 manifest）。
//
// 被测真件（不是替身）：
//  - host 读值：dist/bridge.js（readInstalledVersions／readViaCli；读值走总管共用件，
//    总管那份真件以 junction 进模拟安装——`dsh-life-pack` 本来就是插件声明过的依赖）
//  - client 渲染：dist/client.js（真产物，按 DSH classic script loader 语义执行后取 exports）
// 版本读取是一条跨 host/client 的路：磁盘 package.json → host 读 → RPC（键 dsh-calorie.version）→ client 骨架文本。
// 本文件只喂桩值／桩回执（哨兵），并且全程不改任何真实文件：源码、产物、仓库 package.json
// 一律只读（用哨兵时在临时目录里造一份「模拟安装布局」，把真产物原样拷进去）。
//
// 与既有门的关系：本文件锁 #130 新增行为；既有行为回归由 test/smoke.test.mjs（票面验收④）
// 与 test/client-bundle-48.test.mjs（client 束纯度，21/21）各自守。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readInstalledVersions, readViaCli, VERSION_READ_KEY } from '../dist/bridge.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = resolve(HERE, '..'); // packages/plugin-calorie
const REPO = resolve(PKG_DIR, '..', '..');
const DIST = join(PKG_DIR, 'dist');
const requirePkg = createRequire(import.meta.url);

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const PLUGIN_PKG = readJson(join(PKG_DIR, 'package.json'));
const SKILL_PKG_PATH = join(REPO, 'packages', 'skill-calorie', 'package.json');
/** 已装 skill 包版本：与 host 侧同一条解析路（包名解析安装态），非源码常量。 */
const SKILL_VERSION = requirePkg('skill-calorie/package.json').version;
const PLUGIN_NAME = 'dsh-calorie';
const SKILL_NAME = 'skill-calorie';
const line = (p, s) => `${p} · 技能 ${s}`;

/** 列出目录下指定后缀的全部文件（递归；用于「无版本字面量回潮」与「源码未被触碰」两处扫描）。 */
function listFiles(dir, exts) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, exts));
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/** 目录内容指纹（路径＋字节），用于证明测试没有碰过源码。 */
function treeHash(dir, exts) {
  const h = createHash('sha256');
  for (const f of listFiles(dir, exts).sort()) {
    h.update(relative(dir, f));
    h.update(readFileSync(f));
  }
  return h.digest('hex');
}

const fileHash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

/** 按 DSH classic script 语义加载真产物 dist/client.js，取 factory 物化后的 exports。
 * 在**宿主 realm** 里求值（不是 vm 新 realm）：client 取数期要用宿主全局（AbortSignal／setTimeout），
 * 且宿主 realm 的对象原型才与断言库一致；产物「无 ESM」由 test/client-bundle-48.test.mjs 的纯度门守，
 * 本文件只测行为。react 给最小替身（只用到 createElement），其余未声明外部一律抛（client 束只许要 react*）。 */
function loadClientBundle() {
  const path = join(DIST, 'client.js');
  assert.ok(existsSync(path), '缺 dist/client.js：先重建产物（见 docs/plugins/plugin-calorie/t130-动态版本.md 的 GATE-2 命令）');
  const code = readFileSync(path, 'utf8');
  const registrations = [];
  const windowStub = { __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } };
  // classic script：顶格 import/export 在函数体里是 SyntaxError（与 loader 语义同向）
  new Function('window', code)(windowStub);
  assert.equal(registrations.length, 1, 'client 束须恰好注册一次');
  const reactStub = { createElement: (type, props, ...children) => ({ type, props, children }) };
  const exportsObj = registrations[0].factory((spec) => {
    const s = String(spec);
    if (s === 'react' || s.startsWith('react')) return reactStub;
    throw new Error('client 束物化期请求了未声明外部：' + s);
  });
  return { code, exports: exportsObj };
}

const CLIENT = loadClientBundle();

/** 复刻 host 侧 RPC 分发（src/index.ts handleCalorieRpc → bridge.readViaCli → contract.ok 信封）：
 * 让 client 的 fetchVersions 真的打到 host 读值实现上，而不是只喂假值。 */
function makeRpcCall(host) {
  const seen = [];
  const call = async (path, channel, message) => {
    seen.push({ path, channel, message });
    const payload = message?.payload ?? {};
    return { ok: true, value: host.readViaCli(payload.key, payload.params ?? {}) };
  };
  return { call, seen };
}

/** 面板那行文本（client 真通路：fetchVersions → 骨架），并顺带锁住通路形状。 */
async function panelVersionLine(host) {
  const { call, seen } = makeRpcCall(host);
  const versions = await CLIENT.exports.fetchVersions(call);
  assert.equal(seen.length, 1, '版本读取须是单次调用（不轮询）');
  assert.equal(seen[0].message.payload.key, VERSION_READ_KEY, '版本键须为 bridge.VERSION_READ_KEY');
  assert.notEqual(seen[0].message.payload.key, 'calorie.view.home', '版本键不得复用数据读键');
  return { text: CLIENT.exports.formatVersionLine(versions.plugin, versions.skill), versions };
}

/** 造一份「模拟安装布局」：`node_modules/dsh-calorie/{package.json,dist/bridge.js}`
 *  ＋ `node_modules/<技能包名>/package.json` ＋ `node_modules/dsh-life-pack`（junction → 真总管包）。
 * 真产物原样拷贝（源码不动），只有两处 package.json 的 version 可被改写——正是「只 bump package.json」的重演。
 * #918 阶段三起，拷进去的那份 bridge 会 `import 'dsh-life-pack'`（读值共用件的入口），
 * 故模拟安装必须带上这条**声明过的依赖**（真装机的 node_modules 里本来就有它，见 package.json 的 dependencies），
 * 且总管那份是**真件**不是替身。`skillVersion === null` ＝ 技能包 manifest 不落盘（技能没装进来那一态）。 */
const MANAGER_DIR = join(REPO, 'packages', 'plugin-manager');

function makeFakeInstall(pluginVersion, skillVersion) {
  const root = mkdtempSync(join(tmpdir(), 't130-install-'));
  const pluginDir = join(root, 'node_modules', PLUGIN_NAME);
  mkdirSync(join(pluginDir, 'dist'), { recursive: true });
  copyFileSync(join(DIST, 'bridge.js'), join(pluginDir, 'dist', 'bridge.js'));
  writeJson(join(pluginDir, 'package.json'), { ...PLUGIN_PKG, version: pluginVersion });
  if (skillVersion !== null) {
    const skillDir = join(root, 'node_modules', SKILL_NAME);
    mkdirSync(skillDir, { recursive: true });
    writeJson(join(skillDir, 'package.json'), { ...readJson(SKILL_PKG_PATH), version: skillVersion });
  }
  try {
    symlinkSync(MANAGER_DIR, join(root, 'node_modules', 'dsh-life-pack'), 'junction');
  } catch (e) {
    rmSync(root, { recursive: true, force: true });
    throw new Error('模拟安装缺总管链接（dsh-life-pack 是插件声明过的依赖）：' + (e instanceof Error ? e.message : String(e)));
  }
  return {
    root,
    pluginPkgPath: join(pluginDir, 'package.json'),
    skillPkgPath: join(root, 'node_modules', SKILL_NAME, 'package.json'),
    bridge: join(pluginDir, 'dist', 'bridge.js'),
  };
}

/** 用完就清（force 吞掉 Windows 上的偶发占用；清理失败不许把判据染红）。 */
function dispose(install) {
  try { rmSync(install.root, { recursive: true, force: true }); } catch { /* 清理失败不影响判据 */ }
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2), 'utf8');
}

const hostOf = (bridgePath) => import(pathToFileURL(bridgePath).href);

describe('#130 面板版本行动态读取已安装版本', () => {
  describe('① 只改 package.json 版本（源码与产物不动）⇒ 面板版本行跟随', () => {
    it('装「新版本」插件包：只 bump package.json，版本行自动跟随（哨兵值法，连续两轮）', async () => {
      const srcHashBefore = treeHash(join(PKG_DIR, 'src'), ['.ts']);
      const bridgeHashBefore = fileHash(join(DIST, 'bridge.js'));
      const P1 = '9.9.901';
      const S1 = '8.8.802';
      const P2 = '9.9.902';
      const S2 = '8.8.803';
      const install = makeFakeInstall(P1, S1);
      try {
        const host = await hostOf(install.bridge);
        assert.equal((await panelVersionLine(host)).text, line(P1, S1), '装新版插件后版本行须说真话');
        // 第二轮：只改两处 package.json 的 version（不重建、不改任何源码行、不动产物）
        writeJson(install.pluginPkgPath, { ...readJson(install.pluginPkgPath), version: P2 });
        writeJson(install.skillPkgPath, { ...readJson(install.skillPkgPath), version: S2 });
        assert.equal((await panelVersionLine(host)).text, line(P2, S2), '再 bump package.json 版本行仍须跟随（无缓存、无源码参与）');
        // 源码与产物全程未被触碰：版本只能来自 package.json，不来自任何源码行
        assert.equal(treeHash(join(PKG_DIR, 'src'), ['.ts']), srcHashBefore, '本测试不得触碰源码');
        assert.equal(fileHash(join(DIST, 'bridge.js')), bridgeHashBefore, '本测试不得触碰产物');
      } finally {
        dispose(install);
      }
    });

    it('读值落点＝已安装位置那两份 manifest（插件自身＋已装 skill 包），不是源码常量', async () => {
      const install = makeFakeInstall('9.9.903', '8.8.804');
      try {
        const host = await hostOf(install.bridge);
        // #918 阶段三：落点不再靠 path 函数返回的字符串证明（那个函数已删），改由**读数**证明——
        // 改写哪一份 manifest，哪一格就跟着变、另一格不动 ⇒ 两格各自落在已装的那份文件上。
        assert.deepEqual(host.readInstalledVersions(), { plugin: '9.9.903', skill: '8.8.804' });
        writeJson(install.skillPkgPath, { ...readJson(install.skillPkgPath), version: '8.8.805' });
        assert.deepEqual(host.readInstalledVersions(), { plugin: '9.9.903', skill: '8.8.805' },
          'skill 那一格读的是已装技能包那份 manifest');
        writeJson(install.pluginPkgPath, { ...readJson(install.pluginPkgPath), version: '9.9.904' });
        assert.deepEqual(host.readInstalledVersions(), { plugin: '9.9.904', skill: '8.8.805' },
          '插件那一格读的是插件包自己那份 manifest');
        assert.notEqual(host.readInstalledVersions().plugin, PLUGIN_PKG.version,
          '哨兵值法：读到的不是仓库那份 manifest 的版本（更不是任何源码常量）');
      } finally {
        dispose(install);
      }
    });
  });

  describe('② 无手写版本常量回潮', () => {
    it('源码与产物中不存在与 package.json 版本全等的字面量常量（防第二真相源复活）', () => {
      const versions = [PLUGIN_PKG.version, SKILL_VERSION];
      const files = [...listFiles(join(PKG_DIR, 'src'), ['.ts']), ...listFiles(DIST, ['.js', '.d.ts', '.map'])];
      assert.ok(files.length >= 5, '扫描面异常，实际 ' + files.length + ' 个文件');
      for (const file of files) {
        const text = readFileSync(file, 'utf8');
        for (const v of versions) {
          const quoted = new RegExp('[\'"`]' + v.replace(/\./g, '\\.') + '[\'"`]');
          assert.equal(quoted.test(text), false,
            relative(REPO, file) + ' 含与 package.json 版本全等的字面量 ' + v + '（#130 禁回潮）');
        }
      }
    });

    it('slot.ts 不再持有版本值、也不再 import bridge（client 束纯度的前提）', async () => {
      const src = readFileSync(join(PKG_DIR, 'src', 'slot.ts'), 'utf8');
      assert.doesNotMatch(src, /export\s+const\s+(PLUGIN_VERSION|SKILL_VERSION)\b/, 'slot.ts 不得再手写版本常量');
      assert.doesNotMatch(src, /from\s+['"][^'"]*bridge\.js['"]/, 'slot.ts 不得 import bridge（node 依赖会进 client 束）');
      const slotMod = await import(pathToFileURL(join(DIST, 'slot.js')).href);
      assert.equal('PLUGIN_VERSION' in slotMod, false, 'dist/slot.js 不得再导出 PLUGIN_VERSION');
      assert.equal('SKILL_VERSION' in slotMod, false, 'dist/slot.js 不得再导出 SKILL_VERSION');
    });
  });

  describe('③ 读失败降级：unknown 骨架、余部正常、无异常、host 有 warn', () => {
    it('host 侧：manifest 缺席／JSON 损坏／version 字段缺失 ⇒ 该侧 unknown、另一侧照常，并写 warn（含包名与原因）', async () => {
      // #918 阶段三：失败态注入改走「模拟安装里那份 manifest 坏掉／缺席」——
      // 读值走总管共用件（按包名解析已装包），不再有 pluginPath／skillPath／logger 三个注入口。
      const warns = [];
      const original = console.warn;
      console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
      try {
        // ① 技能包 manifest 缺席（技能没装进来）⇒ 只坏一侧
        const miss = makeFakeInstall('9.9.905', null);
        try {
          const host = await hostOf(miss.bridge);
          assert.deepEqual(host.readInstalledVersions(), { plugin: '9.9.905', skill: 'unknown' },
            '读不到侧须 unknown，另一侧照常');
          assert.equal(warns.length, 1, '坏一侧留一条 warn');
          assert.ok(warns[0].includes('version read failed') && warns[0].includes(SKILL_NAME),
            'warn 须点是哪个包读了没读到，实际：' + warns.join(' | '));
        } finally {
          dispose(miss);
        }

        // ② manifest 不是 JSON ⇒ 只坏一侧
        const broken = makeFakeInstall('9.9.906', '8.8.806');
        try {
          writeFileSync(broken.skillPkgPath, '{ 这不是 JSON', 'utf8');
          warns.length = 0;
          const host = await hostOf(broken.bridge);
          assert.deepEqual(host.readInstalledVersions(), { plugin: '9.9.906', skill: 'unknown' },
            'JSON 坏了那一侧 unknown，另一侧照常');
          assert.ok(warns.some((w) => w.includes('version read failed') && w.includes(SKILL_NAME)),
            'warn 须含失败侧包名，实际：' + warns.join(' | '));
        } finally {
          dispose(broken);
        }

        // ③ version 字段缺失 ⇒ 该侧 unknown，warn 带上原因原文
        const noField = makeFakeInstall('9.9.907', '8.8.807');
        try {
          writeJson(noField.skillPkgPath, { name: SKILL_NAME });
          warns.length = 0;
          const host = await hostOf(noField.bridge);
          assert.deepEqual(host.readInstalledVersions(), { plugin: '9.9.907', skill: 'unknown' }, 'version 字段缺失 ⇒ unknown');
          assert.ok(warns.some((w) => w.includes('version read failed') && w.includes('version field missing')),
            'warn 须含失败原因（version 字段缺失），实际：' + warns.join(' | '));
        } finally {
          dispose(noField);
        }

        // ④ 两侧皆坏 ⇒ 双 unknown，骨架不破，两条 warn
        const both = makeFakeInstall('9.9.908', null);
        try {
          rmSync(both.pluginPkgPath);
          warns.length = 0;
          const host = await hostOf(both.bridge);
          assert.deepEqual(host.readInstalledVersions(), { plugin: 'unknown', skill: 'unknown' },
            '两侧皆读不到 ⇒ 双 unknown，骨架不破');
          assert.equal(warns.length, 2, '两侧读失败各留一条 warn');
        } finally {
          dispose(both);
        }
      } finally {
        console.warn = original;
      }
    });

    it('host 侧：默认日志通道也留 warn（console.warn，含包名与原因）', async () => {
      const seen = [];
      const original = console.warn;
      const install = makeFakeInstall('9.9.909', null); // 技能包 manifest 缺席
      console.warn = (...a) => { seen.push(a.map(String).join(' ')); };
      try {
        const host = await hostOf(install.bridge);
        assert.deepEqual(host.readInstalledVersions(), { plugin: '9.9.909', skill: 'unknown' });
      } finally {
        console.warn = original;
        dispose(install);
      }
      assert.equal(seen.length, 1, '读失败须留一条 warn（on-call 的可观测信号）');
      assert.ok(seen.every((w) => w.includes('version read failed') && w.includes('reason=')),
        'warn 须含原因，实际：' + seen.join(' | '));
      assert.ok(seen.every((w) => w.includes(SKILL_NAME)), 'warn 须缺哪个包就报哪个包');
    });

    it('host 侧：manifest 各种坏法都不抛（永不抛，任何失败组合都不炸 host）', async () => {
      // 坏法都落在**读值**这一层。插件自己那份 manifest 若是坏 JSON，Node 的 ESM 加载器会先抛
      // ERR_INVALID_PACKAGE_CONFIG（连 bridge.js 都进不来）——那是加载器级、不是本桥能兜的失败，
      // 故这里的「插件侧」坏法都用**仍是合法 JSON 对象**的 manifest（缺字段／字段类型不对）。
      const cases = [
        ['插件 manifest 缺席', (i) => rmSync(i.pluginPkgPath)],
        ['技能 manifest 缺席', (i) => rmSync(i.skillPkgPath)],
        ['两份都缺席', (i) => { rmSync(i.pluginPkgPath); rmSync(i.skillPkgPath); }],
        ['插件 manifest 无 version 字段', (i) => writeJson(i.pluginPkgPath, { ...PLUGIN_PKG, version: undefined })],
        ['插件 version 是数字', (i) => writeJson(i.pluginPkgPath, { ...PLUGIN_PKG, version: 42 })],
        ['技能 manifest 不是 JSON', (i) => writeFileSync(i.skillPkgPath, 'nope', 'utf8')],
        ['技能 manifest 是 JSON 但不是对象', (i) => writeFileSync(i.skillPkgPath, '[]', 'utf8')],
        ['技能 version 是空白串', (i) => writeJson(i.skillPkgPath, { ...readJson(SKILL_PKG_PATH), version: '   ' })],
      ];
      const original = console.warn;
      console.warn = () => {};
      try {
        for (const [name, breakIt] of cases) {
          const install = makeFakeInstall('9.9.910', '8.8.810');
          try {
            breakIt(install);
            const host = await hostOf(install.bridge);
            let got;
            assert.doesNotThrow(() => { got = host.readInstalledVersions(); }, name + ' 不得抛');
            for (const side of ['plugin', 'skill']) {
              assert.equal(typeof got[side], 'string', name + '：' + side + ' 那一格须仍是字符串（骨架不破）');
              assert.ok(got[side].length > 0, name + '：' + side + ' 那一格不得为空');
            }
          } finally {
            dispose(install);
          }
        }
      } finally {
        console.warn = original;
      }
    });

    it('host 侧：版本键走 package.json 读取路（不经技能 CLI spawn），双坏也返回未知骨架而不抛', async () => {
      const direct = readViaCli(VERSION_READ_KEY, {});
      assert.deepEqual(direct, { plugin: PLUGIN_PKG.version, skill: SKILL_VERSION }, '版本键回执须是 {plugin, skill}（不是 CLI envelope 的 key/data 形状）');
      // 双 package.json 都被拿掉（读失败两侧皆中）⇒ 返回 unknown 骨架、不抛
      const install = makeFakeInstall(PLUGIN_PKG.version, SKILL_VERSION);
      try {
        const host = await hostOf(install.bridge);
        rmSync(install.pluginPkgPath);
        rmSync(install.skillPkgPath);
        let both;
        assert.doesNotThrow(() => { both = host.readViaCli(VERSION_READ_KEY, {}); });
        assert.deepEqual(both, { plugin: 'unknown', skill: 'unknown' });
      } finally {
        dispose(install);
      }
    });

    it('client 侧：通道缺席／抛错／错误信封／空值 ⇒ 双 unknown，永不抛', async () => {
      for (const bad of [undefined, null, 'not-a-function', 42]) {
        assert.deepEqual(await CLIENT.exports.fetchVersions(bad), { plugin: 'unknown', skill: 'unknown' },
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
        assert.deepEqual(await CLIENT.exports.fetchVersions(call), { plugin: 'unknown', skill: 'unknown' }, name + ' ⇒ 双 unknown');
      }
      // 部分降级：只坏一侧 ⇒ 该侧 unknown，另一侧照常
      assert.deepEqual(await CLIENT.exports.fetchVersions(async () => ({ ok: true, value: { plugin: '9.9.901' } })),
        { plugin: '9.9.901', skill: 'unknown' });
      // 归一：空白串视同缺失
      assert.deepEqual(await CLIENT.exports.fetchVersions(async () => ({ ok: true, value: { plugin: '  9.9.901  ', skill: '   ' } })),
        { plugin: '9.9.901', skill: 'unknown' });
    });

    it('client 侧：unknown 时骨架完整、面板其余装配照常、渲染不抛', () => {
      assert.equal(CLIENT.exports.formatVersionLine('unknown', 'unknown'), line('unknown', 'unknown'));
      assert.equal(CLIENT.exports.formatVersionLine('unknown', SKILL_VERSION), line('unknown', SKILL_VERSION));
      // VersionLine 就是面板那行：props 缺席（初值态）也不炸，骨架不断
      assert.deepEqual(CLIENT.exports.VersionLine({}).children, [line('unknown', 'unknown')]);
      assert.deepEqual(CLIENT.exports.VersionLine({ pluginVersion: '9.9.901', skillVersion: undefined }).children,
        [line('9.9.901', 'unknown')]);
      assert.equal(typeof CLIENT.exports.apply, 'function', '面板装配不受版本通路影响');
      assert.ok(CLIENT.exports.inject.includes('connection'));
    });
  });

  describe('④ 既有行为不受影响（既有 smoke／纯度门另跑，此处锁装配面）', () => {
    it('槽位／设置归属／导出面照旧；旧版本常量导出彻底出局', async () => {
      const idx = await import(pathToFileURL(join(DIST, 'index.js')).href);
      assert.equal(idx.SLOT_ID, 'ilife:calorie');
      assert.equal(idx.SLOT_ORDER, 75);
      assert.equal(idx.slotDescriptor().slotId, 'ilife:calorie');
      assert.equal(idx.SETTINGS_OWNER, 'dsh-calorie');
      assert.equal('PLUGIN_VERSION' in idx, false, '旧版本常量不得从宿主入口再导出');
      assert.equal('SKILL_VERSION' in idx, false);
      assert.deepEqual(CLIENT.exports.inject, ['slots', 'connection'], 'client inject 短名照旧（真机 loader 守卫）');
    });

    it('client 束纯度前提：产物无 node: 导入、无 ESM 语法（版本通路未把 host 依赖带进浏览器）', () => {
      assert.ok(CLIENT.code.includes('__ModuleLoader__'), '产物缺 loader 注册头');
      assert.doesNotMatch(CLIENT.code, /from\s+['"]node:[^'"]+['"]/, '产物含 node: 导入');
      assert.doesNotMatch(CLIENT.code, /require\(\s*['"]node:[^'"]+\s*\)/, '产物含 node: require');
      assert.doesNotMatch(CLIENT.code, /(^|\n)\s*import\s[^'"]*from\s['"]/m, '产物含 ESM import');
      assert.doesNotMatch(CLIENT.code, /(^|\n)\s*export\s+(default|const|function|class|\{|\*)/m, '产物含 ESM export');
    });
  });

  describe('⑤ 正常路径：版本行格式恰为 `X · 技能 Y`（两个号，包名不重复）', () => {
    it('装好的仓库布局下，版本行＝两处 package.json 的版本，格式全等', async () => {
      const host = await hostOf(join(DIST, 'bridge.js'));
      assert.deepEqual(host.readInstalledVersions(), { plugin: PLUGIN_PKG.version, skill: SKILL_VERSION },
        'host 读到的须就是磁盘上两份 package.json 的 version');
      const { text, versions } = await panelVersionLine(host);
      assert.equal(text, line(PLUGIN_PKG.version, SKILL_VERSION));
      assert.deepEqual(versions, { plugin: PLUGIN_PKG.version, skill: SKILL_VERSION });
      assert.match(text, /^\d+\.\d+\.\d+ · 技能 \d+\.\d+\.\d+$/);
    });
  });
});
