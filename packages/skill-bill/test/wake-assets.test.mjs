// #146 · 内容资产锁：老 71 条逐字 ＋ 3 条新增 ＋ 与口径层 WAKE_TABLE 双向对账。
// 事实源在仓外（老技能实物），故「逐字」用摘要钉死——重跑生成器只会复现同一摘要，改一个字即变红。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  WAKE_GROUPS, WAKE_ASSETS, SCENE_BY_ID, WAKE_ASSET_TOTAL, HELP_WAKE_WORDS,
} from '../dist/triggers/wake-assets.js';
import { WAKE_TABLE } from '../dist/policy/index.js';

/** 本票新增的 3 条（老实物无；= 现表比老 HELP 多出的 3 条）。 */
const ADDED_IDS = new Set(['write_record', 'query_bills', 'query_bill_detail']);
/** 老实物 71 条（id/title/wake_word/status/prompt_template/types）的 SHA-256——「与老技能同款」的机器锁。 */
const LEGACY_DIGEST = '93099ecd345b85c65d69231c348fea663af40617a72509968e3829d6e2e108a0';
/** 老实物的域顺序（照搬，不许重排）。 */
const GROUP_IDS = ['write', 'query', 'analysis', 'goal', 'account', 'link', 'setup'];
/** 老词表（共享壳 TYPE_DEFAULT 认得的 5 个）。 */
const TYPE_WORDS = new Set(['采集', '查看', '选择', '向导', '回执']);

const legacy = WAKE_ASSETS.filter((s) => !ADDED_IDS.has(s.id));
const added = WAKE_ASSETS.filter((s) => ADDED_IDS.has(s.id));
const canonical = (rows) => JSON.stringify(rows.map((s) => [s.id, s.title, s.wake_word, s.status, s.prompt_template, s.types]));

describe('#146 饼干记账 HELP 内容资产', () => {
  it('三层结构：7 域 / 20 二级组 / 74 场景（老 71 ＋ 新增 3），域顺序照老实样', () => {
    assert.deepEqual(WAKE_GROUPS.map((g) => g.id), GROUP_IDS);
    assert.equal(WAKE_GROUPS.length, 7);
    assert.equal(WAKE_GROUPS.reduce((n, g) => n + g.subgroups.length, 0), 20);
    assert.equal(WAKE_ASSETS.length, 74);
    assert.equal(WAKE_ASSET_TOTAL, 74);
    assert.equal(legacy.length, 71);
    assert.equal(added.length, 3);
  });

  it('场景字段齐、id 唯一、status 全空、types 用老词', () => {
    assert.equal(new Set(WAKE_ASSETS.map((s) => s.id)).size, 74);
    for (const s of WAKE_ASSETS) {
      for (const k of ['id', 'title', 'wake_word', 'prompt_template']) {
        assert.equal(typeof s[k], 'string', s.id + ' 字段类型 ' + k);
        assert.ok(s[k].length > 0, s.id + ' 字段非空 ' + k);
      }
      assert.equal(s.status, '', s.id + '：老实物 status 全空（可用），不写「待开发」');
      assert.ok(s.types.length > 0, s.id + ' types 非空');
      for (const t of s.types) assert.ok(TYPE_WORDS.has(t), s.id + ' types 越界：' + t);
    }
    assert.equal(Object.keys(SCENE_BY_ID).length, 74);
    assert.equal(SCENE_BY_ID.write_record.wake_word, '记一笔');
  });

  it('老 71 条逐字锁（摘要）＋ 二次生成可复现', () => {
    assert.equal(legacy.length, 71);
    assert.equal(createHash('sha256').update(canonical(legacy), 'utf8').digest('hex'), LEGACY_DIGEST);
    // 摘要只覆盖老条目：新增 3 条不在其中（改新增条不隐瞒老条目漂移）。
    assert.deepEqual(legacy.filter((s) => ADDED_IDS.has(s.id)), []);
  });

  it('新增 3 条落在对应域/组（补进既有二级组末尾，不新开组）', () => {
    const where = (id) => {
      for (const g of WAKE_GROUPS) for (const sub of g.subgroups) if (sub.scenes.some((s) => s.id === id)) return g.id + '/' + sub.id;
      return '?';
    };
    assert.equal(where('write_record'), 'write/write_1');
    assert.equal(where('query_bills'), 'query/query_1');
    assert.equal(where('query_bill_detail'), 'query/query_1');
    for (const s of added) assert.ok(s.prompt_template.includes('唤醒词:' + s.wake_word), s.id + ' 新增条目照老实样带唤醒词尾注');
  });

  it('与口径层 WAKE_TABLE 双向对账（77 = 4 HELP + 73，条条有落）', () => {
    const help = WAKE_TABLE.filter((e) => e.key === 'bill.help.lookup').map((e) => e.phrase);
    const fn = WAKE_TABLE.filter((e) => e.key !== 'bill.help.lookup');
    assert.equal(WAKE_TABLE.length, 77);
    assert.equal(help.length, 4);
    assert.equal(fn.length, 73);

    const sceneWords = new Set(WAKE_ASSETS.map((s) => s.wake_word));
    const fnWords = new Set(fn.map((e) => e.phrase));
    assert.deepEqual(fn.map((e) => e.phrase).filter((p) => !sceneWords.has(p)), [], '现表功能短语必须条条有场景');
    assert.deepEqual([...sceneWords].filter((w) => !fnWords.has(w)), [], '场景唤醒词必须条条在现表');
    // 老 70 个唯一唤醒词 100% 在位（老一词两场景：备份）。
    assert.equal(new Set(legacy.map((s) => s.wake_word)).size, 70);
    assert.deepEqual([...new Set(legacy.map((s) => s.wake_word))].filter((w) => !fnWords.has(w)), []);
    // 4 条 HELP 短语不进场景目录（防自指）。
    assert.deepEqual(help.filter((p) => sceneWords.has(p)), []);
  });

  it('HELP_WAKE_WORDS 由口径层派生（4 条，不在场景目录）', () => {
    const help = WAKE_TABLE.filter((e) => e.key === 'bill.help.lookup').map((e) => e.phrase);
    assert.deepEqual([...HELP_WAKE_WORDS], help);
    assert.equal(HELP_WAKE_WORDS.length, 4);
    const sceneWords = new Set(WAKE_ASSETS.map((s) => s.wake_word));
    assert.deepEqual(HELP_WAKE_WORDS.filter((w) => sceneWords.has(w)), []);
  });
});
