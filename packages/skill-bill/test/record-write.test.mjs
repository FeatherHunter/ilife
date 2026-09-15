// 记账写入域：能力目录（声明／处理体／两张整页）＋ 注册表 ＋ 出口三条路的真跑断言。
// 基线：开工前 `node --test "packages/skill-bill/test/*.test.mjs"` ＝ 57 通过／0 失败（docs/skills/skill-bill/t406-验收-基线实测.md）。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BILL_KEY_SHAPES, WAKE_TABLE, routeWakeword } from '../dist/index.js';
import { RECORD_COMMANDS, runRecordWrite } from '../dist/record/index.js';
import { REGISTRY, REGISTRY_KEYS } from '../dist/cli/registry.js';
import { RECORD_SLOTS, missingSlots } from '../dist/record/collect.js';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

let DB = '';
let HTML = '';
before(() => {
  DB = mkdtempSync(join(tmpdir(), 'billrecord-'));
  HTML = mkdtempSync(join(tmpdir(), 'billrecord-html-'));
});

function run(args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB } });
}
/** stdout 末行即 envelope（成功只打一行 JSON）。 */
function envOf(r) {
  const last = (r.stdout || '').trim().split(/\r?\n/).filter((s) => s !== '').pop() ?? '';
  try { return JSON.parse(last); } catch (e) { throw new Error('stdout 末行不是合法 envelope JSON：' + last + '｜stderr=' + r.stderr); }
}
function pageOf(file) {
  assert.ok(existsSync(file), '产物须落盘：' + file);
  const text = readFileSync(file, 'utf8');
  assert.match(text, /<!doctype html>/i, '整页须有 doctype');
  assert.ok(text.includes('<section'), '整页须有 section');
  assert.ok(text.includes('ilife-copy-btn'), '整页须有复制按钮（复制区）');
  return text;
}

describe('t406 · 记账写入域命令声明与注册表', () => {
  it('恰好两条命令，六件事齐全，形状一律 receipt', () => {
    assert.equal(RECORD_COMMANDS.length, 2);
    assert.deepEqual(RECORD_COMMANDS.map((c) => c.key), ['bill.record.add', 'bill.record.update']);
    for (const c of RECORD_COMMANDS) {
      assert.equal(c.kind, 'write', c.key);
      assert.equal(c.shape, 'receipt', c.key);
      assert.equal(typeof c.run, 'function', c.key);
      for (const f of ['key', 'title', 'wakeWord', 'example']) {
        assert.equal(typeof c[f], 'string', c.key + ' 的 ' + f + ' 须为字符串');
        assert.ok(c[f].length > 0, c.key + ' 的 ' + f + ' 不得为空');
      }
      assert.ok(c.example.includes(c.key), c.key + ' 的示例须含命令名（照抄即能跑）');
    }
    assert.equal(RECORD_COMMANDS[0].title, '记一笔');
    assert.equal(RECORD_COMMANDS[1].title, '改记录');
  });

  it('代表唤醒词是 WAKE_TABLE 里真有的词，且路由到本命令', () => {
    const phrases = new Set(WAKE_TABLE.map((e) => e.phrase));
    for (const c of RECORD_COMMANDS) {
      assert.ok(phrases.has(c.wakeWord), c.wakeWord + ' 不在 WAKE_TABLE');
      assert.equal(routeWakeword(c.wakeWord, { id: 1 }).key, c.key, c.wakeWord + ' 路由对不上 ' + c.key);
    }
  });

  it('两条示例照抄即能跑（本机真跑，空库）', () => {
    for (const c of RECORD_COMMANDS) {
      const m = /--params '(.+)'$/.exec(c.example);
      assert.ok(m, '示例须以 --params 结尾：' + c.example);
      const r = run([c.key, '--params', m[1]]);
      assert.equal(r.status, 0, c.key + ' 示例跑不动：' + r.stderr + '｜' + r.stdout);
      const env = envOf(r);
      assert.equal(env.shape, 'receipt', c.key + ' 示例的产物形状');
    }
  });

  it('注册表一能力一行；迁移过的命令的形状从它派生（形状事实不写在渲染层）', () => {
    assert.equal(REGISTRY_KEYS.length, 2);
    assert.deepEqual([...REGISTRY_KEYS].sort(), ['bill.record.add', 'bill.record.update']);
    assert.equal(Object.keys(BILL_KEY_SHAPES).length, 16, '16 条联动命令的形状表不缩水');
    for (const key of REGISTRY_KEYS) {
      assert.equal(BILL_KEY_SHAPES[key], REGISTRY[key].shape, key + ' 的形状须由注册表派生');
    }
  });

  it('入口不猜：不属于本域的命令即抛，不静默兜底', () => {
    assert.throws(() => runRecordWrite('bill.record.today', {}, null), /不是记账写入域的命令/);
    assert.throws(() => runRecordWrite('bill.goal.write', {}, null), /不是记账写入域的命令/);
  });

  it('槽位探针：缺的只有必需槽位；金额 0 视同没给（本仓不记零，裁定第 3 条）', () => {
    const add = RECORD_SLOTS['bill.record.add'];
    assert.deepEqual(missingSlots({}, add).map((s) => s.name), ['category', 'amount']);
    assert.deepEqual(missingSlots({ category: '餐饮' }, add).map((s) => s.name), ['amount']);
    assert.deepEqual(missingSlots({ category: '餐饮', amount: 0 }, add).map((s) => s.name), ['amount']);
    assert.deepEqual(missingSlots({ category: '餐饮', amount: '0' }, add).map((s) => s.name), ['amount']);
    const upd = RECORD_SLOTS['bill.record.update'];
    assert.deepEqual(missingSlots({ note: '改过' }, upd).map((s) => s.name), ['id']);
    assert.deepEqual(missingSlots({ id: 1 }, upd), []);
  });
});

