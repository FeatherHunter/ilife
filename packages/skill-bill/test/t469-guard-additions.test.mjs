// t469 护栏补齐：#407 自查漏钉的 4 条判定逐条钉住，断言只钉现有行为。
//
// 红线：不为断言好写改页面可见行为。若现有行为本身有误另开票，本票只加断言。
// 跑法：`node node_modules/typescript/bin/tsc -b packages/skill-bill --force` 之后 `node --test "packages/skill-bill/test/*.test.mjs"`。
// 本件只加不断言旧件一行不动；全套测试只涨不跌。
import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { textOf } from '../dist/write/recentPicks.js';
import { diffOf } from '../dist/write/diffTable.js';
import { prefillOf } from '../dist/write/prefillNote.js';
import { pickerBlock, snapshotTable } from '../dist/write/recordPicker.js';
import { openBillDb, closeBillDb, addBill } from '../dist/fetch/db.js';
import { resolveDbPath } from '../dist/fetch/paths.js';
import { billConfigDir } from './helpers/config-base.mjs';

let DB = '';
const IDS = { a: 0, b: 0, early: 0 };

function rowOf(over) {
  return {
    id: 7,
    category: '餐饮/外卖/午餐',
    time: '2026-09-10 12:00:00',
    amount: -12.5,
    account: '支付宝',
    ledger: '生活',
    currency: '人民币',
    note: '午饭',
    created_at: '2026-09-10 12:00:00',
    deleted_at: null,
    ...over,
  };
}

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'bill469-'));
  process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
  let h = openBillDb(resolveDbPath());
  // 同刻两笔：编号大的后落（b > a），byTimeDesc 同刻须按编号倒序。
  IDS.a = addBill(h, {
    category: '餐饮/外卖/午餐', amount: -10, time: '2026-09-10 12:00:00',
    account: '支付宝', ledger: '生活', currency: '人民币', note: 't469same1',
  }).id;
  IDS.b = addBill(h, {
    category: '餐饮/堂食/晚餐', amount: -20, time: '2026-09-10 12:00:00',
    account: '微信', ledger: '生活', currency: '人民币', note: 't469same2',
  }).id;
  IDS.early = addBill(h, {
    category: '出行/打车', amount: -30, time: '2026-09-09 10:00:00',
    account: '支付宝', ledger: '生活', currency: '人民币', note: 't469early',
  }).id;
  closeBillDb(h);
  process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
});

describe('t469 · 只读回显九行与缺省标题（recordPicker.ts snapshotRows/snapshotTable）', () => {
  it('九行按序回显：名用中文列名、值逐字（含金额两位与撤销标记两态）', () => {
    const html = snapshotTable(rowOf({ id: 7, deleted_at: null }), '自定义标题');
    const order = ['记录编号', '分类', '金额', '时间', '账户', '账本', '币种', '备注', '撤销标记'];
    let at = -1;
    for (const k of order) {
      const i = html.indexOf(k);
      assert.ok(i > at, '九行须按序出现：' + k);
      at = i;
    }
    assert.ok(html.includes('餐饮/外卖/午餐'), '分类照原值');
    assert.ok(html.includes('-12.50'), '金额走 toFixed(2)');
    assert.ok(html.includes('2026-09-10 12:00:00'), '时间照原值');
    assert.ok(html.includes('支付宝'), '账户照原值');
    assert.ok(html.includes('生活'), '账本照原值');
    assert.ok(html.includes('人民币'), '币种照原值');
    assert.ok(html.includes('午饭'), '备注照原值');
    assert.ok(html.includes('没撤销过'), 'deleted_at 为空＝没撤销过');
    const gone = snapshotTable(rowOf({ id: 8, deleted_at: '2026-09-11 09:00:00' }), '自定义标题');
    assert.ok(gone.includes('已撤销（2026-09-11 09:00:00）'), '打标＝已撤销加时刻');
  });

  it('缺省标题带编号与全角空格只读回显；自定义标题原样用', () => {
    const def = snapshotTable(rowOf({ id: 7, deleted_at: null }));
    assert.ok(def.includes('这一条记录（记录编号 7　只读回显）'), '缺省标题逐字（含全角空格）');
    const custom = snapshotTable(rowOf({ id: 7, deleted_at: null }), '原记录（只读回显，记录编号 7）');
    assert.ok(custom.includes('原记录（只读回显，记录编号 7）'), '自定义标题原样用');
    assert.ok(!custom.includes('这一条记录（记录编号 7　只读回显）'), '给了自定义就不用缺省那句');
  });
});

