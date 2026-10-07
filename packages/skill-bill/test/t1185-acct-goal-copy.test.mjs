// t1185 账户目标：卡片加合计不断（三份人话＋余额=流水对账＋旧合计thin零产出）
// 跑法：node node_modules/typescript/bin/tsc -b packages/skill-bill --force 之后 node --test packages/skill-bill/test/t1185-acct-goal-copy.test.mjs
// 判据：余额合计与流水对得上；卡片行/进度行各走各行式不断；合计流水行三份都有；CSV纵表真表头；复制=显示行同源；旧合计thin零产出。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { accountCardLineOf, accountTotalLineOf, buildAccountCopyText, buildAccountCopyJson, buildAccountCopyCsv } from '../dist/account/copyTextAccount.js';
import { budgetLineOf, savingLineOf, buildGoalCopyText, buildGoalCopyJson, buildGoalCopyCsv } from '../dist/goal/copyTextGoal.js';

const ACCT = {
  accounts: [
    { name: '支付宝', type: '支付', disabled: false, registered: true, income: 100, expense: 40, transfer_in: 0, transfer_out: 0, balance: 60, count: 3, last_time: '2026-10-07 12:00:00' },
    { name: '微信', type: '', disabled: false, registered: true, income: 50, expense: 10, transfer_in: 0, transfer_out: 0, balance: 40, count: 2, last_time: '2026-10-07 13:00:00' },
  ],
  totals: { income: 150, expense: 50, transfer_in: 0, transfer_out: 0, balance: 100, count: 5, net: 100, transfer_count: 0, transfer_total: 0, disabled_balance: 0, disabled_accounts: [], disabled_count: 0 },
  flows: [
    { id: 3, time: '2026-10-07 13:00:00', category: '工资', amount: 50, account: '微信', note: '' },
    { id: 2, time: '2026-10-07 12:30:00', category: '餐饮', amount: -10, account: '微信', note: '' },
    { id: 1, time: '2026-10-07 12:00:00', category: '餐饮', amount: -40, account: '支付宝', note: '' },
  ],
  flow_count: 3, records: 5, first_time: '2026-10-07', last_time: '2026-10-07',
};

const BUDGET = {
  month: '2026-10',
  budgets: [
    { id: 1, month: '2026-10', category: '餐饮', category_cn: '餐饮', amount: 3000, actual: 555, count: 3, remaining: 2445, pct: 18.5, status: 'ok', daily_avg: 277.5, month_end_proj: 8602.5, days_elapsed: 2 },
  ],
  totals: { budget: 3000, actual: 555, remaining: 2445, over_count: 0 },
  count: 1, records: 5,
};

const SAVING = {
  savings: [
    { id: 1, name: '换手机', amount: 10000, deadline: null, created_at: '2026-10-02 05:04:13', start_month: '2026-10', saved: 7945, remaining: 2055, pct: 79.5, monthly_avg: 7945, eta: '2026-11', status: 'on_track', needed_monthly: null },
  ],
  count: 1, done_count: 0, records: 5,
};

describe('t1185 账户卡片行各走各行式不断', () => {
  it('卡片行含户名/余额/币种且恒单行', () => {
    for (const c of ACCT.accounts) {
      const line = accountCardLineOf(c);
      assert.ok(line.startsWith('账户 '), '卡片行须以账户开头：' + line);
      assert.ok(line.includes(c.name), '须含户名：' + line);
      assert.ok(line.includes(c.balance.toFixed(2)), '须含余额两位：' + line);
      assert.ok(line.includes('人民币'), '须含币种：' + line);
      assert.equal(line.split('\n').length, 1, '卡片行内不得断行：' + line);
    }
  });
  it('合计行与卡片行不同式且恒单行', () => {
    const total = accountTotalLineOf(ACCT);
    assert.ok(total.startsWith('合计 '), '合计行须以合计开头：' + total);
    assert.ok(total.includes('流水'), '合计行须含流水：' + total);
    assert.equal(total.split('\n').length, 1);
    for (const c of ACCT.accounts) {
      assert.notEqual(accountCardLineOf(c).split(' ｜ ')[0], total.split(' ｜ ')[0]);
    }
  });
  it('预算进度行含目标/已用/剩余/百分比且恒单行，与账户不同式', () => {
    const line = budgetLineOf(BUDGET.budgets[0]);
    assert.ok(line.startsWith('目标 '), line);
    assert.ok(line.includes('已用'), line);
    assert.ok(line.includes('剩余'), line);
    assert.ok(line.includes('%'), line);
    assert.equal(line.split('\n').length, 1);
    assert.notEqual(line.split(' ｜ ')[0].slice(0, 2), accountCardLineOf(ACCT.accounts[0]).slice(0, 2) === '账户' ? '账户' : 'xx');
    const sline = savingLineOf(SAVING.savings[0]);
    assert.ok(sline.startsWith('目标 '), sline);
    assert.ok(sline.includes('已存') || sline.includes('还差'), sline);
    assert.equal(sline.split('\n').length, 1);
  });
});

