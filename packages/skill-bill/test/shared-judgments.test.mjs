// t407 整改 E1：新共用件与取数共用位的护栏。
//
// 为什么要补这一件：复核者把 `src/shared/recordPicker.ts` 里 `keeps` 那条判定
// （「撤销候选只列未删／恢复候选只列已软删」）改坏之后，`tsc` 与当时全部 90 条测试**仍全绿**——
// 变异存活、零护栏。本件把那处判定钉住，并把自查出来同样没有断言管着的判定逐条补上：
//   `recordPicker.ts`（候选过筛、按编号读一条认出软删行）、`recentPicks.ts`（取值、去重与次序、
//   上限、退到哪一侧、已给值并到队首）、`flowSteps.ts`（段状态与摆放次序）、
//   `installmentPreview.ts`（尾差对齐末期、日期回退月末、先校验再算、超 24 期折起来）、
//   `outsideScan.ts`（三要素表、收图数说明、缺失与齐全两态那段话）。
//
// 跑法：`node node_modules/typescript/bin/tsc -b packages/skill-bill --force` 之后 `node --test "packages/skill-bill/test/*.test.mjs"`。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { optionsFor, pickOf, textOf } from '../dist/shared/recentPicks.js';
import { flowSteps } from '../dist/shared/flowSteps.js';
import { installmentPreview, installmentShares } from '../dist/shared/installmentPreview.js';
import { ESCAPE_FIELDS, escapeCard, escapePrompt, imageNote } from '../dist/shared/outsideScan.js';
import { pickerBlock, pickModeOf, readRowById } from '../dist/shared/recordPicker.js';

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
const IDS = { keep1: 0, keep2: 0, keep3: 0, gone: 0 };

function run(args) {
  return spawnSync(NODE, [bin, ...args], { cwd: here, encoding: 'utf8', env: { ...process.env, SKILLS_DB_PATH: DB } });
}
const P = (o) => JSON.stringify(o);
/** 落一笔并回记录编号。 */
function add(note, amount, time, category, account) {
  const r = run(['bill.record.add', '--params', P({ category, amount, time, note, account })]);
  assert.equal(r.status, 0, '落笔须成功：' + note + '｜' + r.stdout + r.stderr);
  return JSON.parse(r.stdout.trim().split(/\r?\n/).filter(Boolean).pop()).data.receipt.recordId;
}
/** 跑一条命令并取落盘的整页。 */
function page(params) {
  const f = join(HTML, 'p' + Math.random().toString(36).slice(2) + '.html');
  const r = run(['bill.record.update', '--params', P(params), '--html', f]);
  assert.equal(r.status, 0, '出页须成功：' + P(params) + '｜' + r.stdout + r.stderr);
  assert.ok(existsSync(f), '产物须落盘：' + f);
  return readFileSync(f, 'utf8');
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'billpick-'));
  HTML = mkdtempSync(join(tmpdir(), 'billpick-html-'));
  IDS.keep1 = add('zzkeep1', -10, '2026-09-01 10:00:00', '餐饮/外卖/午餐', '支付宝');
  IDS.keep2 = add('zzkeep2', -20, '2026-09-02 10:00:00', '餐饮/堂食/晚餐', '微信');
  // 第三笔与第一笔同分类：候选要按最近在先去重，同一分类只留一个。
  IDS.keep3 = add('zzkeep3', -25, '2026-09-03 10:00:00', '餐饮/外卖/午餐', '支付宝');
  IDS.gone = add('zzgone', -30, '2026-09-04 10:00:00', '出行/打车', '支付宝');
  // 只把最后一笔软删打标：撤销＝软删，行留在库里。
  assert.equal(run(['bill.record.update', '--params', P({ op: 'undo', id: IDS.gone })]).status, 0);
});

