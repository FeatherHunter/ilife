import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openBillDb, closeBillDb, fetchAll, listToday, getById, searchKeyword, listByTag, addBill, updateBill, undoBill, restoreBill, loadGoals, saveGoals, BillFetchError } from '../dist/index.js';
import { resolveDbPath } from '../dist/index.js';
import { billConfigDir, configDirOf, saveHomeEnv } from './helpers/config-base.mjs';
import { realHomeDir } from '../../../test/helpers/real-home-snapshot.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * #763 护栏探针：一个只调 `resolveConfigDir()` 的子进程。
 *
 * 为什么换成探针：`resolveConfigDir()` **不碰盘**（`mkdir` 在它之后），所以哪怕护栏哪天 fail-open，
 * 这条用例也绝不可能写出真实数据；而拿技能命令做「缺隔离」实验，一旦护栏失效就会真写。
 *
 * 「忘了注入」＝把家目录两格**显式设成账号那一份**（不是删格：win32 上删掉 `USERPROFILE`，
 * 子进程仍会拿到父进程当刻那一格，到不了真实那一份）。反向对照经 `extraEnv` 给临时两格。
 */
const DIRS_URL = pathToFileURL(join(HERE, '..', '..', 'base-link-core', 'dist', 'config', 'dirs.js')).href;
function probeGuard(extraEnv = {}) {
  const code = 'const m = await import(' + JSON.stringify(DIRS_URL) + ');'
    + ' try { console.log("OK:" + m.resolveConfigDir()); } catch (e) { console.log("THREW:" + e.code); }';
  const real = realHomeDir().dir;
  const env = { ...process.env, USERPROFILE: real, HOME: real, NODE_TEST_CONTEXT: 'child-v8' };
  Object.assign(env, extraEnv);
  return String(spawnSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8', env }).stdout).trim();
}

let DB = '';
let H = null;

before(() => {
  DB = mkdtempSync(join(tmpdir(), 'billfetch-'));
  billConfigDir(DB);
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
  it('测试运行器里家目录落到真实那份 ＝响亮失败（替代老的「缺 SKILLS_DB_PATH」那道门）', () => {
    const bare = probeGuard();
    assert.equal(bare, 'THREW:CONFIG_TEST_ISOLATION_MISSING',
      '跑在测试运行器里却没注入家目录 ⇒ 公共层必须当场抛（读数：' + bare + '）');
    const fakeHome = mkdtempSync(join(tmpdir(), 'billfetch-probe-'));
    assert.equal(probeGuard({ USERPROFILE: fakeHome, HOME: fakeHome }), 'OK:' + configDirOf(fakeHome),
      '给了临时家目录就照常算得出来（这道门只关「没注入家目录」这一档）');
  });
  it('落点随配置走：改 db.dir／db.name 即改落点（写库开关随 #675 退役，非 tmp 不再是拒绝条件）', () => {
    const other = mkdtempSync(join(tmpdir(), 'billfetch-cfg-'));
    const restore = saveHomeEnv();
    try {
      billConfigDir(other, { db: { name: 'custom.db' } });
      assert.equal(resolveDbPath(), join(other, 'custom.db'));
    } finally { restore(); }
  });
});