describe('t469 · 候选预选与自定义提示（recordPicker.ts pickerBlock）', () => {
  it('不给 selectedId＝不预选：出全表＋未预选口径＋缺省提示', () => {
    process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
    const html = pickerBlock({ mode: 'update' });
    assert.ok(html.includes('可选的记录（共 3 条）'), '没认准＝全量候选铺开供挑');
    assert.ok(html.includes('候选未预选（不给默认选中）'), '没给就不预选，不拿第一条兜底');
    assert.ok(html.includes('从下面列出的记录里挑一条，再说清要改哪一项、改成什么，跟助手说一遍。'), '缺省提示按 mode 取 update 那句');
  });

  it('给了认准的 selectedId＝预选：表收起＋已认准口径＋编号在表单值里', () => {
    process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
    const html = pickerBlock({ mode: 'update', selectedId: IDS.b });
    assert.ok(html.includes('候选已认准 #' + IDS.b), '认准＝报编号请用户核依据');
    assert.ok(!html.includes('可选的记录（共'), '认准后那张表收起（同页只读回显已列全，不重抄）');
    assert.ok(html.includes('#' + IDS.b), '表单值写编号');
    assert.ok(html.includes('库里共 3 条未撤销的记录，本页列最近 3 条（按时间倒序）。'), '条数口径＝未撤销总数');
  });

  it('自定义提示压过缺省：未认准与已认准两态都用传入那句', () => {
    process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
    const mine = 't469自定义提示：请挑同刻那两笔里的晚落那一笔。';
    const free = pickerBlock({ mode: 'update', hint: mine });
    assert.ok(free.includes(mine), '未认准用自定义');
    assert.ok(!free.includes('再说清要改哪一项'), '给了自定义就不用缺省那句');
    const hit = pickerBlock({ mode: 'update', selectedId: IDS.a, hint: mine });
    assert.ok(hit.includes(mine), '已认准仍用自定义');
    assert.ok(hit.includes('候选已认准 #' + IDS.a), '已认准口径仍在');
  });

  it('认不出的 selectedId 按未预选算：不静默顶成第一条', () => {
    process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
    const html = pickerBlock({ mode: 'update', selectedId: 999999 });
    assert.ok(html.includes('候选未预选（不给默认选中）'), '对不上的编号不预选');
    assert.ok(html.includes('可选的记录（共 3 条）'), '对不上＝全表仍在');
  });
});

describe('t469 · 同刻按编号倒序（recordPicker.ts byTimeDesc）', () => {
  it('同一时刻编号大的排前面（后来落的那一笔在先）', () => {
    process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
    assert.ok(IDS.b > IDS.a, '前置：同刻后落的编号大');
    const html = pickerBlock({ mode: 'update' });
    const ia = html.indexOf('t469same1');
    const ib = html.indexOf('t469same2');
    assert.ok(ia >= 0 && ib >= 0, '同刻两笔都在候选里');
    assert.ok(ib < ia, '同刻＝编号倒序：后落的 t469same2 在先');
  });

  it('异刻仍按时间倒序：同刻规则不压时间规则', () => {
    process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
    const html = pickerBlock({ mode: 'update' });
    const early = html.indexOf('t469early');
    const same = html.indexOf('t469same2');
    assert.ok(early >= 0 && same >= 0, '早晚两笔都在候选里');
    assert.ok(same < early, '09-10 在 09-09 之前');
  });
});

