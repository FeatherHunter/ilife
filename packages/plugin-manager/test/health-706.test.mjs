// #706 配置体检面板侧：判据与「一份数据喂两处」的结构断言。
//
// 本件跑的都不是真机（真机那三条在技能侧用例 `packages/plugin-calorie/test/health-706.test.mjs` 里），
// 而是面板侧五件事：
//   A 报告形状守卫与三档聚合（最严重那一档、计数）
//   B 取数：六家各调一次各自的通道与端点；一家报错／超时／形状认不出都不拖死别家
//   C 总览那行：六盏灯按页签顺序、缺席或没体检时显 —（不冒充绿）
//   D 同一份数据：产物里只有一处取数口，总览与各家表读的是同一个快照（结构断言）
//   E 全量对齐门：六家报告合起来**逐条**对上检查表（这份名单是独立转写的一份期望值，
//     不是从各家的源码生成的——少了、多了、改名了都当场红）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HEALTH_ENDPOINT, countByStatus, isHealthReport, worstStatus } from '../dist/health-contract.js';
import { loadHealthReports } from '../dist/health-fetch.js';
import { lightsOf } from '../dist/health-view.js';
import { setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');
const REPO = join(HERE, '..', '..', '..');

/** 检查表 `docs/research/check-table-671-life-panel-20260917.html` 那 27 条候选
 *（六家通用 5×6＝30 条 ＋ 各家特有 22 条；作息「第二份库」已由编者撤回，不进报告）。 */
const EXPECT = {
  calorie: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'photos.dir', 'photos.gifs', 'xunji.key', 'xunji.cli', 'xunji.stateDir', 'land.cli', 'xunji.catalog'],
  bill: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'goals.file', 'backup.dir'],
  chef: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'templates.dir', 'scenarios.file'],
  home: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'paths.split', 'seed.file', 'key.file', 'templates.dir'],
  // 备忘的「附件前缀」随 #712 落成真目录 → 这一项的 id 与判据按目录写。
  memo: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'media.dir', 'lark.cli', 'templates.dir', 'scenarios.file'],
  schedule: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'lark.cli', 'whitelist.file', 'templates.dir'],
};

/** 报告构造函数的导出名（懒加载：谁的 `dist/health.js` 还没构建，就跳过谁并点名）。 */
const MODULES = {
  calorie: ['skill-calorie', 'buildCalorieHealthReport'],
  bill: ['skill-bill', 'buildBillHealthReport'],
  chef: ['skill-chef', 'buildChefHealthReport'],
  home: ['skill-home', 'buildHomeHealthReport'],
  memo: ['skill-memo-ilife', 'buildMemoHealthReport'],
  schedule: ['skill-schedule', 'buildScheduleHealthReport'],
};

/** 六家通用那 5 条（每家都要有）。 */
const COMMON = ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source'];

/** 已构建的技能包（没构建的不进这一轮；`E` 组会把缺的那几家点名报出来）。 */
async function loadBuilders() {
  const out = {};
  const missing = [];
  for (const [skill, [dir, exportName]] of Object.entries(MODULES)) {
    const file = join(REPO, 'packages', dir, 'dist', 'health.js');
    if (!existsSync(file)) {
      missing.push(skill);
      continue;
    }
    const mod = await import(pathToFileURL(file).href);
    out[skill] = mod[exportName];
  }
  return { builders: out, missing };
}

function item(id, status) {
  return { id, title: id, status, message: '一句话：' + id, action: '去哪修：' + id };
}

function report(skill, statuses, extra = {}) {
  return {
    skill,
    configPath: 'C:/cfg/' + skill + '.yaml',
    dataDir: 'C:/data',
    items: statuses.map((status, index) => item(skill + '.' + String(index), status)),
    ...extra,
  };
}