describe('t407 E1 · 撤销／恢复候选的过筛（recordPicker.ts 的 keeps）', () => {
  it('撤销候选只列未删：软删那笔一个都不出现、条数按未撤销数报', () => {
    for (const [tag, params] of [['缺省（改记录）', {}], ['撤销', { op: 'undo' }]]) {
      const html = page(params);
      assert.ok(html.includes('zzkeep1'), tag + '：未删的候选须列出来');
      assert.ok(html.includes('zzkeep2'), tag + '：未删的候选须列出来');
      assert.ok(html.includes('zzkeep3'), tag + '：未删的候选须列出来');
      assert.ok(!html.includes('zzgone'), tag + '：已软删的那笔不许出现在候选里');
      assert.ok(html.includes('库里共 3 条未撤销的记录'), tag + '：条数口径＝未撤销数（3）');
      assert.ok(html.includes('按时间倒序'), tag + '：须写明候选的次序口径');
    }
  });

  it('恢复候选只列已软删：没打标的那三笔一个都不出现、条数按已打标数报', () => {
    const html = page({ op: 'restore' });
    assert.ok(html.includes('zzgone'), '已软删的那笔须出现在恢复候选里');
    assert.ok(!html.includes('zzkeep1'), '没过撤销的不许出现在恢复候选里');
    assert.ok(!html.includes('zzkeep2'), '没过撤销的不许出现在恢复候选里');
    assert.ok(!html.includes('zzkeep3'), '没过撤销的不许出现在恢复候选里');
    assert.ok(html.includes('库里共 1 条已打标撤销的记录'), '条数口径＝已打标撤销数（1）');
    assert.ok(html.includes('已打标撤销'), '恢复候选须说明这行为什么在列');
  });

  it('三种过筛条件各归各位（op 落哪一档）', () => {
    assert.equal(pickModeOf(undefined), 'update');
    assert.equal(pickModeOf('restore'), 'restore');
    assert.equal(pickModeOf('undo'), 'undo');
    assert.equal(pickModeOf('别的什么'), 'update');
  });

  it('按编号读一条认得软删行：deleted 与行一起给全（改记录／撤销／恢复三处共用）', () => {
    process.env.SKILLS_DB_PATH = DB;
    const gone = readRowById(IDS.gone);
    assert.equal(gone.ok, true);
    assert.notEqual(gone.row, null, '软删的行仍读得到（`getById` 读不到软删行，本件走 `fetchAll` 自己筛）');
    assert.equal(gone.deleted, true, '已打标撤销的行须报 deleted=true');
    const keep = readRowById(IDS.keep1);
    assert.equal(keep.ok, true);
    assert.equal(keep.deleted, false, '没过撤销的行须报 deleted=false');
    assert.equal(readRowById(999999).row, null, '编号不存在＝row 给 null（不拿最近一笔顶）');
  });

  it('候选按时间倒序摆：最近的一笔在最前（页面与那一格同一条次序）', () => {
    process.env.SKILLS_DB_PATH = DB;
    const html = pickerBlock({ mode: 'undo' });
    const at = (s) => {
      const i = html.indexOf(s);
      assert.ok(i >= 0, '候选里须有：' + s);
      return i;
    };
    assert.ok(at('zzkeep3') < at('zzkeep2'), '最近的一笔（09-03）排在 09-02 之前');
    assert.ok(at('zzkeep2') < at('zzkeep1'), '09-02 排在 09-01 之前');
    assert.ok(html.includes('餐饮/外卖/午餐　zzkeep3'), '候选行摘要＝分类＋备注（账户在同页只读回显表里，不重抄）');
  });

  it('候选读不通照实报（不拿空表冒充「库里没有记录」）', () => {
    const saved = process.env.SKILLS_DB_PATH;
    // 拿一个「文件」当库目录用：建目录这一步就过不去，读候选只能照实报原因。
    const blocker = join(DB, 'iam-a-file');
    writeFileSync(blocker, 'x');
    process.env.SKILLS_DB_PATH = join(blocker, 'sub');
    try {
      const html = pickerBlock({ mode: 'undo' });
      assert.ok(html.includes('候选读不出来'), '库打不开须报原因，不出空表');
      assert.ok(!html.includes('库里一条都没有'), '读不通与「库里没有」不许混成一句');
    } finally {
      process.env.SKILLS_DB_PATH = saved;
    }
  });

  it('库里一条候选都没有时出空态，不拿最近一笔顶替', () => {
    const saved = process.env.SKILLS_DB_PATH;
    process.env.SKILLS_DB_PATH = mkdtempSync(join(tmpdir(), 'billpick-empty-'));
    try {
      const html = pickerBlock({ mode: 'undo' });
      assert.ok(html.includes('没有可选的要撤销的那条记录'), '空态须说明这一格要的是哪种记录');
      assert.ok(html.includes('不拿最近一笔顶替'), '空态须写明不拿最近一笔顶');
    } finally {
      process.env.SKILLS_DB_PATH = saved;
    }
  });
});

