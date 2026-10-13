/** #1280 第 3 步 · **值级放开**的护栏（四条判据，逐条对着票面写）。
 *
 * 这一件不测行为，测的是**形状不许走样**的四条线（前三条扫源码文本／产物载荷，第四条是纯函数）：
 *   ① 查询域的声明里 `allow_new` **零命中**——查询页只让人「从已有值里挑」，不放开新建；
 *   ② 全 `src` 里凡是 `source: 'accounts'` 的字段一律**不许**带 `allow_new`——账户有独立登记表，
 *      要的是「去创建场景新增」那条出口（`create_scene`），放开就等于绕开账户表；
 *   ③ 记支出／记收入两组前缀**逐项**等于 `EXPENSE_L1`／`INCOME_L1`（值域只有一处书写位：
 *      `src/shared/category.ts`），记报销／记一笔＝两者合并；账本格有候选来源但没有前缀；
 *   ④ `src/shared/nameKey.ts` 的比较键：全角折半角（`／`→`/`）、大小写折平、空白折叠去首尾。
 *
 * 判据②带**自证**：合成一段文本，坏写法必须被抓、好写法不许误报（免得这条判据哪天退化成永远绿）。
 * 运行：先 `pnpm build`，再 `node --test packages/skill-bill/test/t1280-值级放开护栏.test.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpFileData } from '../dist/index.js';
import { EXPENSE_L1, INCOME_L1 } from '../dist/shared/category.js';
import { nameKey } from '../dist/shared/nameKey.js';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(PKG, 'src');
const NOW = new Date(2026, 9, 13, 12, 0, 0);

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

/** 从 `start` 那个 `{` 起取到与它配对的那个 `}`（含两端）。 */
function literalAt(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

/** 从 `index` 往前找最近的、还没闭合的 `{`，返回**包住它的那个字面量**（字段一行一个对象字面量，
 *  所以这就是字段本身）。字符串里的 `{{x}}` 自己配对，回扫时会互相抵消、不影响定位。 */
function enclosingLiteral(text, index) {
  let depth = 0;
  for (let i = index; i >= 0; i -= 1) {
    if (text[i] === '}') depth += 1;
    else if (text[i] === '{') {
      if (depth === 0) return literalAt(text, i);
      depth -= 1;
    }
  }
  return '';
}

/** 源文里所有 `source: '<name>'` 所在的字段字面量。 */
function fieldsWithSource(text, sourceName) {
  const needle = "source: '" + sourceName + "'";
  const out = [];
  let at = text.indexOf(needle);
  while (at >= 0) {
    out.push(enclosingLiteral(text, at));
    at = text.indexOf(needle, at + needle.length);
  }
  return out;
}

const allowsNew = (literal) => /allow_new\s*:\s*true/.test(literal);

const payload = () => buildHelpFileData(NOW, {});

function fieldOf(p, sceneId, name) {
  for (const g of p.groups) {
    for (const sub of g.subgroups) {
      for (const s of sub.scenes) {
        if (s.id !== sceneId) continue;
        return (s.editable_fields ?? []).find((f) => f.name === name);
      }
    }
  }
  return undefined;
}

describe('#1280 · 值级放开护栏', () => {
  it('① 查询域声明里 allow_new 零命中（查询只挑已有值）', () => {
    const text = readFileSync(join(SRC, 'query', 'declaration.ts'), 'utf8');
    const hits = text.split('allow_new').length - 1;
    assert.equal(hits, 0, '查询域声明里出现了 allow_new（' + hits + ' 处）：查询页不放开新建');
  });

  it("② 全 src 里 source: 'accounts' 的字段一律不带 allow_new（账户走创建场景）", () => {
    const hits = [];
    let seen = 0;
    for (const abs of walk(SRC)) {
      const rel = relative(SRC, abs);
      for (const literal of fieldsWithSource(readFileSync(abs, 'utf8'), 'accounts')) {
        seen += 1;
        if (allowsNew(literal)) hits.push(rel + '：' + literal.replace(/\s+/g, ' ').slice(0, 120));
      }
    }
    assert.ok(seen > 0, "扫描面里一个 source: 'accounts' 字段都没有——判据扫空了（缩面＝放宽）");
    assert.deepEqual(hits, [], '账户类字段不许放开新建（要新账户就给出 create_scene 那条出口）：\n' + hits.join('\n'));
  });

  it('② 自证：坏写法必被抓、好写法不许误报', () => {
    const bad = "export const A = {\n  fields: [\n    { name: 'account', hint: '{{x}}', source: 'accounts', allow_new: true },\n  ],\n};\n";
    const good = "export const B = {\n  fields: [\n    { name: 'account', hint: '{{x}}', source: 'accounts', create_scene: 'account_add' },\n  ],\n};\n";
    const badFields = fieldsWithSource(bad, 'accounts');
    const goodFields = fieldsWithSource(good, 'accounts');
    assert.equal(badFields.length, 1, '自证：坏写法应扫出一个字段');
    assert.ok(allowsNew(badFields[0]), '自证：坏写法应被抓');
    assert.equal(goodFields.length, 1, '自证：好写法应扫出一个字段');
    assert.ok(!allowsNew(goodFields[0]), '自证：好写法不许误报');
    assert.equal(badFields[0], "{ name: 'account', hint: '{{x}}', source: 'accounts', allow_new: true }", '自证：取到的必须是字段本身，不是整份声明');
  });

  it('③ 记支出／记收入的前缀逐项＝EXPENSE_L1／INCOME_L1；记报销／记一笔＝两者合并', () => {
    const p = payload();
    const expense = fieldOf(p, 'write_expense', 'category');
    const income = fieldOf(p, 'write_income', 'category');
    const reimburse = fieldOf(p, 'write_reimburse', 'category');
    const record = fieldOf(p, 'write_record', 'category');
    for (const [scene, f] of [['write_expense', expense], ['write_income', income], ['write_reimburse', reimburse], ['write_record', record]]) {
      assert.ok(f, scene + '.category 必须在载荷里');
      assert.equal(f.source, 'categories', scene + '.category 的来源名');
      assert.equal(f.allow_new, true, scene + '.category 要放开新建');
    }
    assert.deepEqual(expense.new_prefixes, [...EXPENSE_L1], '记支出的前缀＝支出顶层十项，逐项同序');
    assert.deepEqual(income.new_prefixes, [...INCOME_L1], '记收入的前缀＝收入顶层六项，逐项同序');
    assert.deepEqual(reimburse.new_prefixes, [...EXPENSE_L1, ...INCOME_L1], '记报销的前缀＝两者合并');
    assert.deepEqual(record.new_prefixes, [...EXPENSE_L1, ...INCOME_L1], '记一笔的前缀＝两者合并');
    // 账本格：有候选来源、放开新建，但**不给前缀**（账本没有顶层闭集）。
    for (const [scene, name] of [['write_expense', 'ledger'], ['write_batch', 'ledger'], ['write_installment', 'ledger']]) {
      const f = fieldOf(p, scene, name);
      assert.ok(f, scene + '.' + name + ' 必须在载荷里');
      assert.equal(f.source, 'ledgers', scene + '.' + name + ' 的来源名');
      assert.equal(f.allow_new, true, scene + '.' + name + ' 要放开新建');
      assert.equal(f.new_prefixes, undefined, scene + '.' + name + ' 不许给前缀');
    }
    // 账户格：不放开（在写入域里就是这几格）。
    for (const [scene, name] of [['write_expense', 'account'], ['write_income', 'account'], ['write_installment', 'account'], ['write_record', 'account']]) {
      const f = fieldOf(p, scene, name);
      assert.ok(f, scene + '.' + name + ' 必须在载荷里');
      assert.equal(f.allow_new, undefined, scene + '.' + name + ' 不许放开新建');
    }
  });

  it('④ nameKey：全角折半角、大小写折平、空白折叠去首尾；不做近义合并', () => {
    assert.equal(nameKey(' 餐饮／夜宵 '), nameKey('餐饮/夜宵'), 'NFKC 应把全角斜线折成半角，首尾空白丢掉');
    assert.equal(nameKey(' 餐饮／夜宵 '), '餐饮/夜宵');
    assert.equal(nameKey('Food'), nameKey('food'), '大小写应折平');
    assert.equal(nameKey('Food'), 'food');
    assert.equal(nameKey('生活  账本'), nameKey('生活 账本'), '内部连续空白折成一个空格');
    assert.equal(nameKey('生活  账本'), '生活 账本');
    assert.equal(nameKey('生活账本'), '生活账本');
    assert.notEqual(nameKey('午饭'), nameKey('午餐'), '只折写法，不并近义词');
    assert.notEqual(nameKey('餐饮'), nameKey('餐饮/夜宵'), '不拆层级');
  });
});
