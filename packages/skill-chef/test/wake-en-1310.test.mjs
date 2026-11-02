/** 票 #1310 · 英文唤醒词（首轮）与按语言单载路由（私家大厨）。
 *
 * 判据（逐条给读数：node --test test/wake-en-1310.test.mjs）：
 *   ① en 渲染语言下，英文来源里的每条词落到与中文词**同一条命令**（同 key、同 params）；
 *   ② 未设语言（默认 zh）下英文词**不命中**——英文面不是中文面的别名表；
 *   ③ en 下中文词**不再命中**：两张表按语言单选，同一时刻只有一套参与匹配；
 *   ④ 无中文对应词的 HELP 入口（直写 key）落到它声明的 key。
 * 英文来源＝src/policy/wake-en.json（中文词 → 英文说法；键／槽位／预设由生成器从中文那条照抄）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runWithLanguage } from 'base-entries';
import { routeWakeword } from '../dist/policy/wakewords.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTRIES = JSON.parse(readFileSync(join(HERE, '..', 'src/policy/wake-en.json'), 'utf8')).entries;

/** 两种语言共用同一份上下文：槽位给全，比较的是「英文那条与中文那条的结果是否逐字段相同」。 */
const CTX = {
  id: 1, name: '鸡胸', names: ['鸡胸'], q: '牛奶', keyword: '牛奶', date: '2026-11-02',
  start: '2026-11-01', end: '2026-11-02', kg: 70, type: '慢跑', minutes: 30, calories: 200,
  step: '1', ingredient: '盐', input: 'x', child: 'a', parent: 'b', relation_type: 'derive',
  change_summary: 'x', source: 'a', target: 'b', differences: 'x', rating: 5, feedback: 'x',
  difficulty: '简单', time_max: 30, cookware: '炒锅', status: '未做', category: '备忘',
  sub_category: 'x', reminder: 'x', amount: 100, account: '微信', mode: 'lookup',
};

describe('票 #1310 · 英文唤醒词（私家大厨）', () => {
  it('英文来源只有首轮词（非空、不超过 30 条）', () => {
    assert.ok(ENTRIES.length > 0, '英文来源是空的');
    assert.ok(ENTRIES.length <= 30, '英文首轮上限 30 条，现有 ' + ENTRIES.length + ' 条');
  });

  it('① en 下每条英文词与中文词同 key 同 params', () => {
    let checked = 0;
    for (const e of ENTRIES) {
      if (e.zh === undefined) continue;
      const zh = runWithLanguage('zh', () => routeWakeword(e.zh, CTX));
      const en = runWithLanguage('en', () => routeWakeword(e.en, CTX));
      assert.equal(en.key, zh.key, e.en + ' 与 ' + e.zh + ' 的 key 不同');
      assert.deepEqual(en.params, zh.params, e.en + ' 的 params 与 ' + e.zh + ' 不同');
      checked += 1;
    }
    assert.ok(checked > 0, '一条可对照的中文词都没有');
  });

  it('② 未设语言（默认 zh）下英文词不命中', () => {
    for (const e of ENTRIES) {
      assert.throws(
        () => routeWakeword(e.en, CTX),
        (err) => /无命中唤醒词|唤醒词为空/.test(err.message),
        e.en + ' 在中文面命中了（英文词不该是中文词的别名）',
      );
    }
  });

  it('③ en 下中文词不再命中（两张表不同时参与匹配）', () => {
    for (const e of ENTRIES) {
      if (e.zh === undefined) continue;
      assert.throws(
        () => runWithLanguage('en', () => routeWakeword(e.zh, CTX)),
        (err) => /无命中唤醒词|唤醒词为空/.test(err.message),
        e.zh + ' 在英文面仍然命中（两张表同时上场了）',
      );
    }
  });

  it('④ 直写 key 的英文词落到它声明的 key', () => {
    for (const e of ENTRIES) {
      if (e.key === undefined) continue;
      const hit = runWithLanguage('en', () => routeWakeword(e.en, CTX));
      assert.equal(hit.key, e.key);
    }
  });
});
