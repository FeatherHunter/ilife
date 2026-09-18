// #676 卡路里设置页：配置面验收。
//
// 六组判据：
//   A 测试隔离在位（#675 替代护栏）
//   B 页面的行表与技能侧配置表**逐键对齐**（lockstep：插件的行 = 技能的键，一处不少、一处不多）
//   C 三个配置 key 与技能侧 CONFIG_KEYS 同值（插件只镜像，不另造）
//   D 分级呈现：常用项在页面上、其余进默认收起的高级组
//   E 端到端经真 CLI：读／写／重置三态都能跑通，落盘可查
//   F 设置页只配置、不干活
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
import { CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY, readConfigSurface, writeConfigValues, resetConfigToDefaults } from '../dist/bridge.js';
// 权威侧：技能自己的配置表与三个 key（唯一定义地）。
import { CALORIE_CONFIG_DEFAULTS, CALORIE_CONFIG_STEM } from '../../skill-calorie/dist/config.js';
import { CONFIG_KEYS } from '../../skill-calorie/dist/cli/config.js';

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

describe('#676 卡路里设置页 · 配置面', () => {
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
      assert.equal(CONFIG_STEM, CALORIE_CONFIG_STEM);
      assert.equal(CONFIG_STEM, 'calorie');
    });

    it('页面每一行都有对应的技能键，且技能每一个键都有对应行（一处不少、一处不多）', () => {
      const pageKeys = CONFIG_ITEMS.map((i) => i.key).sort();
      assert.deepEqual(pageKeys, flattenKeys(CALORIE_CONFIG_DEFAULTS));
    });

    it('每行的控件种类与技能默认值类型一致', () => {
      for (const item of CONFIG_ITEMS) {
        const v = leafOf(CALORIE_CONFIG_DEFAULTS, item.key);
        assert.notEqual(v, undefined, `技能配置表里缺 ${item.key}`);
        const want = item.control === 'number' ? 'number' : item.control === 'switch' ? 'boolean' : 'string';
        assert.equal(typeof v, want, `${item.key} 的默认值类型应是 ${want}`);
      }
    });

    it('行表键不重复', () => {
      const keys = CONFIG_ITEMS.map((i) => i.key);
      assert.equal(new Set(keys).size, keys.length);
    });
  });

  describe('C 三个配置 key 与技能侧同值', () => {
    it('read／write／reset 三个 key 逐字等于技能侧 CONFIG_KEYS', () => {
      assert.equal(CONFIG_READ_KEY, CONFIG_KEYS.read);
      assert.equal(CONFIG_WRITE_KEY, CONFIG_KEYS.write);
      assert.equal(CONFIG_RESET_KEY, CONFIG_KEYS.reset);
    });

    it('key 命名空间是 calorie.config.*（不与唤醒词命令混）', () => {
      for (const k of [CONFIG_READ_KEY, CONFIG_WRITE_KEY, CONFIG_RESET_KEY]) assert.match(k, /^calorie\.config\./);
    });
  });

  describe('D 分级呈现', () => {
    it('常用项恰是行表的前若干行，其余全在高级组', () => {
      assert.ok(COMMON_ITEM_COUNT > 0 && COMMON_ITEM_COUNT < CONFIG_ITEMS.length);
      for (const i of CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT)) assert.equal(i.tier, 'common', `${i.key} 应在常用组`);
      for (const i of CONFIG_ITEMS.slice(COMMON_ITEM_COUNT)) assert.equal(i.tier, 'advanced', `${i.key} 应在高级组`);
    });

    it('最常动的四项（数据目录／库名／产物目录／照片目录）在页面上直接画出来', () => {
      const common = CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT).map((i) => i.key);
      for (const k of ['db.dir', 'db.name', 'html.dir', 'photos.dir']) assert.ok(common.includes(k), `${k} 应在常用组`);
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
      writePath(next, 'db.name', 'probe_676.db');
      writeConfigValues(next);
      const s = readConfigSurface();
      assert.equal(s.created, false);
      assert.equal(readPath(s.values, 'db.name'), 'probe_676.db');
      assert.equal(readPath(s.values, 'html.dir'), CALORIE_CONFIG_DEFAULTS.html.dir, '没改的项应保持默认');
      assert.equal(readPath(s.values, 'land.xunjiSeconds'), CALORIE_CONFIG_DEFAULTS.land.xunjiSeconds);
    });

    it('写：只给一项时，同组其它子项保留现值（技能侧做组内合并）', () => {
      const next = {};
      writePath(next, 'db.name', 'probe_again.db');
      writeConfigValues(next);
      const s = readConfigSurface();
      assert.equal(readPath(s.values, 'db.name'), 'probe_again.db');
      assert.equal(readPath(s.values, 'db.dir'), CALORIE_CONFIG_DEFAULTS.db.dir);
    });

    it('重置：先落 .bak 再回默认', () => {
      const r = resetConfigToDefaults();
      assert.ok(r.backupPath !== null && existsSync(r.backupPath), '重置前应留下一份 .bak');
      const s = readConfigSurface();
      assert.equal(readPath(s.values, 'db.name'), CALORIE_CONFIG_DEFAULTS.db.name);
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
  });

  describe('F 设置页只配置、不干活', () => {
    const clientSrc = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');

    function configComponentSource() {
      const start = clientSrc.indexOf('function CalorieConfig(');
      assert.ok(start > 0, 'client.ts 里应有 CalorieConfig');
      const end = clientSrc.indexOf('interface BetterSidebarService');
      assert.ok(end > start);
      return clientSrc.slice(start, end);
    }

    it('设置页组件里没有取数入口', () => {
      const body = configComponentSource();
      assert.ok(!body.includes('fetchRead'), '设置页不该调 fetchRead');
      assert.ok(!body.includes('DEFAULT_READ_KEY'), '设置页不该带默认读键');
    });

    it('设置页只走三个配置端点', () => {
      const body = configComponentSource();
      assert.ok(body.includes('fetchConfigSurface'));
      assert.ok(body.includes('saveConfigSurface'));
      assert.ok(body.includes('resetConfigSurface'));
    });

    it('技能功能页仍在（改版没有把干活面删掉）', () => {
      assert.ok(clientSrc.includes('function CalorieWork('));
      assert.ok(clientSrc.includes("id: 'ilife-calorie:work'"));
    });

    it('设置页仍报 SETTINGS_OWNER（设置页住单品包）', () => {
      assert.equal(SETTINGS_OWNER, 'dsh-calorie');
    });

    it('插件 src 一行没 import 技能实现或 base 包（只经 CLI 取用）', () => {
      const srcDir = join(HERE, '..', 'src');
      const files = ['bridge.ts', 'client.ts', 'contract.ts', 'dsh-ctx.ts', 'index.ts', 'settings.ts', 'slot.ts', 'skill-provider.ts'];
      for (const f of files) {
        const t = readFileSync(join(srcDir, f), 'utf8');
        assert.ok(!/from\s+['"]base-/.test(t), `${f} 不该 import base-*`);
        assert.ok(!/from\s+['"]skill-/.test(t), `${f} 不该 import skill-*（测试件除外）`);
      }
      return undefined;
    });
  });
});
