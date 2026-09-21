// #696 居家设置页：配置面验收（照 #676 卡路里／#677 记账／#696 大厨那套同形）。
//
// 七组判据：
//   A 测试隔离在位（#675 替代护栏）
//   B 页面的行表与技能侧配置表**逐键对齐**（lockstep：插件的行 = 技能的键，一处不少、一处不多）
//   C 三个配置 key 与技能侧 CONFIG_KEYS 同值（插件只镜像，不另造）
//   D 分级呈现：常用项在页面上、其余进默认收起的高级组
//   E 端到端经真 CLI：读／写／重置三态都能跑通，落盘可查
//   F 设置页只配置、不干活
//   G 端点常量与通道名
//   H 目录行与系统文件夹选择器入口（#736）
//
// 边界口径：插件侧不许 import `base-*`／`skill-*`（`test/plugin-p10-boundaries.test.mjs`），
// 所以配置读写走技能 CLI 的三个 key。本测试直接 import 技能 dist 做对齐，
// 那是**测试件**的范围（边界门扫的是 `packages/plugin-*/src/*.ts`），src 里一行没 import 技能实现。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { configDirOf, requireConfigTestBase, setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';
import { loadClientBundle, nodesOfType, textOf } from '../../../test/helpers/client-bundle.mjs';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT, CONFIG_STEM, SETTINGS_OWNER, readPath, writePath } from '../dist/index.js';
import { CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY, readConfigSurface, writeConfigValues, resetConfigToDefaults, resolveNodeBin } from '../dist/bridge.js';
import { RPC_CHANNEL, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, parseSavePayload, isRpcResult } from '../dist/contract.js';
// 权威侧：技能自己的配置表与三个 key（唯一定义地）。
import { HOME_CONFIG_DEFAULTS, HOME_CONFIG_STEM } from '../../skill-home/dist/config.js';
import { CONFIG_KEYS } from '../../skill-home/dist/cli/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** 公共层那道隔离门的 dist 入口：探针只 import 它，**不调任何技能命令**（零写盘）。 */
const CONFIG_DIRS = pathToFileURL(join(HERE, '..', '..', 'base-link-core', 'dist', 'config', 'dirs.js')).href;

/**
 * 缺隔离探针：起一个子进程只调 `resolveConfigDir()`，回 `OK:<配置目录>` 或 `THREW:<错误码>`。
 *
 * 构造的是「测试进程忘了隔离」那一态：家目录两格都不给（回落到**真实**家目录）＋ `NODE_TEST_CONTEXT`
 * （跑在测试运行器里），公共层据此当场抛。`extraEnv` 覆盖在最后，反向对照拿它把临时家目录给回来。
 *
 * ⚠️ 为什么连**母进程**那两格也要先摘掉：win32 实测（Node 24.19），当刻进程里设过的 `USERPROFILE`
 * 会跟进子进程，哪怕 `spawnSync` 的 `env` 里根本没有它 —— 只在子进程那格删，读到的仍是临时家目录，
 * 这条路就成了假绿。摘掉的两格在 `finally` 里原样还回去（原本是 `undefined` 就 delete）。
 * 探针**零写盘**：`resolveConfigDir()` 只算路径，`mkdir` 在它之后（见 dirs.ts）。
 */
function probeGuard(extraEnv = {}) {
  const code = 'const m = await import(' + JSON.stringify(CONFIG_DIRS) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const saved = { USERPROFILE: process.env.USERPROFILE, HOME: process.env.HOME };
  delete process.env.USERPROFILE;
  delete process.env.HOME;
  try {
    const env = { ...process.env };
    delete env.USERPROFILE;
    delete env.HOME;
    Object.assign(env, extraEnv);
    env.NODE_TEST_CONTEXT = 'child-v8'; // 跑在测试运行器里
    return String(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout).trim();
  } finally {
    if (saved.USERPROFILE === undefined) delete process.env.USERPROFILE; else process.env.USERPROFILE = saved.USERPROFILE;
    if (saved.HOME === undefined) delete process.env.HOME; else process.env.HOME = saved.HOME;
  }
}