describe('t407 E1 · 取数共用位口径（recentPicks.ts）', () => {
  const rows = [
    { category: 'A/1', account: '支', ledger: '' },
    { category: 'B/1', account: '微', ledger: '' },
    { category: 'A/1', account: '支', ledger: '' },
  ];

  it('一个值的字符串形态：数字写成十进制串、字符串剪空白、其余按空串', () => {
    assert.equal(textOf('  x  '), 'x');
    assert.equal(textOf(12.5), '12.5');
    assert.equal(textOf(0), '0');
    assert.equal(textOf(null), '');
    assert.equal(textOf(undefined), '');
    assert.equal(textOf('   '), '');
    assert.equal(textOf({}), '');
  });

  it('候选按最近在先去重：同一个值只留第一次出现的那一个，次序按库里的先后', () => {
    const pick = pickOf(rows, ['F1', 'F2']);
    assert.deepEqual([...pick.category], ['A/1', 'B/1'], '重复的分类只留一个，次序按最近在先');
    assert.deepEqual([...pick.account], ['支', '微'], '账户同样去重');
  });

  it('候选上限十二个：给十五条也只剩前十二个', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ category: 'C' + i, account: '', ledger: '' }));
    const pick = pickOf(many, []);
    assert.equal(pick.category.length, 12, '上限＝十二个');
    assert.equal(pick.category[0], 'C0');
    assert.equal(pick.category[11], 'C11');
  });

  it('分类一条历史都没有才退到调用方给的 L1 名单；账本退到缺省「生活」；账户没有兜底', () => {
    const pick = pickOf([], ['F1', 'F2']);
    assert.deepEqual([...pick.category], ['F1', 'F2'], '没历史＝用调用方给的名单');
    assert.deepEqual([...pick.account], [], '账户没有兜底：没历史就是空');
    assert.deepEqual([...pick.ledger], ['生活'], '账本没历史退到缺省「生活」');
    const withHistory = pickOf(rows, ['F1', 'F2']);
    assert.deepEqual([...withHistory.category], ['A/1', 'B/1'], '有历史就不拿名单顶');
  });

  it('选项＝候选 ＋ 本次已给的值：已给的不在候选里时并到队首；候选为空／没这一格＝不给选项', () => {
    assert.deepEqual([...optionsFor({ id: ['a', 'b'] }, 'id', 'z')], ['z', 'a', 'b'], '已给的值并到队首');
    assert.deepEqual([...optionsFor({ id: ['a', 'b'] }, 'id', 'a')], ['a', 'b'], '已在候选里就不重复');
    assert.deepEqual([...optionsFor({ id: ['a'] }, 'id', '')], ['a'], '本次没给就不并');
    assert.equal(optionsFor({}, 'id', 'z'), undefined, '没这一格的候选＝不给选项');
    assert.equal(optionsFor({ id: [] }, 'id', 'z'), undefined, '候选是空＝不给选项');
  });

  it('端到端：采集页的分类候选不重复（同一分类在选项里只出现一次）', () => {
    const f = join(HTML, 'collect.html');
    const r = run(['bill.record.add', '--params', P({}), '--html', f]);
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(f, 'utf8');
    const hits = html.match(/<option value="餐饮\/外卖\/午餐">/g) ?? [];
    assert.equal(hits.length, 1, '同一分类在候选项里只许出现一次（按最近在先去重）');
    const hits2 = html.match(/<option value="餐饮\/堂食\/晚餐">/g) ?? [];
    assert.equal(hits2.length, 1, '另一条分类同样只出现一次');
  });
});

