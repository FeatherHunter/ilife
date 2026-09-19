// 409 · 写入 16 词接线：说词→路由 key→SKILL 行→HELP 卡→可执行 CLI，五段对得上。
// 不做真出口断言：不断言 spawn／exit 码，只断言示例带齐必需槽位（见 src/write/writeWire.ts）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  WRITE_WORDS, buildWriteWire, projectWakeWord, routeWakeword, WAKE_TABLE,
} from '../dist/index.js';
import { WAKE_GROUPS } from '../dist/triggers/wake-assets.js';
import { SCENES, sceneFor } from '../dist/write/scene.js';

const here = dirname(fileURLToPath(import.meta.url));
const skillText = readFileSync(join(here, '..', 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');

/** 施工图序（t407-页面块清单-16词.md 第二节）：先 13 条录入词，后 3 条修正词。 */
const CANON = [
  '记支出', '记收入', '拍账单', '批量录入', '记退款', '记报销', '报销到账',
  '记借出', '记借入', '记收回', '记偿还', '记分期', '记一笔',
  '改记录', '撤销', '恢复',
];

describe('409 · 写入 16 词五段接线', () => {
  it('16 词表：WAKE_TABLE 派生，顺序照施工图，13 add＋3 update', () => {
    assert.deepEqual([...WRITE_WORDS], CANON);
    assert.equal(WRITE_WORDS.length, 16);
    const keys = WRITE_WORDS.map((w) => WAKE_TABLE.find((e) => e.phrase === w).key);
    assert.equal(keys.filter((k) => k === 'bill.record.add').length, 13);
    assert.equal(keys.filter((k) => k === 'bill.record.update').length, 3);
  });

  it('五段对得上：逐词 reason 为空（无命令可执行词 0 条）', () => {
    const rows = buildWriteWire();
    assert.equal(rows.length, 16);
    for (const r of rows) {
      assert.equal(r.reason, '', r.phrase + ' 接线断了：' + r.reason);
      assert.ok(r.cli.includes('bill-cmd-read ' + r.key), r.phrase);
      assert.ok(r.helpSceneId.length > 0, r.phrase);
    }
    assert.deepEqual(rows.map((r) => r.phrase), CANON);
  });

  it('HELP 卡：在写域各恰一张卡（wake_word 1:1，无一对多）', () => {
    const writeScenes = WAKE_GROUPS.find((g) => g.id === 'write')
      .subgroups.flatMap((s) => s.scenes);
    assert.equal(writeScenes.length, 16);
    for (const w of CANON) {
      assert.equal(writeScenes.filter((s) => s.wake_word === w).length, 1, w);
    }
    for (const r of buildWriteWire()) {
      assert.ok(writeScenes.some((s) => s.id === r.helpSceneId && s.wake_word === r.phrase), r.phrase);
    }
  });

  it('SKILL.md 联动块含 16 行 CLI（构建期注入新鲜）', () => {
    for (const r of buildWriteWire()) {
      assert.ok(skillText.includes('`' + r.cli + '`'), r.phrase + ' 的 CLI 不在 SKILL.md 联动块');
    }
  });

  it('落点互核（407 表）：路由 kind／op 经 sceneFor 落到唯一一件', () => {
    assert.equal(SCENES.length, 16);
    const ids = new Set();
    for (const r of buildWriteWire()) {
      const s = sceneFor({ key: r.key, kind: r.params.kind, op: r.params.op });
      // #721 起落点行不写唤醒词：按它认的 kind／op 从域声明算回那一条词，必须就是路由命中的那一条。
      const word = projectWakeWord({ key: s.key, kind: s.kind, op: s.op });
      assert.equal(word, r.phrase, r.phrase);
      ids.add(s.id);
    }
    assert.equal(ids.size, 16, '一件一条词，不许两条词挤一件');
  });

  it('最长匹配回归：报销到账不落入记报销', () => {
    assert.equal(routeWakeword('记报销', { id: 1 }).params.kind, 'reimburse');
    assert.equal(routeWakeword('报销到账', { id: 1 }).params.kind, 'reimburse-done');
    assert.equal(routeWakeword('记报销报销到账', { id: 1 }).params.kind, 'reimburse-done');
  });

  it('反例点名：无命中词路由抛错（对账脚本反例的同语义）', () => {
    assert.throws(() => routeWakeword('同步记账到云端', { id: 1 }), /无命中/);
  });
});
