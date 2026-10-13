// #146 · 内容资产锁：老 71 条逐字 ＋ 4 条新增 ＋ 与口径层 WAKE_TABLE 双向对账。
// 事实源在仓外（老技能实物），故「逐字」用摘要钉死——重跑生成器只会复现同一摘要，改一个字即变红。
// #977 · 老逐字锁已退役（文字全改）：LEGACY_DIGEST 的历史值见 t721 证据，当前内容不再与老权威逐字一致；
// 本件保留结构／对账／新增落点（改判为卡路里式首行），逐字锁由 PRODUCT_DIGEST（t721 件）重钉。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  WAKE_GROUPS, WAKE_ASSETS, SCENE_BY_ID, WAKE_ASSET_TOTAL, HELP_WAKE_WORDS,
} from '../dist/triggers/wake-assets.js';
import { WAKE_TABLE } from '../dist/triggers/wakeTable.js';

/** 本票新增的条目（老实物无）。#1275 删掉 `query_bills`（查账单并入查某天）后只剩 2 条；
 *  #1269 加 `query_multi`（多条件查账）后 3 条；#1280 第 5 步加 `write_merge`（合并分类）后 4 条。 */
const ADDED_IDS = new Set(['write_record', 'query_bill_detail', 'query_multi', 'write_merge']);
/** #977 前的老实物 71 条摘要（历史值，已退役；现内容不再与之逐字一致，见件头）。
 *  历史值：'93099ecd345b85c65d69231c348fea663af40617a72509968e3829d6e2e108a0'。 */
/** 老实物的域顺序（照搬，不许重排）。 */
const GROUP_IDS = ['write', 'query', 'analysis', 'goal', 'account', 'link', 'setup'];
/** 老词表（共享 help 模板 TYPE_DEFAULT 认得的 5 个）。 */
const TYPE_WORDS = new Set(['采集', '查看', '选择', '向导', '回执']);

const legacy = WAKE_ASSETS.filter((s) => !ADDED_IDS.has(s.id));
const added = WAKE_ASSETS.filter((s) => ADDED_IDS.has(s.id));
const canonical = (rows) => JSON.stringify(rows.map((s) => [s.id, s.title, s.wake_word, s.status, s.prompt_template, s.types]));

