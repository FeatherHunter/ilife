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
//
// 边界口径：插件侧不许 import `base-*`／`skill-*`（`test/plugin-p10-boundaries.test.mjs`），
// 所以配置读写走技能 CLI 的三个 key。本测试直接 import 技能 dist 做对齐，
// 那是**测试件**的范围（边界门扫的是 `packages/plugin-*/src/*.ts`），src 里一行没 import 技能实现。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setupConfigTestBase, requireConfigTestBase } from '../../../test/helpers/config-test-base.mjs';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT, CONFIG_STEM, SETTINGS_OWNER, readPath, writePath } from '../dist/index.js';
import { CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY, readConfigSurface, writeConfigValues, resetConfigToDefaults, resolveNodeBin } from '../dist/bridge.js';
import { RPC_CHANNEL, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, parseSavePayload, isRpcResult } from '../dist/contract.js';
// 权威侧：技能自己的配置表与三个 key（唯一定义地）。
import { SCHEDULE_CONFIG_DEFAULTS, SCHEDULE_CONFIG_STEM } from '../../skill-schedule/dist/config.js';
import { CONFIG_KEYS } from '../../skill-schedule/dist/cli/config.js';

const HERE = dirname(fileURLToPath(import.meta.url));

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
    it('基座强制 ILIFE_CONFIG_DIR（缺了就该响亮失败）', () => {
      assert.equal(requireConfigTestBase(), base.dir);
    });
  });

  describe('B 行表与技能侧配置表逐键对齐', () => {
    it('配置文件主体名同值', () => {
      assert.equal(CONFIG_STEM, SCHEDULE_CONFIG_STEM);
      assert.equal(CONFIG_STEM, 'schedule');
    });

    it('页面每一行都有对应的技能键，且技能每一个键都有对应行（一处不少、一处不多）', () => {
      const pageKeys = CONFIG_ITEMS.map((i) => i.key).sort();
      assert.deepEqual(pageKeys, flattenKeys(SCHEDULE_CONFIG_DEFAULTS));
    });

    it('每行的控件种类与技能默认值类型一致', () => {
      for (const item of CONFIG_ITEMS) {
        const v = leafOf(SCHEDULE_CONFIG_DEFAULTS, item.key);
        assert.notEqual(v, undefined, `技能配置表里缺 ${item.key}`);
        const want = item.control === 'number' ? 'number' : item.control === 'switch' ? 'boolean' : 'string';
        assert.equal(typeof v, want, `${item.key} 的默认值类型应是 ${want}`);
      }
    });

    it('默认值逐项等于现有代码常量', () => {
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.db.name, 'schedule_data.db');
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.html.dir, 'schedule_html/help');
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.files.help, '作息管家_HELP');
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.db.dir, '', '空串＝按默认落点');
      assert.equal(SCHEDULE_CONFIG_DEFAULTS.lark.cliPath, '', '空串＝走兜底探测');
    });

    it('HTML 产物目录是两段（改造前 HELP_HTML_DIR_PARTS 就是两级）', () => {
      assert.deepEqual(SCHEDULE_CONFIG_DEFAULTS.html.dir.split('/'), ['schedule_html', 'help']);
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
    it('常用项恰是行表的前若干行，其余全在高级组', () => {
      assert.ok(COMMON_ITEM_COUNT > 0 && COMMON_ITEM_COUNT < CONFIG_ITEMS.length);
      for (const i of CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT)) assert.equal(i.tier, 'common', `${i.key} 应在常用组`);
      for (const i of CONFIG_ITEMS.slice(COMMON_ITEM_COUNT)) assert.equal(i.tier, 'advanced', `${i.key} 应在高级组`);
    });

    it('最常动的三项（数据目录／库名／产物目录）在页面上直接画出来', () => {
      const common = CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT).map((i) => i.key);
      for (const k of ['db.dir', 'db.name', 'html.dir']) assert.ok(common.includes(k), `${k} 应在常用组`);
    });

    it('清单一共 5 行（调查的 5 项上设置页候选：db 组占两个键）', () => {
      assert.equal(CONFIG_ITEMS.length, 5);
      assert.equal(COMMON_ITEM_COUNT, 3);
      const advanced = CONFIG_ITEMS.slice(COMMON_ITEM_COUNT).map((i) => i.key);
      assert.deepEqual(advanced, ['files.help', 'lark.cliPath']);
    });

    it('每行都有一句人话 hint（空文案＝页面上那行没法看）', () => {
      for (const i of CONFIG_ITEMS) assert.ok(i.hint.trim().length >= 10, `${i.key} 缺人话 hint`);
    });
  });

  describe('E 端到端经真 CLI', () => {
    it('读：拿得到配置文件路径、数据目录与当前值', () => {
      const s = readConfigSurface();
      assert.ok(existsSync(s.path), '首次读应把配置文件落下来');
      assert.equal(s.dataDir, join(base.dir, 'data'));
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
      assert.equal(readPath(s.values, 'files.help'), SCHEDULE_CONFIG_DEFAULTS.files.help);
    });

    it('写：只给一项时，同组其它子项保留现值（技能侧做组内合并）', () => {
      const next = {};
      writePath(next, 'db.name', 'probe_again_696.db');
      writeConfigValues(next);
      const s = readConfigSurface();
      assert.equal(readPath(s.values, 'db.name'), 'probe_again_696.db');
      assert.equal(readPath(s.values, 'db.dir'), SCHEDULE_CONFIG_DEFAULTS.db.dir);
    });

    it('重置：先落 .bak 再回默认', () => {
      const r = resetConfigToDefaults();
      assert.ok(r.backupPath !== null && existsSync(r.backupPath), '重置前应留下一份 .bak');
      const s = readConfigSurface();
      assert.equal(readPath(s.values, 'db.name'), SCHEDULE_CONFIG_DEFAULTS.db.name);
      assert.equal(readPath(s.values, 'lark.cliPath'), '');
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
      const start = clientSrc.indexOf('function ScheduleConfig(');
      assert.ok(start > 0, 'client.ts 里应有 ScheduleConfig');
      const end = clientSrc.indexOf('export function apply(');
      assert.ok(end > start);
      return clientSrc.slice(start, end);
    }

    it('设置页组件里没有干活入口（没有记作息／看时间轴之类的取数调用）', () => {
      const body = configComponentSource();
      assert.ok(!body.includes('fetchRead'), '设置页不该调取数');
      assert.ok(!body.includes('DEFAULT_READ_KEY'), '设置页不该带默认读键');
      assert.ok(!body.includes('schedule.record'), '设置页不该直接点名干活命令的 key');
      assert.ok(!body.includes('schedule.plan'), '设置页不该直接点名干活命令的 key');
      assert.ok(!body.includes('schedule.help'), '设置页不该直接点名干活命令的 key');
    });

    it('设置页只走三个配置端点', () => {
      const body = configComponentSource();
      assert.ok(body.includes('fetchConfigSurface'));
      assert.ok(body.includes('saveConfigSurface'));
      assert.ok(body.includes('resetConfigSurface'));
    });

    it('高级项进默认收起的 details 组，常用项直画', () => {
      const body = configComponentSource();
      assert.ok(body.includes("'details'"), '高级组应是 details');
      assert.ok(body.includes('COMMON_ITEM_COUNT'), '常用项数取自行表');
    });

    it('设置页仍注册进爱生活页签槽（改版没有把注册删掉）', () => {
      assert.ok(clientSrc.includes("ctx.slots.inject('ilife.config-tab'"));
      assert.ok(clientSrc.includes("name: 'ilife.config-tab'"));
      assert.ok(clientSrc.includes('id: PLUGIN'));
    });

    it('设置页仍报 SETTINGS_OWNER（设置页住单品包）', () => {
      assert.equal(SETTINGS_OWNER, 'dsh-schedule-ilife');
    });

    it('插件 src 一行没 import 技能实现或 base 包（只经 CLI 取用）', () => {
      const srcDir = join(HERE, '..', 'src');
      const files = ['bridge.ts', 'client.ts', 'contract.ts', 'dsh-ctx.ts', 'index.ts', 'settings.ts', 'slot.ts', 'skill-provider.ts'];
      for (const f of files) {
        const t = readFileSync(join(srcDir, f), 'utf8');
        assert.ok(!/from\s+['"]base-/.test(t), `${f} 不该 import base-*`);
        assert.ok(!/from\s+['"]skill-/.test(t), `${f} 不该 import skill-*（测试件除外）`);
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
});
