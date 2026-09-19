/** #691 · account 域（账户管理）的靶向测试：**缝＝真出口**（spawn `dist/cli/cmd_read.js` ＋ `--html` 读回落盘页）。
 *
 * 钉五件事（票面判据逐条）：
 *   ① 4 条唤醒词（新增账户／改账户／账户转账／看账户汇总）逐条真跑：exit 0、产物落盘、字段正确；
 *   ② 转账落**两笔**（转出负数 ＋ 转入正数）、账本＝转账，且**不入收支统计**（`bill.record.range` 的 KPI 为 0）；
 *   ③ 缺项走**阻断页**（exit 0、`ok:false`、不写库），缺什么就点名什么；
 *   ④ 汇总页照老侧口径：账户全集＝登记过的 ＋ 只在流水里出现过的（`registered=false`）、
 *      停用账户不进总余额而单列、最近流水 12 笔；
 *   ⑤ 命令面：两条键进注册表、形状由注册表派生、四条词路由到本域（域声明是唯一事实源）。
 *
 * 测试隔离：走 `test/helpers/config-base.mjs` 的 `billEnv`（#726 起落点由配置文件唯一决定）。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-bill/test/t691-账户域.test.mjs`。
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => { const p = spawnSync(c, ['--version'], { encoding: 'utf8' }); return p.status === 0 && /^v\d+/.test((p.stdout || '').trim()); }) ?? process.execPath;

let DB; let OUT;
const P = (o) => JSON.stringify(o);
function run(args, extra = {}) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB, extra) });
}
function envOf(r) {
  const last = (r.stdout || '').trim().split(/\r?\n/).filter(Boolean).pop() ?? '';
  try { return JSON.parse(last); } catch (e) { throw new Error('stdout 末行非 envelope：' + last + '｜stderr=' + r.stderr); }
}
/** 跑一页并断言「落盘 ＋ 是整页 ＋ 字节如实」；返回 {env, text}。 */
function page(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' 应 exit 0：' + r.stderr);
  const env = envOf(r);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  assert.ok(env.delivery && isAbsolute(env.delivery.path), '回执须带绝对路径的 delivery.path');
  assert.equal(resolve(env.delivery.path), resolve(file));
  const text = readFileSync(file, 'utf8');
  assert.match(text, /<!doctype html>/i, '产物应是整页');
  assert.equal(statSync(file).size, env.delivery.bytes, 'delivery.bytes 须如实');
  return { env, text };
}
/** 页面上屏的正文（剔掉复制载荷区：`bill.` 只许出现在那里，README／R4 收口）。 */
const visible = (text) => text.replace(/data-t="[^"]*"/g, '');
const goalsOf = () => JSON.parse(readFileSync(join(DB, 'goals.json'), 'utf8'));

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't691-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't691-html-'));
});