describe('t407 E1 · 流程三段式（flowSteps.ts）', () => {
  it('空数组＝不出这一块（不留空块）', () => {
    assert.equal(flowSteps({ steps: [] }), '');
  });

  it('段状态：没写 done＝未定走 warn，写了 done＝已定走 ok，自定义 state 优先', () => {
    const html = flowSteps({ steps: [{ title: 'T1' }, { title: 'T2', done: true }, { title: 'T3', done: true, state: '半定' }] });
    assert.ok(html.includes('第 1 段　T1：未定'), '缺省按没定算');
    assert.ok(html.includes('ilife-status-badge-warn'), '未定那一段的徽标走 warn');
    assert.ok(html.includes('第 2 段　T2：已定'), 'done 为真＝已定');
    assert.ok(html.includes('ilife-status-badge-ok'), '已定那一段的徽标走 ok');
    assert.ok(html.includes('第 3 段　T3：半定'), '自定义 state 压过缺省那两个字');
  });

  it('一段之内按「徽标 → 说明 → 表单 → 成品」摆，段与段按给的次序', () => {
    const html = flowSteps({ steps: [
      { title: 'A', note: 'NA', fields: [{ name: 'f', label: 'F', hint: 'h' }], html: '<b>HX</b>' },
      { title: 'B' },
    ] });
    const order = ['第 1 段　A：未定', 'NA', 'ilife-block-param-form', '<b>HX</b>', '第 2 段　B：未定'];
    let at = -1;
    for (const s of order) {
      const i = html.indexOf(s);
      assert.ok(i > at, '次序不对：' + s + '｜实得 ' + html);
      at = i;
    }
  });

  it('一段既没字段也没成品又没说明也出得来（三段骨架本身就是要看的东西）', () => {
    const html = flowSteps({ steps: [{ title: '空段' }] });
    assert.ok(html.includes('第 1 段　空段：未定'), '只剩一枚徽标也算出得来');
    assert.ok(!html.includes('ilife-block-param-form'), '没字段就不出表单');
  });
});

describe('t407 E1 · 分摊预览（installmentPreview.ts）', () => {
  it('尾差对齐到最后一期：前几期各拿整数分、末期补齐，合计逐分等于总价', () => {
    const s = installmentShares({ total: '100', periods: 3, startDate: '2026-01-31' });
    assert.deepEqual(s.map((x) => x.amount), [33.33, 33.33, 33.34], '尾差压在末期，不是首期（老侧补首期，本仓不照抄）');
    assert.equal(s.reduce((a, x) => a + Math.round(x.amount * 100), 0), 10000, '合计逐分等于总价');
    const s2 = installmentShares({ total: 0.05, periods: 2, startDate: '2026-01-31' });
    assert.deepEqual(s2.map((x) => x.amount), [0.02, 0.03], '不足一分也按末期补齐');
  });

  it('日期＝首期日之后每月同日；该月没有这一天就回退到该月最后一天', () => {
    const s = installmentShares({ total: 100, periods: 3, startDate: '2026-01-31' });
    assert.deepEqual(s.map((x) => x.date), ['2026-01-31', '2026-02-28', '2026-03-31'], '2 月没有 31 日＝回退月末');
    const y = installmentShares({ total: 100, periods: 14, startDate: '2026-01-31' });
    assert.equal(y[12].date, '2027-01-31', '满一年仍是同一天');
    assert.equal(y[13].date, '2027-02-28', '跨年之后同样按每月同日推、没有就回退月末');
  });

  it('先校验再算：总额／期数／首期日三样各自解析不出就当场抛错（不静默当空）', () => {
    const bad = [
      [{ total: 'x', periods: 3, startDate: '2026-01-31' }, '总额解析失败'],
      [{ total: 100, periods: '0', startDate: '2026-01-31' }, '期数要大于 0'],
      [{ total: 100, periods: '1.5', startDate: '2026-01-31' }, '不是正整数'],
      [{ total: 100, periods: 601, startDate: '2026-01-31' }, '期数最多 600 期'],
      [{ total: -5, periods: 2, startDate: '2026-01-01' }, '总额要大于 0'],
      [{ total: 100, periods: 3, startDate: '2026-02-30' }, '这一天不存在'],
      [{ total: 100, periods: 3, startDate: '2026/01/31' }, '不是 YYYY-MM-DD'],
    ];
    for (const [input, why] of bad) {
      assert.throws(() => installmentShares(input), (e) => e instanceof Error && e.message.includes(why), P(input) + ' 须抛错并说清为什么');
    }
  });

  it('超 24 期只显前 12 期，其余进折叠区；24 期整好不折', () => {
    const p24 = installmentPreview({ total: 240, periods: 24, startDate: '2026-01-31' });
    assert.ok(!p24.includes('折叠'), '24 期整好不折');
    assert.ok(p24.includes('共 24 期；合计 240.00（＝总价）'), '24 期的说明须报满期数与合计');
    const p25 = installmentPreview({ total: 250, periods: 25, startDate: '2026-01-31' });
    assert.ok(p25.includes('共 25 期，这里先显前 12 期'), '25 期须写明先显前 12 期');
    assert.ok(p25.includes('还有 13 期（折叠在这里）'), '其余的期数进折叠区');
    assert.ok(p25.includes('第 13 期到第 25 期'), '折叠区须写清它装的是哪几期');
  });

  it('口径行写明尾差去向与合计等于总价', () => {
    const html = installmentPreview({ total: 100, periods: 3, startDate: '2026-01-31' });
    assert.ok(html.includes('尾差对齐到最后一期'), '口径行须写明尾差去向');
    assert.ok(html.includes('合计逐分等于总价：100.00（3 期）'), '口径行须报合计与期数');
  });
});

