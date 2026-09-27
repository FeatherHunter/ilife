import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');

function nodeBin() {
  const cands = [process.env.npm_node_execpath, 'node', process.execPath].filter(Boolean);
  for (const c of cands) {
    try {
      const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
      if (p.status === 0 && /^v\d+/.test((p.stdout || '').trim())) return c;
    } catch {}
  }
  return process.execPath;
}
const NODE = nodeBin();
let DB = '';
function run(args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB) });
}
const P = (o) => JSON.stringify(o);
function envOf(r) {
  assert.equal(r.status, 0, 'exit 0 期望，stderr=' + (r.stderr || '').slice(-500));
  return JSON.parse(r.stdout);
}
function assertDelivery(env, stemRe) {
  const d = env.delivery;
  assert.ok(d, '缺省应回 delivery（只剩五字段即红）');
  assert.equal(d.mode, 'file');
  assert.ok(isAbsolute(d.path), 'path 须绝对：' + d.path);
  assert.ok(existsSync(d.path), '文件须存在：' + d.path);
  assert.equal(statSync(d.path).size, d.bytes, 'bytes 须等于磁盘真实字节');
  const body = readFileSync(d.path, 'utf8');
  assert.ok(body.includes('<html'), '须是整页（含 <html）');
  assert.match(basename(d.path), stemRe);
  assert.ok(d.path.includes('biscuit_accountant_html'), '须落产物目录');
  return { path: d.path, body };
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'bill905-'));
  assert.equal(run(['bill.record.add', '--params', P({ category: '餐饮/外卖/午餐', amount: -35, time: '2026-09-06 12:00:00', note: '午饭', account: '支付宝' })]).status, 0);
  assert.equal(run(['bill.record.add', '--params', P({ category: '工资/基本工资', amount: 8000, time: '2026-09-01 09:00:00', note: '工资' })]).status, 0);
});

describe('905 非 HELP 缺省落点与回执', () => {
  it('查询单页：查今天缺省落整页＋回执真相', () => {
    const env = envOf(run(['bill.record.today']));
    assertDelivery(env, /^饼干记账_查今天_\d{8}_\d{6}(?:_\d+)?\.html$/);
  });
  it('写入两页：缺项出采集页／写库成功出回执页', () => {
    const c = envOf(run(['bill.record.add', '--params', P({})]));
    assert.equal(c.data.ok, false);
    assertDelivery(c, /^饼干记账_记一笔_采集页_\d{8}_\d{6}(?:_\d+)?\.html$/);
    const r = envOf(run(['bill.record.add', '--params', P({ category: '餐饮/堂食/晚餐', amount: -58, time: '2026-09-06 19:00:00' })]));
    assert.equal(r.data.ok, true);
    assertDelivery(r, /^饼干记账_记一笔_回执页_\d{8}_\d{6}(?:_\d+)?\.html$/);
  });
  it('账户／目标／分析／开始使用／联动各一例落地', () => {
    const aq = envOf(run(['bill.account.query']));
    assertDelivery(aq, /^饼干记账_看账户汇总_\d{8}_\d{6}(?:_\d+)?\.html$/);
    const aw = envOf(run(['bill.account.write', '--params', P({ op: 'add' })]));
    assert.equal(aw.data.ok, false);
    assertDelivery(aw, /^饼干记账_新增账户_采集页_\d{8}_\d{6}(?:_\d+)?\.html$/);
    const gq = envOf(run(['bill.goal.query', '--params', P({ op: 'budget', month: '2026-09' })]));
    assertDelivery(gq, /^饼干记账_看预算_\d{8}_\d{6}(?:_\d+)?\.html$/);
    const an = envOf(run(['bill.analysis.overview', '--params', P({ kind: 'monthly', month: '2026-09' })]));
    assert.ok(an.delivery, '分析域有数即落页');
    const st = envOf(run(['bill.setup.run', '--params', P({ op: 'init-status' })]));
    assertDelivery(st, /^饼干记账_初始化状态_\d{8}_\d{6}(?:_\d+)?\.html$/);
    const lk = envOf(run(['bill.link.submit', '--params', P({ scene: 'meal', amount: -35, meal: '鸡腿饭' })]));
    assertDelivery(lk, /^饼干记账_吃饭_\d{8}_\d{6}(?:_\d+)?\.html$/);
  });
  it('同文：不给 --html 与给 --html 同一份正文只差落点', () => {
    const a = envOf(run(['bill.record.today', '--params', P({ date: '2026-09-06' })]));
    const da = a.delivery;
    const out = join(DB, 'fixed-today.html');
    const b = envOf(run(['bill.record.today', '--params', P({ date: '2026-09-06' }), '--html', out]));
    assert.equal(b.delivery.path, out);
    // 同一变量的两路：时钟戳（actionAt）与落点名的时间戳不同秒即不同字节，故先归一时钟再比。
    // 判的是“同一份正文”（模板与数据相同），不是“同一字节”（时钟本来就走）。
    const norm = (s) => s
      .replace(/\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/g, '<TS>')
      .replace(/\d{8}_\d{6}(?:_\d+)?/g, '<STAMP>')
      .replace(/记录编号 \d+/g, '记录编号 <ID>');
    assert.equal(norm(readFileSync(da.path, 'utf8')), norm(readFileSync(b.delivery.path, 'utf8')), '两路正文归一时钟后须相同');
    assert.notEqual(da.path, b.delivery.path, '落点须不同');
  });
  it('分家：页面与 HELP 同目录互不覆盖＋保留名不相交', () => {
    const h = envOf(run(['bill.help.lookup']));
    const t = envOf(run(['bill.record.today']));
    assert.equal(dirname(h.delivery.path), dirname(t.delivery.path), '同目录');
    assert.notEqual(basename(h.delivery.path), basename(t.delivery.path), '互不覆盖');
    for (const p of [h.delivery.path, t.delivery.path]) {
      const stem = basename(p).split('_20')[0];
      assert.ok(stem !== '饼干记账_HELP' || p === h.delivery.path, '业务页不得叫保留名');
      assert.ok(!/^饼干记账_速查表/.test(basename(t.delivery.path)), '业务页不得撞速查表');
    }
  });
  it('无页即不落：数据族与 HELP 现找走文本态', () => {
    const d = envOf(run(['bill.data.schema']));
    assert.equal(d.delivery, undefined, '程序面无页不落');
    assert.equal(d.data.results[0].ok, true);
    const q = envOf(run(['bill.help.lookup', '--params', P({ q: '查今天' })]));
    assert.equal(q.delivery, undefined, '现找只回命中不落盘');
  });
});