describe('#706 配置体检 · 面板侧', () => {
  describe('A 报告形状与三档聚合', () => {
    it('最严重那一档说了算；一条都没有时回 null（不冒充绿）', () => {
      assert.equal(worstStatus([item('a', 'green'), item('b', 'yellow')]), 'yellow');
      assert.equal(worstStatus([item('a', 'yellow'), item('b', 'red'), item('c', 'green')]), 'red');
      assert.equal(worstStatus([]), null);
    });

    it('计数按三档分开数', () => {
      assert.deepEqual(countByStatus([item('a', 'red'), item('b', 'red'), item('c', 'yellow')]), { red: 2, yellow: 1, green: 0 });
    });

    it('形状守卫：认得出合法报告，认不出缺字段／错档位的', () => {
      assert.equal(isHealthReport(report('calorie', ['green', 'red'])), true);
      assert.equal(isHealthReport(null), false);
      assert.equal(isHealthReport({ skill: 'calorie', configPath: 'a', dataDir: 'b' }), false, '缺 items 不该放行');
      assert.equal(isHealthReport({ ...report('calorie', ['green']), items: [{ id: 'a', title: 'a', status: 'blue', message: 'm', action: 'x' }] }), false);
    });
  });

  describe('B 取数：一家一次、各走各的通道', () => {
    it('六家各调一次自己的通道，端点都是 config.check，载荷空对象', async () => {
      const seen = [];
      const call = async (channel, endpoint, payload) => {
        seen.push([channel, endpoint, payload]);
        return { ok: true, value: report(channel.replace('/ilife-', ''), ['green']) };
      };
      const tabs = [
        { id: 'dsh-calorie', channel: '/ilife-calorie' },
        { id: 'dsh-chef', channel: '/ilife-chef' },
      ];
      const out = await loadHealthReports(call, tabs);
      assert.equal(out.error, null);
      assert.deepEqual(seen, [
        ['/ilife-calorie', HEALTH_ENDPOINT, {}],
        ['/ilife-chef', HEALTH_ENDPOINT, {}],
      ]);
      assert.equal(out.rows.length, 2);
      assert.equal(out.rows[0].report.skill, 'calorie');
      assert.equal(out.rows[0].error, null);
    });

    it('一家失败不拖别家：出错那家只有 error，另一家照常有报告', async () => {
      const call = async (channel) => (channel === '/ilife-bad'
        ? { ok: false, error: { code: 'missing-cli', message: '技能出口缺失', details: {} } }
        : { ok: true, value: report('good', ['yellow']) });
      const out = await loadHealthReports(call, [
        { id: 'dsh-bad', channel: '/ilife-bad' },
        { id: 'dsh-good', channel: '/ilife-good' },
      ]);
      assert.equal(out.rows[0].report, null);
      assert.match(out.rows[0].error, /技能出口缺失/);
      assert.equal(out.rows[1].report.skill, 'good');
    });

    it('形状认不出的回执不算报告（报「形状认不出」，不返空冒充正常）', async () => {
      const out = await loadHealthReports(async () => ({ ok: true, value: { 谁说: '这是我自己的形状' } }), [
        { id: 'dsh-x', channel: '/ilife-x' },
      ]);
      assert.equal(out.rows[0].report, null);
      assert.match(out.rows[0].error, /形状认不出/);
    });

    it('宿主连接缺席：整表报错，不装作没这回事', async () => {
      const out = await loadHealthReports(null, [{ id: 'dsh-x', channel: '/ilife-x' }]);
      assert.equal(out.rows.length, 0);
      assert.match(out.error, /宿主连接缺席/);
    });
  });

  describe('C 总览那行', () => {
    it('每家用最严重那一档点灯；没有报告的那盏显 —（不冒充绿）', () => {
      const tabs = [
        { id: 'dsh-calorie', title: '卡路里' },
        { id: 'dsh-chef', title: '大厨' },
        { id: 'dsh-home', title: '居家' },
      ];
      const lights = lightsOf(tabs, {
        'dsh-calorie': report('calorie', ['green', 'green']),
        'dsh-chef': report('chef', ['green', 'red']),
      });
      assert.deepEqual(lights.map((l) => [l.id, l.title, l.status]), [
        ['dsh-calorie', '卡路里', 'green'],
        ['dsh-chef', '大厨', 'red'],
        ['dsh-home', '居家', null],
      ]);
      assert.deepEqual(lights[1].counts, { red: 1, yellow: 0, green: 1 });
    });
  });

  describe('D 同一份数据（结构断言）', () => {
    it('产物里只有一处取数口：总览与各家表都不自己调通道', () => {
      const occurrences = CLIENT.split('config.check').length - 1;
      assert.equal(occurrences, 1, '「config.check」在产物里出现 ' + String(occurrences) + ' 次：取数口必须只有一处');
      assert.ok(CLIENT.includes('体检一次'), '产物里没有那个按钮');
      assert.ok(CLIENT.includes('只看不改'), '产物里没有「只看不改」那句口径');
    });

    it('各家注册时交出的通道进了账本投影（channel 是页签槽 options 的一格）', () => {
      assert.ok(CLIENT.includes('channel'), '产物里没有读通道那一格');
    });
  });

  describe('E 全量对齐门', () => {
    // 体检会读盘（`configPaths` 在测试运行器里没设隔离即响亮报错），故整段先立隔离基座。
    const base = setupConfigTestBase();
    it('六家合起来 27 条候选都在（检查表那 27 条：通用 5×6 ＋ 各家特有 22）', async () => {
      const { builders, missing } = await loadBuilders();
      // 六家一件不少才算过：谁没构建好就点名（这一条是「全量」门，不容缺件）。
      assert.deepEqual(missing, [], '这几家的 dist/health.js 还没构建好：' + missing.join('、'));
      assert.equal(Object.keys(builders).length, Object.keys(EXPECT).length, '六家一件不少：现在只有 ' + Object.keys(builders).join('、'));
      let total = 0;
      let unique = 0;
      for (const [skill, expected] of Object.entries(EXPECT)) {
        const report = builders[skill]();
        assert.equal(report.skill, skill, skill + ' 报告里的技能名不对');
        const ids = report.items.map((item) => item.id).sort();
        assert.deepEqual(ids, expected.slice().sort(), skill + ' 的检查项与检查表对不上（少一条、多一条或改了名）');
        for (const item of report.items) {
          assert.ok(['red', 'yellow', 'green'].includes(item.status), skill + '/' + item.id + ' 档位不合法');
          assert.ok(item.title.length > 0 && item.message.length > 0, skill + '/' + item.id + ' 缺标题或一句话');
          assert.equal(typeof item.action, 'string', skill + '/' + item.id + ' 缺「去哪修」字段');
        }
        total += ids.length;
        unique += ids.filter((id) => !COMMON.includes(id)).length;
      }
      assert.equal(total, 52, '报告条数＝通用 5×6 ＋ 各家特有 22：现在数是 ' + String(total));
      assert.equal(unique, 22, '检查表「各家特有」是 22 条：现在数是 ' + String(unique));
    });

    it('六家通用那 5 条每家都齐（形状一样，一条不少）', () => {
      const common = EXPECT.calorie.slice(0, 5);
      for (const [skill, expected] of Object.entries(EXPECT)) {
        for (const id of common) {
          assert.ok(expected.includes(id), skill + ' 缺通用那条：' + id);
        }
      }
    });

    base.cleanup();
  });
});