describe('t407 E1 · 图片识别外置通道（outsideScan.ts）', () => {
  it('三要素表只有一处定义：金额／分类／时间', () => {
    assert.deepEqual(ESCAPE_FIELDS.map((f) => f.name), ['amount', 'category', 'time']);
    assert.deepEqual(ESCAPE_FIELDS.map((f) => f.label), ['金额', '分类', '时间']);
  });

  it('已收图片数说明：0 张走文字填空那条路，给了图就说清收图与读图各在哪', () => {
    const zero = imageNote({ count: 0, where: 'AI 侧' });
    assert.ok(zero.includes('已收到 0 张账单图片'), '张数照实报');
    assert.ok(zero.includes('本次一张图都没交上来'), '0 张须给另一条路');
    const two = imageNote({ count: 2, where: 'AI 侧' });
    assert.ok(two.includes('已收到 2 张账单图片'), '给了几张报几张');
    assert.ok(two.includes('收图这一步在哪：AI 侧'), '须说清收图在哪');
    assert.ok(two.includes('读图这一步在哪：本仓之外'), '须说清读图在本仓之外');
  });

  it('明示卡：三样齐了说不缺，缺哪样就报哪样（缺一样就不写库）', () => {
    const lack = escapeCard({ params: { amount: '-12.5' } });
    assert.ok(lack.includes('还缺 分类、时间'), '缺哪样报哪样');
    assert.ok(lack.includes('缺一样就不写库'), '缺项口径须写在明示卡里');
    const all = escapeCard({ params: { amount: '-12.5', category: 'a/b/c', time: '2026-01-01' } });
    assert.ok(all.includes('三样齐了，可以直接写库'), '齐了就说可以写库');
    assert.ok(all.includes('读图取三要素') && all.includes('本仓之外'), '每一步在谁那里办须写明');
  });

  it('可复制那段话：缺项时照抄的命令留尖括号占位符，补齐后照抄真值', () => {
    const lack = escapePrompt({ params: {}, blocked: [{ name: 'amount', label: '金额', why: 'w' }], scale: { count: 1, where: 'AI 侧' } });
    assert.ok(lack.includes('还缺 金额、分类、时间'), '缺哪样报哪样');
    assert.ok(lack.includes('<外部识别出的金额：支出为负、收入为正>'), '缺的值留尖括号占位符（照抄就给成待填的样子）');
    assert.ok(lack.includes('bill.record.add'), '须给出补齐后照抄的那条命令');
    assert.ok(lack.includes('缺一样不许写库'), '缺项口径须写在话里');
    const all = escapePrompt({
      params: { amount: '-1', category: 'a/b/c', time: '2026-01-01' },
      blocked: [],
      scale: { count: 1, where: 'AI 侧' },
    });
    assert.ok(all.includes('三要素齐了，可以落库'), '齐了就说可以落库');
    assert.ok(all.includes('"amount":"-1"'), '齐了照抄真值，不留占位符');
  });
});