describe('#691 · account 域：4 条唤醒词端到端', () => {
  it('新增账户：缺项出采集页（不写库）→ 齐了写库出回执页', () => {
    const collect = page('bill.account.write', { op: 'add' }, 'add-collect');
    assert.equal(collect.env.data.ok, false, '缺项那一次 ok 应为 false');
    assert.ok(collect.text.includes('ilife-block-param-form'), '采集页要有字段卡');
    assert.ok(!/<nav[^>]*aria-label="页内导航"/.test(collect.text), '过程型采集页不出页内导航');
    assert.ok(!existsSync(join(DB, 'goals.json')), '缺项那一次不该落账户表');

    const done = page('bill.account.write', { op: 'add', name: '招行卡', type: '银行卡' }, 'add-receipt');
    assert.equal(done.env.data.ok, true);
    assert.equal(done.env.data.receipt.affectedRows, 1, '账户表落一处');
    assert.match(done.text, /<nav[^>]*aria-label="页内导航"/, '结果型回执页要出页内导航');
    assert.ok(done.text.includes('招行卡') && done.text.includes('银行卡'), '回执页要写清账户名与类型');
    const goals = goalsOf();
    assert.equal(goals.accounts.length, 1);
    assert.deepEqual(
      [goals.accounts[0].name, goals.accounts[0].type, goals.accounts[0].disabled],
      ['招行卡', '银行卡', false],
    );
    assert.match(String(goals.accounts[0].created_at), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'created_at 形态');
  });

  it('新增账户 · 撞重名：出阻断页（exit 0、不写库、点名重名）', () => {
    const dup = page('bill.account.write', { op: 'add', name: '招行卡' }, 'add-dup');
    assert.equal(dup.env.data.ok, false);
    assert.ok(dup.text.includes('已经有这个名字了'), '阻断条要点名重名');
    assert.equal(goalsOf().accounts.length, 1, '重名不该再落一行');
  });

  it('账户转账：缺项出采集页（带操作预览）→ 落两笔、账本＝转账、不入收支统计', () => {
    const collect = page('bill.account.write', { op: 'transfer' }, 'transfer-collect');
    assert.equal(collect.env.data.ok, false);
    assert.ok(collect.text.includes('将执行以下操作'), '转账采集页要出操作预览');
    assert.ok(collect.text.includes('转账/转出') && collect.text.includes('转账/转入'), '预览要摊开两笔的分类');

    const done = page('bill.account.write', { amount: 500, op: 'transfer', from: '支付宝', to: '招行卡' }, 'transfer-receipt');
    assert.equal(done.env.data.receipt.affectedRows, 2, '转账落两笔');
    assert.ok(done.text.includes('两笔分录'), '回执页要有两笔分录那一块');

    // 汇总侧：两笔一增一减、都不进收支
    const q = envOf(run(['bill.account.query'])).data;
    assert.equal(q.totals.transfer_count, 2);
    assert.equal(q.totals.income, 0, '转账不算收入');
    assert.equal(q.totals.expense, 0, '转账不算支出');
    assert.equal(q.totals.balance, 0, '两个账户一增一减，总余额仍为 0');
    // 统计侧：KPI 把转账排除在外（口径唯一判地＝`src/shared/kpi.ts` 的 isTransfer）
    const kpi = envOf(run(['bill.record.range', '--params', P({ start: '2000-01-01', end: '2999-12-31' })])).data.kpi;
    assert.equal(kpi.count, 0, '转账不得进收支统计');
  });

  it('账户转账 · 金额非正数与同账户：两条都进阻断表', () => {
    const neg = page('bill.account.write', { op: 'transfer', amount: -5, from: 'A', to: 'B' }, 'transfer-neg');
    assert.equal(neg.env.data.ok, false);
    assert.ok(neg.text.includes('要写正数'), '负数金额要点名');
    const same = page('bill.account.write', { op: 'transfer', amount: 5, from: 'A', to: 'A' }, 'transfer-same');
    assert.equal(same.env.data.ok, false);
    assert.ok(same.text.includes('要和转出账户不同'), '同账户要点名');
  });

  it('改账户：缺「改成什么」出确认页 → 改名写库（级联历史流水）出回执页带改前改后', () => {
    const confirm = page('bill.account.write', { op: 'update', name: '招行卡' }, 'update-confirm');
    assert.equal(confirm.env.data.ok, false);
    assert.ok(confirm.text.includes('要改的就是这个账户'), '确认页要只读回显原账户');
    assert.ok(confirm.text.includes('改成什么'), '确认页要有「改成什么」那一格');

    const miss = page('bill.account.write', { op: 'update', name: '不存在的卡', 'new-name': 'X' }, 'update-missing');
    assert.equal(miss.env.data.ok, false);
    assert.ok(miss.text.includes('这个账户认不出来') && miss.text.includes('账户表里挑一个'), '认不出来要给空态与账户表');

    const done = page('bill.account.write', { op: 'update', name: '招行卡', 'new-name': '招行工资卡' }, 'update-receipt');
    assert.equal(done.env.data.ok, true);
    assert.equal(done.env.data.receipt.renamedRows, 1, '改名要连带改历史流水（转账那笔转入）');
    assert.ok(done.text.includes('改了什么'), '回执页要有「改了什么」那一块');
    assert.ok(done.text.includes('招行卡') && done.text.includes('招行工资卡'), '改前改后都要在');
    assert.equal(goalsOf().accounts[0].name, '招行工资卡');
    const card = envOf(run(['bill.account.query'])).data.items.find((x) => x.name === '招行工资卡');
    assert.equal(card.balance, 500, '改名之后余额仍按同一个账户算');
  });

  it('改账户 · 停用与启用：停用不进总余额（单列），启用回得来', () => {
    assert.equal(run(['bill.account.write', '--params', P({ op: 'update', name: '招行工资卡', disable: true })]).status, 0);
    let d = envOf(run(['bill.account.query'])).data;
    assert.equal(d.totals.disabled_count, 1);
    assert.deepEqual(d.totals.disabled_accounts, ['招行工资卡']);
    assert.equal(d.totals.disabled_balance, 500, '停用账户余额单列');
    assert.equal(d.totals.balance, -500, '总余额只算活跃账户（支付宝那笔转出）');
    assert.equal(run(['bill.account.write', '--params', P({ op: 'update', name: '招行工资卡', enable: true })]).status, 0);
    d = envOf(run(['bill.account.query'])).data;
    assert.equal(d.totals.disabled_count, 0);
    assert.equal(d.totals.balance, 0, '启用之后两个账户合起来回到 0');
  });

  it('看账户汇总：一整页（读数／账户卡／占比条／流水／导航／口径行／来源脚注），可见文本无内部标识', () => {
    const sum = page('bill.account.query', {}, 'summary');
    const d = sum.env.data;
    assert.equal(d.total, 2, '账户全集＝登记过的 ＋ 只在流水里出现过的');
    const only = d.items.find((x) => x.name === '支付宝');
    assert.equal(only.registered, false, '只在流水里出现过的账户打未登记');
    assert.equal(only.balance, -500);
    assert.ok(sum.text.includes('各账户余额'), '要有账户卡区');
    assert.ok(sum.text.includes('ilife-block-dist-row'), '要有占比条');
    assert.ok(sum.text.includes('最近流水'), '要有流水表');
    assert.match(sum.text, /<nav[^>]*aria-label="页内导航"/, '结果型页恒出页内导航');
    assert.ok(sum.text.includes('数据来源'), '恒出来源脚注');
    for (const re of [/bill\./g, /\.py\b/g, /scripts\//g, /undefined/g, /NaN/g]) {
      assert.equal([...visible(sum.text).matchAll(re)].length, 0, '可见文本里出现了 ' + re);
    }
  });

  it('看账户汇总 · 空库：仍是一整页（空态句 ＋ 引导句 ＋ 来源脚注）', () => {
    const EMPTY = mkdtempSync(join(tmpdir(), 't691-empty-'));
    const file = join(OUT, 'summary-empty.html');
    const r = spawnSync(NODE, [bin, 'bill.account.query', '--html', file], { cwd: here, encoding: 'utf8', env: billEnv(EMPTY) });
    assert.equal(r.status, 0, '空库不是故障：' + r.stderr);
    const text = readFileSync(file, 'utf8');
    assert.match(text, /<!doctype html>/i);
    assert.ok(text.includes('数据来源'), '空库页也要有来源脚注');
    assert.ok(text.includes('账户表还是空的'), '空库要有空态句');
    assert.ok(text.includes('先说「新增账户」'), '空态后要有引导句');
  });
});

describe('#691 · account 域：命令面与路由', () => {
  it('两条键进注册表、形状由注册表派生、与域声明对得上', async () => {
    const { REGISTRY, REGISTRY_KEYS } = await import('../dist/cli/registry.js');
    const { BILL_KEY_SHAPES } = await import('../dist/index.js');
    for (const key of ['bill.account.write', 'bill.account.query']) {
      assert.ok(REGISTRY_KEYS.includes(key), key + ' 没进注册表');
      assert.equal(BILL_KEY_SHAPES[key], REGISTRY[key].shape, key + ' 的形状须由注册表派生');
      assert.equal(REGISTRY[key].kind, key.endsWith('.write') ? 'write' : 'read');
    }
    assert.equal(REGISTRY['bill.account.write'].shape, 'receipt');
    assert.equal(REGISTRY['bill.account.query'].shape, 'list');
  });

  it('4 条唤醒词逐条路由到本域命令；三件场景件与词条一一对上', async () => {
    const { WAKE_TABLE, routeWakeword, projectWakeWord } = await import('../dist/triggers/wakeTable.js');
    const { ACCOUNT_WRITE_SCENES } = await import('../dist/account/scene.js');
    const ctx = { name: '招行卡', amount: 1, from: 'A', to: 'B' };
    const want = [['新增账户', 'bill.account.write'], ['改账户', 'bill.account.write'], ['账户转账', 'bill.account.write'], ['看账户汇总', 'bill.account.query']];
    for (const [word, key] of want) {
      assert.equal(routeWakeword(word, ctx).key, key, word + ' 没路由到 ' + key);
      assert.ok(WAKE_TABLE.some((e) => e.phrase === word && e.key === key), word + ' 不在词表里');
    }
    assert.equal(ACCOUNT_WRITE_SCENES.length, 3, '写命令三支操作各一件场景件');
    for (const s of ACCOUNT_WRITE_SCENES) {
      const word = projectWakeWord({ key: s.key, op: s.op });
      assert.equal(routeWakeword(word, ctx).key, s.key, s.id + ' 算出的词路由到别的命令');
      assert.equal(typeof s.collect, 'function');
      assert.equal(typeof s.receipt, 'function');
      assert.ok(s.family.trim() !== '', s.id + ' 要写明待哪一族窗口来填');
    }
  });
});
