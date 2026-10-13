/** #1280 第 5 步 · **合并分类**（`bill.category.merge`）的判据件。
 *
 * 票面五条，逐条对着写（一手资料口径：带条数计数／可撤销／不追溯）：
 *   ① **合并计数**：`renamedRows` 取 SQLite `changes()`（不是自报），`deletedRows` 是其中已撤销的行数；
 *   ② **含软删行**：已撤销的行也改名（照账户改名先例 `src/account/accounts.ts` 的
 *      `UPDATE bills SET account = ? WHERE account = ?`——恢复后名称一致）；
 *   ③ **可撤销**：退回不另立机制——两个参数对调再跑一次同一条命令，**逐行**（按 id）还原到原串；
 *   ④ **`nameKey` 等价却不重复造拼写**：只差大小写／空白／全角半角＝同一个值，一笔不改、库里拼写不动；
 *   ⑤ **`to` 非法一级分类被阻断**：`to` 走 `validateCategory`（一级闭集 `ALL_L1`），坏值抛 `POLICY_BAD_CATEGORY`。
 *
 * 另钉两条边界（同一批口径的最小可判形式）：`from` 库里一笔都没有 ⇒ `POLICY_MISSING_SLOT`；
 * 两个槽位任一为空 ⇒ `POLICY_MISSING_SLOT`（与查询域缺槽位同一档错）。
 * 「不追溯」＝只改整串精确相等的那一串：`餐饮/夜宵/炒面` 不在改名范围内。
 *
 * 实验只碰临时库（`mkdtempSync` ＋ `billConfigDir`，见 `test/helpers/config-base.mjs`），不碰真库。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-bill/test/t1280-合并分类.test.mjs`。
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openBillDb, closeBillDb, addBill, undoBill, fetchAll } from '../dist/fetch/db.js';
import { resolveDbPath } from '../dist/fetch/paths.js';
import { runRecordWrite, RECORD_COMMANDS } from '../dist/write/index.js';
import { nameKey } from '../dist/shared/nameKey.js';
import { billConfigDir } from './helpers/config-base.mjs';

let DIR = '';
const ID = {};

/** 临时库每次现开现关（`billConfigDir` 把落点钉在临时目录，`resolveDbPath` 再读回来）。 */
function withDb(fn) {
  billConfigDir(DIR);
  const h = openBillDb(resolveDbPath());
  try { return fn(h); } finally { closeBillDb(h); }
}

/** 某个拼写下有几行：**整串精确相等**（`fetchAll({category})` 会把下级串一并带出来——那是查询域
 *  「查分类含下级」的口径；合并的判据要的是整串相等，故在测试侧自己筛），**含软删**。 */
function rowsUnder(h, category) {
  return fetchAll(h, { includeDeleted: true }).filter((r) => r.category === category);
}

function merge(params, h) {
  return runRecordWrite('bill.category.merge', params, h);
}

/** 拦一个口径错：断言它按 `code` 抛出（`assert.throws` 不返值，故自己捕）。 */
function policyError(fn, re) {
  try {
    fn();
  } catch (e) {
    assert.match(String(e.message), re);
    return e;
  }
  assert.fail('本该按口径抛错却没有：' + String(re));
}

before(() => {
  DIR = mkdtempSync(join(tmpdir(), 'bill1280merge-'));
  billConfigDir(DIR);
  const h = openBillDb(resolveDbPath());
  const base = { account: '支付宝', ledger: '生活', currency: '人民币', note: '' };
  ID.night1 = addBill(h, { ...base, category: '餐饮/夜宵', amount: -30, time: '2026-10-11 21:00:00', note: '烤串' }).id;
  ID.night2 = addBill(h, { ...base, category: '餐饮/夜宵', amount: -18, time: '2026-10-12 22:00:00', note: '炸鸡' }).id;
  ID.nightUndo = addBill(h, { ...base, category: '餐饮/夜宵', amount: -66, time: '2026-10-10 20:00:00', note: '写错的' }).id;
  undoBill(h, ID.nightUndo);
  ID.child = addBill(h, { ...base, category: '餐饮/夜宵/炒面', amount: -12, time: '2026-10-09 19:00:00' }).id;
  ID.other = addBill(h, { ...base, category: '出行/打车', amount: -20, time: '2026-10-08 08:00:00' }).id;
  ID.cafe = addBill(h, { ...base, category: '餐饮/Cafe', amount: -25, time: '2026-10-07 15:00:00' }).id;
  closeBillDb(h);
});

after(() => {
  if (DIR.startsWith(join(tmpdir()))) rmSync(DIR, { recursive: true, force: true });
});

