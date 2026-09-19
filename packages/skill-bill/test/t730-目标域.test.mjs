/** #730 · goal 域（设定预算／设定目标／看预算／看目标）的靶向测试：**缝＝真出口**
 *  （spawn `dist/cli/cmd_read.js` ＋ `--html` 读回落盘页）。
 *
 * 钉五件事（票面判据逐条）：
 *   ① 4 条唤醒词（设定预算／设定目标／看预算／看目标）逐条真跑：exit 0、产物落盘、字段正确；
 *   ② **进度条与三态**（判据 2）：进度百分比双端夹取（负值不得画出负宽度）；月底预测三态各自跑得出来
 *      （阈值 ±0.01）；超支项为 0 时出「✓ 无」而不是一行 0；
 *   ③ **阻断页**：缺项与「同月同类预算已存在」都走同一条路径（exit 0、`ok:false`、不写库、逐项点名）；
 *   ④ 目标表口径照老侧：预算按月 ＋ 分类 L1 前缀匹配；目标期＝创建当月起 ~ 截止日（或今天）、已存＝期内净额；
 *   ⑤ 命令面：两条键进注册表、形状由注册表派生、4 条词路由到本域（域声明是唯一事实源）。
 *
 * 「今天」钉在 2026-09-15（`helpers/config-base.mjs` 的 `freezeClock`）：月底预测三态与目标期算法都要一个
 * 固定的今天，否则判据随真实日期漂移。
 *
 * 运行：先 `pnpm build`，再 `node --test packages/skill-bill/test/t730-目标域.test.mjs`。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv, freezeClock } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => { const p = spawnSync(c, ['--version'], { encoding: 'utf8' }); return p.status === 0 && /^v\d+/.test((p.stdout || '').trim()); }) ?? process.execPath;
const TODAY = '2026-09-15';

const P = (o) => JSON.stringify(o);
/** 一次真跑：配置基座 ＋ 钉钟（今天＝2026-09-15）。 */
function run(dir, args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(dir, freezeClock(TODAY)) });
}
function envOf(r) {
  const last = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
  try { return JSON.parse(last); } catch (e) { throw new Error('stdout 末行非 envelope：' + last + '｜stderr=' + r.stderr); }
}
function mkdir(tag) { return mkdtempSync(join(tmpdir(), tag)); }
/** 跑一页并断言「落盘 ＋ 是整页 ＋ 字节如实」；返回 {env, text}。 */
function page(dir, args, file) {
  const r = run(dir, [...args, '--html', file]);
  assert.equal(r.status, 0, args.join(' ') + ' 应 exit 0：' + r.stderr);
  const env = envOf(r);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  assert.ok(env.delivery && isAbsolute(env.delivery.path), '回执须带绝对路径的 delivery.path');
  assert.equal(resolve(env.delivery.path), resolve(file));
  const text = readFileSync(file, 'utf8');
  assert.match(text, /<!doctype html>/i, '产物应是整页');
  assert.equal(statSync(file).size, env.delivery.bytes, 'delivery.bytes 须如实');
  return { env, text };
}
/** 页面上屏的正文（剔掉公共层样式段：每个块位的类名都在那里，留着会一路假绿）。 */
const body = (text) => text.replace(/<style[\s\S]*?<\/style>/gi, '');
/** 一个库：先落几条账单再设预算／目标（都走真出口）。 */
function seed(tag, bills) {
  const dir = mkdir(tag);
  for (const b of bills) {
    const r = run(dir, ['bill.record.add', '--params', P(b)]);
    assert.equal(r.status, 0, 'seed 失败：' + b.category + ' ' + r.stderr);
  }
  return dir;
}
const goalsOf = (dir) => JSON.parse(readFileSync(join(dir, 'goals.json'), 'utf8'));

let OUT;
before(() => { OUT = mkdir('t730-html-'); });

