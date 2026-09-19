// t417 查询程序锁：17 个唤醒词逐条真出口（exit 0＋落盘＋绝对路径＋字段正确），另附空态 1 条与阻断 5 条。
//
// 词→调用对照 SKILL.md:51-67（查今天／查昨天／查某天／查最近／查账单→today；周月区间分类账户账本→range；
// 备注标签欠款待报销分期→search；账单详情→detail）。种子日期用相对日期（今天／昨天），周月窗天然命中，
// 不写死种子日期（#413 G4）。红线：本文件只读临时库；产物只落本票临时目录。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { billEnv } from './helpers/config-base.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const bin = join(here, '..', 'dist', 'cli', 'cmd_read.js');
const NODE = [process.env.npm_node_execpath, 'node', process.execPath]
  .filter(Boolean)
  .find((c) => {
    const p = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return p.status === 0 && /^v\d+/.test((p.stdout || '').trim());
  }) ?? process.execPath;

const today = new Date().toISOString().slice(0, 10);
const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

let DB = '';
let OUT = '';
const P = (o) => JSON.stringify(o);
function run(args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: billEnv(DB) });
}
/** 跑一条真出口：exit 0＋产物落盘＋stdout 信封可解析，一并返回。 */
function page(key, params, name) {
  const file = join(OUT, name + '.html');
  const r = run([key, '--params', P(params), '--html', file]);
  assert.equal(r.status, 0, key + ' ' + P(params) + ' 应 exit 0：' + r.stderr);
  assert.ok(existsSync(file), '产物应落盘：' + file);
  assert.ok(isAbsolute(file), '落盘路径应是绝对路径');
  const text = readFileSync(file, 'utf8');
  assert.ok(text.includes('<!DOCTYPE html'), '整页应有 DOCTYPE');
  const env = JSON.parse(r.stdout);
  return { text, env, file };
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 't417-db-'));
  OUT = mkdtempSync(join(tmpdir(), 't417-html-'));
  const seed = [
    { category: '餐饮/外卖/午餐', amount: -35, time: today + ' 12:00:00', note: '午饭', account: '支付宝', ledger: '生活' },
    { category: '工资/基本工资', amount: 8000, time: today + ' 09:00:00', note: '本月工资', account: '招行卡', ledger: '生活' },
    { category: '出行/地铁', amount: -20, time: yest + ' 18:00:00', note: '下班地铁', account: '微信', ledger: '生活' },
    { category: '餐饮/堂食/晚餐', amount: -58, time: '2026-09-06 19:00:00', note: '晚饭', account: '支付宝', ledger: '生活' },
    { category: '学习/书籍', amount: -88, time: '2026-09-06 12:00:00', note: '旅行攻略 #旅行计划', account: '微信', ledger: '旅行' },
    { category: '借贷/借出', amount: -500, time: '2026-09-05 12:00:00', note: '借阿明 #未还', account: '支付宝', ledger: '生活' },
    { category: '餐饮/外卖/午餐', amount: -120, time: '2026-09-04 12:00:00', note: '出差打车 #待报销', account: '招行卡', ledger: '生活' },
    { category: '分期/手机', amount: -300, time: '2026-09-03 12:00:00', note: '分期中 #分期', account: '招行卡', ledger: '生活' },
  ];
  for (const s of seed) assert.equal(run(['bill.record.add', '--params', P(s)]).status, 0, '样本应写进临时库：' + P(s));
});

describe('t417 程序锁：today 五词真出口', () => {
  it('查今天（无参）', () => {
    const { text, env } = page('bill.record.today', {}, 'w01-today');
    assert.equal(env.shape, 'list');
    assert.ok(env.data.total >= 2, '今天至少两笔');
    assert.ok(text.includes('data-key="record.today"'));
    assert.ok(text.includes('bill-cmd-read bill.record.today'));
  });
  it('查昨天', () => {
    const { env } = page('bill.record.today', { date: 'yesterday' }, 'w02-yesterday');
    assert.ok(env.data.total >= 1, '昨天至少一笔');
  });
  it('查某天', () => {
    const { env } = page('bill.record.today', { date: '2026-09-06' }, 'w03-someday');
    assert.equal(env.data.total, 2, '2026-09-06 两笔');
    assert.equal(env.data.date, '2026-09-06');
  });
  it('查最近', () => {
    const { text, env } = page('bill.record.today', { recent: true, limit: 3 }, 'w04-recent');
    assert.equal(env.data.total, 3);
    assert.equal(env.data.date, 'recent');
    assert.ok(text.includes('最近 3 笔'));
  });
  it('查账单别名（同页，标题查今天）', () => {
    const a = page('bill.record.today', {}, 'w05-bill');
    const b = page('bill.record.today', {}, 'w05-bill-again');
    assert.equal(a.env.data.total, b.env.data.total, '别名与查今天同页同数');
  });
});

