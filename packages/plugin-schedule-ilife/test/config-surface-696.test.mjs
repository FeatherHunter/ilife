// #696 作息设置页：配置面验收（照 #676 卡路里／#677 记账／#696 大厨那套同形）。
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
import { loadClientBundle } from '../../../test/helpers/client-bundle.mjs';
// #909 起设置页本体收进共用件：行渲染从它的公开门取，取值／填值与整面渲染从它的实现件取。
import { Row } from 'dsh-life-pack/config-panel';
import { readPickAnswer } from 'dsh-life-pack/directory-browser';
import { PanelBody } from '../../plugin-manager/dist/config-panel-view.js';
import { toDraft as sharedToDraft } from '../../plugin-manager/dist/config-panel-value.js';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT, CONFIG_STEM, SETTINGS_OWNER, readPath, writePath } from '../dist/index.js';
import { CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY, readConfigSurface, writeConfigValues, resetConfigToDefaults, resolveNodeBin } from '../dist/bridge.js';
import { RPC_CHANNEL, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, parseSavePayload, isRpcResult } from '../dist/contract.js';
// 权威侧：技能自己的配置表与三个 key（唯一定义地）。
import { SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_RETIRED, SCHEDULE_CONFIG_STEM } from '../../skill-schedule/dist/config.js';
import { CONFIG_KEYS } from '../../skill-schedule/dist/cli/config.js';

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

/** client 真产物（#909 起只用来跑 `apply` 抓接入面：行渲染与取值／填值都收进共用件了）。 */
const CLIENT = loadClientBundle(join(HERE, '..'));

/** 取值收进共用件（#909）：按本家行表绑一次，判据与改版前逐条相同。 */
const toDraft = (values, source = {}) => sharedToDraft(CONFIG_ITEMS, values, source);

/* ═══ 读那棵树的小工具 ═══
   行渲染与整面都从共用面板取（#909）：那是**真 React**，元素树里子节点住在 `props.children`，
   故不能用 `test/helpers/client-bundle.mjs` 那套替身遍历（它读的是 `node.children`）。 */
/** 展开一层函数组件（只展开**纯组件**：用到 hook 的组件跳过，绝不把面板带下来）。 */
function expandNode(tree) {
  if (tree === null || tree === undefined || typeof tree !== 'object' || Array.isArray(tree)) return tree;
  if (typeof tree.type !== 'function') return tree;
  try {
    return tree.type(tree.props);
  } catch {
    return tree;
  }
}

function descendants(tree, out = []) {
  const node = expandNode(tree);
  if (node === null || node === undefined || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) descendants(child, out);
    return out;
  }
  out.push(node);
  // 两种树都要认：共用面板经**真 React** 出树（子节点在 `props.children`），
  // 本家产物经替身 `createElement` 出树（子节点直接挂在节点上）。
  descendants(node.props?.children ?? node.children, out);
  return out;
}
const nodesOfType = (tree, type) => descendants(tree).filter((n) => n.type === type);
function textOf(tree) {
  let text = '';
  const walk = (node) => {
    const item = expandNode(node);
    if (item === null || item === undefined || typeof item === 'boolean') return;
    if (typeof item === 'string' || typeof item === 'number') { text += item; return; }
    if (Array.isArray(item)) {
      for (const child of item) walk(child);
      return;
    }
    walk(item.props?.children ?? item.children);
  };
  walk(tree);
  return text;
}
/** 一枚按钮是不是目录入口那枚（定稿 v3 ②起两档字面合一，叫「浏览文件夹」）。 */
const isBrowseButton = (node) => textOf(node) === '浏览文件夹';

/** #909 起设置页本体住在共用件里：本家交出去的就是「行表 ＋ 通道名 ＋ 三格接线」。
 *  拿桩 ctx 走一遍 `apply`，把这一次注册抓出来——F／H 两组的判据都咬这份**接入面**。 */
function registeredConfig(get) {
  let seen = null;
  CLIENT.exports.apply({
    slots: {
      inject: (_key, callback) => { callback(); return () => {}; },
      register: (options, component) => { seen = { options, component }; return () => {}; },
    },
    connection: { rpc: { call: () => {} } },
    ...(get === undefined ? {} : { get }),
    effect: (fn) => { const dispose = fn(); if (typeof dispose === 'function') dispose(); },
  });
  assert.notEqual(seen, null, 'apply 没把设置页注册进爱生活页签槽');
  // 注册交出去的是一个组件工厂（页签槽的既定形状）：调一次拿到那一棵元素，props 就是本家的接入面。
  const element = seen.component({});
  assert.notEqual(element, null, '设置页组件工厂没交出元素');
  return { options: seen.options, props: element.props };
}