describe('#730 · goal 域：4 条唤醒词端到端', () => {
  it('设定预算：缺项出采集页（不写库）→ 齐了写库出回执页 → 冲突出阻断页 → 确认覆盖成功', () => {
    const dir = seed('t730-b-', [
      { category: '餐饮/外卖', amount: -900, time: '2026-09-05 12:00:00', account: '支付宝' },
      { category: '出行/地铁', amount: -600, time: '2026-09-08 08:00:00', account: '支付宝' },
    ]);
    const collect = page(dir, ['bill.goal.write', '--params', P({ op: 'set-budget' })], join(OUT, 'b-collect.html'));
    assert.equal(collect.env.data.ok, false, '缺项那一次 ok 应为 false');
    assert.ok(body(collect.text).includes('ilife-block-param-form'), '采集页要有字段卡');
    assert.ok(collect.text.includes('还差 1 项'), '缺项数应点名');
    assert.ok(!/<nav[^>]*aria-label="页内导航"/.test(collect.text), '过程型采集页不出页内导航');
    assert.ok(!existsSync(join(dir, 'goals.json')), '缺项那一次不该落预算表');

    const done = page(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 2500 })], join(OUT, 'b-receipt.html'));
    assert.equal(done.env.data.ok, true);
    assert.equal(done.env.data.receipt.affectedRows, 1, '目标表那一层报一处改动');
    assert.equal(done.env.data.receipt.overwritten, null, '首次设定没有覆盖');
    assert.match(done.text, /<nav[^>]*aria-label="页内导航"/, '结果型回执页要出页内导航');
    assert.ok(done.text.includes('数据来源'), '恒出来源脚注');
    const g = goalsOf(dir);
    assert.equal(g.budgets.length, 1);
    assert.deepEqual([g.budgets[0].month, g.budgets[0].category, g.budgets[0].amount], ['2026-09', '', 2500]);
    assert.match(String(g.budgets[0].created_at), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'created_at 形态');

    const conflict = page(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3500 })], join(OUT, 'b-conflict.html'));
    assert.equal(conflict.env.data.ok, false, '同月同类已存在应走阻断页（不是一句错误串）');
    assert.ok(conflict.text.includes('同月同类预算已存在') && conflict.text.includes('2500.00'), '阻断要点名原来那条');
    assert.equal(goalsOf(dir).budgets.length, 1, '冲突那一次不该写库');

    const forced = page(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 3500, force: true })], join(OUT, 'b-overwrite.html'));
    assert.equal(forced.env.data.ok, true);
    assert.equal(forced.env.data.receipt.overwritten.amount, 2500, '回执要带被覆盖那条');
    assert.ok(forced.text.includes('被这一条替掉的旧预算'), '回执要有覆盖对照块');
    const g2 = goalsOf(dir);
    assert.equal(g2.budgets.length, 1, '覆盖＝删旧加新，仍只剩一条');
    assert.equal(g2.budgets[0].amount, 3500);
  });

  it('设定预算 · 金额非正数与月份形态不认：两条都进阻断表', () => {
    const dir = mkdir('t730-b2-');
    const neg = page(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', amount: -5 })], join(OUT, 'b-neg.html'));
    assert.equal(neg.env.data.ok, false);
    assert.ok(neg.text.includes('要写正数'), '负数金额要点名');
    const bad = page(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', amount: 100, month: '8月' })], join(OUT, 'b-badmonth.html'));
    assert.equal(bad.env.data.ok, false);
    assert.ok(bad.text.includes('年-月'), '月份形态要点名');
  });

  it('设定目标：缺项出采集页 → 齐了写库出回执页（目标名／金额／截止日都落盘）', () => {
    const dir = mkdir('t730-s-');
    const collect = page(dir, ['bill.goal.write', '--params', P({ op: 'set-saving' })], join(OUT, 's-collect.html'));
    assert.equal(collect.env.data.ok, false);
    assert.ok(collect.text.includes('还差 2 项'), '目标名与金额都缺＝两项');
    assert.ok(!existsSync(join(dir, 'goals.json')), '缺项那一次不该落目标表');

    const done = page(dir, ['bill.goal.write', '--params', P({ op: 'set-saving', name: '换手机', amount: 10000, deadline: '2026-12-31' })], join(OUT, 's-receipt.html'));
    assert.equal(done.env.data.ok, true);
    assert.ok(done.text.includes('换手机') && done.text.includes('10000.00') && done.text.includes('2026-12-31'));
    const g = goalsOf(dir);
    assert.equal(g.savings.length, 1);
    assert.deepEqual([g.savings[0].name, g.savings[0].amount, g.savings[0].deadline], ['换手机', 10000, '2026-12-31']);
  });

  it('看预算：一整页（读数／进度卡／占比条／导航／口径行／脚注），实际支出按当月负数记录算', () => {
    const dir = seed('t730-bv-', [
      { category: '餐饮/外卖', amount: -1200, time: '2026-09-05 12:00:00', account: '支付宝' },
      { category: '出行/地铁', amount: -300, time: '2026-09-08 08:00:00', account: '支付宝' },
      { category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', account: '招行卡' },
    ]);
    assert.equal(run(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 2500 })]).status, 0);
    const { env, text } = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })], join(OUT, 'b-view.html'));
    const d = env.data;
    assert.equal(d.total, 1);
    assert.equal(d.items[0].actual, 1500, '实际支出＝当月负数记录（收入不算）');
    assert.equal(d.items[0].count, 2, '笔数只数支出那两笔');
    assert.equal(d.totals.budget, 2500);
    assert.equal(d.totals.over_count, 0, '没有超支项');
    assert.ok(body(text).includes('ilife-block-kpi-card-bar-fill'), '要有进度条');
    assert.ok(body(text).includes('ilife-block-dist-row'), '要有占比条');
    assert.match(text, /<nav[^>]*aria-label="页内导航"/);
    assert.match(text, /数据来源 · .+ · .+ → .+ · 共 3 条/, '来源脚注要写清窗口与条数');
  });

  it('看预算 · 判据 2：超支项为 0 出「✓ 无」；进度百分比双端夹取', () => {
    const dir = seed('t730-over-', [
      { category: '餐饮/外卖', amount: -1200, time: '2026-09-05 12:00:00', account: '支付宝' },
      { category: '餐饮/堂食', amount: -300, time: '2026-09-06 12:00:00', account: '支付宝' },
    ]);
    assert.equal(run(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount: 1000 })]).status, 0);
    const { text } = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })], join(OUT, 'b-over.html'));
    assert.ok(text.includes('超过 100%'), '口径行要写清夹取口径');
    assert.ok(text.includes('进度 100.0%'), '超支时上屏百分比应夹到 100.0%');
    assert.ok(!text.includes('进度 150.0%'), '不该把 150% 直接上屏');
    assert.ok(text.includes('超出 500.00 元'), '夹取之后仍要说清超出多少');
    const width = /class="ilife-block-kpi-card-bar-fill[^"]*" style="width:(\d+(?:\.\d+)?)%"/.exec(body(text));
    assert.ok(width !== null && Number(width[1]) <= 100, '条宽必须落在 0–100%（负宽度那一类病不得回潮）');
  });

  it('看预算 · 判据 2：月底预测三态各自跑得出来（阈值 ±0.01）', () => {
    const cases = [['预计超', 2500, '预计超 500.00 元'], ['预计省', 3500, '预计省 500.00 元'], ['预计持平', 3000, '预计持平']];
    for (const [label, amount, want] of cases) {
      const dir = seed('t730-pj-', [{ category: '餐饮/外卖', amount: -1500, time: '2026-09-05 12:00:00', account: '支付宝' }]);
      assert.equal(run(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', month: '2026-09', amount })]).status, 0);
      const { text } = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })], join(OUT, 'pj-' + amount + '.html'));
      assert.ok(text.includes('按此节奏月底预计'), label + '：缺预测句');
      assert.ok(text.includes(want), label + '：期望「' + want + '」');
    }
  });

  it('看预算 · 过去月预测＝实际、未来月不给预测（老侧三态口径）', () => {
    const dir = seed('t730-pj2-', [{ category: '餐饮/外卖', amount: -800, time: '2026-08-05 12:00:00', account: '支付宝' }]);
    for (const [month, amount] of [['2026-08', 1000], ['2026-11', 1000]]) {
      assert.equal(run(dir, ['bill.goal.write', '--params', P({ op: 'set-budget', month, amount })]).status, 0);
    }
    const past = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-08' })], join(OUT, 'pj-past.html'));
    assert.ok(past.text.includes('月底预计 800.00 元') && past.text.includes('预计省 200.00 元'), '过去月应「预测＝实际」');
    const future = page(dir, ['bill.goal.query', '--params', P({ op: 'budget', month: '2026-11' })], join(OUT, 'pj-future.html'));
    assert.ok(!future.text.includes('按此节奏月底预计'), '未来月不该给预测');
  });

  it('看目标：一整页（进度条／月均净存／预计达成日／达标所需月存／占比条）', () => {
    const dir = seed('t730-sv-', [
      { category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', account: '招行卡' },
      { category: '餐饮/外卖', amount: -1000, time: '2026-09-05 12:00:00', account: '支付宝' },
    ]);
    assert.equal(run(dir, ['bill.goal.write', '--params', P({ op: 'set-saving', name: '换手机', amount: 10000, deadline: '2027-06-30' })]).status, 0);
    const { env, text } = page(dir, ['bill.goal.query', '--params', P({ op: 'saving' })], join(OUT, 's-view.html'));
    const item = env.data.items[0];
    assert.equal(item.saved, 7000, '已存＝期内净额（8000 − 1000）');
    assert.equal(item.pct, 70);
    assert.equal(item.monthly_avg, 7000, '月均净存＝已存 ÷ 已过月数（一个月）');
    assert.equal(item.status, 'on_track');
    assert.ok(item.eta !== null, '未达成且月均为正 ⇒ 算得出预计达成月');
    assert.ok(item.needed_monthly > 0, '有截止日且未达成 ⇒ 达标所需月存');
    assert.ok(body(text).includes('ilife-block-kpi-card-bar-fill'), '目标卡要有进度条');
    assert.ok(text.includes('月均净存') && text.includes('截止前达标还需每月'), '两处读数要在');
  });

  it('看目标 · 已达成：状态写「已达成」，不再给预计达成日与达标所需月存', () => {
    const dir = seed('t730-done-', [{ category: '工资/基本工资', amount: 9000, time: '2026-09-01 09:00:00', account: '招行卡' }]);
    assert.equal(run(dir, ['bill.goal.write', '--params', P({ op: 'set-saving', name: '旅行基金', amount: 5000, deadline: '2026-12-31' })]).status, 0);
    const { env, text } = page(dir, ['bill.goal.query', '--params', P({ op: 'saving' })], join(OUT, 's-done.html'));
    assert.equal(env.data.done_count, 1);
    assert.equal(env.data.items[0].status, 'done');
    assert.equal(env.data.items[0].eta, null, '已达成不该有预计达成月');
    assert.ok(text.includes('目标已达成'));
    assert.ok(!text.includes('截止前达标还需每月'), '已达成不该再给达标所需月存');
  });

  it('两页空表都照出完整页（空态句 ＋ 引导句 ＋ 来源脚注；不画全 0 读数卡）', () => {
    const dir = mkdir('t730-empty-');
    for (const [params, emptyWord, file] of [[{ op: 'budget', month: '2026-09' }, '还没有设置预算', 'e-b.html'], [{ op: 'saving' }, '还没有储蓄目标', 'e-s.html']]) {
      const { env, text } = page(dir, ['bill.goal.query', '--params', P(params)], join(OUT, file));
      assert.equal(env.data.total, 0);
      assert.ok(text.includes(emptyWord), '缺空态句');
      assert.ok(text.includes('就能开始'), '空态后要有引导句');
      assert.ok(text.includes('数据来源'), '空表也要有来源脚注');
      assert.ok(!body(text).includes('ilife-block-kpi-card'), '空态不该画读数卡（裁定 6 同判法）');
    }
  });
});

