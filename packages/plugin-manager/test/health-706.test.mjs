// #706 配置体检面板侧：判据与「一份数据喂两处」的结构断言。
//
// 本件跑的都不是真机（真机那三条在技能侧用例 `packages/plugin-calorie/test/health-706.test.mjs` 里），
// 而是面板侧五件事：
//   A 报告形状守卫与三档聚合（最严重那一档、计数）
//   B 取数：六家各调一次各自的通道与端点；一家报错／超时／形状认不出都不拖死别家
//   C 顶部那一行汇总（票 #732 从「一排灯按钮」改成「一行总账」）：红黄计数按档上色、缺席不冒充绿
//   D 同一份数据：产物里只有一处取数口，顶部汇总与各家表读的是同一个快照（结构断言）
//   E 全量对齐门：六家报告合起来**逐条**对上检查表（这份名单是独立转写的一份期望值，
//     不是从各家的源码生成的——少了、多了、改名了都当场红）
//   F 页签上那枚小数字（票 #732）：体检结果长到页签上，红黄的家名后才带一条计数
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';
import { HEALTH_ENDPOINT, countByStatus, isHealthReport, worstStatus } from '../dist/health-contract.js';
import { loadHealthReports } from '../dist/health-fetch.js';
import { summaryErrorOf } from '../dist/health-panel.js';
import { HealthSummaryLine, HealthTable, TAB_DOT, countSegsOf, lightsOf, tabDotColor, tabNote } from '../dist/health-view.js';
// 档位的**灯色**从 dist 直接取（票 #732）：本件原先自己抄了一份同样的色值——
// 那样「改源码里的色值」在这件里是**看不见**的（抄来的那份不会跟着变），断言就守不住这件事。
import { STATUS_COLOR as STATUS_COLOR_DIST } from '../dist/health-view.js?732-live';
import { setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';

const require = createRequire(import.meta.url);
const React = require(join('..', 'node_modules', 'react'));

/** 把元素树渲成 HTML（够这个组件用：函数组件、style 对象、void 标签）——用来量「哪几条印成了几行」。 */
function renderHtml(node) {
  const VOID = new Set(['br', 'hr', 'img', 'input']);
  const UNITLESS = new Set(['fontWeight', 'lineHeight', 'flex', 'opacity', 'zIndex']);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  const css = (s) => Object.entries(s).filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => kebab(k) + ':' + (typeof v === 'number' && !UNITLESS.has(k) ? v + 'px' : String(v))).join(';');
  const step = (n) => {
    if (n === null || n === undefined || n === false || n === true) return '';
    if (typeof n === 'string' || typeof n === 'number') return esc(n);
    if (Array.isArray(n)) return n.map(step).join('');
    const { type, props: p } = n;
    if (typeof type === 'function') return step(type({ ...p }));
    if (typeof type !== 'string') return '';
    const attrs = [];
    if (p.style) attrs.push('style="' + esc(css(p.style)) + '"');
    for (const [k, v] of Object.entries(p)) {
      if (k === 'children' || k === 'style' || k === 'key' || k === 'ref' || typeof v === 'function') continue;
      if (v === null || v === undefined || v === false) continue;
      if (v === true) { attrs.push(k); continue; }
      attrs.push(k + '="' + esc(v) + '"');
    }
    const open = '<' + type + (attrs.length ? ' ' + attrs.join(' ') : '');
    return VOID.has(type) ? open + ' />' : open + '>' + step(p.children) + '</' + type + '>';
  };
  return step(node);
}

/** 屏上看得见的那部分（去掉标签与属性）：文案断言看它，免得属性里的原文（悬停提示）把结论带偏。 */
function visibleText(html) {
  return html.replace(/<[^>]*>/g, '');
}

/** 三档的颜色取值：与 `src/health-view.ts` 的 `STATUS_COLOR` / `STATUS_TEXT` 同值（断言要按色判）。 */
const STATUS_COLOR = { red: '#c0392b', yellow: '#e08a00', green: 'var(--dsw-alias-state-success-primary, #4ec9a0)' };
const STATUS_TEXT = { red: '#a5281b', yellow: '#8a5200', green: 'var(--dsw-alias-state-success-primary, #4ec9a0)' };

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = readFileSync(join(HERE, '..', 'dist', 'client.js'), 'utf8');
const REPO = join(HERE, '..', '..', '..');

/** 检查表 `docs/research/check-table-671-life-panel-20260917.html` 那批候选
 *（六家通用 5×6＝30 条 ＋ 各家特有 18 条；作息「第二份库」已由编者撤回，另四条探包内 `src/` 的已撤，见下）。 */