describe('t469 · textOf 三样口径保留（硬并不改行为，故逐处钉现有面）', () => {
  it('乙口径（数字也转：recentPicks 与 11 件场景件）：数字成串、其余成空', () => {
    assert.equal(textOf('  x  '), 'x');
    assert.equal(textOf(12.5), '12.5');
    assert.equal(textOf(0), '0');
    assert.equal(textOf(NaN), 'NaN', 'NaN 也是 number：照 String 写，不另判一次');
    assert.equal(textOf(true), '', '布尔不转（只转数字）');
    assert.equal(textOf({}), '', '对象成空');
    assert.equal(textOf(null), '');
    assert.equal(textOf('   '), '');
  });

  it('甲口径（只认字符串：collect 分派与 prefill 预填）：数字当没给这一格', () => {
    const recent = [rowOf({ id: 1, account: '支付宝', ledger: '生活', currency: '人民币' })];
    const numeric = prefillOf({ params: { account: 123 }, recent, today: '2026-09-10' });
    assert.ok(numeric.some((m) => m.name === 'account' && m.value === '支付宝'), '数字 123 当没给：仍从历史顶');
    const told = prefillOf({ params: { account: '微信' }, recent, today: '2026-09-10' });
    assert.ok(!told.some((m) => m.name === 'account'), '字符串给了＝不顶');
  });

  it('丙口径（缺省未设置：diffTable 比对）：没给与空串同面，数字串同面、空白不剪值', () => {
    const rows = diffOf({ fields: ['note', 'amount'], before: { note: undefined, amount: 12 }, after: { note: '', amount: '12' } });
    assert.equal(rows[0].before, '未设置');
    assert.equal(rows[0].after, '未设置');
    assert.equal(rows[0].changed, false, '没给与空串同面：不算改动');
    assert.equal(rows[1].before, '12');
    assert.equal(rows[1].after, '12');
    assert.equal(rows[1].changed, false, '数字与数字串同面：不算改动');
    const ws = diffOf({ fields: ['note'], before: { note: '12' }, after: { note: ' 12 ' } });
    assert.equal(ws[0].changed, true, '值本身不剪空白：首尾空格算改动（只在判空那一步剪）');
    const zero = diffOf({ fields: ['amount'], before: { amount: 0 }, after: { amount: '0' } });
    assert.equal(zero[0].changed, false, '0 与 "0" 同面');
  });

  it('甲乙对照：同一输入 12 在乙得 "12"、在甲判空（这就是不能硬并的当面证据）', () => {
    assert.equal(textOf(12), '12', '乙：数字成串');
    const recent = [rowOf({ id: 1, account: '支付宝', ledger: '生活', currency: '人民币' })];
    const marks = prefillOf({ params: { account: 12 }, recent, today: '2026-09-10' });
    assert.ok(marks.some((m) => m.name === 'account'), '甲：数字 12 当没给，预填仍发生');
  });
});

// t469-sup 追加：D1 S3 本票范围 diffRowsFor 只比给了的字段（recordPicker.ts:231-246）。
// 红线延续：只钉现有行为（given：undefined／null／空白串不算给，0 算给；没给不进表），不改可见行为。
// 复核探针 .scratch/t469/review-probe.mjs P-R1／P-R1b 去 given 过滤后红而新旧 38 存活，故滚进本票补断言，不新开票。
import { diffRowsFor } from '../dist/write/recordPicker.js';

describe('t469-sup · diffRowsFor 只比给了的字段（recordPicker.ts diffRowsFor／given）', () => {
  it('只给 note 就只比 note：没给的 amount 不进表', () => {
    const r = diffRowsFor({ row: rowOf(), params: { note: '晚饭' }, fields: ['note', 'amount'] });
    assert.equal(r.length, 1, '没给的 amount 不许进表（拿未设置当新值比会误报改动）');
    assert.equal(r[0].field, 'note');
    assert.equal(r[0].before, '午饭');
    assert.equal(r[0].after, '晚饭');
    assert.equal(r[0].changed, true);
  });

  it('空串／空白／null／undefined 都算没给：四态都不进表', () => {
    for (const v of ['', '   ', null, undefined]) {
      const r = diffRowsFor({ row: rowOf({ amount: 5 }), params: { amount: v, note: '晚饭' }, fields: ['note', 'amount'] });
      assert.equal(r.length, 1, 'amount=' + String(v) + ' 不算给，不进表');
      assert.equal(r[0].field, 'note');
      assert.equal(r[0].changed, true);
    }
  });

  it('0 算给了进表且算改动；同值进表但不算改动；给定子集保序；全没给就空表', () => {
    const changed = diffRowsFor({ row: rowOf({ amount: 5 }), params: { amount: 0 }, fields: ['amount'] });
    assert.equal(changed.length, 1, '0 算给，必须比');
    assert.equal(changed[0].before, '5');
    assert.equal(changed[0].after, '0');
    assert.equal(changed[0].changed, true);
    const same = diffRowsFor({ row: rowOf({ amount: 5 }), params: { amount: 5 }, fields: ['amount'] });
    assert.equal(same.length, 1, '给了同值仍进表，只是 changed 为假');
    assert.equal(same[0].before, '5');
    assert.equal(same[0].after, '5');
    assert.equal(same[0].changed, false);
    const ordered = diffRowsFor({ row: rowOf(), params: { note: '晚饭', amount: -20 }, fields: ['amount', 'note'] });
    assert.deepEqual(ordered.map((x) => x.field), ['amount', 'note'], '给定子集保序（按传入 fields 次序）');
    const empty = diffRowsFor({ row: rowOf(), params: {}, fields: ['note', 'amount'] });
    assert.equal(empty.length, 0, '一个都没给就空表，不拿未设置当新值比');
  });
});