describe('t417 程序锁：range 六词真出口', () => {
  it('查周', () => {
    const { env } = page('bill.record.range', { range: 'week' }, 'w06-week');
    assert.ok(env.data.total >= 3, '本周至少三笔');
  });
  it('查月', () => {
    const { env } = page('bill.record.range', { range: 'month' }, 'w07-month');
    assert.ok(env.data.total >= 3, '本月至少三笔');
  });
  it('查区间', () => {
    const { env } = page('bill.record.range', { start: '2026-09-03', end: '2026-09-06' }, 'w08-range');
    assert.equal(env.data.total, 5, '09-03~09-06 五笔（与今天无关的固定窗）');
  });
  it('查分类', () => {
    const { env } = page('bill.record.range', { category: '餐饮' }, 'w09-category');
    assert.ok(env.data.total >= 3, '餐饮至少三笔');
  });
  it('查账户', () => {
    const { env } = page('bill.record.range', { account: '支付宝' }, 'w10-account');
    assert.ok(env.data.total >= 3, '支付宝至少三笔');
  });
  it('查账本', () => {
    const { env } = page('bill.record.range', { ledger: '旅行' }, 'w11-ledger');
    assert.equal(env.data.total, 1, '旅行账本一笔');
  });
});

describe('t417 程序锁：search 五词真出口', () => {
  it('搜备注', () => {
    const { env } = page('bill.record.search', { q: '午饭' }, 'w12-search');
    assert.equal(env.data.total, 1);
  });
  it('查标签', () => {
    const { env } = page('bill.record.search', { kind: 'tag', tag: '旅行计划' }, 'w13-tag');
    assert.equal(env.data.total, 1);
  });
  it('查欠款', () => {
    const { env } = page('bill.record.search', { kind: 'debt' }, 'w14-debt');
    assert.equal(env.data.total, 1);
  });
  it('查待报销', () => {
    const { env } = page('bill.record.search', { kind: 'reimburse' }, 'w15-reimburse');
    assert.equal(env.data.total, 1);
  });
  it('查分期', () => {
    const { env } = page('bill.record.search', { kind: 'installment' }, 'w16-installment');
    assert.equal(env.data.total, 1);
  });
});

describe('t417 程序锁：detail 一词＋空态＋阻断', () => {
  it('查账单详情', () => {
    const s = page('bill.record.search', { q: '午饭' }, 'w17-id');
    const id = s.env.data.items[0].id;
    const { text, env } = page('bill.record.detail', { id }, 'w17-detail');
    assert.equal(env.shape, 'detail');
    assert.equal(env.data.item.id, id);
    assert.ok(text.includes('data-shape="detail"'));
    assert.ok(text.includes('记录编号 ' + id));
  });
  it('空态：2020-01-01 无记录仍 exit 0 出空态页', () => {
    const { text, env } = page('bill.record.today', { date: '2020-01-01' }, 'w-empty');
    assert.equal(env.data.total, 0);
    assert.ok(text.includes('ilife-block-empty-block'), '空态块');
  });
/** 副标题那枚 <p> 的文本（版式位；复制日志 data 属性里的 · 不算展示）。 */
function subtitleOf(text) {
  const m = text.match(/<p class="ilife-block-page-shell-subtitle">([\s\S]*?)<\/p>/);
  assert.ok(m, '副标题元素应在');
  return m[1];
}

describe('t417 UI 打磨锁：胶囊承事实、副标题无 ·、笔数无单位', () => {
  it('列表页：副标题只有窗口说明，笔数进胶囊', () => {
    const { text } = page('bill.record.range', { start: '2026-09-03', end: '2026-09-06' }, 'u-list');
    assert.ok(!subtitleOf(text).includes('·'), '副标题不许有 ·');
    assert.ok(text.includes('>共 5 笔<'), '笔数是胶囊');
    assert.ok(!text.includes('>笔<'), '笔数卡不再带「笔」单位');
  });
  it('详情页：编号与已撤销各一枚胶囊，副标题只有时刻', () => {
    const s = page('bill.record.search', { q: '午饭' }, 'u-id');
    const id = s.env.data.items[0].id;
    const { text } = page('bill.record.detail', { id }, 'u-detail');
    assert.ok(!subtitleOf(text).includes('·'), '副标题不许有 ·');
    assert.ok(text.includes('>记录编号 ' + id + '<'), '编号胶囊在');
  });
  it('空态页：胶囊共 0 笔，hint 无 ；', () => {
    const { text } = page('bill.record.today', { date: '2020-01-01' }, 'u-empty');
    assert.ok(text.includes('>共 0 笔<'), '空态也有笔数胶囊');
    assert.ok(!subtitleOf(text).includes('·'), '副标题不许有 ·');
  });
});
  it('阻断：空查询 exit 2、空区间 exit 4、无此号 exit 4、缺 id exit 2', () => {
    assert.equal(run(['bill.record.search', '--params', P({})]).status, 2);
    assert.equal(run(['bill.record.range', '--params', P({ start: '2026-09-01' })]).status, 2);
    assert.equal(run(['bill.record.range', '--params', P({ start: '2020-01-01', end: '2020-01-02' })]).status, 4);
    assert.equal(run(['bill.record.detail', '--params', P({ id: 99999 })]).status, 4);
    assert.equal(run(['bill.record.detail', '--params', P({})]).status, 2);
  });
});
