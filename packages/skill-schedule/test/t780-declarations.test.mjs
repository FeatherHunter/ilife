// #780 Layer1 · 声明对账：五域声明与旧三表（WAKE_TABLE／形状表／模板表）逐件相等。
// 只读行为不断言，失败即停（过渡期双源由本件机守，Layer2 删旧表时本件退役旧表半边）。
import { test } from 'node:test';
import assert from 'node:assert/strict';

const CAPS = ['write', 'query', 'plan', 'analyze', 'admin'];
const EXPECTED_KEYS = [
  'schedule.record.write',
  'schedule.record.today', 'schedule.record.range', 'schedule.record.detail', 'schedule.plan.today',
  'schedule.plan.write', 'schedule.record.compare', 'schedule.help.lookup',
].sort();
const EXPECTED_SHAPES = {
  'schedule.record.write': 'receipt', 'schedule.plan.write': 'receipt',
  'schedule.record.today': 'list', 'schedule.plan.today': 'list', 'schedule.help.lookup': 'list',
  'schedule.record.range': 'stat', 'schedule.record.detail': 'detail', 'schedule.record.compare': 'analysis',
};
const CMDS_EXPORT = { write: 'WRITE_COMMANDS', query: 'QUERY_COMMANDS', plan: 'PLAN_COMMANDS', analyze: 'ANALYZE_COMMANDS', admin: 'ADMIN_COMMANDS' };
const ROUTES_EXPORT = { write: 'WRITE_ROUTES', query: 'QUERY_ROUTES', plan: 'PLAN_ROUTES', analyze: 'ANALYZE_ROUTES', admin: 'ADMIN_ROUTES' };

test('780a · 五域各恰导一个声明数组＋index 转出', async () => {
  for (const c of CAPS) {
    const cmds = await import('../dist/' + c + '/commands.js');
    const routes = await import('../dist/' + c + '/routes.js');
    const idx = await import('../dist/' + c + '/index.js');
    assert.deepEqual(Object.keys(cmds).filter((k) => Array.isArray(cmds[k])), [CMDS_EXPORT[c]], c);
    assert.deepEqual(Object.keys(routes).filter((k) => Array.isArray(routes[k])), [ROUTES_EXPORT[c]], c);
    assert.ok(Array.isArray(idx[CMDS_EXPORT[c]]), c + '/index 须转出声明数组');
    assert.ok(Array.isArray(idx[ROUTES_EXPORT[c]]), c + '/index 须转出路由数组');
  }
});

test('780b · 键集恰为八键＋形状与旧表一致', async () => {
  const all = [];
  for (const c of CAPS) {
    const cmds = await import('../dist/' + c + '/commands.js');
    for (const s of cmds[CMDS_EXPORT[c]]) {
      all.push(s);
      assert.ok(s.title !== '', s.key);
      assert.ok(s.wakeWord !== '', s.key);
      assert.ok(s.example.includes(s.key), s.key + ' 示例须含命令名');
      assert.equal(typeof s.run, 'function', s.key);
      if (s.kind === 'write') continue;
      assert.ok(s.shape !== '', s.key);
    }
  }
  assert.deepEqual(all.map((s) => s.key).sort(), EXPECTED_KEYS);
  const { SCHEDULE_KEY_SHAPES } = await import('../dist/render/index.js');
  for (const k of EXPECTED_KEYS) assert.equal(SCHEDULE_KEY_SHAPES[k], EXPECTED_SHAPES[k], k);
  const { templateFor } = await import('../dist/render/index.js');
  for (const k of EXPECTED_KEYS) assert.ok(templateFor(k) !== '', k + ' 须有模板映射');
});

test('780c · 代表唤醒词是本键路由真词＋路由键不出本域', async () => {
  for (const c of CAPS) {
    const cmds = await import('../dist/' + c + '/commands.js');
    const routes = await import('../dist/' + c + '/routes.js');
    const keys = new Set(cmds[CMDS_EXPORT[c]].map((s) => s.key));
    const phrases = new Map(routes[ROUTES_EXPORT[c]].map((e) => [e.phrase, e.key]));
    for (const s of cmds[CMDS_EXPORT[c]]) {
      assert.equal(phrases.get(s.wakeWord), s.key, s.key + ' 的代表词须路由回本键');
    }
    for (const e of routes[ROUTES_EXPORT[c]]) {
      assert.ok(keys.has(e.key), c + ' 的路由键须住本域：' + e.key);
    }
  }
});

test('780d · 归并路由自洽：order 连续＋派生 WAKE_TABLE 相等', async () => {
  const { WAKE_TABLE } = await import('../dist/policy/index.js');
  const { SCHEDULE_ROUTES } = await import('../dist/triggers/routes.generated.js');
  const merged = [];
  for (const c of CAPS) {
    const routes = await import('../dist/' + c + '/routes.js');
    merged.push(...routes[ROUTES_EXPORT[c]]);
  }
  merged.sort((x, y) => x.order - y.order);
  assert.equal(merged.length, 48);
  assert.deepEqual(merged.map((e) => e.order), merged.map((_, i) => i));
  assert.equal(merged[0].phrase, '作息管家 HELP');
  assert.equal(merged[merged.length - 1].phrase, '复盘');
  // 派生正确性：WAKE_TABLE 须逐条等于生成物映射（含顺序；历史顺序锚由快照门守字节）。
  assert.equal(WAKE_TABLE.length, SCHEDULE_ROUTES.length);
  for (let i = 0; i < merged.length; i++) {
    assert.equal(WAKE_TABLE[i].phrase, SCHEDULE_ROUTES[i].phrase, 'order ' + i);
    assert.equal(WAKE_TABLE[i].key, SCHEDULE_ROUTES[i].key, 'order ' + i);
  }
  for (let i = 0; i < merged.length; i++) {
    assert.equal(merged[i].phrase, WAKE_TABLE[i].phrase, 'order ' + i);
    assert.equal(merged[i].key, WAKE_TABLE[i].key, 'order ' + i);
    assert.deepEqual(merged[i].needs === undefined ? undefined : [...merged[i].needs], WAKE_TABLE[i].needs, 'order ' + i);
    assert.deepEqual(merged[i].preset === undefined ? undefined : merged[i].preset, WAKE_TABLE[i].preset, 'order ' + i);
  }
});
