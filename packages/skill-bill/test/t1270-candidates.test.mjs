// #1270 · 生成期候选（条目 10 标签 ＋ 条目 9／12／13 查询页的分类／账户／账本：从已有值里选一个）
// #1269 条目 19 追加第五张清单：账户类型（住 `goals.json` 账户表的 `type` 列，不在 bills 表里）。
// 判据：① 五张清单口径（`#词` 切分＋全数字丢掉；三列去重按次数降序）②只读开库 fail-open
// ③声明里写了清单类 `source` 的槽位在有候选时升级成下拉、没候选时保持自由文本、写死 options 的仍以写死为准。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import {
  buildHelpFileData, renderHelpFileHtml, LIST_CANDIDATE_LIMIT, TAG_CANDIDATE_LIMIT,
  rankByFrequency, rankTagCandidates, readAccountTypes, readCandidateLists,
} from '../dist/render/index.js';
import { tagMatch, tagsInNote } from '../dist/fetch/db.js';

const NOW = new Date(2026, 9, 13, 1, 30, 0);

/** 载荷里某个场景的某个字段；找不到即 null。 */
function fieldOf(data, sceneId, name) {
  for (const g of data.groups) {
    for (const s of g.subgroups) {
      for (const scene of s.scenes) {
        if (scene.id !== sceneId) continue;
        for (const f of scene.editable_fields ?? []) if (f.name === name) return f;
      }
    }
  }
  return null;
}

const LISTS = {
  tags: ['待报销', '分期', '未还'],
  categories: ['餐饮', '出行'],
  accounts: ['支付宝', '微信'],
  ledgers: ['生活', '旅行'],
  accountTypes: ['银行卡', '支付'],
};

test('#1270 · 词形切分与 tagMatch 同源：切出来的词，match 必然为真', () => {
  const note = '午饭 #待报销 与 #旅行计划 以及 #借给小明，#分期；编号 #10385';
  const words = tagsInNote(note);
  assert.deepEqual(words, ['待报销', '旅行计划', '借给小明', '分期', '10385']);
  for (const w of words) assert.equal(tagMatch(note, w), true, '切出的词必须能整词命中：' + w);
  // 整词口径：`#旅行计划` 里不含 `#旅行`
  assert.equal(tagMatch(note, '旅行'), false);
  // 同行重复只出一次
  assert.deepEqual(tagsInNote('#a #a'), ['a']);
  assert.deepEqual(tagsInNote(''), []);
});

test('#1270 · 标签候选：全数字编号丢掉，次数降序、同次数按首次出现序，遵守上限', () => {
  const notes = ['#待报销 #10385', '#待报销 #分期', '#分期 #未还', '#MHL'];
  const got = rankTagCandidates(notes);
  assert.deepEqual(got, ['待报销', '分期', '未还', 'MHL']);
  assert.equal(got.includes('10385'), false, '全数字＝记录编号，不是标签');
  assert.deepEqual(rankTagCandidates(notes, 2), ['待报销', '分期']);
  assert.deepEqual(rankTagCandidates([], 5), []);
  assert.equal(rankTagCandidates(['#a'], 0).length, 0);
  assert.equal(TAG_CANDIDATE_LIMIT > 0, true);
});

test('#1270 · 分类／账户／账本候选：三列去重、次数降序、空白值丢掉、遵守上限', () => {
  const values = ['餐饮', '餐饮', '出行', '', '  ', '奶茶'];
  assert.deepEqual(rankByFrequency(values, LIST_CANDIDATE_LIMIT), ['餐饮', '出行', '奶茶']);
  assert.deepEqual(rankByFrequency(values, 2), ['餐饮', '出行']);
  assert.deepEqual(rankByFrequency([], 5), []);
  assert.equal(rankByFrequency(['a'], 0).length, 0);
  assert.equal(LIST_CANDIDATE_LIMIT >= TAG_CANDIDATE_LIMIT, true, '账目结构要能选到任何一个，上限不紧于标签');
});

