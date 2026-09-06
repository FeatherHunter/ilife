import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { CATEGORIES, TRIGGERS, getSummary, HELP_LOOKUP } from '../packages/skill-calorie/dist/triggers/index.js';

// 与 .tmp/gen_triggers.py::canon 同构（分隔符 + 缺省口径一致，不增删覆盖）
const S = (v) => (v === undefined || v === null ? '' : v === true ? '1' : v === false ? '0' : String(v));
const L = (v) => {
  const a = v ?? [];
  return [String(a.length), ...a.map(String)].join('\u0002');
};
function canon(t) {
  const mp = t.main_prompt ?? {};
  const vr = t.variants ?? [];
  const vflat = [String(vr.length), ...vr.flatMap((x) => [x.label ?? '', x.cli ?? '', x.prompt ?? ''])].join('\u0002');
  return createHash('sha256')
    .update(
      [t.wake_word, t.category, S(t.key), S(t.name), S(t.subfunction), S(t.output_type), S(t.html_template), S(t.data_source), S(t.prompt_template), S(t.user_intent), S(t.order), S(t.depends_on_external), L(t.data_fields), S(t.desc), S(mp.cli), S(mp.text), L(t.aliases), L(t.fill_hints), vflat].join('\u0001'),
      'utf8',
    )
    .digest('hex')
    .slice(0, 16);
}

const fix = JSON.parse(readFileSync(new URL('./calorie-sot.snapshot.json', import.meta.url)));
const id = (t) => t.key ?? t.wake_word;

describe('calorie triggers parity（SoT scripts/_triggers.py）', () => {
  it('总数 436 条无增删', () => {
    assert.equal(TRIGGERS.length, fix.total);
  });
  it('10 场景计数全对齐', () => {
    const counts = { '01': 9, '02': 70, '03': 58, '04': 39, '05': 32, '06': 25, '07': 4, '08': 13, '09': 10, '10': 176 };
    assert.deepEqual(fix.scene_counts, counts);
    assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), 436);
  });
  it('wake_word 多重集一致（含记身材照×3）', () => {
    assert.deepEqual(TRIGGERS.map((t) => t.wake_word).sort(), fix.wake_multiset);
  });
  it('逐条 sha 一致（prompt 全文行为对齐）', () => {
    const bad = [];
    for (const t of TRIGGERS) {
      const k = id(t);
      if (fix.entry_sha[k] !== canon(t)) bad.push(`${t.wake_word}|${k}`);
    }
    assert.deepEqual(bad, []);
  });
  it('getSummary 与 SoT get_summary() 一致', () => {
    assert.deepEqual(getSummary(), fix.summary);
  });
  it('HELP 速查覆盖全部唤醒词与别名', () => {
    for (const t of TRIGGERS) {
      assert.ok((HELP_LOOKUP[t.wake_word] ?? []).length >= 1, t.wake_word);
      for (const a of t.aliases ?? []) assert.ok((HELP_LOOKUP[a] ?? []).length >= 1, a);
    }
    assert.equal(HELP_LOOKUP['记身材照'].length, 3);
  });
  it('CATEGORIES 13 分类原样保留', () => {
    assert.equal(CATEGORIES.length, 13);
  });
});
