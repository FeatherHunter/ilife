import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openBillDb, closeBillDb, fetchAll, listToday, getById, searchKeyword, listByTag, addBill, updateBill, undoBill, restoreBill, loadGoals, saveGoals, BillFetchError } from '../dist/index.js';
import { resolveDbPath } from '../dist/index.js';
import { billConfigDir } from './helpers/config-base.mjs';

let DB = '';
let H = null;

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'billfetch-'));
  process.env.ILIFE_CONFIG_DIR = billConfigDir(DB);
  H = openBillDb(resolveDbPath());
  addBill(H, { category: '餐饮/外卖/午餐', amount: -35, time: '2026-09-06 12:00:00', account: '支付宝', ledger: '生活', currency: '人民币', note: '午饭 #工作餐' });
  addBill(H, { category: '借贷/借出', amount: -500, time: '2026-09-05 10:00:00', account: '', ledger: '借贷', currency: '人民币', note: '借小明 #未还' });
});

describe('饼干取数 fetch', () => {
  it('当日查 + 关键词 + #tag 精确匹配', () => {
    assert.equal(listToday(H, '2026-09-06').length, 1);
    assert.equal(searchKeyword(H, '午饭').length, 1);
    assert.throws(() => searchKeyword(H, '  '), /关键词/);
    assert.equal(listByTag(H, '工作餐').length, 1);
    assert.equal(listByTag(H, '工作').length, 0);
  });
  it('改/撤销/恢复闭环 + 查无对条', () => {
    const id = searchKeyword(H, '午饭')[0].id;
    assert.equal(updateBill(H, id, { note: '午饭v2' }).note, '午饭v2');
    undoBill(H, id);
    assert.equal(fetchAll(H).find((r) => r.id === id), undefined);
    assert.equal(restoreBill(H, id).id, id);
    assert.throws(() => getById(H, 99999), (e) => e instanceof BillFetchError);
  });
  it('goals.json 原子读写 + 坏文件大声失败', () => {
    const p = join(DB, 'goals.json');
    saveGoals(p, { budgets: [{ id: 1, month: '2026-09', amount: 3000 }], savings: [], accounts: [] });
    assert.equal(loadGoals(p).budgets.length, 1);
    assert.deepEqual(loadGoals(join(DB, 'nope.json')), { budgets: [], savings: [], accounts: [] });
  });
  it('测试运行器里缺 ILIFE_CONFIG_DIR ＝响亮失败（替代老的「缺 SKILLS_DB_PATH」那道门）', () => {
    const old = process.env.ILIFE_CONFIG_DIR;
    delete process.env.ILIFE_CONFIG_DIR;
    assert.throws(() => resolveDbPath(), (e) => e?.code === 'CONFIG_TEST_ISOLATION_MISSING');
    process.env.ILIFE_CONFIG_DIR = old;
  });
  it('落点随配置走：改 db.dir／db.name 即改落点（写库开关随 #675 退役，非 tmp 不再是拒绝条件）', () => {
    const other = mkdtempSync(join(tmpdir(), 'billfetch-cfg-'));
    const old = process.env.ILIFE_CONFIG_DIR;
    process.env.ILIFE_CONFIG_DIR = billConfigDir(other, { db: { name: 'custom.db' } });
    try {
      assert.equal(resolveDbPath(), join(other, 'custom.db'));
    } finally { process.env.ILIFE_CONFIG_DIR = old; }
  });
});