test('#1270 · 只读读库：真结构、老结构（无 deleted_at）、文件不在、不是库——四种都不抛', () => {
  const dir = mkdtempSync(join(tmpdir(), 't1270-'));

  // ① 真结构（有 deleted_at，删掉的行不参与）
  const full = join(dir, 'full.db');
  const a = new DatabaseSync(full);
  a.exec(`CREATE TABLE bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, account TEXT DEFAULT '',
    ledger TEXT DEFAULT '生活', note TEXT DEFAULT '', deleted_at TEXT DEFAULT NULL)`);
  a.exec(`INSERT INTO bills (category, account, ledger, note) VALUES
    ('餐饮', '支付宝', '生活', '#旅行 #10385'),
    ('餐饮', '微信', '旅行', '#旅行 #待报销'),
    ('出行', '支付宝', '生活', '')`);
  a.exec("INSERT INTO bills (category, account, note, deleted_at) VALUES ('已删', '已删', '#已删除', '2026-01-01')");
  a.close();
  const lists = readCandidateLists(full);
  assert.deepEqual(lists.tags, ['旅行', '待报销']);
  assert.deepEqual(lists.categories, ['餐饮', '出行'], '次数降序：餐饮 2 次在前');
  assert.deepEqual(lists.accounts, ['支付宝', '微信']);
  assert.deepEqual(lists.ledgers, ['生活', '旅行']);

  // ② 老结构：没有 deleted_at 列 ⇒ 退回不带过滤的读，不抛
  const old = join(dir, 'old.db');
  const b = new DatabaseSync(old);
  b.exec('CREATE TABLE bills (id INTEGER PRIMARY KEY, category TEXT, account TEXT, ledger TEXT, note TEXT)');
  b.exec("INSERT INTO bills (category, account, ledger, note) VALUES ('借入', '现金', '借贷', '#借入')");
  b.close();
  const oldLists = readCandidateLists(old);
  assert.deepEqual(oldLists.tags, ['借入']);
  assert.deepEqual(oldLists.categories, ['借入']);
  assert.deepEqual(oldLists.accounts, ['现金']);
  assert.deepEqual(oldLists.ledgers, ['借贷']);

  // ③ 文件不在 / ④ 不是 sqlite 库 ⇒ 四张空表，不抛（fail-open：候选缺席退化成自由文本）
  for (const empty of [readCandidateLists(join(dir, 'none.db')), readCandidateLists('')]) {
    assert.deepEqual(empty, { tags: [], categories: [], accounts: [], ledgers: [] });
  }
  const junk = join(dir, 'junk.db');
  writeFileSync(junk, 'not a sqlite file');
  assert.deepEqual(readCandidateLists(junk).categories, []);
});

test('#1269 · 账户类型候选：读 `goals.json` 账户表的 type 列（去重、次数降序、空值丢掉、fail-open）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't1269-goals-'));
  const goals = join(dir, 'goals.json');

  // ① 真件：7 个账户 4 种类型，出现次数降序（本机真库同形：银行卡 ×4／钱包 ×3／支付 ×2／信用 ×1）
  writeFileSync(goals, JSON.stringify({
    accounts: [
      { name: 'A', type: '银行卡' }, { name: 'B', type: '银行卡' }, { name: 'C', type: '银行卡' },
      { name: 'D', type: '钱包' }, { name: 'E', type: '钱包' },
      { name: 'F', type: '银行卡' }, { name: 'G', type: '信用' },
      { name: 'H', type: '' }, { name: 'I', type: '  ' },
    ],
  }), 'utf8');
  assert.deepEqual(readAccountTypes(goals), ['银行卡', '钱包', '信用'], '次数降序、空白值丢掉');

  // ② 上限与档位照 `rankByFrequency`
  assert.deepEqual(readAccountTypes(goals, 2), ['银行卡', '钱包']);

  // ③ 文件不在／空路径／不是 JSON ⇒ 空表，不抛（候选缺席时槽位退回自由文本）
  assert.deepEqual(readAccountTypes(join(dir, 'none.json')), []);
  assert.deepEqual(readAccountTypes(''), []);
  const junk = join(dir, 'junk.json');
  writeFileSync(junk, '这不是 JSON', 'utf8');
  assert.deepEqual(readAccountTypes(junk), []);

  // ④ 没有 accounts 顶层键也算空表（老件／只写 budgets 的件）
  const noAccounts = join(dir, 'no-accounts.json');
  writeFileSync(noAccounts, JSON.stringify({ budgets: [] }), 'utf8');
  assert.deepEqual(readAccountTypes(noAccounts), []);
});