/** 整面那一张卡的就绪态输入（给「高级组怎么画」「供不了那句人话上屏」两条用）。 */
const PANEL_SURFACE = { path: 'C:\\探针\\.ilife\\probe.yaml', dataDir: 'C:\\探针\\.ilife', created: false, values: { db: { dir: '' } } };
function panelTree(over = {}) {
  return PanelBody({
    title: "作息管家",
    items: CONFIG_ITEMS,
    state: { kind: 'ready', surface: PANEL_SURFACE },
    draft: toDraft(PANEL_SURFACE.values, PANEL_SURFACE),
    busy: false,
    notice: null,
    writeError: null,
    error: null,
    picking: false,
    browseRow: null,
    rowEntry: null,
    dirtyKeys: [],
    followKeys: [],
    copy: null,
    onCopy: () => {},
    onChange: () => {},
    onSave: () => {},
    onReset: () => {},
    onRetry: () => {},
    ...over,
  });
}

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

describe('#696 作息设置页 · 配置面', () => {
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
      assert.equal(CONFIG_STEM, SCHEDULE_CONFIG_STEM);
      assert.equal(CONFIG_STEM, 'schedule');
    });

    it('页面每一行都有对应的技能键，且**面板会给改**的键一个不少（技能侧另有的只读键不立行）', () => {
      // #843：技能侧默认值表多了 `html.helpDir`（产物根下 HELP 那一支的子目录名）——面板不立行
      // （落点类项只读展示，且「HELP 产物目录」那一行显示的正是含它的绝对路径）；其余键一行一钮对齐。
      const pageKeys = CONFIG_ITEMS.map((i) => i.key).sort();
      const skillKeys = flattenKeys(SCHEDULE_CONFIG_DEFAULTS);
      assert.deepEqual(pageKeys, skillKeys.filter((k) => k !== 'html.helpDir'));
      assert.ok(skillKeys.includes('html.helpDir'), '技能侧确有 html.helpDir 这个键');
    });

    it('每行的控件种类与技能默认值类型一致', () => {
      for (const item of CONFIG_ITEMS) {
        const v = leafOf(SCHEDULE_CONFIG_DEFAULTS, item.key);
        assert.notEqual(v, undefined, `技能配置表里缺 ${item.key}`);
        const want = item.control === 'number' ? 'number' : item.control === 'switch' ? 'boolean' : 'string';
        assert.equal(typeof v, want, `${item.key} 的默认值类型应是 ${want}`);
      }
    });

    it('默认值逐项等于现有代码常量（#764 起 files.help／lark.cliPath 出表；#843 起产物落点分家）', () => {
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.db.name, 'schedule_data.db');
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.html.dir, 'schedule_html', '#843：产品**根**目录（页面落它下面）');
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.html.helpDir, 'help', '#843：根下 HELP 那一支的子目录名');
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.db.dir, '', '空串＝按默认落点');
      assert.equal(Object.keys(SCHEDULE_CONFIG_DEFAULTS).sort().join(','), 'db,html', '两组键');
      assert.ok(!('files' in SCHEDULE_CONFIG_DEFAULTS), 'files 组已出表');
      assert.ok(!('lark' in SCHEDULE_CONFIG_DEFAULTS), 'lark 组已出表');
      assert.deepEqual([...SCHEDULE_CONFIG_RETIRED].sort(), ['files.help', 'lark.cliPath'], '删掉的两键进退休清单');
    });

    it('#843：老落点逐字不变 —— 产物根 ＋ help 支合起来仍是 `<库目录>/schedule_html/help`', () => {
      const { html } = SCHEDULE_CONFIG_DEFAULTS;
      assert.deepEqual([...html.dir.split('/'), html.helpDir], ['schedule_html', 'help'],
        '两键合起来＝改造前 HELP_HTML_DIR_PARTS 那两级');
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

    it('key 命名空间是 schedule.config.*（不与唤醒词命令混）', () => {
      for (const k of [CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY]) assert.match(k, /^schedule\.config\./);
    });

    it('通道名是单段且不等于 /api（宿主约束）', () => {
      assert.equal(RPC_CHANNEL, '/ilife-schedule-ilife');
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
    it('常用项恰是行表的前若干行；高级组已空（#764 起无高级键）', () => {
      assert.ok(COMMON_ITEM_COUNT > 0 && COMMON_ITEM_COUNT <= CONFIG_ITEMS.length);
      for (const i of CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT)) assert.equal(i.tier, 'common', `${i.key} 应在常用组`);
      for (const i of CONFIG_ITEMS.slice(COMMON_ITEM_COUNT)) assert.equal(i.tier, 'advanced', `${i.key} 应在高级组`);
    });

    it('最常动的三项（数据目录／库名／产物目录）在页面上直接画出来', () => {
      const common = CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT).map((i) => i.key);
      for (const k of ['db.dir', 'db.name', 'html.dir']) assert.ok(common.includes(k), `${k} 应在常用组`);
    });

    it('清单一共 3 行（#764 收窄：可改 1＋只读 2；高级组已空）', () => {
      assert.equal(CONFIG_ITEMS.length, 3);
      assert.equal(COMMON_ITEM_COUNT, 3);
      const advanced = CONFIG_ITEMS.slice(COMMON_ITEM_COUNT).map((i) => i.key);
      assert.deepEqual(advanced, []);
    });

    it('每行都有一句人话 hint（空文案＝页面上那行没法看）', () => {
      for (const i of CONFIG_ITEMS) assert.ok(i.hint.trim().length >= 10, `${i.key} 缺人话 hint`);
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
      assert.equal(readPath(s.values, 'html.dir'), SCHEDULE_CONFIG_DEFAULTS.html.dir, '没改的项应保持默认');
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
      assert.equal(readPath(s.values, 'db.name'), SCHEDULE_CONFIG_DEFAULTS.db.name);
      assert.equal(readPath(s.values, 'lark'), undefined, 'lark 组已出表，回执里不再有它');
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

    it('设置页组件里没有干活入口（没有记作息／看时间轴之类的取数调用）', () => {
      const props = registeredConfig().props;
      // #909 起设置页本体就交给共用面板这几格——多一格就是多一条取数口；行表本身只有配置项。
      assert.deepEqual(Object.keys(props).sort(),
        ['channel', 'extra', 'followKeysOf', 'getCall', 'getService', 'items', 'title'],
        '设置页的接入面超出「行表 ＋ 通道名 ＋ 三个可选钩子 ＋ 取数接线」');
      assert.deepEqual([...props.items], [...CONFIG_ITEMS], '设置页只画本家那张配置行表');
      assert.equal(JSON.stringify(props).includes("schedule.record"), false, '设置页的接入面里不该出现干活命令的 key：' + "schedule.record");
      assert.equal(JSON.stringify(props).includes("schedule.plan"), false, '设置页的接入面里不该出现干活命令的 key：' + "schedule.plan");
      assert.equal(JSON.stringify(props).includes("schedule.help"), false, '设置页的接入面里不该出现干活命令的 key：' + "schedule.help");
    });

    it('设置页只走三个配置端点', () => {
      const { props, options } = registeredConfig();
      // 三通电话（`config.get`／`config.save`／`config.reset`）收进共用件，本家只连通道路由名。
      assert.equal(props.channel, RPC_CHANNEL);
      assert.equal(options.channel, RPC_CHANNEL);
      for (const gone of ['config.get', 'config.save', 'config.reset']) {
        assert.equal(clientSrc.includes(gone), false, '本家不该再写死配置端点名：' + gone);
      }
    });

    it('高级项进默认收起的 details 组，常用项直画（本家高级组为空 ⇒ 屏上不该有那一组）', () => {
      // #909 起分组那一段是共用面板按行表 `tier` 切的：本家没有 advanced 行，屏上就不该出现「高级」。
      assert.deepEqual(CONFIG_ITEMS.filter((i) => i.tier === 'advanced').map((i) => i.key), []);
      const tree = panelTree();
      assert.doesNotMatch(textOf(tree), /高级/, '本家没有高级项，屏上不该画那个分组');
      for (const item of CONFIG_ITEMS) {
        assert.ok(textOf(tree).includes(item.title), item.key + ' 这一行没画出来');
      }
    });


    it('设置页仍注册进爱生活页签槽（改版没有把注册删掉）', () => {
      const { options } = registeredConfig();
      assert.equal(options.name, 'ilife.config-tab');
      assert.equal(options.id, SETTINGS_OWNER);
      assert.ok(clientSrc.includes("ctx.slots.inject('ilife.config-tab'"));
    });

    it('设置页仍报 SETTINGS_OWNER（设置页住单品包）', () => {
      assert.equal(SETTINGS_OWNER, 'dsh-schedule-ilife');
    });

    it('插件 src 一行没 import 技能实现或 base 包（只经 CLI 取用）', () => {
      const srcDir = join(HERE, '..', 'src');
      const files = ['bridge.ts', 'client.ts', 'contract.ts', 'dsh-ctx.ts', 'index.ts', 'settings.ts', 'slot.ts', 'skill-provider.ts'];
      for (const file of files) {
        const text = readFileSync(join(srcDir, file), 'utf8');
        assert.ok(!/from\s+['"]base-/.test(text), `${file} 不该 import base-*`);
        assert.ok(!/from\s+['"]skill-/.test(text), `${file} 不该 import skill-*（测试件除外）`);
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
  describe('H 目录行与系统文件夹选择器入口（#736；#743 按平台回执信封订正；#909 收进共用件）', () => {
    it('目录档只发给目录类行：数据目录（本包恰一行，其余两行不动档）', () => {
      const dirs = CONFIG_ITEMS.filter((i) => i.control === 'directory').map((i) => i.key).sort();
      assert.deepEqual(dirs, ["db.dir"].sort(), '目录行集合＝{db.dir}');
    });

    it('命名空间拿不到 ⇒ 没有入口（软依赖；守卫拒绝也当没有）', () => {
      // #909 起形状守卫收进共用件（`resolvePicker`）：本家那一格只做**原样透传**——
      // 「认不出就当没有」「守卫拒绝也不把设置页带下来」两条判断只有一处，住 `dsh-life-pack/config-panel`。
      const serviceWith = (get) => registeredConfig(get).props.getService;
      assert.equal(typeof serviceWith(() => undefined), 'function', '本家须交出宿主服务查找（目录选择是软依赖）');
      assert.equal(serviceWith(undefined)('remote.directoryPicker'), undefined, '宿主没给 ⇒ 那一格回 undefined');
      assert.equal(serviceWith(null)('remote.directoryPicker'), undefined);
      assert.equal(serviceWith(() => undefined)('remote.directoryPicker'), undefined);
      // 本家不认形状（判断只有一处）：宿主给什么就原样交出去。
      const oddShape = {};
      assert.equal(serviceWith(() => oddShape)('remote.directoryPicker'), oddShape, '形状怪也照原样交出去，本家不自己判断');
      const picker = { pick: async () => ({ ok: true, value: null }) };
      assert.equal(serviceWith(() => picker)('remote.directoryPicker'), picker, '拿到命名空间就原样交出去');
      // 本家不自己吞守卫的拒绝：拒绝当没有是共用件的判断（吞一半＝两处判断）。
      const refusing = serviceWith(() => { throw new Error('service "remote.directoryPicker" is not declared'); });
      assert.throws(() => refusing('remote.directoryPicker'), /is not declared/, '本家不许自己吞掉守卫的拒绝');
      // 入口供不了 ⇒ 那一枚按钮不画，文本框照旧（定稿 v3 ②：不摆点了没反应的死按钮）。
      const dirItem = CONFIG_ITEMS.find((i) => i.control === 'directory');
      for (const browser of [null, undefined, { mode: 'none', onOpen: () => {} }]) {
        const node = Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser });
        assert.deepEqual(nodesOfType(node, 'button').filter(isBrowseButton), [],
          '入口缺席 ⇒ 不画目录按钮（供不了就收起入口，文本框照旧）');
        assert.equal(nodesOfType(node, 'input').length, 1);
      }
    });

    it('按钮按档渲染：可改目录行恰一枚目录入口 ＋ 每行一枚复制；非目录行没有目录入口', () => {
      const dirItem = CONFIG_ITEMS.find((i) => i.control === 'directory');
      const textItem = CONFIG_ITEMS.find((i) => i.control === 'text');
      const withBrowse = Row({ item: dirItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'browse', onOpen: () => {} } });
      const browse = nodesOfType(withBrowse, 'button').filter(isBrowseButton);
      assert.equal(browse.length, 1, '可改目录行恰一枚目录入口');
      assert.equal(browse[0].props.type, 'button');
      assert.equal(nodesOfType(Row({ item: textItem, value: '', disabled: false, onChange: () => {}, browser: { mode: 'browse', onOpen: () => {} } }), 'button').filter(isBrowseButton).length, 0,
        '非目录行不画目录入口');
      assert.equal(nodesOfType(withBrowse, 'input').length, 1, '目录行仍是文本框 ＋ 按钮');
    });

    it('点按钮 → 把那**一行**的键交给入口回填；取消一字不动', () => {
      // #909 起「先应用内浏览、被拒换系统对话框」那一条动作住在共用件里（面板的 `onOpenRow`／`openNative`）；
      // 本家不再自己接线，故这里咬两件仍看得见的事实：① 按钮把这一行的键交出去；② 回执按平台信封解。
      const seen = [];
      const dirItem = CONFIG_ITEMS.find((i) => i.control === 'directory');
      const node = Row({
        item: dirItem,
        value: '',
        disabled: false,
        onChange: () => {},
        browser: { mode: 'native', onOpen: (key) => { seen.push(key); } },
      });
      nodesOfType(node, 'button').filter(isBrowseButton)[0].props.onClick();
      assert.deepEqual(seen, [dirItem.key], '点了就该把这一行的键交出去（入口据此回填这一行）');
      assert.deepEqual(readPickAnswer({ ok: true, value: 'D:\\爱生活数据' }), { kind: 'picked', path: 'D:\\爱生活数据' },
        '信封里的 value 才是那条绝对路径');
      assert.deepEqual(readPickAnswer({ ok: true, value: null }), { kind: 'cancelled' },
        'value:null ＝用户取消 ⇒ 这一行的值一字不动');
    });

    it('#743 回归：平台回 ok:false（**不抛**）也要出人话——被吞掉就成「点了没反应」', () => {
      const r = readPickAnswer({ ok: false, error: { code: 'directory-picker/unavailable', message: 'the composition cannot serve pick' } });
      assert.equal(r.kind, 'unavailable', 'ok:false 是「供不了」，不是「取消」');
      assert.match(r.message, /系统文件夹对话框/);
      assert.match(r.message, /绝对路径/);
      assert.match(r.message, /cannot serve/, '平台给的原话要带上，别吞');
    });

    it('这条路供不了 ⇒ 屏上出那句人话（就地失败那一支），不写值', () => {
      const phrase = readPickAnswer({ ok: false, error: { message: 'the composition cannot serve pick' } }).message;
      const tree = panelTree({ error: phrase });
      assert.match(textOf(tree), /系统文件夹对话框/, '供不了要出人话（被吞掉就成「点了没反应」）');
      assert.match(textOf(tree), /绝对路径/);
      // 「不写值」由面板的单一路径保证：只有 onChange 动草稿，失败只落 `error` 那一格。
      for (const node of nodesOfType(tree, 'input')) assert.notEqual(node.props.value, phrase);
    });

    it('回执按平台信封归一三态且永不抛', () => {
      assert.deepEqual(readPickAnswer({ ok: true, value: 'D:\\x' }), { kind: 'picked', path: 'D:\\x' });
      assert.deepEqual(readPickAnswer({ ok: true, value: null }), { kind: 'cancelled' });
      assert.deepEqual(readPickAnswer({ ok: true, value: '   ' }), { kind: 'cancelled' }, '空白串视同取消，不算选中');
      assert.deepEqual(readPickAnswer('D:\\裸串'), { kind: 'picked', path: 'D:\\裸串' }, '裸串照收（老形状兜底）');
      assert.equal(readPickAnswer(undefined).kind, 'unavailable', '认不出的形状当「供不了」报出来，不当取消吞掉');
      assert.equal(readPickAnswer(null).kind, 'unavailable');
      assert.equal(readPickAnswer({}).kind, 'unavailable');
    });

    it('#743：目录行把解析好的绝对路径预填出来（用户不必自己拼）', () => {
      const dir = 'C:\\Users\\x\\.ilife\\data';
      const dirKey = CONFIG_ITEMS.find((i) => i.prefillFrom === 'dataDir').key;
      assert.equal(toDraft({}, { dataDir: dir })[dirKey], dir, '取值空着 ⇒ 直接显示回执里那条绝对路径');
      assert.equal(toDraft({ db: { dir: 'D:\\elsewhere' } }, { dataDir: dir })[dirKey], 'D:\\elsewhere', '配了值 ⇒ 显示配置里的值');
      assert.equal(toDraft({}, {})[dirKey], '', '没有落点回执 ⇒ 保持空，不编一个路径出来');
      assert.equal(toDraft({}, { dataDir: dir })[dirKey], toDraft({ db: { dir: dir } }, { dataDir: dir })[dirKey],
        '预填出来的表单态与显式配置同读数 ⇒ 打开面板不会凭空变「未保存」');
    });

    it('client 短名声明没被改动（不许写成硬依赖：写进去整包会被停靠）', () => {
      assert.deepEqual(CLIENT.exports.inject, ['slots', 'connection']);
    });
  });});