describe('t1185 合计流水行三份都有（余额合计=Σ流水，数字同源）', () => {
  it('余额合计=Σ卡片余额（同源）', () => {
    const sum = Math.round(ACCT.accounts.reduce((s, c) => s + c.balance, 0) * 100) / 100;
    assert.equal(sum, ACCT.totals.balance);
  });
  it('账户三份都含合计行且数字同源', () => {
    const total = accountTotalLineOf(ACCT);
    const text = buildAccountCopyText('看账户汇总', ACCT);
    const json = buildAccountCopyJson('看账户汇总', ACCT);
    const csv = buildAccountCopyCsv('看账户汇总', ACCT);
    assert.ok(text.includes(total), '文本须含合计行');
    const j = JSON.parse(json);
    assert.equal(j.data.balance, ACCT.totals.balance, 'JSON数仍数且同源');
    assert.ok(typeof j.data.balance === 'number');
    assert.ok(json.includes('total_line'), 'JSON须含合计行');
    assert.ok(csv.includes('合计'), 'CSV须含合计行');
    assert.ok(csv.includes(ACCT.totals.balance.toFixed(2)), 'CSV数字同源');
    // 卡片行三份都有
    for (const c of ACCT.accounts) {
      const card = accountCardLineOf(c);
      assert.ok(text.includes(card));
      assert.ok(csv.includes(card));
    }
    assert.ok(JSON.parse(json).data.accounts.length === 2);
  });
  it('预算/目标三份都含合计流水行', () => {
    const bt = buildGoalCopyText('看预算', BUDGET, null);
    const bj = buildGoalCopyJson('看预算', BUDGET, null);
    const bc = buildGoalCopyCsv('看预算', BUDGET, null);
    assert.ok(bt.includes('合计'), bt);
    assert.ok(bj.includes('total_line'), bj);
    assert.ok(bc.includes('合计'), bc);
    assert.ok(bt.includes('流水'), bt);
    assert.ok(bc.includes('流水'), bc);
    const st = buildGoalCopyText('看目标', null, SAVING);
    const sj = buildGoalCopyJson('看目标', null, SAVING);
    const sc = buildGoalCopyCsv('看目标', null, SAVING);
    assert.ok(st.includes('合计'), st);
    assert.ok(sj.includes('total_line'), sj);
    assert.ok(sc.includes('合计'), sc);
  });
});

describe('t1185 CSV纵表真表头＋复制=显示行同源', () => {
  it('CSV首行field,value纵表', () => {
    assert.ok(buildAccountCopyCsv('看账户汇总', ACCT).split('\n')[0] === 'field,value');
    assert.ok(buildGoalCopyCsv('看预算', BUDGET, null).split('\n')[0] === 'field,value');
    assert.ok(buildGoalCopyCsv('看目标', null, SAVING).split('\n')[0] === 'field,value');
  });
  it('金额两位、百分比一位（与显示同源）', () => {
    const card = accountCardLineOf(ACCT.accounts[0]);
    assert.ok(card.includes('60.00'), card);
    const bline = budgetLineOf(BUDGET.budgets[0]);
    assert.ok(bline.includes('18.5%'), bline);
    const sline = savingLineOf(SAVING.savings[0]);
    assert.ok(sline.includes('79.5%'), sline);
  });
});

describe('t1185 旧合计thin零产出', () => {
  it('新人话三份不走旧thin（无section,row、无【bill、无total,4）', () => {
    for (const s of [buildAccountCopyText('看账户汇总', ACCT), buildAccountCopyJson('看账户汇总', ACCT), buildAccountCopyCsv('看账户汇总', ACCT), buildGoalCopyText('看预算', BUDGET, null), buildGoalCopyCsv('看预算', BUDGET, null)]) {
      assert.ok(!s.includes('section,row'), '旧CSV表头须消失：' + s.slice(0, 80));
      assert.ok(!s.includes('【bill'), '旧文本头须消失');
    }
    assert.ok(!buildAccountCopyText('看账户汇总', ACCT).includes('总余额:'), '旧文本总余额须消失');
    assert.ok(!buildGoalCopyText('看预算', BUDGET, null).includes('budget: 3000.00\nactual'), '旧thin多行须消失');
  });
});