test('#1270 · 清单类 source：有候选就升级成下拉，没候选就保持自由文本', () => {
  const plain = buildHelpFileData(NOW, {});

  // 没候选：五格都还是自由文本，且不许出现空下拉
  for (const [sceneId, name] of [
    ['query_tag', 'tag'], ['query_category', 'category'],
    ['query_account', 'account'], ['query_ledger', 'ledger'],
    ['account_add', 'account_type'],
  ]) {
    const f = fieldOf(plain, sceneId, name);
    assert.ok(f, sceneId + '.' + name + ' 必须在载荷里');
    assert.equal(typeof f.source, 'string', '声明里必须写下来源名');
    assert.equal(f.kind, 'text');
    assert.equal(f.options, undefined, '没候选时不许出现空下拉');
  }

  const filled = buildHelpFileData(NOW, { candidates: LISTS });
  const cases = [
    ['query_tag', 'tag', 'tags', LISTS.tags, true],
    ['query_category', 'category', 'categories', LISTS.categories, true],
    ['query_category', 'account', 'accounts', LISTS.accounts, false],
    ['query_category', 'ledger', 'ledgers', LISTS.ledgers, false],
    ['query_account', 'account', 'accounts', LISTS.accounts, true],
    ['query_ledger', 'ledger', 'ledgers', LISTS.ledgers, true],
    ['query_installment', 'account', 'accounts', LISTS.accounts, false],
    ['account_add', 'account_type', 'accountTypes', LISTS.accountTypes, false],
  ];
  for (const [sceneId, name, source, options, required] of cases) {
    const f = fieldOf(filled, sceneId, name);
    assert.equal(f.source, source, sceneId + '.' + name + ' 的来源名');
    assert.equal(f.kind, 'select', sceneId + '.' + name + ' 有候选即下拉');
    assert.deepEqual(f.options, options, sceneId + '.' + name + ' 候选原序透传');
    assert.equal(f.required, required, '必填与提示语都照旧');
  }

  // 写死 options 的仍以写死为准（收支那格不是清单来源，没被换掉）
  const direction = fieldOf(filled, 'query_category', 'direction');
  assert.deepEqual(direction.options, ['支出', '收入', '全部']);
  assert.equal(direction.source, undefined);

  // #1280：写入页分类改成「下拉＋允许新值」——候选里能选，候选外能敲（前缀与比较键见 t1280 护栏）；
  // 没候选时退回自由文本，但 allow_new 仍在（放开与否不取决于当刻有没有候选）
  const writeCategory = fieldOf(filled, 'write_expense', 'category');
  assert.equal(writeCategory.kind, 'select');
  assert.equal(writeCategory.source, 'categories');
  assert.equal(writeCategory.allow_new, true);
  assert.deepEqual(writeCategory.options, LISTS.categories);
  const plainWriteCategory = fieldOf(plain, 'write_expense', 'category');
  assert.equal(plainWriteCategory.kind, 'text');
  assert.equal(plainWriteCategory.allow_new, true);

  // 载荷里真的带上了候选；整页 HTML 里也读得到
  const html = renderHelpFileHtml(filled);
  assert.match(html, /"options":\["待报销","分期","未还"\]/);
  assert.match(html, /"options":\["餐饮","出行"\]/);

  // 别把资产改坏：没被改到的分组仍只读引用资产（引用相等＝没被 clone 走样）；
  // #1280 起写入域也有清单类槽位 ⇒ 有候选时 write 组会被 clone（这正是「只 clone 真被改到的层」的期望）
  assert.equal(plain.groups.length, filled.groups.length);
  assert.equal(plain.groups[5], filled.groups[5]);
  assert.notEqual(plain.groups[0], filled.groups[0]);

  // 只给一张清单时，别的清单类槽位保持自由文本（互不串）
  const onlyTags = buildHelpFileData(NOW, { candidates: { tags: ['a'], categories: [], accounts: [], ledgers: [], accountTypes: [] } });
  assert.equal(fieldOf(onlyTags, 'query_tag', 'tag').kind, 'select');
  assert.equal(fieldOf(onlyTags, 'query_category', 'category').kind, 'text');
});