describe('#146 饼干记账 HELP 内容资产', () => {
  it('三层结构：7 域 / 21 二级组 / 77 场景（老 73 ＋ 新增 4），域顺序照老实样', () => {
    assert.deepEqual(WAKE_GROUPS.map((g) => g.id), GROUP_IDS);
    assert.equal(WAKE_GROUPS.length, 7);
    assert.equal(WAKE_GROUPS.reduce((n, g) => n + g.subgroups.length, 0), 21);
    assert.equal(WAKE_ASSETS.length, 77);
    assert.equal(WAKE_ASSET_TOTAL, 77);
    assert.equal(legacy.length, 73);
    assert.equal(added.length, 4);
  });

  it('场景字段齐、id 唯一、status 全空、types 用老词', () => {
    assert.equal(new Set(WAKE_ASSETS.map((s) => s.id)).size, 77);
    for (const s of WAKE_ASSETS) {
      for (const k of ['id', 'title', 'wake_word', 'prompt_template']) {
        assert.equal(typeof s[k], 'string', s.id + ' 字段类型 ' + k);
        assert.ok(s[k].length > 0, s.id + ' 字段非空 ' + k);
      }
      assert.equal(s.status, '', s.id + '：老实物 status 全空（可用），不写「待开发」');
      assert.ok(s.types.length > 0, s.id + ' types 非空');
      for (const t of s.types) assert.ok(TYPE_WORDS.has(t), s.id + ' types 越界：' + t);
    }
    assert.equal(Object.keys(SCENE_BY_ID).length, 77);
    assert.equal(SCENE_BY_ID.write_record.wake_word, '记一笔');
  });

  it('#977 重写锁：____ 零命中，首行卡路里式，62 有参带 {{}}（老逐字锁退役）', () => {
    for (const s of WAKE_ASSETS) {
      assert.ok(!s.prompt_template.includes('____'), s.id + ' 还有 ____ 未洗');
      assert.ok(!/\d{4}-\d{2}-\d{2}/.test(s.prompt_template.split('\n').filter((l) => l.includes('{{')).join('\n')), s.id + ' 参数行含裸 ISO 日期');
    }
    for (const s of WAKE_ASSETS) {
      assert.ok(s.prompt_template.startsWith('请你加载技能 饼干记账,执行唤醒词「' + s.wake_word + '」。'), s.id + ' 首行不是卡路里式');
    }
    const withParam = WAKE_ASSETS.filter((s) => s.prompt_template.includes('{{'));
    assert.equal(withParam.length, 62);
    assert.equal(WAKE_ASSETS.filter((s) => !s.prompt_template.includes('{{')).length, 15);
  });

  it('新增 4 条落在对应域/组（补进既有二级组末尾，不新开组）', () => {
    const where = (id) => {
      for (const g of WAKE_GROUPS) for (const sub of g.subgroups) if (sub.scenes.some((s) => s.id === id)) return g.id + '/' + sub.id;
      return '?';
    };
    assert.equal(where('write_record'), 'write/write_1');
    assert.equal(where('query_bill_detail'), 'query/query_1');
    assert.equal(where('query_multi'), 'query/query_2');
    assert.equal(where('write_merge'), 'write/write_3', '#1280 的「合并分类」进写域「修正」二级组（末尾，不新开组）');
    for (const s of added) assert.ok(s.prompt_template.includes('执行唤醒词「' + s.wake_word + '」'), s.id + ' 新增条目照卡路里式带首行');
  });

  it('与口径层 WAKE_TABLE 双向对账（80 = 4 HELP + 76，条条有落）', () => {
    const help = WAKE_TABLE.filter((e) => e.key === 'bill.help.lookup').map((e) => e.phrase);
    const fn = WAKE_TABLE.filter((e) => e.key !== 'bill.help.lookup');
    assert.equal(WAKE_TABLE.length, 80);
    assert.equal(help.length, 4);
    assert.equal(fn.length, 76);

    const sceneWords = new Set(WAKE_ASSETS.map((s) => s.wake_word));
    const fnWords = new Set(fn.map((e) => e.phrase));
    assert.deepEqual(fn.map((e) => e.phrase).filter((p) => !sceneWords.has(p)), [], '现表功能短语必须条条有场景');
    assert.deepEqual([...sceneWords].filter((w) => !fnWords.has(w)), [], '场景唤醒词必须条条在现表');
    // 老 72 个唯一唤醒词 100% 在位（老一词两场景：备份）。
    assert.equal(new Set(legacy.map((s) => s.wake_word)).size, 72);
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

  it('运行时复制零 {{}}：空值代入全落 ___（help-template.html:1796-1797 口径，#977 笔误回归）', () => {
    const namesOf = (tpl) => [...tpl.matchAll(/\{\{([A-Za-z0-9_]+)\}\}/g)].map((m) => m[1]);
    for (const s of WAKE_ASSETS) {
      const names = namesOf(s.prompt_template);
      const fields = s.editable_fields || [];
      if (names.length === 0) {
        assert.ok(fields.length === 0, s.id + ' 零参场景 editable_fields 应缺席非空数组');
        continue;
      }
      assert.deepEqual(new Set(names), new Set(fields.map((f) => f.name)), s.id + ' 占位与字段双向一一对应');
      let out = s.prompt_template;
      for (const f of fields) out = out.split('{{' + f.name + '}}').join('___');
      assert.ok(!out.includes('{{') && !out.includes('}}'), s.id + ' 空值复制串仍见 {{}}');
      assert.ok(out.includes('___'), s.id + ' 空值复制串未落 ___');
    }
  });
});