describe('#730 · goal 域：命令面与路由', () => {
  it('两条键进注册表、形状由注册表派生、与域声明对得上', async () => {
    const { REGISTRY, REGISTRY_KEYS } = await import('../dist/cli/registry.js');
    const { BILL_KEY_SHAPES } = await import('../dist/index.js');
    for (const key of ['bill.goal.write', 'bill.goal.query']) {
      assert.ok(REGISTRY_KEYS.includes(key), key + ' 没进注册表');
      assert.equal(BILL_KEY_SHAPES[key], REGISTRY[key].shape, key + ' 的形状须由注册表派生');
      assert.equal(REGISTRY[key].kind, key.endsWith('.write') ? 'write' : 'read');
    }
    assert.equal(REGISTRY['bill.goal.write'].shape, 'receipt');
    assert.equal(REGISTRY['bill.goal.query'].shape, 'list');
  });

  it('4 条唤醒词逐条路由到本域命令；两张落点表各两件，与词条一一对上', async () => {
    const { WAKE_TABLE, routeWakeword, projectWakeWord } = await import('../dist/triggers/wakeTable.js');
    const { GOAL_WRITE_SCENES, GOAL_READ_SCENES } = await import('../dist/goal/scene.js');
    const ctx = { amount: 1, name: 'X' };
    const want = [['设定预算', 'bill.goal.write'], ['设定目标', 'bill.goal.write'], ['看预算', 'bill.goal.query'], ['看目标', 'bill.goal.query']];
    for (const [word, key] of want) {
      assert.equal(routeWakeword(word, ctx).key, key, word + ' 没路由到 ' + key);
      assert.ok(WAKE_TABLE.some((e) => e.phrase === word && e.key === key), word + ' 不在词表里');
    }
    assert.equal(GOAL_WRITE_SCENES.length, 2, '写命令两支操作各一件场景件');
    assert.equal(GOAL_READ_SCENES.length, 2, '读命令两支操作各一件场景件');
    for (const s of GOAL_WRITE_SCENES) {
      const word = projectWakeWord({ key: s.key, op: s.op });
      assert.equal(routeWakeword(word, ctx).key, s.key, s.id + ' 算出的词路由到别的命令');
      assert.equal(typeof s.collect, 'function');
      assert.equal(typeof s.receipt, 'function');
      assert.ok(s.family.trim() !== '', s.id + ' 要写明待哪一族窗口来填');
    }
    for (const s of GOAL_READ_SCENES) {
      const word = projectWakeWord({ key: s.key, op: s.op });
      assert.equal(routeWakeword(word, ctx).key, s.key, s.id + ' 算出的词路由到别的命令');
      assert.equal(typeof s.view, 'function');
    }
  });
});