/** client 真产物（#736 组件级读数用；缺产物在这里响亮失败，不静默跳过）。 */
const CLIENT = loadClientBundle(join(HERE, '..'));
const { Row, resolveDirectoryPicker, pickDirectory, readPickAnswer, toDraft, createBrowseHandler } = CLIENT.exports;

/** 把一层嵌套的默认值表摊平成 `a.b` 键集。 */
function flattenKeys(record, prefix = '') {
  const out = [];
  for (const [key, value] of Object.entries(record)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) out.push(...flattenKeys(value, path));
    else out.push(path);
  }
  return out.sort();
}

/** 按 `a.b` 从默认值表取叶子值（判定控件种类用）。 */
function leafOf(record, path) {
  return path.split('.').reduce((cur, part) => (cur == null ? undefined : cur[part]), record);
}

describe('#696 居家设置页 · 配置面', () => {
  let base;
  before(() => {
    base = setupConfigTestBase();
  });
  after(() => {
    base.cleanup();
  });

  describe('A 测试隔离', () => {
    it('基座把当刻进程的家目录接管到临时目录；缺隔离时公共层响亮失败', () => {
      assert.equal(requireConfigTestBase(), base.dir, '基座须已把当刻进程的家目录接管到临时目录');
      // 探针：跑在测试运行器里却回落到**真实**家目录 ⇒ 公共层当场抛（零写盘，故守卫哪天坏了也不会真写）。
      assert.equal(probeGuard(), 'THREW:CONFIG_TEST_ISOLATION_MISSING', '缺隔离须响亮失败，不许静默落真实 ~/.ilife');
      // 反向对照：同一个探针给了隔离（家目录指到临时目录）就照常跑通——证明门只关「没隔离」这件事。
      const fakeHome = join(base.dir, 'probe-home');
      assert.equal(probeGuard({ USERPROFILE: fakeHome, HOME: fakeHome }), 'OK:' + configDirOf(fakeHome));
      assert.equal(existsSync(configDirOf(fakeHome)), false, '探针零写：不许落下配置目录');
    });
  });

  describe('B 行表与技能侧配置表逐键对齐', () => {
    it('配置文件主体名同值', () => {
      assert.equal(CONFIG_STEM, HOME_CONFIG_STEM);
      assert.equal(CONFIG_STEM, 'home');
    });

    it('页面每一行都有对应的技能键，且技能每一个键都有对应行（一处不少、一处不多）', () => {
      const pageKeys = CONFIG_ITEMS.map((i) => i.key).sort();
      assert.deepEqual(pageKeys, flattenKeys(HOME_CONFIG_DEFAULTS));
    });

    it('每行的控件种类与技能默认值类型一致', () => {
      for (const item of CONFIG_ITEMS) {
        const v = leafOf(HOME_CONFIG_DEFAULTS, item.key);
        assert.notEqual(v, undefined, `技能配置表里缺 ${item.key}`);
        const want = item.control === 'number' ? 'number' : item.control === 'switch' ? 'boolean' : 'string';
        assert.equal(typeof v, want, `${item.key} 的默认值类型应是 ${want}`);
      }
    });

    it('默认值逐项等于现有代码常量（#794 起 files 两键出表，文件名回技能侧常量）', () => {
      assert.equal(HOME_CONFIG_DEFAULTS.db.name, 'home.db');
      assert.equal(HOME_CONFIG_DEFAULTS.html.dir, 'home_manager_html');
      assert.equal(HOME_CONFIG_DEFAULTS.key.file, '.master.key');
      assert.equal(HOME_CONFIG_DEFAULTS.backup.dir, 'backups');
      assert.equal(HOME_CONFIG_DEFAULTS.db.dir, '', '空串＝按默认落点');
    });

    it('行表键不重复', () => {
      const keys = CONFIG_ITEMS.map((i) => i.key);
      assert.equal(new Set(keys).size, keys.length);
    });
  });

  describe('C 三个配置 key 与端口常量', () => {
    it('read／write／reset 三个 key 逐字等于技能侧 CONFIG_KEYS', () => {
      assert.equal(CONFIG_READ_KEY, CONFIG_KEYS.read);
      assert.equal(CONFIG_WRITE_KEY, CONFIG_KEYS.write);
      assert.equal(CONFIG_RESET_KEY, CONFIG_KEYS.reset);
    });

    it('key 命名空间是 home.config.*（不与唤醒词命令混）', () => {
      for (const k of [CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY]) assert.match(k, /^home\.config\./);
    });

    it('通道名是单段且不等于 /api（宿主约束）', () => {
      assert.equal(RPC_CHANNEL, '/ilife-home-ilife');
      assert.equal(RPC_CHANNEL.slice(1).includes('/'), false);
    });

    it('载荷校验：坏形状返 null，好形状照收', () => {
      assert.equal(parseSavePayload(null), null);
      assert.equal(parseSavePayload({ values: [] }), null);
      assert.deepEqual(parseSavePayload({ values: { db: { name: 'x' } } }), { values: { db: { name: 'x' } } });
      assert.equal(isRpcResult({ ok: true, value: 1 }), true);
      assert.equal(isRpcResult({ nope: 1 }), false);
    });
  });

  describe('D 分级呈现', () => {
    it('常用项恰是行表的前若干行，其余全在高级组', () => {
      assert.ok(COMMON_ITEM_COUNT > 0 && COMMON_ITEM_COUNT < CONFIG_ITEMS.length);
      for (const i of CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT)) assert.equal(i.tier, 'common', `${i.key} 应在常用组`);
      for (const i of CONFIG_ITEMS.slice(COMMON_ITEM_COUNT)) assert.equal(i.tier, 'advanced', `${i.key} 应在高级组`);
    });

    it('最常看的三项（数据目录／库名／产物目录）在页面上直接画出来', () => {
      const common = CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT).map((i) => i.key);
      for (const k of ['db.dir', 'db.name', 'html.dir']) assert.ok(common.includes(k), `${k} 应在常用组`);
    });

    it('清单一共 5 行，其中常用 3 行（#794 起可改 1 ＋ 只读 4）', () => {
      assert.equal(CONFIG_ITEMS.length, 5);
      assert.equal(COMMON_ITEM_COUNT, 3);
      assert.equal(CONFIG_ITEMS.length - COMMON_ITEM_COUNT, 2, '高级组 2 行');
    });
  });

  describe('E 端到端经真 CLI', () => {
    it('读：拿得到配置文件路径、数据目录与当前值', () => {
      const s = readConfigSurface();
      assert.equal(s.path, join(configDirOf(base.dir), CONFIG_STEM + '.yaml'), '配置文件落在 <家>/.ilife/<技能>.yaml');
      assert.ok(existsSync(s.path), '首次读应把配置文件落下来');
      assert.equal(s.dataDir, join(configDirOf(base.dir), 'data'));
      assert.equal(s.created, true);
      for (const item of CONFIG_ITEMS) assert.notEqual(readPath(s.values, item.key), undefined, `回执里缺 ${item.key}`);
    });

    it('写：改一项后重新读，改过的还在、没改的没动', () => {
      const next = {};
      writePath(next, 'db.name', 'probe_696.db');
      writeConfigValues(next);
      const s = readConfigSurface();
      assert.equal(s.created, false);
      assert.equal(readPath(s.values, 'db.name'), 'probe_696.db');
      assert.equal(readPath(s.values, 'html.dir'), HOME_CONFIG_DEFAULTS.html.dir, '没改的项应保持默认');
      assert.equal(readPath(s.values, 'key.file'), HOME_CONFIG_DEFAULTS.key.file);
      assert.equal(readPath(s.values, 'backup.dir'), HOME_CONFIG_DEFAULTS.backup.dir);
    });

    it('写：只给一项时，同组其它子项保留现值（技能侧做组内合并）', () => {
      const next = {};
      writePath(next, 'db.name', 'probe_again_696.db');
      writeConfigValues(next);
      const s = readConfigSurface();
      assert.equal(readPath(s.values, 'db.name'), 'probe_again_696.db');
      // 没给的那一格保留现值：这里钉的是**产品事实**（生效数据目录不许被这次写改掉），不钉字符串口径——
      // 「空串＝按默认落点」还是「写盘落成绝对路径」归技能侧那条口径（见各技能 `writableDefaults()`）。
      const dirValue = readPath(s.values, 'db.dir');
      assert.equal(dirValue === '' ? s.dataDir : dirValue, join(configDirOf(base.dir), 'data'), '这次写改掉了生效数据目录');
    });

    it('重置：先落 .bak 再回默认', () => {
      const r = resetConfigToDefaults();
      assert.ok(r.backupPath !== null && existsSync(r.backupPath), '重置前应留下一份 .bak');
      const s = readConfigSurface();
      assert.equal(readPath(s.values, 'db.name'), HOME_CONFIG_DEFAULTS.db.name);
    });

    it('坏配置给人话、不返空：不认识的键被拦下且报文里点了名', () => {
      const bad = {};
      writePath(bad, 'db.name', 'x.db');
      bad['nosuchGroup'] = { k: 'v' };
      assert.throws(() => writeConfigValues(bad), (e) => {
        const msg = String(e && e.message ? e.message : e);
        assert.match(msg, /nosuchGroup|不认识|未知/);
        return true;
      });
    });

    it('spawn 环境：非 node 的 execPath（桌面宿主的 Electron）走 ELECTRON_RUN_AS_NODE', () => {
      assert.deepEqual(resolveNodeBin('C:\\Program Files\\nodejs\\node.exe').extraEnv, {});
      assert.deepEqual(resolveNodeBin('C:\\app\\DSH.exe').extraEnv, { ELECTRON_RUN_AS_NODE: '1' });
    });
  });

  describe('F 设置页只配置、不干活', () => {
    const clientSrc = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');

    function configComponentSource() {
      const start = clientSrc.indexOf('function HomeConfig(');
      assert.ok(start > 0, 'client.ts 里应有 HomeConfig');
      const end = clientSrc.indexOf('export function apply(');
      assert.ok(end > start);
      return clientSrc.slice(start, end);
    }

    it('设置页组件里没有干活入口（没有查物品／盘物品之类的取数调用）', () => {
      const body = configComponentSource();
      assert.ok(!body.includes('fetchRead'), '设置页不该调取数');
      assert.ok(!body.includes('DEFAULT_READ_KEY'), '设置页不该带默认读键');
      assert.ok(!body.includes('home.item.'), '设置页不该直接点名干活命令的 key');
      assert.ok(!body.includes('home.inventory.'), '设置页不该直接点名干活命令的 key');
    });

    it('设置页只走三个配置端点', () => {
      const body = configComponentSource();
      assert.ok(body.includes('fetchConfigSurface'));
      assert.ok(body.includes('saveConfigSurface'));
      assert.ok(body.includes('resetConfigSurface'));
    });

    it('设置页仍注册进爱生活页签槽（改版没有把注册删掉）', () => {
      assert.ok(clientSrc.includes("ctx.slots.inject('ilife.config-tab'"));
      assert.ok(clientSrc.includes("name: 'ilife.config-tab'"));
      assert.ok(clientSrc.includes('id: PLUGIN'));
    });

    it('设置页仍报 SETTINGS_OWNER（设置页住单品包）', () => {
      assert.equal(SETTINGS_OWNER, 'dsh-home-ilife');
    });

    it('插件 src 一行没 import 技能实现或 base 包（只经 CLI 取用）', () => {
      const srcDir = join(HERE, '..', 'src');
      const files = ['bridge.ts', 'client.ts', 'contract.ts', 'dsh-ctx.ts', 'index.ts', 'settings.ts', 'slot.ts', 'skill-provider.ts'];
      for (const f of files) {
        const t = readFileSync(join(srcDir, f), 'utf8');
        assert.ok(!/from\s+['"]base-/.test(t), `${f} 不该 import base-*`);
        assert.ok(!/from\s+['"]skill-/.test(t), `${f} 不该 import skill-*（测试件除外）`);
        assert.ok(!/require\(\s*['"](?:base-|skill-)/.test(t), `${f} 不该 require base-*/skill-*`);
      }
    });
  });

  describe('G 端点常量', () => {
    it('三个配置端点名互不相同、都以 config. 起头', () => {
      const set = new Set([RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET]);
      assert.equal(set.size, 3);
      for (const e of set) assert.match(e, /^config\./);
    });
  });
  describe('H 目录行与系统文件夹选择器入口（#736；#743 按平台回执信封订正）', () => {
    it('目录档只发给目录类行：数据目录与备份目录', () => {
      const dirs = CONFIG_ITEMS.filter((i) => i.control === 'directory').map((i) => i.key).sort();
      assert.deepEqual(dirs, ['backup.dir', 'db.dir'], '目录行集合＝{db.dir, backup.dir}');
    });

    it('命名空间拿不到 ⇒ 没有入口（软依赖；守卫拒绝也当没有）', () => {
      for (const absent of [undefined, null, () => undefined, () => ({}), () => ({ pick: 'nope' })]) {
        assert.equal(resolveDirectoryPicker(absent), null, '拿不到就不给入口：' + String(absent));
      }
      assert.equal(resolveDirectoryPicker(() => { throw new Error('service "remote.directoryPicker" is not declared'); }), null,
        '守卫拒绝当没有，不许把设置页带下来');
      const picker = resolveDirectoryPicker((name) => (name === 'remote.directoryPicker' ? { pick: async () => ({ ok: true, value: null }) } : undefined));
      assert.ok(picker !== null && typeof picker.pick === 'function', '拿到命名空间就用它');
    });

    it('按钮按档渲染：目录行恰一枚、非目录行没有；onBrowse 缺席时不画按钮', () => {
      const dirItem = CONFIG_ITEMS.find((i) => i.key === 'db.dir');
      const textItem = CONFIG_ITEMS.find((i) => i.key === 'db.name');
      const withBrowse = Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'browse', onOpen: () => {} } });
      const buttons = nodesOfType(withBrowse, 'button');
      assert.equal(buttons.length, 1, '目录行恰一枚按钮');
      assert.equal(buttons[0].props.type, 'button');
      assert.match(textOf(buttons[0]), /浏览/);
      assert.equal(nodesOfType(Row({ item: dirItem, value: '', disabled: false, onChange: () => {} }), 'button').length, 0,
        '入口缺席 ⇒ 不画按钮（供不了就收起入口，文本框照旧）');
      assert.equal(nodesOfType(Row({ item: textItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'browse', onOpen: () => {} } }), 'button').length, 0,
        '非目录行不画按钮');
      assert.equal(nodesOfType(Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'browse', onOpen: () => {} } }), 'input').length, 1,
        '目录行仍是文本框 ＋ 按钮');
    });

    it('点按钮 → 唤一次 pick → 按**平台信封**回填该行；取消一字不动', async () => {
      const seen = [];
      const picker = { pick: async () => { seen.push('pick'); return { ok: true, value: 'D:\\爱生活数据' }; } };
      const node = Row({
        item: CONFIG_ITEMS.find((i) => i.key === 'db.dir'),
        value: '',
        disabled: false,
        onChange: (k, v) => seen.push([k, v]),
        browser: {
          mode: 'native',
          onOpen: (key) =>
            createBrowseHandler({
              picker,
              onChange: (k, v) => seen.push([k, v]),
              onUnavailable: (m) => seen.push(['!', m]),
            })(key),
        },
      });
      const clicked = nodesOfType(node, 'button')[0].props.onClick();
      assert.equal(typeof clicked?.then, 'function', '按钮的 onClick 要回那枚 Promise（用例据此可判）');
      await clicked;
      assert.deepEqual(seen, ['pick', ['db.dir', 'D:\\爱生活数据']], '信封里的 value 才是那条绝对路径，回填给这一行');

      const cancelled = [];
      const handler = createBrowseHandler({
        picker: { pick: async () => ({ ok: true, value: null }) },
        onChange: (k, v) => cancelled.push([k, v]),
        onUnavailable: (m) => cancelled.push(['!', m]),
      });
      await handler('db.dir');
      assert.deepEqual(cancelled, [], 'value:null ＝用户取消 ⇒ 这一行的值一字不动');
    });

    it('#743 回归：平台回 ok:false（**不抛**）也要出人话——被吞掉就成「点了没反应」', async () => {
      const seen = [];
      const handler = createBrowseHandler({
        picker: { pick: async () => ({ ok: false, error: { code: 'directory-picker/unavailable', message: 'the composition cannot serve pick' } }) },
        onChange: (k, v) => seen.push([k, v]),
        onUnavailable: (m) => seen.push(['!', m]),
      });
      await handler('db.dir');
      assert.equal(seen.length, 1, '被拒只出一条');
      assert.equal(seen[0][0], '!', '被拒不写值，只给人话');
      assert.match(seen[0][1], /系统文件夹对话框/);
      assert.match(seen[0][1], /绝对路径/);
      assert.match(seen[0][1], /cannot serve/, '平台给的原话要带上，别吞');
    });

    it('这条路供不了（传输层直接抛）⇒ 同样给人话、不写值', async () => {
      const seen = [];
      const handler = createBrowseHandler({
        picker: { pick: async () => { throw new Error('the composition cannot serve pick'); } },
        onChange: (k, v) => seen.push([k, v]),
        onUnavailable: (m) => seen.push(['!', m]),
      });
      await handler('db.dir');
      assert.equal(seen.length, 1, '被拒只出一条');
      assert.equal(seen[0][0], '!', '被拒不写值，只给人话');
      assert.match(seen[0][1], /系统文件夹对话框/);
      assert.match(seen[0][1], /绝对路径/);
    });

    it('pickDirectory 按平台信封归一三态且永不抛', async () => {
      assert.deepEqual(await pickDirectory({ pick: async () => ({ ok: true, value: 'D:\\x' }) }), { kind: 'picked', path: 'D:\\x' });
      assert.deepEqual(await pickDirectory({ pick: async () => ({ ok: true, value: null }) }), { kind: 'cancelled' });
      assert.deepEqual(await pickDirectory({ pick: async () => ({ ok: true, value: '   ' }) }), { kind: 'cancelled' }, '空白串视同取消，不算选中');
      assert.deepEqual(await pickDirectory({ pick: async () => ({ ok: false, error: { message: 'no native backend' } }) }),
        { kind: 'unavailable', message: '打不开系统文件夹对话框（no native backend）：请直接在框里填绝对路径。' });
      assert.equal((await pickDirectory({ pick: async () => { throw new Error('x'); } })).kind, 'unavailable');
      assert.deepEqual(await pickDirectory({ pick: async () => 'D:\\裸串' }), { kind: 'picked', path: 'D:\\裸串' }, '裸串照收（老形状兜底）');
      assert.equal(readPickAnswer(undefined).kind, 'unavailable', '认不出的形状当「供不了」报出来，不当取消吞掉');
    });

    it('#743：「db.dir」那行把解析好的绝对路径预填出来（用户不必自己拼）', () => {
      const dir = 'C:\\Users\\x\\.ilife\\data';
      assert.equal(toDraft({}, { dataDir: dir })['db.dir'], dir, '取值空着 ⇒ 直接显示回执里那条绝对路径');
      assert.equal(toDraft({ db: { dir: 'D:\\elsewhere' } }, { dataDir: dir })['db.dir'], 'D:\\elsewhere', '配了值 ⇒ 显示配置里的值');
      assert.equal(toDraft({}, {})['db.dir'], '', '没有落点回执 ⇒ 保持空，不编一个路径出来');
      assert.equal(toDraft({}, { dataDir: dir })['db.dir'], toDraft({ db: { dir: dir } }, { dataDir: dir })['db.dir'],
        '预填出来的表单态与显式配置同读数 ⇒ 打开面板不会凭空变「未保存」');
    });

    it('client 短名声明没被改动（不许写成硬依赖：写进去整包会被停靠）', () => {
      assert.deepEqual(CLIENT.exports.inject, ['slots', 'connection']);
    });
  });
});