describe('#1280 第 5 步 · 合并分类（bill.category.merge）', () => {
  it('① 合并计数：renamedRows＝changes()（3 笔），deletedRows＝其中已撤销的 1 笔', () => {
    const out = withDb((h) => merge({ from: '餐饮/夜宵', to: '餐饮/夜宵摊' }, h));
    const receipt = out.data.receipt;
    assert.equal(receipt.op, 'merge');
    assert.equal(receipt.from, '餐饮/夜宵');
    assert.equal(receipt.to, '餐饮/夜宵摊');
    assert.equal(receipt.renamedRows, 3, '改了几笔＝changes()');
    assert.equal(receipt.deletedRows, 1, '其中已撤销的 1 笔');
    assert.equal(receipt.noChange, false);
    assert.ok(String(receipt.source).includes('.db'), '回执写明取数来源：' + String(receipt.source));
    assert.ok(String(out.data.message).includes('3 笔'), '回执正文报笔数：' + String(out.data.message));
    assert.equal(out.html, '', '本命令不出整页（没有单一的金额主数字，见 src/write/merge.ts 件头）');
  });

  it('② 含软删行 ＋ 不追溯：旧串一笔不剩、软删那笔跟着改了名，下级串与别的分类一动不动', () => {
    withDb((h) => {
      assert.equal(rowsUnder(h, '餐饮/夜宵').length, 0, '旧串（含软删）一笔不剩');
      const moved = rowsUnder(h, '餐饮/夜宵摊');
      assert.equal(moved.length, 3, '三笔都在新串下（含已撤销那笔）');
      assert.deepEqual(moved.map((r) => r.id).sort((a, b) => a - b), [ID.night1, ID.night2, ID.nightUndo].sort((a, b) => a - b));
      const undone = moved.find((r) => r.id === ID.nightUndo);
      assert.notEqual(undone.deleted_at, null, '撤销标记原样留着（改名不动软删位）');
      assert.equal(rowsUnder(h, '餐饮/夜宵/炒面').length, 1, '不追溯：下级串「餐饮/夜宵/炒面」不动');
      assert.equal(rowsUnder(h, '出行/打车').length, 1, '别的分类不动');
      assert.equal(rowsUnder(h, '餐饮/Cafe').length, 1, '同 L1 下别的串不动');
    });
  });

  it('③ 可撤销：两参数对调再跑一次，逐行（按 id）还原到原串，软删那笔仍软删', () => {
    const back = withDb((h) => merge({ from: '餐饮/夜宵摊', to: '餐饮/夜宵' }, h));
    assert.equal(back.data.receipt.renamedRows, 3, '退回这一次改的也是 3 笔');
    withDb((h) => {
      assert.equal(rowsUnder(h, '餐饮/夜宵摊').length, 0);
      const restored = rowsUnder(h, '餐饮/夜宵');
      assert.deepEqual(restored.map((r) => r.id).sort((a, b) => a - b), [ID.night1, ID.night2, ID.nightUndo].sort((a, b) => a - b), '逐行还原：id 一个不多一个不少');
      assert.equal(restored.find((r) => r.id === ID.nightUndo).deleted_at === null, false, '撤销过的那笔回来仍是撤销态');
      assert.equal(restored.find((r) => r.id === ID.night1).amount, -30, '金额等别的列没被动过');
    });
  });

  it('④ nameKey 等价＝同一个值：一笔不改、库里拼写不动、不给同一个值造第二个拼写', () => {
    const out = withDb((h) => merge({ from: '餐饮/Cafe', to: '餐饮/cafe' }, h));
    assert.equal(nameKey('餐饮/Cafe'), nameKey('餐饮/cafe'), '前提：两个写法按 nameKey 就是同一个');
    assert.equal(out.data.receipt.noChange, true);
    assert.equal(out.data.receipt.renamedRows, 0, '一笔不改');
    assert.ok(String(out.data.message).includes('同一个分类'), '回执要说清是同一个值：' + String(out.data.message));
    withDb((h) => {
      const rows = rowsUnder(h, '餐饮/Cafe');
      assert.equal(rows.length, 1, '拼写照库里已有的那个原样留着');
      assert.equal(rows[0].id, ID.cafe);
      assert.equal(rowsUnder(h, '餐饮/cafe').length, 0, '落库拼写没有被 to 的写法顶掉');
      const spellings = new Set(fetchAll(h, { includeDeleted: true })
        .filter((r) => nameKey(r.category) === nameKey('餐饮/Cafe'))
        .map((r) => r.category));
      assert.deepEqual([...spellings], ['餐饮/Cafe'], '同一个值在库里只有一个拼写');
    });
  });

  it('⑤ to 非法一级分类被阻断（走 validateCategory 的一级闭集），一笔都没写', () => {
    const before = withDb((h) => fetchAll(h, { includeDeleted: true }).length);
    const err = policyError(() => withDb((h) => merge({ from: '餐饮/夜宵', to: '商品' }, h)), /未知 L1 分类/);
    assert.equal(err.code, 'POLICY_BAD_CATEGORY');
    assert.equal(err.name, 'BillPolicyError');
    assert.equal(withDb((h) => fetchAll(h, { includeDeleted: true }).length), before, '坏值不许落库');
  });

  it('边界：from 库里一笔都没有 ⇒ POLICY_MISSING_SLOT；两个槽位任一为空也同一档错', () => {
    const missing = policyError(() => withDb((h) => merge({ from: '餐饮/不存在', to: '餐饮' }, h)), /库里没有/);
    assert.equal(missing.code, 'POLICY_MISSING_SLOT');
    for (const params of [{ to: '餐饮' }, { from: '餐饮/夜宵' }, { from: '  ', to: '餐饮' }]) {
      const e = policyError(() => withDb((h) => merge(params, h)), /缺/);
      assert.equal(e.code, 'POLICY_MISSING_SLOT', JSON.stringify(params));
    }
  });

  it('接线：第三条写声明就是它（runRecordWrite 经声明表命中，不改出口分派）', async () => {
    const spec = RECORD_COMMANDS.find((c) => c.key === 'bill.category.merge');
    assert.ok(spec, '写域第三条声明在');
    assert.equal(spec.kind, 'write');
    assert.equal(spec.shape, 'receipt');
    assert.equal(spec.run, (await import('../dist/write/merge.js')).mergeCategory, '声明引的处理体就是 src/write/merge.ts 那一枚');
  });
});