// 2026-09-17 撤项（四条）：大厨／备忘「场景资产」、居家「种子分类」、作息「分类允许清单」——它们的判据探的是
// 包内 `src/` 下的文件，而各家 `files` 只发 `dist`／`SKILL.md`／`templates` ⇒ 装机态恒红且不可达，故整条删除。
const EXPECT = {
  calorie: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'photos.dir', 'photos.gifs', 'xunji.key', 'xunji.cli', 'xunji.stateDir', 'land.cli', 'xunji.catalog'],
  bill: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'goals.file', 'backup.dir'],
  chef: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'templates.dir'],
  home: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'paths.split', 'key.file', 'templates.dir'],
  // 备忘的「附件前缀」随 #712 落成真目录 → 这一项的 id 与判据按目录写。
  memo: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'media.dir', 'lark.cli', 'templates.dir'],
  schedule: ['config.file', 'db.dir', 'db.file', 'html.dir', 'value.source', 'lark.cli', 'templates.dir'],
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

  describe('B 取数：一家一通电话，走载体基段', () => {
    // 票 #735 真机 404 的根：载体是 `call(第一段, 第二段, {method, payload})`，URL ＝ `${第一段}/${第二段}`。
    // 第一段必须是载体基段 `/api`、第二段是那家的电话名；写成「通道名 ＋ 端点名」两家都不认。
    it('六家各一通电话：第一段载体基段、第二段电话名、端点写进载荷 method', async () => {
      const seen = [];
      const call = async (base, phone, payload) => {
        seen.push([base, phone, payload]);
        return { ok: true, value: report(phone.replace('ilife-', ''), ['green']) };
      };
      const tabs = [
        { id: 'dsh-calorie', channel: '/ilife-calorie' },
        { id: 'dsh-chef', channel: '/ilife-chef' },
      ];
      const out = await loadHealthReports(call, tabs);
      assert.equal(out.error, null);
      assert.deepEqual(seen, [
        ['/api', 'ilife-calorie', { method: HEALTH_ENDPOINT, payload: {} }],
        ['/api', 'ilife-chef', { method: HEALTH_ENDPOINT, payload: {} }],
      ]);
      assert.equal(out.rows.length, 2);
      assert.equal(out.rows[0].report.skill, 'calorie');
      assert.equal(out.rows[0].error, null);
    });

    // 票 #741（维护者真机）：体检原先要等**全部**齐了才一次性画出来，看着像卡住。取数口现在多一个
    // 「一家好了就回调一次」的通道，面板据此按家增量画。这一条咬住：先回来的那家必须在**另一家还在途**时
    // 就已经回调出去（不是攒到最后一起给）。
    it('一家落定就回调一次：先回来的先画，不等别家（#741）', async () => {
      let releaseSlow = () => {};
      const slow = new Promise((resolve) => { releaseSlow = () => resolve({ ok: true, value: report('slow', ['green']) }); });
      const arrived = [];
      const call = async (base, phone) => (phone === 'ilife-slow'
        ? slow
        : { ok: true, value: report('fast', ['yellow']) });
      const pending = loadHealthReports(call, [
        { id: 'dsh-slow', channel: '/ilife-slow' },
        { id: 'dsh-fast', channel: '/ilife-fast' },
      ], (row) => arrived.push(row.id));
      // 让快那家的微任务跑完（慢那家还挂在 promise 上）。
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.deepEqual(arrived, ['dsh-fast'], '快的那家落定就该回调出去；慢的还没回来时不许等它');
      releaseSlow();
      const out = await pending;
      assert.deepEqual(arrived, ['dsh-fast', 'dsh-slow'], '慢的那家落定后再回调一次');
      assert.equal(out.rows.length, 2);
      // 回调抛错不许把整批拖下水（它是画图的旁路，不是取数本身）。
      const stillOk = await loadHealthReports(async () => ({ ok: true, value: report('x', ['green']) }), [
        { id: 'dsh-x', channel: '/ilife-x' },
      ], () => { throw new Error('画图旁路炸了'); });
      assert.equal(stillOk.rows.length, 1);
      assert.equal(stillOk.rows[0].report.skill, 'x');
    });

    it('一家失败不拖别家：出错那家只有 error，另一家照常有报告', async () => {
      const call = async (base, phone) => (phone === 'ilife-bad'
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

    // 票 #735 的第三次真机误判：六家全 404 时各家只有自己的 error，摘要行一声不吭，
    // 用户看到的仍是「还没体检」⇒ 以为按钮坏了。这一条咬住「一家报告都没回来时把错顶上去」。
    it('报告一份都没回来时，家错误要顶到摘要行', () => {
      const failed = { report: null, error: '体检没跑起来：transport failure for /ilife-calorie/config.check: HTTP 404' };
      const okRow = { report: report('calorie', ['green']), error: null };
      assert.equal(summaryErrorOf({ rows: {}, error: '宿主连接缺席：connection.rpc.call 不可用' }), '宿主连接缺席：connection.rpc.call 不可用',
        '取数过程本身的错优先');
      assert.match(summaryErrorOf({ rows: { a: failed, b: failed }, error: null }), /HTTP 404/, '一家报告都没回来时，第一条家错误没顶上来');
      assert.equal(summaryErrorOf({ rows: { a: okRow, b: failed }, error: null }), null, '有报告回来时不顶（各家那张表已经说清了）');
      assert.equal(summaryErrorOf({ rows: {}, error: null }), null, '还没跑过时不许无中生有');
    });
  });

  describe('C 顶部那一行汇总', () => {
    it('每家用最严重那一档算档；没有报告的那盏显 —（不冒充绿）', () => {
      const tabs = [
        { id: 'dsh-calorie', title: '卡路里', hasChannel: true },
        { id: 'dsh-chef', title: '大厨', hasChannel: true },
        { id: 'dsh-home', title: '居家', hasChannel: true },
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
      // 这里曾印过「最严重那一项的名字」当区分度，实测六家常坏在同一条通用检查项上（都是「数据目录」），
      // 是噪声不是区分度，已撤回；灯上只留「家名 ＋ 按档上色的计数」。
      // `hasChannel`（票 #732）也是必须的一格：报告上「没装」与「装了没体检」都长成 null，
      // 页签的圆点色与顶部汇总都要靠它分开，少一格这两个读数就分不开。
      assert.deepEqual(Object.keys(lights[1]).sort(), ['counts', 'hasChannel', 'id', 'status', 'title']);
    });

    it('灯上那截计数按档上色：「黄 N」不许印成红字（本页自己定的语义，文字层也得守）', () => {
      // 出图复评逮到的真缺陷：计数原先是**一个字符串**塞进一个 span、染顶档色，
      // 六家都红时「黄 3」就跟着印成红字——页面自己说「黄＝还没配」，文字层却把它涂成红。
      const lights = [
        { id: 'dsh-bill-ilife', title: '记账', status: 'red', counts: { red: 2, yellow: 3, green: 0 }, hasChannel: true },
      ];
      const html = renderHtml(
        React.createElement(HealthSummaryLine, { lights, running: false, error: null, onRun: () => {} }),
      );
      const red = STATUS_TEXT.red;
      const yellow = STATUS_TEXT.yellow;
      assert.ok(html.includes('红 2'), '红那一截没印出来');
      assert.ok(html.includes('黄 3'), '黄那一截没印出来');
      // 两截必须带**各自**的颜色：黄那一截的 span 里不许出现红的色值。
      const segs = [...html.matchAll(/<span style="([^"]*)">(红|黄) (\d+)<\/span>/g)].map((m) => ({ style: m[1], text: m[2] + ' ' + m[3] }));
      assert.equal(segs.length, 2, '计数应当拆成两截各自上色，现在是：' + JSON.stringify(segs));
      assert.ok(segs[0].style.includes(red) && !segs[0].style.includes(yellow), '红那一截的颜色不对：' + segs[0].style);
      assert.ok(segs[1].style.includes(yellow) && !segs[1].style.includes(red), '黄那一截印成了别的颜色（缺陷原样）: ' + segs[1].style);
    });

    it('绿档看得见：正常那一行前面有绿点（不是只剩一行灰字）', () => {
      const items = [
        { id: 'a', title: '要处理的', status: 'red', message: '不在：C:/Users/me/.ilife/data', action: 'x', source: '默认值' },
        { id: 'b', title: '正常的甲', status: 'green', message: '在且能写。', action: '', source: '默认值' },
      ];
      const report = { skill: 'x', configPath: 'C:/Users/me/.ilife/x.yaml', dataDir: 'C:/Users/me/.ilife/data', items };
      const html = renderHtml(React.createElement(HealthTable, { title: '样例', phase: 'ready', report, error: null }));
      const okLine = (html.match(/data-ilife-health="ok"[\s\S]{0,600}/) ?? [''])[0];
      assert.ok(okLine.includes(STATUS_COLOR.green), '正常那一行没有绿点：绿＝正常这一档在屏上不存在');
      assert.ok(okLine.includes('正常 1 条'), '正常那条的计数没印出来');
      assert.ok(okLine.includes('正常的甲'), '正常项的名字没印出来（票面：一条不少）');
      assert.equal((okLine.match(/data-ilife-health="ok-item"/g) || []).length, 1, '正常项还是该收成一行小字');
    });

    it('落点可执行：卡片里印得出整条基目录（行内的「…/」接在它后面）', () => {
      const report = {
        skill: 'x',
        configPath: 'C:/Users/me/.ilife/bill.yaml',
        dataDir: 'C:/Users/me/.ilife/data',
        items: [{ id: 'a', title: '数据目录', status: 'red', message: '不在：C:/Users/me/.ilife/data', action: '先建这个目录。', source: '默认值' }],
      };
      const html = renderHtml(React.createElement(HealthTable, { title: '样例', phase: 'ready', report, error: null }));
      assert.ok(html.includes('落点根目录：C:/Users/me/.ilife/data'), '屏上没有整条落点根目录，「去哪修：先建这个目录」就落不到实处');
      assert.ok(html.includes('…/data'), '行内仍然该缩（不许把长路径堆回正文）');
    });
  });

  describe('D 同一份数据（结构断言）', () => {
    it('产物里只有一处取数口：顶部汇总与各家表都不自己调通道', () => {
      const occurrences = CLIENT.split('config.check').length - 1;
      assert.equal(occurrences, 1, '「config.check」在产物里出现 ' + String(occurrences) + ' 次：取数口必须只有一处');
      // 只数那个字符串不够（两处都调 loadHealthReports 也仍然只出现一次）。真正要咬的性质是
      // 「取数的调用点只有一处」——在**源码**上数：取数件里调一次，渲染件里一次都不许有。
      const PANEL = readFileSync(join(HERE, '..', 'src', 'health-panel.ts'), 'utf8');
      assert.equal((PANEL.match(/loadHealthReports\(/g) || []).length, 1, '取数件里 loadHealthReports 的调用点必须只有一处');
      const VIEW = readFileSync(join(HERE, '..', 'src', 'health-view.ts'), 'utf8');
      assert.equal((VIEW.match(/loadHealthReports|config\.check/g) || []).length, 0, '渲染件不许自己取数（它只吃传进来的报告）');
      assert.ok(CLIENT.includes('体检一次'), '产物里没有那个按钮');
      // 「只看不改」从屏上撤到按钮悬停里了（票 #732：它原先和两排圆点的图例挤在一行）。
      // 这句话本身不许消失——它是这个功能的口径，悬停是它现在唯一的出口。
      assert.ok(CLIENT.includes('只看不改'), '产物里没有「只看不改」那句口径');
    });

    it('各家注册时交出的通道进了账本投影（channel 是页签槽 options 的一格）', () => {
      assert.ok(CLIENT.includes('channel'), '产物里没有读通道那一格');
    });

    it('票面第一条（正常的收成一行、有问题的才展开）：绿条不印「一句话」，红黄条才印', () => {
      const items = [
        { id: 'a', title: '正常的甲', status: 'green', message: '在且能写。', action: '', source: '配置文件' },
        { id: 'b', title: '正常的乙', status: 'green', message: '能解析。', action: '', source: '配置文件' },
        { id: 'c', title: '要处理的丙', status: 'yellow', message: '还没配。', action: '去配置页填。', source: '默认值' },
      ];
      const report = { skill: 'x', configPath: 'C:/x.yaml', dataDir: 'C:/data', items };
      const html = renderHtml(React.createElement(HealthTable, { title: '样例', phase: 'ready', report, error: null }));
      // ① 一条不少：三条都印出来了（绿的两条收在「正常 N 条」那一行里，红黄的一条一块）
      for (const item of items) assert.ok(html.includes(item.title), '面板上没印出这一条：' + item.title);
      assert.ok(html.includes('正常 2 条'), '正常那一档没收成一行');
      assert.equal((html.match(/data-ilife-health="item"/g) || []).length, 1, '只有要处理的那一条该展开成块');
      assert.equal((html.match(/data-ilife-health="ok-item"/g) || []).length, 2, '正常的两条该收在那一行里');
      // ② 绿条的一句话与「去哪修」都不印（收成一行），红黄条的印
      assert.ok(!html.includes('在且能写。'), '绿条还印了「一句话」，没收成一行');
      assert.ok(!html.includes('能解析。'), '绿条还印了「一句话」，没收成一行');
      assert.ok(html.includes('还没配。'), '红黄条没印「一句话」');
      assert.ok(html.includes('去哪修：去配置页填。'), '红黄条没印「去哪修」');
    });

    it('一个盘上的旁证不许把别的盘的落点缩写全拖没（按根分开算前缀）', () => {
      // 这一条是出图复评里逮到的真缺陷：备忘录那条报里有一条 `D:/ilife/media`（另一个盘），
      // 原先只算「一个总前缀」——于是 C 盘那七八条（明文里全是长路径）一条都没缩，整张表像日志 dump。
      const items = [
        { id: 'a', title: '数据目录', status: 'red', message: '不在：C:/Users/me/.ilife/data', action: 'x', source: '默认值' },
        { id: 'b', title: '媒体目录', status: 'yellow', message: '配了但目录不在：D:/ilife/media。', action: 'x', source: '配置文件' },
      ];
      const report = { skill: 'x', configPath: 'C:/Users/me/.ilife/memo.yaml', dataDir: 'C:/Users/me/.ilife/data', items };
      const html = renderHtml(React.createElement(HealthTable, { title: '样例', phase: 'ready', report, error: null }));
      assert.ok(html.includes('落点根目录：C:/Users/me/.ilife/data'), '卡片头没有整条落点根目录（「…/」就没有可照抄的去处）');
      assert.ok(html.includes('不在：…/data'), '报文的 C 盘落点没缩');
      assert.ok(html.includes('配了但目录不在：D:/ilife/media。'), 'D 盘那条只有一条落点，本该原样印（不许瞎缩）');
      // 悬停里留原文（要查证的人悬停能看到整条），所以只断言**可见文字**里不再有行内长路径；
      // 卡片头那行「落点根目录 <整条>（配置文件 <整条>）」是**故意**印的（行内「…/」要有个能照抄的去处）。
      const text = visibleText(html);
      assert.equal((text.match(/C:\/Users\/me\/\.ilife\/data/g) || []).length, 1,
        '落点根目录只该在卡片头出现一次（行内应当全是「…/」）');
    });

    it('同一路径出现在多条报文里时，逐条都缩（不是只缩第一处）', () => {
      const items = [
        { id: 'a', title: '配置文件', status: 'yellow', message: '配置文件还不存在：C:/Users/me/.ilife/bill.yaml。', action: 'x', source: '默认值' },
        { id: 'b', title: '备份目录', status: 'yellow', message: '还没建：C:/Users/me/.ilife/bill.yaml。', action: 'x', source: '默认值' },
      ];
      const report = { skill: 'x', configPath: 'C:/Users/me/.ilife/bill.yaml', dataDir: 'C:/Users/me/.ilife/data', items };
      const html = renderHtml(React.createElement(HealthTable, { title: '样例', phase: 'ready', report, error: null }));
      assert.equal((visibleText(html).match(/…\/bill\.yaml/g) || []).length, 2, '两条报文里各一处，两处都该缩');
      // 卡片头会印整条配置文件路径（故意），故这里只核「两条报文里都不再有明文长路径」：
      assert.equal((visibleText(html).match(/配置文件还不存在：C:\/Users\/me\/\.ilife\/bill\.yaml/g) || []).length, 0,
        '报文里的明文长路径没缩');
    });
  });

  // ── 票 #741（维护者真机）：「我看他是所有插件全部体检好后全量提示出来的」。上一手把「一家落定就回调一次」
  // 加到了取数口（B 组咬了「回调先到」），但**面板这一格一直没人守**：把 `health-panel.ts` 改回「攒齐了一次
  // 写」——也就是真机看到的那条写法——B 组照样绿。这一组把判据量到**屏上**：物化真产物
  // （`dist/client.js`，与 `client-bundle-48.test.mjs` 同一套 classic 执行）＋ hooks 替身把整段面板跑起来
  // ＋ 假传输口让一家立刻回、另一家挂着 ⇒ 这时元素树里必须**已经有**先回来那家的读数。
  describe('G 按家增量绘制（#741）：慢那家还挂着时，快那家在屏上', () => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    /** 树遍历式渲染 ＋ 按**组件身份**存 hook：替身没有 React 的调和，用身份当键，重复调用也不会错位。 */
    function makePaint() {
      const stores = new Map();
      const stack = [];
      const cursors = [];
      const slotOf = (init) => {
        const component = stack[stack.length - 1];
        const index = cursors[cursors.length - 1]++;
        let store = stores.get(component);
        if (store === undefined) { store = []; stores.set(component, store); }
        if (!(index in store)) store[index] = typeof init === 'function' ? init() : init;
        return { store, index };
      };
      const React = {
        createElement(type, props, ...children) {
          const own = { ...(props ?? {}) };
          if (children.length === 1) own.children = children[0];
          else if (children.length > 1) own.children = children;
          return { type, props: own };
        },
        Fragment: Symbol('Fragment'),
        useId: () => 'g741',
        useRef(init) {
          const { store, index } = slotOf({ current: init === undefined ? null : init });
          return store[index];
        },
        useState(init) {
          const { store, index } = slotOf(init);
          return [store[index], (next) => {
            const value = typeof next === 'function' ? next(store[index]) : next;
            if (value !== store[index]) store[index] = value;
          }];
        },
        // 替身不跑副作用（不引第二层取数、不轮询）：这一组要的是「状态到屏」这一段链。
        useEffect() { slotOf(null); },
        useCallback: (fn) => fn,
        useMemo: (fn) => fn(),
      };
      const VOID_TAGS = new Set(['br', 'hr', 'img', 'input']);
      const UNITLESS = new Set(['fontWeight', 'lineHeight', 'flex', 'opacity', 'zIndex']);
      const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
      const css = (style) => Object.entries(style).filter(([, value]) => value !== null && value !== undefined && value !== '')
        .map(([k, value]) => kebab(k) + ':' + (typeof value === 'number' && !UNITLESS.has(k) ? value + 'px' : String(value))).join(';');
      const paint = (node) => {
        if (node === null || node === undefined || node === false || node === true) return '';
        if (typeof node === 'string' || typeof node === 'number') return esc(node);
        if (Array.isArray(node)) return node.map(paint).join('');
        const { type, props } = node;
        if (typeof type === 'function') {
          stack.push(type);
          cursors.push(0);
          try {
            return paint(type({ ...props }));
          } finally {
            stack.pop();
            cursors.pop();
          }
        }
        if (type === React.Fragment) return paint(props.children);
        if (typeof type !== 'string') return '';
        const attrs = [];
        if (props.style) attrs.push('style="' + esc(css(props.style)) + '"');
        for (const [k, value] of Object.entries(props)) {
          if (k === 'children' || k === 'style' || k === 'key' || k === 'ref' || typeof value === 'function') continue;
          if (value === null || value === undefined || value === false) continue;
          if (value === true) { attrs.push(k); continue; }
          attrs.push(k + '="' + esc(value) + '"');
        }
        const open = '<' + type + (attrs.length ? ' ' + attrs.join(' ') : '');
        return VOID_TAGS.has(type) ? open + ' />' : open + '>' + paint(props.children) + '</' + type + '>';
      };
      return { React, paint };
    }

    it('慢那家还挂在传输口上时，先回来那家的读数已经在元素树里（面板改回「攒齐了一次写」必红）', async () => {
      const { React, paint } = makePaint();
      // ① 物化真产物，捕获注册进 `settings.section` 的那颗组件（与 client-bundle-48 同一套 classic 执行）
      const registrations = [];
      // 沙箱里除了 loader 桩，还要给上**浏览器本来就有**的那几个宿主全局：取数口用 `AbortSignal.timeout`
      // 兜超时，vm 的干净上下文里没有它（少了这一个，两家会当场都报「体检没跑起来」）。
      const sandbox = {
        window: { __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } },
        AbortSignal, setTimeout, clearTimeout, console,
      };
      // 调试图与出图台的取数口都挂在产物自己的 `globalThis` 上（沙箱全局）：沙箱外写、产物里读。
      sandbox.__T706_RUN__ = [];
      let face = null;
      sandbox.__T706_FACE_SINK__ = (value) => { face = value; };
      vm.createContext(sandbox);
      new vm.Script(CLIENT, { filename: 'client.js' }).runInContext(sandbox);
      assert.equal(registrations.length, 1, '产物应当恰好注册一次');
      let Section = null;
      const bundle = registrations[0].factory((spec) => {
        if (spec === 'react') return React;
        throw new Error('这一组只喂 react 一处外部模块：' + spec);
      });
      assert.equal(typeof bundle.apply, 'function');

      // ② 假传输口：快那家立刻回（红 1）、慢那家挂在一个手动放行的 promise 上（黄 1）
      let release = () => {};
      const slow = new Promise((resolve) => { release = () => resolve({ ok: true, value: report('chef', ['yellow']) }); });
      const calls = [];
      const call = async (base, phone, payload) => {
        calls.push([base, phone, payload === undefined ? null : payload.method]);
        if (payload !== undefined && payload.method === HEALTH_ENDPOINT) {
          return phone === 'ilife-chef' ? slow : { ok: true, value: report('calorie', ['red']) };
        }
        return { ok: false, error: { code: 'not-in-this-guard', message: '这一组只喂体检那条链', details: {} } };
      };
      bundle.apply({
        slots: {
          inject: (_key, cb) => cb(),
          register: (_options, component) => { Section = component; return () => {}; },
          entries: () => [], getVersion: () => 0, subscribe: () => () => {},
        },
        effect: (cb) => cb(),
        connection: { rpc: { call } },
      });
      assert.equal(typeof Section, 'function', '没捕获到注册进 settings.section 的那颗组件');
      const props = {
        useTabs: (selector) => selector([
          { id: 'dsh-calorie', order: 75, label: '卡路里', channel: '/ilife-calorie' },
          { id: 'dsh-chef', order: 90, label: '私家大厨', channel: '/ilife-chef' },
        ]),
        renderSlot: () => null,
        getCall: () => call,
      };

      // ③ 画一遍（面板自己把状态源交到 `__T706_FACE_SINK__` 上），再点一次「体检一次」
      const html0 = paint(Section(props));
      assert.ok(html0.includes('体检一次'), '那行汇总里的「体检一次」没画出来');
      assert.equal(typeof (face === null ? null : face.run), 'function', '面板没把状态源交出来（出图台那条通道没了）');
      face.run(); // ＝那颗按钮的 onClick（`onRun: health.run`）
      await tick();

      // ④ 慢那家还在途：屏上必须只有先回来那一家
      const htmlMid = paint(Section(props));
      const visibleMid = htmlMid.replace(/<[^>]*>/g, '|');
      assert.ok(htmlMid.includes('体检中…'),
        '整批还没落定，汇总行应当仍写着「体检中…」；现在是：' + visibleMid.slice(0, 400)
        + ' ／ diag=' + JSON.stringify(sandbox.__T706_RUN__) + ' ／ face=' + JSON.stringify(Object.keys(face.rows)));
      assert.equal((htmlMid.match(/data-ilife-health="tab-note"/g) || []).length, 1,
        '两家里只有先回来那一家该带读数（攒齐了一起画就是 0 家）');
      const mark = htmlMid.indexOf('aria-controls="g741-panel-dsh-calorie"');
      assert.ok(mark > 0, '没找到卡路里那颗页签');
      assert.ok(htmlMid.slice(mark, htmlMid.indexOf('</button>', mark)).includes('红 1'),
        '先回来那一家的读数没长在它自己那颗页签上：' + htmlMid.slice(mark, mark + 240));
      assert.ok(!htmlMid.includes('黄 1'), '慢那家还在途，它的读数不该已经在屏上');
      assert.deepEqual(sandbox.__T706_RUN__.filter((line) => line.startsWith('row=')), ['row=dsh-calorie ok=true err=null'],
        '调试图也该是陆续写的：' + JSON.stringify(sandbox.__T706_RUN__));

      // ⑤ 放行慢那家：它也长出来，running 收掉，两家各一通电话
      release();
      await tick();
      await tick();
      const htmlEnd = paint(Section(props));
      assert.equal((htmlEnd.match(/data-ilife-health="tab-note"/g) || []).length, 2, '慢那家落定后也该长出自己的读数');
      assert.ok(htmlEnd.includes('黄 1'), '慢那家的读数没画出来');
      assert.ok(!htmlEnd.includes('体检中…'), '全部落定后不该还写着「体检中…」');
      assert.ok(sandbox.__T706_RUN__.includes('rows=2 err=null first=null'),
        '渲染台那条收尾调试图变了：' + JSON.stringify(sandbox.__T706_RUN__));
      assert.equal(calls.filter((one) => one[2] === HEALTH_ENDPOINT).length, 2, '两家各一通体检电话');
    });
  });

  // 票 #732：体检结果长到页签上——红黄的家名后带一枚小数字，绿与没跑过不带。
  // 这一组是**视觉改版的机器判据**：改坏「哪几家带数字」这件事，这里必须变红。
  describe('F 页签上那枚小数字（#732）', () => {
    const light = (status, counts, hasChannel = true) => ({ id: 'x', title: 'X', status, counts, hasChannel });
    const allGreen = { red: 0, yellow: 0, green: 3 };

    it('只有红黄那几家带数字：红优先于黄，全绿与没跑过都不带', () => {
      assert.deepEqual(tabNote(light('red', { red: 2, yellow: 1, green: 0 })), { status: 'red', text: '红 2' },
        '红黄都有时该报红那一档（圆点已经按最严重的档上色了）');
      assert.deepEqual(tabNote(light('yellow', { red: 0, yellow: 1, green: 2 })), { status: 'yellow', text: '黄 1' });
      assert.equal(tabNote(light('green', allGreen)), null, '全绿不该带数字');
      assert.equal(tabNote(light(null, allGreen)), null, '还没体检不该带数字');
      assert.equal(tabNote(light('red', { red: 1, yellow: 0, green: 0 }, false)), null, '没有体检出口的那家不该带数字');
    });

    it('数字那份文案与色标同源：红黄各归各的档，绿与缺席才显 —', () => {
      assert.deepEqual(countSegsOf(light('red', { red: 2, yellow: 1, green: 0 })), [
        { status: 'red', text: '红 2' },
        { status: 'yellow', text: '黄 1' },
      ]);
      assert.deepEqual(countSegsOf(light('green', allGreen)), [{ status: 'green', text: '绿' }]);
      assert.deepEqual(countSegsOf(light(null, allGreen)), [{ status: null, text: '—' }], '没跑过显 —（不冒充绿）');
    });

    it('页签圆点：装了按档上色、没跑过显灰、没装显缺席态', () => {
      // 圆点取的是**灯色**（STATUS_COLOR，跳的那一档），不是文字用的深色（STATUS_TEXT）——
      // 页签上那枚点是「一眼看见」，压在深色主题的页签上要够亮。
      assert.equal(tabDotColor(light('red', { red: 1, yellow: 0, green: 0 })), STATUS_COLOR_DIST.red);
      assert.equal(tabDotColor(light('yellow', { red: 0, yellow: 1, green: 0 })), STATUS_COLOR_DIST.yellow);
      assert.equal(tabDotColor(light('green', allGreen)), STATUS_COLOR_DIST.green);
      assert.equal(tabDotColor(light(null, allGreen)), TAB_DOT.unchecked, '装了但没体检：灰点');
      assert.equal(tabDotColor(light(null, allGreen, false)), TAB_DOT.absent, '没装：缺席态');
    });

    it('「没装」与「装了没跑过」必须一眼看得出是两件事（同色＝这一行的意义没了）', () => {
      // 注意这里**别写 `assert.notEqual`**：strict 子模块里它绑的是 `notStrictEqual`，两个不可比的值之间
      // 会退化成 NaN 比较（NaN != NaN 判真），明明同色也不抛——变异自证时实测栽过一次。
      assert.ok(TAB_DOT.absent !== TAB_DOT.unchecked, '缺席（没装）与没跑过（装了没体检）不许同色');
      const absent = light(null, { red: 0, yellow: 0, green: 0 }, false);
      const unchecked = light(null, { red: 0, yellow: 0, green: 0 }, true);
      assert.ok(tabDotColor(absent) !== tabDotColor(unchecked), '两态画出来的点不许是同一个颜色');
      // 两态都不带数字（绿也不带）：页签上那枚小数字只属于红黄。
      assert.equal(tabNote(absent), null);
      assert.equal(tabNote(unchecked), null);
    });

    it('顶部那一行按状态换话：全绿说「六家正常」、没跑过说「还没体检」、有红黄报总账', () => {
      const line = (lights) => visibleText(renderHtml(
        React.createElement(HealthSummaryLine, { lights, running: false, error: null, onRun: () => {} }),
      ));
      const normal = light('green', { red: 0, yellow: 0, green: 5 });
      assert.match(line([normal, { ...normal, id: 'y' }]), /配置体检.*六家正常.*体检一次/, '全绿那一档没把话写对');
      assert.match(line([light(null, allGreen)]), /还没体检/, '没跑过那一档没把话写对');
      const text = line([light('red', { red: 2, yellow: 3, green: 0 })]);
      assert.match(text, /红 2/, '总账里没有红计数');
      assert.match(text, /黄 3/, '总账里没有黄计数');
      assert.match(text, /要处理/, '红黄都在时没有「要处理」那句');
    });

    // 票 #735：这两态共用一句「还没体检」时，用户与诊断都会被引到「点了没跑」上去——
    // 而「没有体检出口」那一态的真相是**按钮按下去不会有任何反应**。
    it('「没有体检出口」与「还没跑过」不许同话（#735）', () => {
      const line = (lights) => visibleText(renderHtml(
        React.createElement(HealthSummaryLine, { lights, running: false, error: null, onRun: () => {} }),
      ));
      const notRun = line([light(null, allGreen, true), { ...light(null, allGreen, true), id: 'y' }]);
      const noOutlet = line([light(null, allGreen, false), { ...light(null, allGreen, false), id: 'y' }]);
      assert.match(notRun, /还没体检/, '没跑过那一档没把话写对');
      assert.match(noOutlet, /没有体检出口/, '一家出口都没有时，那句「没有体检出口」没说出来');
      assert.ok(noOutlet !== notRun, '两态画出来的话不许逐字相同');
      assert.ok(!/还没体检/.test(noOutlet), '「没有出口」那一态不许再用「还没体检」这句');
      // 只有部分家没有出口时，尾巴也要把「几家没有出口」数出来。
      const mixed = line([light('green', { red: 0, yellow: 0, green: 2 }), { ...light(null, allGreen, false), id: 'y' }]);
      assert.match(mixed, /1 家没有体检出口/, '混合态没把「几家没有出口」数出来');
    });

    it('顶部不再是一家一盏灯按钮（改版后在位的那件事，守着别长回去）', () => {
      assert.ok(CLIENT.includes('data-ilife-health'), '产物里没有体检的标记位');
      assert.ok(CLIENT.includes('"summary"'), '产物里没有那一行汇总');
      assert.ok(CLIENT.includes('tab-note'), '产物里没有页签上那枚小数字');
      assert.ok(CLIENT.includes('tab-dot'), '产物里没有页签圆点');
      assert.ok(CLIENT.includes('TAB_DOT'), '产物里没有页签圆点的缺席态');
      assert.ok(!CLIENT.includes('"lights"'), '产物里又长回了「一排灯按钮」那一层');
    });
  });

  describe('E 全量对齐门', () => {
    // 体检会读盘（`configPaths` 在测试运行器里没设隔离即响亮报错），故整段先立隔离基座。
    const base = setupConfigTestBase();
    it('六家合起来 48 条都在（通用 5×6 ＋ 各家特有 18）', async () => {
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
      assert.equal(total, 48, '报告条数＝通用 5×6 ＋ 各家特有 18（四家各撤掉一条探包内 `src/` 的）：现在数是 ' + String(total));
      assert.equal(unique, 18, '各家特有的检查项 18 条（大厨／居家／备忘／作息 各撤掉一条）：现在数是 ' + String(unique));
    });

    it('六家通用那 5 条每家都齐（形状一样，一条不少）', () => {
      const common = EXPECT.calorie.slice(0, 5);
      for (const [skill, expected] of Object.entries(EXPECT)) {
        for (const id of common) {
          assert.ok(expected.includes(id), skill + ' 缺通用那条：' + id);
        }
      }
    });

    it('包内固定件那四条已整条删除：报告里不许再冒出这四个 id', async () => {
      // 原先这条守的是：大厨／备忘「场景资产」、居家「种子分类」、作息「分类允许清单」这四条包内固定件
      // 按检查表是「不在＝红」，不许被下调成黄。四条已整条删除——判据探的是包内 `src/` 下的文件，而各家
      // `files` 只发 `dist`／`SKILL.md`／`templates` ⇒ 装机态里恒定红、用户也不可达。删项之后这一层
      // 改守另一件事：**不许把它们加回来**——加回来，装机态每家又恒挂一条红报告，而面板看不见原因。
      const { builders, missing } = await loadBuilders();
      assert.deepEqual(missing, [], '这几家的 dist/health.js 还没构建好：' + missing.join('、'));
      const withdrawn = [
        ['chef', 'scenarios.file'], ['home', 'seed.file'],
        ['memo', 'scenarios.file'], ['schedule', 'whitelist.file'],
      ];
      for (const [skill, id] of withdrawn) {
        const item = builders[skill]().items.find((one) => one.id === id);
        assert.equal(item, undefined, skill + ' 又长回了那条探包内 `src/` 的检查项：' + id);
      }
    });

    base.cleanup();
  });
});