describe('t406 · 记一笔（bill.record.add）真跑', () => {
  const PARAMS = { category: '餐饮', amount: -12.5, time: '2026-09-14 12:00:00', account: '支付宝', ledger: '生活' };
  let id = 0;

  it('必需槽位齐全 → 写库 + 回执整页落盘', () => {
    const file = join(HTML, 'add.html');
    const r = run(['bill.record.add', '--params', JSON.stringify(PARAMS), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.shape, 'receipt');
    assert.equal(env.data.ok, true, JSON.stringify(env.data));
    id = env.data.receipt.recordId;
    assert.ok(Number.isInteger(id) && id > 0, '回执须带记录编号');
    assert.equal(env.data.receipt.op, 'add');
    assert.equal(env.data.receipt.affectedRows, 1, '影响行数＝total_changes 前后差');
    const text = pageOf(file);
    assert.ok(statSync(file).size > 10 * 1024, '走的是新装配的整页，不是老极简模板');
    for (const needle of ['data-slot="ilife:bill:receipt"', 'data-key="bill.record.add"', 'data-shape="receipt"', '已改动', '这次记了几笔', '写进去的项', '对账信息']) {
      assert.ok(text.includes(needle), '回执整页缺：' + needle);
    }
  });

  it('必需槽位缺失 → 采集页（不写库），退出码 0，含缺槽位明示与复制 prompt 区', () => {
    const before = envOf(run(['bill.record.today', '--params', '{"date":"2026-09-14"}'])).data.items.length;
    const file = join(HTML, 'form.html');
    const r = run(['bill.record.add', '--params', '{"kind":"expense"}', '--html', file]);
    assert.equal(r.status, 0, '缺槽位不再报参数错退出：' + r.stderr);
    const env = envOf(r);
    assert.equal(env.shape, 'receipt');
    assert.equal(env.data.ok, false, '这一次没写库，载荷照实说');
    assert.equal(env.data.message, '缺必需槽位：分类、金额（已出采集页，补齐之后跟助手说一遍）',
      'envelope 载荷与页内文案须同一句（同一件事实一处定义）');
    const text = pageOf(file);
    for (const needle of [
      'data-slot="ilife:bill:collect"', 'data-key="bill.record.add"', 'data-shape="receipt"',
      '缺必需槽位：分类、金额（已出采集页，补齐之后跟助手说一遍）', '还没写库', '还没发生',
      '这一句可以直接复制', 'ilife-block-pre-block', 'ilife-block-param-form', '复制日志',
    ]) {
      assert.ok(text.includes(needle), '采集页缺：' + needle);
    }
    const after = envOf(run(['bill.record.today', '--params', '{"date":"2026-09-14"}'])).data.items.length;
    assert.equal(after, before, '采集页只采集：库里的条数不得变');
  });
});

describe('t406 · 改记录（bill.record.update）真跑', () => {
  let id = 0;
  before(() => {
    const r = run(['bill.record.add', '--params', JSON.stringify({ category: '餐饮', amount: -20, time: '2026-09-14 19:00:00' })]);
    assert.equal(r.status, 0, '铺底那笔须成功：' + r.stderr);
    id = envOf(r).data.receipt.recordId;
  });

  it('id 齐全 → 写库 + 回执整页落盘（页标题跟操作走）', () => {
    const file = join(HTML, 'update.html');
    const r = run(['bill.record.update', '--params', JSON.stringify({ id, note: '改过' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, true, JSON.stringify(env.data));
    assert.equal(env.data.receipt.op, 'update');
    assert.deepEqual(env.data.receipt.writtenFields, ['note']);
    const text = pageOf(file);
    for (const needle of ['data-slot="ilife:bill:receipt"', 'data-shape="receipt"', '改记录 · 回执', '已改动', '这次记了几笔']) {
      assert.ok(text.includes(needle), '改记录回执缺：' + needle);
    }
  });

  it('改成与改前相同的值 → 回执说「无改动」（改前值取自库内那一行，不靠 unknown 中转）', () => {
    const file = join(HTML, 'nochange.html');
    const r = run(['bill.record.update', '--params', JSON.stringify({ id, note: '改过' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.receipt.noChange, true, '值与改前一致时 noChange 须为真');
    assert.deepEqual(env.data.receipt.writtenFields, ['note']);
    const text = pageOf(file);
    assert.ok(text.includes('无改动'), '无改动那一格须照实说');
    assert.ok(text.includes('值与改前一致'), '无改动须带依据');
  });

  it('撤销与恢复各出一页（软删口径不得写成可恢复承诺）', () => {
    const undoFile = join(HTML, 'undo.html');
    const undo = run(['bill.record.update', '--params', JSON.stringify({ op: 'undo', id }), '--html', undoFile]);
    assert.equal(undo.status, 0, 'stderr=' + undo.stderr);
    assert.equal(envOf(undo).data.receipt.op, 'undo');
    assert.ok(pageOf(undoFile).includes('记录还在'), '撤销页须说清记录还在（可恢复）');
    const restoreFile = join(HTML, 'restore.html');
    const restore = run(['bill.record.update', '--params', JSON.stringify({ op: 'restore', id }), '--html', restoreFile]);
    assert.equal(restore.status, 0, 'stderr=' + restore.stderr);
    assert.equal(envOf(restore).data.receipt.op, 'restore');
    assert.ok(pageOf(restoreFile).includes('已恢复（记录编号 ' + id), '恢复页须印记录编号');
  });

  it('缺 id → 采集页（不写库）', () => {
    const file = join(HTML, 'form-update.html');
    const r = run(['bill.record.update', '--params', '{"note":"改过"}', '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, false);
    assert.ok(env.data.message.includes('缺必需槽位：记录编号'), env.data.message);
    const text = pageOf(file);
    for (const needle of ['data-slot="ilife:bill:collect"', '缺必需槽位：记录编号', '照这句跟助手说一遍', 'ilife-block-param-form']) {
      assert.ok(text.includes(needle), '改记录采集页缺：' + needle);
    }
  });

  it('撤销带方向不合的 kind＋amount 也照撤销（方向判定只服务录入路径）', () => {
    // 本票收窄那条口径：`blockedItems` 的方向判定只服务 `bill.record.add` 录入路径；
    // 撤销／恢复带上 kind＋amount 时不得被方向判定拦下、改出采集页。
    const seeded = run(['bill.record.add', '--params', JSON.stringify({ category: '餐饮', amount: -20, time: '2026-09-14 20:00:00' })]);
    assert.equal(seeded.status, 0, '铺底那笔须成功：' + seeded.stderr);
    const newId = envOf(seeded).data.receipt.recordId;
    const file = join(HTML, 'undo-directed.html');
    const r = run(['bill.record.update', '--params', JSON.stringify({ op: 'undo', id: newId, kind: 'expense', amount: 35 }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, true, '方向判定不得管撤销：' + JSON.stringify(env.data));
    assert.equal(env.data.receipt.op, 'undo');
    assert.ok(!env.data.message.includes('方向不符'), '撤销页不得报方向不符：' + env.data.message);
    assert.ok(pageOf(file).includes('data-page="receipt"'), '撤销走回执页，不是采集页');
  });

  it('id 有值但不是记录编号 → 仍走口径失败（不静默兜底成采集页）', () => {
    const r = run(['bill.record.update', '--params', '{"id":"abc","note":"改过"}']);
    assert.equal(r.status, 2, 'stderr=' + r.stderr);
    assert.match(r.stderr, /口径失败/);
  });
});

// t407：写入域页面积木 ＋ 三个缺口块（缺项阻断条／重复检测提示条／预填标注）＋ 记支出代表页两张。
// 与上面两段隔离：本段用自己那套临时库与目录，免得共用一条记录把「撞单」判成两条。
describe('t407 · 记支出代表页（页面积木与三个缺口块）', () => {
  const D2 = mkdtempSync(join(tmpdir(), 'bill407-db-'));
  const H2 = mkdtempSync(join(tmpdir(), 'bill407-html-'));
  const SEED = { category: '餐饮/外卖/午餐', amount: -12.5, time: '2026-09-14 12:00:00', account: '支付宝', ledger: '生活', note: '午饭' };
  function run2(args) {
    return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: D2 } });
  }
  function rowsAt(date) {
    return envOf(run2(['bill.record.today', '--params', JSON.stringify({ date })])).data.items.length;
  }
  /** 页上所有可复制文本（`data-t`）：用来核「该给的给、该拦的拦」。 */
  function copyTexts(text) {
    return [...text.matchAll(/data-t="([^"]*)"/g)].map((m) => m[1]);
  }

  before(() => {
    const r = run2(['bill.record.add', '--params', JSON.stringify(SEED)]);
    assert.equal(r.status, 0, '铺底那笔须成功：' + r.stderr);
    assert.equal(envOf(r).data.receipt.recordId, 1);
  });

  it('采集页十块齐全：类型徽章／摘要行／重复检测条／预填标注／缺项阻断条／表单三枚选择器／prompt 区／复制区', () => {
    const before = rowsAt('2026-09-14');
    const file = join(H2, 'collect.html');
    const r = run2(['bill.record.add', '--params', '{"kind":"expense","amount":-12.5,"time":"2026-09-14 12:30:00"}', '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, false, '采集页不写库，载荷照实说');
    assert.equal(env.data.receipt, undefined, '采集页没有回执事实');
    const text = pageOf(file);
    for (const needle of [
      'data-slot="ilife:bill:collect"', 'data-page="collect"', '记支出', '支出 金额取负数',
      '还缺什么', '还缺 1 项，补齐再记', '⛔ 先补齐（1 项）', 'ilife-action-btn ilife-action-btn-ghost',
      '预填标注', '来自记录编号 1', 'ilife-block-param-form',
      '这一句可以直接复制', 'ilife-block-copy-block', '写库：还没发生',
    ]) {
      assert.ok(text.includes(needle), '采集页缺：' + needle);
    }
    assert.equal((text.match(/<select/g) ?? []).length, 3, '分类／账户／账本三枚选择器');
  });

  it('缺项阻断条真阻断：含占位符的写库指令只给看不给复制（任何 data-t 都不含它）', () => {
    const file = join(H2, 'collect-block.html');
    const r = run2(['bill.record.add', '--params', '{"kind":"expense"}', '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    assert.equal(envOf(r).data.message, '缺必需槽位：分类、金额（已出采集页，补齐之后跟助手说一遍）');
    const text = pageOf(file);
    assert.ok(text.includes('⛔ 先补齐（2 项）'), '置灰按钮须报出缺几项');
    assert.ok(text.includes('&lt;分类&gt;') && text.includes('&lt;金额&gt;'), '补齐后要跑的写库口令须给看');
    for (const t of copyTexts(text)) {
      assert.ok(!t.includes('&lt;'), '含占位符的写库口令不得可复制，却出现在 data-t：' + t.slice(0, 60));
    }
    assert.ok(copyTexts(text).some((t) => t.includes('这一页先不写库')),
      '这一区拷的是叙述句（不是可跑的写库口令）');
  });

  it('重复检测提示条：已给分类＋同日同额出现；分类未给不出条；换一天不出现', () => {
    const hit = join(H2, 'dup-hit.html');
    const h = run2(['bill.record.add', '--params', '{"kind":"expense","amount":-12.5,"time":"2026-09-14 13:00:00","category":"餐饮/外卖/午餐"}', '--html', hit]);
    assert.equal(h.status, 0, 'stderr=' + h.stderr);
    assert.equal(envOf(h).data.ok, true, JSON.stringify(envOf(h).data));
    const hitText = pageOf(hit);
    assert.ok(hitText.includes('疑似重复'), '同日同额同分类须报疑似重复');
    assert.ok(hitText.includes('记录编号 1'), '提示条须报出撞上的是哪几笔');
    assert.ok(!hitText.includes('记录编号 ' + envOf(h).data.receipt.recordId + ' · ' + '2026-09-14 13:00:00'),
      '本次自己那条不进提示条');
    const other = join(H2, 'dup-miss.html');
    const m = run2(['bill.record.add', '--params', '{"kind":"expense","amount":-12.5,"time":"2026-09-15 13:00:00","account":"支付宝"}', '--html', other]);
    assert.equal(m.status, 0, 'stderr=' + m.stderr);
    assert.ok(!pageOf(other).includes('疑似重复'), '换一天不该报重复');
  });

  it('分类未给 ⇒ 不出重复检测提示条（同日同额也不报，宁可漏提示不误报）', () => {
    // 本例那条真跑：同日同额（库里已有 -12.5 一笔）、分类没给——本票裁定不出条。
    const file = join(H2, 'dup-nocat.html');
    const r = run2(['bill.record.add', '--params', '{"kind":"expense","amount":-12.5,"time":"2026-09-14 12:30:00","account":"支付宝"}', '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    assert.equal(envOf(r).data.ok, false, '这一条缺分类，出采集页');
    const text = pageOf(file);
    assert.ok(text.includes('还缺什么'), '这一页仍出「还缺什么」那一块');
    assert.ok(!/记录编号 1\b/.test(text), '提示条里不得列出同日同额的旧记录');
    assert.ok(!text.includes('疑似重复'), '分类未给时不得出重复那一块');
  });

  it('方向不符（记支出给正数）⇒ 阻断、不写库、栏上写清方向', () => {
    const before = rowsAt('2026-09-14');
    const file = join(H2, 'bad-direction.html');
    const r = run2(['bill.record.add', '--params', '{"kind":"expense","category":"餐饮/外卖/午餐","amount":35,"time":"2026-09-14 14:00:00"}', '--html', file]);
    assert.equal(r.status, 0, '不报参数错，出采集页：' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, false);
    assert.match(env.data.message, /方向和这一型对不上：记支出要负数/, env.data.message);
    const text = pageOf(file);
    assert.ok(text.includes('方向和这一型对不上：记支出要负数，给的是 +35.00'), '阻断条须说清方向');
    assert.equal(rowsAt('2026-09-14'), before, '阻断这一笔不得落库');
  });

  it('回执页：退出口／对账折叠区／复制区三件齐全，复制日志无双前缀，数据结构仍说写库回执', () => {
    const file = join(H2, 'receipt407.html');
    const r = run2(['bill.record.add', '--params', JSON.stringify({ ...SEED, kind: 'expense', time: '2026-09-14 12:40:00' }), '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const env = envOf(r);
    assert.equal(env.data.ok, true);
    const text = pageOf(file);
    for (const needle of ['data-slot="ilife:bill:receipt"', 'data-page="receipt"', '想反悔', '对账信息', '疑似重复', '复制数据', '复制日志', '记支出', '支出 金额取负数']) {
      assert.ok(text.includes(needle), '回执页缺：' + needle);
    }
    // 选页那两枚标记分家：data-shape 是信封形状契约（两页同为 receipt），data-page 才是哪一张页。
    assert.ok(!text.includes('data-page="collect"'), '回执页不得带采集页的 data-page');
    assert.equal((text.match(/data-page=/g) ?? []).length, 1, '整页只有一枚 data-page');
    assert.ok(text.includes('class="ilife-action-btn ilife-action-btn-red"'), '退出口须有危险色按钮');
    assert.ok(!text.includes('ilife-exit-undo-copy'), 'D2 去重：退出口不再另带复制位（撤销指令走复制区）');
    assert.equal((text.match(/>复制数据</g) ?? []).length, 1, 'D2 去重：复制数据只剩复制区那一组');
    assert.equal((text.match(/>复制日志</g) ?? []).length, 1, 'D2 去重：复制日志只剩复制区那一组');
    assert.ok(text.includes('bill.record.add（receipt）'), '日志场景标识须是 技能.本地名');
    assert.ok(!text.includes('bill.bill'), '双前缀不得再出现');
    assert.ok(text.includes('biscuit_accountant.db（写库回执）'), '回执页数据结构照实说写库');
  });

  it('采集页的数据结构不许照抄回执页那句（写库回执）', () => {
    const file = join(H2, 'collect-source.html');
    const r = run2(['bill.record.add', '--params', '{"kind":"expense"}', '--html', file]);
    assert.equal(r.status, 0, 'stderr=' + r.stderr);
    const text = pageOf(file);
    assert.ok(text.includes('biscuit_accountant.db（只读：这一页先不写库，只采集）'), '采集页数据结构须说清不写库');
    assert.ok(!text.includes('biscuit_accountant.db（写库回执）'), '采集页不得照抄回执页那句');
  });
});
